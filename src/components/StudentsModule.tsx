"use client";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import {
  Users,
  Search,
  Filter,
  Plus,
  CheckCircle,
  Minus,
  Eye,
  Edit2,
  X,
  Phone,
  Mail,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Send,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getStudentsBySectionId } from "../services/studentsService";

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
}

const StudentsModule = ({
  globalGrade,
  globalSection,
  activeSection,
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

  // Behaviour incidents state
  const [incidents, setIncidents] = useState([
    {
      id: "1",
      date: "May 12, 2026",
      type: "Late Assignment Submission",
      severity: "Warning",
      class: "bg-amber-50 text-amber-600 border-amber-100",
      reporter: "Abebe T. (Math)",
    },
    {
      id: "2",
      date: "May 08, 2026",
      type: "Disruptive Classroom Behaviour",
      severity: "Serious",
      class: "bg-rose-50 text-rose-600 border-rose-100",
      reporter: "Tsige K. (Physics)",
    },
    {
      id: "3",
      date: "May 02, 2026",
      type: "Incomplete Homework",
      severity: "Warning",
      class: "bg-amber-50 text-amber-600 border-amber-100",
      reporter: "Kebede M. (History)",
    },
  ]);
  const [isAddIncidentOpen, setIsAddIncidentOpen] = useState(false);
  const [newIncidentType, setNewIncidentType] = useState("");
  const [newIncidentSeverity, setNewIncidentSeverity] = useState<
    "Good Day" | "Warning" | "Serious"
  >("Warning");
  const [newIncidentReporter, setNewIncidentReporter] = useState("");

  // Remarks state
  const [remarks, setRemarks] = useState([
    {
      name: "Abebe Tadese",
      subject: "Mathematics",
      date: "May 15",
      text: "Liya is highly intelligent but needs to remain focused during independent exercises.",
    },
    {
      name: "Sarah J.",
      subject: "English",
      date: "May 10",
      text: "Excellent analytical reading skills. Actively participates and assists peers.",
    },
  ]);
  const [isAddRemarkOpen, setIsAddRemarkOpen] = useState(false);
  const [newRemarkText, setNewRemarkText] = useState("");
  const [newRemarkSubject, setNewRemarkSubject] = useState("");
  const [newRemarkName, setNewRemarkName] = useState("");

  const warningCount = incidents.filter((i) => i.severity === "Warning").length;
  const seriousCount = incidents.filter((i) => i.severity === "Serious").length;
  const goodDaysCount =
    24 + incidents.filter((i) => i.severity === "Good Day").length;

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

                    <div>
                      <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4">
                        Parent Connection
                      </h4>
                      {selectedStudent.parentLinked ? (
                        <div className="group flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-100 transition-colors shadow-sm">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                              <Users size={18} />
                            </div>
                            <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                                Linked Account
                              </p>
                              <p className="text-sm font-bold text-slate-800">
                                {selectedStudent.parentName}
                              </p>
                            </div>
                          </div>
                          <button className="p-2 text-indigo-500 hover:bg-slate-50 rounded-xl transition-colors">
                            <Phone size={18} />
                          </button>
                        </div>
                      ) : (
                        <div className="p-5 bg-amber-50 border border-amber-100 rounded-2xl text-center">
                          <p className="text-xs font-bold text-amber-700 mb-3">
                            No parent account is currently linked to this
                            student profile.
                          </p>
                          <button
                            onClick={() => {
                              setEditName(selectedStudent.name);
                              setEditGrade(selectedStudent.grade);
                              setEditSection(selectedStudent.section);
                              setEditStatus(selectedStudent.status);
                              setEditParentName(
                                selectedStudent.parentName || "",
                              );
                              setEditParentPhone(
                                selectedStudent.parentPhone || "",
                              );
                              setEditParentEmail(
                                selectedStudent.parentEmail || "",
                              );
                              setEditParentLinked(true);
                              setIsEditModalOpen(true);
                            }}
                            className="w-full py-2.5 bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all shadow-md shadow-amber-500/10 cursor-pointer"
                          >
                            Link Parent Account
                          </button>
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4">
                        Emergency Contact
                      </h4>
                      <div className="p-5 bg-white border border-slate-100 rounded-2xl space-y-4 shadow-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-bold text-slate-800 tracking-tight">
                              Kassa Alemu
                            </p>
                            <p className="text-[10px] font-medium text-slate-400 uppercase">
                              Grandparent • Guardian
                            </p>
                          </div>
                          <span className="text-sm font-mono font-bold text-slate-600">
                            +251 91 123 4567
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeDetailTab === "Attendance" && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        {
                          label: "Present",
                          val: 18,
                          color: "text-emerald-500",
                          bg: "bg-emerald-500",
                        },
                        {
                          label: "Absent",
                          val: 2,
                          color: "text-red-500",
                          bg: "bg-red-500",
                        },
                        {
                          label: "Late",
                          val: 1,
                          color: "text-amber-500",
                          bg: "bg-amber-500",
                        },
                      ].map((stat, i) => (
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
                              className={`h-full ${stat.bg} ${i === 0 ? "w-[85%]" : i === 1 ? "w-[10%]" : "w-[5%]"}`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                        Monthly Overview
                      </h4>
                      <div className="grid grid-cols-7 gap-2">
                        {Array.from({ length: 31 }, (_, i) => (
                          <div
                            key={i}
                            className={`aspect-square rounded-lg flex items-center justify-center text-[9px] font-bold ${
                              i % 8 === 0
                                ? "bg-red-50 text-red-500"
                                : i % 12 === 0
                                  ? "bg-amber-50 text-amber-500"
                                  : "bg-emerald-50 text-emerald-500"
                            }`}
                          >
                            {i + 1}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeDetailTab === "Academics" && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    {[
                      {
                        subject: "Mathematics",
                        score: 87,
                        color: "bg-indigo-500",
                      },
                      { subject: "Physics", score: 79, color: "bg-blue-500" },
                      {
                        subject: "English",
                        score: 92,
                        color: "bg-emerald-500",
                      },
                      { subject: "Biology", score: 74, color: "bg-amber-500" },
                      { subject: "History", score: 88, color: "bg-indigo-400" },
                    ].map((subj, i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex justify-between items-end">
                          <h5 className="text-xs font-bold text-slate-700 uppercase tracking-tight">
                            {subj.subject}
                          </h5>
                          <span className="text-[11px] font-mono font-black text-slate-400">
                            {subj.score}/100
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${subj.score}%` }}
                            className={`h-full ${subj.color} rounded-full`}
                          />
                        </div>
                      </div>
                    ))}

                    <div className="mt-8 p-5 rounded-2xl bg-[#1A237E]/5 border border-[#1A237E]/10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#1A237E] shadow-sm">
                          <Plus size={20} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#1A237E]">
                            Semester Report Card
                          </p>
                          <p className="text-[9px] font-medium text-slate-400 uppercase">
                            Ready for review
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="text-slate-300" size={16} />
                    </div>
                  </div>
                )}

                {activeDetailTab === "Parent Info" && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="p-5 bg-white border border-slate-100 rounded-2xl space-y-4 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-[#1A237E]">
                          <Users size={20} />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-900 tracking-tight">
                            {selectedStudent.parentName}
                          </h4>
                          <p className="text-[9px] font-black text-[#1A237E] uppercase tracking-wider">
                            Parent / Guardian
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2.5 pt-3 border-t border-slate-50">
                        <div className="flex items-center gap-3 text-slate-500">
                          <Mail size={13} className="text-slate-300" />
                          <span className="text-xs font-medium">
                            {selectedStudent.parentEmail}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-500">
                          <Phone size={13} className="text-slate-300" />
                          <span className="text-xs font-mono font-medium">
                            {selectedStudent.parentPhone}
                          </span>
                        </div>
                      </div>

                      <div className="pt-3 flex items-center justify-between border-t border-slate-50">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                          Linkage Status
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                            selectedStudent.parentLinked
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                              : "bg-amber-50 text-amber-600 border-amber-100"
                          }`}
                        >
                          {selectedStudent.parentLinked
                            ? "VERIFIED"
                            : "PENDING"}
                        </span>
                      </div>
                    </div>
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
                            setNewIncidentType("");
                            setNewIncidentSeverity("Warning");
                            setNewIncidentReporter("");
                            setIsAddIncidentOpen(true);
                          }}
                          className="px-3 py-1 bg-[#1A237E]/10 hover:bg-[#1A237E]/20 text-[#1A237E] text-[9.5px] font-black uppercase tracking-widest rounded-lg transition-colors cursor-pointer"
                        >
                          + Add Incident
                        </button>
                      </div>

                      {/* Incident List */}
                      <div className="space-y-3">
                        {incidents.map((incident, index) => (
                          <div
                            key={incident.id || index}
                            className="p-4 bg-white border border-slate-100 rounded-xl shadow-xs flex items-center justify-between"
                          >
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-slate-700 leading-snug">
                                {incident.type}
                              </p>
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">
                                By {incident.reporter} • {incident.date}
                              </p>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border ${incident.class}`}
                            >
                              {incident.severity}
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
                            setNewRemarkSubject("");
                            setNewRemarkName("");
                            setIsAddRemarkOpen(true);
                          }}
                          className="px-3 py-1 bg-[#1A237E]/10 hover:bg-[#1A237E]/20 text-[#1A237E] text-[9.5px] font-black uppercase tracking-widest rounded-lg transition-colors cursor-pointer"
                        >
                          + Add Remark
                        </button>
                      </div>
                      <div className="space-y-3">
                        {remarks.map((remark, index) => (
                          <div
                            key={index}
                            className="p-4 bg-slate-50 border border-slate-100 rounded-xl"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h5 className="text-xs font-bold text-slate-800 leading-none">
                                  {remark.name}
                                </h5>
                                <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-1 block">
                                  {remark.subject}
                                </span>
                              </div>
                              <span className="text-[9px] font-mono text-slate-400">
                                {remark.date}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 italic">
                              "{remark.text}"
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
                  Send SMS to Parent
                </button>
                <button
                  onClick={() => {
                    if (selectedStudent) {
                      setEditName(selectedStudent.name);
                      setEditGrade(selectedStudent.grade);
                      setEditSection(selectedStudent.section);
                      setEditStatus(selectedStudent.status);
                      setEditParentName(selectedStudent.parentName);
                      setEditParentPhone(selectedStudent.parentPhone);
                      setEditParentEmail(selectedStudent.parentEmail);
                      setEditParentLinked(selectedStudent.parentLinked);
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
                  Incident Description / Type
                </label>
                <input
                  type="text"
                  placeholder="e.g. Late Assignment Submission"
                  value={newIncidentType}
                  onChange={(e) => setNewIncidentType(e.target.value)}
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
                  Reported By (Teacher & Subject)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Abebe T. (Math)"
                  value={newIncidentReporter}
                  onChange={(e) => setNewIncidentReporter(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#1A237E]/15"
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
                disabled={!newIncidentType || !newIncidentReporter}
                onClick={() => {
                  let badgeClass =
                    "bg-[#1A237E]/5 text-[#1A237E] border-[#1A237E]/10";
                  if (newIncidentSeverity === "Good Day") {
                    badgeClass =
                      "bg-emerald-50 text-emerald-600 border-emerald-100";
                  } else if (newIncidentSeverity === "Warning") {
                    badgeClass = "bg-amber-50 text-amber-600 border-amber-100";
                  } else if (newIncidentSeverity === "Serious") {
                    badgeClass = "bg-rose-50 text-rose-600 border-rose-100";
                  }

                  const added = {
                    id: String(Date.now()),
                    date: new Date().toLocaleDateString("en-US", {
                      month: "short",
                      day: "2-digit",
                      year: "numeric",
                    }),
                    type: newIncidentType,
                    severity: newIncidentSeverity,
                    class: badgeClass,
                    reporter: newIncidentReporter,
                  };
                  setIncidents([added, ...incidents]);
                  setIsAddIncidentOpen(false);
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
                  Your Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Abebe Tadese"
                  value={newRemarkName}
                  onChange={(e) => setNewRemarkName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#1A237E]/15"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.15em] block">
                  Subject / Department
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mathematics"
                  value={newRemarkSubject}
                  onChange={(e) => setNewRemarkSubject(e.target.value)}
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
                disabled={!newRemarkText || !newRemarkSubject || !newRemarkName}
                onClick={() => {
                  const added = {
                    name: newRemarkName,
                    subject: newRemarkSubject,
                    date: new Date().toLocaleDateString("en-US", {
                      month: "short",
                      day: "2-digit",
                    }),
                    text: newRemarkText,
                  };
                  setRemarks([added, ...remarks]);
                  setIsAddRemarkOpen(false);
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
