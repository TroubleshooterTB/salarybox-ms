import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { calculatePayroll } from '../../lib/payrollEngine';
import { 
  Calculator, Download, Lock, 
  Loader2, IndianRupee 
} from 'lucide-react';

export default function PayrollProcessor({ selectedBranch }: { selectedBranch: string }) {
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

      // 1. Fetch all profiles for the branch
      let profileQuery = supabase.from('profiles').select('*').eq('is_active', true);
      if (selectedBranch && selectedBranch !== 'All Branches') {
        profileQuery = profileQuery.eq('branch', selectedBranch);
      }
      const { data: profiles, error: pError } = await profileQuery;
      if (pError) throw pError;

      // 2. Fetch attendance, adjustments, and loans for all profiles in parallel
      const profileIds = profiles.map(p => p.id);
      
      const [
        { data: allAttendance },
        { data: allAdjustments },
        { data: allLoans }
      ] = await Promise.all([
        supabase.from('attendance').select('*').in('user_id', profileIds).gte('timestamp', startDate).lte('timestamp', endDate),
        supabase.from('payroll_adjustments').select('*').in('user_id', profileIds).eq('month_year', monthYear),
        supabase.from('loan_schedules').select('*').in('user_id', profileIds).eq('target_month', monthYear)
      ]);

      // 3. Process each employee
      const calculatedData = profiles.map(p => {
        const att = allAttendance?.filter(a => a.user_id === p.id) || [];
        const adj = allAdjustments?.find(a => a.user_id === p.id);
        const l = allLoans?.find(a => a.user_id === p.id);

        // Simple attendance aggregation
        const dayMap = new Map();
        att.forEach(r => {
          const d = new Date(r.timestamp).getDate();
          if (!dayMap.has(d)) dayMap.set(d, r);
        });
        
        let presentDays = 0, halfDays = 0, lateDays = 0;
        dayMap.forEach(r => {
          if (r.status === 'Present') presentDays++;
          else if (r.status === 'Half Day') halfDays++;
          else if (r.status === 'Late') { presentDays++; lateDays++; }
        });

        const payroll = calculatePayroll({
          baseSalary: p.ctc_amount || 0,
          year, month,
          presentDays, paidLeaves: 0, publicHolidays: 0, halfDays, lateDays,
          overtimeHours: 0, overtimeType: 'None', standardShiftHours: 8,
          loanDeduction: l?.deduction_amount || 0,
          professionalTaxApplicable: p.professional_tax_applicable !== false,
          joiningDate: p.joining_date,
          dateOfLeaving: p.date_of_leaving,
          bonus: adj?.bonus || 0,
          incentive: adj?.incentive || 0,
          fines: adj?.fines || 0,
          otherDeductions: adj?.other_deductions || 0,
          pfEnabled: p.pf_enabled,
          esiEnabled: p.esi_enabled
        });

        return { ...p, payroll };
      });

      setPayrollData(calculatedData);
    } catch (err: any) {
      alert('Payroll calculation failed: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleLockAndExport = async () => {
    if (!payrollData.length) return alert('Calculate payroll first');
    if (!window.confirm('Locking payroll will freeze attendance for this month. Proceed to Export?')) return;

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

      setIsLocked(true);
      alert('Payroll locked and export triggered!');
    } catch (err: any) {
      alert('Export failed: ' + err.message);
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
              onClick={handleLockAndExport} 
              disabled={processing || isLocked || !payrollData.length}
              className="flex items-center space-x-2 bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition disabled:opacity-50"
            >
              {isLocked ? <Lock className="w-4 h-4" /> : <Download className="w-4 h-4" />}
              <span>{isLocked ? 'Locked' : 'Lock & Export'}</span>
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
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">OT/Earned</th>
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
                       <span className="text-sm font-black text-slate-700">{p.payroll.payableDays.toFixed(1)}</span>
                       <p className="text-[10px] font-bold text-slate-400">/ {p.payroll.monthDays}</p>
                    </td>
                    <td className="px-6 py-5 text-right font-mono text-xs font-bold">
                       ₹{Math.round(p.payroll.baseMonthSalary).toLocaleString()}
                    </td>
                    <td className="px-6 py-5 text-right">
                       <p className="text-xs font-bold text-slate-800">₹{Math.round(p.payroll.totalEarnings).toLocaleString()}</p>
                       <p className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter">OT: ₹{Math.round(p.payroll.overtimePay)}</p>
                    </td>
                    <td className="px-6 py-5 text-right">
                       <p className="text-xs font-bold text-rose-500">₹{Math.round(p.payroll.totalDeductions).toLocaleString()}</p>
                       <p className="text-[9px] font-bold text-slate-400">Loans: ₹{Math.round(p.payroll.loanDeduction)}</p>
                    </td>
                    <td className="px-6 py-5 text-right">
                       <div className="bg-emerald-50 px-4 py-2 rounded-xl inline-block border border-emerald-100">
                          <span className="text-sm font-black text-emerald-700">₹{Math.round(p.payroll.netPay).toLocaleString()}</span>
                       </div>
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
