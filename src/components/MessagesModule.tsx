"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  Loader2,
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

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function isSameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
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
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const pendingMessageIdsRef = useRef<Set<string>>(new Set());
  const tempIdCounterRef = useRef(0);
  const pendingStatusRef = useRef<Map<string, 'sending' | 'sent'>>(new Map());
  const pendingClearTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const [showScrollDown, setShowScrollDown] = useState(false);

  const [internalThreadId, setInternalThreadId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [composerText, setComposerText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
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
            const nextMessage = toThreadMessage(payload.message, currentUserId);
            if (pendingMessageIdsRef.current.has(nextMessage.id)) {
              pendingMessageIdsRef.current.delete(nextMessage.id);
              return;
            }
            onThreadsUpdate(
              threadsRef.current
                .map((thread) => {
                  if (thread.id !== payload.thread_id) return thread;
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

  useEffect(() => {
    return () => {
      pendingClearTimersRef.current.forEach((timer) => clearTimeout(timer));
      pendingClearTimersRef.current.clear();
    };
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  }, []);

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    setShowScrollDown(distanceFromBottom > 200);
  }, []);

  useEffect(() => {
    if (!showScrollDown) {
      scrollToBottom(false);
    }
  }, [activeThread?.messages.length, showScrollDown, scrollToBottom]);

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

    let attachmentId: string | undefined;
    try {
      attachmentId = selectedFile ? await uploadChatAttachment(selectedFile) : undefined;
    } catch {
      setSendError("Failed to upload attachment.");
      return;
    }

    const tempId = `pending_${Date.now()}_${tempIdCounterRef.current++}`;
    const optimistic: ThreadMessage = {
      id: tempId,
      senderId: currentUserId ?? "",
      senderRole: "teacher",
      text: trimmedText,
      createdAt: new Date().toISOString(),
      attachmentId: attachmentId ?? null,
      readByIds: [],
    };

    pendingStatusRef.current.set(tempId, "sending");

    const optimisticThreads = threadsRef.current
      .map((thread) =>
        thread.id === activeThread.id
          ? {
              ...thread,
              messages: [...thread.messages, optimistic],
              preview: trimmedText || (selectedFile ? "Attachment" : thread.preview),
              lastTime: formatThreadTimestamp(optimistic.createdAt),
              updatedAt: optimistic.createdAt,
              unread: false,
            }
          : thread,
      )
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());

    threadsRef.current = optimisticThreads;
    onThreadsUpdate(optimisticThreads);

    setComposerText("");
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    sendChatMessage(activeThread.id, {
      text: trimmedText || undefined,
      attachment: attachmentId,
    })
      .then((created) => {
        const realMsg = toThreadMessage(created, currentUserId);
        pendingMessageIdsRef.current.add(created.id);

        const updated = threadsRef.current.map((thread) => {
          if (thread.id !== activeThread.id) return thread;
          return {
            ...thread,
            messages: thread.messages.map((m) => (m.id === tempId ? realMsg : m)),
            preview: created.text?.trim() || (created.attachment ? "Attachment shared" : thread.preview),
            lastTime: formatThreadTimestamp(created.created_at),
            updatedAt: created.created_at,
          };
        });

        pendingStatusRef.current.delete(tempId);
        pendingStatusRef.current.set(created.id, "sent");
        threadsRef.current = updated;
        onThreadsUpdate(updated);

        const clearTimer = setTimeout(() => {
          pendingStatusRef.current.delete(created.id);
          pendingClearTimersRef.current.delete(created.id);
          onThreadsUpdate(threadsRef.current);
        }, 2000);
        pendingClearTimersRef.current.set(created.id, clearTimer);

        if (attachmentId) {
          getMediaFile(attachmentId)
            .then((file) => {
              setAttachmentMeta((current) => ({ ...current, [attachmentId]: file }));
            })
            .catch(() => undefined);
        }
      })
      .catch((error) => {
        pendingStatusRef.current.delete(tempId);
        const reverted = threadsRef.current.map((thread) => {
          if (thread.id !== activeThread.id) return thread;
          return {
            ...thread,
            messages: thread.messages.filter((m) => m.id !== tempId),
          };
        });
        threadsRef.current = reverted;
        onThreadsUpdate(reverted);
        setSendError(error instanceof Error ? error.message : "Failed to send message.");
      });
  };

  return (
    <>
      <style>{`@keyframes msgIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
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

            <div ref={messagesContainerRef} onScroll={handleScroll} className="relative flex-1 overflow-y-auto bg-slate-50/70 p-5">
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
                <div className="space-y-1">
                  {activeThread.messages.map((message, index) => {
                    const isOwn = message.senderId === currentUserId;
                    const attachment = message.attachmentId ? attachmentMeta[message.attachmentId] : null;
                    const seen = isOwn && message.readByIds.some((readerId) => readerId !== currentUserId);
                    const prev = index > 0 ? activeThread.messages[index - 1] : null;
                    const showAvatar = !isOwn && (!prev || prev.senderId !== message.senderId);
                    const showDateSep = !prev || !isSameDay(prev.createdAt, message.createdAt);

                    return (
                      <React.Fragment key={message.id}>
                        {showDateSep && (
                          <div className="flex items-center gap-3 py-3">
                            <div className="flex-1 border-t border-slate-200" />
                            <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                              {formatDateLabel(message.createdAt)}
                            </span>
                            <div className="flex-1 border-t border-slate-200" />
                          </div>
                        )}
                        <div style={{ animation: `msgIn 0.25s ease-out` }} className={`flex ${isOwn ? "justify-end" : "justify-start"} ${showAvatar ? "mt-3" : "mt-0.5"}`}>
                          {!isOwn && (
                            <div className={`mr-2 flex shrink-0 items-end ${showAvatar ? "" : "invisible"}`}>
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600">
                                {activeThread.parentInitials}
                              </div>
                            </div>
                          )}
                          <div className={`max-w-[80%] ${isOwn ? "" : "min-w-0"}`}>
                            <div className={`rounded-2xl px-4 py-2.5 shadow-sm ${isOwn ? "bg-gradient-to-br from-[#1A237E] to-[#283593] text-white" : "bg-white text-slate-900"}`}>
                              {message.text && <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.text}</p>}
                              {attachment && (
                                <a
                                  href={attachment.download_url ?? "#"}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={`mt-2 flex items-center gap-3 rounded-xl border px-3 py-2 text-sm ${isOwn ? "border-white/20 bg-white/10 text-white" : "border-slate-200 bg-slate-50 text-slate-800"}`}
                                >
                                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isOwn ? "bg-white/15" : "bg-white"}`}>
                                    <Paperclip size={14} />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="truncate font-semibold">{attachment.file_name}</p>
                                    <p className={`mt-0.5 text-xs ${isOwn ? "text-white/70" : "text-slate-500"}`}>
                                      {attachment.content_type}
                                    </p>
                                  </div>
                                </a>
                              )}
                            </div>
                            <div className={`mt-0.5 flex items-center gap-1 px-1 text-[10px] ${isOwn ? "justify-end" : "justify-start"} text-slate-400`}>
                              <span className="font-medium">{formatThreadTimestamp(message.createdAt)}</span>
                              {(() => {
                                const status = pendingStatusRef.current.get(message.id);
                                if (status === "sending") {
                                  return <Loader2 size={10} className="animate-spin" strokeWidth={2.5} />;
                                }
                                if (status === "sent") {
                                  return <Check size={10} strokeWidth={3} className="text-slate-400" />;
                                }
                                if (seen) {
                                  return <CheckCheck size={12} className="text-[#1A237E]" strokeWidth={2.5} />;
                                }
                                return null;
                              })()}
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}

              {showScrollDown && activeThread.messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => scrollToBottom(true)}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-lg transition hover:bg-slate-50"
                >
                  <ChevronDown size={14} />
                  New messages
                </button>
              )}
            </div>

            <div className="border-t border-slate-100 bg-white px-4 py-3">
              {selectedFile && (
                <div className="mb-2 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white">
                      <Paperclip size={12} className="text-slate-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">{selectedFile.name}</p>
                      <p className="text-[10px] text-slate-500">Attachment ready</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="rounded-full p-1 text-slate-400 transition hover:bg-slate-200"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {sendError && (
                <div className="mb-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                  {sendError}
                </div>
              )}

              <div className="flex items-end gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
                >
                  <Paperclip size={16} />
                </button>
                <textarea
                  rows={1}
                  value={composerText}
                  onChange={(event) => setComposerText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Type a message..."
                  className="max-h-28 min-h-[40px] flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#1A237E] focus:bg-white"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!composerText.trim() && !selectedFile}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1A237E] text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Send size={16} />
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
    </>
  );
};

export default React.memo(MessagesModule);
