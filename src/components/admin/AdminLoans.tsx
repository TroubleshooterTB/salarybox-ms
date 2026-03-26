import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { IndianRupee, Plus, CalendarClock, Search, Loader2 } from 'lucide-react';

export default function AdminLoans() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Forms
  const [disburseAmount, setDisburseAmount] = useState('');
  const [scheduleMonth, setScheduleMonth] = useState('');
  const [scheduleAmount, setScheduleAmount] = useState('');
  
  // View Data
  const [userLoans, setUserLoans] = useState<any[]>([]);
  const [userSchedules, setUserSchedules] = useState<any[]>([]);

  useEffect(() => {
    async function fetchProfiles() {
      const { data } = await supabase.from('profiles').select('id, full_name, employee_id').order('full_name');
      if (data) setProfiles(data);
      setLoading(false);
    }
    fetchProfiles();
  }, []);

  useEffect(() => {
    if (!selectedUser) {
      setUserLoans([]);
      setUserSchedules([]);
      return;
    }
    
    async function fetchUserData() {
      const { data: lData } = await supabase.from('loans').select('*').eq('user_id', selectedUser).order('transaction_date', { ascending: false });
      if (lData) setUserLoans(lData);
      
      const { data: sData } = await supabase.from('loan_schedules').select('*').eq('user_id', selectedUser).order('target_month', { ascending: true });
      if (sData) setUserSchedules(sData);
    }
    fetchUserData();
  }, [selectedUser]);

  const currentBalance = userLoans.length > 0 ? userLoans[0].remaining_balance : 0;

  const handleDisburse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !disburseAmount) return;

    const amount = parseFloat(disburseAmount);
    if (isNaN(amount) || amount <= 0) return alert("Invalid amount.");

    const newBalance = currentBalance + amount;

    const { error } = await supabase.from('loans').insert({
      user_id: selectedUser,
      type: 'Disbursement',
      loan_amount: amount,
      remaining_balance: newBalance,
      transaction_date: new Date().toISOString()
    });

    if (error) {
      alert("Error: " + error.message);
    } else {
      setDisburseAmount('');
      alert("Loan disbursed successfully.");
      // Refresh
      const { data } = await supabase.from('loans').select('*').eq('user_id', selectedUser).order('transaction_date', { ascending: false });
      if (data) setUserLoans(data);
    }
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !scheduleMonth || !scheduleAmount) return;

    const amount = parseFloat(scheduleAmount);
    if (isNaN(amount) || amount <= 0) return alert("Invalid amount.");

    const { error } = await supabase.from('loan_schedules').insert({
      user_id: selectedUser,
      target_month: scheduleMonth, // Format YYYY-MM
      deduction_amount: amount,
      is_processed: false
    });

    if (error) {
      alert("Error: " + error.message);
    } else {
      setScheduleMonth('');
      setScheduleAmount('');
      alert("EMI Schedule added successfully.");
      const { data } = await supabase.from('loan_schedules').select('*').eq('user_id', selectedUser).order('target_month', { ascending: true });
      if (data) setUserSchedules(data);
    }
  };

  const deleteSchedule = async (id: string) => {
    await supabase.from('loan_schedules').delete().eq('id', id);
    setUserSchedules(prev => prev.filter(s => s.id !== id));
  };

  const filteredProfiles = profiles.filter(p => 
    p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.employee_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto flex gap-8 h-full">
      {/* Left Sidebar: Select User */}
      <div className="w-80 bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 flex flex-col h-full overflow-hidden shrink-0">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center space-x-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search staff..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-sm font-semibold text-slate-700 w-full placeholder-slate-400" 
          />
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {loading ? (
             <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
          ) : filteredProfiles.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedUser(p.id)}
              className={`w-full text-left p-4 hover:bg-slate-50 transition ${selectedUser === p.id ? 'bg-brand-50 border-l-4 border-brand-500' : 'border-l-4 border-transparent'}`}
            >
              <p className={`font-bold text-sm ${selectedUser === p.id ? 'text-brand-700' : 'text-slate-800'}`}>{p.full_name}</p>
              <p className="text-xs font-bold text-slate-400 mt-0.5">{p.employee_id}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Right Content: Loan Operations */}
      <div className="flex-1 flex flex-col space-y-6 overflow-y-auto pb-12">
        <div className="mb-2">
          <h2 className="text-2xl font-black tracking-tight text-slate-800">Loan & EMI Ledger</h2>
          <p className="text-slate-500 font-medium text-sm">Disburse advances and schedule future EMI payroll deductions.</p>
        </div>

        {!selectedUser ? (
          <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center shadow-sm flex-1 flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <IndianRupee className="w-10 h-10 text-slate-300" />
            </div>
            <p className="font-bold text-slate-400">Select an employee from the sidebar to manage their loans.</p>
          </div>
        ) : (
          <>
            {/* Balance Overview */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 shadow-xl text-white relative overflow-hidden">
               <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
               <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Outstanding Balance</p>
               <h3 className="text-5xl font-black flex items-center">
                 <IndianRupee className="w-8 h-8 mr-2 opacity-50" /> {currentBalance.toLocaleString('en-IN')}
               </h3>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Form 1: Disburse */}
              <form onSubmit={handleDisburse} className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 p-6 flex flex-col">
                <h4 className="font-bold text-slate-800 flex items-center mb-6">
                   <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center mr-3"><Plus className="w-4 h-4" /></div>
                   Log New Disbursement
                </h4>
                
                <div className="space-y-4 flex-1">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Amount (₹)</label>
                    <input required value={disburseAmount} onChange={e=>setDisburseAmount(e.target.value)} type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 transition" />
                  </div>
                </div>

                <button type="submit" className="mt-6 w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition active:scale-95">Disburse Loan</button>
              </form>

              {/* Form 2: Schedule EMI */}
              <form onSubmit={handleSchedule} className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 p-6 flex flex-col">
                <h4 className="font-bold text-slate-800 flex items-center mb-6">
                   <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center mr-3"><CalendarClock className="w-4 h-4" /></div>
                   Schedule EMI Deduction
                </h4>
                
                <div className="space-y-4 flex-1">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target Month</label>
                      <input required value={scheduleMonth} onChange={e=>setScheduleMonth(e.target.value)} type="month" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-brand-500 transition" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">EMI Amount (₹)</label>
                      <input required value={scheduleAmount} onChange={e=>setScheduleAmount(e.target.value)} type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-brand-500 transition" />
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-slate-500">The total scheduled EMIs must not exceed the outstanding balance. The engine will automatically deduct this from the target month's payload.</p>
                </div>

                <button type="submit" className="mt-6 w-full py-3 bg-brand-500 text-white font-bold rounded-xl hover:bg-brand-600 transition shadow-lg shadow-brand-500/20 active:scale-95">Schedule EMI</button>
              </form>
            </div>

            {/* Schedules Table */}
            {userSchedules.length > 0 && (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                  <h4 className="font-bold text-slate-700 text-sm tracking-wide">Pending EMI Schedules</h4>
                </div>
                <table className="w-full text-left">
                  <thead className="bg-white">
                    <tr>
                      <th className="px-6 py-3 text-[10px] font-black tracking-widest text-slate-400 uppercase">Target Month</th>
                      <th className="px-6 py-3 text-[10px] font-black tracking-widest text-slate-400 uppercase">EMI Deductible</th>
                      <th className="px-6 py-3 text-[10px] font-black tracking-widest text-slate-400 uppercase">Status</th>
                      <th className="px-6 py-3 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {userSchedules.map(s => (
                      <tr key={s.id}>
                        <td className="px-6 py-3 font-bold text-slate-700 text-sm">{s.target_month}</td>
                        <td className="px-6 py-3 font-bold text-slate-700 text-sm">₹{s.deduction_amount}</td>
                        <td className="px-6 py-3">
                          {s.is_processed ? (
                            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-bold uppercase">Processed</span>
                          ) : (
                            <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-1 rounded font-bold uppercase">Pending Queue</span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-right">
                          {!s.is_processed && (
                            <button onClick={() => deleteSchedule(s.id)} className="text-[10px] font-bold text-rose-500 hover:underline">Cancel</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
