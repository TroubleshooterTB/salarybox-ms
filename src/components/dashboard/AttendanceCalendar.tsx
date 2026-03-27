import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import useStore from '../../store';
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, Info } from 'lucide-react';

export default function AttendanceCalendar({ onBack }: { onBack: () => void }) {
  const { session } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  useEffect(() => {
    async function fetchAttendance() {
      if (!session) return;
      setLoading(true);
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59).toISOString();

      const { data } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', session.user.id)
        .gte('timestamp', startOfMonth)
        .lte('timestamp', endOfMonth)
        .order('timestamp', { ascending: true });

      if (data) setAttendance(data);
      setLoading(false);
    }
    fetchAttendance();
  }, [session, currentDate]);

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const prevMonthPadding = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const getDayStatus = (day: number) => {
    const dayPunches = attendance.filter(a => new Date(a.timestamp).getDate() === day);
    if (dayPunches.length === 0) return null;
    
    // Logic: find a punch with a status, prioritize the last one
    const lastPunch = dayPunches.at(-1);
    return lastPunch?.status;
  };

  const statusColors: any = {
    'Present': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    'Absent': 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    'Half Day': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    'Paid Leave': 'bg-brand-500/20 text-brand-400 border-brand-500/30',
    'Late': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    'Holiday': 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    'Week Off': 'bg-slate-700/30 text-slate-500 border-slate-700/50'
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 max-w-md mx-auto relative flex flex-col">
      <div className="flex items-center justify-between mb-8 pt-4">
        <div className="flex items-center">
          <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-xl font-bold ml-2 tracking-tight">Attendance History</h2>
        </div>
      </div>

      {/* Month Carousel */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl mb-6 flex items-center justify-between shadow-xl shadow-black/20">
        <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-2 hover:bg-slate-800 rounded-xl transition">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-black text-sm uppercase tracking-widest text-slate-200">{monthName}</span>
        <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-2 hover:bg-slate-800 rounded-xl transition">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex-1 mb-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full blur-3xl" />
        
        <div className="grid grid-cols-7 gap-2 mb-4 relative z-10">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
            <div key={d} className="text-center text-[10px] font-black text-slate-500 uppercase tracking-widest py-1">{d}</div>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 relative z-10">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-4" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Syncing History...</p>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-2 relative z-10">
            {prevMonthPadding.map(i => (
              <div key={`p-${i}`} className="aspect-square" />
            ))}
            {days.map(day => {
              const status = getDayStatus(day);
              return (
                <div 
                  key={day} 
                  className={`aspect-square rounded-2xl flex items-center justify-center text-sm font-bold border transition-all duration-300 ${
                    status ? statusColors[status] || 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-950/40 border-slate-900 text-slate-600'
                  }`}
                >
                  {day}
                </div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="mt-8 grid grid-cols-2 gap-3 relative z-10 border-t border-slate-800 pt-6">
          <LegendItem color="bg-emerald-500" label="Present" />
          <LegendItem color="bg-rose-500" label="Absent" />
          <LegendItem color="bg-amber-500" label="Half Day" />
          <LegendItem color="bg-brand-500" label="Leave" />
        </div>
      </div>

      <div className="bg-slate-900/50 border border-white/5 p-4 rounded-2xl flex items-start space-x-3 mb-8">
        <Info className="w-4 h-4 text-slate-500 mt-0.5" />
        <p className="text-[10px] font-bold text-slate-500 leading-relaxed uppercase tracking-wide">
          Attendance is marked based on your first and last punches of the day. Contact HR for regularizations if you see discrepancies.
        </p>
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string, label: string }) {
  return (
    <div className="flex items-center space-x-2">
      <div className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
    </div>
  );
}
