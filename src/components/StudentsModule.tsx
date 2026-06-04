"use client";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import {
  Users,
  Search,
  CheckCircle,
  Minus,
  Eye,
  Edit2,
  X,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  createStudentBehaviourLogEntry,
  getStudentsBySectionId,
  getStudentBehaviourLog,
  triggerStudentInsight,
  type BehaviourLogEntry,
  type CreateBehaviourLogEntryRequest,
  type StudentInsightTriggerResponse,
} from "../services/studentsService";
import { getAttendanceSummary, type AttendanceSummary } from "../services/attendanceService";
import { getAssessmentResults, type AssessmentResult } from "../services/assessmentResultsService";
import { getParentLinks, type ParentLink } from "../services/parentLinksService";

// --- Types ---

interface Student {
  id: string;
  name: string;
  grade: string;
  section: string;
  status: "Active" | "Pending" | "Withdrawn";
  parentLinked: boolean;
  enrolled: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  rollNo?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  dateOfBirth?: string;
  admissionDate?: string;
  academicYearName?: string;
  branchName?: string;
  organizationName?: string;
  gradeName?: string;
  sectionName?: string;
  gradeLevel?: number;
}

// --- Mock Data ---

const STUDENTS_MOCK: Student[] = [
  {
    id: "STU-00421",
    name: "Liya Tadesse",
    grade: "Grade 8",
    section: "A",
    status: "Active",
    parentLinked: true,
    enrolled: "Sep 1, 2022",
    parentName: "Alemayehu T.",
    parentPhone: "+251 92 344 5566",
    parentEmail: "alemayehu.t@gmail.com",
  },
  {
    id: "STU-00398",
    name: "Biruk Haile",
    grade: "Grade 7",
    section: "B",
    status: "Active",
    parentLinked: false,
    enrolled: "Jan 15, 2023",
    parentName: "Worku Haile",
    parentPhone: "+251 91 123 4567",
    parentEmail: "worku.h@gmail.com",
  },
  {
    id: "STU-00412",
    name: "Selam Girma",
    grade: "Grade 9",
    section: "A",
    status: "Pending",
    parentLinked: true,
    enrolled: "Aug 20, 2024",
    parentName: "Girma Girma",
    parentPhone: "+251 91 765 4321",
    parentEmail: "girma.g@gmail.com",
  },
  {
    id: "STU-00355",
    name: "Dawit Bekele",
    grade: "Grade 6",
    section: "C",
    status: "Withdrawn",
    parentLinked: false,
    enrolled: "Sep 1, 2021",
    parentName: "Meseret Bekele",
    parentPhone: "+251 91 987 6543",
    parentEmail: "meseret.b@gmail.com",
  },
  {
    id: "STU-00467",
    name: "Hana Mekonnen",
    grade: "Grade 8",
    section: "B",
    status: "Active",
    parentLinked: true,
    enrolled: "Sep 1, 2022",
    parentName: "Tigist Mekonnen",
    parentPhone: "+251 91 432 1098",
    parentEmail: "tigist.m@gmail.com",
  },
  {
    id: "STU-00480",
    name: "Yonas Alemu",
    grade: "Grade 10",
    section: "A",
    status: "Active",
    parentLinked: true,
    enrolled: "Sep 1, 2021",
    parentName: "Shitaye Alemu",
    parentPhone: "+251 91 876 5432",
    parentEmail: "shitaye.a@gmail.com",
  },
  {
    id: "STU-00391",
    name: "Marta Tesfaye",
    grade: "Grade 7",
    section: "A",
    status: "Pending",
    parentLinked: false,
    enrolled: "Jan 10, 2024",
    parentName: "Tesfaye T.",
    parentPhone: "+251 91 567 8901",
    parentEmail: "tesfaye.t@gmail.com",
  },
  {
    id: "STU-00403",
    name: "Abel Negash",
    grade: "Grade 9",
    section: "B",
    status: "Active",
    parentLinked: true,
    enrolled: "Sep 1, 2023",
    parentName: "Negash N.",
    parentPhone: "+251 91 234 5678",
    parentEmail: "negash.n@gmail.com",
  },
];

// --- Sub-components ---

const MetricCard = ({
  label,
  count,
  subtitle,
  icon: Icon,
  accentColor = "text-slate-400",
}: {
  label: string;
  count: number | string;
  subtitle: string;
  icon: any;
  accentColor?: string;
}) => (
  <div className="bg-white border border-slate-100 p-5 rounded-xl flex items-center justify-between shadow-sm">
    <div>
      <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1">
        {label}
      </p>
      <h3 className="text-2xl font-bold text-slate-900">{count}</h3>
      <p
        className={`text-[10px] font-bold mt-1 uppercase tracking-tight ${accentColor}`}
      >
        {subtitle}
      </p>
    </div>
    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300">
      <Icon size={20} />
    </div>
  </div>
);

const Badge = ({ status }: { status: Student["status"] }) => {
  const styles = {
    Active: "bg-emerald-50 text-emerald-600 border-emerald-100",
    Pending: "bg-amber-50 text-amber-600 border-amber-100",
    Withdrawn: "bg-slate-50 text-slate-600 border-slate-100",
  };
  return (
    <span
      className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${styles[status]}`}
    >
      {status}
    </span>
  );
};

// --- StudentsModule Component ---

interface StudentsModuleProps {
  globalGrade?: string;
  globalSection?: string;
  activeSection?: any;
  isHomeroomTeacher?: boolean;
}

const StudentsModule = ({
  globalGrade,
  globalSection,
  activeSection,
  isHomeroomTeacher,
}: StudentsModuleProps) => {
  const [students, setStudents] = useState<Student[]>(STUDENTS_MOCK);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState<
    | "Overview"
    | "Attendance"
    | "Academics"
    | "Parent Info"
    | "Behaviour"
    | "Analytics"
  >("Overview");
  const [searchQuery, setSearchQuery] = useState("");

  // Data loaded when a student is selected
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null);
  const [studentResults, setStudentResults] = useState<AssessmentResult[]>([]);
  const [parentLinks, setParentLinks] = useState<ParentLink[]>([]);
  const [insightTriggerState, setInsightTriggerState] = useState<{
    status: "idle" | "loading" | "success" | "error";
    result: StudentInsightTriggerResponse | null;
    error: string | null;
  }>({
    status: "idle",
    result: null,
    error: null,
  });
  const [behaviourLog, setBehaviourLog] = useState<BehaviourLogEntry[]>([]);
  const [isBehaviourLoading, setIsBehaviourLoading] = useState(false);
  const [behaviourError, setBehaviourError] = useState<string | null>(null);
  const [isSavingBehaviour, setIsSavingBehaviour] = useState(false);

  // Load attendance, academics, and parent links when a student is selected
  useEffect(() => {
    if (!selectedStudent) {
      setAttendanceSummary(null);
      setStudentResults([]);
      setParentLinks([]);
      setInsightTriggerState({
        status: "idle",
        result: null,
        error: null,
      });
      setBehaviourLog([]);
      setBehaviourError(null);
      return;
    }
    const acYearId = activeSection?.academicYearId;
    getAttendanceSummary(selectedStudent.id, acYearId).then(setAttendanceSummary);
    getAssessmentResults({ student: selectedStudent.id }).then((res) =>
      setStudentResults(res.results ?? []),
    );
    getParentLinks(selectedStudent.id).then(setParentLinks);
    setIsBehaviourLoading(true);
    setBehaviourError(null);
    getStudentBehaviourLog(selectedStudent.id)
      .then(setBehaviourLog)
      .catch((error) => {
        setBehaviourError(
          error instanceof Error ? error.message : "Failed to load behaviour log.",
        );
        setBehaviourLog([]);
      })
      .finally(() => setIsBehaviourLoading(false));
  }, [selectedStudent?.id, activeSection?.academicYearId]);

  const primaryParent = parentLinks.find((p) => p.is_primary_contact) ?? parentLinks[0] ?? null;

  // Load students when active section changes
  useEffect(() => {
    if (activeSection?.sectionId) {
      setIsLoading(true);
      getStudentsBySectionId(activeSection.sectionId)
        .then((data) => {
          console.log("✅ Loaded students:", data);
          setStudents(data);
        })
        .catch((error) => {
          console.error("❌ Error loading students:", error);
          setStudents(STUDENTS_MOCK); // Fallback to mock data
        })
        .finally(() => setIsLoading(false));
    } else {
      setStudents(STUDENTS_MOCK);
    }
  }, [activeSection?.sectionId]);

  // Edit pop-up states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editGrade, setEditGrade] = useState("");
  const [editSection, setEditSection] = useState("");
  const [editStatus, setEditStatus] = useState<
    "Active" | "Pending" | "Withdrawn"
  >("Active");
  const [editParentName, setEditParentName] = useState("");
  const [editParentPhone, setEditParentPhone] = useState("");
  const [editParentEmail, setEditParentEmail] = useState("");
  const [editParentLinked, setEditParentLinked] = useState(false);

  const [isAddIncidentOpen, setIsAddIncidentOpen] = useState(false);
  const [newIncidentTitle, setNewIncidentTitle] = useState("");
  const [newIncidentSeverity, setNewIncidentSeverity] = useState<
    "Good Day" | "Warning" | "Serious"
  >("Warning");
  const [newIncidentDescription, setNewIncidentDescription] = useState("");

  const [isAddRemarkOpen, setIsAddRemarkOpen] = useState(false);
  const [newRemarkText, setNewRemarkText] = useState("");
  const [newRemarkTitle, setNewRemarkTitle] = useState("");

  const incidents = useMemo(
    () => behaviourLog.filter((entry) => entry.type === "incident"),
    [behaviourLog],
  );
  const remarks = useMemo(
    () => behaviourLog.filter((entry) => entry.type === "remark"),
    [behaviourLog],
  );

  const warningCount = incidents.filter((entry) => entry.severity === "MEDIUM").length;
  const seriousCount = incidents.filter((entry) => entry.severity === "HIGH").length;
  const goodDaysCount =
    24 + incidents.filter((entry) => entry.severity === "LOW").length;

  const formatBehaviourDate = (value: string | null) => {
    if (!value) return "—";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    }).format(new Date(value));
  };

  const getSeverityClasses = (severity: string) => {
    if (severity === "HIGH") {
      return "bg-rose-50 text-rose-600 border-rose-100";
    }
    if (severity === "MEDIUM") {
      return "bg-amber-50 text-amber-600 border-amber-100";
    }
    return "bg-emerald-50 text-emerald-600 border-emerald-100";
  };

  const getSeverityLabel = (severity: string) => {
    if (severity === "HIGH") return "Serious";
    if (severity === "MEDIUM") return "Warning";
    return "Good Day";
  };

  const mapIncidentSeverity = (
    severity: "Good Day" | "Warning" | "Serious",
  ): CreateBehaviourLogEntryRequest["severity"] => {
    if (severity === "Serious") return "HIGH";
    if (severity === "Warning") return "MEDIUM";
    return "LOW";
  };

  // Calculate student statistics from actual data
  const totalStudents = students.length;
  const activeStudents = students.filter((s) => s.status === "Active").length;
  const pendingStudents = students.filter((s) => s.status === "Pending").length;
  const withdrawnStudents = students.filter(
    (s) => s.status === "Withdrawn",
  ).length;

  const handleRowClick = (student: Student) => {
    setSelectedStudent(student);
    setIsSheetOpen(true);
    setActiveDetailTab("Overview");
  };

  const closeSheet = () => {
    setIsSheetOpen(false);
    setTimeout(() => setSelectedStudent(null), 300); // Wait for transition
  };

  const addBehaviourEntry = async (payload: CreateBehaviourLogEntryRequest) => {
    if (!selectedStudent) {
      return false;
    }

    setIsSavingBehaviour(true);
    setBehaviourError(null);
    try {
      const created = await createStudentBehaviourLogEntry(selectedStudent.id, payload);
      setBehaviourLog((current) => [created, ...current]);
      return true;
    } catch (error) {
      setBehaviourError(
        error instanceof Error ? error.message : "Failed to save behaviour entry.",
      );
      return false;
    } finally {
      setIsSavingBehaviour(false);
    }
  };

  const runInsightTrigger = async () => {
    if (!selectedStudent) {
      return;
    }

    setInsightTriggerState({
      status: "loading",
      result: null,
      error: null,
    });

    try {
      const result = await triggerStudentInsight(selectedStudent.id);
      setInsightTriggerState({
        status: "success",
        result,
        error: null,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to generate the student insight.";
      setInsightTriggerState({
        status: "error",
        result: null,
        error: message,
      });
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      return (
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [students, searchQuery]);

  return (
    <div className="flex-1 space-y-8 animate-in fade-in duration-500">
      {/* 1. Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          label="Total Students"
          count={totalStudents}
          subtitle={`+${activeStudents} ACTIVE`}
          icon={Users}
        />
        <MetricCard
          label="Active"
          count={activeStudents}
          subtitle="Current Session"
          icon={CheckCircle}
          accentColor="text-emerald-600"
        />
        <MetricCard
          label="Pending"
          count={pendingStudents}
          subtitle="Awaiting Link"
          icon={AlertCircle}
          accentColor="text-amber-500"
        />
        <MetricCard
          label="Withdrawn"
          count={withdrawnStudents}
          subtitle="Past Year"
          icon={Minus}
          accentColor="text-slate-400"
        />
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full max-w-md text-right">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            size={16}
          />
          <input
            type="text"
            placeholder="Search by name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-100 rounded-2xl text-[11px] font-bold uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-[#1A237E]/10 transition-all shadow-sm"
          />
        </div>
      </div>

      {/* 3. Main Data Table or Empty State */}
      {filteredStudents.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden p-12 text-center">
          <Users className="mx-auto mb-4 text-slate-300" size={40} />
          <h3 className="text-slate-600 font-semibold mb-2">No Students</h3>
          <p className="text-slate-400 text-sm">
            {students.length === 0
              ? "No students found for this section."
              : "No students match your search query."}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="hidden sm:table-cell px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">
                    Student ID
                  </th>
                  <th className="sticky left-0 z-10 bg-slate-50/50 px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] shadow-[2px_0_4px_rgba(0,0,0,0.02)]">
                    Name
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">
                    Status
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr
                    key={student.id}
                    onClick={() => handleRowClick(student)}
                    className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    <td className="hidden sm:table-cell px-6 py-4">
                      <span className="text-[11px] font-mono font-medium text-slate-400 tracking-tight">
                        {student.rollNo ?? student.id}
                      </span>
                    </td>
                    <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 px-6 py-4 shadow-[2px_0_4px_rgba(0,0,0,0.02)]">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-black shrink-0 ${
                            [
                              "bg-indigo-500",
                              "bg-emerald-500",
                              "bg-amber-500",
                              "bg-rose-500",
                              "bg-blue-500",
                            ][student.name.length % 5]
                          }`}
                        >
                          {student.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
                            {student.name}
                          </span>
                          <span className="md:hidden text-[10px] text-slate-400 font-medium">
                            {student.grade} • Sec {student.section}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge status={student.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditName(student.name);
                            setEditGrade(student.grade);
                            setEditSection(student.section);
                            setEditStatus(student.status);
                            setEditParentName(student.parentName);
                            setEditParentPhone(student.parentPhone);
                            setEditParentEmail(student.parentEmail);
                            setEditParentLinked(student.parentLinked);
                            setSelectedStudent(student);
                            setIsEditModalOpen(true);
                          }}
                          className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-slate-400 hover:text-[#1A237E] transition-all cursor-pointer"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-slate-400 hover:text-[#1A237E] transition-all">
                          <Eye size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 bg-slate-50/30 flex items-center justify-between border-t border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
              Showing 1–{filteredStudents.length} of {totalStudents} students
            </p>
            <div className="flex gap-2">
              <button className="p-1.5 rounded-lg border border-slate-100 bg-white text-slate-400 hover:text-slate-600 disabled:opacity-50 transition-colors">
                <ChevronLeft size={16} />
              </button>
              <button className="p-1.5 rounded-lg border border-slate-100 bg-white text-slate-400 hover:text-slate-600 transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Student Detail Side Sheet */}
      <AnimatePresence>
        {isSheetOpen && selectedStudent && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeSheet}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
            />

            {/* Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full sm:w-[480px] bg-white rounded-l-2xl shadow-2xl z-50 flex flex-col"
            >
              {/* Header */}
              <div className="p-8 border-b border-slate-50 relative">
                <button
                  onClick={closeSheet}
                  className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>

                <div className="flex flex-col items-center text-center">
                  <div
                    className={`w-[60px] h-[60px] rounded-full flex items-center justify-center text-white text-xl font-black mb-4 shadow-lg ${
                      [
                        "bg-indigo-500",
                        "bg-emerald-500",
                        "bg-amber-500",
                        "bg-rose-500",
                        "bg-blue-500",
                      ][selectedStudent.name.length % 5]
                    }`}
                  >
                    {selectedStudent.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                    {selectedStudent.name}
                  </h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs font-mono font-medium text-slate-400">
                      {selectedStudent.rollNo ?? selectedStudent.id}
                    </span>
                    <Badge status={selectedStudent.status} />
                  </div>
                </div>
              </div>

              {/* Tabs Container */}
              <div className="flex px-8 border-b border-slate-50 overflow-x-auto no-scrollbar">
                {(
                  [
                    "Overview",
                    "Attendance",
                    "Academics",
                    "Parent Info",
                    "Behaviour",
                    "Analytics",
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveDetailTab(tab)}
                    className={`px-4 py-4 text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border-b-2 ${
                      activeDetailTab === tab
                        ? "border-[#1A237E] text-[#1A237E]"
                        : "border-transparent text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {activeDetailTab === "Overview" && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div>
                      <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4">
                        Registration Info
                      </h4>
                      <div className="grid grid-cols-2 gap-6 p-5 bg-slate-50 rounded-2xl border border-slate-100/50">
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                            Grade & Section
                          </p>
                          <p className="text-sm font-bold text-slate-800">
                            {selectedStudent.grade} • {selectedStudent.section}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                            Enrolled Date
                          </p>
                          <p className="text-sm font-bold text-slate-800">
                            {selectedStudent.enrolled}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                            Gender
                          </p>
                          <p className="text-sm font-bold text-slate-800">
                            {selectedStudent.gender ?? "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                            Academic Year
                          </p>
                          <p className="text-sm font-bold text-slate-800">
                            {selectedStudent.academicYearName ?? "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                            Branch
                          </p>
                          <p className="text-sm font-bold text-slate-800">
                            {selectedStudent.branchName ?? "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                            Roll Number
                          </p>
                          <p className="text-sm font-bold text-slate-800">
                            {selectedStudent.rollNo ?? "—"}
                          </p>
                        </div>
                      </div>
                    </div>


                  </div>
                )}

                {activeDetailTab === "Attendance" && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {([
                        {
                          label: "Present",
                          val: attendanceSummary?.total_present ?? 0,
                          color: "text-emerald-500",
                          bg: "bg-emerald-500",
                          pct: attendanceSummary
                            ? Math.round(
                                (attendanceSummary.total_present /
                                  attendanceSummary.total_school_days) *
                                  100,
                              )
                            : 0,
                        },
                        {
                          label: "Absent",
                          val: attendanceSummary?.total_absent ?? 0,
                          color: "text-red-500",
                          bg: "bg-red-500",
                          pct: attendanceSummary
                            ? Math.round(
                                (attendanceSummary.total_absent /
                                  attendanceSummary.total_school_days) *
                                  100,
                              )
                            : 0,
                        },
                        {
                          label: "Late",
                          val: attendanceSummary?.total_late ?? 0,
                          color: "text-amber-500",
                          bg: "bg-amber-500",
                          pct: attendanceSummary
                            ? Math.round(
                                (attendanceSummary.total_late /
                                  attendanceSummary.total_school_days) *
                                  100,
                              )
                            : 0,
                        },
                        {
                          label: "Excused",
                          val: attendanceSummary?.total_excused ?? 0,
                          color: "text-blue-500",
                          bg: "bg-blue-500",
                          pct: attendanceSummary
                            ? Math.round(
                                (attendanceSummary.total_excused /
                                  attendanceSummary.total_school_days) *
                                  100,
                              )
                            : 0,
                        },
                      ] as const).map((stat, i) => (
                        <div
                          key={i}
                          className="p-4 bg-slate-50 rounded-2xl border border-slate-100/50 text-center"
                        >
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                            {stat.label}
                          </p>
                          <p
                            className={`text-2xl font-mono font-black ${stat.color}`}
                          >
                            {stat.val}
                          </p>
                          <div className="mt-3 w-full h-1 bg-white rounded-full overflow-hidden">
                            <div
                              className={`h-full ${stat.bg} rounded-full transition-all`}
                              style={{ width: `${stat.pct}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                        Attendance Rate
                      </h4>
                      <div className="flex items-center gap-6">
                        <div className="relative w-24 h-24">
                          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
                            <circle
                              cx="18" cy="18" r="15.5"
                              fill="none" stroke="#e2e8f0" strokeWidth="3"
                            />
                            <circle
                              cx="18" cy="18" r="15.5"
                              fill="none"
                              stroke={(() => {
                                const r = attendanceSummary?.attendance_rate ?? 0;
                                if (r >= 90) return "#10b981";
                                if (r >= 75) return "#f59e0b";
                                return "#ef4444";
                              })()}
                              strokeWidth="3"
                              strokeDasharray={`${(attendanceSummary?.attendance_rate ?? 0) / 100 * 97.4} 97.4`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className={`text-xl font-black ${
                              (attendanceSummary?.attendance_rate ?? 0) >= 90
                                ? "text-emerald-500"
                                : (attendanceSummary?.attendance_rate ?? 0) >= 75
                                  ? "text-amber-500"
                                  : "text-red-500"
                            }`}>
                              {attendanceSummary
                                ? `${Math.round(attendanceSummary.attendance_rate)}%`
                                : "—"}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-1 text-xs text-slate-500">
                          <p>Total school days: <span className="font-bold text-slate-700">{attendanceSummary?.total_school_days ?? "—"}</span></p>
                          <p>Last updated: <span className="font-bold text-slate-700">{attendanceSummary?.last_updated ? new Date(attendanceSummary.last_updated).toLocaleDateString() : "—"}</span></p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeDetailTab === "Academics" && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    {(() => {
                      const subjectScores: Record<string, { total: number; count: number; maxTotal: number }> = {};
                      studentResults.forEach((r) => {
                        const name = r.subject_name ?? "General";
                        if (!subjectScores[name]) subjectScores[name] = { total: 0, count: 0, maxTotal: 0 };
                        if (r.obtained_marks) {
                          subjectScores[name].total += Number(r.obtained_marks);
                          subjectScores[name].count++;
                        }
                        if (r.total_marks) {
                          subjectScores[name].maxTotal += Number(r.total_marks);
                        }
                      });
                      const SUBJECT_COLORS: Record<string, string> = {
                        Mathematics: "bg-indigo-500",
                        Physics: "bg-blue-500",
                        English: "bg-emerald-500",
                        Biology: "bg-amber-500",
                        History: "bg-indigo-400",
                        Chemistry: "bg-violet-500",
                      };
                      const entries = Object.entries(subjectScores);
                      return entries.length > 0
                        ? entries.map(([subject, data]) => {
                            const avg = data.count > 0 ? Math.round(data.total / data.count) : 0;
                            const pct = data.maxTotal > 0 ? Math.round((data.total / data.maxTotal) * 100) : avg;
                            const color = SUBJECT_COLORS[subject] ?? "bg-slate-500";
                            return (
                              <div key={subject} className="space-y-2">
                                <div className="flex justify-between items-end">
                                  <h5 className="text-xs font-bold text-slate-700 uppercase tracking-tight">
                                    {subject}
                                  </h5>
                                  <span className="text-[11px] font-mono font-black text-slate-400">
                                    {avg}/{data.maxTotal > 0 ? Math.round(data.maxTotal / data.count) : 100}
                                  </span>
                                </div>
                                <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(pct, 100)}%` }}
                                    className={`h-full ${color} rounded-full`}
                                  />
                                </div>
                              </div>
                            );
                          })
                        : (
                          <div className="flex flex-col items-center justify-center p-10 text-slate-400">
                            <p className="text-sm font-bold">No academic data available</p>
                            <p className="text-xs mt-1">Assessment results will appear here once graded.</p>
                          </div>
                        );
                    })()}
                  </div>
                )}

                {activeDetailTab === "Parent Info" && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    {parentLinks.length === 0 ? (
                      <div className="p-5 bg-amber-50 border border-amber-100 rounded-2xl text-center">
                        <p className="text-xs font-bold text-amber-700">
                          No parent linked to this student.
                        </p>
                      </div>
                    ) : (
                      parentLinks.map((link) => (
                        <div
                          key={link.id}
                          className="p-5 bg-white border border-slate-100 rounded-2xl space-y-4 shadow-sm"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-[#1A237E]">
                              <Users size={20} />
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-slate-900 tracking-tight">
                                {link.parent_name}
                              </h4>
                              <p className="text-[9px] font-black text-[#1A237E] uppercase tracking-wider">
                                {link.relationship_type === "FATHER"
                                  ? "Father"
                                  : link.relationship_type === "MOTHER"
                                    ? "Mother"
                                    : link.relationship_type ?? "Guardian"}
                                {link.is_primary_contact ? " • Primary" : ""}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2.5 pt-3 border-t border-slate-50">
                            {link.parent_email && (
                              <div className="flex items-center gap-3 text-slate-500">
                                <Mail size={13} className="text-slate-300" />
                                <span className="text-xs font-medium">
                                  {link.parent_email}
                                </span>
                              </div>
                            )}
                            {isHomeroomTeacher && link.parent_phone && (
                              <div className="flex items-center gap-3 text-slate-500">
                                <Phone size={13} className="text-slate-300" />
                                <span className="text-xs font-mono font-medium">
                                  {link.parent_phone}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="pt-3 flex items-center justify-between border-t border-slate-50">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                              Linkage Status
                            </span>
                            <span className="px-2.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border bg-emerald-50 text-emerald-600 border-emerald-100">
                              VERIFIED
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeDetailTab === "Behaviour" && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    {/* Behavior Score & Trend */}
                    <div className="p-5 bg-white border border-slate-100 rounded-2xl flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-4">
                        {/* Circular progress ring */}
                        <div className="relative w-16 h-16 flex items-center justify-center">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle
                              cx="32"
                              cy="32"
                              r="26"
                              stroke="#F1F5F9"
                              strokeWidth="6"
                              fill="transparent"
                            />
                            <circle
                              cx="32"
                              cy="32"
                              r="26"
                              stroke="#1A237E"
                              strokeWidth="6"
                              fill="transparent"
                              strokeDasharray={2 * Math.PI * 26}
                              strokeDashoffset={
                                2 * Math.PI * 26 * (1 - 4.2 / 5.0)
                              }
                              strokeLinecap="round"
                            />
                          </svg>
                          <span className="absolute text-sm font-black text-[#1A237E]">
                            4.2
                          </span>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                            Overall Behaviour
                          </p>
                          <p className="text-sm font-bold text-slate-800">
                            Satisfactory Conduct
                          </p>
                          <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                            This Term vs Last Term (4.0)
                          </span>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border bg-emerald-50 text-emerald-600 border-emerald-100">
                        Improving ↑
                      </span>
                    </div>

                    {/* Incident Log */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
                          Incident Log
                        </h4>
                        <button
                          onClick={() => {
                            setNewIncidentTitle("");
                            setNewIncidentSeverity("Warning");
                            setNewIncidentDescription("");
                            setIsAddIncidentOpen(true);
                          }}
                          className="px-3 py-1 bg-[#1A237E]/10 hover:bg-[#1A237E]/20 text-[#1A237E] text-[9.5px] font-black uppercase tracking-widest rounded-lg transition-colors cursor-pointer"
                        >
                          + Add Incident
                        </button>
                      </div>

                      {behaviourError && (
                        <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-[11px] font-semibold text-rose-600">
                          {behaviourError}
                        </div>
                      )}

                      {/* Incident List */}
                      <div className="space-y-3">
                        {isBehaviourLoading && (
                          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500">
                            Loading behaviour log...
                          </div>
                        )}
                        {!isBehaviourLoading && incidents.length === 0 && (
                          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500">
                            No incidents logged for this student yet.
                          </div>
                        )}
                        {incidents.map((incident) => (
                          <div
                            key={incident.id}
                            className="p-4 bg-white border border-slate-100 rounded-xl shadow-xs flex items-center justify-between"
                          >
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-slate-700 leading-snug">
                                {incident.title}
                              </p>
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">
                                By {incident.teacherName || "Teacher"} • {formatBehaviourDate(incident.occurredAt ?? incident.createdAt)}
                              </p>
                              {incident.description && (
                                <p className="text-[11px] text-slate-500">
                                  {incident.description}
                                </p>
                              )}
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border ${getSeverityClasses(incident.severity)}`}
                            >
                              {getSeverityLabel(incident.severity)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Teacher Remarks */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
                          Teacher Remarks
                        </h4>
                        <button
                          onClick={() => {
                            setNewRemarkText("");
                            setNewRemarkTitle("");
                            setIsAddRemarkOpen(true);
                          }}
                          className="px-3 py-1 bg-[#1A237E]/10 hover:bg-[#1A237E]/20 text-[#1A237E] text-[9.5px] font-black uppercase tracking-widest rounded-lg transition-colors cursor-pointer"
                        >
                          + Add Remark
                        </button>
                      </div>
                      <div className="space-y-3">
                        {isBehaviourLoading && (
                          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500">
                            Loading teacher remarks...
                          </div>
                        )}
                        {!isBehaviourLoading && remarks.length === 0 && (
                          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500">
                            No teacher remarks logged for this student yet.
                          </div>
                        )}
                        {remarks.map((remark) => (
                          <div
                            key={remark.id}
                            className="p-4 bg-slate-50 border border-slate-100 rounded-xl"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h5 className="text-xs font-bold text-slate-800 leading-none">
                                  {remark.teacherName || "Teacher"}
                                </h5>
                                <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-1 block">
                                  {remark.title}
                                </span>
                              </div>
                              <span className="text-[9px] font-mono text-slate-400">
                                {formatBehaviourDate(remark.occurredAt ?? remark.createdAt)}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 italic">
                              "{remark.description}"
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeDetailTab === "Analytics" && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    {/* Engagement Metrics */}
                    <div>
                      <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4">
                        Engagement Metrics
                      </h4>
                      <div className="space-y-4">
                        {[
                          {
                            label: "Class Participation Rate",
                            rate: 78,
                            color: "bg-indigo-600",
                          },
                          {
                            label: "Homework Submission Rate",
                            rate: 91,
                            color: "bg-emerald-500",
                          },
                          {
                            label: "Punctuality Rate",
                            rate: 85,
                            color: "bg-blue-500",
                          },
                        ].map((metric, i) => (
                          <div key={i} className="space-y-1.5">
                            <div className="flex justify-between items-end">
                              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">
                                {metric.label}
                              </span>
                              <span className="text-[11px] font-mono font-black text-slate-800">
                                {metric.rate}%
                              </span>
                            </div>
                            <div className="w-full h-2 bg-slate-50 border border-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${metric.color} rounded-full`}
                                style={{ width: `${metric.rate}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Academic Performance Trend */}
                    <div>
                      <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4">
                        Academic Performance Trend (6M)
                      </h4>
                      <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm">
                        <div className="h-32 w-full relative">
                          <svg
                            className="w-full h-full overflow-visible"
                            viewBox="0 0 300 100"
                            preserveAspectRatio="none"
                          >
                            <defs>
                              <linearGradient
                                id="chartGrad"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="0%"
                                  stopColor="#1A237E"
                                  stopOpacity="0.25"
                                />
                                <stop
                                  offset="100%"
                                  stopColor="#1A237E"
                                  stopOpacity="0"
                                />
                              </linearGradient>
                            </defs>
                            <line
                              x1="0"
                              y1="20"
                              x2="300"
                              y2="20"
                              stroke="#F1F5F9"
                              strokeWidth="1"
                              strokeDasharray="4 4"
                            />
                            <line
                              x1="0"
                              y1="50"
                              x2="300"
                              y2="50"
                              stroke="#F1F5F9"
                              strokeWidth="1"
                              strokeDasharray="4 4"
                            />
                            <line
                              x1="0"
                              y1="80"
                              x2="300"
                              y2="80"
                              stroke="#F1F5F9"
                              strokeWidth="1"
                              strokeDasharray="4 4"
                            />

                            <path
                              d="M 10 70 L 68 62 L 126 50 L 184 35 L 242 42 L 290 22"
                              fill="none"
                              stroke="#1A237E"
                              strokeWidth="3.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M 10 70 L 68 62 L 126 50 L 184 35 L 242 42 L 290 22 L 290 98 L 10 98 Z"
                              fill="url(#chartGrad)"
                            />
                            {[
                              { x: 10, y: 70, v: 70 },
                              { x: 68, y: 62, v: 74 },
                              { x: 126, y: 50, v: 80 },
                              { x: 184, y: 35, v: 87 },
                              { x: 242, y: 42, v: 84 },
                              { x: 290, y: 22, v: 92 },
                            ].map((dot, k) => (
                              <g key={k}>
                                <circle
                                  cx={dot.x}
                                  cy={dot.y}
                                  r="6"
                                  fill="#1A237E"
                                  stroke="white"
                                  strokeWidth="2"
                                />
                                <text
                                  x={dot.x}
                                  y={dot.y - 12}
                                  textAnchor="middle"
                                  className="text-[8px] font-mono font-black"
                                  fill="#1A237E"
                                >
                                  {dot.v}%
                                </text>
                              </g>
                            ))}
                          </svg>
                        </div>
                        <div className="flex justify-between mt-3 text-[8px] font-black text-slate-400 uppercase tracking-widest px-2">
                          <span>Nov</span>
                          <span>Dec</span>
                          <span>Jan</span>
                          <span>Feb</span>
                          <span>Mar</span>
                          <span>Apr</span>
                        </div>
                      </div>
                    </div>

                    {/* Extracurricular Involvement */}
                    <div>
                      <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4">
                        Extracurricular Involvement
                      </h4>
                      <div className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between shadow-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-[#1A237E]/5 text-[#1A237E] rounded-xl flex items-center justify-center">
                            <span className="text-xs font-black">🧪</span>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">
                              Science Club & Tech Lab
                            </p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                              Active Participant
                            </p>
                          </div>
                        </div>
                        <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-[8.5px] font-black uppercase tracking-wider border border-indigo-100">
                          18 Hrs Logged
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons Footer */}
              <div className="p-8 border-t border-slate-50 bg-slate-50/50 space-y-3">
                {insightTriggerState.status !== "idle" && (
                  <div
                    className={`rounded-2xl border px-4 py-3 ${
                      insightTriggerState.status === "error"
                        ? "border-rose-100 bg-rose-50"
                        : insightTriggerState.result?.created
                          ? "border-emerald-100 bg-emerald-50"
                          : "border-amber-100 bg-amber-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl ${
                          insightTriggerState.status === "error"
                            ? "bg-rose-100 text-rose-600"
                            : insightTriggerState.result?.created
                              ? "bg-emerald-100 text-emerald-600"
                              : "bg-amber-100 text-amber-600"
                        }`}
                      >
                        <Sparkles size={16} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                          Insight Status
                        </p>
                        <p className="text-xs font-bold text-slate-800">
                          {insightTriggerState.status === "loading"
                            ? "Generating the student insight..."
                            : insightTriggerState.error
                              ? insightTriggerState.error
                              : insightTriggerState.result?.message}
                        </p>
                        {insightTriggerState.result?.created && (
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            {insightTriggerState.result.reused_existing
                              ? "Existing insight reused"
                              : `${insightTriggerState.result.category} • ${insightTriggerState.result.risk_band} • ${insightTriggerState.result.delivery_status}`}
                          </p>
                        )}
                        {insightTriggerState.result?.created && (
                          <p className="text-[10px] text-slate-500">
                            Open the Parent Site notifications for this student&apos;s parent to view the delivered insight.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => {
                    void runInsightTrigger();
                  }}
                  disabled={!selectedStudent || insightTriggerState.status === "loading"}
                  className="w-full py-4 bg-amber-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-amber-900/20 hover:bg-amber-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles size={14} />
                  {insightTriggerState.status === "loading"
                    ? "Generating Insight..."
                    : "Generate Insight"}
                </button>
                <button
                  onClick={() => {
                    if (selectedStudent) {
                      const event = new CustomEvent("send_student_sms", {
                        detail: { studentId: selectedStudent.id },
                      });
                      window.dispatchEvent(event);
                      closeSheet();
                    }
                  }}
                  className="w-full py-4 bg-[#1A237E] text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-900/20 hover:bg-blue-900 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  Chat with {primaryParent?.parent_name ?? "Parent"}
                </button>
                <button
                  onClick={() => {
                    if (selectedStudent) {
                      setEditName(selectedStudent.name);
                      setEditGrade(selectedStudent.grade);
                      setEditSection(selectedStudent.section);
                      setEditStatus(selectedStudent.status);
                      setEditParentName(primaryParent?.parent_name ?? selectedStudent.parentName);
                      setEditParentPhone(primaryParent?.parent_phone ?? selectedStudent.parentPhone);
                      setEditParentEmail(primaryParent?.parent_email ?? selectedStudent.parentEmail);
                      setEditParentLinked(!!primaryParent);
                      setIsEditModalOpen(true);
                    }
                  }}
                  className="w-full py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  Edit Profile
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add Incident Modal */}
      {isAddIncidentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 bg-[#1A237E] text-white">
              <h3 className="text-xs font-black uppercase tracking-widest">
                Add Behavioural Incident
              </h3>
              <p className="text-[9px] text-indigo-200 uppercase tracking-wider mt-1">
                Log conductive or disciplinary remarks
              </p>
            </div>
            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.15em] block">
                  Incident Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Late Assignment Submission"
                  value={newIncidentTitle}
                  onChange={(e) => setNewIncidentTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#1A237E]/15"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.15em] block">
                  Severity / Action Level
                </label>
                <select
                  value={newIncidentSeverity}
                  onChange={(e) =>
                    setNewIncidentSeverity(e.target.value as any)
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#1A237E]/15"
                >
                  <option value="Good Day">Good Conduct (✅ Good Day)</option>
                  <option value="Warning">
                    Warning Level / Infraction (⚠️ Warning)
                  </option>
                  <option value="Serious">
                    Serious Directive (🔴 Serious)
                  </option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.15em] block">
                  Incident Details
                </label>
                <textarea
                  placeholder="Add context for the parent behaviour feed..."
                  value={newIncidentDescription}
                  onChange={(e) => setNewIncidentDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#1A237E]/15 resize-none"
                />
              </div>
            </div>
            {/* Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setIsAddIncidentOpen(false)}
                className="flex-1 py-3 border border-slate-200 hover:bg-slate-100 text-[9px] font-black text-slate-500 rounded-xl uppercase tracking-widest transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={!newIncidentTitle || isSavingBehaviour}
                onClick={async () => {
                  const saved = await addBehaviourEntry({
                    type: "incident",
                    title: newIncidentTitle,
                    description: newIncidentDescription,
                    severity: mapIncidentSeverity(newIncidentSeverity),
                  });
                  if (saved) {
                    setIsAddIncidentOpen(false);
                  }
                }}
                className="flex-1 py-3 bg-[#1A237E] hover:bg-opacity-90 disabled:opacity-50 text-white text-[9px] font-black rounded-xl uppercase tracking-widest shadow-lg shadow-indigo-950/10 transition-colors cursor-pointer"
              >
                Log Incident
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Remark Modal */}
      {isAddRemarkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 bg-[#1A237E] text-white">
              <h3 className="text-xs font-black uppercase tracking-widest">
                Add Teacher Remark
              </h3>
              <p className="text-[9px] text-indigo-200 uppercase tracking-wider mt-1">
                Leave professional feedback on student conduct
              </p>
            </div>
            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.15em] block">
                  Remark Title / Subject
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mathematics"
                  value={newRemarkTitle}
                  onChange={(e) => setNewRemarkTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#1A237E]/15"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.15em] block">
                  Feedback / Remark Comment
                </label>
                <textarea
                  placeholder="Enter comments about student behaviour..."
                  value={newRemarkText}
                  onChange={(e) => setNewRemarkText(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#1A237E]/15 resize-none"
                />
              </div>
            </div>
            {/* Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setIsAddRemarkOpen(false)}
                className="flex-1 py-3 border border-slate-200 hover:bg-slate-100 text-[9px] font-black text-slate-500 rounded-xl uppercase tracking-widest transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={!newRemarkText || !newRemarkTitle || isSavingBehaviour}
                onClick={async () => {
                  const saved = await addBehaviourEntry({
                    type: "remark",
                    title: newRemarkTitle,
                    description: newRemarkText,
                  });
                  if (saved) {
                    setIsAddRemarkOpen(false);
                  }
                }}
                className="flex-1 py-3 bg-[#1A237E] hover:bg-opacity-90 disabled:opacity-50 text-white text-[9px] font-black rounded-xl uppercase tracking-widest shadow-lg shadow-indigo-950/10 transition-colors cursor-pointer"
              >
                Log Remark
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 bg-[#1A237E] text-white flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest">
                  Edit Student Profile
                </h3>
                <p className="text-[9px] text-indigo-400 uppercase tracking-wider mt-1">
                  Modify account linkage & personal info
                </p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            {/* Body */}
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.15em] block">
                    Student Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#1A237E]/15"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.15em] block">
                    Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#1A237E]/15"
                  >
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="Withdrawn">Withdrawn</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.15em] block">
                    Grade
                  </label>
                  <input
                    type="text"
                    value={editGrade}
                    onChange={(e) => setEditGrade(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#1A237E]/15"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.15em] block">
                    Section
                  </label>
                  <input
                    type="text"
                    value={editSection}
                    onChange={(e) => setEditSection(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#1A237E]/15"
                  />
                </div>
              </div>

              <div className="border-t border-slate-50 pt-4 space-y-4">
                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Parent / Guardian Connection
                </h4>

                <div className="space-y-1.5">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.15em] block">
                    Parent Name
                  </label>
                  <input
                    type="text"
                    value={editParentName}
                    onChange={(e) => setEditParentName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#1A237E]/15"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.15em] block">
                      Parent Email
                    </label>
                    <input
                      type="text"
                      value={editParentEmail}
                      onChange={(e) => setEditParentEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#1A237E]/15"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.15em] block">
                      Parent Phone
                    </label>
                    <input
                      type="text"
                      value={editParentPhone}
                      onChange={(e) => setEditParentPhone(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#1A237E]/15"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <input
                    type="checkbox"
                    id="editParentLinked"
                    checked={editParentLinked}
                    onChange={(e) => setEditParentLinked(e.target.checked)}
                    className="w-4 h-4 text-[#1A237E] focus:ring-[#1A237E]/20 border-slate-300 rounded cursor-pointer"
                  />
                  <label
                    htmlFor="editParentLinked"
                    className="text-[10px] font-black text-slate-600 uppercase tracking-wider cursor-pointer select-none"
                  >
                    Parent Portal Linked & Verified
                  </label>
                </div>
              </div>
            </div>
            {/* Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 py-3 border border-slate-200 hover:bg-slate-100 text-[9px] font-black text-slate-500 rounded-xl uppercase tracking-widest transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={!editName || !editParentName || !editParentEmail}
                onClick={() => {
                  if (selectedStudent) {
                    const updated = {
                      ...selectedStudent,
                      name: editName,
                      grade: editGrade,
                      section: editSection,
                      status: editStatus,
                      parentName: editParentName,
                      parentPhone: editParentPhone,
                      parentEmail: editParentEmail,
                      parentLinked: editParentLinked,
                    };

                    // Update main student list
                    setStudents((prev) =>
                      prev.map((s) =>
                        s.id === selectedStudent.id ? updated : s,
                      ),
                    );
                    // Update active selected student details
                    setSelectedStudent(updated);
                    setIsEditModalOpen(false);
                  }
                }}
                className="flex-1 py-3 bg-[#1A237E] hover:bg-opacity-90 disabled:opacity-50 text-white text-[9px] font-black rounded-xl uppercase tracking-widest shadow-lg shadow-indigo-950/10 transition-colors cursor-pointer"
              >
                Save Profile Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
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

export default React.memo(StudentsModule);
