import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Clock, Search, Loader2, AlertTriangle, ShieldCheck, RefreshCw, Timer, Calendar } from 'lucide-react';
import AttendanceCalendar from '../dashboard/AttendanceCalendar';

interface PunchGroup {
  profile: any;
  punches: any[];
  inPunch: any | null;
  outPunch: any | null;
  durationMinutes: number | null;
}

export default function AdminDailyAttendance({ selectedBranch }: { selectedBranch: string }) {
  const [punchGroups, setPunchGroups] = useState<PunchGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [selectedUser, setSelectedUser] = useState<{ id: string, name: string } | null>(null);

  const fetchDailyPunches = async () => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    let query = supabase
      .from('attendance')
      .select(`*, profiles (id, full_name, employee_id, role, department, branch, multiple_branches)`)
      .gte('timestamp', startOfDay.toISOString())
      .order('timestamp', { ascending: true });

    if (selectedBranch && selectedBranch !== 'All Branches') {
      query = query.eq('profiles.branch', selectedBranch);
    }

    const { data } = await query;

    if (data) {
      // Group punches by user
      const byUser = new Map<string, { profile: any; punches: any[] }>();
      for (const punch of data) {
        const uid = punch.user_id;
        if (!byUser.has(uid)) {
          byUser.set(uid, { profile: punch.profiles, punches: [] });
        }
        byUser.get(uid)!.punches.push(punch);
      }

      // For each user, find latest IN and latest OUT, and calculate duration
      const groups: PunchGroup[] = [];
      for (const [userId, { profile, punches }] of byUser) {
        console.log('Processing user:', userId);
        const inPunches = punches.filter(p => p.type === 'In');
        const outPunches = punches.filter(p => p.type === 'Out');
        const latestIn = inPunches[inPunches.length - 1] ?? null;
        const latestOut = outPunches[outPunches.length - 1] ?? null;

        let durationMinutes: number | null = null;
        if (latestIn && latestOut) {
          durationMinutes = Math.round(
            (new Date(latestOut.timestamp).getTime() - new Date(latestIn.timestamp).getTime()) / 60000
          );
        }

        groups.push({ profile, punches, inPunch: latestIn, outPunch: latestOut, durationMinutes });
      }

      // Sort by most recent activity
      groups.sort((a, b) => {
        const aLast = a.punches[a.punches.length - 1]?.timestamp ?? '';
        const bLast = b.punches[b.punches.length - 1]?.timestamp ?? '';
        return bLast.localeCompare(aLast);
      });

      setPunchGroups(groups);
      setLastRefresh(new Date());
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDailyPunches();
    const interval = setInterval(fetchDailyPunches, 30000);
    return () => clearInterval(interval);
  }, []);

  const filtered = punchGroups.filter(g =>
    g.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.profile?.employee_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  const formatTime = (ts: string) =>
    new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-800 flex items-center">
            <span className="relative flex h-3 w-3 mr-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            Live Daily Attendance
          </h2>
          <p className="text-slate-500 font-medium text-sm mt-1">
            Real-time IN/OUT pair feed • Refreshed {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={fetchDailyPunches}
          className="flex items-center space-x-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* High-Fidelity Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        {/* Attendance Rate Donut */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center space-x-6">
          <div className="relative w-20 h-20 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="16" fill="none" className="stroke-slate-100" strokeWidth="3.5" />
              <circle 
                cx="18" cy="18" r="16" fill="none" 
                className="stroke-emerald-500 transition-all duration-1000 ease-out" 
                strokeWidth="3.5" 
                strokeDasharray={`${(filtered.length / Math.max(1, punchGroups.length)) * 100}, 100`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs font-black text-slate-800 tracking-tighter">
                {Math.round((filtered.length / Math.max(1, punchGroups.length)) * 100)}%
              </span>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Attendance Rate</p>
            <p className="text-sm font-bold text-slate-700">{filtered.length} of {punchGroups.length} Staff</p>
          </div>
        </div>

        {/* Punctuality Rate Donut */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center space-x-6">
          <div className="relative w-20 h-20 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="16" fill="none" className="stroke-slate-100" strokeWidth="3.5" />
              <circle 
                cx="18" cy="18" r="16" fill="none" 
                className="stroke-amber-400 transition-all duration-1000 ease-out" 
                strokeWidth="3.5" 
                strokeDasharray={`${(filtered.filter(g => g.inPunch && g.punches[0]?.status === 'Present').length / Math.max(1, filtered.length)) * 100}, 100`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs font-black text-slate-800 tracking-tighter">
                {Math.round((filtered.filter(g => g.inPunch && g.punches[0]?.status === 'Present').length / Math.max(1, filtered.length)) * 100)}%
              </span>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">On-Time Rate</p>
            <p className="text-sm font-bold text-slate-700">Punctual arrivals</p>
          </div>
        </div>

        {/* Live Status Card */}
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl lg:col-span-2 flex justify-between items-center group overflow-hidden relative">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-brand-500/10 rounded-full blur-2xl group-hover:bg-brand-500/20 transition-all" />
          <div className="relative z-10">
            <h4 className="text-white font-black text-lg">V2.2 Payroll Engine</h4>
            <p className="text-slate-400 text-xs font-semibold mt-1">Ready for {new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })} processing</p>
          </div>
          <button 
            className="px-6 py-3 bg-brand-500 hover:bg-brand-400 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-lg shadow-brand-500/20 active:scale-95 transition-all relative z-10"
            onClick={() => {/* Navigate to payroll */}}
          >
            Run Payroll
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Present</p>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="text-3xl font-black text-emerald-700">{filtered.length}</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 p-5 rounded-2xl">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-2">Currently In</p>
          <p className="text-3xl font-black text-amber-700">
            {filtered.filter(g => g.inPunch && !g.outPunch).length}
          </p>
        </div>
        <div className="bg-rose-50 border border-rose-100 p-5 rounded-2xl">
          <p className="text-[10px] font-black uppercase tracking-widest text-rose-600 mb-2">Completed</p>
          <p className="text-3xl font-black text-rose-700">
            {filtered.filter(g => g.outPunch).length}
          </p>
        </div>
        <div className="bg-slate-100 border border-slate-200 p-5 rounded-2xl">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Total Activity</p>
          <p className="text-3xl font-black text-slate-700">
            {filtered.reduce((sum, g) => sum + g.punches.length, 0)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center space-x-3">
          <Search className="w-5 h-5 text-slate-400 ml-4" />
          <input
            type="text"
            placeholder="Search by name or employee ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-sm font-semibold text-slate-700 w-full placeholder-slate-400"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase">Name</th>
                <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase">Employee ID</th>
                <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase">Punch IN</th>
                <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase">Punch OUT</th>
                <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase">Duration</th>
                <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase">Status</th>
                <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase">Actions</th>
                <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase text-right">Selfie</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={8} className="py-12 text-center text-slate-400"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" /> Loading live feed...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center font-bold text-slate-400">No punches recorded today yet.</td></tr>
              ) : filtered.map((g, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-800">{g.profile?.full_name || 'Unknown'}</p>
                    <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest">{g.profile?.branch || 'N/A'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest">{g.profile?.employee_id || 'ID N/A'}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">{g.profile?.department || 'N/A'}</p>
                  </td>
                  {/* Punch IN */}
                  <td className="px-6 py-4">
                    {g.inPunch ? (
                      <div>
                        <div className="flex items-center space-x-2 text-emerald-700 font-black">
                          <Clock className="w-4 h-4" />
                          <span>{formatTime(g.inPunch.timestamp)}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5 max-w-[140px] truncate" title={g.inPunch.address_string}>
                          {g.inPunch.address_string || `${g.inPunch.latitude?.toFixed(4)}, ${g.inPunch.longitude?.toFixed(4)}`}
                        </p>
                      </div>
                    ) : <span className="text-slate-300 text-sm font-bold">—</span>}
                  </td>
                  {/* Punch OUT */}
                  <td className="px-6 py-4">
                    {g.outPunch ? (
                      <div>
                        <div className="flex items-center space-x-2 text-rose-600 font-black">
                          <Clock className="w-4 h-4" />
                          <span>{formatTime(g.outPunch.timestamp)}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5 max-w-[140px] truncate" title={g.outPunch.address_string}>
                          {g.outPunch.address_string || `${g.outPunch.latitude?.toFixed(4)}, ${g.outPunch.longitude?.toFixed(4)}`}
                        </p>
                      </div>
                    ) : (
                      <span className={`px-2 py-1 text-[10px] font-black rounded-lg uppercase tracking-widest border ${g.inPunch ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                        {g.inPunch ? 'ON SITE' : '—'}
                      </span>
                    )}
                  </td>
                  {/* Duration */}
                  <td className="px-6 py-4">
                    {g.durationMinutes !== null ? (
                      <div className="flex items-center space-x-1.5">
                        <Timer className="w-4 h-4 text-slate-400" />
                        <span className={`font-black text-sm ${g.durationMinutes < 480 ? 'text-amber-500' : 'text-emerald-600'}`}>
                          {formatDuration(g.durationMinutes)}
                        </span>
                        {g.durationMinutes < 480 && (
                          <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider">Half Day</span>
                        )}
                      </div>
                    ) : g.inPunch ? (
                      <span className="text-xs font-bold text-slate-400 animate-pulse">In progress...</span>
                    ) : <span className="text-slate-300 text-sm font-bold">—</span>}
                  </td>
                  {/* Status */}
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      {g.punches[g.punches.length - 1]?.status === 'Present' ? (
                        <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                      )}
                      <span className={`text-xs font-black uppercase tracking-wider ${g.punches[g.punches.length - 1]?.status === 'Present' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {g.punches[g.punches.length - 1]?.status || 'N/A'}
                      </span>
                    </div>
                  </td>
                  {/* Actions */}
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => setSelectedUser({ id: g.profile?.id, name: g.profile?.full_name })}
                      className="p-2 bg-brand-50 text-brand-500 rounded-lg hover:bg-brand-500 hover:text-white transition shadow-sm border border-brand-100"
                      title="View Attendance History"
                    >
                      <Calendar className="w-4 h-4" />
                    </button>
                  </td>
                  {/* Selfie - show latest */}
                  <td className="px-6 py-4 text-right">
                    {g.inPunch?.selfie_url ? (
                      <a href={g.inPunch.selfie_url} target="_blank" rel="noreferrer" className="inline-block group">
                        <img src={g.inPunch.selfie_url} alt="Selfie" className="w-10 h-10 rounded-xl object-cover border-2 border-slate-200 shadow-sm group-hover:scale-150 group-hover:shadow-2xl transition duration-300 origin-right" />
                      </a>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">No Image</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Attendance History Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-white md:bg-black/40 backdrop-blur-sm md:p-8 flex items-center justify-center">
          <div className="bg-white w-full h-full md:max-w-4xl md:h-[90vh] md:rounded-[2.5rem] shadow-2xl relative overflow-hidden">
             <AttendanceCalendar 
               userId={selectedUser.id} 
               userName={selectedUser.name} 
               onBack={() => setSelectedUser(null)} 
             />
          </div>
        </div>
      )}
    </div>
  );
}
