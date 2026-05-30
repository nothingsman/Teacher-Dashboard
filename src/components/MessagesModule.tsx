"use client";
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { 
  MessageCircle, 
  Search, 
  Edit, 
  Phone, 
  UserCircle, 
  MoreVertical, 
  CheckCheck, 
  Paperclip, 
  BarChart2, 
  Send, 
  User, 
  Mail, 
  ClipboardList, 
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Mic,
  Square,
  Trash2,
  Volume2,
  Smile
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types and data (re-exported from messagesService for backward compatibility) ---

export type { Attachment, Message, StudentSnapshot, Thread } from '../services/messagesService';
export { THREADS_DATA } from '../services/messagesService';

import type { Attachment, Message, Thread } from '../services/messagesService';

// --- Helpers ---

const getAvatarClasses = (color: string) => {
  switch (color) {
    case "blue":   return "bg-blue-100 text-blue-800 border-blue-200";
    case "teal":   return "bg-cyan-100 text-cyan-800 border-cyan-200";
    case "purple": return "bg-violet-100 text-violet-800 border-violet-200";
    case "amber":  return "bg-amber-100 text-amber-800 border-amber-200";
    case "green":  return "bg-emerald-100 text-emerald-800 border-emerald-200";
    default:       return "bg-slate-100 text-slate-800 border-slate-200";
  }
};

const getScoreColor = (score: number | null, max: number) => {
  if (score === null) return "text-slate-400";
  const pct = (score / max) * 100;
  if (pct >= 75) return "text-emerald-500";
  if (pct >= 50) return "text-blue-500";
  return "text-red-500";
};

interface MessagesModuleProps {
  externalThreadId?: string | null;
  onThreadChange?: (id: string) => void;
  threads: Thread[];
  onThreadsUpdate: (threads: Thread[]) => void;
}

const MessagesModule = ({ externalThreadId, onThreadChange, threads, onThreadsUpdate }: MessagesModuleProps) => {
  const [internalActiveThreadId, setInternalActiveThreadId] = useState<string>("THR-001");

  const activeThreadId = externalThreadId || internalActiveThreadId;
  
  useEffect(() => {
    if (activeThreadId) {
      const thread = threads.find(t => t.id === activeThreadId);
      if (thread && thread.unread) {
        onThreadsUpdate(threads.map(t => t.id === activeThreadId ? { ...t, unread: false } : t));
      }
    }
  }, [activeThreadId, threads, onThreadsUpdate]);

  const setActiveThreadId = (id: string) => {
    setInternalActiveThreadId(id);
    if (onThreadChange) onThreadChange(id);
  };
  const [searchTerm, setSearchTerm] = useState("");
  const [composeText, setComposeText] = useState("");
  const [pendingAttachment, setPendingAttachment] = useState<Attachment | null>(null);
  const [isNewMessageModalOpen, setIsNewMessageModalOpen] = useState(false);
  const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);
  const [isParentInfoModalOpen, setIsParentInfoModalOpen] = useState(false);
  const [isEditingParent, setIsEditingParent] = useState(false);
  const [editedParent, setEditedParent] = useState<Partial<Thread>>({});
  const [mobileView, setMobileView] = useState<'threads' | 'chat' | 'context'>('threads');
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);

  const [newMsgStudentId, setNewMsgStudentId] = useState(threads[0]?.studentId ?? "");
  const [newMsgText, setNewMsgText] = useState("");

  const chatBodyRef = useRef<HTMLDivElement>(null);

  const activeThread = useMemo(() => 
    threads.find(t => t.id === activeThreadId) || threads[0]
  , [activeThreadId, threads]);

  useEffect(() => {
    if (isParentInfoModalOpen) {
      setEditedParent({
        parentName: activeThread.parentName,
        parentPhone: activeThread.parentPhone,
        parentEmail: activeThread.parentEmail,
        parentAddress: activeThread.parentAddress || '',
        relation: activeThread.relation || ''
      });
      setIsEditingParent(false);
    }
  }, [isParentInfoModalOpen, activeThread]);

  const handleSaveParentInfo = () => {
    onThreadsUpdate(threads.map(t => {
      if (t.id === activeThreadId) {
        return {
          ...t,
          ...editedParent,
          parentInitials: editedParent.parentName ? editedParent.parentName.split(' ').map(n => n[0]).join('') : t.parentInitials
        };
      }
      return t;
    }));
    setIsEditingParent(false);
  };

  const filteredThreads = useMemo(() => {
    if (!searchTerm) return threads;
    const lower = searchTerm.toLowerCase();
    return threads.filter(t => 
      t.parentName.toLowerCase().includes(lower) || 
      t.studentName.toLowerCase().includes(lower)
    );
  }, [threads, searchTerm]);

  const scrollToBottom = useCallback(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [activeThread.messages, scrollToBottom]);

  // --- Handlers ---

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const voiceAttachment: Attachment = {
          type: "voice",
          title: "Voice Message",
          subtitle: `Audio Note`,
          value: formatDuration(recordingDuration),
          duration: formatDuration(recordingDuration)
        };
        setPendingAttachment(voiceAttachment);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      timerRef.current = window.setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Failed to start recording:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = null; // Prevent callback
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleMarkAllRead = () => {
    onThreadsUpdate(threads.map(t => ({ ...t, unread: false })));
  };

  const handleSendMessage = () => {
    if (!composeText.trim() && !pendingAttachment) return;

    const newMessage: Message = {
      id: `M-${Date.now()}`,
      sender: "teacher",
      text: composeText,
      time: "Just now",
      readAt: null,
      attachment: pendingAttachment
    };

    const updatedThreads = threads.map(t => {
      if (t.id === activeThreadId) {
        return {
          ...t,
          messages: [...t.messages, newMessage],
          preview: composeText || (pendingAttachment ? `Shared ${pendingAttachment.title}` : t.preview),
          lastTime: "Just now",
          unread: false // Should stay read if teacher sends a message
        };
      }
      return t;
    });

    onThreadsUpdate(updatedThreads);

    setComposeText("");
    setPendingAttachment(null);
    setShowAttachmentPicker(false);

    // Simulate read receipt (this will update the global state too)
    setTimeout(() => {
      onThreadsUpdate(updatedThreads.map(t => {
        if (t.id === activeThreadId) {
          return {
            ...t,
            messages: t.messages.map(m => m.id === newMessage.id ? { ...m, readAt: "Just now" } : m)
          };
        }
        return t;
      }));
    }, 2000);
  };

  const handleSendNewMessage = () => {
    if (!newMsgText.trim()) return;

    const existingThread = threads.find(t => t.studentId === newMsgStudentId);

    if (existingThread) {
      const newMessage: Message = {
        id: `M-${Date.now()}`,
        sender: "teacher",
        text: newMsgText,
        time: "Just now",
        readAt: null
      };

      onThreadsUpdate(threads.map(t => {
        if (t.id === existingThread.id) {
          return {
            ...t,
            messages: [...t.messages, newMessage],
            preview: newMsgText,
            lastTime: "Just now",
            unread: false
          };
        }
        return t;
      }));
      setActiveThreadId(existingThread.id);
    } 

    setNewMsgText("");
    setIsNewMessageModalOpen(false);
  };

  const attachReport = () => {
    const report: Attachment = {
      type: "report",
      title: "Progress report — Term 2",
      subtitle: `${activeThread.studentName} · ${activeThread.studentGrade}`,
      value: `${activeThread.studentSnapshot.overallAvg}%`
    };
    setPendingAttachment(report);
    setShowAttachmentPicker(false);
  };

  const attachHomework = (hw: { title: string; score: number | null; max: number }) => {
    const report: Attachment = {
      type: "homework",
      title: hw.title,
      subtitle: `Homework · ${activeThread.studentGrade} · Jun 1`,
      value: `${hw.score} / ${hw.max}`
    };
    setPendingAttachment(report);
    setShowAttachmentPicker(false);
  };

  const handleEmojiClick = (emoji: string) => {
    setComposeText(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const EMOJIS = ["👋", "👍", "😊", "🎉", "📚", "⭐", "💪", "💡", "📅", "🍎", "📝", "✅"];

  const unreadCount = threads.filter(t => t.unread).length;

  return (
    <div className="flex flex-row h-full w-full overflow-hidden bg-white relative">
      
      {/* --- LEFT COLUMN: THREAD LIST --- */}
      <motion.div 
        initial={false}
        animate={{ 
          width: isSidebarCollapsed ? 0 : 240,
          x: (typeof window !== 'undefined' && window.innerWidth < 1024 && mobileView !== 'threads') ? -240 : 0
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={`fixed lg:relative z-40 lg:z-auto h-full flex-shrink-0 bg-slate-50 border-r border-slate-100 flex flex-col overflow-hidden shadow-xl lg:shadow-none`}
      >
        <div className="w-[240px] flex flex-col h-full shrink-0">
          <header className="px-4 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="flex items-center gap-2 overflow-hidden cursor-pointer hover:opacity-70 transition-opacity"
          >
            <MessageCircle size={16} className="text-[#1a237e] shrink-0" />
            <span className="text-sm font-bold text-slate-800 tracking-tight whitespace-nowrap">Messages</span>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllRead}
                className="bg-blue-50 text-blue-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter shrink-0 hover:bg-blue-100 transition-colors flex items-center gap-1 group"
                title="Mark all as read"
              >
                <CheckCheck size={11} className="group-hover:scale-110 transition-transform" />
                {unreadCount}
              </button>
            )}
            <button 
              onClick={() => {
                if (window.innerWidth < 1024) setMobileView('chat');
              }}
              className="lg:hidden p-2 text-slate-400"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        <div className="px-2 mt-3 mb-2 shrink-0">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2.5 shadow-sm focus-within:ring-2 focus-within:ring-[#1a237e]/10 transition-all">
            <Search size={14} className="text-slate-300 shrink-0" />
            <input 
              type="text"
              placeholder="Search..."
              className="bg-transparent border-none text-[11px] text-slate-800 placeholder:text-slate-400 w-full focus:outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-1 custom-scrollbar">
          {filteredThreads.map(thread => (
            <div 
              key={thread.id}
              onClick={() => {
                setActiveThreadId(thread.id);
                if (window.innerWidth < 1024) setMobileView('chat');
              }}
              className={`flex row items-start gap-3 px-3 py-3.5 rounded-2xl cursor-pointer mb-1 transition-all group ${
                activeThreadId === thread.id ? 'bg-white shadow-md ring-1 ring-slate-100' : 'hover:bg-white/70'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black shrink-0 shadow-sm border ${getAvatarClasses(thread.avatarColor)}`}>
                {thread.parentInitials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-[11px] font-bold text-slate-800 truncate leading-none">{thread.parentName}</p>
                  <span className="text-[9px] text-slate-400 font-medium whitespace-nowrap ml-1">{thread.lastTime}</span>
                </div>
                <div className="flex items-center gap-1 mb-1">
                  <User size={9} className="text-slate-300 shrink-0" />
                  <span className="text-[9px] font-bold text-slate-400 truncate uppercase tracking-widest">{thread.studentName}</span>
                </div>
                <p className={`text-[10px] truncate leading-tight ${thread.unread ? 'text-slate-800 font-bold' : 'text-slate-500'}`}>
                  {thread.preview}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0 pt-0.5">
                {thread.unread ? (
                  <div className="w-2 h-2 bg-[#1a237e] rounded-full shadow-sm shadow-[#1a237e]/40" />
                ) : (
                  <CheckCheck size={11} className="text-emerald-500" />
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="px-2 mb-3 mt-1 shrink-0">
          <button 
            onClick={() => setIsNewMessageModalOpen(true)}
            className="w-full bg-[#1a237e] text-white rounded-xl py-3 text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-900 shadow-lg shadow-blue-900/20 active:scale-95 transition-all"
          >
            <Edit size={14} /> New message
          </button>
        </div>
        </div>
      </motion.div>

      {/* Collapse Toggle Button - Hidden on mobile */}
      <button 
        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        className="hidden lg:flex absolute top-1/2 -translate-y-1/2 z-30 w-8 h-12 bg-white border border-slate-200 rounded-r-2xl items-center justify-center shadow-[4px_0_10px_rgba(0,0,0,0.05)] hover:bg-slate-50 transition-all text-slate-400"
        style={{ left: isSidebarCollapsed ? '0px' : '240px' }}
      >
        {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* --- CENTER COLUMN: ACTIVE CONVERSATION --- */}
      <div className={`flex-1 min-w-0 bg-white flex flex-col h-full ${mobileView !== 'chat' && 'hidden lg:flex'}`}>
        <header className="px-4 lg:px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3 lg:gap-4 overflow-hidden">
            <button 
              onClick={() => setMobileView('threads')}
              className="lg:hidden p-2 -ml-2 text-slate-400 hover:text-[#1a237e]"
            >
              <ChevronLeft size={20} />
            </button>
            <div 
              onClick={() => setIsParentInfoModalOpen(true)}
              className="flex items-center gap-3 lg:gap-4 cursor-pointer hover:opacity-80 transition-opacity overflow-hidden"
            >
              <div className={`w-9 h-9 lg:w-11 lg:h-11 rounded-full flex items-center justify-center text-xs lg:text-sm font-black shadow-inner border-2 border-white shrink-0 ${getAvatarClasses(activeThread.avatarColor)}`}>
                {activeThread.parentInitials}
              </div>
              <div className="min-w-0">
                <h2 className="text-[12px] lg:text-[14px] font-bold text-slate-900 leading-tight truncate">{activeThread.parentName}</h2>
                <div className="flex items-center gap-2 mt-0.5 lg:mt-1">
                  <span className="bg-blue-50 text-[#1a237e] text-[8px] lg:text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border border-blue-100 flex items-center gap-1 shrink-0">
                    <User size={10} /> {activeThread.studentName.split(' ')[0]}
                  </span>
                  <span className="text-[9px] lg:text-[10px] text-slate-400 font-medium truncate">· {activeThread.lastTime}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 lg:gap-2 shrink-0">
            <button 
              onClick={() => setMobileView('context')}
              className="lg:hidden p-2 border border-slate-100 rounded-xl text-slate-400 hover:bg-slate-50 transition-all shadow-sm"
            >
              <UserCircle size={18} />
            </button>
            <button 
              onClick={() => setIsRightPanelCollapsed(!isRightPanelCollapsed)}
              className={`p-2 border rounded-xl transition-all shadow-sm ${!isRightPanelCollapsed ? 'bg-[#1a237e] text-white border-[#1a237e]' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}
              title="Toggle Info Panel"
            >
              <MoreVertical size={18} />
            </button>
          </div>
        </header>

        <div 
          ref={chatBodyRef}
          className="flex-1 overflow-y-auto px-4 lg:px-6 py-4 lg:py-6 flex flex-col gap-4 custom-scrollbar bg-slate-50/20"
        >
          <div className="text-center py-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 border-b border-slate-100 px-4 pb-1">Today</span>
          </div>

          {activeThread.messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex ${msg.sender === 'teacher' ? 'flex-row-reverse' : 'flex-row'} gap-2 lg:gap-3 items-end`}
            >
              {msg.sender === 'parent' && (
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 mb-1 border-2 border-white shadow-sm ${getAvatarClasses(activeThread.avatarColor)}`}>
                  {activeThread.parentInitials}
                </div>
              )}
              <div className="flex flex-col gap-1 max-w-[85%] lg:max-w-[72%]">
                <div className={`px-3 lg:px-4 py-2.5 lg:py-3 text-[11px] leading-relaxed shadow-sm ${
                  msg.sender === 'teacher' 
                    ? 'bg-[#1a237e] text-white rounded-2xl rounded-tr-sm' 
                    : 'bg-white border border-slate-100 text-slate-800 rounded-2xl rounded-tl-sm'
                }`}>
                  {msg.text}
                  
                  {msg.attachment && (
                    <div className={`mt-3 p-2.5 lg:p-3 rounded-xl border flex items-center gap-2 lg:gap-3 transition-all ${
                      msg.sender === 'teacher' 
                        ? 'bg-white/10 border-white/20' 
                        : 'bg-slate-50 border-slate-100'
                    }`}>
                      <div className={`p-1.5 lg:p-2 rounded-lg ${msg.sender === 'teacher' ? 'bg-white/20' : 'bg-white shadow-sm'}`}>
                        {msg.attachment.type === 'report' ? (
                          <BarChart2 size={14} className={msg.sender === 'teacher' ? 'text-white' : 'text-[#1a237e]'} />
                        ) : msg.attachment.type === 'homework' ? (
                          <ClipboardList size={14} className={msg.sender === 'teacher' ? 'text-white' : 'text-[#1a237e]'} />
                        ) : (
                          <Volume2 size={14} className={msg.sender === 'teacher' ? 'text-white' : 'text-[#1a237e]'} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-[10px] font-bold truncate ${msg.sender === 'teacher' ? 'text-white' : 'text-slate-800'}`}>{msg.attachment.title}</p>
                        {msg.attachment.type === 'voice' ? (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <div className="flex-1 h-1 bg-slate-200/30 rounded-full overflow-hidden">
                              <div className={`h-full w-full opacity-30 ${msg.sender === 'teacher' ? 'bg-white' : 'bg-[#1a237e]'}`} />
                            </div>
                            <span className={`text-[8px] font-black shrink-0 ${msg.sender === 'teacher' ? 'text-white/80' : 'text-slate-400'}`}>{msg.attachment.duration}</span>
                          </div>
                        ) : (
                          <p className={`text-[9px] font-medium truncate ${msg.sender === 'teacher' ? 'text-white/60' : 'text-slate-400'}`}>{msg.attachment.subtitle}</p>
                        )}
                      </div>
                      <div className={`text-[10px] lg:text-[11px] font-black shrink-0 ${msg.sender === 'teacher' ? 'text-white' : 'text-[#1a237e]'}`}>
                        {msg.attachment.type !== 'voice' && msg.attachment.value}
                      </div>
                    </div>
                  )}
                </div>
                <div className={`flex items-center gap-1.5 px-1 ${msg.sender === 'teacher' ? 'justify-end' : 'justify-start'}`}>
                  <span className="text-[8px] lg:text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{msg.time}</span>
                  {msg.sender === 'teacher' && (
                    <div className="flex items-center gap-1">
                      <CheckCheck size={10} className={msg.readAt ? 'text-emerald-500' : 'text-slate-300'} />
                      {msg.readAt && <span className="text-[8px] lg:text-[9px] font-bold text-emerald-500 uppercase tracking-tighter">Read</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* COMPOSE BAR */}
        <div className="p-3 lg:p-4 border-t border-slate-100 bg-white space-y-3 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
          <AnimatePresence>
            {pendingAttachment && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                className="p-2 lg:p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3 shadow-sm relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-[#1a237e]" />
                <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-50">
                  {pendingAttachment.type === 'report' ? <BarChart2 size={16} className="text-[#1a237e]" /> : <ClipboardList size={16} className="text-[#1a237e]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-tight text-slate-800">{pendingAttachment.title}</p>
                  <p className="text-[9px] font-medium text-slate-400">
                    {pendingAttachment.type === 'voice' ? `Duration: ${pendingAttachment.duration}` : pendingAttachment.subtitle}
                  </p>
                </div>
                <button 
                  onClick={() => setPendingAttachment(null)}
                  className="p-1.5 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-lg transition-all"
                >
                  <X size={14} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative group flex items-end gap-2 lg:gap-3">
            <div className="flex-1 relative">
              {isRecording ? (
                <div className="w-full bg-[#1a237e]/5 border border-[#1a237e]/10 rounded-2xl lg:rounded-[1.25rem] px-4 py-3 lg:py-4 flex items-center justify-between min-h-[48px] lg:min-h-[64px]">
                  <div className="flex items-center gap-3">
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="w-2.5 h-2.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                    />
                    <span className="text-xs font-black text-[#1a237e] uppercase tracking-widest tabular-nums">
                      {formatDuration(recordingDuration)}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400 ml-2 animate-pulse">Recording voice message...</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={cancelRecording}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-white rounded-lg transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                    <button 
                      onClick={stopRecording}
                      className="p-2 bg-[#1a237e] text-white rounded-lg shadow-md hover:bg-blue-900 transition-all active:scale-95"
                    >
                      <Square size={16} fill="white" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <textarea 
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl lg:rounded-[1.25rem] px-4 py-3 lg:py-4 text-[11px] text-slate-800 placeholder:text-slate-400 resize-none min-h-[48px] lg:min-h-[64px] focus:outline-none focus:ring-4 focus:ring-[#1a237e]/5 focus:bg-white focus:border-[#1a237e]/20 transition-all custom-scrollbar pt-3.5 lg:pt-4"
                    placeholder="Message..."
                    value={composeText}
                    onChange={(e) => setComposeText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <div className="absolute left-2 bottom-2.5 lg:bottom-4 flex gap-1">
                    <button 
                      onClick={() => setShowAttachmentPicker(!showAttachmentPicker)}
                      className={`p-1.5 lg:p-2 rounded-lg transition-all ${showAttachmentPicker ? 'bg-[#1a237e] text-white' : 'text-slate-400 hover:text-[#1a237e]'}`}
                    >
                      <Paperclip size={16} />
                    </button>
                    <button 
                      onClick={startRecording}
                      className="p-1.5 lg:p-2 rounded-lg text-slate-400 hover:text-[#1a237e] transition-all"
                    >
                      <Mic size={16} />
                    </button>
                    <button 
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className={`p-1.5 lg:p-2 rounded-lg transition-all ${showEmojiPicker ? 'bg-[#1a237e] text-white' : 'text-slate-400 hover:text-[#1a237e]'}`}
                    >
                      <Smile size={16} />
                    </button>
                  </div>
                </>
              )}
            </div>
            
            <button 
              onClick={handleSendMessage}
              disabled={isRecording}
              className={`bg-[#1a237e] text-white rounded-full lg:rounded-xl p-3 lg:px-8 lg:py-3 text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-900 shadow-lg shadow-blue-900/20 active:scale-95 transition-all shrink-0 ${isRecording ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Send size={15} /> <span className="hidden lg:inline">Send</span>
            </button>

            {/* Emoji Picker Popover */}
            <AnimatePresence>
              {showEmojiPicker && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute bottom-full left-0 mb-3 w-48 bg-white border border-slate-100 rounded-2xl shadow-2xl z-20 p-3 border-b-4 border-b-[#1a237e]"
                >
                  <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-50">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#1a237e]">Emojis</span>
                    <button onClick={() => setShowEmojiPicker(false)} className="text-slate-300 hover:text-slate-600 p-1"><X size={12} /></button>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {EMOJIS.map(emoji => (
                      <button 
                        key={emoji}
                        onClick={() => handleEmojiClick(emoji)}
                        className="p-2 hover:bg-slate-50 rounded-xl text-lg transition-all active:scale-90"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Attachment Picker Popover */}
            <AnimatePresence>
              {showAttachmentPicker && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute bottom-full left-0 mb-3 w-64 bg-white border border-slate-100 rounded-2xl shadow-2xl z-20 p-4 border-b-4 border-b-[#1a237e]"
                >
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-50">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#1a237e]">Attach Homework</span>
                    <button onClick={() => setShowAttachmentPicker(false)} className="text-slate-300 hover:text-slate-600 p-1"><X size={12} /></button>
                  </div>
                  <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-2">
                    {activeThread.studentSnapshot.recentHomework.map((hw, idx) => (
                      <button 
                        key={idx}
                        onClick={() => attachHomework(hw)}
                        className="w-full p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all text-left flex flex-col gap-1"
                      >
                        <p className="text-[10px] font-bold text-slate-800 line-clamp-1">{hw.title}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-[8px] font-medium text-slate-400">Physics · Jun 1</span>
                          <span className={`text-[9px] font-black ${getScoreColor(hw.score, hw.max)}`}>{hw.score} / {hw.max}</span>
                        </div>
                      </button>
                    ))}
                    <button 
                      onClick={attachReport}
                      className="w-full p-3 rounded-xl bg-blue-50/50 border border-blue-100 hover:bg-blue-100 transition-all text-[10px] font-black text-[#1a237e] uppercase tracking-widest flex items-center gap-2"
                    >
                      <BarChart2 size={14} /> Attach Report
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* --- RIGHT COLUMN: STUDENT CONTEXT PANEL --- */}
      <motion.div 
        initial={false}
        animate={{ 
          width: isRightPanelCollapsed ? 0 : 240,
          x: (typeof window !== 'undefined' && window.innerWidth < 1024 && mobileView !== 'context') ? 240 : 0
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={`fixed lg:relative right-0 lg:right-auto z-40 lg:z-auto h-full flex-shrink-0 bg-white border-l border-slate-100 flex flex-col overflow-y-auto shadow-2xl lg:shadow-none custom-scrollbar`}
      >
        <div className="w-[240px] flex flex-col shrink-0 min-h-full">
          <header className="lg:hidden px-4 py-4 border-b border-slate-100 flex items-center justify-between">
            <button 
              onClick={() => setMobileView('chat')}
              className="text-slate-400 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2"
            >
              <ChevronLeft size={16} /> Back to Chat
            </button>
          </header>

          <section className="px-5 py-6 border-b border-slate-100 bg-white">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Focus Student</p>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black border-2 border-white shadow-md ${getAvatarClasses(activeThread.avatarColor)}`}>
              {activeThread.studentName.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="min-w-0">
              <h3 className="text-[13px] font-bold text-slate-900 leading-tight truncate">{activeThread.studentName}</h3>
              <p className="text-[10px] font-mono text-slate-400 mt-0.5">{activeThread.studentId}</p>
              <div className="mt-2 flex">
                <span className="bg-slate-100 text-slate-600 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest">{activeThread.studentGrade}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 py-6 border-b border-slate-100">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Parent Contact</p>
          <div className="space-y-4">
            {[
              { label: activeThread.parentName, icon: User },
              { label: activeThread.parentPhone, icon: Phone },
              { label: activeThread.parentEmail, icon: Mail }
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-slate-300 shadow-sm border border-slate-50">
                  <item.icon size={14} />
                </div>
                <span className="text-[11px] font-medium text-slate-600 truncate">{item.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="px-5 py-6 border-b border-slate-100">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-5">Academic Snapshot</p>
          <div className="space-y-5">
            {[
              { label: "Overall Average", value: activeThread.studentSnapshot.overallAvg, color: activeThread.studentSnapshot.overallAvg >= 75 ? 'emerald' : activeThread.studentSnapshot.overallAvg >= 50 ? 'amber' : 'red' },
              { label: "Total Attendance", value: activeThread.studentSnapshot.attendance, color: activeThread.studentSnapshot.attendance >= 90 ? 'blue' : 'amber' },
              { label: "Parent Engagement", value: activeThread.studentSnapshot.parentEngagement, color: 'amber' }
            ].map((stat, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                  <span className="text-slate-400">{stat.label}</span>
                  <span className={stat.color === 'emerald' ? 'text-emerald-500' : stat.color === 'blue' ? 'text-blue-500' : 'text-amber-500'}>{stat.value}%</span>
                </div>
                <div className="h-1.5 bg-slate-200/50 rounded-full overflow-hidden border border-white">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${stat.value}%` }}
                    className={`h-full rounded-full ${
                      stat.color === 'emerald' ? 'bg-emerald-500' : stat.color === 'blue' ? 'bg-blue-500' : 'bg-amber-500'
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="px-5 py-6 border-b border-slate-100 bg-white/40">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Recent Homework</p>
          <div className="space-y-3">
            {activeThread.studentSnapshot.recentHomework.map((hw, idx) => (
              <div key={idx} className="flex justify-between items-start gap-2 bg-white p-2.5 rounded-xl shadow-sm border border-slate-50">
                <span className="text-[10px] font-bold text-slate-600 line-clamp-1">{hw.title}</span>
                <span className={`text-[10px] font-black whitespace-nowrap ${getScoreColor(hw.score, hw.max)}`}>
                  {hw.score || '—'} / {hw.max}
                </span>
              </div>
            ))}
          </div>
        </section>
        </div>
      </motion.div>

      {/* Right Panel Toggle Button - Hidden on mobile */}
      <button 
        onClick={() => setIsRightPanelCollapsed(!isRightPanelCollapsed)}
        className="hidden lg:flex absolute top-1/2 -translate-y-1/2 z-30 w-8 h-12 bg-white border border-slate-200 rounded-l-2xl items-center justify-center shadow-[-4px_0_10px_rgba(0,0,0,0.05)] hover:bg-slate-50 transition-all text-slate-400"
        style={{ right: isRightPanelCollapsed ? '0px' : '240px' }}
      >
        {isRightPanelCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>

      {/* Mobile Overlays - Backdrop */}
      <AnimatePresence>
        {(mobileView === 'threads' || mobileView === 'context') && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileView('chat')}
            className="lg:hidden fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-30"
          />
        )}
      </AnimatePresence>

      {/* PARENT INFO MODAL */}
      <AnimatePresence>
        {isParentInfoModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsParentInfoModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white rounded-3xl lg:rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden flex flex-col border-b-8 border-b-[#1a237e]"
            >
              <div className="p-6 lg:p-8 flex flex-col items-center">
                <div className="w-full flex items-center justify-between mb-6">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Parent Profile</span>
                  <button 
                    onClick={() => setIsParentInfoModalOpen(false)}
                    className="p-2 text-slate-300 hover:text-slate-600 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className={`w-20 h-20 lg:w-24 lg:h-24 rounded-[2rem] flex items-center justify-center text-2xl lg:text-3xl font-black shadow-xl border-4 border-white mb-6 shrink-0 ${getAvatarClasses(activeThread.avatarColor)}`}>
                  {activeThread.parentInitials}
                </div>

                {isEditingParent ? (
                  <input 
                    className="w-full text-center text-xl lg:text-2xl font-black text-slate-900 uppercase tracking-tight bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-[#1a237e]/10"
                    value={editedParent.parentName}
                    onChange={(e) => setEditedParent({...editedParent, parentName: e.target.value})}
                  />
                ) : (
                  <h2 className="text-xl lg:text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">{activeThread.parentName}</h2>
                )}

                <div className="flex items-center gap-2 mb-6">
                  <span className="bg-blue-50 text-[#1a237e] text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-blue-100 flex items-center gap-2">
                    <User size={12} /> Parent of {activeThread.studentName}
                  </span>
                </div>

                <div className="w-full space-y-3 overflow-y-auto max-h-[350px] pr-1 custom-scrollbar">
                  {[
                    { label: 'Role / Relation', value: editedParent.relation, icon: User, key: 'relation' },
                    { label: 'Phone Number', value: editedParent.parentPhone, icon: Phone, key: 'parentPhone' },
                    { label: 'Email Address', value: editedParent.parentEmail, icon: Mail, key: 'parentEmail' },
                    { label: 'Address', value: editedParent.parentAddress, icon: Search, key: 'parentAddress' },
                  ].map((field) => (
                    <div key={field.key} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[#1a237e] shadow-sm shrink-0">
                        <field.icon size={14} />
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">{field.label}</p>
                        {isEditingParent ? (
                          <input 
                            className="w-full text-xs font-bold text-slate-700 bg-transparent border-b border-slate-200 focus:outline-none focus:border-[#1a237e]"
                            value={field.value}
                            onChange={(e) => setEditedParent({...editedParent, [field.key]: e.target.value})}
                          />
                        ) : (
                          <p className="text-[11px] font-bold text-slate-700 truncate">{field.value || 'Not provided'}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="w-full mt-8 flex gap-3">
                  {isEditingParent ? (
                    <>
                      <button 
                        onClick={() => setIsEditingParent(false)}
                        className="flex-1 py-4 border-2 border-slate-100 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleSaveParentInfo}
                        className="flex-1 py-4 bg-[#1a237e] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-900/20 hover:bg-blue-900 transition-all active:scale-95"
                      >
                        Save Changes
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => setIsEditingParent(true)}
                      className="w-full py-4 bg-[#1a237e] text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-blue-900/20 hover:bg-blue-900 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Edit size={14} /> Edit Profile
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* NEW MESSAGE MODAL */}
      <AnimatePresence>
        {isNewMessageModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNewMessageModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white rounded-3xl lg:rounded-[2rem] shadow-2xl w-full max-w-md p-6 lg:p-10 flex flex-col gap-6 lg:gap-8 border-b-8 border-b-[#1a237e]"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl lg:text-2xl font-black text-slate-900 uppercase tracking-tight">New Message</h2>
                  <p className="text-[9px] lg:text-xs font-medium text-slate-400 uppercase tracking-widest mt-1">Start a conversation</p>
                </div>
                <button 
                  onClick={() => setIsNewMessageModalOpen(false)}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-slate-300 hover:bg-slate-50"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex flex-col gap-5 lg:gap-6">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Select Student</p>
                  <div className="relative group">
                    <select 
                      value={newMsgStudentId}
                      onChange={(e) => setNewMsgStudentId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 lg:px-5 lg:py-4 text-xs lg:text-sm font-bold text-slate-700 outline-none appearance-none focus:bg-white focus:border-[#1a237e]/20 transition-all cursor-pointer"
                    >
                      {threads.map(t => (
                        <option key={t.id} value={t.studentId}>{t.studentName.split(' ')[0]} · {t.studentGrade} ({t.parentName.split(' ')[0]})</option>
                      ))}
                    </select>
                    <ChevronDown size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none group-focus-within:text-[#1a237e]" />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Message</p>
                  <textarea 
                    rows={4}
                    placeholder="Write your message..."
                    value={newMsgText}
                    onChange={(e) => setNewMsgText(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 lg:px-5 lg:py-4 text-xs lg:text-sm font-medium text-slate-700 outline-none focus:bg-white focus:border-[#1a237e]/20 transition-all resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 lg:gap-4 pt-2 lg:pt-4">
                <button 
                  onClick={() => setIsNewMessageModalOpen(false)}
                  className="flex-1 py-4 lg:py-5 border-2 border-slate-100 text-slate-400 rounded-2xl text-[10px] lg:text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSendNewMessage}
                  className="flex-1 py-4 lg:py-5 bg-[#1a237e] text-white rounded-2xl text-[10px] lg:text-[11px] font-black uppercase tracking-widest shadow-xl shadow-blue-900/30 hover:bg-blue-900 active:scale-95 transition-all"
                >
                  Send Message
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default React.memo(MessagesModule);
