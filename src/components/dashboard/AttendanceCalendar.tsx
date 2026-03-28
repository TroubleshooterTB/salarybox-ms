import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import useStore from '../../store';
import { ArrowLeft, ChevronDown, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AttendanceCalendar({ onBack, userId, userName }: { onBack: () => void, userId?: string, userName?: string }) {
  const { session } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
  }, [session, currentDate]);

  const changeMonth = (delta: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1));
  };

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const padding = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const getDayData = (day: number) => {
    const dayPunches = attendance.filter(a => new Date(a.timestamp).getDate() === day);
    if (dayPunches.length === 0) {
      // Check if it's a weekend (Sunday = 0)
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
              
              return (
                <div 
                  key={day} 
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center relative transition-transform active:scale-95 ${
                    config ? config.color : 'bg-slate-100'
                  }`}
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
