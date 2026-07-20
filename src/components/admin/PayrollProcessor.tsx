import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { calculatePayroll, processEmployeePayroll } from '../../lib/payrollEngine';
import { fetchInChunks } from '../../lib/chunkedFetch';
import { Calculator, Download, Lock, Loader2, IndianRupee } from 'lucide-react';
import useStore from '../../store';

export default function PayrollProcessor({ selectedBranch }: { selectedBranch: string }) {
  const { userRole } = useStore();
  const [monthYear, setMonthYear] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [payrollData, setPayrollData] = useState<any[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [processing, setProcessing] = useState(false);

  const calculateTotalPayroll = async () => {
    setProcessing(true);
    try {
      const [year, monthStr] = monthYear.split('-').map(Number);
      const month = monthStr - 1;
      const startDate = new Date(year, month, 1).toISOString();
      const endDate = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

      // 1. Fetch all profiles for the branch (removed is_active filter due to missing column)
      let profileQuery = supabase.from('profiles').select('*');
      if (selectedBranch && selectedBranch !== 'All Branches') {
        profileQuery = profileQuery.eq('branch', selectedBranch);
      }
      const { data: profiles, error: pError } = await profileQuery;
      if (pError) throw pError;

      // 2. Fetch branches for OT settings
      const { data: branchesData } = await supabase.from('branches').select('name, overtime_applicable, overtime_hourly_rate, shift_start, shift_end');
      const branchMap = new Map((branchesData || []).map((b: any) => [b.name, b]));

      // 3. Fetch attendance, adjustments, and loans for all profiles in parallel
      const profileIds = profiles.map(p => p.id);
      
      const [
        allAttendance,
        allAdjustments,
        allLoans,
        allLeaves,
        { data: allHolidays },
        allFieldVisits
      ] = await Promise.all([
        fetchInChunks('attendance', 'user_id', profileIds, q => q.gte('timestamp', startDate).lte('timestamp', endDate)),
        fetchInChunks('payroll_adjustments', 'profile_id', profileIds, q => q.eq('month_year', monthYear)),
        fetchInChunks('loan_schedules', 'user_id', profileIds, q => q.eq('target_month', monthYear)),
        fetchInChunks('leave_requests', 'user_id', profileIds, q => q.eq('status', 'Approved').lte('start_date', endDate.split('T')[0]).gte('end_date', startDate.split('T')[0])),
        supabase.from('holidays').select('*').gte('date', startDate.split('T')[0]).lte('date', endDate.split('T')[0]),
        fetchInChunks('field_visits', 'user_id', profileIds, q => q.gte('start_time', startDate).lte('start_time', endDate))
      ]);

      // Fetch field visit logs separately using actual visit IDs
      const visitIds = (allFieldVisits || []).map((v: any) => v.id);
      let allFieldVisitLogs: any[] | null = [];
      if (visitIds.length > 0) {
        const { data } = await supabase.from('field_visit_logs').select('*').in('visit_id', visitIds);
        allFieldVisitLogs = data;
      }

      // 4. Process each employee
      const calculatedData = profiles.map(p => {
        const att = allAttendance?.filter(a => a.user_id === p.id) || [];
        const adj = allAdjustments?.find(a => a.profile_id === p.id);
        const l = allLoans?.filter(a => a.user_id === p.id).reduce((sum, current) => sum + (current.deduction_amount || 0), 0) || 0;
        const lvs = allLeaves?.filter(l => l.user_id === p.id) || [];
        const branchInfo = branchMap.get(p.branch) as any;

        return processEmployeePayroll(p, year, month, att, adj, l, lvs, branchInfo, allHolidays || [], allFieldVisits || [], allFieldVisitLogs || []);
      });

      setPayrollData(calculatedData);
    } catch (err: any) {
      alert('Payroll calculation failed: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };


  const handleSaveAndExport = async () => {
    if (!payrollData.length) return alert('Calculate payroll first');
    if (!window.confirm('Save this batch to the database and generate a CSV? This will not lock the month.')) return;

    setProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/payroll-lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: session?.access_token,
          monthYear,
          payrollData
        })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      // Trigger CSV Download
      const headers = Object.keys(result.exportData[0]).join(',');
      const rows = result.exportData.map((row: any) => 
        Object.values(row).map(val => `"${val}"`).join(',')
      ).join('\n');
      
      const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `payroll_${monthYear}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert('Payroll saved and export triggered!');
    } catch (err: any) {
      alert('Export failed: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleLockIndividual = async (p: any) => {
    if (!window.confirm(`Lock payroll for ${p.full_name}? This will securely append their verified data to the month's final registry.`)) return;
    setProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/payroll-lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: session?.access_token,
          monthYear,
          payrollData: [p]
        })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      
      alert(`${p.full_name}'s payroll has been locked successfully!`);
    } catch (err: any) {
      alert('Lock failed: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col h-screen overflow-hidden">
      <div className="flex justify-between items-center mb-8 shrink-0">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-800">Final Payroll Engine</h2>
          <p className="text-slate-500 font-medium">Locked matrix generation and CSV export for {monthYear}.</p>
        </div>
        <div className="flex items-center space-x-4">
           <input 
              type="month" 
              value={monthYear} 
              onChange={(e) => setMonthYear(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-500/20"
           />
           <button 
              onClick={calculateTotalPayroll} 
              disabled={processing}
              className="flex items-center space-x-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-900/20 hover:bg-black transition"
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
              <span>Verify Matrix</span>
           </button>
           <button 
              onClick={handleSaveAndExport} 
              disabled={processing || !payrollData.length || userRole !== 'Super Admin'}
              className="flex items-center space-x-2 bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition disabled:opacity-50"
              title={userRole !== 'Super Admin' ? 'Only Super Admin can save & export payroll' : ''}
            >
              <Download className="w-4 h-4" />
              <span>{userRole === 'Super Admin' ? 'Save & Export CSV' : 'Super Admin Only'}</span>
           </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/40 border border-slate-100 flex-1 overflow-hidden flex flex-col">
        {payrollData.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-20 text-center">
             <IndianRupee className="w-16 h-16 mb-4 opacity-10" />
             <p className="font-black uppercase tracking-widest text-xs">Run verification to generate the matrix for {monthYear}.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Employee</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Days</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Basic</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Total Earned</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right text-emerald-500">OT Hours</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right text-violet-500">OT Days</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right text-blue-500">Field Visit</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right text-amber-500">Branch OT</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right text-rose-500">Deductions</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right text-emerald-600">Net Pay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {payrollData.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-5">
                       <span className="font-bold text-slate-800">{p.full_name}</span>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{p.employee_id}</p>
                    </td>
                    <td className="px-6 py-5 text-center">
                       <span className="text-sm font-black text-slate-700">{(p.payroll.payableDays + p.weeklyOffOTDays + (p.weeklyOffOTHalfDays * 0.5) + p.payroll.holidayOTDays + (p.payroll.holidayOTHalfDays * 0.5)).toFixed(1)}</span>
                       <p className="text-[10px] font-bold text-slate-400">/ {p.payroll.monthDays}</p>
                       {p.attendanceStats && (
                         <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-tighter" title="Present + WeekOff + Leave + Holiday">
                           {p.attendanceStats.presentDays + (p.attendanceStats.halfDays * 0.5)}P • {p.attendanceStats.paidWeekOffs}W • {p.attendanceStats.paidLeaves}L • {p.attendanceStats.publicHolidays}H
                         </p>
                       )}
                    </td>
                    <td className="px-6 py-5 text-right font-mono text-xs font-bold">
                       ₹{Math.round(p.payroll.baseMonthSalary).toLocaleString()}
                    </td>
                    <td className="px-6 py-5 text-right">
                       <p className="text-xs font-bold text-slate-800">₹{Math.round(p.payroll.totalEarnings).toLocaleString()}</p>
                    </td>
                    <td className="px-6 py-5 text-right">
                       {p.payroll.overtimeHours > 0 ? (
                         <div>
                           <p className="text-xs font-black text-emerald-600">₹{Math.round(p.payroll.overtimePay).toLocaleString()}</p>
                           <p className="text-[9px] font-bold text-emerald-400">{p.payroll.overtimeHours.toFixed(1)}h OT</p>
                         </div>
                       ) : (
                         <span className="text-[10px] text-slate-300 font-bold">—</span>
                       )}
                    </td>
                    <td className="px-6 py-5 text-right">
                       {(p.weeklyOffOTDays > 0 || p.weeklyOffOTHalfDays > 0) ? (
                         <div>
                           <p className="text-xs font-black text-violet-700">₹{Math.round(p.payroll.weeklyOffOTPay).toLocaleString()}</p>
                           <p className="text-[9px] font-bold text-violet-400">
                             {p.weeklyOffOTDays}d + {p.weeklyOffOTHalfDays}½d
                           </p>
                         </div>
                       ) : (
                         <span className="text-[10px] text-slate-300 font-bold">—</span>
                       )}
                    </td>
                    <td className="px-6 py-5 text-right">
                       {p.payroll.fieldVisitKm > 0 ? (
                         <div>
                           <p className="text-xs font-black text-blue-700">₹{Math.round(p.payroll.fieldVisitAllowance).toLocaleString()}</p>
                           <p className="text-[9px] font-bold text-blue-400">{p.payroll.fieldVisitKm.toFixed(1)} KM</p>
                         </div>
                       ) : (
                         <span className="text-[10px] text-slate-300 font-bold">—</span>
                       )}
                    </td>
                    <td className="px-6 py-5 text-right">
                       {p.payroll.branchOTPay > 0 ? (
                         <div>
                           <p className="text-xs font-black text-amber-700">₹{Math.round(p.payroll.branchOTPay).toLocaleString()}</p>
                           <p className="text-[9px] font-bold text-amber-400">{p.branchOTHours}h OT</p>
                         </div>
                       ) : (
                         <span className="text-[10px] text-slate-300 font-bold">—</span>
                       )}
                    </td>
                    <td className="px-6 py-5 text-right">
                       <p className="text-xs font-bold text-rose-500">₹{Math.round(p.payroll.totalDeductions).toLocaleString()}</p>
                       <p className="text-[9px] font-bold text-slate-400">Loans: ₹{Math.round(p.payroll.loanDeduction)}</p>
                    </td>
                    <td className="px-6 py-5 text-right flex flex-col items-end space-y-2">
                       <div className="bg-emerald-50 px-4 py-2 rounded-xl inline-block border border-emerald-100">
                          <span className="text-sm font-black text-emerald-700">₹{Math.round(p.payroll.netPay).toLocaleString()}</span>
                       </div>
                       <button 
                         onClick={() => handleLockIndividual(p)}
                         disabled={userRole !== 'Super Admin'}
                         className="text-[9px] font-bold text-slate-500 hover:text-emerald-600 uppercase flex items-center space-x-1 transition"
                       >
                         <Lock className="w-3 h-3" />
                         <span>Lock Individual</span>
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
}
