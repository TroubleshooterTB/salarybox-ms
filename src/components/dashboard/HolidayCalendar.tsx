import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Sun, Loader2 } from 'lucide-react';

interface Holiday {
  id: string;
  name: string;
  date: string;
  type: 'National' | 'Regional' | 'Optional';
}

// Default Maharashtra 2026 holidays — Admins can override via 'holidays' table if it exists
const DEFAULT_HOLIDAYS: Holiday[] = [
  { id: '1', name: 'New Year\'s Day', date: '2026-01-01', type: 'National' },
  { id: '2', name: 'Makar Sankranti', date: '2026-01-14', type: 'Regional' },
  { id: '3', name: 'Republic Day', date: '2026-01-26', type: 'National' },
  { id: '4', name: 'Chhatrapati Shivaji Maharaj Jayanti', date: '2026-02-19', type: 'Regional' },
  { id: '5', name: 'Holi', date: '2026-03-04', type: 'Regional' },
  { id: '6', name: 'Gudi Padwa', date: '2026-03-19', type: 'Regional' },
  { id: '7', name: 'Good Friday', date: '2026-04-03', type: 'National' },
  { id: '8', name: 'Dr. Ambedkar Jayanti', date: '2026-04-14', type: 'National' },
  { id: '9', name: 'Maharashtra Day', date: '2026-05-01', type: 'Regional' },
  { id: '10', name: 'Eid ul-Adha', date: '2026-06-27', type: 'National' },
  { id: '11', name: 'Independence Day', date: '2026-08-15', type: 'National' },
  { id: '12', name: 'Ganesh Chaturthi', date: '2026-08-23', type: 'Regional' },
  { id: '13', name: 'Dussehra', date: '2026-10-11', type: 'National' },
  { id: '14', name: 'Diwali (Lakshmi Pujan)', date: '2026-10-31', type: 'Regional' },
  { id: '15', name: 'Diwali (Balipratipada)', date: '2026-11-01', type: 'Regional' },
  { id: '16', name: 'Christmas', date: '2026-12-25', type: 'National' },
];

const TYPE_STYLE: Record<string, string> = {
  National: 'bg-rose-900/30 text-rose-400 border-rose-700/30',
  Regional: 'bg-brand-900/30 text-brand-400 border-brand-700/30',
  Optional: 'bg-amber-900/30 text-amber-400 border-amber-700/30',
};

export default function HolidayCalendar({ onBack }: { onBack: () => void }) {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHolidays() {
      // Try to load from DB; fall back to defaults
      const { data } = await supabase.from('holidays').select('*').order('date', { ascending: true });
      if (data && data.length > 0) {
        setHolidays(data);
      } else {
        setHolidays(DEFAULT_HOLIDAYS);
      }
      setLoading(false);
    }
    fetchHolidays();
  }, []);

  const upcoming = holidays.filter(h => new Date(h.date) >= new Date());
  const past = holidays.filter(h => new Date(h.date) < new Date());

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long' });

  const daysLeft = (d: string) => {
    const diff = Math.ceil((new Date(d).getTime() - new Date().getTime()) / 86400000);
    if (diff === 0) return 'Today!';
    if (diff === 1) return 'Tomorrow';
    return `In ${diff} days`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 max-w-md mx-auto">
      <div className="flex items-center mb-6 pt-4">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold ml-2 tracking-tight">Holiday Calendar 2026</h2>
      </div>

      {loading ? (
        <div className="flex justify-center mt-20"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
      ) : (
        <div className="space-y-6">
          {/* Next holiday highlight */}
          {upcoming.length > 0 && (
            <div className="bg-gradient-to-br from-brand-900/50 to-slate-900 border border-brand-500/20 p-6 rounded-3xl shadow-xl relative overflow-hidden">
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-brand-500/20 rounded-full blur-2xl pointer-events-none" />
              <p className="text-[10px] font-black uppercase tracking-widest text-brand-400 mb-2">Next Holiday</p>
              <h3 className="text-xl font-black text-white">{upcoming[0].name}</h3>
              <p className="text-sm font-bold text-slate-400 mt-1">{formatDate(upcoming[0].date)}</p>
              <div className="mt-3 inline-flex items-center space-x-2 bg-brand-500/20 px-3 py-1.5 rounded-full">
                <Sun className="w-3.5 h-3.5 text-brand-400" />
                <span className="text-xs font-black text-brand-300">{daysLeft(upcoming[0].date)}</span>
              </div>
            </div>
          )}

          {/* Upcoming */}
          {upcoming.length > 1 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 px-1">Upcoming Holidays</p>
              <div className="space-y-3">
                {upcoming.slice(1).map(h => (
                  <div key={h.id} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-200 text-sm">{h.name}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{formatDate(h.date)}</p>
                    </div>
                    <span className={`px-2 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg border ${TYPE_STYLE[h.type]}`}>
                      {h.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Past */}
          {past.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-3 px-1">Past Holidays</p>
              <div className="space-y-2 opacity-40">
                {[...past].reverse().map(h => (
                  <div key={h.id} className="bg-slate-900/50 border border-slate-800 p-3 rounded-2xl flex justify-between items-center">
                    <p className="font-bold text-slate-400 text-sm line-through">{h.name}</p>
                    <p className="text-[10px] font-bold text-slate-600">{formatDate(h.date)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
