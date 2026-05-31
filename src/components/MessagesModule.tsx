"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  Paperclip,
  Search,
  Send,
  User,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import {
  buildChatWebsocketUrl,
  formatThreadTimestamp,
  getMediaFile,
  markThreadRead,
  sendChatMessage,
  uploadChatAttachment,
} from "../services/messagesService";
import { getAccessToken } from "../services/authStore";
import { getUserProfile } from "../services/userProfileStore";
import type { ChatMessage, MediaFile, Thread, ThreadMessage } from "../services/messagesService";

interface MessagesModuleProps {
  externalThreadId?: string | null;
  onThreadChange?: (id: string) => void;
  threads: Thread[];
  onThreadsUpdate: (threads: Thread[]) => void;
}

function toThreadMessage(message: ChatMessage, currentUserId: string | null): ThreadMessage {
  return {
    id: message.id,
    senderId: message.sender_id,
    senderRole: message.sender_id === currentUserId ? "teacher" : "parent",
    text: message.text,
    createdAt: message.created_at,
    attachmentId: message.attachment,
    readByIds: message.read_by_ids,
  };
}

const MessagesModule = ({
  externalThreadId,
  onThreadChange,
  threads,
  onThreadsUpdate,
}: MessagesModuleProps) => {
  const currentUserId = getUserProfile()?.id ?? null;
  const reconnectTimerRef = useRef<number | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const threadsRef = useRef<Thread[]>(threads);

  const [internalThreadId, setInternalThreadId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [composerText, setComposerText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [mobileView, setMobileView] = useState<"threads" | "chat">("threads");
  const [socketState, setSocketState] = useState<
    "idle" | "connecting" | "connected" | "reconnecting" | "disconnected"
  >("idle");
  const [attachmentMeta, setAttachmentMeta] = useState<Record<string, MediaFile>>({});

  const activeThreadId = externalThreadId || internalThreadId || threads[0]?.id || null;

  const filteredThreads = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    if (!needle) return threads;
    return threads.filter((thread) =>
      [thread.parentName, thread.studentName, thread.preview]
        .some((value) => value.toLowerCase().includes(needle)),
    );
  }, [threads, searchTerm]);

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) || null,
    [threads, activeThreadId],
  );

  useEffect(() => {
    threadsRef.current = threads;
  }, [threads]);

  useEffect(() => {
    if (!activeThreadId && threads[0]?.id) {
      setInternalThreadId(threads[0].id);
      onThreadChange?.(threads[0].id);
    }
  }, [activeThreadId, threads, onThreadChange]);

  useEffect(() => {
    if (!activeThread || !activeThread.unreadCount) return;
    markThreadRead(activeThread.id)
      .then(() => {
        onThreadsUpdate(
          threads.map((thread) =>
            thread.id === activeThread.id
              ? { ...thread, unread: false, unreadCount: 0 }
              : thread,
          ),
        );
      })
      .catch(() => undefined);
  }, [activeThread, onThreadsUpdate, threads]);

  useEffect(() => {
    const attachmentIds = new Set<string>();
    threads.forEach((thread) => {
      thread.messages.forEach((message) => {
        if (message.attachmentId && !attachmentMeta[message.attachmentId]) {
          attachmentIds.add(message.attachmentId);
        }
      });
    });
    if (!attachmentIds.size) return;

    let cancelled = false;
    Promise.all(
      [...attachmentIds].map(async (id) => [id, await getMediaFile(id)] as const),
    )
      .then((entries) => {
        if (cancelled) return;
        setAttachmentMeta((current) => {
          const next = { ...current };
          entries.forEach(([id, file]) => {
            next[id] = file;
          });
          return next;
        });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [threads, attachmentMeta]);

  useEffect(() => {
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    if (!activeThreadId) {
      setSocketState("idle");
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setSocketState("disconnected");
      return;
    }

    let disposed = false;
    let reconnectAttempts = 0;

    const connect = () => {
      if (disposed) return;
      setSocketState(reconnectAttempts === 0 ? "connecting" : "reconnecting");
      const socket = new WebSocket(buildChatWebsocketUrl(activeThreadId, token));
      socketRef.current = socket;

      socket.onopen = () => {
        reconnectAttempts = 0;
        setSocketState("connected");
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as
            | { event: "message.created"; thread_id: string; message: ChatMessage }
            | { event: "message.read"; thread_id: string; reader_id: string; count: number };

          if (payload.event === "message.created") {
            onThreadsUpdate(
              threadsRef.current
                .map((thread) => {
                  if (thread.id !== payload.thread_id) return thread;
                  const nextMessage = toThreadMessage(payload.message, currentUserId);
                  if (thread.messages.some((message) => message.id === nextMessage.id)) {
                    return thread;
                  }
                  return {
                    ...thread,
                    messages: [...thread.messages, nextMessage],
                    preview: payload.message.text?.trim() || (payload.message.attachment ? "Attachment shared" : thread.preview),
                    lastTime: formatThreadTimestamp(payload.message.created_at),
                    updatedAt: payload.message.created_at,
                    unread: payload.message.sender_id === currentUserId ? false : thread.id !== activeThreadId,
                    unreadCount:
                      payload.message.sender_id === currentUserId || thread.id === activeThreadId
                        ? thread.unreadCount
                        : thread.unreadCount + 1,
                  };
                })
                .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()),
            );
          }

          if (payload.event === "message.read") {
            onThreadsUpdate(
              threadsRef.current.map((thread) => {
                if (thread.id !== payload.thread_id) return thread;
                return {
                  ...thread,
                  messages: thread.messages.map((message) => {
                    if (message.senderId !== currentUserId) return message;
                    if (message.readByIds.includes(payload.reader_id)) return message;
                    return {
                      ...message,
                      readByIds: [...message.readByIds, payload.reader_id],
                    };
                  }),
                };
              }),
            );
          }
        } catch {
          // Ignore malformed websocket payloads.
        }
      };

      socket.onerror = () => {
        socket.close();
      };

      socket.onclose = () => {
        if (disposed) return;
        setSocketState("disconnected");
        reconnectAttempts += 1;
        const delay = Math.min(1000 * 2 ** (reconnectAttempts - 1), 10000);
        reconnectTimerRef.current = window.setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [activeThreadId, currentUserId, onThreadsUpdate, threads]);

  const handleThreadSelect = (id: string) => {
    setInternalThreadId(id);
    onThreadChange?.(id);
    setMobileView("chat");
  };

  const handleSend = async () => {
    if (!activeThread) return;
    const trimmedText = composerText.trim();
    if (!trimmedText && !selectedFile) {
      setSendError("Type a message or attach a file.");
      return;
    }

    setSendError(null);
    setIsSending(true);

    try {
      const attachmentId = selectedFile ? await uploadChatAttachment(selectedFile) : undefined;
      const created = await sendChatMessage(activeThread.id, {
        text: trimmedText || undefined,
        attachment: attachmentId,
      });

      const nextMessage = toThreadMessage(created, currentUserId);
      onThreadsUpdate(
        threadsRef.current
          .map((thread) =>
            thread.id === activeThread.id
              ? {
                  ...thread,
                  messages: [...thread.messages, nextMessage],
                  preview: created.text?.trim() || (created.attachment ? "Attachment shared" : thread.preview),
                  lastTime: formatThreadTimestamp(created.created_at),
                  updatedAt: created.created_at,
                  unread: false,
                }
              : thread,
          )
          .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()),
      );

      if (attachmentId) {
        const file = await getMediaFile(attachmentId);
        setAttachmentMeta((current) => ({ ...current, [attachmentId]: file }));
      }

      setComposerText("");
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to send message.";
      setSendError(message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-white">
      <div className={`w-full md:w-[320px] shrink-0 border-r border-slate-100 flex-col ${mobileView === "threads" ? "flex" : "hidden md:flex"}`}>
        <div className="border-b border-slate-100 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Messages</h2>
            <span className="rounded-full bg-[#1A237E] px-3 py-1 text-[11px] font-bold text-white">
              {threads.length}
            </span>
          </div>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search parent or student..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-medium text-slate-800 outline-none transition focus:border-[#1A237E] focus:bg-white"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredThreads.map((thread) => (
            <button
              key={thread.id}
              type="button"
              onClick={() => handleThreadSelect(thread.id)}
              className={`flex w-full items-start gap-3 px-5 py-4 text-left transition hover:bg-slate-50 ${thread.id === activeThreadId ? "border-l-[3px] border-[#1A237E] bg-slate-50" : ""}`}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-800">
                {thread.parentInitials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-bold text-slate-900">{thread.parentName}</p>
                  <span className="shrink-0 text-[10px] font-semibold text-slate-400">{thread.lastTime}</span>
                </div>
                <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-[#1A237E]">
                  {thread.studentName}
                </p>
                <p className="truncate text-xs font-medium text-slate-500">{thread.preview || "No messages yet"}</p>
              </div>
              {thread.unreadCount > 0 && (
                <span className="mt-1 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">
                  {thread.unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className={`flex-1 flex-col ${mobileView === "chat" ? "flex" : "hidden md:flex"}`}>
        {activeThread ? (
          <>
            <div className="flex items-center justify-between border-b border-slate-100 bg-white p-5">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileView("threads")}
                  className="rounded-xl p-2 text-[#1A237E] md:hidden"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-800">
                  {activeThread.parentInitials}
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-base font-bold text-slate-900">{activeThread.parentName}</h3>
                  <div className="mt-1 flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <span>{activeThread.studentName}</span>
                    <span>·</span>
                    <span>{activeThread.studentGrade}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500">
                {socketState === "connected" ? <Wifi size={14} /> : <WifiOff size={14} />}
                <span>{socketState === "connected" ? "Live" : socketState === "connecting" || socketState === "reconnecting" ? "Connecting" : "Offline"}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50/70 p-5">
              {activeThread.messages.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <div className="max-w-md text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-[#1A237E]">
                      <User size={22} className="stroke-[2.5]" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900">No messages yet</h3>
                    <p className="mt-2 text-sm font-medium text-slate-500">
                      Start the conversation with {activeThread.parentName}.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeThread.messages.map((message) => {
                    const isOwn = message.senderId === currentUserId;
                    const attachment = message.attachmentId ? attachmentMeta[message.attachmentId] : null;
                    const seen = isOwn && message.readByIds.some((readerId) => readerId !== currentUserId);

                    return (
                      <div key={message.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${isOwn ? "bg-[#1A237E] text-white" : "bg-white text-slate-900"}`}>
                          {message.text && <p className="whitespace-pre-wrap text-sm">{message.text}</p>}
                          {attachment && (
                            <a
                              href={attachment.download_url ?? "#"}
                              target="_blank"
                              rel="noreferrer"
                              className={`mt-3 block rounded-xl border px-3 py-2 text-sm ${isOwn ? "border-white/20 bg-white/10 text-white" : "border-slate-200 bg-slate-50 text-slate-800"}`}
                            >
                              <p className="truncate font-semibold">{attachment.file_name}</p>
                              <p className={`mt-1 text-xs ${isOwn ? "text-white/70" : "text-slate-500"}`}>
                                {attachment.content_type}
                              </p>
                            </a>
                          )}
                          <div className={`mt-2 flex items-center justify-end gap-2 text-[11px] ${isOwn ? "text-white/75" : "text-slate-400"}`}>
                            <span>{formatThreadTimestamp(message.createdAt)}</span>
                            {seen && <span>Seen</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 bg-white p-4">
              {selectedFile && (
                <div className="mb-3 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{selectedFile.name}</p>
                    <p className="text-xs text-slate-500">Attachment ready</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="rounded-full p-1 text-slate-400 hover:bg-slate-200"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {sendError && (
                <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {sendError}
                </div>
              )}

              <div className="flex items-end gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-50"
                >
                  <Paperclip size={18} />
                </button>
                <textarea
                  rows={1}
                  value={composerText}
                  onChange={(event) => setComposerText(event.target.value)}
                  placeholder="Type your message..."
                  className="max-h-32 min-h-[44px] flex-1 resize-y rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#1A237E]"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={isSending}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#1A237E] text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center bg-slate-50/60 p-6 text-center">
            <div>
              <h3 className="text-base font-bold text-slate-900">No conversations yet</h3>
              <p className="mt-2 text-sm text-slate-500">
                Open a student and start a parent conversation from the dashboard.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(MessagesModule);
