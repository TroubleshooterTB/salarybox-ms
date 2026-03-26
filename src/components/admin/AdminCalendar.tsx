import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ChevronLeft, ChevronRight, Loader2, Calendar as CalendarIcon } from 'lucide-react';

export default function AdminCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [editingCell, setEditingCell] = useState<{ userId: string, day: number } | null>(null);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const fetchData = async () => {
    setLoading(true);
    // Fetch all profiles
    const { data: profs } = await supabase.from('profiles').select('id, full_name, employee_id').order('full_name');
    if (profs) setProfiles(profs);

    // Fetch month attendance
    const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
    const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59).toISOString();

    const { data: att } = await supabase
      .from('attendance')
      .select('*')
      .gte('timestamp', startDate)
      .lte('timestamp', endDate);
    
    if (att) setAttendance(att);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [currentDate]);

  const prevMonth = () => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)));
  const nextMonth = () => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)));

  const getStatusDisplay = (userId: string, day: number) => {
    const records = attendance.filter(a => {
      const recDate = new Date(a.timestamp);
      return a.user_id === userId && recDate.getDate() === day && recDate.getMonth() === currentDate.getMonth();
    });

    if (records.length === 0) return '';
    
    // Simplistic mapping for the grid
    const latest = records[records.length - 1];
    if (latest.status === 'Present') return 'P';
    if (latest.status === 'Absent') return 'A';
    if (latest.status === 'Late') return 'L';
    if (latest.status === 'Half Day') return 'HD';
    if (latest.status === 'Paid Leave') return 'PL';
    return latest.status.substring(0, 2).toUpperCase();
  };

  const getStatusColor = (code: string) => {
    switch (code) {
      case 'P': return 'bg-emerald-100 text-emerald-800 font-black';
      case 'A': return 'bg-rose-100 text-rose-800 font-black';
      case 'L': return 'bg-amber-100 text-amber-800 font-black';
      case 'HD': return 'bg-orange-100 text-orange-800 font-black';
      case 'PL': return 'bg-indigo-100 text-indigo-800 font-black';
      default: return 'text-slate-300';
    }
  };

  const handleOverride = async (userId: string, day: number, newStatus: string) => {
    // Find if a record exists to update, or create a mock manual record
    const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day, 10, 0, 0); // Default to 10AM
    
    const existing = attendance.find(a => {
      const recDate = new Date(a.timestamp);
      return a.user_id === userId && recDate.getDate() === day && recDate.getMonth() === currentDate.getMonth();
    });

    if (existing) {
      await supabase.from('attendance').update({ status: newStatus }).eq('id', existing.id);
    } else {
      // Insert a manual override admin record
      await supabase.from('attendance').insert({
        user_id: userId,
        type: 'In',
        timestamp: targetDate.toISOString(),
        latitude: 0, longitude: 0,
        address_string: 'Admin Manual Override',
        status: newStatus
      });
    }

    setEditingCell(null);
    fetchData(); // Sync live
  };

  const renderCellMenu = (userId: string, day: number) => {
    return (
      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 z-50 flex flex-col p-2 min-w-[120px] animate-in fade-in slide-in-from-top-2">
        {['Present', 'Absent', 'Late', 'Half Day', 'Paid Leave'].map(st => (
          <button 
            key={st} 
            onClick={() => handleOverride(userId, day, st)}
            className="text-left px-3 py-2 text-xs font-bold text-slate-600 hover:bg-brand-50 hover:text-brand-600 rounded-lg transition"
          >
            {st}
          </button>
        ))}
        <div className="h-px bg-slate-100 my-1"></div>
        <button onClick={() => setEditingCell(null)} className="text-left px-3 py-2 text-xs font-bold text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-lg">Cancel</button>
      </div>
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-800">Master Calendar</h2>
          <p className="text-slate-500 font-medium text-sm">Visual 31-day attendance matrix with individual cell overrides.</p>
        </div>
        
        <div className="flex items-center space-x-4 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
          <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-600"><ChevronLeft className="w-5 h-5" /></button>
          <div className="flex items-center space-x-2 px-4">
            <CalendarIcon className="w-4 h-4 text-brand-500" />
            <span className="font-bold text-slate-800 tracking-wide">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
          </div>
          <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-600"><ChevronRight className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 flex-1 overflow-auto">
        {loading ? (
          <div className="h-full flex items-center justify-center text-slate-400 flex-col">
            <Loader2 className="w-10 h-10 animate-spin mb-4 text-brand-500" />
            <span className="font-bold tracking-widest text-sm uppercase">Calculating Matrix...</span>
          </div>
        ) : (
          <div className="min-w-max pb-12">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest sticky left-0 bg-slate-50 z-20 border-r border-slate-200 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.05)] w-64">Employee</th>
                  {daysArray.map(day => (
                    <th key={day} className="py-4 px-2 text-center text-[10px] font-black text-slate-400 border-x border-slate-100 min-w-[40px]">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {profiles.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition group">
                    <td className="px-6 py-3 sticky left-0 bg-white group-hover:bg-slate-50 z-10 border-r border-slate-200 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.02)]">
                      <p className="font-bold text-slate-800 text-sm truncate">{p.full_name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{p.employee_id}</p>
                    </td>
                    {daysArray.map(day => {
                      const code = getStatusDisplay(p.id, day);
                      const isEditing = editingCell?.userId === p.id && editingCell?.day === day;
                      return (
                        <td key={day} className="border-x border-slate-50 relative p-1.5 align-middle">
                          <button 
                            onClick={() => setEditingCell({ userId: p.id, day })}
                            className={`w-full h-9 flex items-center justify-center rounded-lg text-xs transition border border-transparent hover:border-slate-300 ${getStatusColor(code)}`}
                          >
                            {code || '-'}
                          </button>
                          {isEditing && renderCellMenu(p.id, day)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
