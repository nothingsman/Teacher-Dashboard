"use client";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
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
  Shield,
  Sparkles,
  User,
  Pencil,
  LogOut,
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
import { THREADS_DATA } from "../components/MessagesModule";
import type { Thread } from "../services";
import {
  getStudents,
  getNotifications,
  markAllNotificationsRead,
  getStudentAnalytics,
  getTeacherProfile,
  logoutTeacher,
  getTeacherSections,
} from "../services";
import { createAttendanceRecord } from "../services/attendanceService";
import { getStudentsBySectionId } from "../services";
import { getAccessToken } from "../services/authStore";
import type {
  Student,
  TeacherProfile,
  StudentAnalytics,
  TeacherSection,
} from "../services";
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
}) => (
  <motion.button
    whileHover={{ x: 4 }}
    onClick={onClick}
    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors duration-200 ${
      isActive
        ? "bg-[#1A237E] text-white shadow-lg shadow-blue-900/20"
        : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
    }`}
  >
    <div className="flex items-center gap-3">
      <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
      <span className="text-sm font-medium tracking-tight">{label}</span>
    </div>
    {count !== undefined && (
      <span
        className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
          isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
        }`}
      >
        {count < 10 ? `0${count}` : count}
      </span>
    )}
  </motion.button>
);

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
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [globalGrade, setGlobalGrade] = useState("");
  const [globalSection, setGlobalSection] = useState("");
  const [activeMessageThreadId, setActiveMessageThreadId] = useState<
    string | null
  >(null);
  const [messageThreads, setMessageThreads] = useState<Thread[]>(THREADS_DATA);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    setAuthChecked(true);
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

  // Student and Attendance State
  const [students, setStudents] = useState<Student[]>([]);
  const [sectionStudentCount, setSectionStudentCount] = useState<number>(0);
  const [sectionStudents, setSectionStudents] = useState<Student[]>([]);

  useEffect(() => {
    if (!authChecked) return;
    getStudents()
      .then(setStudents)
      .catch(() => {});
  }, [authChecked]);

  // ...existing code...

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

  useEffect(() => {
    if (!authChecked) return;
    getTeacherProfile()
      .then(setTeacherProfile)
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

  const [attendance, setAttendance] = useState<
    Record<string, Record<string, "present" | "absent" | "late">>
  >({});

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

  // Update student count for active section (run after activeSection is available)
  useEffect(() => {
    if (!authChecked || !activeSection) return;
    getStudentsBySectionId(activeSection.sectionId)
      .then((s) => {
        setSectionStudentCount(s.length);
        setSectionStudents(s);
      })
      .catch(() => {
        setSectionStudentCount(0);
        setSectionStudents([]);
      });
  }, [authChecked, activeSection]);

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
    setNotifications(await markAllNotificationsRead());
  };

  const handleLogout = () => {
    logoutTeacher();
    router.replace("/login");
  };

  const notificationCount = notifications.filter((n) => !n.read).length;

  const updateAttendance = (
    studentId: string,
    status: "present" | "absent" | "late",
  ) => {
    const dateKey = selectedDate.toDateString();
    setAttendance((prev) => {
      const currentDay = prev[dateKey] || {};
      // Toggle off if clicking the same status
      if (currentDay[studentId] === status) {
        const nextDay = { ...currentDay };
        delete nextDay[studentId];
        return { ...prev, [dateKey]: nextDay };
      }
      return {
        ...prev,
        [dateKey]: { ...currentDay, [studentId]: status },
      };
    });

    if (!activeSection) return;
    const apiStatus = status.toUpperCase() as "PRESENT" | "ABSENT" | "LATE";
    const date = selectedDate.toISOString().split("T")[0];

    void createAttendanceRecord({
      academic_year: activeSection.academicYearId,
      section: activeSection.sectionId,
      student: studentId,
      date,
      status: apiStatus,
    }).catch((error) => {
      console.error("❌ Failed to create attendance record:", error);
    });
  };

  const markAllPresent = () => {
    const dateKey = selectedDate.toDateString();
    setAttendance((prev) => {
      const nextDay = { ...(prev[dateKey] || {}) };
      sectionStudents.forEach((s) => {
        nextDay[s.id] = "present";
      });
      return { ...prev, [dateKey]: nextDay };
    });
  };

  const getDayStats = (date: Date) => {
    const dayData = attendance[date.toDateString()] || {};
    const present = Object.values(dayData).filter(
      (v) => v === "present",
    ).length;
    const late = Object.values(dayData).filter((v) => v === "late").length;
    const absent = Object.values(dayData).filter((v) => v === "absent").length;
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
        if (dayData[studentId] === "present") present++;
        if (dayData[studentId] === "late") late++;
        if (dayData[studentId] === "absent") absent++;
      }
    });

    const rate =
      totalClasses > 0 ? ((present + late) / totalClasses) * 100 : 100;
    return { rate, late, absent, present, total: totalClasses };
  };

  const stats = getDayStats(selectedDate);

  // Generate days for scroller (either full month or specific week)
  const daysInView = React.useMemo(() => {
    if (attendanceView === "Day") {
      const start = new Date(viewDate);
      const day = start.getDay();
      start.setDate(start.getDate() - day);
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        return d;
      });
    }
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    return Array.from(
      { length: lastDay },
      (_, i) => new Date(year, month, i + 1),
    );
  }, [viewDate, attendanceView]);

  const adjustView = (offset: number) => {
    const next = new Date(viewDate);
    if (attendanceView === "Day") {
      next.setDate(next.getDate() + offset * 7);
    } else {
      next.setMonth(next.getMonth() + offset);
    }
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
      if (studentId) {
        const student = students.find((s) => s.id === studentId);
        if (student) {
          const existingThread = messageThreads.find(
            (t) =>
              t.studentId === student.id ||
              t.studentName
                .toLowerCase()
                .includes(student.name.split(" ")[0].toLowerCase()) ||
              t.parentName
                .toLowerCase()
                .includes(student.parentName.split(" ")[0].toLowerCase()),
          );

          if (existingThread) {
            setActiveMessageThreadId(existingThread.id);
          } else {
            const pInitials =
              student.parentName
                .split(" ")
                .map((n) => n[0])
                .join("") || "P";
            const newThreadId = `THR-${Date.now()}`;
            const newThread: Thread = {
              id: newThreadId,
              parentName: student.parentName,
              parentInitials: pInitials,
              parentPhone:
                student.parentPhone ??
                "+251 9" + Math.floor(10000000 + Math.random() * 90000000),
              parentEmail:
                student.parentEmail ??
                `${student.parentName.toLowerCase().replace(/[^a-z]/g, "")}@mail.com`,
              studentName: student.name,
              studentId: student.id,
              studentGrade: student.section ?? "Grade 7A",
              avatarColor: ["blue", "teal", "purple", "amber", "green"][
                Math.floor(Math.random() * 5)
              ],
              unread: false,
              lastTime: "Just now",
              preview: "Draft message thread created...",
              studentSnapshot: {
                overallAvg: Math.round(student.performance ?? 0),
                attendance: 95,
                parentEngagement: 50,
                recentHomework: [],
              },
              messages: [
                {
                  id: `M-${Date.now()}`,
                  sender: "teacher" as const,
                  text: `Hello, I wanted to reach out regarding ${student.name}'s attendance / study.`,
                  time: new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                },
              ],
            };

            setMessageThreads((prev) => [newThread, ...prev]);
            setActiveMessageThreadId(newThreadId);
          }
          setActiveTab("Messages");
        }
      }
    };
    window.addEventListener("send_student_sms", handleSendStudentSms);
    return () =>
      window.removeEventListener("send_student_sms", handleSendStudentSms);
  }, [
    authChecked,
    students,
    messageThreads,
    setMessageThreads,
    setActiveMessageThreadId,
    setActiveTab,
  ]);

  if (!authChecked) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900 selection:bg-blue-100 selection:text-[#1A237E]">
      {/* A. Left Sidebar */}
      <aside
        className={`w-64 bg-white border-r border-slate-100 flex flex-col fixed inset-y-0 z-50 transition-transform duration-300 transform lg:translate-x-0 ${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Header Context */}

        {/* Classroom Context Header & Selectors */}
        <div className="px-5 pt-7 pb-4 border-b border-slate-100 bg-linear-to-b from-white to-slate-50/30">
          {/* Provider & Institution Branding */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 px-2.5 py-1 bg-[#1A237E]/8 rounded-full border border-[#1A237E]/10">
                <Shield
                  size={10}
                  className="text-[#1A237E]"
                  fill="currentColor"
                />
                <span className="text-[9px] font-black text-[#1A237E] uppercase tracking-[0.2em] leading-none">
                  Kelem-Co Platform
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-linear-to-br from-[#1A237E] to-[#3949AB] rounded-xl flex items-center justify-center shadow-md shadow-blue-900/15 shrink-0 ring-1 ring-white/20">
                <Hexagon
                  className="text-white fill-white/10"
                  size={18}
                  strokeWidth={2.5}
                />
              </div>
              <div className="flex flex-col min-w-0">
                <h2 className="text-[12px] font-black uppercase tracking-tight text-slate-800 truncate leading-tight">
                  EDUGOV School
                </h2>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  Academic Portal
                </p>
              </div>
            </div>
          </div>

          {/* Context Dropdowns (Modern Grid) */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {/* Grade Selector */}
              <div className="relative group">
                <select
                  value={globalGrade}
                  onChange={(e) => setGlobalGrade(e.target.value)}
                  className="w-full appearance-none pl-3 pr-7 py-2 bg-white border border-slate-200 rounded-lg text-[9px] font-black text-slate-600 hover:border-[#1A237E]/30 hover:bg-slate-50/50 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1A237E]/5 uppercase tracking-tighter shadow-xs"
                >
                  {gradeOptions.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={10}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-slate-600 transition-colors"
                />
              </div>

              {/* Section Selector */}
              <div className="relative group">
                <select
                  value={globalSection}
                  onChange={(e) => setGlobalSection(e.target.value)}
                  className="w-full appearance-none pl-3 pr-7 py-2 bg-white border border-slate-200 rounded-lg text-[9px] font-black text-slate-600 hover:border-[#1A237E]/30 hover:bg-slate-50/50 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1A237E]/5 uppercase tracking-tighter shadow-xs"
                >
                  {sectionsForGrade.map((section) => (
                    <option key={section.sectionId} value={section.sectionName}>
                      {section.sectionName}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={10}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-slate-600 transition-colors"
                />
              </div>
            </div>

            {/* Subject Selector (Full Width High Priority) */}
            <div className="relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1A237E] pointer-events-none z-10 opacity-70 group-hover:opacity-100 transition-opacity">
                {selectedSubject.toLowerCase().includes("math") && (
                  <Calculator size={13} strokeWidth={2.5} />
                )}
                {selectedSubject.toLowerCase().includes("physics") && (
                  <Atom size={13} strokeWidth={2.5} />
                )}
                {selectedSubject.toLowerCase().includes("chem") && (
                  <FlaskConical size={13} strokeWidth={2.5} />
                )}
                {!selectedSubject && <BookOpen size={13} strokeWidth={2.5} />}
              </div>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full appearance-none pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-[#1A237E] hover:border-[#1A237E]/40 hover:bg-[#1A237E]/5 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1A237E]/10 uppercase tracking-tight shadow-sm"
              >
                {subjectOptions.map((subject) => (
                  <option key={subject.subjectId} value={subject.subjectName}>
                    {subject.subjectName}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none text-slate-400 group-hover:text-[#1A237E] transition-colors">
                <ChevronDown size={12} />
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto custom-scrollbar">
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
            count={sectionStudentCount}
            onClick={() => setActiveTab("Students")}
          />
          <SidebarItem
            icon={ClipboardList}
            label="Tasks"
            isActive={activeTab === "Tasks"}
            count={3}
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
            count={messageThreads.filter((t) => t.unread).length || undefined}
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
                {teacherProfile?.role ?? "Primary Teacher"}
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
                  router.push("/profile");
                }}
                className="w-full px-4 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <User size={14} /> View Profile
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  router.push("/profile?edit=true");
                }}
                className="w-full px-4 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <Pencil size={14} /> Edit Profile
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
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-[2px] z-40 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <main className="lg:ml-64 flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden h-16 bg-white border-b border-slate-100 px-6 flex items-center justify-between sticky top-0 z-40">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="w-10 h-10 rounded-xl border border-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#1A237E] rounded-lg flex items-center justify-center text-white">
              <GraduationCap size={18} />
            </div>
            <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight">
              Ethio-Global
            </span>
          </div>
          <button
            onClick={() => setActiveTab("Notifications")}
            className="w-10 h-10 rounded-xl border border-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors relative"
          >
            <Bell size={20} />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                {notificationCount}
              </span>
            )}
          </button>
        </header>

        {/* Dashboard Grid Container */}
        <div
          className={`${activeTab === "Messages" ? "p-0 gap-0 overflow-hidden" : "p-4 md:p-8 gap-8 overflow-y-auto"} flex flex-col flex-1 w-full max-w-full`}
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
                      value="42"
                      subtitle="+2 ACTIVE"
                      icon={Users}
                    />
                    <MetricCard
                      label="Avg Performance"
                      value="82.4"
                      subtitle="+4.5%"
                      icon={GraduationCap}
                    />
                    <MetricCard
                      label="Tasks Due"
                      value="03"
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
                        {messageThreads.filter((t) => t.unread).length > 0 ? (
                          messageThreads
                            .filter((t) => t.unread)
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
                                        ? { ...t, unread: false }
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
            />
          )}
          {activeTab === "Tasks" && (
            <TasksModule
              activeSection={activeSection}
              selectedSubject={selectedSubject}
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
              globalGrade={globalGrade}
              globalSection={globalSection}
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
            />
          )}
          {activeTab === "Gradebook" && (
            <GradebookModule
              defaultGrade={globalGrade}
              defaultSection={globalSection}
            />
          )}

          {activeTab === "Attendance" && (
            <div className="flex-1 space-y-6">
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
                    {(["Day", "Week", "Month"] as const).map((mode) => (
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
                                ? "bg-slate-50/50 border-transparent text-slate-300"
                                : "bg-slate-50 border-transparent text-slate-500 hover:border-slate-200"
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
                          {isToday && !isSelected && (
                            <div className="w-1 h-1 rounded-full bg-[#1A237E] mt-1" />
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
                      <button
                        onClick={markAllPresent}
                        className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all shadow-sm flex items-center gap-2 w-full sm:w-auto"
                      >
                        <Sparkles size={12} />
                        Mark All Present
                      </button>
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
                          {attendanceView === "Day" ? "Present" : "Avg. Score"}
                        </p>
                        <p
                          className={`text-xl font-mono font-bold ${attendanceView === "Day" ? "text-emerald-600" : "text-[#1A237E]"}`}
                        >
                          {attendanceView === "Day"
                            ? `${stats.present}/${stats.total}`
                            : "94.2%"}
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
                  {sectionStudents
                    .filter((s) => {
                      if (
                        attendanceFilter === "all" ||
                        attendanceView !== "Day"
                      )
                        return true;
                      return (
                        attendance[selectedDate.toDateString()]?.[s.id] ===
                        attendanceFilter
                      );
                    })
                    .map((student, i) => {
                      const status =
                        attendance[selectedDate.toDateString()]?.[student.id];

                      return (
                        <div
                          key={student.id}
                          onClick={() => setSelectedStudentId(student.id)}
                          className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 transition-all rounded-2xl group cursor-pointer border-2 gap-4 ${
                            selectedStudentId === student.id
                              ? "bg-blue-50/50 border-[#1A237E]/10"
                              : "hover:bg-slate-50 border-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-4">
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
                                        : "bg-amber-500"
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
                              className="flex items-center gap-2 overflow-x-auto no-scrollbar"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() =>
                                  updateAttendance(student.id, "present")
                                }
                                className={`flex-1 sm:flex-none px-4 md:px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${
                                  status === "present"
                                    ? "bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/20"
                                    : "bg-white text-emerald-600 border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/50"
                                }`}
                              >
                                Present
                              </button>
                              <button
                                onClick={() =>
                                  updateAttendance(student.id, "absent")
                                }
                                className={`flex-1 sm:flex-none px-4 md:px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${
                                  status === "absent"
                                    ? "bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20"
                                    : "bg-white text-slate-400 border-slate-100 hover:border-red-200 hover:bg-red-50/50"
                                }`}
                              >
                                Absent
                              </button>
                              <button
                                onClick={() =>
                                  updateAttendance(student.id, "late")
                                }
                                className={`flex-1 sm:flex-none px-4 md:px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${
                                  status === "late"
                                    ? "bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/20"
                                    : "bg-white text-slate-400 border-slate-100 hover:border-amber-200 hover:bg-amber-50/50"
                                }`}
                              >
                                Late
                              </button>
                            </div>
                          )}

                          {/* Week/Month views remain as context... */}

                          {attendanceView === "Week" && (
                            <div className="flex items-center gap-2">
                              {[0, 1, 2, 3, 4].map((d) => (
                                <div
                                  key={d}
                                  className="flex flex-col items-center"
                                >
                                  <span className="text-[7px] font-bold text-slate-300 mb-1 leading-none">
                                    {"MTWTF"[d]}
                                  </span>
                                  <div
                                    className={`w-6 h-6 rounded-lg ${d % 3 === 0 ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-300"} flex items-center justify-center border border-white shadow-sm ring-1 ring-slate-100`}
                                  >
                                    <div
                                      className={`w-1.5 h-1.5 rounded-full ${d % 3 === 0 ? "bg-emerald-500" : "bg-slate-300"}`}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {attendanceView === "Month" && (
                            <div className="flex items-center gap-6">
                              <div className="text-right">
                                <span className="text-xs font-mono font-bold text-slate-700">
                                  {90 + (i % 10)}%
                                </span>
                              </div>
                              <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 rounded-full"
                                  style={{ width: `${90 + (i % 10)}%` }}
                                />
                              </div>
                              <button className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:bg-[#1A237E] hover:text-white transition-all">
                                <ChevronRight size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>

                <div className="p-8 bg-slate-50/50 border-t border-slate-50">
                  <button className="w-full py-4 bg-[#1A237E] text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-900/20 hover:bg-blue-900 transition-all">
                    {attendanceView === "Day"
                      ? "Submit Attendance Report"
                      : `Export ${attendanceView}ly Summary`}
                  </button>
                </div>
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
                            EGA ID: {student.id}
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
                        attendance[d.toDateString()]?.[selectedStudentId!];
                      const height =
                        status === "present"
                          ? 100
                          : status === "late"
                            ? 60
                            : status === "absent"
                              ? 20
                              : 5;
                      const color =
                        status === "present"
                          ? "bg-emerald-500"
                          : status === "late"
                            ? "bg-amber-500"
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
                          ] || "No Data";
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
                  onClick={() => {
                    const student = students.find(
                      (s) => s.id === selectedStudentId,
                    );
                    if (student) {
                      const existingThread = messageThreads.find(
                        (t) =>
                          t.studentId === student.id ||
                          t.studentName
                            .toLowerCase()
                            .includes(
                              student.name.split(" ")[0].toLowerCase(),
                            ) ||
                          t.parentName
                            .toLowerCase()
                            .includes(
                              student.parentName.split(" ")[0].toLowerCase(),
                            ),
                      );

                      if (existingThread) {
                        setActiveMessageThreadId(existingThread.id);
                      } else {
                        const pInitials =
                          student.parentName
                            .split(" ")
                            .map((n) => n[0])
                            .join("") || "P";
                        const newThreadId = `THR-${Date.now()}`;
                        const newThread: Thread = {
                          id: newThreadId,
                          parentName: student.parentName,
                          parentInitials: pInitials,
                          parentPhone:
                            student.parentPhone ??
                            "+251 9" +
                              Math.floor(10000000 + Math.random() * 90000000),
                          parentEmail:
                            student.parentEmail ??
                            `${student.parentName.toLowerCase().replace(/[^a-z]/g, "")}@mail.com`,
                          studentName: student.name,
                          studentId: student.id,
                          studentGrade: student.section ?? "Grade 7A",
                          avatarColor: [
                            "blue",
                            "teal",
                            "purple",
                            "amber",
                            "green",
                          ][Math.floor(Math.random() * 5)],
                          unread: false,
                          lastTime: "Just now",
                          preview: "Draft message thread created...",
                          studentSnapshot: {
                            overallAvg: Math.round(student.performance ?? 0),
                            attendance: 95,
                            parentEngagement: 50,
                            recentHomework: [],
                          },
                          messages: [
                            {
                              id: `M-${Date.now()}`,
                              sender: "teacher" as const,
                              text: `Hello, I wanted to reach out regarding ${student.name}'s attendance.`,
                              time: new Date().toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              }),
                            },
                          ],
                        };

                        setMessageThreads((prev) => [newThread, ...prev]);
                        setActiveMessageThreadId(newThreadId);
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
  );
}
