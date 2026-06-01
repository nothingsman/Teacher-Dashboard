"use client";
import React, { useState, useMemo, useEffect } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { getTimetable, getAcademicCalendar } from '../services/scheduleService';
import { 
  Download, 
  Eye, 
  Printer, 
  Calendar, 
  FileText, 
  Search, 
  Clock, 
  User, 
  BookOpen, 
  Building,
  X,
  Check,
  FileSpreadsheet,
  AlertCircle,
  TrendingUp,
  ExternalLink,
  Info,
  CalendarDays,
  ArrowRight,
  Filter,
  Layers,
  Sparkles
} from 'lucide-react';

// --- Types & Interfaces (re-exported from service for backward compatibility) ---
export type { ClassSlot, CalendarEvent, DaysOfWeek } from '../services/scheduleService';
import type { ClassSlot, CalendarEvent, DaysOfWeek } from '../services/scheduleService';

// --- Master Class Periods Timeline ---
const PERIODS = [
  { id: 1, time: '08:30 AM - 09:15 AM', name: '1st Period' },
  { id: 2, time: '09:15 AM - 10:00 AM', name: '2nd Period' },
  { id: 3, time: '10:00 AM - 10:45 AM', name: '3rd Period' },
  { id: 4, time: '10:45 AM - 11:30 AM', name: '4th Period' },
  { id: 5, time: '11:45 AM - 12:30 PM', name: '5th Period' },
  { id: 6, time: '12:30 PM - 01:15 PM', name: '6th Period' },
  { id: 7, time: '02:00 PM - 02:45 PM', name: '7th Period' },
  { id: 8, time: '02:45 PM - 03:30 PM', name: '8th Period' },
];

const GRADES = ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'];
const SECTIONS = ['Sec A', 'Sec B', 'Sec C'];
const DAYS: DaysOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Helper to determine event badge color classes
const getEventTypeBadgeColor = (type: CalendarEvent['type']) => {
  switch (type) {
    case 'academic': return 'bg-blue-50 text-blue-700 border-blue-100';
    case 'exam': return 'bg-amber-50 text-amber-700 border-amber-100';
    case 'break': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    case 'community': return 'bg-purple-50 text-purple-700 border-purple-100';
    default: return 'bg-slate-50 text-slate-700 border-slate-10 border-slate-200';
  }
};

// --- Embedded Schedule PDF Mock View Component ---
interface SchedulePDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedGrade: string;
  selectedSection: string;
  initialMode?: 'weekly' | 'yearly';
}

export const SchedulePDFModal: React.FC<SchedulePDFModalProps> = ({ 
  isOpen, 
  onClose,
  selectedGrade: initialGrade,
  selectedSection: initialSection,
  initialMode = 'weekly'
}) => {
  const [activeMode, setActiveMode] = useState<'weekly' | 'yearly'>(initialMode as 'weekly' | 'yearly');
  const [downloading, setDownloading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [selectedGrade, setSelectedGrade] = useState(initialGrade || 'Grade 7');
  const [selectedSection, setSelectedSection] = useState(initialSection || 'Sec A');
  const [timetableSlots, setTimetableSlots] = useState<ClassSlot[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);

  // Sync mode state when initialMode changes and modal becomes open
  React.useEffect(() => {
    if (isOpen) {
      setActiveMode(initialMode as 'weekly' | 'yearly');
    }
  }, [isOpen, initialMode]);

  // Fetch timetable slots when grade/section change
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const slots = await getTimetable(selectedGrade, selectedSection);
        if (!cancelled) setTimetableSlots(slots);
      } catch {
        // keep existing empty state
      }
    })();
    return () => { cancelled = true; };
  }, [selectedGrade, selectedSection]);

  // Fetch academic calendar on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const events = await getAcademicCalendar();
        if (!cancelled) setCalendarEvents(events);
      } catch {
        // keep existing empty state
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Build printedRowsByDay from timetable slots for Weekly Mode
  // The service returns slots ordered by day (Mon..Fri), 8 periods each.
  const printedRowsByDay = useMemo(() => {
    const perDay: Record<DaysOfWeek, ClassSlot[]> = {} as Record<DaysOfWeek, ClassSlot[]>;
    DAYS.forEach((day, dayIdx) => {
      const daySlots = timetableSlots.slice(dayIdx * PERIODS.length, (dayIdx + 1) * PERIODS.length);
      perDay[day] = daySlots.sort((a, b) => a.period - b.period);
    });
    return perDay;
  }, [timetableSlots]);

  if (!isOpen) return null;

  const handleDownloadPDF = async () => {
    const docElement = document.getElementById('school-schedule-pdf-canvas');
    if (!docElement) return;
    
    setDownloading(true);
    setSuccessMsg('');

    // Pre-process styles to prevent html2canvas from failing on modern CSS features likes Tailwind v4 oklch() / oklab()
    const styleBackups: { 
      element: HTMLElement; 
      originalText?: string; 
      disabledState?: boolean; 
      tempStyle?: HTMLStyleElement; 
    }[] = [];

    const sanitizeCss = (cssText: string) => {
      // Replaces oklch(...), oklab(...), lch(...), lab(...), color-mix(...) and nested functions with a fallback hex/rgb color code
      return cssText.replace(/(oklch|oklab|lch|lab|color-mix)\((?:[^)(]+|\((?:[^)(]+|\([^)(]*\))*\))*\)/gi, 'rgb(30, 41, 59)');
    };
    
    try {
      const styleElements = Array.from(document.querySelectorAll<HTMLStyleElement | HTMLLinkElement>('style, link[rel="stylesheet"]'));
      
      for (const el of styleElements) {
        if (el.tagName.toLowerCase() === 'style') {
          const styleEl = el as HTMLStyleElement;
          const cssText = styleEl.innerHTML;
          if (cssText.includes('oklch') || cssText.includes('oklab')) {
            styleBackups.push({ element: styleEl, originalText: cssText });
            styleEl.innerHTML = sanitizeCss(cssText);
          }
        } else if (el.tagName.toLowerCase() === 'link') {
          const linkEl = el as HTMLLinkElement;
          try {
            if (linkEl.sheet) {
              const rules = Array.from(linkEl.sheet.cssRules);
              const hasUnsupported = rules.some(rule => {
                const text = rule.cssText;
                return text.includes('oklch') || text.includes('oklab');
              });
              if (hasUnsupported) {
                styleBackups.push({ element: linkEl, disabledState: linkEl.disabled });
                
                let fullCss = '';
                for (const rule of rules) {
                  fullCss += rule.cssText + '\n';
                }
                const cleanCss = sanitizeCss(fullCss);
                
                const tempStyle = document.createElement('style');
                tempStyle.innerHTML = cleanCss;
                document.head.appendChild(tempStyle);
                
                linkEl.disabled = true;
                styleBackups[styleBackups.length - 1].tempStyle = tempStyle;
              }
            }
          } catch (corsErr) {
            // Keep going if CORS prevents stylesheet rules inspection
          }
        }
      }

      const canvas = await html2canvas(docElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2],
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
      
      const filename = activeMode === 'weekly' 
        ? `Master_Weekly_Schedule_${selectedGrade.replace(' ', '_')}_${selectedSection.replace(' ', '_')}.pdf`
        : `Official_School_Yearly_Calendar_2026_27.pdf`;
        
      pdf.save(filename);
      setSuccessMsg(`PDF successfully generated & downloaded: ${filename}`);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      setSuccessMsg('Rendering failed. Please try again.');
    } finally {
      // Guarantee exact style restorations
      for (const backup of styleBackups) {
        if (backup.originalText !== undefined) {
          (backup.element as HTMLStyleElement).innerHTML = backup.originalText;
        }
        if (backup.disabledState !== undefined) {
          (backup.element as HTMLLinkElement).disabled = backup.disabledState;
        }
        if (backup.tempStyle) {
          try {
            backup.tempStyle.remove();
          } catch (e) {
            console.error('Failed to remove temp style:', e);
          }
        }
      }
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-[100] p-4 pt-10 overflow-y-auto">
      <div className="bg-slate-100 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh] border border-slate-200 animate-in fade-in zoom-in duration-200">
        
        {/* PDF Document Toolbar */}
        <div className="bg-slate-800 text-white px-6 py-4 rounded-t-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-600 rounded-xl text-white">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                {activeMode === 'weekly' ? 'Weekly_Timetable_Master.pdf' : 'Yearly_Academic_Calendar.pdf'}
              </h3>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Kelem Publishing Hub · Official Records Office</p>
            </div>
          </div>

          {/* Mode Switcher inside PDF viewer */}
          <div className="flex items-center bg-slate-700/60 p-1 rounded-xl border border-slate-600/50">
            <button
              onClick={() => setActiveMode('weekly')}
              className={`px-3 py-1.5 text-[10px] uppercase font-black tracking-widest rounded-lg transition-all cursor-pointer ${
                activeMode === 'weekly' 
                  ? 'bg-slate-800 text-white shadow-xs' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Weekly Grid
            </button>
            <button
              onClick={() => setActiveMode('yearly')}
              className={`px-3 py-1.5 text-[10px] uppercase font-black tracking-widest rounded-lg transition-all cursor-pointer ${
                activeMode === 'yearly' 
                  ? 'bg-slate-800 text-white shadow-xs' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Academic Year
            </button>
          </div>

          {/* Controls */}
          <div className="flex items-center self-end sm:self-auto gap-3">
            {/* Quick Filter Selection in PDF viewer - ONLY active for weekly timetable */}
            {activeMode === 'weekly' && (
              <div className="flex items-center gap-1.5 bg-slate-700/80 px-2 py-1 rounded-xl border border-slate-600">
                <select 
                  value={selectedGrade} 
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="bg-transparent text-white text-[10px] font-bold focus:outline-none uppercase tracking-tight cursor-pointer"
                >
                  {GRADES.map(g => <option key={g} value={g} className="bg-slate-800">{g}</option>)}
                </select>
                <span className="text-slate-500 font-bold">·</span>
                <select 
                  value={selectedSection} 
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="bg-transparent text-white text-[10px] font-bold focus:outline-none uppercase tracking-tight cursor-pointer"
                >
                  {SECTIONS.map(s => <option key={s} value={s} className="bg-slate-800">{s}</option>)}
                </select>
              </div>
            )}

            <button 
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 uppercase cursor-pointer"
            >
              <Printer size={13} /> Print
            </button>
            <button 
              onClick={handleDownloadPDF}
              disabled={downloading}
              className={`px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 uppercase cursor-pointer ${downloading ? 'opacity-50' : ''}`}
            >
              {downloading ? 'Processing...' : <><Download size={13} /> Download PDF</>}
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded-full transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {successMsg && (
          <div className="bg-emerald-50 border-b border-emerald-100 px-6 py-2.5 flex items-center gap-2 text-emerald-800 text-xs font-semibold uppercase tracking-wider">
            <Check size={14} className="text-emerald-500 shrink-0" />
            {successMsg}
          </div>
        )}

        {/* PDF Layout Canvas Container */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-300 flex justify-center items-start custom-scrollbar">
          
          {/* Printable Sheet */}
          <div id="school-schedule-pdf-canvas" className="bg-white w-full max-w-4xl p-8 md:p-12 shadow-md rounded-sm text-slate-800 relative select-none h-fit">
            
            {/* Watermark/Emblem Background */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
              <div className="w-[450px] h-[450px] rounded-full border-[15px] border-[#1A237E] flex items-center justify-center">
                <FileText size={200} />
              </div>
            </div>

            {/* Info Summary Panel */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-5 mb-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Document Class</p>
                <p className="text-xs font-bold text-slate-800 uppercase mt-1">
                  {activeMode === 'weekly' ? `Weekly Class Timetable` : 'Yearly Master Milestones'}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Profile Segment</p>
                <p className="text-xs font-bold text-slate-800 uppercase mt-1">
                  {activeMode === 'weekly' ? `${selectedGrade} · ${selectedSection}` : 'All Grades (6-10) Admissions'}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Seal Date Stamp</p>
                <p className="text-xs font-mono font-bold text-slate-800 mt-1">MAY 21, 2026 (00:00 UTC)</p>
              </div>
            </div>

            {/* MODE SWITCHABLE CONTENT IN PRINT LAYOUT */}
            {activeMode === 'weekly' ? (
              /* Timetable Sheet Table */
              <div className="border border-slate-200 rounded-xl overflow-x-auto mb-10 shadow-xs w-full">
                <table className="w-full border-collapse min-w-[750px]">
                  <thead>
                    <tr className="bg-[#1A237E] text-white">
                      <th className="py-3 px-4 text-center text-[10px] font-black uppercase tracking-wider border-r border-[#1A237E]/20">Period</th>
                      <th className="py-3 px-4 text-left text-[10px] font-black uppercase tracking-wider border-r border-[#1A237E]/20">Time Slot</th>
                      {DAYS.map(day => (
                        <th key={day} className="py-3 px-4 text-center text-[10px] font-black uppercase tracking-wider border-r border-[#1A237E]/20 last:border-0">
                          {day.substring(0, 3).toUpperCase()}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PERIODS.map((period, pIdx) => (
                      <tr 
                        key={period.id} 
                        className={`text-xs ${pIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} border-b border-slate-200 last:border-0`}
                      >
                        <td className="py-3.5 px-3 text-center font-mono font-black text-slate-500 border-r border-slate-200">
                          P{period.id}
                        </td>
                        <td className="py-3.5 px-3 font-mono text-[9px] text-slate-400 border-r border-slate-200">
                          {period.time}
                        </td>
                        {DAYS.map(day => {
                          const slot = printedRowsByDay[day]?.find(s => s.period === period.id);
                          return (
                            <td key={day} className="py-3 px-2 text-center border-r border-slate-200 last:border-0 leading-tight">
                              {slot ? (
                                <div className="space-y-0.5">
                                  <p className="font-extrabold text-[#1A237E] text-[10.5px] leading-tight">{slot.subject}</p>
                                  <p className="text-[8px] font-mono text-slate-400 leading-none">{slot.room}</p>
                                </div>
                              ) : (
                                <span className="text-slate-300 font-bold font-mono">---</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Yearly Academic Calendar milestones printed matrix */
              <div className="border border-slate-200 rounded-xl overflow-x-auto mb-10 shadow-xs w-full">
                <table className="w-full border-collapse text-left min-w-[750px]">
                  <thead>
                    <tr className="bg-[#1A237E] text-white text-[10px] font-bold uppercase tracking-wider">
                      <th className="py-3 px-5 border-r border-[#1A237E]/20 w-32 shrink-0">Scheduled Date</th>
                      <th className="py-3 px-5 border-r border-[#1A237E]/20 w-44 shrink-0 font-black">Event / Milestone Title</th>
                      <th className="py-3 px-5 border-r border-[#1A237E]/20 w-16 text-center">Type</th>
                      <th className="py-3 px-5">Detailed Purpose & Guidelines</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {calendarEvents.map((event, idx) => (
                      <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                        <td className="py-3.5 px-5 font-mono font-bold text-slate-600 border-r border-slate-200 whitespace-nowrap">
                          {event.date}
                        </td>
                        <td className="py-3.5 px-5 font-extrabold text-[#1A237E] border-r border-slate-200 whitespace-nowrap">
                          {event.title}
                        </td>
                        <td className="py-2.5 px-5 border-r border-slate-200 text-center">
                          <span className={`inline-block px-2.5 py-1 text-[8px] font-bold uppercase tracking-wider rounded-md border ${getEventTypeBadgeColor(event.type)}`}>
                            {event.type}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-slate-500 font-medium leading-relaxed">
                          {event.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

// Dummy physical plain-text generator mock
function dummyPDFContent(grade: string, sec: string, mode: 'weekly' | 'yearly'): string {
  if (mode === 'weekly') {
    return `%PDF-1.4\n%-- Master Weekly Class Schedule PDF Resource\nGrade Reference: ${grade} ${sec}\nAcademic Term: First Semester\nVerify Cryptographic Hash: b8f49ce1a237e_WEEKLY_MOCK\n`;
  } else {
    return `%PDF-1.4\n%-- Master Academic Yearly Calendar Events PDF Resource\nTotal Milestones: 12 hallmark milestones\nAcademic Term: Academic Year 2026/27\nVerify Cryptographic Hash: b8f49ce1a237e_YEARLY_MOCK\n`;
  }
}


// --- Main Schedule Module Component ---
const ScheduleModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'weekly' | 'yearly'>('weekly');
  const [activeDay, setActiveDay] = useState<DaysOfWeek>('Monday');
  const [selectedGrade, setSelectedGrade] = useState<string>('Grade 7');
  const [selectedSection, setSelectedSection] = useState<string>('Sec A');
  const [searchQuery, setSearchQuery] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState<'all' | CalendarEvent['type']>('all');
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  const [allTimetableSlots, setAllTimetableSlots] = useState<ClassSlot[]>([]);
  const [yearlyEvents, setYearlyEvents] = useState<CalendarEvent[]>([]);

  // Fetch timetable when grade/section change
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const slots = await getTimetable(selectedGrade, selectedSection);
        if (!cancelled) setAllTimetableSlots(slots);
      } catch {
        // keep existing empty state
      }
    })();
    return () => { cancelled = true; };
  }, [selectedGrade, selectedSection]);

  // Fetch academic calendar on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const events = await getAcademicCalendar();
        if (!cancelled) setYearlyEvents(events);
      } catch {
        // keep existing empty state
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Filter schedule slots for the active day
  const filteredSlots = useMemo(() => {
    // Slots from service are ordered Mon..Fri, 8 per day. Extract the active day's slots.
    const dayIdx = DAYS.indexOf(activeDay);
    let slots = allTimetableSlots.slice(dayIdx * PERIODS.length, (dayIdx + 1) * PERIODS.length);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      slots = slots.filter(
        s => s.subject.toLowerCase().includes(q) ||
             s.teacher.toLowerCase().includes(q) ||
             s.room.toLowerCase().includes(q)
      );
    }
    return slots.sort((a, b) => a.period - b.period);
  }, [activeDay, allTimetableSlots, searchQuery]);

  // Filter Academic Year events (Yearly Tab)
  const filteredYearlyEvents = useMemo(() => {
    let events = yearlyEvents;
    if (eventTypeFilter !== 'all') {
      events = events.filter(e => e.type === eventTypeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      events = events.filter(
        e => e.title.toLowerCase().includes(q) ||
             e.description.toLowerCase().includes(q) ||
             e.date.toLowerCase().includes(q)
      );
    }
    return events;
  }, [eventTypeFilter, searchQuery, yearlyEvents]);

  // Subject Periods count statistics
  const subjectTotals = useMemo(() => {
    const dayIdx = DAYS.indexOf(activeDay);
    const daySlots = allTimetableSlots.slice(dayIdx * PERIODS.length, (dayIdx + 1) * PERIODS.length);
    const counts: Record<string, number> = {};
    daySlots.forEach(slot => {
      counts[slot.subject] = (counts[slot.subject] || 0) + 1;
    });
    return Object.entries(counts);
  }, [activeDay, allTimetableSlots]);

  const handleOpenReport = (mode: 'weekly' | 'yearly') => {
    setActiveTab(mode);
    setIsPdfOpen(true);
  };

  return (
    <div className="flex-1 space-y-6">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">Academic Timetables & Lifecycles</h3>
          <p className="text-[10px] md:text-xs font-semibold text-slate-400 mt-1 uppercase tracking-widest">Explore, coordinate, verify and export master school schedules</p>
        </div>
        
        {/* Core Quick PDF download bar */}
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => handleOpenReport(activeTab)}
            className="px-4.5 py-3.5 bg-white border border-slate-200 text-slate-600 hover:text-slate-800 rounded-xl text-xs font-bold uppercase tracking-wider shadow-xs transition-all flex items-center gap-2 cursor-pointer hover:border-slate-300"
          >
            <Eye size={14} className="text-[#1A237E]" /> View printable PDF
          </button>
          
          <button 
            onClick={() => handleOpenReport(activeTab)}
            className="px-5 py-3.5 bg-[#1A237E] hover:bg-blue-900 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-900/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download size={14} /> Download official PDF
          </button>
        </div>
      </div>

      {/* Main Tab Controller (Standard UI/UX upgrade) */}
      <div className="flex border-b border-slate-200/80 items-center justify-between bg-white px-6 py-2 rounded-2xl shadow-xs">
        <div className="flex items-center gap-4">
          <button
            onClick={() => { setActiveTab('weekly'); setSearchQuery(''); }}
            className={`py-3.5 px-3 text-xs uppercase font-black tracking-widest border-b-2 transition-all cursor-pointer relative ${
              activeTab === 'weekly'
                ? 'border-[#1A237E] text-[#1A237E]'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <span className="flex items-center gap-2">
              <Layers size={14} /> Weekly Timetable Row
            </span>
          </button>
          <button
            onClick={() => { setActiveTab('yearly'); setSearchQuery(''); }}
            className={`py-3.5 px-3 text-xs uppercase font-black tracking-widest border-b-2 transition-all cursor-pointer relative ${
              activeTab === 'yearly'
                ? 'border-[#1A237E] text-[#1A237E]'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <span className="flex items-center gap-2">
              <CalendarDays size={14} /> Yearly Academic Calendar
            </span>
          </button>
        </div>

        <div className="hidden md:flex items-center gap-2 text-[10px] uppercase font-bold text-slate-400">
          <Sparkles size={12} className="text-[#1A237E]" />
          <span>Kelem-Co Realtime Sync</span>
        </div>
      </div>

      {/* Grid Controller Controls */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
        
        {/* Dynamic Controls depending on active tab */}
        <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
          {activeTab === 'weekly' ? (
            <div className="flex items-center bg-slate-50 p-1 rounded-xl overflow-x-auto no-scrollbar max-w-full">
              {DAYS.map((day) => (
                <button
                  key={day}
                  onClick={() => setActiveDay(day)}
                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap cursor-pointer ${
                    activeDay === day 
                      ? 'bg-[#1A237E] text-white shadow-xs' 
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center bg-slate-50 p-1 rounded-xl overflow-x-auto no-scrollbar max-w-full">
              {(['all', 'academic', 'exam', 'break', 'community'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setEventTypeFilter(type)}
                  className={`px-3.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap cursor-pointer ${
                    eventTypeFilter === type 
                      ? 'bg-[#1A237E] text-white shadow-xs' 
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {type === 'all' ? 'All events' : `${type} events`}
                </button>
              ))}
            </div>
          )}

          {/* Filtering row options */}
          <div className="flex flex-wrap items-center gap-2">
            {activeTab === 'weekly' && (
              <>
                <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl text-[10px] font-bold text-slate-500">
                  <span className="uppercase text-[9px] font-black text-slate-400">Class:</span>
                  <select 
                    value={selectedGrade} 
                    onChange={(e) => setSelectedGrade(e.target.value)}
                    className="bg-transparent text-slate-800 font-extrabold focus:outline-none uppercase tracking-tight cursor-pointer"
                  >
                    {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl text-[10px] font-bold text-slate-500">
                  <span className="uppercase text-[9px] font-black text-slate-400">Section:</span>
                  <select 
                    value={selectedSection} 
                    onChange={(e) => setSelectedSection(e.target.value)}
                    className="bg-transparent text-slate-800 font-extrabold focus:outline-none uppercase tracking-tight cursor-pointer"
                  >
                    {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Unified Search Input bar */}
        <div className="relative group">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-[#1A237E] transition-colors">
            <Search size={15} />
          </span>
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'weekly' 
                ? "FILTER WEEKLY SCHEDULE BY SUBJECT CARDS, CLASSROOM CODES, OR TEACHERS..."
                : "SEARCH YEARLY CALENDAR BY KEYWORD, TARGET MONTHS, OR EVENT TYPE STATE..."
            }
            className="w-full bg-slate-50 border-0 rounded-xl pl-12 pr-6 py-3.5 text-[10px] font-black uppercase tracking-wider outline-none focus:bg-white focus:ring-2 focus:ring-[#1A237E]/10 border border-transparent focus:border-[#1A237E]/20 transition-all text-slate-700 placeholder-slate-400"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-full transition-all cursor-pointer text-slate-400"
            >
              <X size={14} />
            </button>
          )}
        </div>

      </div>

      {/* Main Container switchable grid split layout */}
      {activeTab === 'weekly' ? (
        <div className="grid grid-cols-1 lg:grid-cols-[2.5fr,1fr] gap-6 items-start">
          {/* Timetable schedule grid layout text output */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/10">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#1A237E] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#1A237E] animate-pulse" />
                TIMETABLE GRID: {selectedGrade.toUpperCase()} · {selectedSection} · {activeDay.toUpperCase()}
              </span>
              <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">{filteredSlots.length} Slots Programmed</span>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredSlots.length > 0 ? (
                filteredSlots.map((slot) => (
                  <div key={slot.period} className="p-5 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/30 transition-colors">
                    <div className="flex items-center gap-4">
                      {/* Period Square Box wrapper */}
                      <div className="w-12 h-12 rounded-xl bg-slate-50 hover:bg-[#1A237E]/5 border border-slate-200/50 flex flex-col items-center justify-center shrink-0">
                        <span className="text-[8px] font-black text-slate-400 leading-none">PER</span>
                        <span className="text-base font-mono font-black text-slate-700 leading-tight">{slot.period}</span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">{slot.subject}</h4>
                          <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[8px] font-black uppercase tracking-wider border border-indigo-100/50">{slot.room}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-slate-500">
                          <span className="text-[10px] font-bold uppercase tracking-tight flex items-center gap-1 text-slate-500">
                            <User size={11} className="text-slate-400 shrink-0" /> {slot.teacher}
                          </span>
                          <span className="text-slate-200 text-xs hidden sm:inline">|</span>
                          <span className="text-[10px] font-mono font-bold flex items-center gap-1 leading-none text-slate-400">
                            <Clock size={11} className="text-slate-400 shrink-0" /> {slot.time}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button className="px-4 py-2 hover:bg-[#1A237E]/5 text-slate-500 hover:text-[#1A237E] text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-slate-200 hover:border-transparent cursor-pointer bg-white">
                        Class list
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-16 text-center text-slate-400">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
                    <Search size={20} />
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest">No matching activities found</p>
                  <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">Try relaxing filters or search arguments</p>
                </div>
              )}
            </div>
          </div>

          {/* Statistics sidebar panel */}
          <div className="space-y-6">
            
            {/* Warning diagnostic label */}
            <div className="p-5 bg-[#1A237E]/5 border border-[#1A237E]/10 rounded-2xl">
              <h4 className="text-[10px] font-black uppercase tracking-wide text-[#1A237E] mb-1.5 flex items-center gap-1.5">
                <Info size={14} className="shrink-0" /> Academic Notice
              </h4>
              <p className="text-[11px] font-bold leading-relaxed text-slate-600 uppercase tracking-tight">
                Classroom, teacher and schedule shifts are automated. Schedule revisions are restricted and stamp-authorized.
              </p>
            </div>

            {/* Class counts density weights bar graph list */}
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-4 tracking-widest">PERIOD WEIGHT DISTRIBUTION</h4>
              
              <div className="space-y-4">
                {subjectTotals.map(([subject, count]) => {
                  const totalPeriods = 8;
                  const percent = (count / totalPeriods) * 100;
                  return (
                    <div key={subject}>
                      <div className="flex justify-between items-center text-[10px] font-black text-slate-700 uppercase tracking-tight mb-1">
                        <span>{subject}</span>
                        <span className="font-mono text-slate-400">{count} Class{count > 1 ? 'es' : ''} ({Math.round(percent)}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-[#1A237E] h-full rounded-full transition-all duration-500" 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {subjectTotals.length === 0 && (
                  <p className="text-[10px] font-bold uppercase text-slate-400 text-center tracking-widest py-4">No stats compiled</p>
                )}
              </div>
            </div>

          </div>
        </div>
      ) : (
        /* Academic Yearly Calendar timeline view (UX Polished) */
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden p-6 md:p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-slate-150">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#1A237E]">LANDMARK MILESTONE REGISTRY</span>
              <h4 className="text-base font-black text-slate-800 uppercase tracking-wide mt-1">2026 - 2027 Year Operational Flow</h4>
            </div>
            
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500 font-semibold bg-slate-50 px-3.5 py-1.5 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>{filteredYearlyEvents.length} KEY MARKERS SELECTED</span>
            </div>
          </div>

          {/* Timeline Track Node List */}
          <div className="relative border-l-2 border-slate-100 pl-6 ml-4 space-y-8 py-2">
            {filteredYearlyEvents.length > 0 ? (
              filteredYearlyEvents.map((event, eventIdx) => (
                <div key={eventIdx} className="relative group">
                  {/* Outer Timeline Dot */}
                  <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 bg-white transition-all group-hover:scale-125 z-10 ${
                    event.holiday ? 'border-emerald-500 ring-4 ring-emerald-50' : 'border-[#1A237E] ring-4 ring-blue-50'
                  }`} />

                  {/* Timeline Entry Card */}
                  <div className="bg-slate-50/50 hover:bg-slate-50 border border-slate-150 rounded-xl p-5 hover:border-slate-300 shadow-tiny hover:shadow-xs transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[10px] font-black text-slate-500 uppercase tracking-wide bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-tiny">
                          {event.date}
                        </span>
                        
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${getEventTypeBadgeColor(event.type)}`}>
                          {event.type}
                        </span>
                      </div>

                      {event.holiday && (
                        <span className="text-[8px] font-black tracking-widest text-emerald-600 uppercase bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded ml-auto sm:ml-0">
                          Recess / Holiday
                        </span>
                      )}
                    </div>

                    <h5 className="text-sm font-black text-slate-800 uppercase tracking-wide">{event.title}</h5>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1 text-slate-600">{event.description}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-16 text-center text-slate-400">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
                  <CalendarDays size={20} />
                </div>
                <p className="text-xs font-black uppercase tracking-widest">No matching milestones recorded</p>
                <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">Try modifying your search or registry argument</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Embedded PDF Modal rendering portal */}
      <SchedulePDFModal 
        isOpen={isPdfOpen} 
        onClose={() => setIsPdfOpen(false)} 
        selectedGrade={selectedGrade}
        selectedSection={selectedSection}
        initialMode={activeTab}
      />

    </div>
  );
};

// --- Overview Right Sidebar Widget (Highly Polished & Feature Rich UI/UX Upgrade) ---
interface OverviewScheduleWidgetProps {
  onOpenSchedule: () => void;
  currentGrade?: string;
  currentSection?: string;
}

export const OverviewScheduleWidget: React.FC<OverviewScheduleWidgetProps> = ({ 
  onOpenSchedule,
  currentGrade = 'Grade 7',
  currentSection = 'Sec A'
}) => {
  const [modalMode, setModalMode] = useState<'weekly' | 'yearly'>('weekly');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleLaunchModal = (mode: 'weekly' | 'yearly') => {
    setModalMode(mode);
    setIsModalOpen(true);
  };

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
      {/* Widget Header bar */}
      <div className="p-3 sm:p-5 border-b border-slate-50 flex items-center justify-between bg-slate-50/20">
        <h3 className="text-[10px] sm:text-xs font-black text-slate-700 tracking-wider uppercase flex items-center gap-2">
          <Calendar size={14} className="text-[#1A237E] shrink-0" /> Kelem Master Calendars
        </h3>
        <span className="text-[8px] font-black uppercase tracking-widest bg-slate-100/80 text-slate-500 border border-slate-150 px-2 py-0.5 rounded-sm">
          A.Y. 2026/27
        </span>
      </div>

      <div className="p-3 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5 flex-1">
        
        {/* Sub-Section 1: Class Timetable Grid item cell */}
        <div className="group border border-slate-100 bg-slate-50/30 hover:bg-slate-50 rounded-xl p-4 transition-all relative">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-[#1A237E]/5 text-[#1A237E] rounded-lg border border-[#1A237E]/10 flex items-center justify-center shrink-0">
              <FileSpreadsheet size={18} />
            </div>
            <div className="min-w-0">
              <span className="text-[8px] font-black uppercase tracking-widest text-[#1A237E] bg-blue-50/50 border border-blue-100 px-1.5 py-0.5 rounded">
                Weekly Timetable Grid
              </span>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-tight mt-1.5 leading-none">Class Schedule Rows</h4>
              <p className="text-[11px] font-medium text-slate-400 mt-1 uppercase tracking-tight">Active block rosters for {currentGrade} · {currentSection}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mt-4.5 pt-3 border-t border-slate-100/80">
            <button 
              onClick={() => handleLaunchModal('weekly')}
              className="px-2.5 py-2 hover:bg-white border border-slate-200 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 cursor-pointer bg-transparent transition-all"
            >
              <Eye size={11} className="text-slate-400" /> View Grid
            </button>
            <button 
              onClick={() => handleLaunchModal('weekly')}
              className="px-2.5 py-2 bg-[#1A237E] hover:bg-blue-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 cursor-pointer shadow-tiny transition-all"
            >
              <Download size={11} /> Download PDF
            </button>
          </div>
        </div>

        {/* Sub-Section 2: Academic Calendar Year milestone cell */}
        <div className="group border border-slate-100 bg-slate-50/30 hover:bg-slate-50 rounded-xl p-4 transition-all relative">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100 flex items-center justify-center shrink-0">
              <CalendarDays size={18} />
            </div>
            <div className="min-w-0">
              <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50/30 border border-emerald-100 px-1.5 py-0.5 rounded">
                Yearly Operations
              </span>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-tight mt-1.5 leading-none font-black">Academic Yearly Calendar</h4>
              <p className="text-[11px] font-medium text-slate-400 mt-1 uppercase tracking-tight">All 12 scheduled master landmarks & exams</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mt-4.5 pt-3 border-t border-slate-100/80">
            <button 
              onClick={() => handleLaunchModal('yearly')}
              className="px-2.5 py-2 hover:bg-white border border-slate-200 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 cursor-pointer bg-transparent transition-all"
            >
              <Eye size={11} className="text-slate-400" /> Open Timeline
            </button>
            <button 
              onClick={() => handleLaunchModal('yearly')}
              className="px-2.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 cursor-pointer shadow-tiny transition-all"
            >
              <Download size={11} /> Download PDF
            </button>
          </div>
        </div>

      </div>
      
      {/* PDF Mock Dialog Portal */}
      <SchedulePDFModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        selectedGrade={currentGrade} 
        selectedSection={currentSection} 
        initialMode={modalMode}
      />
    </div>
  );
};

export default ScheduleModule;
