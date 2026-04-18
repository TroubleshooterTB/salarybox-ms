import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ChevronLeft, ChevronRight, Loader2, Search, Edit3, CheckCircle2, XCircle, MapPin } from 'lucide-react';

interface DayPunch {
  profile: any;
  punches: any[];
  inPunch: any | null;
  outPunch: any | null;
  durationMinutes: number | null;
}

const STATUS_OPTIONS = ['Present', 'Absent', 'Late', 'Half Day', 'Paid Leave'];

export default function AdminHistoricalAttendance({ selectedBranch }: { selectedBranch: string }) {
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1); // Default to yesterday
    return d;
  });

  const [groups, setGroups] = useState<DayPunch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Edit modal
  const [editTarget, setEditTarget] = useState<{ punch: any; profileName: string } | null>(null);
  const [editStatus, setEditStatus] = useState('Present');
  const [editTime, setEditTime] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchDay = async (date: Date) => {
    setLoading(true);
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    let query = supabase
      .from('attendance')
      .select(`*, profiles (id, full_name, employee_id, department, branch)`)
      .gte('timestamp', start.toISOString())
      .lte('timestamp', end.toISOString())
      .order('timestamp', { ascending: true });

    if (selectedBranch && selectedBranch !== 'All Branches') {
      query = query.eq('profiles.branch', selectedBranch);
    }

    const { data } = await query;

    if (data) {
      const byUser = new Map<string, { profile: any; punches: any[] }>();
      for (const punch of data) {
        const uid = punch.user_id;
        if (!byUser.has(uid)) byUser.set(uid, { profile: punch.profiles, punches: [] });
        byUser.get(uid)!.punches.push(punch);
      }

      const result: DayPunch[] = [];
      for (const [, { profile, punches }] of byUser) {
        const inPunch = punches.filter(p => p.type === 'In').at(-1) ?? null;
        const outPunch = punches.filter(p => p.type === 'Out').at(-1) ?? null;
        let durationMinutes: number | null = null;
        if (inPunch && outPunch) {
          durationMinutes = Math.round(
            (new Date(outPunch.timestamp).getTime() - new Date(inPunch.timestamp).getTime()) / 60000
          );
        }
        result.push({ profile, punches, inPunch, outPunch, durationMinutes });
      }

      result.sort((a, b) => (a.profile?.full_name ?? '').localeCompare(b.profile?.full_name ?? ''));
      setGroups(result);
    }
    setLoading(false);
  };

  useEffect(() => { fetchDay(selectedDate); }, [selectedDate]);

  const shiftDate = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    // Don't allow future dates
    if (d <= new Date()) setSelectedDate(d);
  };

  const openEdit = (punch: any, profileName: string) => {
    setEditTarget({ punch, profileName });
    setEditStatus(punch.status);
    const t = new Date(punch.timestamp);
    setEditTime(`${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`);
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    setSaving(true);

    try {
      const [h, m] = editTime.split(':').map(Number);
      const newTs = new Date(editTarget.punch.timestamp);
      newTs.setHours(h, m, 0, 0);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Session expired. Please login again.');

      const res = await fetch('/api/attendance-override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: session.access_token,
          attendanceId: editTarget.punch.id,
          newStatus: editStatus,
          newTimestamp: newTs.toISOString(),
          reason: `Admin override from Historical Attendance: Status changed to ${editStatus}, time adjusted`
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Override failed');

      setEditTarget(null);
      fetchDay(selectedDate);
    } catch (err: any) {
      alert('Override failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const manualPunch = async (userId: string, type: 'In' | 'Out') => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Session expired. Please login again.');

      const ts = new Date(selectedDate);
      ts.setHours(type === 'In' ? 9 : 18, 0, 0, 0);

      const res = await fetch('/api/admin-add-punch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: session.access_token,
          userId,
          type,
          timestamp: ts.toISOString(),
          status: 'Present',
          reason: 'Admin manual insert from Historical Attendance'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Manual punch failed');

      fetchDay(selectedDate);
    } catch (err: any) {
      alert('Manual punch failed: ' + err.message);
    }
  };

  const filtered = groups.filter(g =>
    g.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.profile?.employee_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (ts: string) =>
    new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const formatDuration = (mins: number) =>
    `${Math.floor(mins / 60)}h ${mins % 60}m`;

  const dateLabel = selectedDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const isToday = selectedDate.toDateString() === new Date().toDateString();

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header + Date Picker */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-800">Historical Attendance</h2>
          <p className="text-slate-500 font-medium text-sm mt-1">Browse and override any past day's attendance records.</p>
        </div>
        <div className="flex items-center space-x-3 bg-white border border-slate-200 rounded-2xl p-2 shadow-sm">
          <button onClick={() => shiftDate(-1)} className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-600">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center px-2">
            <p className="font-bold text-slate-800 text-sm">{dateLabel}</p>
            {isToday && <p className="text-[10px] font-black uppercase tracking-widest text-brand-500">Today</p>}
          </div>
          <button onClick={() => shiftDate(1)} disabled={isToday} className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronRight className="w-5 h-5" />
          </button>
          <input
            type="date"
            max={new Date().toISOString().split('T')[0]}
            value={selectedDate.toISOString().split('T')[0]}
            onChange={e => setSelectedDate(new Date(e.target.value + 'T12:00:00'))}
            className="ml-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-brand-500 transition"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center space-x-3">
          <Search className="w-5 h-5 text-slate-400 ml-4" />
          <input
            type="text"
            placeholder="Search employee..."
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
                <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="py-12 text-center text-slate-400"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" /> Loading records...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center font-bold text-slate-400">No attendance records found for this date.</td></tr>
              ) : filtered.map((g, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-800">{g.profile?.full_name}</p>
                    <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest">{g.profile?.branch || 'N/A'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest">{g.profile?.employee_id}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">{g.profile?.department}</p>
                  </td>
                  {/* IN PUNCH */}
                  <td className="px-6 py-4">
                    {g.inPunch ? (
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-emerald-700 font-black text-sm">{formatTime(g.inPunch.timestamp)}</span>
                          <button onClick={() => openEdit(g.inPunch, g.profile?.full_name)} className="p-1 text-slate-400 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition">
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </div>
                        {g.inPunch.address_string && (
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5 max-w-[160px] truncate flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5 shrink-0" />{g.inPunch.address_string}
                          </p>
                        )}
                      </div>
                    ) : (
                      <button onClick={() => manualPunch(g.profile?.id, 'In')} className="text-xs font-bold px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition border border-emerald-200">
                        + Add IN
                      </button>
                    )}
                  </td>
                  {/* OUT PUNCH */}
                  <td className="px-6 py-4">
                    {g.outPunch ? (
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-rose-600 font-black text-sm">{formatTime(g.outPunch.timestamp)}</span>
                          <button onClick={() => openEdit(g.outPunch, g.profile?.full_name)} className="p-1 text-slate-400 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition">
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </div>
                        {g.outPunch.address_string && (
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5 max-w-[160px] truncate flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5 shrink-0" />{g.outPunch.address_string}
                          </p>
                        )}
                      </div>
                    ) : (
                      g.inPunch && (
                        <button onClick={() => manualPunch(g.profile?.id, 'Out')} className="text-xs font-bold px-3 py-1 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition border border-rose-200">
                          + Add OUT
                        </button>
                      )
                    )}
                  </td>
                  {/* Duration */}
                  <td className="px-6 py-4">
                    {g.durationMinutes !== null ? (
                      <span className={`font-black text-sm ${g.durationMinutes < 480 ? 'text-amber-500' : 'text-emerald-600'}`}>
                        {formatDuration(g.durationMinutes)}
                      </span>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  {/* Status */}
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-full border tracking-widest ${
                      g.punches[0]?.status === 'Present' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      g.punches[0]?.status === 'Half Day' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      g.punches[0]?.status === 'Late' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                      'bg-slate-50 text-slate-500 border-slate-200'
                    }`}>
                      {g.punches[0]?.status || 'No Record'}
                    </span>
                  </td>
                  {/* Actions */}
                  <td className="px-6 py-4 text-right">
                    {g.inPunch && (
                      <button onClick={() => openEdit(g.inPunch, g.profile?.full_name)} className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition">
                        Override
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editTarget && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Override Punch Record</h3>
                <p className="text-sm text-slate-500 mt-0.5">{editTarget.profileName} • {editTarget.punch.type} Punch</p>
              </div>
              <button onClick={() => setEditTarget(null)} className="text-slate-400 hover:text-slate-600 font-bold">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Punch Time</label>
                <input
                  type="time"
                  value={editTime}
                  onChange={e => setEditTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-brand-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Status Override</label>
                <div className="grid grid-cols-3 gap-2">
                  {STATUS_OPTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => setEditStatus(s)}
                      className={`py-2 px-3 text-xs font-bold rounded-xl transition border ${editStatus === s ? 'bg-brand-500 text-white border-brand-500 shadow-lg shadow-brand-500/20' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 pt-0 flex space-x-3">
              <button onClick={() => setEditTarget(null)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition">
                Cancel
              </button>
              <button onClick={saveEdit} disabled={saving} className="flex-1 py-3 bg-brand-500 text-white font-bold rounded-xl hover:bg-brand-600 transition flex items-center justify-center space-x-2 shadow-lg shadow-brand-500/20">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Save Override</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
