import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CheckCircle2, XCircle, Smartphone, CalendarDays, Loader2, BarChart3 } from 'lucide-react';
import { useLanguage } from '../../lib/i18n';

export default function AdminApprovals({ selectedBranch }: { selectedBranch: string }) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'leaves' | 'devices' | 'balances' | 'corrections' | 'profiles'>('leaves');
  const [loading, setLoading] = useState(false);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [corrections, setCorrections] = useState<any[]>([]);
  const [profileRequests, setProfileRequests] = useState<any[]>([]);

  const fetchLeaves = async () => {
    setLoading(true);
    let query = supabase
      .from('leave_requests')
      .select('*, profiles(full_name, employee_id, branch)')
      .eq('status', 'Pending')
      .order('created_at', { ascending: false });

    if (selectedBranch && selectedBranch !== 'All Branches') {
      query = query.eq('profiles.branch', selectedBranch);
    }

    const { data } = await query;
    if (data) {
      // Fetch clashes for each pending leave
      const leavesWithClashes = await Promise.all(data.map(async (l: any) => {
        const { data: clashCount } = await supabase.rpc('check_leave_clashes', {
          target_start_date: l.start_date,
          target_end_date: l.end_date,
          target_dept: l.profiles?.department
        });
        return { ...l, clash_count: clashCount || 0 };
      }));
      setLeaves(leavesWithClashes);
    }
    setLoading(false);
  };

  const fetchCorrections = async () => {
    setLoading(true);
    let query = supabase
      .from('attendance_corrections')
      .select('*, profiles:user_id(full_name, employee_id, branch)')
      .eq('status', 'Pending')
      .order('created_at', { ascending: false });

    if (selectedBranch && selectedBranch !== 'All Branches') {
      query = query.eq('profiles.branch', selectedBranch);
    }

    const { data } = await query;
    if (data) setCorrections(data);
    setLoading(false);
  };

  const fetchProfileRequests = async () => {
    setLoading(true);
    let query = supabase
      .from('profile_update_requests')
      .select('*, profiles:user_id(full_name, employee_id, branch)')
      .eq('status', 'Pending')
      .order('created_at', { ascending: false });

    if (selectedBranch && selectedBranch !== 'All Branches') {
      query = query.eq('profiles.branch', selectedBranch);
    }

    const { data } = await query;
    if (data) setProfileRequests(data);
    setLoading(false);
  };

  const fetchDevices = async () => {
    setLoading(true);
    let query = supabase
      .from('profiles')
      .select('id, full_name, employee_id, branch, device_fingerprint, device_reset_requested')
      .order('device_reset_requested', { ascending: false })
      .order('full_name', { ascending: true });

    if (selectedBranch && selectedBranch !== 'All Branches') {
      query = query.eq('branch', selectedBranch);
    }

    const { data } = await query;
    if (data) setDevices(data);
    setLoading(false);
  };

  const fetchBalances = async () => {
    setLoading(true);
    // Use leave_quotas instead of leaves
    let query = supabase
      .from('leave_quotas')
      .select('*, profiles:user_id(full_name, employee_id, branch)')
      .eq('year', new Date().getFullYear())
      .order('created_at', { ascending: true });

    if (selectedBranch && selectedBranch !== 'All Branches') {
      query = query.eq('profiles.branch', selectedBranch);
    }

    const { data } = await query;
    if (data) setBalances(data);
    setLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'leaves') fetchLeaves();
    else if (activeTab === 'corrections') fetchCorrections();
    else if (activeTab === 'profiles') fetchProfileRequests();
    else if (activeTab === 'devices') fetchDevices();
    else fetchBalances();
  }, [activeTab, selectedBranch]);

  const handleLeaveAction = async (leave: any, newStatus: 'Approved' | 'Rejected') => {
    const { error } = await supabase.from('leave_requests').update({ status: newStatus }).eq('id', leave.id);
    
    if (!error && newStatus === 'Approved') {
        // 2. Deduct from Leave Quotas
        const start = new Date(leave.start_date);
        const end = new Date(leave.end_date);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        const quotaType = leave.leave_type === 'Statutory' ? 'pl_used' : leave.leave_type === 'Medical' ? 'sl_used' : 'cl_used';
        
        // This assumes a schema where leave_quotas exists and has these columns.
        // We use an incrementing update.
        const { error: quotaError } = await supabase.rpc('increment_leave_usage', {
            target_user_id: leave.user_id,
            target_year: start.getFullYear(),
            column_name: quotaType,
            increment_by: days
        });
        
        if (quotaError) {
            console.error('Quota deduction failed:', quotaError);
            alert('Leave approved but quota deduction failed. Please check manually.');
        }
    }
    
    if (!error) fetchLeaves();
  };

  const handleCorrectionAction = async (id: string, newStatus: 'Approved' | 'Rejected') => {
    // Note: The database trigger 'trigger_apply_correction' will handle 
    // the attendance record creation upon status = 'Approved'
    const { error } = await supabase
      .from('attendance_corrections')
      .update({ status: newStatus })
      .eq('id', id);
    
    if (error) alert(error.message);
    fetchCorrections();
  };

  const handleProfileUpdateAction = async (id: string, newStatus: 'Approved' | 'Rejected', request: any) => {
    const { error } = await supabase.from('profile_update_requests').update({ status: newStatus }).eq('id', id);
    
    if (!error && newStatus === 'Approved') {
      // Apply data to profiles dynamically
      await supabase.from('profiles').update({
        phone_number: request.request_data.phone_number,
        bank_name: request.request_data.bank_name,
        bank_account_details: request.request_data.bank_account
      }).eq('id', request.user_id);
    }
    fetchProfileRequests();
  };

  const handleDeviceReset = async (id: string, isApproval = false) => {
    if (window.confirm(isApproval ? "Authorize new device?" : "Reset hardware lock?")) {
      await supabase.from('profiles').update({ 
        device_fingerprint: null,
        device_reset_requested: false
      }).eq('id', id);
      fetchDevices();
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col h-screen overflow-hidden">
      <div className="mb-8 shrink-0">
        <h2 className="text-3xl font-black tracking-tight text-slate-800">HR Command Centre</h2>
        <p className="text-slate-500 font-medium">Govern leave quotas, regularize attendance, and authorize hardware.</p>
      </div>

      <div className="flex space-x-1 bg-slate-100 p-1.5 rounded-2xl w-max mb-8 shrink-0 shadow-sm border border-slate-200">
        {[
          { id: 'leaves', icon: CalendarDays, label: t('leaves'), count: leaves.length },
          { id: 'corrections', icon: BarChart3, label: t('corrections'), count: corrections.length },
          { id: 'profiles', icon: Smartphone, label: t('profile'), count: profileRequests.length },
          { id: 'balances', icon: BarChart3, label: 'Quotas' },
          { id: 'devices', icon: Smartphone, label: 'Hardware' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)} 
            className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition duration-300 ${
              activeTab === tab.id ? 'bg-white text-brand-600 shadow-xl shadow-brand-500/10' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <tab.icon className="w-4 h-4" /> 
            <span>{tab.label}</span>
            {tab.count ? <span className="ml-2 bg-rose-500 text-white px-2 py-0.5 rounded-lg text-[9px] animate-pulse">{tab.count}</span> : null}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 flex-1 overflow-hidden flex flex-col min-h-0">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-10 h-10 animate-spin mb-4 text-brand-500" />
            <p className="font-black uppercase tracking-widest text-xs">Authenticating Records...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto custom-scrollbar">
            {activeTab === 'leaves' && (
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Name</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Employee ID</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Request</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Period</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {leaves.length === 0 ? (
                    <tr><td colSpan={5} className="py-24 text-center text-slate-300 font-black uppercase tracking-widest">No pending leaves</td></tr>
                  ) : leaves.map(l => (
                    <tr key={l.id} className="hover:bg-slate-50/50 transition duration-300">
                      <td className="px-8 py-6">
                        <p className="font-bold text-slate-800">{l.profiles?.full_name}</p>
                        <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest mt-0.5">{l.profiles?.branch}</p>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest">{l.profiles?.employee_id}</p>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center space-x-2">
                           <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[10px] font-black uppercase rounded-lg border border-amber-100">{l.leave_type}</span>
                           <p className="text-sm font-bold text-slate-600 line-clamp-1">{l.reason}</p>
                           {l.clash_count > 0 && (
                             <span className="flex items-center space-x-1 px-2 py-0.5 bg-rose-50 text-rose-600 text-[9px] font-black uppercase rounded-md border border-rose-100 animate-pulse">
                               <XCircle className="w-3 h-3" />
                               <span>⚠️ {l.clash_count} Others on leave</span>
                             </span>
                           )}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-xs font-black text-slate-700">{new Date(l.start_date).toLocaleDateString()} {'->'} {new Date(l.end_date).toLocaleDateString()}</p>
                      </td>
                      <td className="px-8 py-6 text-right space-x-3">
                        <button onClick={() => handleLeaveAction(l, 'Rejected')} className="p-3 text-rose-500 hover:bg-rose-50 rounded-2xl transition"><XCircle className="w-6 h-6" /></button>
                        <button onClick={() => handleLeaveAction(l, 'Approved')} className="p-3 text-emerald-500 hover:bg-emerald-50 rounded-2xl transition"><CheckCircle2 className="w-6 h-6" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'corrections' && (
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Name</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Employee ID</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Details</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Reason</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {corrections.length === 0 ? (
                    <tr><td colSpan={5} className="py-24 text-center text-slate-300 font-black uppercase tracking-widest">Clean slate - No corrections</td></tr>
                  ) : corrections.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition duration-300">
                      <td className="px-8 py-6">
                        <p className="font-bold text-slate-800">{c.employee_name || c.profiles?.full_name}</p>
                        <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest">{c.profiles?.branch}</p>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest">{c.employee_id || c.profiles?.employee_id}</p>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-xs font-black text-slate-700">{new Date(c.date).toLocaleDateString()} </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="px-2 py-0.5 bg-brand-50 text-brand-600 text-[9px] font-black uppercase rounded-md border border-brand-100">{c.requested_punch_in || '—'}</span>
                          <span className="text-[9px] font-black text-slate-300">→</span>
                          <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[9px] font-black uppercase rounded-md border border-rose-100">{c.requested_punch_out || '—'}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 max-w-xs">
                        <p className="text-xs font-bold text-slate-500 italic">"{c.reason}"</p>
                      </td>
                      <td className="px-8 py-6 text-right space-x-3">
                        <button onClick={() => handleCorrectionAction(c.id, 'Rejected')} className="p-3 text-rose-500 hover:bg-rose-50 rounded-2xl transition"><XCircle className="w-6 h-6" /></button>
                        <button onClick={() => handleCorrectionAction(c.id, 'Approved')} className="p-3 text-emerald-500 hover:bg-emerald-50 rounded-2xl transition"><CheckCircle2 className="w-6 h-6" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'profiles' && (
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Name</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Employee ID</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Proposed Changes</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Reason</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {profileRequests.length === 0 ? (
                    <tr><td colSpan={5} className="py-24 text-center text-slate-300 font-black uppercase tracking-widest">No master data requests</td></tr>
                  ) : profileRequests.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition duration-300">
                      <td className="px-8 py-6">
                        <p className="font-bold text-slate-800">{r.employee_name || r.profiles?.full_name}</p>
                        <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest">{r.profiles?.branch}</p>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest">{r.employee_id || r.profiles?.employee_id}</p>
                      </td>
                      <td className="px-8 py-6 text-xs font-bold text-slate-700 space-y-1">
                        <p>Phone: {r.request_data.phone_number}</p>
                        <p>Bank: {r.request_data.bank_name}</p>
                        <p>A/C: {r.request_data.bank_account}</p>
                      </td>
                      <td className="px-8 py-6 max-w-xs">
                        <p className="text-xs font-bold text-slate-500 italic">"{r.reason}"</p>
                      </td>
                      <td className="px-8 py-6 text-right space-x-3">
                        <button onClick={() => handleProfileUpdateAction(r.id, 'Rejected', r)} className="p-3 text-rose-500 hover:bg-rose-50 rounded-2xl transition"><XCircle className="w-6 h-6" /></button>
                        <button onClick={() => handleProfileUpdateAction(r.id, 'Approved', r)} className="p-3 text-emerald-500 hover:bg-emerald-50 rounded-2xl transition"><CheckCircle2 className="w-6 h-6" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'balances' && (
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Name</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Employee ID</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">PL (Statutory)</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">SL (Medical)</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">CL (Casual)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {balances.map(b => (
                    <tr key={b.id} className="hover:bg-slate-50/50 transition duration-300">
                      <td className="px-8 py-6">
                        <p className="font-bold text-slate-800">{b.profiles?.full_name}</p>
                        <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest">{b.profiles?.branch}</p>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest">{b.profiles?.employee_id}</p>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center space-x-3">
                          <span className="text-lg font-black text-emerald-600">{b.pl_total - b.pl_used}</span>
                          <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: `${((b.pl_total - b.pl_used) / b.pl_total) * 100}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center space-x-3">
                          <span className="text-lg font-black text-rose-600">{b.sl_total - b.sl_used}</span>
                          <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-rose-500" style={{ width: `${((b.sl_total - b.sl_used) / b.sl_total) * 100}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center space-x-3">
                          <span className="text-lg font-black text-indigo-600">{b.cl_total - b.cl_used}</span>
                          <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500" style={{ width: `${((b.cl_total - b.cl_used) / b.cl_total) * 100}%` }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'devices' && (
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Name</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Employee ID</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Hardware Sig</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {devices.map(d => (
                    <tr key={d.id} className={`hover:bg-slate-50/50 transition duration-300 ${d.device_reset_requested ? 'bg-rose-50/30' : ''}`}>
                      <td className="px-8 py-6">
                        <p className="font-bold text-slate-800">{d.full_name}</p>
                        <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest">{d.branch}</p>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest">{d.employee_id}</p>
                      </td>
                      <td className="px-8 py-6">
                        {d.device_fingerprint ? (
                          <p className="font-mono text-[10px] text-slate-500 truncate max-w-xs bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">{d.device_fingerprint}</p>
                        ) : (
                          <span className="text-[10px] font-black text-slate-300 italic uppercase">Unbound</span>
                        )}
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button onClick={() => handleDeviceReset(d.id, d.device_reset_requested)} className={`px-5 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-lg transition ${
                          d.device_reset_requested ? 'bg-rose-500 text-white shadow-rose-500/20' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/10'
                        }`}>
                          {d.device_reset_requested ? 'Authorize Replace' : 'Full Reset'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
}
