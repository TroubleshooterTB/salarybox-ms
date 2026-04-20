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

      // 2. Fetch branches for OT settings
      const { data: branchesData } = await supabase.from('branches').select('name, overtime_applicable, overtime_hourly_rate, shift_start, shift_end');
      const branchMap = new Map((branchesData || []).map((b: any) => [b.name, b]));

      // 3. Fetch attendance, adjustments, and loans for all profiles in parallel
      const profileIds = profiles.map(p => p.id);
      
      const [
        { data: allAttendance },
        { data: allAdjustments },
        { data: allLoans },
        { data: allLeaves },
        { data: allHolidays }
      ] = await Promise.all([
        supabase.from('attendance').select('*').in('user_id', profileIds).gte('timestamp', startDate).lte('timestamp', endDate),
        supabase.from('payroll_adjustments').select('*').in('user_id', profileIds).eq('month_year', monthYear),
        supabase.from('loan_schedules').select('*').in('user_id', profileIds).eq('target_month', monthYear),
        supabase.from('leave_requests').select('*').in('user_id', profileIds).eq('status', 'Approved').lte('start_date', endDate.split('T')[0]),
        supabase.from('holidays').select('*').gte('date', startDate.split('T')[0]).lte('date', endDate.split('T')[0])
      ]);

      // 4. Process each employee
      const calculatedData = profiles.map(p => {
        const att = allAttendance?.filter(a => a.user_id === p.id) || [];
        const adj = allAdjustments?.find(a => a.user_id === p.id);
        const l = allLoans?.find(a => a.user_id === p.id);
        const lvs = allLeaves?.filter(l => l.user_id === p.id) || [];
        const branchInfo = branchMap.get(p.branch) as any;

        // Get branch shift start time for late calculation
        const shiftStartStr = branchInfo?.shift_start || '09:00';
        const [shiftH, shiftM] = shiftStartStr.split(':').map(Number);

        // Group by calendar day securely parsing UTC timestamps
        const dayMap = new Map<number, any[]>();
        att.forEach(r => {
          const rawDate = new Date(r.timestamp);
          const istDate = new Date(rawDate.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
          const d = istDate.getDate();
          if (!dayMap.has(d)) dayMap.set(d, []);
          dayMap.get(d)!.push(r);
        });

        let presentDays = 0, halfDays = 0, lateDays = 0, paidLeaves = 0;
        let weeklyOffOTDays = 0, weeklyOffOTHalfDays = 0;
        let totalOvertimeHours = 0; // hours worked beyond standard shift
        const publicHolidays = (allHolidays || []).length;

        const weeklyOffDay = p.weekly_off_day ?? 0; // default Sunday
        const monthDaysCount = new Date(year, month + 1, 0).getDate();

        for (let day = 1; day <= monthDaysCount; day++) {
          const records = dayMap.get(day) || [];
          const currentDate = new Date(year, month, day);
          
          const y = currentDate.getFullYear();
          const m = String(currentDate.getMonth() + 1).padStart(2, '0');
          const d = String(day).padStart(2, '0');
          const dateStr = `${y}-${m}-${d}`;
          
          const dayOfWeek = currentDate.getDay();
          const approvedLeave = lvs.find(lv => dateStr >= lv.start_date && dateStr <= lv.end_date);
          const isHolidayRecord = (allHolidays || []).some(h => dateStr === h.date);

          const inPunches = records.filter(r => r.type === 'In').sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          const outPunches = records.filter(r => r.type === 'Out').sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          
          let durationMins = 0;
          let firstInTime: Date | null = null;
          let lastOutRecord: any = null;

          if (inPunches.length > 0) {
            firstInTime = new Date(inPunches[0].timestamp);
            for (let i = 0; i < inPunches.length; i++) {
              const inT = new Date(inPunches[i].timestamp).getTime();
              const outP = outPunches.find(o => new Date(o.timestamp).getTime() > inT);
              if (outP && (!lastOutRecord || new Date(outP.timestamp).getTime() > new Date(lastOutRecord.timestamp).getTime())) {
                lastOutRecord = outP;
              }
            }
            durationMins = lastOutRecord ? Math.round((new Date(lastOutRecord.timestamp).getTime() - firstInTime.getTime()) / 60000) : 0;
          }

          const isWeeklyOff = weeklyOffDay >= 0 && dayOfWeek === weeklyOffDay;

          if (isWeeklyOff && !isHolidayRecord) {
            if (inPunches.length > 0) {
              const durationHrs = durationMins / 60;
              if (durationHrs < 5 || durationMins === 0) {
                weeklyOffOTHalfDays++;
              } else {
                weeklyOffOTDays++;
              }
            }
            if (!approvedLeave) {
               presentDays++; 
            } else {
               if (approvedLeave.is_half_day) halfDays++; else paidLeaves++;
            }
            continue;
          }

          if (isHolidayRecord && inPunches.length === 0) {
            continue;
          }

          if (inPunches.length > 0) {
            const istDate = new Date(firstInTime!.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
            const inMinutes = istDate.getHours() * 60 + istDate.getMinutes();
            const minsLate = inMinutes - (shiftH * 60 + shiftM);
            const durationHrs = durationMins / 60;
            const forcedStatus = lastOutRecord?.status;

            if (forcedStatus === 'Half Day' || (lastOutRecord && durationHrs > 0 && durationHrs < 4.5)) {
               halfDays++;
            } else if (durationHrs > 0 && durationHrs < 1.5) {
               // Barely present -> effectively absent
            } else {
               if (minsLate > 30) {
                 halfDays++;
               } else {
                 presentDays++;
                 if (minsLate > 0) lateDays++;
               }
            }

            if (lastOutRecord && durationMins > 480) {
              totalOvertimeHours += (durationMins - 480) / 60;
            }

          } else {
            if (records.length > 0) {
              const lastRecord = records[records.length - 1];
              if (lastRecord.status === 'Present') presentDays++;
              else if (lastRecord.status === 'Half Day') halfDays++;
              else if (lastRecord.status === 'Late') { presentDays++; lateDays++; }
              else if (lastRecord.status === 'Paid Leave') paidLeaves++;
            } else if (approvedLeave) {
              if (approvedLeave.is_half_day) halfDays++; else paidLeaves++;
            }
          }
        }

        const payroll = calculatePayroll({
          baseSalary: p.ctc_amount || 0,
          year, month,
          presentDays, paidLeaves, publicHolidays, halfDays, lateDays,
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
          esiEnabled: p.esi_enabled,
          // V2.5 new fields
          weeklyOffOTDays,
          weeklyOffOTHalfDays,
          branchOvertimeApplicable: branchInfo?.overtime_applicable || false,
          branchOvertimeHourlyRate: branchInfo?.overtime_hourly_rate || 0,
          branchOvertimeHours: totalOvertimeHours
        });

        return { ...p, payroll, weeklyOffOTDays, weeklyOffOTHalfDays, branchOTHours: Math.round(totalOvertimeHours * 10) / 10 };
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
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right text-violet-500">Weekly Off OT</th>
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
