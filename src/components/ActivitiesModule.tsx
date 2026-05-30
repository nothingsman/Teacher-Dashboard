"use client";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  ClipboardList, 
  Clock, 
  CheckCircle2, 
  Plus, 
  Calendar, 
  Users, 
  Pencil, 
  Trash2, 
  X,
  ClipboardCheck,
  BellRing,
  AlertCircle,
  MoreVertical,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSharedActivities } from '../sharedStore';
import type { Activity } from '../services';
import { getStudentsBySection } from '../services';

// --- Types ---

type Subject = 'Mathematics' | 'Physics' | 'English' | 'Biology' | 'History' | 'Chemistry';
type ActivityType = 'Homework' | 'Quiz' | 'Project' | 'Exam' | 'Lab Report' | 'Essay' | 'Practice Set';
type ActivityStatus = 'Active' | 'Closed' | 'Draft';

interface Student {
  name: string;
  initials: string;
  status: 'Submitted' | 'Pending' | 'Graded';
}

interface SectionBreakdown {
  name: string;
  submitted: number;
  total: number;
  students: Student[];
}

// --- Constants & Mock Data ---

const SUBJECT_COLORS: Record<Subject, string> = {
  Mathematics: '#1a237e',
  Physics: '#7c3aed',
  English: '#0891b2',
  Biology: '#059669',
  History: '#d97706',
  Chemistry: '#dc2626'
};

// --- Sub-components ---

const MetricCard = ({ 
  label, 
  count, 
  subtitle, 
  tintClass 
}: { 
  label: string; 
  count: string | number; 
  subtitle: string; 
  tintClass: string;
}) => (
  <div className="bg-white border border-slate-100 p-5 rounded-xl flex flex-col items-center justify-center text-center shadow-sm">
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
    <h3 className="text-2xl font-medium text-slate-800 tracking-tight">{count}</h3>
    <p className={`text-[10px] font-medium mt-1 px-2 py-0.5 rounded-full ${tintClass}`}>
      {subtitle}
    </p>
  </div>
);

const StatusPill = ({ status }: { status: ActivityStatus }) => {
  const styles = {
    Active: 'bg-emerald-50 text-emerald-700',
    Closed: 'bg-slate-100 text-slate-500',
    Draft: 'bg-amber-50 text-amber-700'
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium ${styles[status]}`}>
      {status}
    </span>
  );
};



// --- Main ActivitiesModule Component ---

interface ActivitiesModuleProps {
  globalGrade?: string;
  globalSection?: string;
  selectedSubject?: string;
  activeSection?: any;
}

const ActivitiesModule = ({ globalGrade, globalSection, selectedSubject, activeSection }: ActivitiesModuleProps) => {
  const { activities, addActivity, updateActivity, deleteActivity } = useSharedActivities();
  const [activeFilter, setActiveFilter] = useState<'All' | ActivityType>('All');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGradingOpen, setIsGradingOpen] = useState(false);
  const [selectedGradingSection, setSelectedGradingSection] = useState<string>('');
  const [gradingValues, setGradingValues] = useState<Record<string, { result: string; feedback: string }>>({});
  const [studentsToGrade, setStudentsToGrade] = useState<Array<{ name: string; initials: string; status: 'Submitted' | 'Pending' | 'Graded'; sectionName: string }>>([]);

  const selectedActivity = useMemo(() => activities.find(a => a.id === selectedId), [activities, selectedId]);

  // Extract all students from the selected activity's sections for the grading table
  const allStudents = useMemo(() => {
    if (!selectedActivity) return [];
    
    // If the mock data doesn't have students (e.g. for a new activity), we'll provide some defaults
    // In a real app, this would fetch the roster for the assigned sections
    if (!selectedActivity.sectionDetails || selectedActivity.sectionDetails.length === 0) {
      return [
        { name: "Demo Student 1", initials: "DS", status: "Submitted" },
        { name: "Demo Student 2", initials: "DS", status: "Submitted" }
      ];
    }

    return selectedActivity.sectionDetails.flatMap(section => 
       section.students.map(s => ({ ...s, sectionName: section.name }))
    );
  }, [selectedActivity]);

  // Fetch students for the currently selected grading section via the service
  useEffect(() => {
    if (!selectedGradingSection) {
      setStudentsToGrade([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const serviceStudents = await getStudentsBySection(selectedGradingSection);
        if (!cancelled) {
          // Map service Student objects to the shape expected by the grading panel
          const mapped = serviceStudents.map(s => ({
            name: s.name,
            initials: s.avatar || s.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase(),
            status: 'Submitted' as const,
            sectionName: selectedGradingSection,
          }));
          setStudentsToGrade(mapped);
        }
      } catch {
        // keep existing empty state on error
      }
    })();
    return () => { cancelled = true; };
  }, [selectedGradingSection]);

  const handleGradeChange = (studentName: string, field: 'result' | 'feedback', value: string) => {
    setGradingValues(prev => ({
      ...prev,
      [studentName]: {
        ...prev[studentName],
        [field]: value
      }
    }));
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this activity?')) {
      deleteActivity(id);
      if (selectedId === id) {
        setSelectedId(null);
      }
    }
  };

  const filteredActivities = useMemo(() => {
    if (activeFilter === 'All') return activities;
    return activities.filter(a => a.type === activeFilter);
  }, [activities, activeFilter]);

  // Metrics (Derived)
  const activeCount = activities.filter(a => a.status === 'Active').length;
  const awaitingReview = activities.reduce((acc, a) => acc + ((a.submitted || 0) - (a.graded || 0)), 0);
  const totalSub = activities.reduce((acc, a) => acc + (a.submitted || 0), 0);
  const totalAll = activities.reduce((acc, a) => acc + (a.total || 0), 0);
  const avgSubmission = totalAll > 0 ? Math.round((totalSub / totalAll) * 100) : 0;
  const overdueCount = 2;

  // New Activity Form State
  const [formData, setFormData] = useState({
    title: '',
    type: 'Homework' as ActivityType,
    subject: 'Mathematics' as Subject,
    sections: [] as string[],
    description: '',
    dueDate: '',
    dueTime: '',
    maxScore: '100',
    allowLate: false
  });

  const handleCreate = (status: ActivityStatus) => {
    if (!formData.title || formData.sections.length === 0) return;
    
    addActivity({
      id: `ACT-${Date.now()}`,
      title: formData.title,
      shortTitle: formData.title.length > 12 
        ? formData.title.slice(0, 12).trim() + '…' 
        : formData.title,
      subject: formData.subject,
      type: formData.type,
      maxScore: Number(formData.maxScore) || 100,
      sections: formData.sections,
      status: status,
      description: formData.description,
      dueDate: formData.dueDate,
      submitted: 0,
      total: formData.sections.length * 21,
      graded: 0,
      sectionDetails: formData.sections.map(s => ({
        name: s,
        submitted: 0,
        total: 21,
        students: []
      }))
    });

    setIsModalOpen(false);
    setFormData({
      title: '',
      type: 'Homework',
      subject: 'Mathematics',
      sections: [],
      description: '',
      dueDate: '',
      dueTime: '',
      maxScore: '100',
      allowLate: false
    });
  };

  return (
    <div className="flex-1 space-y-8 animate-in fade-in duration-500">
      
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard label="Active" count={activeCount} subtitle="assignments" tintClass="bg-blue-50 text-blue-600" />
        <MetricCard label="Awaiting Review" count={awaitingReview} subtitle="submissions" tintClass="bg-amber-50 text-amber-600" />
        <MetricCard label="Avg Submission" count={`${avgSubmission}%`} subtitle="this week" tintClass="bg-emerald-50 text-emerald-600" />
        <MetricCard label="Overdue" count={overdueCount} subtitle="past due" tintClass="bg-red-50 text-red-600" />
      </div>

      <div className="flex flex-col gap-8 items-start">
        
        {/* Left Column: Activity List (Now full width) */}
        <div className="w-full space-y-6 min-w-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex bg-slate-100/50 p-1 rounded-full overflow-x-auto no-scrollbar max-w-[calc(100vw-200px)]">
              {(['All', 'Homework', 'Quiz', 'Project', 'Exam', 'Lab Report', 'Essay', 'Practice Set'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                    activeFilter === f 
                      ? 'bg-[#1a237e] text-white shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-[#1a237e] text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-900 transition-colors shadow-sm"
            >
              <Plus size={16} /> <span className="hidden sm:inline">New Activity</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredActivities.map((act) => {
              const isSelected = selectedId === act.id;
              const subColor = SUBJECT_COLORS[act.subject];
              const progress = ((act.submitted || 0) / (act.total || 1)) * 100;

              return (
                <motion.div
                  layout
                  key={act.id}
                  onClick={() => setSelectedId(act.id)}
                  className={`bg-white border-y border-r border-slate-100 rounded-xl shadow-sm transition-all cursor-pointer group relative overflow-hidden flex flex-col p-5 ${
                    isSelected ? 'ring-2 ring-[#1a237e]/40' : 'hover:border-slate-200'
                  }`}
                  style={{ borderLeft: `3.5px solid ${subColor}` }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-medium tracking-wide uppercase" style={{ backgroundColor: `${subColor}15`, color: subColor }}>
                        {act.subject}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-medium tracking-wide uppercase bg-slate-100 text-slate-500">
                        {act.type}
                      </span>
                    </div>
                    <StatusPill status={act.status as ActivityStatus} />
                  </div>

                  <h4 className="text-sm font-medium text-slate-800 mt-3">{act.title}</h4>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-1 italic">"{act.description || 'No description provided'}"</p>
                  
                  <div className="flex gap-4 mt-3">
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <Calendar size={14} />
                      <span className="text-xs text-slate-500">{act.dueDate || 'No due date'}</span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs text-slate-400">Submissions</span>
                      <span className="text-xs font-medium text-slate-700">{act.submitted || 0} / {act.total || 0}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full" 
                        style={{ backgroundColor: subColor }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-slate-50">
                    <button className="p-1.5 text-slate-300 hover:text-slate-600 transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button 
                      onClick={(e) => handleDelete(act.id, e)}
                      className="p-1.5 text-slate-300 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Slide-over Detail Panel */}
        <AnimatePresence>
          {selectedActivity && (
            <div className="fixed inset-0 z-50 overflow-hidden">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedId(null)}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              />

              <div className="absolute inset-y-0 right-0 max-w-full flex">
                <motion.div 
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="w-screen max-w-md bg-white shadow-2xl flex flex-col"
                >
                  {/* Header */}
                  <div className="p-6 border-b border-slate-100 bg-white">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex gap-2">
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase" style={{ backgroundColor: `${SUBJECT_COLORS[selectedActivity.subject]}15`, color: SUBJECT_COLORS[selectedActivity.subject] }}>
                          {selectedActivity.subject}
                        </span>
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase bg-slate-100 text-slate-500">
                          {selectedActivity.type}
                        </span>
                      </div>
                      <button 
                        onClick={() => setSelectedId(null)}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all"
                      >
                        <X size={20} />
                      </button>
                    </div>
                    
                    <h3 className="text-xl font-medium text-slate-800">{selectedActivity.title}</h3>
                    <div className="mt-3 flex items-center justify-between">
                      <StatusPill status={selectedActivity.status as ActivityStatus} />
                      <div className="flex items-center gap-1.5 text-slate-400 font-medium">
                        <Calendar size={16} />
                        <span className="text-sm">{selectedActivity.dueDate || 'No due date'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
                    <section>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 block">Section Breakdown</label>
                      
                      <div className="space-y-6">
                        {(selectedActivity.sectionDetails && selectedActivity.sectionDetails.length > 0 ? selectedActivity.sectionDetails : [
                           { name: "Grade 7A", submitted: 18, total: 21, students: [{initials: "LT"}, {initials: "BH"}, {initials: "SG"}, {initials: "HM"}] },
                           { name: "Grade 7B", submitted: 10, total: 21, students: [{initials: "DB"}, {initials: "MT"}, {initials: "AN"}] }
                        ]).map((sec, i) => (
                          <div key={i} className="space-y-3 p-4 bg-slate-50/50 rounded-xl border border-slate-100">
                             <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-slate-700">{sec.name}</span>
                                <span className="text-slate-500 font-medium">{sec.submitted} / {sec.total} Submitted</span>
                             </div>
                             <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${(sec.submitted / (sec.total || 1)) * 100}%` }}
                                  className="h-full rounded-full" 
                                  style={{ 
                                    backgroundColor: SUBJECT_COLORS[selectedActivity.subject] 
                                  }}
                                />
                             </div>
                             <div className="flex items-center gap-2 pt-1">
                                <div className="flex -space-x-2 overflow-hidden">
                                  {sec.students && sec.students.slice(0, 5).map((s, idx) => (
                                    <div key={idx} className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-600 bg-slate-100">
                                      {s.initials}
                                    </div>
                                  ))}
                                  {(sec.total || 0) > 5 && (
                                    <div className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-400 bg-slate-50">
                                      +{(sec.total || 0) - 5}
                                    </div>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tight ml-1">
                                  {sec.submitted} submitted · {(sec.total || 0) - (sec.submitted || 0)} pending
                                </span>
                             </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>

                  {/* Footer Actions */}
                  <div className="p-6 bg-white border-t border-slate-100 flex flex-col gap-3">
                    <button 
                      onClick={() => {
                        if (selectedActivity) {
                          setGradingValues(selectedActivity.grades || {});
                          if (selectedActivity.sections && selectedActivity.sections.length > 0) {
                            setSelectedGradingSection(selectedActivity.sections[0]);
                          } else {
                            setSelectedGradingSection('');
                          }
                        }
                        setIsGradingOpen(true);
                      }}
                      className="w-full bg-[#1a237e] text-white rounded-xl py-3.5 text-sm font-bold flex items-center justify-center gap-3 shadow-xl shadow-blue-900/20 hover:bg-blue-900 transition-all uppercase tracking-wide cursor-pointer"
                    >
                      <ClipboardCheck size={18} /> Grade Submissions
                    </button>
                  </div>
                </motion.div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* New Activity Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden relative z-10 p-8 flex flex-col"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-base font-medium text-slate-800">New Activity</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="flex flex-col gap-5 overflow-y-auto max-h-[70vh] no-scrollbar pr-1">
                {/* Title */}
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Activity Title</label>
                  <input 
                    type="text" 
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="e.g. Chapter 3 Summary — Algebra"
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
                  />
                </div>

                {/* Type Tag Selector */}
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Activity Type</label>
                  <div className="border border-slate-200 rounded-lg p-1 flex flex-wrap gap-1">
                    {(['Homework', 'Quiz', 'Project', 'Exam', 'Lab Report', 'Essay', 'Practice Set'] as ActivityType[]).map(t => (
                      <button
                        key={t}
                        onClick={() => setFormData({...formData, type: t})}
                        className={`px-3 py-1.5 text-[10px] font-medium rounded-lg transition-all ${
                          formData.type === t ? 'bg-[#1a237e] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col">
                  <label className="text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Subject</label>
                  <select 
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value as Subject})}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none bg-white cursor-pointer"
                  >
                    {Object.keys(SUBJECT_COLORS).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="flex flex-col">
                  <label className="text-xs font-medium text-slate-500 mb-1.5 
                    uppercase tracking-wide">Assign to Sections</label>
                  <div className="grid grid-cols-2 gap-2 border border-slate-200 
                    rounded-lg p-3">
                    {[
                      "Grade 7A", "Grade 7B",
                      "Grade 8A", "Grade 8B",
                      "Grade 9A", "Grade 9B",
                      "Grade 10A"
                    ].map(section => (
                      <label key={section} className="flex items-center gap-2 
                        cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={formData.sections.includes(section)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData, 
                                sections: [...formData.sections, section]
                              });
                            } else {
                              setFormData({
                                ...formData, 
                                sections: formData.sections.filter(s => s !== section)
                              });
                            }
                          }}
                          className="accent-[#1a237e] w-3.5 h-3.5 cursor-pointer"
                        />
                        <span className="text-sm text-slate-700 
                          group-hover:text-slate-900 transition-colors">
                          {section}
                        </span>
                      </label>
                    ))}
                  </div>
                  {formData.sections.length === 0 && (
                    <p className="text-[10px] text-amber-500 mt-1.5 font-medium">
                      Select at least one section
                    </p>
                  )}
                </div>

                <div className="flex flex-col">
                   <label className="text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Description</label>
                   <textarea 
                     rows={3} 
                     value={formData.description}
                     onChange={(e) => setFormData({...formData, description: e.target.value})}
                     className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none resize-none"
                     placeholder="Briefly explain the activity objectives..."
                   />
                </div>

                <div className="grid grid-cols-2 gap-3">
                   <div className="flex flex-col">
                      <label className="text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Due Date</label>
                      <input 
                        type="date" 
                        value={formData.dueDate}
                        onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
                      />
                   </div>
                   <div className="flex flex-col">
                      <label className="text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Max Score</label>
                      <input 
                        type="number" 
                        min="1"
                        value={formData.maxScore}
                        onChange={(e) => setFormData({...formData, maxScore: e.target.value})}
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
                      />
                   </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-50 pt-4 mt-2">
                  <span className="text-sm text-slate-600">Allow late submissions</span>
                  <button 
                    onClick={() => setFormData({...formData, allowLate: !formData.allowLate})}
                    className={`w-10 h-5 rounded-full transition-colors relative flex items-center px-1 ${formData.allowLate ? 'bg-[#1a237e]' : 'bg-slate-200'}`}
                  >
                    <div className={`w-3 h-3 bg-white rounded-full transition-transform ${formData.allowLate ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>

              <div className="border-t border-slate-50 pt-6 mt-6 flex justify-end gap-3">
                 <button onClick={() => setIsModalOpen(false)} className="border border-slate-200 rounded-lg px-5 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
                 <button onClick={() => handleCreate('Draft')} className="border border-slate-300 rounded-lg px-5 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">Save Draft</button>
                 <button onClick={() => handleCreate('Active')} className="bg-[#1a237e] text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-blue-900 shadow-md shadow-blue-900/10 transition-colors">Assign Now</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Grading Modal */}
      <AnimatePresence>
        {isGradingOpen && selectedActivity && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsGradingOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden relative z-10 flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h3 className="text-xl font-medium text-slate-800">Grading: {selectedActivity.title}</h3>
                  <p className="text-xs text-slate-400 mt-1 uppercase font-black tracking-widest">{selectedActivity.subject} · Max Mark: {selectedActivity.maxScore || 100}</p>
                </div>
                <button 
                  onClick={() => setIsGradingOpen(false)} 
                  className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Section Selector Tab Bar */}
              {selectedActivity.sections && selectedActivity.sections.length > 0 && (
                <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50/20">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-2">Target Section:</span>
                  {selectedActivity.sections.map(sec => (
                    <button
                      key={sec}
                      onClick={() => setSelectedGradingSection(sec)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl uppercase tracking-wider transition-all cursor-pointer ${
                        selectedGradingSection === sec
                          ? 'bg-[#1a237e] text-white shadow-sm'
                          : 'bg-white hover:bg-slate-50 text-slate-500 border border-slate-100'
                      }`}
                    >
                      {sec}
                    </button>
                  ))}
                </div>
              )}

              {/* Table Container */}
              <div className="flex-1 overflow-auto p-6 scrollbar-thin scrollbar-thumb-slate-200">
                <table className="w-full border-separate border-spacing-0">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr>
                      <th className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400 pb-4 pl-4 border-b border-slate-100">Student Name</th>
                      <th className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400 pb-4 border-b border-slate-100">Section</th>
                      <th className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400 pb-4 w-28 border-b border-slate-100">Result / Score</th>
                      <th className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400 pb-4 border-b border-slate-100">Feedback</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentsToGrade.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-sm text-slate-400">
                          No students found in this section.
                        </td>
                      </tr>
                    ) : (
                      studentsToGrade.map((student, idx) => (
                        <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 pl-4 border-b border-slate-50">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">
                                {student.initials}
                              </div>
                              <span className="text-sm font-medium text-slate-700">{student.name}</span>
                            </div>
                          </td>
                          <td className="py-4 border-b border-slate-50">
                            <span className="text-xs text-slate-500 font-semibold uppercase">{student.sectionName || 'N/A'}</span>
                          </td>
                          <td className="py-4 border-b border-slate-50">
                            <div className="flex items-center gap-1">
                              <input 
                                type="text"
                                placeholder={`0-${selectedActivity.maxScore || 100}`}
                                value={gradingValues[student.name]?.result || ''}
                                onChange={(e) => handleGradeChange(student.name, 'result', e.target.value)}
                                className="w-20 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#1a237e]/10 focus:border-[#1a237e]/40 transition-all text-center font-medium"
                              />
                              <span className="text-xs text-slate-400 font-medium">/{selectedActivity.maxScore || 100}</span>
                            </div>
                          </td>
                          <td className="py-2 pr-4 border-b border-slate-50">
                            <textarea 
                              rows={1}
                              placeholder="Add constructive feedback..."
                              value={gradingValues[student.name]?.feedback || ''}
                              onChange={(e) => handleGradeChange(student.name, 'feedback', e.target.value)}
                              className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#1a237e]/10 focus:border-[#1a237e]/40 transition-all resize-none min-h-[38px] flex items-center bg-white"
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer Actions */}
              <div className="p-6 border-t border-slate-100 bg-slate-50/30 flex justify-between items-center mt-auto">
                <div className="flex items-center gap-4 text-xs text-slate-400">
                   <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span>{Object.keys(gradingValues).filter(k => gradingValues[k]?.result).length} Graded</span>
                   </div>
                   <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-slate-200" />
                      <span>{Math.max(0, studentsToGrade.length - Object.keys(gradingValues).filter(k => gradingValues[k]?.result).length)} Pending in this Section</span>
                   </div>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      if (selectedActivity) {
                        const updatedGrades = { ...selectedActivity.grades, ...gradingValues };
                        const totalGraded = Object.values(updatedGrades).filter((g: any) => g && g.result).length;
                        updateActivity(selectedActivity.id, {
                          grades: updatedGrades,
                          graded: totalGraded
                        });
                      }
                      setIsGradingOpen(false);
                    }}
                    className="px-6 py-2.5 text-sm font-medium text-slate-600 hover:bg-white border border-slate-200 rounded-xl transition-all cursor-pointer bg-white"
                  >
                    Save Progress
                  </button>
                  <button 
                    onClick={() => {
                      if (selectedActivity) {
                        const updatedGrades = { ...selectedActivity.grades, ...gradingValues } as any;
                        const totalGraded = Object.values(updatedGrades).filter((g: any) => g && g.result).length;
                        
                        // Set status of graded students under sectionDetails as "Graded"
                        const updatedSectionDetails = selectedActivity.sectionDetails?.map(sec => {
                          const updatedStudents = sec.students.map(s => {
                            if (updatedGrades[s.name]?.result) {
                              return { ...s, status: 'Graded' };
                            }
                            return s;
                          });
                          const newlyGraded = updatedStudents.filter(s => s.status === 'Graded').length;
                          return {
                            ...sec,
                            students: updatedStudents,
                            graded: newlyGraded
                          };
                        });

                        updateActivity(selectedActivity.id, {
                          grades: updatedGrades,
                          graded: totalGraded,
                          sectionDetails: updatedSectionDetails,
                          status: 'Closed' // Transition status if fully complete
                        });
                      }
                      setIsGradingOpen(false);
                    }}
                    className="px-6 py-2.5 bg-[#1a237e] text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-900/20 hover:bg-blue-900 transition-all cursor-pointer"
                  >
                    Publish All Grades
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

export default React.memo(ActivitiesModule);
