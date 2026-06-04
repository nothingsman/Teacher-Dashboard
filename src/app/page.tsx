"use client";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  GraduationCap,
  FileText,
  LayoutDashboard,
  UserCheck,
  BookOpen,
  ClipboardList,
  BarChart3,
  Home,
  MessageSquare,
  Calendar,
  Bell,
  Search,
  Filter,
  Download,
  ChevronRight,
  Menu,
  ChevronDown,
  Phone,
  Info,
  ExternalLink,
  ArrowRight,
  Calculator,
  Atom,
  FlaskConical,
  Hexagon,
  Check,
  User,
  Pencil,
  LogOut,
  MessageSquareWarning,
  Settings,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import StudentsModule from "../components/StudentsModule";
import ActivitiesModule from "../components/ActivitiesModule";
import TasksModule from "../components/TasksModule";
import GradebookModule from "../components/GradebookModule";
import AnalyticsModule from "../components/AnalyticsModule";
import HomeworksModule from "../components/HomeworksModule";
import MessagesModule from "../components/MessagesModule";
import {
  PerformanceDistribution,
  ParentEngagementChart,
} from "../components/AnalyticsCharts";
import type { BranchParent, ChatMessage, ChatThread, Thread, ThreadMessage } from "../services";
import {
  createChatThread,
  formatThreadTimestamp,
  getStudents,
  getStudentsBySectionId,
  getNotifications,
  markAllNotificationsRead,
  getStudentAnalytics,
  getTeacherProfile,
  listChatThreads,
  listThreadMessages,
  logoutTeacher,
  getTeacherSections,
} from "../services";
import {
  createAttendanceRecord,
  getAttendanceBySectionDate,
  updateAttendanceRecord,
} from "../services/attendanceService";
import { getAssessmentsForContext } from "../services/assessmentsService";
import { getAccessToken, getTeacherId } from "../services/authStore";
import { restoreTeacherSession } from "../services/authService";
import { HomeroomProvider } from "../contexts/HomeroomContext";
import { checkHomeroomStatus } from "../services/homeroomService";
import { fetchSchoolInfo } from "../services/schoolService";
import { getParentsByBranch } from "../services/parentLinksService";
import { ensureTeacherOrgBranch } from "../services/profileService";
import { formatApiError } from "../services/errorUtils";
import type {
  AttendanceListItem,
  Student,
  TeacherProfile,
  StudentAnalytics,
  TeacherSection,
} from "../services";
import SettingsModal from "../components/SettingsModal";
import ProfileModal from "../components/ProfileModal";
import ScheduleModule, {
  OverviewScheduleWidget,
} from "../components/ScheduleModule";

// --- Sub-components ---

const SidebarItem = ({
  icon: Icon,
  label,
  isActive = false,
  count,
  onClick,
}: {
  icon: any;
  label: string;
  isActive?: boolean;
  count?: number;
  onClick: () => void;
}) => {
  const visibleCount = typeof count === "number" && count > 0 ? count : null;
  const highlightUnread = label === "Messages" || label === "Notifications";

  return (
    <motion.button
      whileHover={{ x: 4 }}
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 sm:px-4 min-h-[44px] py-2 sm:py-3 rounded-lg transition-colors duration-200 ${
        isActive
          ? "bg-[#1A237E] text-white shadow-lg shadow-blue-900/20"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
        <span className="text-sm font-medium tracking-tight">{label}</span>
      </div>
      {visibleCount !== null && (
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
            highlightUnread
              ? "bg-blue-600 text-white"
              : isActive
                ? "bg-white/20 text-white"
                : "bg-slate-200 text-slate-600"
          }`}
        >
          {visibleCount}
        </span>
      )}
    </motion.button>
  );
};

const MetricCard = ({
  label,
  value,
  subtitle,
  icon: Icon,
}: {
  label: string;
  value: string;
  subtitle: string;
  icon: any;
}) => (
  <div className="bg-white border border-slate-100 p-6 rounded-2xl flex items-center justify-between shadow-sm">
    <div>
      <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1">
        {label}
      </p>
      <h3 className="text-3xl font-mono font-bold text-slate-900 tabular-nums">
        {value}
      </h3>
      <p
        className={`text-[11px] font-medium mt-1 ${
          subtitle.includes("+") ? "text-emerald-600" : "text-amber-500"
        }`}
      >
        {subtitle}
      </p>
    </div>
    <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
      <Icon size={24} />
    </div>
  </div>
);

// Custom select for sidebar that avoids iOS native picker clipping bug
const SidebarSelect = ({
  value,
  onChange,
  options,
  icon,
  className = "",
}: {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  icon?: React.ReactNode;
  className?: string;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-1.5 pl-2.5 pr-1.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[9px] font-black text-slate-600 hover:border-[#1A237E]/30 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1A237E]/5 uppercase tracking-tighter shadow-xs min-h-[32px]"
      >
        {icon && <span className="shrink-0">{icon}</span>}
        <span className="flex-1 truncate text-left">{selected?.label ?? value}</span>
        <ChevronDown size={10} className="text-slate-400 shrink-0" />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-[200] max-h-48 overflow-y-auto">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-[10px] font-bold uppercase tracking-tight transition-colors ${
                opt.value === value
                  ? "bg-[#1A237E] text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

interface MessageRowProps {
  sender: string;
  time: string;
  excerpt: string;
  onReply?: () => void;
}

const MessageRow: React.FC<MessageRowProps> = ({
  sender,
  time,
  excerpt,
  onReply,
}) => (
  <div
    className="py-4 border-b border-slate-50 last:border-0 group cursor-pointer"
    onClick={onReply}
  >
    <div className="flex justify-between items-start mb-1">
      <span className="text-xs font-bold text-slate-900 uppercase tracking-tight">
        {sender}
      </span>
      <span className="text-[10px] font-mono text-slate-400 uppercase">
        {time}
      </span>
    </div>
    <p className="text-xs text-slate-500 italic mb-2 line-clamp-2 leading-relaxed">
      "{excerpt}"
    </p>
    <button
      onClick={(e) => {
        e.stopPropagation();
        onReply?.();
      }}
      className="text-[10px] font-black text-[#1A237E] hover:underline flex items-center gap-1 uppercase tracking-widest"
    >
      Reply <ChevronRight size={10} />
    </button>
  </div>
);

const TimelineItem = ({
  time,
  subject,
  duration,
  isLive = false,
}: {
  time: string;
  subject: string;
  duration: string;
  isLive?: boolean;
}) => (
  <div className="flex items-center gap-6 py-4 border-b border-slate-50 relative group">
    <div className="w-20 shrink-0">
      <span className="text-xs font-mono font-medium text-slate-400">
        {time}
      </span>
    </div>
    <div className="flex-1 flex items-center gap-3">
      <h4 className="text-sm font-bold text-slate-800 tracking-tight">
        {subject}
      </h4>
      {isLive && (
        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[9px] font-black rounded uppercase tracking-widest animate-pulse">
          Live
        </span>
      )}
    </div>
    <div className="flex items-center gap-4">
      <span className="text-[10px] font-medium text-slate-400">{duration}</span>
      <button className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:bg-slate-100 hover:text-[#1A237E] transition-all">
        <ChevronRight size={16} />
      </button>
    </div>
  </div>
);

const THREAD_AVATAR_COLORS: Thread["avatarColor"][] = [
  "blue",
  "teal",
  "purple",
  "amber",
  "green",
];

function buildThreadPreview(messages: ChatMessage[]) {
  const latest = messages[messages.length - 1];
  if (!latest) {
    return { preview: "", lastTime: "", updatedAt: "" };
  }
  return {
    preview: latest.text?.trim() || (latest.attachment ? "Attachment shared" : ""),
    lastTime: formatThreadTimestamp(latest.created_at),
    updatedAt: latest.created_at,
  };
}

function buildThreadMessages(messages: ChatMessage[], parentUserId?: string): ThreadMessage[] {
  return messages.map((message) => ({
    id: message.id,
    senderId: message.sender_id,
    senderRole: message.sender_id === parentUserId ? "parent" : "teacher",
    text: message.text,
    createdAt: message.created_at,
    attachmentId: message.attachment,
    readByIds: message.read_by_ids,
  }));
}

function toThreadView(
  thread: ChatThread,
  messages: ChatMessage[],
  students: Student[],
  parents: BranchParent[],
): Thread {
  const student = students.find((item) => item.id === thread.student);
  const parent =
    parents.find((item) => item.parentId === thread.parent) ||
    parents.find((item) => item.studentIds.includes(thread.student));
  const fallbackMessages = messages.length
    ? messages
    : thread.latest_message
      ? [thread.latest_message]
      : [];
  const preview = buildThreadPreview(fallbackMessages);
  const colorSeed = [...thread.id].reduce((acc, char) => acc + char.charCodeAt(0), 0);

  return {
    id: thread.id,
    parentId: thread.parent,
    teacherId: thread.teacher,
    studentId: thread.student,
    parentName: parent?.parentName || student?.parentName || "Parent",
    parentInitials:
      (parent?.parentName || student?.parentName || "Parent")
        .split(" ")
        .map((value) => value[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "PA",
    parentPhone: parent?.parentPhone || student?.parentPhone || "",
    parentEmail: parent?.parentEmail || student?.parentEmail || "",
    studentName: student?.name || "Student",
    studentGrade: student?.section || student?.grade || "",
    avatarColor: THREAD_AVATAR_COLORS[colorSeed % THREAD_AVATAR_COLORS.length],
    unread: thread.unread_count > 0,
    unreadCount: thread.unread_count,
    lastTime: preview.lastTime || formatThreadTimestamp(thread.updated_at),
    preview: preview.preview,
    updatedAt: preview.updatedAt || thread.updated_at,
    messages: buildThreadMessages(messages, parent?.userId),
  };
}

// --- Main Dashboard ---

export default function App() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [activeTab, setActiveTab] = useState("Overview");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewDate, setViewDate] = useState(new Date());
  const [attendanceView, setAttendanceView] = useState<
    "Day" | "Week" | "Month"
  >("Day");
  const [attendanceFilter, setAttendanceFilter] = useState<
    "all" | "present" | "absent" | "late"
  >("all");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null,
  );
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(
    new Set(),
  );
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [globalGrade, setGlobalGrade] = useState("");
  const [globalSection, setGlobalSection] = useState("");
  const [activeMessageThreadId, setActiveMessageThreadId] = useState<
    string | null
  >(null);
  const [rawMessageThreads, setRawMessageThreads] = useState<ChatThread[]>([]);
  const [messageThreads, setMessageThreads] = useState<Thread[]>([]);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isHomeroomTeacher, setIsHomeroomTeacher] = useState(false);
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const [branchName, setBranchName] = useState<string>("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchSchoolInfo()
      .then((info) => {
        if (info) {
          setSchoolName(info.schoolName);
          setBranchName(info.branchName);
          setLogoUrl(info.logoUrl);
        }
      })
      .catch(() => {});
  }, []);

  const toLocalISODate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const selectedDateISO = toLocalISODate(selectedDate);
  const todayISO = toLocalISODate(new Date());
  const isSelectedDateReadOnly = selectedDateISO > todayISO;
  const isAttendanceReadOnly = !isHomeroomTeacher;
  const cantEdit = isAttendanceReadOnly || selectedDateISO !== todayISO;

  useEffect(() => {
    if (isAttendanceReadOnly && attendanceView !== "Day") {
      setAttendanceView("Day");
    }
  }, [isAttendanceReadOnly, attendanceView]);

  type ToastKind = "error" | "info" | "success";
  type Toast = { id: string; kind: ToastKind; message: string };
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = (kind: ToastKind, message: string) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [...prev, { id, kind, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const formatErrorMessage = (err: unknown, fallback: string) => {
    return formatApiError(err, fallback).message;
  };

  useEffect(() => {
    let cancelled = false;

    const initAuth = async () => {
      if (getAccessToken()) {
        if (!cancelled) setAuthChecked(true);
        return;
      }

      const restored = await restoreTeacherSession();
      if (cancelled) return;
      if (!restored) {
        router.replace("/login");
        return;
      }
      setAuthChecked(true);
    };

    initAuth().catch(() => {
      if (!cancelled) {
        router.replace("/login");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!isProfileMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!profileMenuRef.current) return;
      if (!profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [isProfileMenuOpen]);

  const [notifications, setNotifications] = useState<
    import("../services").Notification[]
  >([]);

  useEffect(() => {
    if (!authChecked) return;
    getNotifications()
      .then(setNotifications)
      .catch(() => {});
  }, [authChecked]);

  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(
    null,
  );
  const [branchParents, setBranchParents] = useState<BranchParent[]>([]);

  useEffect(() => {
    if (!authChecked) return;
    getTeacherProfile()
      .then(setTeacherProfile)
      .catch(() => {});
  }, [authChecked]);

  useEffect(() => {
    if (!authChecked) return;
    let cancelled = false;

    (async () => {
      try {
        const orgInfo = await ensureTeacherOrgBranch();
        if (!orgInfo.branchId || cancelled) return;
        const parents = await getParentsByBranch(orgInfo.branchId);
        if (!cancelled) {
          setBranchParents(parents);
        }
      } catch {
        if (!cancelled) {
          setBranchParents([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authChecked]);

  const [students, setStudents] = useState<Student[]>([]);
  const [sectionStudentCount, setSectionStudentCount] = useState<number>(0);
  const [taskCount, setTaskCount] = useState<number>(0);
  const [sectionStudents, setSectionStudents] = useState<Student[]>([]);

  useEffect(() => {
    if (!authChecked) return;
    getStudents()
      .then(setStudents)
      .catch(() => {});
  }, [authChecked]);

  const [studentAnalytics, setStudentAnalytics] = useState<StudentAnalytics[]>(
    [],
  );

  useEffect(() => {
    if (!authChecked) return;
    getStudentAnalytics()
      .then(setStudentAnalytics)
      .catch(() => {});
  }, [authChecked]);

  const [selectedSubject, setSelectedSubject] = useState("");
  const [teacherSections, setTeacherSections] = useState<TeacherSection[]>([]);
  const [isLoadingSections, setIsLoadingSections] = useState(true);

  useEffect(() => {
    if (!authChecked) return;
    setIsLoadingSections(true);
    console.log("🔄 Loading teacher sections...");
    getTeacherSections()
      .then((sections) => {
        console.log("✅ Teacher sections loaded:", sections);
        setTeacherSections(sections);
      })
      .catch((error) => {
        console.error("❌ Failed to load teacher sections:", error);
      })
      .finally(() => setIsLoadingSections(false));
  }, [authChecked]);

  const mergeMessageThreadMetadata = React.useCallback(
    (rawThreads: ChatThread[], currentThreads: Thread[]) =>
      rawThreads
        .map((thread) => {
          const existing = currentThreads.find((item) => item.id === thread.id);
          const canReuseMessages = existing && existing.updatedAt === thread.updated_at;
          const threadMessages = canReuseMessages
            ? existing.messages.map((message) => ({
                id: message.id,
                thread: thread.id,
                sender: message.senderId,
                sender_id: message.senderId,
                text: message.text,
                attachment: message.attachmentId,
                read_by_ids: message.readByIds,
                created_at: message.createdAt,
                updated_at: message.createdAt,
              }))
            : [];

          const nextThread = toThreadView(
            thread,
            threadMessages,
            students,
            branchParents,
          );

          if (existing && !canReuseMessages && existing.messages.length > 0) {
            return {
              ...nextThread,
              messages: existing.messages,
            };
          }

          return nextThread;
        })
        .sort(
          (left, right) =>
            new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
        ),
    [branchParents, students],
  );

  const refreshMessageThreadMetadata = React.useCallback(async () => {
    const rawThreads = await listChatThreads();
    setRawMessageThreads(rawThreads);
    setMessageThreads((current) => mergeMessageThreadMetadata(rawThreads, current));
    return rawThreads;
  }, [mergeMessageThreadMetadata]);

  const hydrateMessageThread = React.useCallback(async (threadId: string) => {
    const messages = await listThreadMessages(threadId);
    setMessageThreads((current) => {
      const rawThread = rawMessageThreads.find((thread) => thread.id === threadId) ?? null;

      if (!rawThread) return current;

      const hydrated = toThreadView(rawThread, messages, students, branchParents);
      return current
        .map((thread) => (thread.id === threadId ? hydrated : thread))
        .sort(
          (left, right) =>
            new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
        );
    });
  }, [branchParents, rawMessageThreads, students]);

  useEffect(() => {
    if (!authChecked) return;
    refreshMessageThreadMetadata().catch(() => {
      setMessageThreads([]);
      setRawMessageThreads([]);
    });
  }, [authChecked, refreshMessageThreadMetadata]);

  useEffect(() => {
    if (!authChecked) return;

    const intervalId = window.setInterval(() => {
      refreshMessageThreadMetadata().catch(() => undefined);
    }, 15000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [authChecked, refreshMessageThreadMetadata]);

  const visibleMessageThreadId =
    activeMessageThreadId || messageThreads[0]?.id || null;

  useEffect(() => {
    if (!authChecked || activeTab !== "Messages" || !visibleMessageThreadId) return;
    hydrateMessageThread(visibleMessageThreadId).catch(() => undefined);
  }, [activeTab, authChecked, hydrateMessageThread, visibleMessageThreadId]);

  const availableParents = useMemo(() => {
    const threadedStudentIds = new Set(messageThreads.map((t) => t.studentId));
    return branchParents
      .filter((parent) => {
        const relevantStudents = parent.studentIds.filter(
          (sid) =>
            sectionStudents.length === 0 ||
            sectionStudents.some((s) => s.id === sid),
        );
        return relevantStudents.some((sid) => !threadedStudentIds.has(sid));
      })
      .map((parent) => {
        const student = students.find(
          (s) =>
            parent.studentIds.includes(s.id) && !threadedStudentIds.has(s.id),
        );
        const initials = parent.parentName
          .split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();
        return {
          parentId: parent.parentId,
          userId: parent.userId,
          parentName: parent.parentName,
          parentInitials: initials || "PA",
          parentPhone: parent.parentPhone,
          parentEmail: parent.parentEmail,
          studentId: student?.id || parent.studentIds[0] || "",
          studentName: student?.name || "Student",
          studentGrade: student?.grade || student?.section || "",
        };
      });
  }, [branchParents, messageThreads, students, sectionStudents]);

  const handleInitiateChat = useCallback(
    async (parentId: string, studentId: string) => {
      const teacherId = getTeacherId();
      if (!teacherId) return;

      try {
        const createdThread = await createChatThread({
          parent: parentId,
          teacher: teacherId,
          student: studentId,
        });
        await refreshMessageThreadMetadata();
        setActiveMessageThreadId(createdThread.id);
        setActiveTab("Messages");
      } catch {
        const rawThreads = await refreshMessageThreadMetadata();
        const match = rawThreads.find(
          (t) => t.student === studentId && t.parent === parentId,
        );
        if (match) setActiveMessageThreadId(match.id);
        setActiveTab("Messages");
      }
    },
    [refreshMessageThreadMetadata],
  );

  type AttendanceUiStatus = "present" | "absent" | "late" | "excused";
  type AttendanceUiEntry = {
    status: AttendanceUiStatus;
    id?: string;
    remarks?: string;
    needsReason?: boolean;
  };

  const [attendance, setAttendance] = useState<
    Record<string, Record<string, AttendanceUiEntry>>
  >({});

  const [attendanceLoadingKeys, setAttendanceLoadingKeys] = useState<
    Record<string, boolean>
  >({});
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [openRemarksForStudentId, setOpenRemarksForStudentId] = useState<
    string | null
  >(null);
  const [remarksDraftByStudentId, setRemarksDraftByStudentId] = useState<
    Record<string, string>
  >({});

  const normalizeAttendanceStatus = (status?: string) => {
    if (!status) return null;
    switch (status) {
      case "PRESENT":
        return "present" as const;
      case "ABSENT":
        return "absent" as const;
      case "EXCUSED":
        return "excused" as const;
      case "LATE":
        return "late" as const;
      default:
        return null;
    }
  };

  const buildAttendanceMap = (records: AttendanceListItem[]) => {
    return records.reduce(
      (acc, record) => {
        const normalized = normalizeAttendanceStatus(record.status);
        if (!normalized) return acc;
        acc[record.student] = {
          status: normalized,
          id: record.id,
          remarks: record.remarks,
          needsReason: record.needs_reason,
        };
        return acc;
      },
      {} as Record<string, AttendanceUiEntry>,
    );
  };

  const isAbsentLike = (status?: string) => {
    return status === "absent" || status === "excused";
  };

  const isReasonRequiredLike = (status?: AttendanceUiStatus | null) => {
    return status === "absent" || status === "late" || status === "excused";
  };

  const getStatusColor = (
    status?: AttendanceUiStatus | null,
    opts?: { loading?: boolean; future?: boolean },
  ) => {
    if (opts?.future) return "bg-slate-50 text-slate-200";
    if (opts?.loading) return "bg-slate-50 text-slate-300 animate-pulse";
    if (!status) return "bg-slate-50 text-slate-300";
    if (status === "present") return "bg-emerald-50 text-emerald-600";
    if (status === "late") return "bg-amber-50 text-amber-600";
    if (status === "absent") return "bg-red-50 text-red-600";
    return "bg-[#1A237E]/5 text-[#1A237E]";
  };

  const getDotFill = (status?: AttendanceUiStatus | null) => {
    if (!status) return "bg-slate-300";
    if (status === "present") return "bg-emerald-500";
    if (status === "late") return "bg-amber-500";
    if (status === "absent") return "bg-red-500";
    return "bg-[#1A237E]";
  };

  const gradeOptions = React.useMemo(() => {
    const seen = new Set<string>();
    return teacherSections
      .map((section) => section.gradeName)
      .filter((grade) => {
        if (seen.has(grade)) return false;
        seen.add(grade);
        return true;
      });
  }, [teacherSections]);

  const sectionsForGrade = React.useMemo(() => {
    if (!globalGrade) return [] as TeacherSection[];
    return teacherSections.filter(
      (section) => section.gradeName === globalGrade,
    );
  }, [globalGrade, teacherSections]);

  const activeSection = React.useMemo(() => {
    if (!sectionsForGrade.length) return undefined;
    return (
      sectionsForGrade.find(
        (section) => section.sectionName === globalSection,
      ) || sectionsForGrade[0]
    );
  }, [globalSection, sectionsForGrade]);

  const subjectOptions = React.useMemo(() => {
    return activeSection?.subjects ?? [];
  }, [activeSection]);

  const activeSubject = React.useMemo(() => {
    if (!subjectOptions.length) return null;
    return (
      subjectOptions.find((s) => s.subjectName === selectedSubject) ||
      subjectOptions[0]
    );
  }, [selectedSubject, subjectOptions]);

  // Check homeroom status when grade or section changes
  useEffect(() => {
    const sectionId = activeSection?.sectionId;
    const academicYearId = activeSection?.academicYearId;
    console.log("[HomeroomCheck] effect fired", { globalGrade, globalSection, sectionId, academicYearId });
    if (!sectionId) {
      console.log("[HomeroomCheck] no sectionId, setting false");
      setIsHomeroomTeacher(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        console.log("[HomeroomCheck] calling checkHomeroomStatus", { sectionId, academicYearId });
        const result = await checkHomeroomStatus(sectionId, academicYearId);
        console.log("[HomeroomCheck] result", result);
        if (!cancelled) setIsHomeroomTeacher(result);
      } catch {
        console.error("[HomeroomCheck] error checking homeroom status");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    globalGrade,
    globalSection,
    activeSection?.sectionId,
    activeSection?.academicYearId,
  ]);

  const getWeekStart = (date: Date) => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const day = start.getDay(); // 0..6 (Sun..Sat)
    start.setDate(start.getDate() - day);
    return start;
  };

  const getWeekDates = (date: Date) => {
    const start = getWeekStart(date);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  };

  const getMonthDates = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: lastDay }, (_, i) => new Date(year, month, i + 1));
  };

  const mapWithConcurrency = async <T, R>(
    items: T[],
    limit: number,
    fn: (item: T) => Promise<R>,
  ): Promise<R[]> => {
    const results: R[] = new Array(items.length);
    let nextIndex = 0;

    const workers = Array.from({ length: Math.max(1, limit) }, async () => {
      while (nextIndex < items.length) {
        const current = nextIndex++;
        results[current] = await fn(items[current]);
      }
    });

    await Promise.all(workers);
    return results;
  };

  const ensureAttendanceDaysLoaded = async (sectionId: string, dates: Date[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const missingDates = dates.filter((d) => {
      const normalized = new Date(d);
      normalized.setHours(0, 0, 0, 0);
      if (normalized > today) return false;
      const dateKey = normalized.toDateString();
      return !attendance[dateKey];
    });

    if (missingDates.length === 0) return;

    setAttendanceError(null);
    setAttendanceLoadingKeys((prev) => {
      const next = { ...prev };
      missingDates.forEach((d) => {
        next[d.toDateString()] = true;
      });
      return next;
    });

    try {
      await mapWithConcurrency(missingDates, 4, async (d) => {
        const iso = toLocalISODate(d);
        const dateKey = d.toDateString();
        const records = await getAttendanceBySectionDate(sectionId, iso);
        const map = buildAttendanceMap(records);
        setAttendance((prev) => ({ ...prev, [dateKey]: map }));
        return true;
      });
    } catch (err) {
      setAttendanceError(formatErrorMessage(err, "Failed to load attendance."));
      pushToast("error", formatErrorMessage(err, "Failed to load attendance."));
    } finally {
      setAttendanceLoadingKeys((prev) => {
        const next = { ...prev };
        missingDates.forEach((d) => {
          delete next[d.toDateString()];
        });
        return next;
      });
    }
  };

  // Load section roster + attendance statuses
  useEffect(() => {
    if (!authChecked || !activeSection) return;

    let cancelled = false;
    const date = selectedDateISO;
    const dateKey = selectedDate.toDateString();
    setSelectedStudentIds(new Set());

    (async () => {
      try {
        const roster = await getStudentsBySectionId(
          activeSection.sectionId,
          activeSection.academicYearId,
        );
        if (cancelled) return;

        setSectionStudentCount(roster.length);
        setSectionStudents(roster);

        if (attendanceView === "Day") {
          let records: AttendanceListItem[] = [];
          try {
            records = await getAttendanceBySectionDate(
              activeSection.sectionId,
              date,
            );
          } catch (err) {
            const message = formatErrorMessage(
              err,
              "Failed to load attendance for the selected date.",
            );
            setAttendanceError(message);
            pushToast("error", message);
            records = [];
          }
          if (cancelled) return;
          const attendanceMap = buildAttendanceMap(records);
          setAttendance((prev) => ({ ...prev, [dateKey]: attendanceMap }));
          return;
        }

        const datesToLoad =
          attendanceView === "Week" ? getWeekDates(viewDate) : getMonthDates(viewDate);
        await ensureAttendanceDaysLoaded(activeSection.sectionId, datesToLoad);
      } catch (err) {
        if (cancelled) return;
        setAttendanceError(formatErrorMessage(err, "Failed to load attendance."));
        pushToast("error", formatErrorMessage(err, "Failed to load attendance."));
        setSectionStudentCount(0);
        setSectionStudents([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    authChecked,
    activeSection?.sectionId,
    activeSection?.academicYearId,
    selectedDateISO,
    attendanceView,
    viewDate,
  ]);

  // Fetch task count for sidebar badge
  useEffect(() => {
    if (!activeSection) return;
    const subject = activeSection.subjects.find(
      (s) => s.subjectName === selectedSubject,
    );
    if (!subject) {
      setTaskCount(0);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await getAssessmentsForContext({
          sectionId: activeSection.sectionId,
          subjectId: subject.subjectId,
          academicYearId: activeSection.academicYearId,
        });
        if (cancelled) return;
        const nonHomework = data.filter(
          (a) => a.taskType !== "HOMEWORK",
        );
        setTaskCount(nonHomework.length);
      } catch {
        if (!cancelled) setTaskCount(0);
      }
    })();
    return () => { cancelled = true; };
  }, [activeSection?.sectionId, selectedSubject]);

  // Initialize grade on first load
  useEffect(() => {
    if (isLoadingSections || teacherSections.length === 0) return;
    if (!globalGrade && gradeOptions.length > 0) {
      setGlobalGrade(gradeOptions[0]);
    }
  }, [isLoadingSections, teacherSections.length, gradeOptions, globalGrade]);

  // Update section when grade changes
  useEffect(() => {
    if (sectionsForGrade.length === 0) return;
    const nextSection = sectionsForGrade[0].sectionName;
    if (
      globalSection !== nextSection &&
      !sectionsForGrade.some((s) => s.sectionName === globalSection)
    ) {
      setGlobalSection(nextSection);
    }
  }, [globalSection, sectionsForGrade]);

  // Update subject when section changes
  useEffect(() => {
    if (subjectOptions.length === 0) return;
    const nextSubject = subjectOptions[0].subjectName;
    if (
      selectedSubject !== nextSubject &&
      !subjectOptions.some((s) => s.subjectName === selectedSubject)
    ) {
      setSelectedSubject(nextSubject);
    }
  }, [selectedSubject, subjectOptions]);

  const handleMarkAllNotificationsRead = async () => {
    try {
      setNotifications(await markAllNotificationsRead());
    } catch {
      console.error("Failed to mark notifications as read");
    }
  };

  const handleLogout = () => {
    logoutTeacher();
    router.replace("/login");
  };

  const notificationCount = notifications.filter((n) => !n.read).length;

  const updateAttendance = (
    studentId: string,
    status: "present" | "absent" | "late" | "excused",
  ) => {
    if (cantEdit) return;
    const dateKey = selectedDate.toDateString();
    const existingRecord = attendance[dateKey]?.[studentId];
    setAttendance((prev) => {
      const currentDay = prev[dateKey] || {};
      const current = currentDay[studentId];
      // Toggle off if clicking the same status
      if (current?.status === status) {
        const nextDay = { ...currentDay };
        delete nextDay[studentId];
        return { ...prev, [dateKey]: nextDay };
      }
      return {
        ...prev,
        [dateKey]: {
          ...currentDay,
          [studentId]: {
            status,
            id: current?.id,
            remarks: current?.remarks,
            needsReason: current?.needsReason,
          },
        },
      };
    });

    if (existingRecord?.status === status) return;

    if (!activeSection) return;
    const apiStatus = status.toUpperCase() as
      | "PRESENT"
      | "ABSENT"
      | "LATE"
      | "EXCUSED";
    const date = selectedDateISO;

    if (existingRecord?.id) {
      void updateAttendanceRecord(existingRecord.id, {
        status: apiStatus,
      }).catch((error) => {
        console.error("❌ Failed to update attendance record:", error);
        pushToast("error", formatErrorMessage(error, "Failed to save attendance."));
      });
      return;
    }

    // No local ID — check the server for an existing record before creating a duplicate
    const existingRemarks = attendance[dateKey]?.[studentId]?.remarks;
    void (async () => {
      try {
        const serverRecords = await getAttendanceBySectionDate(
          activeSection.sectionId,
          date,
        );
        const existing = serverRecords.find((r) => r.student === studentId);
        if (existing?.id) {
          await updateAttendanceRecord(existing.id, { status: apiStatus });
          setAttendance((prev) => {
            const currentDay = prev[dateKey] || {};
            const current = currentDay[studentId];
            if (!current) return prev;
            return {
              ...prev,
              [dateKey]: {
                ...currentDay,
                [studentId]: { ...current, id: existing.id },
              },
            };
          });
          return;
        }
      } catch {
        // Fall through to create if fetch fails
      }

      const record = await createAttendanceRecord({
        academic_year: activeSection.academicYearId,
        section: activeSection.sectionId,
        student: studentId,
        date,
        status: apiStatus,
        remarks: existingRemarks,
      });
      if (!record) return;
      setAttendance((prev) => {
        const currentDay = prev[dateKey] || {};
        if (!currentDay[studentId]) return prev;
        return {
          ...prev,
          [dateKey]: {
            ...currentDay,
            [studentId]: {
              status: currentDay[studentId].status,
              id: record.id,
              remarks: currentDay[studentId].remarks,
              needsReason: currentDay[studentId].needsReason,
            },
          },
        };
      });
    })().catch((error) => {
      console.error("❌ Failed to save attendance:", error);
      pushToast("error", formatErrorMessage(error, "Failed to save attendance."));
    });
  };

  const saveAttendanceRemarks = async (studentId: string, remarks: string) => {
    if (cantEdit) return;
    const dateKey = selectedDate.toDateString();
    const entry = attendance[dateKey]?.[studentId];

    if (!entry?.status) {
      pushToast("info", "Mark attendance first, then add remarks.");
      return;
    }

    setAttendance((prev) => {
      const currentDay = prev[dateKey] || {};
      const current = currentDay[studentId];
      if (!current) return prev;
      return {
        ...prev,
        [dateKey]: {
          ...currentDay,
          [studentId]: { ...current, remarks },
        },
      };
    });

    if (!activeSection) return;
    const apiStatus = entry.status.toUpperCase() as
      | "PRESENT"
      | "ABSENT"
      | "LATE"
      | "EXCUSED";
    const date = selectedDateISO;

    try {
      if (entry.id) {
        await updateAttendanceRecord(entry.id, { remarks, status: apiStatus });
      } else {
        // No local ID — check the server for an existing record before creating a duplicate
        let existingId: string | null = null;
        try {
          const serverRecords = await getAttendanceBySectionDate(
            activeSection.sectionId,
            date,
          );
          const existing = serverRecords.find((r) => r.student === studentId);
          if (existing?.id) existingId = existing.id;
        } catch {
          // Fall through to create if fetch fails
        }

        if (existingId) {
          await updateAttendanceRecord(existingId, { remarks, status: apiStatus });
          setAttendance((prev) => {
            const currentDay = prev[dateKey] || {};
            const current = currentDay[studentId];
            if (!current) return prev;
            return {
              ...prev,
              [dateKey]: {
                ...currentDay,
                [studentId]: { ...current, id: existingId },
              },
            };
          });
        } else {
          const record = await createAttendanceRecord({
            academic_year: activeSection.academicYearId,
            section: activeSection.sectionId,
            student: studentId,
            date,
            status: apiStatus,
            remarks,
          });
          if (record?.id) {
            setAttendance((prev) => {
              const currentDay = prev[dateKey] || {};
              const current = currentDay[studentId];
              if (!current) return prev;
              return {
                ...prev,
                [dateKey]: {
                  ...currentDay,
                  [studentId]: { ...current, id: record.id },
                },
              };
            });
          }
        }
      }
      pushToast("success", "Remarks saved.");
    } catch (err) {
      pushToast("error", formatErrorMessage(err, "Failed to save remarks."));
    }
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    const dateKey = selectedDate.toDateString();
    const filtered = sectionStudents.filter((s) => {
      if (attendanceFilter === "all" || attendanceView !== "Day") return true;
      return (
        attendance[dateKey]?.[s.id]?.status === attendanceFilter ||
        (attendanceFilter === "absent" &&
          isAbsentLike(attendance[dateKey]?.[s.id]?.status))
      );
    });
    const allIds = filtered.map((s) => s.id);
    const allSelected =
      allIds.length > 0 && allIds.every((id) => selectedStudentIds.has(id));
    setSelectedStudentIds(allSelected ? new Set() : new Set(allIds));
  };

  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  const markSelectedStudents = (targetStatus: "present" | "absent") => {
    if (cantEdit || selectedStudentIds.size === 0 || !activeSection) return;
    const dateKey = selectedDate.toDateString();
    const date = selectedDateISO;
    const apiStatus = targetStatus.toUpperCase() as
      | "PRESENT"
      | "ABSENT"
      | "LATE"
      | "EXCUSED";

    const ids = Array.from(selectedStudentIds);
    setSelectedStudentIds(new Set());
    setBulkSubmitting(true);

    // Optimistic local state update
    setAttendance((prev) => {
      const currentDay = { ...(prev[dateKey] || {}) };
      ids.forEach((sid) => {
        const existing = currentDay[sid];
        currentDay[sid] = {
          status: targetStatus,
          id: existing?.id,
          remarks: existing?.remarks,
          needsReason: existing?.needsReason,
        };
      });
      return { ...prev, [dateKey]: currentDay };
    });

    // Separate students into those with local IDs (PATCH) and without (fetch server or POST)
    const localDay = attendance[dateKey] || {};
    const toPatch: { sid: string; id: string }[] = [];
    const needServerCheck: string[] = [];

    ids.forEach((sid) => {
      const localId = localDay[sid]?.id;
      if (localId) {
        toPatch.push({ sid, id: localId });
      } else {
        needServerCheck.push(sid);
      }
    });

    void (async () => {
      // Fetch server records only for students missing local IDs
      let serverMap = new Map<string, string>();
      if (needServerCheck.length > 0) {
        try {
          const serverRecords = await getAttendanceBySectionDate(
            activeSection.sectionId,
            date,
          );
          serverRecords.forEach((r) => {
            if (r.id && needServerCheck.includes(r.student)) {
              serverMap.set(r.student, r.id);
            }
          });
        } catch {
          // Will POST for all students without local IDs
        }
      }

      const results = await Promise.allSettled([
        // PATCH existing records
        ...toPatch.map(async ({ sid, id }) => {
          await updateAttendanceRecord(id, { status: apiStatus });
          return { sid, id, action: "patch" as const };
        }),
        // For students without local IDs, check server map
        ...needServerCheck.map(async (sid) => {
          const existingId = serverMap.get(sid);
          if (existingId) {
            await updateAttendanceRecord(existingId, { status: apiStatus });
            setAttendance((prev) => {
              const currentDay = prev[dateKey] || {};
              const current = currentDay[sid];
              if (!current) return prev;
              return {
                ...prev,
                [dateKey]: {
                  ...currentDay,
                  [sid]: { ...current, id: existingId },
                },
              };
            });
            return { sid, id: existingId, action: "patch" as const };
          }
          // Truly new — POST
          const record = await createAttendanceRecord({
            academic_year: activeSection.academicYearId,
            section: activeSection.sectionId,
            student: sid,
            date,
            status: apiStatus,
          });
          if (record?.id) {
            setAttendance((prev) => {
              const currentDay = prev[dateKey] || {};
              const current = currentDay[sid];
              if (!current) return prev;
              return {
                ...prev,
                [dateKey]: {
                  ...currentDay,
                  [sid]: { ...current, id: record.id },
                },
              };
            });
          }
          return { sid, id: record?.id ?? null, action: "post" as const };
        }),
      ]);

      const failed = results.filter((r) => r.status === "rejected");
      if (failed.length > 0) {
        console.error("❌ Some attendance saves failed:", failed);
        pushToast(
          "error",
          `Failed to save attendance for ${failed.length} student(s).`,
        );
      }
    })()
      .catch((error) => {
        console.error("❌ Failed to save attendance:", error);
        pushToast(
          "error",
          formatErrorMessage(error, "Failed to save attendance."),
        );
      })
      .finally(() => {
        setBulkSubmitting(false);
      });
  };

  const getDayStats = (date: Date) => {
    const dayData = attendance[date.toDateString()] || {};
    const present = Object.values(dayData).filter(
      (v) => v.status === "present",
    ).length;
    const late = Object.values(dayData).filter((v) => v.status === "late")
      .length;
    const absent = Object.values(dayData).filter((v) => isAbsentLike(v.status))
      .length;
    return { present, late, absent, total: sectionStudents.length };
  };

  const getStudentLifecycleStats = (studentId: string) => {
    let totalClasses = 0;
    let present = 0;
    let late = 0;
    let absent = 0;

    Object.keys(attendance).forEach((dateStr) => {
      const dayData = attendance[dateStr];
      if (dayData[studentId]) {
        totalClasses++;
        if (dayData[studentId].status === "present") present++;
        if (dayData[studentId].status === "late") late++;
        if (isAbsentLike(dayData[studentId].status)) absent++;
      }
    });

    const rate =
      totalClasses > 0 ? ((present + late) / totalClasses) * 100 : 100;
    return { rate, late, absent, present, total: totalClasses };
  };

  const handleExportCSV = () => {
    const view = attendanceView;
    if (view === "Day") return;

    const dates = daysInView.filter((d) => {
      const normalized = new Date(d);
      normalized.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (normalized > today) return false;
      if (view === "Week") return d.getDay() >= 1 && d.getDay() <= 5;
      return true;
    });

    const dateHeaders = dates.map((d) => toLocalISODate(d));
    const statusLabels: Record<string, string> = {
      present: "P",
      late: "L",
      absent: "A",
      excused: "E",
    };

    const rows: string[][] = [];

    rows.push(["Student Name", "Roll No", ...dateHeaders, "Attendance Rate"]);

    sectionStudents.forEach((student) => {
      let totalClasses = 0;
      let presentOrLate = 0;
      const dayStatuses = dates.map((d) => {
        const key = d.toDateString();
        const st = attendance[key]?.[student.id]?.status;
        if (st) {
          totalClasses++;
          if (st === "present" || st === "late") presentOrLate++;
          return statusLabels[st] || st;
        }
        return "—";
      });
      const rate =
        totalClasses > 0
          ? `${Math.round((presentOrLate / totalClasses) * 100)}%`
          : "—";
      rows.push([student.name, student.rollNo || "—", ...dayStatuses, rate]);
    });

    let totalPresentOrLate = 0;
    let totalRecorded = 0;
    dates.forEach((d) => {
      const key = d.toDateString();
      const dayData = attendance[key] || {};
      Object.values(dayData).forEach((entry) => {
        totalRecorded++;
        if (entry.status === "present" || entry.status === "late")
          totalPresentOrLate++;
      });
    });
    const overallRate =
      totalRecorded > 0
        ? `${Math.round((totalPresentOrLate / totalRecorded) * 100)}%`
        : "—";
    rows.push([
      "Overall",
      "",
      ...dates.map(() => ""),
      overallRate,
    ]);

    const csvContent = rows
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance-${view}-summary-${toLocalISODate(new Date())}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const stats = getDayStats(selectedDate);

  // Generate days for scroller
  const daysInView = React.useMemo(() => {
    if (attendanceView === "Month") {
      return getMonthDates(viewDate);
    }
    return getWeekDates(viewDate);
  }, [viewDate, attendanceView]);

  const rangeAttendanceSummary = React.useMemo(() => {
    if (attendanceView === "Day") return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalRecorded = 0;
    let presentOrLate = 0;

    daysInView.forEach((d) => {
      const normalized = new Date(d);
      normalized.setHours(0, 0, 0, 0);
      if (normalized > today) return;
      const key = d.toDateString();
      sectionStudents.forEach((s) => {
        const st = attendance[key]?.[s.id]?.status;
        if (!st) return;
        totalRecorded++;
        if (st === "present" || st === "late") presentOrLate++;
      });
    });

    if (totalRecorded === 0) return { text: "—", totalRecorded };
    const rate = Math.round((presentOrLate / totalRecorded) * 100);
    return { text: `${rate}%`, totalRecorded };
  }, [attendanceView, daysInView, attendance, sectionStudents]);

  const adjustView = (offset: number) => {
    const next = new Date(viewDate);
    if (attendanceView === "Month") next.setMonth(next.getMonth() + offset);
    else next.setDate(next.getDate() + offset * 7);
    setViewDate(next);
  };

  const formatDate = (date: Date) => {
    return date
      .toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
      .toUpperCase();
  };

  const formatMonth = (date: Date) => {
    return date
      .toLocaleDateString("en-US", { month: "long", year: "numeric" })
      .toUpperCase();
  };

  React.useEffect(() => {
    if (!authChecked) return;
    const handleSendStudentSms = (e: Event) => {
      const customEvent = e as CustomEvent<{ studentId: string }>;
      const studentId = customEvent.detail.studentId;
      if (!studentId) return;

      const existingThread = messageThreads.find(
        (t) => t.studentId === studentId,
      );
      if (existingThread) {
        setActiveMessageThreadId(existingThread.id);
        setActiveTab("Messages");
        return;
      }

      const student = students.find((s) => s.id === studentId);
      if (!student) return;

      (async () => {
        const parent = branchParents.find((item) =>
          item.studentIds.includes(studentId),
        );
        const teacherId = getTeacherId();
        if (!parent || !teacherId) return;

        try {
          const createdThread = await createChatThread({
            parent: parent.parentId,
            teacher: teacherId,
            student: studentId,
          });
          await refreshMessageThreadMetadata();
          setActiveMessageThreadId(createdThread.id);
          setActiveTab("Messages");
        } catch {
          const refreshedThreads = await refreshMessageThreadMetadata();
          const resolvedThread = refreshedThreads.find(
            (thread) =>
              thread.student === studentId && thread.parent === parent.parentId,
          );
          if (resolvedThread) {
            setActiveMessageThreadId(resolvedThread.id);
            setActiveTab("Messages");
          }
        }
      })();
    };
    window.addEventListener("send_student_sms", handleSendStudentSms);
    return () =>
      window.removeEventListener("send_student_sms", handleSendStudentSms);
  }, [
    authChecked,
    branchParents,
    students,
    messageThreads,
    refreshMessageThreadMetadata,
    setActiveMessageThreadId,
    setActiveTab,
  ]);

  if (!authChecked) return null;

  return (
    <HomeroomProvider isHomeroomTeacher={isHomeroomTeacher}>
    <div className="h-screen overflow-hidden bg-slate-50 flex font-sans text-slate-900 selection:bg-blue-100 selection:text-[#1A237E]">
      {/* A. Left Sidebar */}
      <aside
        className={`w-72 sm:w-64 bg-white border-r border-slate-100 flex flex-col fixed inset-y-0 z-50 transition-transform duration-300 transform lg:translate-x-0 ${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Header Context */}

        {/* Classroom Context Header & Selectors */}
        <div className="px-4 sm:px-5 pt-5 sm:pt-7 pb-4 border-b border-slate-100 bg-linear-to-b from-white to-slate-50/30">
          {/* Provider & Institution Branding */}
          <div className="mb-6">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={schoolName || "School logo"}
                  className="w-10 h-10 rounded-xl object-contain bg-white border border-slate-100 shrink-0"
                />
              ) : (
                <div className="w-10 h-10 bg-linear-to-br from-[#1A237E] to-[#3949AB] rounded-xl flex items-center justify-center shadow-md shadow-blue-900/15 shrink-0 ring-1 ring-white/20">
                  <Hexagon
                    className="text-white fill-white/10"
                    size={18}
                    strokeWidth={2.5}
                  />
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <h2 className="text-[12px] font-black uppercase tracking-tight text-slate-800 truncate leading-tight">
                  {schoolName || "School"}
                </h2>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  Academic Portal
                </p>
                {branchName && (
                  <p className="text-[9px] font-semibold text-slate-500 truncate">
                    {branchName}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Context Dropdowns (Modern Grid) */}
          <div className="space-y-1.5">
            <div className="grid grid-cols-2 gap-1.5">
              {/* Grade Selector */}
              <SidebarSelect
                value={globalGrade}
                onChange={setGlobalGrade}
                options={gradeOptions.map((g) => ({ value: g, label: g }))}
              />

              {/* Section Selector */}
              <SidebarSelect
                value={globalSection}
                onChange={setGlobalSection}
                options={sectionsForGrade.map((s) => ({ value: s.sectionName, label: s.sectionName }))}
              />
            </div>

            {/* Subject Selector */}
            <SidebarSelect
              value={selectedSubject}
              onChange={setSelectedSubject}
              options={subjectOptions.map((s) => ({ value: s.subjectName, label: s.subjectName }))}
              icon={
                selectedSubject.toLowerCase().includes("math") ? <Calculator size={11} strokeWidth={2.5} className="text-[#1A237E]" /> :
                selectedSubject.toLowerCase().includes("physics") ? <Atom size={11} strokeWidth={2.5} className="text-[#1A237E]" /> :
                selectedSubject.toLowerCase().includes("chem") ? <FlaskConical size={11} strokeWidth={2.5} className="text-[#1A237E]" /> :
                <BookOpen size={11} strokeWidth={2.5} className="text-[#1A237E]" />
              }
              className="w-full"
            />
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 sm:px-4 py-2 space-y-1 overflow-y-auto custom-scrollbar">
          <SidebarItem
            icon={LayoutDashboard}
            label="Overview"
            isActive={activeTab === "Overview"}
            onClick={() => setActiveTab("Overview")}
          />
          <SidebarItem
            icon={UserCheck}
            label="Attendance"
            isActive={activeTab === "Attendance"}
            onClick={() => setActiveTab("Attendance")}
          />
          <SidebarItem
            icon={Users}
            label="Students"
            isActive={activeTab === "Students"}
            onClick={() => setActiveTab("Students")}
          />
          <SidebarItem
            icon={ClipboardList}
            label="Tasks"
            isActive={activeTab === "Tasks"}
            onClick={() => setActiveTab("Tasks")}
          />
          <SidebarItem
            icon={BookOpen}
            label="Gradebook"
            isActive={activeTab === "Gradebook"}
            onClick={() => setActiveTab("Gradebook")}
          />
          <SidebarItem
            icon={BarChart3}
            label="Analytics"
            isActive={activeTab === "Analytics"}
            onClick={() => setActiveTab("Analytics")}
          />
          <SidebarItem
            icon={Home}
            label="Homeworks"
            isActive={activeTab === "Homeworks"}
            onClick={() => setActiveTab("Homeworks")}
          />
          <SidebarItem
            icon={MessageSquare}
            label="Messages"
            isActive={activeTab === "Messages"}
            onClick={() => setActiveTab("Messages")}
          />
          <SidebarItem
            icon={Bell}
            label="Notifications"
            isActive={activeTab === "Notifications"}
            count={notificationCount}
            onClick={() => setActiveTab("Notifications")}
          />
        </nav>

        {/* Footer User Profile */}
        <div className="p-4 border-t border-slate-50" ref={profileMenuRef}>
          <button
            type="button"
            onClick={() => setIsProfileMenuOpen((prev) => !prev)}
            className="w-full flex items-center gap-3 p-2 bg-slate-50/50 rounded-xl hover:bg-slate-50 transition"
          >
            <div className="w-10 h-10 rounded-full bg-[#1A237E] flex items-center justify-center text-white font-bold text-sm shadow-sm ring-2 ring-white">
              {teacherProfile?.initials ?? "SK"}
            </div>
            <div className="flex-1 text-left">
              <p className="text-xs font-bold text-slate-900 uppercase tracking-tight">
                {teacherProfile?.name ?? "Sara Kassa"}
              </p>
              <p className="text-[10px] font-medium text-slate-400">
                {isHomeroomTeacher ? "Homeroom Teacher" : "Teacher"}
              </p>
            </div>
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {isProfileMenuOpen && (
            <div className="mt-2 bg-white border border-slate-100 rounded-xl shadow-lg overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  setIsProfileOpen(true);
                }}
                className="w-full px-4 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <User size={14} /> View Profile
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  setIsSettingsOpen(true);
                }}
                className="w-full px-4 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <Settings size={14} /> Settings
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full px-4 py-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2"
              >
                <LogOut size={14} /> Log out
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <main className="lg:ml-64 flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        {/* Toasts */}
        <div className="fixed top-4 right-4 z-[80] space-y-2 w-[min(360px,calc(100vw-2rem))]">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`rounded-2xl border px-4 py-3 shadow-lg backdrop-blur-sm ${
                t.kind === "error"
                  ? "bg-rose-50/95 border-rose-200 text-rose-800"
                  : t.kind === "success"
                    ? "bg-emerald-50/95 border-emerald-200 text-emerald-800"
                    : "bg-slate-50/95 border-slate-200 text-slate-700"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  {t.kind === "error" ? (
                    <MessageSquareWarning size={16} className="mt-0.5" />
                  ) : (
                    <Info size={16} className="mt-0.5" />
                  )}
                  <p className="text-sm font-semibold leading-snug">
                    {t.message}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setToasts((prev) => prev.filter((x) => x.id !== t.id))
                  }
                  className="text-xs font-black uppercase tracking-widest opacity-60 hover:opacity-100"
                >
                  Close
                </button>
              </div>
            </div>
          ))}
        </div>
        {/* Mobile Header */}
        <header className="lg:hidden h-14 sm:h-16 bg-white border-b border-slate-100 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-40">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors"
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-2 min-w-0 flex-1 justify-center px-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-[#1A237E] rounded-lg flex items-center justify-center text-white shrink-0">
              <GraduationCap size={16} />
            </div>
            <span className="text-[9px] sm:text-[10px] font-black text-slate-900 uppercase tracking-tight truncate">
              {schoolName || "School"}
            </span>
          </div>
          <button
            onClick={() => setActiveTab("Notifications")}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors relative shrink-0"
            aria-label="Notifications"
          >
            <Bell size={18} />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                {notificationCount}
              </span>
            )}
          </button>
        </header>

        {/* Dashboard Grid Container */}
        <div
          className={`${activeTab === "Messages" ? "p-0 gap-0 overflow-hidden" : "p-3 sm:p-4 md:p-8 gap-4 sm:gap-6 md:gap-8 overflow-y-auto"} flex flex-col flex-1 min-h-0 w-full max-w-full`}
        >
          {activeTab === "Overview" && (
            <div className="w-full space-y-8">
              {/* Upper columns grid */}
              <div className="flex flex-col lg:flex-row gap-8 w-full">
                {/* C. Left Data Grid */}
                <div className="w-full lg:w-[70%] space-y-8">
                  {/* Top Row Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                    <MetricCard
                      label="Total Students"
                      value={String(sectionStudentCount)}
                      subtitle="ENROLLED"
                      icon={Users}
                    />
                    <MetricCard
                      label="Avg Performance"
                      value={(() => {
                        if (studentAnalytics.length === 0) return "—";
                        const avg = studentAnalytics.reduce(
                          (s, a) => s + a.overallAvg,
                          0,
                        ) / studentAnalytics.length;
                        return avg.toFixed(1);
                      })()}
                      subtitle={`OVER ${studentAnalytics.length} STUDENTS`}
                      icon={GraduationCap}
                    />
                    <MetricCard
                      label="Tasks Due"
                      value={String(taskCount)}
                      subtitle="PENDING"
                      icon={FileText}
                    />
                  </div>

                  {/* Performance & Engagement Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-[1.5fr,1fr] gap-6">
                    <PerformanceDistribution students={studentAnalytics} />
                    <ParentEngagementChart students={studentAnalytics} />
                  </div>
                </div>

                {/* D. Right Sidebar Widget */}
                <aside className="w-full lg:w-[30%]">
                  <div className="lg:sticky lg:top-8 space-y-6 lg:mt-0">
                    {/* Parent Messages Container */}
                    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                      <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-800 tracking-tight uppercase">
                          Parent Messages
                        </h3>
                        <button
                          onClick={() => setActiveTab("Messages")}
                          className="text-[10px] font-black text-[#1A237E] hover:underline uppercase tracking-widest cursor-pointer"
                        >
                          Manage
                        </button>
                      </div>
                      <div className="px-6 py-2">
                        {messageThreads.filter((t) => t.unreadCount > 0).length > 0 ? (
                          messageThreads
                            .filter((t) => t.unreadCount > 0)
                            .slice(0, 4)
                            .map((thread) => (
                              <MessageRow
                                key={thread.id}
                                sender={thread.parentName.toUpperCase()}
                                time={thread.lastTime.toUpperCase()}
                                excerpt={thread.preview}
                                onReply={() => {
                                  setActiveMessageThreadId(thread.id);
                                  setActiveTab("Messages");
                                  // Mark as read immediately when clicking reply
                                  setMessageThreads((prev) =>
                                    prev.map((t) =>
                                      t.id === thread.id
                                        ? { ...t, unread: false, unreadCount: 0 }
                                        : t,
                                    ),
                                  );
                                }}
                              />
                            ))
                        ) : (
                          <div className="py-8 text-center">
                            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                              <MessageSquare
                                size={20}
                                className="text-slate-300"
                              />
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                              No unread <br /> messages
                            </p>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setActiveTab("Messages")}
                        className="w-full py-4 bg-slate-50 text-[10px] font-black text-slate-500 hover:bg-slate-100 transition-colors uppercase tracking-widest border-t border-slate-50 cursor-pointer"
                      >
                        View All Messages
                      </button>
                    </div>
                  </div>
                </aside>
              </div>

              {/* Entire School Schedule PDF Widget - Taking full parent container horizontal width */}
              <div className="w-full">
                <OverviewScheduleWidget
                  onOpenSchedule={() => setActiveTab("Schedule")}
                  currentGrade={globalGrade}
                  currentSection={globalSection}
                />
              </div>
            </div>
          )}

          {activeTab === "Students" && (
            <StudentsModule
              globalGrade={globalGrade}
              globalSection={globalSection}
              activeSection={activeSection}
              isHomeroomTeacher={isHomeroomTeacher}
            />
          )}
          {activeTab === "Tasks" && (
            <TasksModule
              activeSection={activeSection}
              selectedSubject={selectedSubject}
              onCountChange={setTaskCount}
            />
          )}
          {activeTab === "Analytics" && (
            <AnalyticsModule
              globalGrade={globalGrade}
              globalSection={globalSection}
              activeSection={activeSection}
            />
          )}
          {activeTab === "Homeworks" && (
            <HomeworksModule
              activeSection={activeSection}
              selectedSubject={selectedSubject}
            />
          )}
          {activeTab === "Messages" && (
            <MessagesModule
              externalThreadId={activeMessageThreadId}
              onThreadChange={setActiveMessageThreadId}
              threads={messageThreads}
              onThreadsUpdate={setMessageThreads}
              availableParents={availableParents}
              onInitiateChat={handleInitiateChat}
            />
          )}
          {activeTab === "Gradebook" && (
            <GradebookModule
              defaultGrade={globalGrade}
              defaultSection={globalSection}
              activeSection={activeSection}
              selectedSubject={selectedSubject}
            />
          )}

          {activeTab === "Attendance" && (
            <div className="flex-1 space-y-6">
              {attendanceError && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl px-5 py-4 text-rose-800 shadow-sm flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <MessageSquareWarning size={18} className="mt-0.5" />
                    <div>
                      <p className="text-sm font-bold">Attendance error</p>
                      <p className="text-sm text-rose-700">{attendanceError}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttendanceError(null)}
                    className="text-[10px] font-black uppercase tracking-widest opacity-70 hover:opacity-100"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Enhanced Calendar Navigation */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-4">
                    <div className="relative group/month">
                      <button className="flex items-center gap-2 text-sm font-black text-slate-800 uppercase tracking-widest hover:text-[#1A237E] transition-colors">
                        {formatMonth(viewDate)}
                        <ChevronDown size={14} className="text-slate-400" />
                      </button>

                      {/* Simple Month Picker Dropdown */}
                      <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-slate-100 shadow-2xl rounded-2xl p-4 invisible group-hover/month:visible opacity-0 group-hover/month:opacity-100 transition-all z-50">
                        <div className="grid grid-cols-3 gap-2">
                          {Array.from({ length: 12 }, (_, i) => {
                            const d = new Date(viewDate.getFullYear(), i, 1);
                            const isCurrent = i === viewDate.getMonth();
                            return (
                              <button
                                key={i}
                                onClick={() => setViewDate(d)}
                                className={`text-[9px] font-black py-2 rounded-lg transition-colors ${
                                  isCurrent
                                    ? "bg-[#1A237E] text-white"
                                    : "hover:bg-slate-50 text-slate-500"
                                }`}
                              >
                                {d
                                  .toLocaleDateString("en-US", {
                                    month: "short",
                                  })
                                  .toUpperCase()}
                              </button>
                            );
                          })}
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-50 flex justify-between items-center px-1">
                          <button
                            onClick={() =>
                              setViewDate(
                                new Date(
                                  viewDate.getFullYear() - 1,
                                  viewDate.getMonth(),
                                  1,
                                ),
                              )
                            }
                            className="text-[10px] font-bold text-slate-400 hover:text-slate-600 tracking-tighter"
                          >
                            PREV YEAR
                          </button>
                          <span className="text-[10px] font-black text-slate-800">
                            {viewDate.getFullYear()}
                          </span>
                          <button
                            onClick={() =>
                              setViewDate(
                                new Date(
                                  viewDate.getFullYear() + 1,
                                  viewDate.getMonth(),
                                  1,
                                ),
                              )
                            }
                            className="text-[10px] font-bold text-slate-400 hover:text-slate-600 tracking-tighter"
                          >
                            NEXT YEAR
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => adjustView(-1)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-[#1A237E] transition-all"
                      >
                        <ChevronRight className="rotate-180" size={16} />
                      </button>
                      <button
                        onClick={() => adjustView(1)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-[#1A237E] transition-all"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>

                  {/* View Partition Toggles */}
                  <div className="flex items-center bg-slate-50 p-1 rounded-xl overflow-x-auto no-scrollbar">
                    {(isAttendanceReadOnly
                      ? (["Day"] as const)
                      : (["Day", "Week", "Month"] as const)
                    ).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setAttendanceView(mode)}
                        className={`px-3 md:px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                          attendanceView === mode
                            ? "bg-white text-[#1A237E] shadow-sm"
                            : "text-slate-400 hover:text-slate-600"
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-6">
                    <button
                      onClick={() => {
                        const today = new Date();
                        setSelectedDate(today);
                        setViewDate(today);
                      }}
                      className="text-[10px] font-black text-[#1A237E] hover:underline uppercase tracking-widest"
                    >
                      Jump to Today
                    </button>
                  </div>
                </div>

                {attendanceView === "Day" && (
                  <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar snap-x">
                    {daysInView.map((date, idx) => {
                      const isSelected =
                        date.toDateString() === selectedDate.toDateString();
                      const isToday =
                        date.toDateString() === new Date().toDateString();
                      const isWeekend = [0, 6].includes(date.getDay());

                      return (
                        <button
                          key={idx}
                          id={isSelected ? "selected-date" : undefined}
                          onClick={() => setSelectedDate(date)}
                          className={`flex flex-col items-center min-w-[64px] py-4 rounded-2xl transition-all border snap-start ${
                            isSelected
                              ? "bg-[#1A237E] border-[#1A237E] text-white shadow-lg shadow-blue-900/20 scale-105"
                              : isWeekend
                                ? `bg-slate-50/50 ${isToday ? "border-slate-300" : "border-transparent"} text-slate-300`
                                : `bg-slate-50 ${isToday ? "border-slate-300" : "border-transparent"} text-slate-500 hover:border-slate-200`
                          }`}
                        >
                          <span
                            className={`text-[9px] font-black uppercase mb-1 tracking-tight ${isSelected ? "text-blue-100" : isWeekend ? "text-slate-200" : "text-slate-400"}`}
                          >
                            {date.toLocaleDateString("en-US", {
                              weekday: "short",
                            })}
                          </span>
                          <span className="text-xl font-mono font-black leading-tight">
                            {date.getDate()}
                          </span>
                          {isToday && (
                            <div className={`w-2 h-2 rounded-full mt-2 ${isSelected ? "bg-white" : "bg-[#1A237E]"}`} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {attendanceView !== "Day" && (
                  <div
                    className={`p-4 rounded-2xl flex items-center justify-between ${attendanceView === "Week" ? "bg-slate-50/50" : "bg-[#1A237E]/5"}`}
                  >
                    <span
                      className={`text-[10px] font-black uppercase tracking-widest ${attendanceView === "Week" ? "text-slate-400" : "text-[#1A237E]"}`}
                    >
                      {attendanceView}ly Analytics Context:{" "}
                      {formatMonth(viewDate)}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                        Active Analysis
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
                <div className="p-4 md:p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <h3 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">
                      {attendanceView}ly Record
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 md:gap-6">
                    {attendanceView === "Day" && (
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        {selectedStudentIds.size > 0 && !bulkSubmitting && (
                          <>
                            <button
                              onClick={() => markSelectedStudents("present")}
                              disabled={cantEdit}
                              className={`px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100 transition-all shadow-sm flex items-center gap-2 ${
                                cantEdit
                                  ? "opacity-50 cursor-not-allowed"
                                  : "hover:bg-emerald-600 hover:text-white"
                              }`}
                            >
                              <Check size={12} />
                              Mark Present ({selectedStudentIds.size})
                            </button>
                            <button
                              onClick={() => markSelectedStudents("absent")}
                              disabled={cantEdit}
                              className={`px-4 py-2 bg-red-50 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-100 transition-all shadow-sm flex items-center gap-2 ${
                                cantEdit
                                  ? "opacity-50 cursor-not-allowed"
                                  : "hover:bg-red-500 hover:text-white"
                              }`}
                            >
                              <Check size={12} />
                              Mark Absent ({selectedStudentIds.size})
                            </button>
                          </>
                        )}
                        {bulkSubmitting && (
                          <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-[#1A237E] rounded-full animate-spin" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              Saving...
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-6 flex-1 md:flex-none justify-between md:justify-end">
                      <button
                        onClick={() =>
                          setAttendanceFilter((prev) =>
                            prev === "present" ? "all" : "present",
                          )
                        }
                        className={`text-right group transition-all ${attendanceFilter === "present" ? "scale-110" : "opacity-60 hover:opacity-100"}`}
                      >
                        <p
                          className={`text-[10px] font-black uppercase tracking-widest ${attendanceFilter === "present" ? "text-emerald-600" : "text-slate-400"}`}
                        >
                          {attendanceView === "Day" ? "Present" : "Attendance"}
                        </p>
                        <p
                          className={`text-xl font-mono font-bold ${attendanceView === "Day" ? "text-emerald-600" : "text-[#1A237E]"}`}
                        >
                          {attendanceView === "Day"
                            ? `${stats.present}/${stats.total}`
                            : (rangeAttendanceSummary?.text ?? "—")}
                        </p>
                      </button>

                      {attendanceView === "Day" && (
                        <>
                          <div className="w-px h-10 bg-slate-100" />
                          <button
                            onClick={() =>
                              setAttendanceFilter((prev) =>
                                prev === "absent" ? "all" : "absent",
                              )
                            }
                            className={`text-right group transition-all ${attendanceFilter === "absent" ? "scale-110" : "opacity-60 hover:opacity-100"}`}
                          >
                            <p
                              className={`text-[10px] font-black uppercase tracking-widest ${attendanceFilter === "absent" ? "text-red-500" : "text-slate-400"}`}
                            >
                              Absent
                            </p>
                            <p className="text-xl font-mono font-bold text-red-500">
                              {stats.absent < 10
                                ? `0${stats.absent}`
                                : stats.absent}
                            </p>
                          </button>

                          <div className="w-px h-10 bg-slate-100" />
                          <button
                            onClick={() =>
                              setAttendanceFilter((prev) =>
                                prev === "late" ? "all" : "late",
                              )
                            }
                            className={`text-right group transition-all ${attendanceFilter === "late" ? "scale-110" : "opacity-60 hover:opacity-100"}`}
                          >
                            <p
                              className={`text-[10px] font-black uppercase tracking-widest ${attendanceFilter === "late" ? "text-amber-500" : "text-slate-400"}`}
                            >
                              Late
                            </p>
                            <p className="text-xl font-mono font-bold text-amber-500">
                              {stats.late < 10 ? `0${stats.late}` : stats.late}
                            </p>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-2 space-y-1">
                  {attendanceView === "Day" && sectionStudents.length > 0 && (() => {
                    const dateKey = selectedDate.toDateString();
                    const filtered = sectionStudents.filter((s) => {
                      if (attendanceFilter === "all") return true;
                      return (
                        attendance[dateKey]?.[s.id]?.status === attendanceFilter ||
                        (attendanceFilter === "absent" &&
                          isAbsentLike(attendance[dateKey]?.[s.id]?.status))
                      );
                    });
                    const allFilteredSelected =
                      filtered.length > 0 &&
                      filtered.every((s) => selectedStudentIds.has(s.id));
                    return (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!bulkSubmitting) toggleSelectAll();
                        }}
                        className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-colors ${
                          bulkSubmitting
                            ? "opacity-50 cursor-not-allowed"
                            : "cursor-pointer hover:bg-slate-50"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${
                            allFilteredSelected
                              ? "bg-[#1A237E] border-[#1A237E]"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {allFilteredSelected && (
                            <Check size={12} className="text-white" />
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {selectedStudentIds.size > 0
                            ? `${selectedStudentIds.size} selected`
                            : "Select all"}
                        </span>
                      </div>
                    );
                  })()}
                  {sectionStudents
                    .filter((s) => {
                      if (
                        attendanceFilter === "all" ||
                        attendanceView !== "Day"
                      )
                        return true;
                      return (
                        attendance[selectedDate.toDateString()]?.[s.id]
                          ?.status === attendanceFilter ||
                        (attendanceFilter === "absent" &&
                          isAbsentLike(
                            attendance[selectedDate.toDateString()]?.[s.id]
                              ?.status,
                          ))
                      );
                    })
                    .map((student, i) => {
                      const status =
                        attendance[selectedDate.toDateString()]?.[student.id]
                          ?.status;

                      return (
                        <div
                          key={student.id}
                          onClick={() => setSelectedStudentId(student.id)}
                          className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 transition-all rounded-2xl group cursor-pointer border-2 gap-4 ${
                            selectedStudentId === student.id
                              ? "bg-blue-50/50 border-[#1A237E]/10"
                              : "hover:bg-slate-50 border-transparent"
                          } ${selectedStudentIds.has(student.id) ? "bg-slate-50/80 border-slate-200/60" : ""}`}
                        >
                          <div className="flex items-center gap-4">
                            {attendanceView === "Day" && (
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!bulkSubmitting)
                                    toggleStudentSelection(student.id);
                                }}
                                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${
                                  bulkSubmitting
                                    ? "opacity-50 cursor-not-allowed"
                                    : "cursor-pointer"
                                } ${
                                  selectedStudentIds.has(student.id)
                                    ? "bg-[#1A237E] border-[#1A237E]"
                                    : "border-slate-300 bg-white hover:border-slate-400"
                                }`}
                              >
                                {selectedStudentIds.has(student.id) && (
                                  <Check size={12} className="text-white" />
                                )}
                              </div>
                            )}
                            <div className="relative">
                              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center font-black text-xs text-slate-400 shrink-0 ring-4 ring-white shadow-sm transition-transform group-hover:scale-105">
                                {student.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </div>
                              {status && (
                                <div
                                  className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white shadow-sm ${
                                    status === "present"
                                      ? "bg-emerald-500"
                                      : status === "absent"
                                        ? "bg-red-500"
                                        : status === "late"
                                          ? "bg-amber-500"
                                          : "bg-[#1A237E]"
                                  }`}
                                />
                              )}
                            </div>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-slate-800">
                                  {student.name}
                                </span>
                                <span className="hidden sm:inline-block text-[9px] font-black text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest bg-white px-2 py-0.5 rounded-full border border-slate-100">
                                  View Profile
                                </span>
                                {(status === "late" || status === "excused") && (
                                  <span
                                    className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                                      status === "late"
                                        ? "bg-amber-50 text-amber-600 border-amber-100"
                                        : "bg-[#1A237E]/5 text-[#1A237E] border-[#1A237E]/10"
                                    }`}
                                  >
                                    {status}
                                  </span>
                                )}
                              </div>
                              <span className="text-[9px] font-mono text-slate-400 tabular-nums uppercase tracking-tighter">
                                {attendanceView === "Day"
                                  ? `ROLL: ${student.rollNo ?? "—"}`
                                  : "Academic Profile Active"}
                              </span>
                            </div>
                          </div>

                          {attendanceView === "Day" && (
                            <div
                              className={`flex items-center gap-2 overflow-x-auto no-scrollbar ${cantEdit ? "pointer-events-none opacity-70" : ""}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() =>
                                  updateAttendance(student.id, "present")
                                }
                                disabled={cantEdit}
                                className={`flex-1 sm:flex-none px-4 md:px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${
                                  status === "present"
                                    ? "bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/20"
                                    : cantEdit
                                      ? "bg-white text-emerald-600 border-slate-100 opacity-50 cursor-not-allowed"
                                      : "bg-white text-emerald-600 border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/50"
                                }`}
                              >
                                Present
                              </button>
                              <button
                                onClick={() =>
                                  updateAttendance(student.id, "absent")
                                }
                                disabled={cantEdit}
                                className={`flex-1 sm:flex-none px-4 md:px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${
                                  status === "absent"
                                    ? "bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20"
                                    : cantEdit
                                      ? "bg-white text-slate-400 border-slate-100 opacity-50 cursor-not-allowed"
                                      : "bg-white text-slate-400 border-slate-100 hover:border-red-200 hover:bg-red-50/50"
                                }`}
                              >
                                Absent
                              </button>
                              <div className="relative flex-1 sm:flex-none">
                                <select
                                  value={
                                    status === "late" || status === "excused"
                                      ? status
                                      : ""
                                  }
                                  disabled={cantEdit}
                                  onChange={(e) => {
                                    const next = e.target.value as
                                      | ""
                                      | "late"
                                      | "excused";

                                    if (next === "") {
                                      if (status === "late" || status === "excused") {
                                        updateAttendance(student.id, status);
                                      }
                                      return;
                                    }

                                    updateAttendance(student.id, next);
                                  }}
                                  className={`appearance-none w-full px-4 md:px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap pr-9 ${
                                    status === "late"
                                      ? "bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/20"
                                      : status === "excused"
                                        ? "bg-[#1A237E] text-white border-[#1A237E] shadow-lg shadow-blue-900/20"
                                        : cantEdit
                                          ? "bg-white text-slate-400 border-slate-100 opacity-50 cursor-not-allowed"
                                          : "bg-white text-slate-400 border-slate-100 hover:border-slate-200 hover:bg-slate-50/50"
                                  }`}
                                >
                                  <option value="">Other</option>
                                  <option value="late">Late</option>
                                  <option value="excused">Excused</option>
                                </select>
                                <div
                                  className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                                    status === "late" || status === "excused"
                                      ? "text-white/80"
                                      : "text-slate-400"
                                  }`}
                                >
                                  <ChevronDown size={14} />
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setOpenRemarksForStudentId((prev) => {
                                    const next = prev === student.id ? null : student.id;
                                    return next;
                                  });
                                  setRemarksDraftByStudentId((prev) => {
                                    if (prev[student.id] !== undefined) return prev;
                                    const dateKey = selectedDate.toDateString();
                                    const existing =
                                      attendance[dateKey]?.[student.id]?.remarks ?? "";
                                    return { ...prev, [student.id]: existing };
                                  });
                                }}
                                disabled={cantEdit}
                                className={`flex-1 sm:flex-none px-4 md:px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap flex items-center justify-center gap-2 ${
                                  cantEdit
                                    ? "bg-white text-slate-300 border-slate-100 opacity-50 cursor-not-allowed"
                                    : attendance[selectedDate.toDateString()]?.[student.id]
                                          ?.remarks
                                      ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/10 hover:bg-slate-800"
                                      : "bg-white text-slate-500 border-slate-100 hover:border-slate-200 hover:bg-slate-50/50"
                                }`}
                              >
                                Remarks
                                {(attendance[selectedDate.toDateString()]?.[student.id]
                                  ?.needsReason ||
                                  isReasonRequiredLike(status)) && (
                                  <MessageSquareWarning size={14} />
                                )}
                              </button>
                            </div>
                          )}

                          {attendanceView === "Day" &&
                            openRemarksForStudentId === student.id && (
                              <div
                                className="w-full sm:max-w-xl sm:ml-auto"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="mt-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                                  <div className="flex items-start justify-between gap-4">
                                    <div>
                                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        Remarks / Reason
                                      </p>
                                      {(attendance[selectedDate.toDateString()]?.[student.id]
                                        ?.needsReason ||
                                        isReasonRequiredLike(status)) && (
                                        <p className="mt-1 text-xs text-amber-700 flex items-center gap-2">
                                          <MessageSquareWarning size={14} />
                                          Recommended for this status.
                                        </p>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setOpenRemarksForStudentId(null)
                                      }
                                      className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:underline"
                                    >
                                      Close
                                    </button>
                                  </div>

                                  <textarea
                                    value={
                                      remarksDraftByStudentId[student.id] ?? ""
                                    }
                                    onChange={(e) =>
                                      setRemarksDraftByStudentId((prev) => ({
                                        ...prev,
                                        [student.id]: e.target.value,
                                      }))
                                    }
                                    placeholder="Add remarks / reason (optional)"
                                    rows={3}
                                    className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                                  />

                                  <div className="mt-3 flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setOpenRemarksForStudentId(null)
                                      }
                                      className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-100 text-slate-500 hover:bg-slate-50"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const value =
                                          (remarksDraftByStudentId[student.id] ?? "")
                                            .trim();
                                        void saveAttendanceRemarks(
                                          student.id,
                                          value,
                                        );
                                        setOpenRemarksForStudentId(null);
                                      }}
                                      className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-900 text-white hover:bg-slate-800"
                                    >
                                      Save
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}

                          {/* Week/Month views remain as context... */}

                          {attendanceView === "Week" && (
                            <div className="flex items-center gap-2">
                              {[1, 2, 3, 4, 5].map((d) => {
                                const date = daysInView[d];
                                const dateKey = date?.toDateString();
                                const iso = date ? toLocalISODate(date) : null;
                                const isFuture = !!iso && iso > todayISO;
                                const isLoading =
                                  !!(dateKey && attendanceLoadingKeys[dateKey]);
                                const dayStatus = dateKey
                                  ? attendance[dateKey]?.[student.id]?.status
                                  : null;
                                const label = ["M", "T", "W", "T", "F"][d - 1];

                                return (
                                <div
                                  key={d}
                                  className="flex flex-col items-center"
                                >
                                  <span className="text-[7px] font-bold text-slate-300 mb-1 leading-none">
                                    {label}
                                  </span>
                                  <div
                                    className={`w-6 h-6 rounded-lg ${getStatusColor(dayStatus, { loading: isLoading, future: isFuture })} flex items-center justify-center border border-white shadow-sm ring-1 ring-slate-100`}
                                    title={
                                      !date
                                        ? ""
                                        : isFuture
                                          ? `${formatDate(date)} (future)`
                                          : dayStatus
                                            ? `${formatDate(date)}: ${dayStatus}`
                                            : `${formatDate(date)}: not recorded`
                                    }
                                  >
                                    <div
                                      className={`w-1.5 h-1.5 rounded-full ${isLoading ? "bg-slate-300" : getDotFill(dayStatus)}`}
                                    />
                                  </div>
                                </div>
                                );
                              })}
                            </div>
                          )}

                          {attendanceView === "Month" && (
                            <div className="flex items-center gap-6">
                              {(() => {
                                const monthDates = daysInView;
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);

                                let totalRecorded = 0;
                                let presentOrLate = 0;

                                monthDates.forEach((d) => {
                                  const normalized = new Date(d);
                                  normalized.setHours(0, 0, 0, 0);
                                  if (normalized > today) return;
                                  const key = d.toDateString();
                                  const st = attendance[key]?.[student.id]?.status;
                                  if (!st) return;
                                  totalRecorded++;
                                  if (st === "present" || st === "late") presentOrLate++;
                                });

                                const rate =
                                  totalRecorded > 0
                                    ? Math.round((presentOrLate / totalRecorded) * 100)
                                    : null;

                                const barColor =
                                  rate === null
                                    ? "bg-slate-200"
                                    : rate >= 90
                                      ? "bg-emerald-500"
                                      : rate >= 75
                                        ? "bg-amber-500"
                                        : "bg-red-500";

                                return (
                                  <>
                                    <div className="text-right">
                                      <span className="text-xs font-mono font-bold text-slate-700">
                                        {rate === null ? "—" : `${rate}%`}
                                      </span>
                                      <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
                                        {totalRecorded === 0
                                          ? "No data"
                                          : `${totalRecorded} day${totalRecorded === 1 ? "" : "s"}`}
                                      </p>
                                    </div>
                                    <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full ${barColor} rounded-full`}
                                        style={{ width: `${rate ?? 0}%` }}
                                      />
                                    </div>
                                  </>
                                );
                              })()}
                              <button className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:bg-[#1A237E] hover:text-white transition-all">
                                <ChevronRight size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>

                {!isAttendanceReadOnly && attendanceView !== "Day" && (
                  <div className="p-8 bg-slate-50/50 border-t border-slate-50">
                    <button
                      onClick={handleExportCSV}
                      className="w-full py-4 bg-[#1A237E] text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-900/20 hover:bg-blue-900 transition-all"
                    >
                      Export {attendanceView}ly Summary
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "Notifications" && (
            <div className="flex-1 max-w-4xl mx-auto space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                <div>
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">
                    Notifications
                  </h3>
                  <p className="text-[10px] md:text-xs font-medium text-slate-400 mt-1 uppercase tracking-widest">
                    Stay updated with critical school alerts
                  </p>
                </div>
                <button
                  onClick={handleMarkAllNotificationsRead}
                  className="w-full sm:w-auto px-6 py-3 sm:py-2 bg-[#1A237E] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-900/20 hover:bg-blue-900 transition-all"
                >
                  Mark All as Read
                </button>
              </div>

              <div className="space-y-4">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() =>
                      setNotifications((prev) =>
                        prev.map((n) =>
                          n.id === notif.id ? { ...n, read: true } : n,
                        ),
                      )
                    }
                    className={`p-6 rounded-3xl bg-white border transition-all cursor-pointer group shadow-sm hover:shadow-md relative overflow-hidden ${notif.read ? "border-slate-100 opacity-75" : "border-[#1A237E]/20"}`}
                  >
                    {!notif.read && (
                      <div className="absolute top-0 left-0 w-1 h-full bg-[#1A237E]" />
                    )}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-2 h-2 rounded-full ${notif.read ? "bg-slate-200" : notif.urgent ? "bg-red-500" : "bg-blue-500"}`}
                        />
                        <span
                          className={`text-[9px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded-lg ${notif.read ? "bg-slate-50 text-slate-400" : notif.urgent ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"}`}
                        >
                          {notif.urgent ? "Critical Priority" : "Information"}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-300 uppercase">
                        {notif.time}
                      </span>
                    </div>
                    <h4
                      className={`text-lg font-bold mb-2 ${notif.read ? "text-slate-500" : "text-slate-800"}`}
                    >
                      {notif.title}
                    </h4>
                    <p
                      className={`text-sm leading-relaxed max-w-2xl ${notif.read ? "text-slate-400" : "text-slate-500"}`}
                    >
                      {notif.desc}
                    </p>
                    <div className="mt-6 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="text-[10px] font-black text-[#1A237E] uppercase tracking-widest hover:underline">
                        Take Action
                      </button>
                      <span className="text-slate-200">/</span>
                      <button className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:underline">
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "Schedule" && <ScheduleModule />}

          {![
            "Overview",
            "Attendance",
            "Notifications",
            "Students",
            "Tasks",
            "Gradebook",
            "Analytics",
            "Homeworks",
            "Messages",
            "Schedule",
          ].includes(activeTab) && (
            <div className="flex-1 flex flex-col items-center justify-center bg-white border border-slate-100 rounded-3xl p-12 text-center shadow-sm">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-6 font-mono text-4xl">
                ?
              </div>
              <h3 className="text-xl font-black text-slate-900 uppercase mb-2">
                {activeTab} View
              </h3>
              <p className="text-sm text-slate-400 max-w-xs font-medium">
                We're currently finalizing the module for{" "}
                <span className="text-indigo-600 font-bold">{activeTab}</span>.
                Check back soon for the full feature set.
              </p>
              <button
                onClick={() => setActiveTab("Overview")}
                className="mt-8 px-8 py-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors uppercase tracking-widest"
              >
                Return to Overview
              </button>
            </div>
          )}
        </div>
      </main>

      {/* E. Student Detail Drawer */}
      <AnimatePresence>
        {selectedStudentId && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedStudentId(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full sm:w-[360px] bg-white shadow-2xl z-[70] flex flex-col animate-in slide-in-from-right duration-200"
            >
              <div className="p-5 border-b border-slate-50 relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {(() => {
                    const student = students.find(
                      (s) => s.id === selectedStudentId,
                    );
                    if (!student) return null;

                    return (
                      <>
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center p-0.5 ring-2 ring-[#1A237E]/5 text-sm font-black text-slate-500">
                          {student.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </div>
                        <div className="text-left">
                          <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                            {student.name}
                          </h3>
                          <p className="text-[9px] font-black text-slate-400 tracking-[0.1em] uppercase mt-0.5">
                            Kelem ID: {student.id}
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>
                <button
                  onClick={() => setSelectedStudentId(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
                {/* Stats Grid */}
                {(() => {
                  const sStats = getStudentLifecycleStats(selectedStudentId!);
                  return (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                          Attendance Rate
                        </p>
                        <p className="text-lg font-mono font-bold text-[#1A237E]">
                          {sStats.rate.toFixed(1)}%
                        </p>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                          Total Lates
                        </p>
                        <p className="text-lg font-mono font-bold text-amber-500">
                          {sStats.late < 10 ? `0${sStats.late}` : sStats.late}
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* Monthly Trend Graph */}
                <div>
                  <h4 className="text-[9px] font-black tracking-[0.15em] text-slate-400 uppercase mb-2">
                    30-Day Density Map
                  </h4>
                  <div className="h-20 w-full bg-slate-50 rounded-xl relative flex items-end justify-between p-3 px-4 overflow-hidden group">
                    {Array.from({ length: 30 }, (_, i) => {
                      const d = new Date();
                      d.setDate(d.getDate() - (29 - i));
                      const status =
                        attendance[d.toDateString()]?.[selectedStudentId!]
                          ?.status;
                      const height =
                        status === "present"
                          ? 100
                          : status === "late"
                            ? 60
                            : isAbsentLike(status)
                              ? 20
                              : 5;
                      const color =
                        status === "present"
                          ? "bg-emerald-500"
                          : status === "late"
                            ? "bg-amber-500"
                            : status === "excused"
                              ? "bg-[#1A237E]"
                              : status === "absent"
                              ? "bg-red-500"
                              : "bg-slate-200";

                      return (
                        <div
                          key={i}
                          className="flex flex-col items-center h-full justify-end w-1 gap-1"
                        >
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${height}%` }}
                            className={`w-full rounded-full ${color} opacity-60 group-hover:opacity-100 transition-opacity`}
                          />
                        </div>
                      );
                    })}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] -rotate-6 opacity-30">
                        Active Density
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div>
                  <h4 className="text-[9px] font-black tracking-[0.15em] text-slate-400 uppercase mb-2">
                    Recent Record log
                  </h4>
                  <div className="space-y-1.5">
                    {daysInView
                      .slice(0, 4)
                      .reverse()
                      .map((date, i) => {
                        const status =
                          attendance[date.toDateString()]?.[
                            selectedStudentId!
                          ]?.status || "No Data";
                        return (
                          <div
                            key={i}
                            className="flex items-center justify-between p-2.5 bg-white border border-slate-100 rounded-lg"
                          >
                            <span className="text-[9px] font-bold text-slate-500">
                              {date
                                .toLocaleDateString("en-US", {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                })
                                .toUpperCase()}
                            </span>
                            <span
                              className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                status === "present"
                                  ? "bg-emerald-50 text-emerald-600"
                                  : status === "absent"
                                    ? "bg-red-50 text-red-600"
                                    : status === "late"
                                      ? "bg-amber-50 text-amber-600"
                                      : status === "excused"
                                        ? "bg-[#1A237E]/5 text-[#1A237E]"
                                      : "bg-slate-50 text-slate-300"
                              }`}
                            >
                              {status}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>

              <div className="p-5 border-t border-slate-50 bg-slate-50/30">
                <button
                  onClick={async () => {
                    const student = students.find(
                      (s) => s.id === selectedStudentId,
                    );
                    if (student) {
                      const existingThread = messageThreads.find(
                        (t) => t.studentId === student.id,
                      );

                      if (existingThread) {
                        setActiveMessageThreadId(existingThread.id);
                      } else {
                        const parent = branchParents.find((item) =>
                          item.studentIds.includes(student.id),
                        );
                        const teacherId = getTeacherId();
                        if (parent && teacherId) {
                          try {
                            const createdThread = await createChatThread({
                              parent: parent.parentId,
                              teacher: teacherId,
                              student: student.id,
                            });
                            await refreshMessageThreadMetadata();
                            setActiveMessageThreadId(createdThread.id);
                          } catch {
                            const refreshedThreads = await refreshMessageThreadMetadata();
                            const resolvedThread = refreshedThreads.find(
                              (thread) =>
                                thread.student === student.id &&
                                thread.parent === parent.parentId,
                            );
                            if (resolvedThread) {
                              setActiveMessageThreadId(resolvedThread.id);
                            }
                          }
                        }
                      }
                      setActiveTab("Messages");
                      setSelectedStudentId(null);
                    }
                  }}
                  className="w-full py-4 bg-[#1A237E] text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-900/20 hover:bg-blue-900 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MessageSquare size={14} /> Send Message to Parent
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ProfileModal
        open={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        profile={teacherProfile}
        onProfileUpdated={(updated) => {
          setTeacherProfile(updated);
          setIsProfileOpen(false);
        }}
      />

      <SettingsModal
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
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
      `}</style>
    </div>
    </HomeroomProvider>
  );
}
