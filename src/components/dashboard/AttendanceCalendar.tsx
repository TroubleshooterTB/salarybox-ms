import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import useStore from '../../store';
import { ArrowLeft, ChevronDown, Loader2, ChevronLeft, ChevronRight, Clock, MapPin, X, FileText, Edit2, MessageSquare, Send, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AttendanceCalendar({ onBack, userId, userName, onRegularize }: { 
  onBack: () => void, 
  userId?: string, 
  userName?: string,
  onRegularize?: (date: string) => void
}) {
  const { session, userRole } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPunch, setEditingPunch] = useState<any>(null);
  const [selectedDayData, setSelectedDayData] = useState<{ day: number; punches: any[] } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reason, setReason] = useState('');
  const [dayNotes, setDayNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [isNoteLoading, setIsNoteLoading] = useState(false);

  const [isAddingManualPunch, setIsAddingManualPunch] = useState(false);
  const [manualPunchType, setManualPunchType] = useState<'In' | 'Out'>('In');
  const [manualPunchTime, setManualPunchTime] = useState('09:00');
  const [manualPunchStatus, setManualPunchStatus] = useState('Present');

  const isEmployee = userRole === 'Employee' || userRole === null;
  const targetUserId = userId || session?.user?.id;

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  useEffect(() => {
    async function fetchAttendance() {
      if (!targetUserId) return;
      setLoading(true);
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59).toISOString();

      const { data } = await supabase
          .from('attendance')
          .select('*')
          .eq('user_id', targetUserId)
          .gte('timestamp', startOfMonth)
          .lte('timestamp', endOfMonth)
          .order('timestamp', { ascending: true });

      if (data) setAttendance(data);
      setLoading(false);
    }
    fetchAttendance();
  }, [session, currentDate, targetUserId]);

  const fetchDayNotes = async (day: number) => {
    if (!targetUserId || !session?.access_token) return;
    setIsNoteLoading(true);
    try {
      const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toISOString().split('T')[0];
      const res = await fetch(`/api/date-note?userId=${targetUserId}&date=${dateStr}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const data = await res.json();
      setDayNotes(data.notes || []);
    } catch (err) {
      console.error('Failed to fetch notes:', err);
    } finally {
      setIsNoteLoading(false);
    }
  };

  const handleSaveNote = async (day: number) => {
    if (!newNote.trim()) return;
    setIsNoteLoading(true);
    try {
      const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toISOString().split('T')[0];
      const res = await fetch('/api/date-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: session?.access_token,
          userId: targetUserId,
          date: dateStr,
          note: newNote
        })
      });
      if (!res.ok) throw new Error('Failed to save note');
      setNewNote('');
      fetchDayNotes(day);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsNoteLoading(false);
    }
  };

  const changeMonth = (delta: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1));
  };

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const padding = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const handleOverride = async () => {
    if (!reason) return alert('Reason for change is required');
    if (!window.confirm('Are you sure you want to override this attendance record?')) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/attendance-override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: session?.access_token,
          attendanceId: editingPunch.id,
          newStatus: editingPunch.status,
          newTimestamp: editingPunch.timestamp,
          reason
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert('Override successful!');
      setEditingPunch(null);
      setReason('');
      setCurrentDate(new Date(currentDate));
    } catch (err: any) {
      alert('Override failed: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddManualPunch = async () => {
    if (!manualPunchTime || !reason) return alert('Time and reason are required');
    if (!selectedDayData) return;

    setIsSubmitting(true);
    try {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDayData.day);
      // Format as ISO string but with local time
      const dateStr = date.toISOString().split('T')[0];
      const timestamp = `${dateStr}T${manualPunchTime}:00`;

      const res = await fetch('/api/admin-add-punch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: session?.access_token,
          userId: targetUserId,
          type: manualPunchType,
          timestamp,
          status: manualPunchStatus,
          reason
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert('Manual punch added successfully!');
      setIsAddingManualPunch(false);
      setReason('');
      setSelectedDayData(null);
      setCurrentDate(new Date(currentDate)); // Trigger refresh
    } catch (err: any) {
      alert('Failed to add punch: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDayData = (day: number) => {
    const dayPunches = attendance.filter(a => new Date(a.timestamp).getDate() === day);
    if (dayPunches.length === 0) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      if (date.getDay() === 0) return { status: 'Week Off' };
      return null;
    }
    const lastPunch = dayPunches.at(-1);
    return { status: lastPunch?.status, raw: dayPunches };
  };

  const getStats = () => {
    const stats = { present: 0, absent: 0, halfDay: 0, paidLeave: 0, weekOff: 0 };
    for (let d = 1; d <= daysInMonth; d++) {
      const data = getDayData(d);
      if (data?.status === 'Present' || data?.status === 'Late') stats.present++;
      else if (data?.status === 'Absent') stats.absent++;
      else if (data?.status === 'Half Day') stats.halfDay++;
      else if (data?.status === 'Paid Leave') stats.paidLeave++;
      else if (data?.status === 'Week Off') stats.weekOff++;
    }
    return stats;
  };

  const stats = getStats();
  const monthLabel = currentDate.toLocaleString('default', { month: 'short', year: 'numeric' });

  const statusMap: any = {
    'Present': { color: 'bg-[#22c55e]', text: 'text-white' },
    'Late': { color: 'bg-[#22c55e]', text: 'text-white', badge: 'LATE' },
    'Absent': { color: 'bg-[#ef4444]', text: 'text-white' },
    'Half Day': { color: 'bg-[#f59e0b]', text: 'text-white' },
    'Paid Leave': { color: 'bg-[#a855f7]', text: 'text-white' },
    'Week Off': { color: 'bg-[#94a3b8]', text: 'text-white' },
    'Holiday': { color: 'bg-[#64748b]', text: 'text-white' }
  };

  const formatTime = (ts: string) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formatDate = (day: number) => new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    .toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

  // Compute duration between In and Out pairs
  const getDuration = (punches: any[]) => {
    const inPunch = punches.find(p => p.type === 'In');
    const outPunch = punches.find(p => p.type === 'Out');
    if (!inPunch || !outPunch) return null;
    const mins = Math.floor((new Date(outPunch.timestamp).getTime() - new Date(inPunch.timestamp).getTime()) / 60000);
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen bg-white text-slate-900 flex flex-col font-sans"
    >
      {/* Header */}
      <div className="px-4 py-4 flex items-center bg-white sticky top-0 z-20">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-800 hover:bg-slate-100 rounded-full transition">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1 text-center mr-8">
            <h2 className="text-lg font-bold">Attendance</h2>
            {userName && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest -mt-1">{userName}</p>}
        </div>
      </div>

      <div className="px-4 py-2 bg-[#fffcf0] border-y border-[#fff5d6] flex items-center justify-between">
         <span className="text-xs font-bold text-[#b49842]">Attendance for:</span>
         <div className="flex items-center space-x-1">
            <button onClick={() => changeMonth(-1)} className="p-1 text-slate-400 hover:text-slate-600">
               <ChevronLeft className="w-4 h-4" />
            </button>
            <button className="bg-white border border-slate-200 px-3 py-1.5 rounded-full flex items-center space-x-2 shadow-sm">
                <span className="text-xs font-bold text-slate-700">{monthLabel}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            <button onClick={() => changeMonth(1)} className="p-1 text-slate-400 hover:text-slate-600">
               <ChevronRight className="w-4 h-4" />
            </button>
         </div>
      </div>

      <div className="p-4 flex-1">
        {/* Summary Bar */}
        <div className="grid grid-cols-5 bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden mb-8">
           <StatBox label="Present" count={stats.present} border="border-l-4 border-l-[#22c55e] bg-[#f0fdf4]" />
           <StatBox label="Absent" count={stats.absent} border="border-l-4 border-l-[#ef4444] bg-[#fef2f2]" />
           <StatBox label="Half day" count={stats.halfDay} border="border-l-4 border-l-[#f59e0b] bg-[#fffbeb]" />
           <StatBox label="Paid Leave" count={stats.paidLeave.toFixed(1)} border="border-l-4 border-l-[#a855f7] bg-[#faf5ff]" />
           <StatBox label="Week Off" count={stats.weekOff} border="border-l-4 border-l-[#94a3b8] bg-[#f8fafc]" />
        </div>

        {/* Employee help text */}
        {isEmployee && (
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center mb-4">
            Tap a date to view details
          </p>
        )}

        {/* Days Header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-center text-[11px] font-bold text-slate-400 py-2">{d}</div>
          ))}
        </div>

        {loading ? (
             <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-2" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Syncing Records...</p>
             </div>
        ) : (
            <div className="grid grid-cols-7 gap-2">
            {padding.map(i => <div key={`p-${i}`} className="aspect-square" />)}
            {days.map(day => {
              const data = getDayData(day);
              const config = data ? statusMap[data.status] : null;
              const hasPunches = (data?.raw?.length ?? 0) > 0;

              return (
                <div 
                  key={day}
                  // Unified Click Handler: Opens detail sheet for everyone
                  onClick={() => {
                    const data = getDayData(day);
                    setSelectedDayData({ day, punches: data?.raw ?? [] });
                    fetchDayNotes(day);
                  }}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center relative transition-transform active:scale-95 cursor-pointer ${
                    config ? config.color : 'bg-slate-100'
                  } ${hasPunches ? 'ring-2 ring-offset-1 ring-white/30 shadow-md shadow-slate-200' : ''}`}
                >
                  <span className={`text-sm font-bold ${config ? config.text : 'text-slate-400'}`}>
                    {day < 10 ? `0${day}` : day}
                  </span>
                  {config?.badge && (
                    <span className="absolute bottom-1.5 text-[6px] font-black uppercase text-white/90 tracking-tighter">
                      {config.badge}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Employee Day Detail Bottom Sheet ── */}
        <AnimatePresence>
          {selectedDayData && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-end md:items-center justify-center"
              onClick={() => setSelectedDayData(null)}
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-t-[2.5rem] w-full max-w-lg mx-auto p-6 pb-10 shadow-2xl"
              >
                {/* Sheet Handle */}
                <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-6" />

                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">{formatDate(selectedDayData.day)}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                      {selectedDayData.punches.length} punch record{selectedDayData.punches.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button onClick={() => setSelectedDayData(null)} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                    <X className="w-4 h-4 text-slate-500" />
                  </button>
                </div>

                {/* Duration badge */}
                {getDuration(selectedDayData.punches) && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3 flex items-center space-x-3 mb-5">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Total Duration</p>
                      <p className="text-base font-black text-emerald-700">{getDuration(selectedDayData.punches)}</p>
                    </div>
                  </div>
                )}

                {/* Punch Timeline */}
                <div className="space-y-3 mb-6">
                  {selectedDayData.punches.length === 0 ? (
                    <div className="py-8 text-center bg-slate-50 border border-slate-100 rounded-2xl">
                       <Clock className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No Punches for this date</p>
                    </div>
                  ) : selectedDayData.punches.map((p, i) => (
                    <div key={p.id || i} className={`flex items-start space-x-4 p-4 rounded-2xl border relative ${
                      p.type === 'In' 
                        ? 'bg-emerald-50 border-emerald-100' 
                        : 'bg-rose-50 border-rose-100'
                    }`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                        p.type === 'In' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                      }`}>
                        {p.type === 'In' ? 'IN' : 'OUT'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-black text-slate-900">{formatTime(p.timestamp)}</p>
                        {p.address_string ? (
                          <div className="flex items-start space-x-1 mt-1">
                            <MapPin className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
                            <p className="text-[10px] font-medium text-slate-500 leading-tight truncate">{p.address_string}</p>
                          </div>
                        ) : p.latitude ? (
                          <div className="flex items-center space-x-1 mt-1">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <p className="text-[10px] font-medium text-slate-500">{p.latitude?.toFixed(4)}, {p.longitude?.toFixed(4)}</p>
                          </div>
                        ) : null}
                        <span className={`inline-block mt-1.5 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                          p.status === 'Present' ? 'bg-emerald-100 text-emerald-700' 
                          : p.status === 'Half Day' ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-600'
                        }`}>{p.status}</span>
                      </div>
                      
                      {/* Admin Controls */}
                      {!isEmployee && (
                        <button 
                          onClick={() => setEditingPunch(p)}
                          className="absolute top-4 right-4 p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-brand-500 hover:border-brand-200 transition shadow-sm"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}

                      {p.selfie_url && (
                        <a href={p.selfie_url} target="_blank" rel="noreferrer" className="shrink-0 ml-2">
                          <img src={p.selfie_url} alt="Selfie" className="w-12 h-12 rounded-xl object-cover border-2 border-white shadow" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>

                {/* Date Notes Section */}
                <div className="mb-6">
                   <div className="flex items-center justify-between mb-3 px-1">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Activity Notes</h4>
                      <MessageSquare className="w-3 h-3 text-slate-300" />
                   </div>
                   
                   <div className="space-y-3 mb-4 max-h-[150px] overflow-y-auto custom-scrollbar">
                      {isNoteLoading && dayNotes.length === 0 ? (
                        <div className="py-4 flex items-center justify-center">
                           <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
                        </div>
                      ) : dayNotes.length === 0 ? (
                        <p className="text-[10px] text-slate-400 font-bold italic text-center py-2">No notes added for this date yet.</p>
                      ) : dayNotes.map((note) => (
                        <div key={note.id} className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                           <div className="flex justify-between items-start mb-1">
                              <span className="text-[9px] font-black text-brand-500 uppercase">{note.author?.full_name || 'System'}</span>
                              <span className="text-[8px] font-bold text-slate-400">{new Date(note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                           </div>
                           <p className="text-xs font-bold text-slate-700 leading-relaxed">{note.note}</p>
                        </div>
                      ))}
                   </div>

                   <div className="relative">
                      <input 
                        type="text"
                        placeholder="Add a remark or explanation..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSaveNote(selectedDayData.day)}
                        disabled={isNoteLoading}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-4 pr-12 py-3.5 text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:border-brand-300 focus:ring-4 focus:ring-brand-500/5 outline-none transition"
                      />
                      <button 
                        onClick={() => handleSaveNote(selectedDayData.day)}
                        className="absolute right-2 top-2 w-9 h-9 bg-brand-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20 active:scale-95 transition"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                   </div>
                </div>

                {/* Action Button: Regularization for staff, Manual Add for Admin */}
                {isEmployee ? (
                  <button
                    onClick={() => {
                      setSelectedDayData(null);
                      const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDayData.day)
                        .toISOString().split('T')[0];
                      if (onRegularize) onRegularize(dateStr);
                    }}
                    className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl flex items-center justify-center space-x-3 active:scale-[0.98] transition text-xs uppercase tracking-widest"
                  >
                    <FileText className="w-4 h-4" />
                    <span>File Regularization Request</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setIsAddingManualPunch(true)}
                    className="w-full py-4 bg-brand-500 text-white font-black rounded-2xl flex items-center justify-center space-x-3 active:scale-[0.98] transition text-xs uppercase tracking-widest shadow-lg shadow-brand-500/20"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Manual Punch Record</span>
                  </button>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Admin Add Manual Punch Modal ── */}
        {isAddingManualPunch && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                <div className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in duration-200">
                    <div className="p-8 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Add Manual Punch</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{formatDate(selectedDayData!.day)}</p>
                        </div>
                        <button onClick={() => setIsAddingManualPunch(false)} className="w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="p-8 space-y-5">
                        <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                            <button 
                                onClick={() => setManualPunchType('In')}
                                className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition ${manualPunchType === 'In' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Punch IN
                            </button>
                            <button 
                                onClick={() => setManualPunchType('Out')}
                                className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition ${manualPunchType === 'Out' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Punch OUT
                            </button>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Time</label>
                            <input 
                                type="time" 
                                value={manualPunchTime}
                                onChange={(e) => setManualPunchTime(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:border-brand-300 focus:ring-4 focus:ring-brand-500/5 outline-none transition" 
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Attendance Status</label>
                            <select 
                                value={manualPunchStatus} 
                                onChange={(e) => setManualPunchStatus(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:border-brand-300 focus:ring-4 focus:ring-brand-500/5 outline-none transition appearance-none"
                            >
                                <option value="Present">Present</option>
                                <option value="Late">Late</option>
                                <option value="Half Day">Half Day</option>
                                <option value="Paid Leave">Paid Leave</option>
                                <option value="Holiday">Holiday</option>
                                <option value="Week Off">Week Off</option>
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Reason for Manual Entry</label>
                            <textarea 
                                required
                                value={reason} 
                                onChange={(e) => setReason(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 h-28 focus:border-brand-300 focus:ring-4 focus:ring-brand-500/5 outline-none transition resize-none"
                                placeholder="e.g. Employee forgot to punch out due to client meeting"
                            />
                        </div>

                        <div className="flex space-x-3 pt-2">
                            <button onClick={() => setIsAddingManualPunch(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition">Cancel</button>
                            <button onClick={handleAddManualPunch} disabled={isSubmitting} className="flex-2 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition disabled:opacity-50 shadow-xl shadow-slate-900/20 active:scale-95">
                                {isSubmitting ? 'Adding...' : 'Confirm Entry'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* ── Admin Override Modal ── */}
        {editingPunch && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in duration-200">
                    <div className="p-6 border-b border-slate-100 bg-slate-50">
                        <h3 className="text-lg font-bold text-slate-800">Attendance Override</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Editing record for {new Date(editingPunch.timestamp).toLocaleDateString()}</p>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Time Override</label>
                            <input 
                                type="datetime-local" 
                                value={new Date(new Date(editingPunch.timestamp).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)} 
                                onChange={(e) => setEditingPunch({ ...editingPunch, timestamp: new Date(e.target.value).toISOString() })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700" 
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">New Status</label>
                            <select 
                                value={editingPunch.status} 
                                onChange={(e) => setEditingPunch({ ...editingPunch, status: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700"
                            >
                                <option value="Present">Present</option>
                                <option value="Absent">Absent</option>
                                <option value="Half Day">Half Day</option>
                                <option value="Late">Late</option>
                                <option value="Paid Leave">Paid Leave</option>
                                <option value="Holiday">Holiday</option>
                                <option value="Week Off">Week Off</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reason for Change</label>
                            <textarea 
                                required
                                value={reason} 
                                onChange={(e) => setReason(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 h-24"
                                placeholder="e.g. Employee forgot to punch out due to system outage"
                            />
                        </div>
                        <div className="flex space-x-2 pt-2">
                            <button onClick={() => setEditingPunch(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition">Cancel</button>
                            <button onClick={handleOverride} disabled={isSubmitting} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition disabled:opacity-50">
                                {isSubmitting ? 'Saving...' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>
    </motion.div>
  );
}

function StatBox({ label, count, border }: { label: string, count: any, border: string }) {
  return (
    <div className={`flex flex-col items-center justify-center py-3 ${border}`}>
      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tight mb-1">{label}</span>
      <span className="text-sm font-black text-slate-800">{count}</span>
    </div>
  );
}
