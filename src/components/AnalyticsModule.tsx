"use client";
import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart3, 
  Calendar, 
  Heart, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle,
  Clock,
  MessageSquare,
  Users
} from 'lucide-react';
import { motion } from 'motion/react';
import { useSharedActivities } from '../sharedStore';
import { getSectionAnalytics, SECTION_DATA, type SectionAnalytics } from '../services/analyticsService';

const SECTIONS = Object.keys(SECTION_DATA);

const ACTIVITY_SUBJECT_MAP: Record<string, string> = {
  "Chapter 3 HW": "Mathematics",
  "Mid-Term Quiz": "Mathematics", // best-effort subject match
  "Mid-Term Exam": "Mathematics",
  "Newton Lab Rpt": "Physics",
  "WWI Essay": "History",
  "Cell Division": "Chemistry"
};

const SummaryCard = ({ label, value, subtitle, color, icon: Icon }: { label: string, value: string, subtitle: string, color: string, icon: any }) => {
  const colorMap: Record<string, string> = {
    emerald: 'text-emerald-500',
    blue: 'text-blue-500',
    amber: 'text-[#f59e0b]',
    red: 'text-red-500'
  };

  return (
    <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
        <div className="p-2 bg-slate-50 rounded-lg text-slate-400">
          <Icon size={16} />
        </div>
      </div>
      <h3 className={`text-3xl font-mono font-bold ${colorMap[color] || 'text-slate-800'}`}>{value}</h3>
      <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
    </div>
  );
};

const AnalyticsModule = ({ globalGrade, globalSection, activeSection }: { globalGrade?: string; globalSection?: string; activeSection?: any }) => {
  const { activities } = useSharedActivities(); // satisfying component import requirement
  
  const [selectedSection, setSelectedSection] = useState<string>("Grade 7 — Section A");
  const [selectedSubject, setSelectedSubject] = useState<string>("All Subjects");
  const [trendView, setTrendView] = useState<'month' | 'term'>('month');

  // Initialise currentSectionData from the default section
  const [currentSectionData, setCurrentSectionData] = useState<SectionAnalytics>(
    SECTION_DATA["Grade 7 — Section A"]
  );

  // Fetch section data whenever selectedSection changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getSectionAnalytics(selectedSection);
        if (!cancelled && data !== null) {
          setCurrentSectionData(data);
        }
        // null return (unknown section) → keep previous state
      } catch {
        // keep existing state on error
      }
    })();
    return () => { cancelled = true; };
  }, [selectedSection]);

  const uniqueSubjects = useMemo(() => {
    return currentSectionData.subjectAvgs.map(s => s.subject);
  }, [currentSectionData]);

  // Handles dropdown triggers safely
  const handleSectionChange = (section: string) => {
    setSelectedSection(section);
    setSelectedSubject("All Subjects");
  };

  // Section 1 Computations
  const sectionAvgText = useMemo(() => {
    return currentSectionData.sectionAvg.toFixed(1) + "%";
  }, [currentSectionData]);

  const sectionAvgColor = useMemo(() => {
    const avg = currentSectionData.sectionAvg;
    if (avg >= 75) return 'emerald';
    if (avg >= 50) return 'amber';
    return 'red';
  }, [currentSectionData]);

  const submissionRateObj = useMemo(() => {
    const s = currentSectionData.submissions;
    const total = s.submitted + s.late + s.missing;
    const rate = total > 0 ? Math.round((s.submitted / total) * 100) : 0;
    
    let color = 'red';
    if (rate >= 85) color = 'emerald';
    else if (rate >= 70) color = 'amber';

    return {
      value: rate + "%",
      color,
      subtitle: s.missing + " missing total"
    };
  }, [currentSectionData]);

  const parentEngagementObj = useMemo(() => {
    const p = currentSectionData.parentEngagement;
    const num = (p.high * 100) + (p.moderate * 50);
    const den = (p.high + p.moderate + p.low) * 100;
    const rate = den > 0 ? Math.round((num / den) * 100) : 0;

    let color = 'red';
    if (rate >= 70) color = 'emerald';
    else if (rate >= 40) color = 'amber';

    return {
      value: rate + "%",
      color,
      subtitle: rate < 60 ? "Low — needs attention" : "Healthy engagement"
    };
  }, [currentSectionData]);

  // Section 2 Computations & SVGs
  const trendXLabels = useMemo(() => {
    return trendView === 'month' 
      ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'] 
      : ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4', 'Wk 5', 'Wk 6'];
  }, [trendView]);

  const svgPaths = useMemo(() => {
    // We map 0..100% to Y-coord 110..10 inside height="120px" SVG
    const mapY = (val: number) => 110 - val;
    const getPointsStr = (arr: number[]) => {
      return arr.map((v, i) => `${40 + i * 88},${mapY(v)}`).join(' L ');
    };

    return {
      avg: getPointsStr(currentSectionData.sectionAvgTrend),
      top: getPointsStr(currentSectionData.topPerformersTrend),
      risk: getPointsStr(currentSectionData.atRiskTrend)
    };
  }, [currentSectionData]);

  const dist = currentSectionData.gradeDistribution;
  const maxGradeCount = Math.max(dist.A, dist.B, dist.C, dist.F) || 1;
  const passingBCount = dist.A + dist.B;

  // Section 3: Column 1: Subject Filter Check
  const filteredSubjectAvgs = useMemo(() => {
    const parentSubjects = currentSectionData.subjectAvgs;
    if (selectedSubject === "All Subjects") return parentSubjects;
    return parentSubjects.filter(sub => sub.subject === selectedSubject);
  }, [currentSectionData, selectedSubject]);

  const lowAvgSubjects = useMemo(() => {
    return currentSectionData.subjectAvgs.filter(s => s.avg < 70);
  }, [currentSectionData]);

  // Section 3: Column 2 Conic Stops
  const att = currentSectionData.attendance;
  const attTotal = att.present + att.late + att.absent || 100;
  const pStop = att.present;
  const lStop = att.present + att.late;

  // Section 3: Column 3 Parents Setup
  const parentTotal = currentSectionData.parentEngagement.high + 
                       currentSectionData.parentEngagement.moderate + 
                       currentSectionData.parentEngagement.low;

  // Section 4: Activities Sorting & Averages
  const filteredActivities = useMemo(() => {
    const list = currentSectionData.activityPerformance || [];
    if (selectedSubject === "All Subjects") return list;
    return list.filter(act => {
      const subject = ACTIVITY_SUBJECT_MAP[act.title];
      return subject === selectedSubject;
    });
  }, [currentSectionData, selectedSubject]);

  const tableAverages = useMemo(() => {
    if (filteredActivities.length === 0) {
      return { avgPct: 0, grade: 'F', submitted: 0, total: 0 };
    }
    const sumPct = filteredActivities.reduce((sum, item) => sum + item.avgPct, 0);
    const avgPct = sumPct / filteredActivities.length;
    
    let grade = 'F';
    if (avgPct >= 90) grade = 'A';
    else if (avgPct >= 75) grade = 'B';
    else if (avgPct >= 50) grade = 'C';

    const submitted = filteredActivities.reduce((sum, item) => sum + item.submitted, 0);
    const total = filteredActivities.reduce((sum, item) => sum + item.total, 0);

    return { avgPct, grade, submitted, total };
  }, [filteredActivities]);

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'Homework': return 'bg-amber-50 text-amber-700';
      case 'Quiz': return 'bg-blue-50 text-blue-700';
      case 'Exam': return 'bg-red-50 text-red-700';
      case 'Lab Report': return 'bg-slate-100 text-slate-600';
      case 'Essay': return 'bg-slate-100 text-slate-600';
      case 'Project': return 'bg-purple-50 text-purple-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const getAvgPctClass = (pct: number) => {
    if (pct >= 90) return 'text-green-700 font-bold';
    if (pct >= 75) return 'text-[#185FA5] font-bold';
    if (pct >= 50) return 'text-[#BA7517] font-bold';
    return 'text-red-600 font-bold';
  };

  const getGradeBadgeClass = (grade: string) => {
    switch (grade) {
      case 'A': return 'bg-emerald-50 text-emerald-700';
      case 'B': return 'bg-blue-50 text-blue-700';
      case 'C': return 'bg-amber-50 text-amber-700';
      case 'F': return 'bg-red-50 text-red-700';
      default: return 'bg-slate-50 text-slate-600';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.22 }}
      className="flex-1 space-y-8 pb-10"
    >


      {/* SECTION 1 - METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard 
          label="Section Avg" 
          value={sectionAvgText} 
          subtitle="+3.1% vs last month"
          color={sectionAvgColor}
          icon={BarChart3}
        />
        <SummaryCard 
          label="Attendance Rate" 
          value={`${att.present}%`} 
          subtitle={`${currentSectionData.students} students`}
          color="blue"
          icon={Calendar}
        />
        <SummaryCard 
          label="Submission Rate" 
          value={submissionRateObj.value} 
          subtitle={submissionRateObj.subtitle}
          color={submissionRateObj.color}
          icon={CheckCircle}
        />
        <SummaryCard 
          label="Parent Engagement" 
          value={parentEngagementObj.value} 
          subtitle={parentEngagementObj.subtitle}
          color={parentEngagementObj.color}
          icon={Heart}
        />
      </div>

      {/* SECTION 2 - TWO COLUMNS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN (Trends) - ~58% width */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-100 p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Section Performance Trend</p>
            <div className="flex bg-slate-100 p-1 rounded-lg">
              {(['month', 'term'] as const).map(view => (
                <button
                  key={view}
                  onClick={() => setTrendView(view)}
                  className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${
                    trendView === view 
                      ? 'bg-white text-[#1a237e] shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {view}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[140px] w-full mt-2 relative">
            <svg viewBox="0 0 500 135" className="w-full h-full overflow-visible">
              {/* Gridlines */}
              <line x1="40" y1="20" x2="480" y2="20" stroke="#f1f5f9" strokeDasharray="3,3" />
              <line x1="40" y1="35" x2="480" y2="35" stroke="#f1f5f9" strokeDasharray="3,3" />
              <line x1="40" y1="50" x2="480" y2="50" stroke="#f1f5f9" strokeDasharray="3,3" />
              <line x1="40" y1="60" x2="480" y2="60" stroke="#f1f5f9" strokeDasharray="3,3" />

              {/* Grid labels */}
              <text x="32" y="23" textAnchor="end" fontSize="9" className="fill-slate-400 font-mono font-medium">90%</text>
              <text x="32" y="38" textAnchor="end" fontSize="9" className="fill-slate-400 font-mono font-medium">75%</text>
              <text x="32" y="53" textAnchor="end" fontSize="9" className="fill-slate-400 font-mono font-medium">60%</text>
              <text x="32" y="63" textAnchor="end" fontSize="9" className="fill-slate-400 font-mono font-medium">50%</text>

              {/* Polylines */}
              <path d={`M ${svgPaths.avg}`} fill="none" stroke="#1a237e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d={`M ${svgPaths.top}`} fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4,4" strokeLinecap="round" strokeLinejoin="round" />
              <path d={`M ${svgPaths.risk}`} fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4,4" strokeLinecap="round" strokeLinejoin="round" />

              {/* Circle Dots on Section Average for Craftsmanship feedback */}
              {currentSectionData.sectionAvgTrend.map((val, i) => (
                <circle key={i} cx={40 + i * 88} cy={110 - val} r="3" fill="#1a237e" className="hover:scale-125 transition-transform" />
              ))}

              {/* X-axis labels */}
              {trendXLabels.map((lbl, idx) => (
                <text key={idx} x={40 + idx * 88} y="130" textAnchor="middle" fontSize="10" className="fill-slate-400 font-medium">{lbl}</text>
              ))}
            </svg>
          </div>

          <div className="flex flex-wrap items-center gap-4 border-t border-slate-50 pt-3 mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-[#1a237e]" />
              <span className="text-slate-500 font-bold">Section avg</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 border-t-2 border-dashed border-[#10b981]" />
              <span className="text-slate-500 font-bold">Top performers</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 border-t-2 border-dashed border-[#ef4444]" />
              <span className="text-slate-500 font-bold">At risk</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (Grade Distribution) - ~42% width */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-100 p-5 shadow-sm flex flex-col justify-between">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Grade Distribution</p>
          
          <div className="space-y-3.5 flex-1 flex flex-col justify-center">
            {/* Row A */}
            <div className="flex items-center gap-3">
              <span className="w-8 h-6 flex items-center justify-center text-[10px] font-black uppercase rounded bg-emerald-50 text-emerald-700">A</span>
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300" style={{ backgroundColor: '#1D9E75', width: `${(dist.A / maxGradeCount) * 100}%` }} />
              </div>
              <span className="w-16 text-right text-xs font-bold text-slate-700">{dist.A} students</span>
            </div>

            {/* Row B */}
            <div className="flex items-center gap-3">
              <span className="w-8 h-6 flex items-center justify-center text-[10px] font-black uppercase rounded bg-blue-50 text-blue-700">B</span>
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300" style={{ backgroundColor: '#185FA5', width: `${(dist.B / maxGradeCount) * 100}%` }} />
              </div>
              <span className="w-16 text-right text-xs font-bold text-slate-700">{dist.B} students</span>
            </div>

            {/* Row C */}
            <div className="flex items-center gap-3">
              <span className="w-8 h-6 flex items-center justify-center text-[10px] font-black uppercase rounded bg-amber-50 text-amber-700">C</span>
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300" style={{ backgroundColor: '#BA7517', width: `${(dist.C / maxGradeCount) * 100}%` }} />
              </div>
              <span className="w-16 text-right text-xs font-bold text-slate-700">{dist.C} students</span>
            </div>

            {/* Row F */}
            <div className="flex items-center gap-3">
              <span className="w-8 h-6 flex items-center justify-center text-[10px] font-black uppercase rounded bg-red-50 text-red-700">F</span>
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300" style={{ backgroundColor: '#E24B4A', width: `${(dist.F / maxGradeCount) * 100}%` }} />
              </div>
              <span className="w-16 text-right text-xs font-bold text-slate-700">{dist.F} students</span>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 mt-4 pt-3 text-xs text-slate-400">
            <span>Total: {currentSectionData.students} students</span>
            <span className="font-semibold text-[#185FA5]">{passingBCount}/{currentSectionData.students} passing with B or above</span>
          </div>
        </div>
      </div>

      {/* SECTION 3 - THREE EQUAL COLUMNS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* COLUMN 1 - Avg Score by Subject */}
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Avg Score by Subject</p>
            <div className="space-y-4 pt-1">
              {filteredSubjectAvgs.map((sub, i) => (
                <div key={sub.subject} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">{sub.subject}</span>
                    <span className="font-bold font-mono" style={{ color: sub.color }}>{sub.avg}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-300" 
                      style={{ backgroundColor: sub.color, width: `${sub.avg}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {lowAvgSubjects.length > 0 && selectedSubject === "All Subjects" && (
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-[11.5px] text-amber-800 mt-4 space-y-1.5">
              {lowAvgSubjects.map(s => (
                <div key={s.subject} className="flex items-start gap-1.5 leading-tight">
                  <AlertCircle size={11} className="shrink-0 mt-0.5 text-amber-600" />
                  <span>{s.subject} needs attention — lowest avg in section ({s.avg}%)</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* COLUMN 2 - Attendance Breakdown */}
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Attendance Breakdown</p>
            
            <div className="flex items-center justify-between gap-4 py-1">
              {/* Pie/Donut view */}
              <div className="relative w-[72px] h-[72px] rounded-full flex items-center justify-center shrink-0 shadow-inner" style={{
                background: `conic-gradient(#1D9E75 0% ${pStop}%, #F59E0B ${pStop}% ${lStop}%, #EF4444 ${lStop}% 100%)`
              }}>
                <div className="absolute w-[54px] h-[54px] bg-white rounded-full flex flex-col items-center justify-center shadow-sm">
                  <span className="text-sm font-black text-slate-800 leading-none">{att.present}%</span>
                  <span className="text-[7.5px] font-black uppercase tracking-wider text-slate-400 mt-0.5">present</span>
                </div>
              </div>

              {/* Legends list */}
              <div className="flex-1 space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[#1D9E75]" />
                    <span>Present</span>
                  </div>
                  <span className="font-bold text-slate-700">{att.present}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                    <span>Late</span>
                  </div>
                  <span className="font-bold text-slate-700">{att.late}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[#EF4444]" />
                    <span>Absent</span>
                  </div>
                  <span className="font-bold text-slate-700">{att.absent}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Chronic Absentees bottom strip */}
          <div className="border-t border-slate-100 pt-3 mt-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Chronic Absentees</p>
            {currentSectionData.chronicAbsentees.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-1">No chronic absentees this period</p>
            ) : (
              <div className="space-y-2 max-h-[100px] overflow-y-auto pr-1">
                {currentSectionData.chronicAbsentees.map((abs, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-slate-50/50 p-1.5 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-blue-50 text-blue-800 rounded-full flex items-center justify-center text-[10px] font-black shrink-0">
                        {abs.initials}
                      </div>
                      <span className="text-xs font-semibold text-slate-700 truncate max-w-[120px]">{abs.name}</span>
                    </div>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                      abs.rate < 70 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {abs.rate}% Rate
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 3 - Submission Health + Parent Engagement */}
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Submission Health</p>
            
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-emerald-50 text-emerald-800 rounded-lg p-3 text-center">
                <span className="text-xl font-mono font-bold block">{currentSectionData.submissions.submitted}</span>
                <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600 block mt-1">Submitted</span>
              </div>
              <div className="bg-amber-50 text-amber-800 rounded-lg p-3 text-center">
                <span className="text-xl font-mono font-bold block">{currentSectionData.submissions.late}</span>
                <span className="text-[8px] font-black uppercase tracking-widest text-amber-600 block mt-1">Late</span>
              </div>
              <div className="bg-red-50 text-red-800 rounded-lg p-3 text-center">
                <span className="text-xl font-mono font-bold block">{currentSectionData.submissions.missing}</span>
                <span className="text-[8px] font-black uppercase tracking-widest text-red-600 block mt-1">Missing</span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 mt-4 pt-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Parent Engagement</p>
            
            <div className="space-y-2">
              {/* High */}
              <div>
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Highly Engaged</span>
                  <span className="font-bold text-slate-700">{currentSectionData.parentEngagement.high} parents</span>
                </div>
                <div className="h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${(currentSectionData.parentEngagement.high / (parentTotal || 1)) * 100}%` }} />
                </div>
              </div>

              {/* Moderate */}
              <div>
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Moderate Engagement</span>
                  <span className="font-bold text-slate-700">{currentSectionData.parentEngagement.moderate} parents</span>
                </div>
                <div className="h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-blue-400 rounded-full" style={{ width: `${(currentSectionData.parentEngagement.moderate / (parentTotal || 1)) * 100}%` }} />
                </div>
              </div>

              {/* Low */}
              <div>
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Low / No Response</span>
                  <span className="font-bold text-slate-700">{currentSectionData.parentEngagement.low} parents</span>
                </div>
                <div className="h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-red-300 rounded-full" style={{ width: `${(currentSectionData.parentEngagement.low / (parentTotal || 1)) * 100}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4 - ACTIVITY PERFORMANCE TABLE */}
      <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm space-y-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Activity Performance — Section Averages</p>
        
        <div className="overflow-x-auto rounded-lg border border-slate-100">
          <table className="min-w-full divide-y divide-slate-100 text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <tr>
                <th className="px-4 py-3">Activity</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Avg %</th>
                <th className="px-4 py-3">Avg Score</th>
                <th className="px-4 py-3">Grade</th>
                <th className="px-4 py-3">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredActivities.map((act, index) => (
                <tr key={index} className="hover:bg-slate-50 transition duration-150">
                  <td className="px-4 py-3 font-semibold text-slate-800">{act.title}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${getTypeBadgeClass(act.type)}`}>
                      {act.type}
                    </span>
                  </td>
                  <td className={`px-4 py-3 ${getAvgPctClass(act.avgPct)}`}>
                    {act.avgPct}%
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{act.avgScore}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-0.5 rounded text-[9px] font-black uppercase ${getGradeBadgeClass(act.grade)}`}>
                      Grade {act.grade}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 font-medium">
                    {act.submitted} / {act.total} ({Math.round((act.submitted / act.total) * 100)}%)
                  </td>
                </tr>
              ))}

              {filteredActivities.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">
                    No activity entries found matching the subject filter.
                  </td>
                </tr>
              )}
            </tbody>
            {filteredActivities.length > 0 && (
              <tfoot className="bg-slate-50 text-xs font-bold text-slate-700 border-t border-slate-100">
                <tr>
                  <td className="px-4 py-3.5 text-slate-500">Section Average</td>
                  <td className="px-4 py-3.5"></td>
                  <td className={`px-4 py-3.5 ${getAvgPctClass(tableAverages.avgPct)}`}>
                    {tableAverages.avgPct.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3.5"></td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2.5 py-0.5 rounded text-[9px] font-black uppercase ${getGradeBadgeClass(tableAverages.grade)}`}>
                      Grade {tableAverages.grade}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 font-semibold">
                    {tableAverages.submitted} / {tableAverages.total} ({Math.round((tableAverages.submitted / (tableAverages.total || 1)) * 100)}%)
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </motion.div>
  );
};

export default React.memo(AnalyticsModule);
