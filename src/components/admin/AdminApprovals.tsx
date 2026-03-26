import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CheckCircle2, XCircle, Unlock, Smartphone, CalendarDays, Loader2, BarChart3, RefreshCw } from 'lucide-react';

const LEAVE_COL_MAP: Record<string, string> = {
  Privilege: 'privilege_balance',
  Sick: 'sick_balance',
  Casual: 'casual_balance',
};

export default function AdminApprovals() {
  const [activeTab, setActiveTab] = useState<'leaves' | 'devices' | 'balances'>('leaves');
  const [loading, setLoading] = useState(false);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);

  const fetchLeaves = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('leave_requests')
      .select('*, profiles(full_name, employee_id, branch)')
      .eq('status', 'Pending')
      .order('created_at', { ascending: false });
    if (data) setLeaves(data);
    setLoading(false);
  };

  const fetchDevices = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, employee_id, branch, device_fingerprint')
      .not('device_fingerprint', 'is', null);
    if (data) setDevices(data);
    setLoading(false);
  };

  const fetchBalances = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('leaves')
      .select('*, profiles(full_name, employee_id)')
      .order('created_at', { ascending: true });
    if (data) setBalances(data);
    setLoading(false);
  };

  const carryForwardPrivilege = async (leaveId: string, currentBalance: number, userId: string) => {
    const currentYear = new Date().getFullYear();
    const maxCarryForward = 11;
    // Carry forward = min(current balance, 11). Add to next year's allocation.
    const carryAmount = Math.min(currentBalance, maxCarryForward);
    await supabase.from('leaves').update({
      privilege_balance: carryAmount,
    }).eq('id', leaveId);
    // Log the carry-forward action
    await supabase.from('leave_requests').insert({
      user_id: userId,
      leave_type: 'Privilege',
      start_date: `${currentYear}-01-01`,
      end_date: `${currentYear}-01-01`,
      reason: `Admin carry-forward: ${carryAmount} days credited from ${currentYear - 1}`,
      status: 'Approved',
      is_half_day: false,
    });
    fetchBalances();
  };

  useEffect(() => {
    if (activeTab === 'leaves') fetchLeaves();
    else if (activeTab === 'devices') fetchDevices();
    else fetchBalances();
  }, [activeTab]);

  const handleLeaveAction = async (id: string, newStatus: 'Approved' | 'Rejected', userId: string, leaveType: string, days: number, isHalfDay: boolean) => {
    await supabase.from('leave_requests').update({ status: newStatus }).eq('id', id);
    if (newStatus === 'Approved') {
      const balanceCol = LEAVE_COL_MAP[leaveType];
      if (balanceCol) {
        const { data: current } = await supabase.from('leaves').select(balanceCol).eq('user_id', userId).single();
        if (current) {
          const deduction = isHalfDay ? 0.5 : days;
          const newBalance = Math.max(0, Number(current[balanceCol as keyof typeof current]) - deduction);
          await supabase.from('leaves').update({ [balanceCol]: newBalance }).eq('user_id', userId);
        }
      }
    }
    fetchLeaves();
  };

  const handleDeviceReset = async (id: string) => {
    if (window.confirm("This will wipe the device fingerprint. The employee can log in from a new device.")) {
      await supabase.from('profiles').update({ device_fingerprint: null }).eq('id', id);
      fetchDevices();
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col h-full">
      <div className="mb-8">
        <h2 className="text-2xl font-black tracking-tight text-slate-800">Approvals & Security</h2>
        <p className="text-slate-500 font-medium text-sm">Review leave requests, balances, and unlock employee hardware.</p>
      </div>

      <div className="flex space-x-1 bg-slate-200/50 p-1.5 rounded-2xl w-max mb-6">
        <button onClick={() => setActiveTab('leaves')} className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-bold transition ${activeTab === 'leaves' ? 'bg-white text-brand-600 shadow-md' : 'text-slate-500 hover:text-slate-800'}`}>
          <CalendarDays className="w-4 h-4" /> <span>Pending Leaves</span>
          {leaves.length > 0 && <span className="ml-2 bg-rose-500 text-white px-2 py-0.5 rounded-full text-[10px]">{leaves.length}</span>}
        </button>
        <button onClick={() => setActiveTab('balances')} className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-bold transition ${activeTab === 'balances' ? 'bg-white text-emerald-600 shadow-md' : 'text-slate-500 hover:text-slate-800'}`}>
          <BarChart3 className="w-4 h-4" /> <span>Leave Balances</span>
        </button>
        <button onClick={() => setActiveTab('devices')} className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-bold transition ${activeTab === 'devices' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-800'}`}>
          <Smartphone className="w-4 h-4" /> <span>Hardware Locks</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 flex-1 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-brand-500" /> Fetching secure records...</div>
        ) : activeTab === 'leaves' ? (
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Employee</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Leave Details</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Duration</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leaves.length === 0 ? (
                <tr><td colSpan={4} className="py-12 text-center text-slate-400 font-bold">No pending leave requests.</td></tr>
              ) : leaves.map(l => {
                const days = l.is_half_day ? 0.5 : (Math.ceil((new Date(l.end_date).getTime() - new Date(l.start_date).getTime()) / (1000 * 3600 * 24)) + 1);
                return (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800">{l.profiles?.full_name}</p>
                      <p className="text-xs font-semibold text-slate-400">{l.profiles?.employee_id} • {l.profiles?.branch}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-amber-50 text-amber-700 text-[10px] font-black uppercase rounded-full border border-amber-200">{l.leave_type} Leave</span>
                        {l.is_half_day && <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-black rounded-full border border-indigo-200">Half Day</span>}
                      </div>
                      <p className="text-sm font-semibold text-slate-600 mt-2">{l.reason || 'No reason provided.'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-700">{new Date(l.start_date).toLocaleDateString()} to {new Date(l.end_date).toLocaleDateString()}</p>
                      <p className="text-xs font-bold text-slate-400">{days} day{days !== 1 ? 's' : ''} total</p>
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end space-x-2">
                      <button onClick={() => handleLeaveAction(l.id, 'Rejected', l.user_id, l.leave_type, days, l.is_half_day)} className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition"><XCircle className="w-5 h-5" /></button>
                      <button onClick={() => handleLeaveAction(l.id, 'Approved', l.user_id, l.leave_type, days, l.is_half_day)} className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition"><CheckCircle2 className="w-5 h-5" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : activeTab === 'balances' ? (
          <div className="overflow-x-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Leave Balance Report — All Employees</p>
              <button onClick={fetchBalances} className="flex items-center space-x-1 text-xs font-bold text-brand-500 hover:underline">
                <RefreshCw className="w-3 h-3" /> <span>Refresh</span>
              </button>
            </div>
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Employee</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Privilege (Max 11 CF)</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Sick Leave</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Casual Leave</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Carry Forward</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {balances.length === 0 ? (
                  <tr><td colSpan={5} className="py-12 text-center text-slate-400 font-bold">No leave records found.</td></tr>
                ) : balances.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800">{b.profiles?.full_name}</p>
                      <p className="text-xs font-semibold text-slate-400">{b.profiles?.employee_id}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-lg font-black ${b.privilege_balance > 5 ? 'text-emerald-600' : 'text-amber-500'}`}>{b.privilege_balance ?? 0}</span>
                      <span className="text-slate-400 text-xs font-bold ml-1">days</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-lg font-black text-rose-500">{b.sick_balance ?? 0}</span>
                      <span className="text-slate-400 text-xs font-bold ml-1">days</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-lg font-black text-indigo-500">{b.casual_balance ?? 0}</span>
                      <span className="text-slate-400 text-xs font-bold ml-1">days</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => carryForwardPrivilege(b.id, b.privilege_balance, b.user_id)}
                        className="px-3 py-1.5 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-xl hover:bg-emerald-100 transition border border-emerald-200"
                        title={`Carry forward up to 11 days (currently ${b.privilege_balance})`}
                      >
                        Carry Forward →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Employee</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Device Fingerprint Hash</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {devices.length === 0 ? (
                <tr><td colSpan={3} className="py-12 text-center text-slate-400 font-bold">No active devices bound.</td></tr>
              ) : devices.map(d => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-800">{d.full_name}</p>
                    <p className="text-xs font-semibold text-slate-400">{d.employee_id} • {d.branch}</p>
                  </td>
                  <td className="px-6 py-4"><p className="font-mono text-xs bg-slate-100 p-2 rounded-lg text-slate-600 border border-slate-200 w-max">{d.device_fingerprint}</p></td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleDeviceReset(d.id)} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition flex items-center space-x-2 ml-auto">
                      <Unlock className="w-4 h-4" /> <span>Reset Binding</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
