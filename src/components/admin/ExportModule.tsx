import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabase';
import { calculatePayroll, getDaysInMonth } from '../../lib/payrollEngine';
import { Download, FileSpreadsheet, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ExportModule({ selectedBranch }: { selectedBranch: string }) {
  const [loading, setLoading] = useState(false);

  // OT configuration is now dynamic per employee based on logs
  // No more global OT inputs

  // Default to current month
  const now = new Date();
  const [exportYear, setExportYear] = useState(now.getFullYear());
  const [exportMonth, setExportMonth] = useState(now.getMonth()); // 0-indexed
  const [isLocked, setIsLocked] = useState(false);
  const [locking, setLocking] = useState(false);

  const monthKey = `${exportYear}-${String(exportMonth + 1).padStart(2, '0')}`;

  const checkLockStatus = async () => {
    const { data } = await supabase.from('payroll_lockdown').select('*').eq('month_year', monthKey).maybeSingle();
    setIsLocked(!!data);
  };

  useEffect(() => {
    checkLockStatus();
  }, [exportYear, exportMonth]);

  const shiftMonth = (delta: number) => {
    let m = exportMonth + delta;
    let y = exportYear;
    if (m > 11) { m = 0; y++; }
    if (m < 0) { m = 11; y--; }
    setExportMonth(m);
    setExportYear(y);
  };

  const monthLabel = new Date(exportYear, exportMonth, 1).toLocaleString('default', { month: 'long', year: 'numeric' });

  const exportAttendance = async () => {
    setLoading(true);
    try {
      let profileQuery = supabase.from('profiles').select('*');
      if (selectedBranch && selectedBranch !== 'All Branches') {
        profileQuery = profileQuery.eq('branch', selectedBranch);
      }
      const { data: profiles } = await profileQuery;
      const startDate = new Date(exportYear, exportMonth, 1).toISOString();
      const endDate = new Date(exportYear, exportMonth + 1, 0, 23, 59, 59).toISOString();
      const { data: attendance } = await supabase.from('attendance').select('*').gte('timestamp', startDate).lte('timestamp', endDate);

      const formatTime = (ts: string) =>
        new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' });

      const rows = profiles?.map(p => {
        const pAtt = attendance?.filter(a => a.user_id === p.id) || [];
        const baseRow: any = { 'EMP ID': p.employee_id, 'Name': p.full_name, 'Branch': p.branch };
        const monthDays = getDaysInMonth(exportYear, exportMonth);
        for (let i = 1; i <= monthDays; i++) {
          // Parse IST day to handle UTC timestamps correctly
          const dayRecs = pAtt.filter(a => {
            const d = new Date(new Date(a.timestamp).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
            return d.getDate() === i;
          });

          const inPunch = dayRecs.filter(a => a.type === 'In').sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())[0];
          const outPunch = dayRecs.filter(a => a.type === 'Out').sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
          const lastRec = dayRecs.filter(a => a.type === 'Out').at(-1) ?? dayRecs.at(-1);

          let statusCode = '';
          if (lastRec?.status === 'Present') statusCode = 'P';
          else if (lastRec?.status === 'Half Day') statusCode = 'HD';
          else if (lastRec?.status === 'Late') statusCode = 'L';
          else if (lastRec?.status === 'Paid Leave') statusCode = 'PL';
          else if (lastRec?.status === 'Absent') statusCode = 'A';

          baseRow[`D${i}_Status`] = statusCode;
          baseRow[`D${i}_IN`] = inPunch ? formatTime(inPunch.timestamp) : '';
          baseRow[`D${i}_OUT`] = outPunch ? formatTime(outPunch.timestamp) : '';
        }
        return baseRow;
      }) || [];

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Attendance");
      XLSX.writeFile(wb, `Attendance_${monthLabel.replace(' ', '_')}.xlsx`);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const exportSalary = async () => {
    setLoading(true);
    try {
      let profileQuery = supabase.from('profiles').select('*');
      if (selectedBranch && selectedBranch !== 'All Branches') {
        profileQuery = profileQuery.eq('branch', selectedBranch);
      }
      const { data: profiles } = await profileQuery;
      
      const targetMonthStr = `${exportYear}-${String(exportMonth + 1).padStart(2, '0')}`;
      const startDate = new Date(exportYear, exportMonth, 1).toISOString();
      const endDate = new Date(exportYear, exportMonth + 1, 0, 23, 59, 59).toISOString();

      // Fetch everything: attendance, adjustments, branches, loans, leaves, and holidays
      const [
        { data: attendance }, 
        { data: adjustments }, 
        { data: branches }, 
        { data: loanSchedules },
        { data: approvedLeaves },
        { data: holidays }
      ] = await Promise.all([
        supabase.from('attendance').select('user_id, timestamp, type, status').gte('timestamp', startDate).lte('timestamp', endDate),
        supabase.from('payroll_adjustments').select('*').eq('month_year', targetMonthStr),
        supabase.from('branches').select('*'),
        supabase.from('loan_schedules').select('user_id, id, deduction_amount, is_processed').eq('target_month', targetMonthStr).eq('is_processed', false),
        supabase.from('leave_requests').select('*').eq('status', 'Approved').gte('start_date', startDate).lte('start_date', endDate),
        supabase.from('holidays').select('*').gte('date', startDate).lte('date', endDate)
      ]);

      const rows = await Promise.all((profiles || []).map(async p => {
        const pAtt = attendance?.filter(a => a.user_id === p.id) || [];
        const adj = adjustments?.find(a => a.user_id === p.id);

        // Group by calendar day for accurate counts
        const dayMap = new Map<number, any[]>();
        for (const rec of pAtt) {
          const d = new Date(rec.timestamp).getDate();
          if (!dayMap.has(d)) dayMap.set(d, []);
          dayMap.get(d)!.push(rec);
        }

        let presentDays = 0, halfDays = 0, lateDays = 0;
        let actualPaidHours = 0;

        for (const [, recs] of dayMap) {
          const sorted = [...recs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          
          // Calculate work duration for the day
          let dayWorkMs = 0;
          for (let i = 0; i < sorted.length - 1; i++) {
            if (sorted[i].type === 'In' && sorted[i+1].type === 'Out') {
              dayWorkMs += new Date(sorted[i+1].timestamp).getTime() - new Date(sorted[i].timestamp).getTime();
            }
          }
          actualPaidHours += dayWorkMs / 3600000;

          const last = recs.filter(r => r.type === 'Out').at(-1) ?? recs.at(-1);
          if (last?.status === 'Present') presentDays++;
          else if (last?.status === 'Half Day') halfDays++;
          else if (last?.status === 'Late') { presentDays++; lateDays++; }
        }

        const branchData = (branches || []).find(b => b.name === p.branch);
        let standardShiftHours = 8;
        if (branchData?.shift_start && branchData?.shift_end) {
          const [startH, startM] = branchData.shift_start.split(':').map(Number);
          const [endH, endM] = branchData.shift_end.split(':').map(Number);
          standardShiftHours = (endH + endM/60) - (startH + startM/60);
          if (standardShiftHours < 0) standardShiftHours += 24; // Handle night shifts
        }

        const expectedWorkHours = (presentDays + lateDays + (halfDays * 0.5)) * standardShiftHours;
        const overtimeHours = Math.max(0, actualPaidHours - expectedWorkHours);

        const loanSched = loanSchedules?.find(s => s.user_id === p.id);
        const loanDeduction = loanSched?.deduction_amount ?? 0;

        const employeeLeaves = (approvedLeaves || []).filter(l => l.user_id === p.id);
        const paidLeavesCount = employeeLeaves.reduce((acc, l) => {
          // Assuming leave_type is PL, SL, CL for paid leaves. Adjust if 'Unpaid' is also a type.
          if (l.leave_type !== 'Unpaid') {
            const start = new Date(l.start_date);
            const end = new Date(l.end_date);
            const days = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
            return acc + days;
          }
          return acc;
        }, 0);

        const holidaysCount = (holidays || []).length;

        const payroll = calculatePayroll({
          baseSalary: p.ctc_amount || 0,
          year: exportYear,
          month: exportMonth,
          presentDays,
          paidLeaves: paidLeavesCount,
          publicHolidays: holidaysCount, 
          halfDays,
          lateDays,
          overtimeHours,
          overtimeType: overtimeHours > 0 ? 'Hourly' : 'None',
          standardShiftHours: standardShiftHours,
          loanDeduction,
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

        // Mark loan as processed
        if (loanSched && loanDeduction > 0) {
          await supabase.from('loan_schedules').update({ is_processed: true }).eq('id', loanSched.id);
          const { data: latestLoan } = await supabase.from('loans').select('remaining_balance').eq('user_id', p.id).order('transaction_date', { ascending: false }).limit(1).single();
          const newBalance = Math.max(0, (latestLoan?.remaining_balance ?? 0) - loanDeduction);
          await supabase.from('loans').insert({
            user_id: p.id, type: 'Credit', loan_amount: loanDeduction, remaining_balance: newBalance, transaction_date: endDate
          });
        }

        return {
          'EMP ID': p.employee_id,
          'Name': p.full_name,
          'Branch': p.branch || '',
          'Designation': p.job_title || '',
          'Joining Date': p.joining_date || '',
          'A/C Details': p.bank_account_details || '',
          'Monthly Base CTC': payroll.baseMonthSalary.toFixed(0),
          'Prorated Base': payroll.proratedBaseSalary.toFixed(0),
          'Month Days': payroll.monthDays,
          'Payable Days': payroll.payableDays,
          'Gross Earned': payroll.grossEarned.toFixed(0),
          'Variable Bonus': payroll.bonus,
          'Incentive': payroll.incentive,
          'OT Pay': payroll.overtimePay.toFixed(0),
          'Total Earnings': payroll.totalEarnings.toFixed(0),
          'PT': payroll.deductions.pt,
          'EPF (Emp)': payroll.deductions.epf,
          'ESI (Emp)': payroll.deductions.esi,
          'LWF (Emp)': payroll.deductions.lwf,
          'Loan EMI': payroll.loanDeduction,
          'Fines/Penalties': payroll.fines + payroll.lateFine,
          'Total Deductions': payroll.totalDeductions.toFixed(0),
          'Net Take Home': payroll.netPay.toFixed(0),
          'EPF (Company)': payroll.employerContributions.epf,
          'ESI (Company)': payroll.employerContributions.esi,
          'Total CTC to Company': payroll.ctcToCompany.toFixed(0),
          'Remarks': adj?.remarks || ''
        };
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Salary_Register");
      XLSX.writeFile(wb, `Salary_${monthLabel.replace(' ', '_')}.xlsx`);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleLock = async () => {
    if (!window.confirm(`Are you sure you want to lock payroll for ${monthLabel}? This will prevent all attendance and leave edits for this period.`)) return;
    setLocking(true);
    const { error } = await supabase.from('payroll_lockdown').insert({ month_year: monthKey });
    if (!error) setIsLocked(true);
    setLocking(false);
  };

  return (
    <div className="p-12 max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-black tracking-tight text-slate-800">Export Centre</h2>
        <p className="text-slate-500 font-medium text-sm mt-1">Generate real payroll and attendance reports. All data is live from Supabase.</p>
      </div>

      {/* Month Selector & Lockdown Status */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Payroll Period</p>
            <div className="flex items-center space-x-3">
              <p className="text-xl font-black text-slate-800">{monthLabel}</p>
              {isLocked && (
                <span className="flex items-center space-x-1 px-2 py-0.5 bg-rose-500 text-white text-[9px] font-black uppercase rounded-md shadow-lg shadow-rose-500/20">
                  <Download className="w-3 h-3" /> Locked
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {!isLocked && (
            <button 
              onClick={handleLock}
              disabled={locking}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black uppercase tracking-widest rounded-xl transition flex items-center space-x-2"
            >
              {locking ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3 rotate-180" />}
              <span>Finalize & Lock</span>
            </button>
          )}
          <div className="flex items-center space-x-3 bg-slate-50 p-2 rounded-2xl border border-slate-200">
            <button onClick={() => shiftMonth(-1)} className="p-2 hover:bg-slate-200 rounded-xl transition text-slate-600"><ChevronLeft className="w-5 h-5" /></button>
            <span className="px-4 font-bold text-slate-700 min-w-[130px] text-center">{monthLabel}</span>
            <button onClick={() => shiftMonth(1)} className="p-2 hover:bg-slate-200 rounded-xl transition text-slate-600"><ChevronRight className="w-5 h-5" /></button>
          </div>
        </div>
      </div>

      {/* OT Summary Info */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Overtime Logic</p>
            <p className="text-sm font-bold text-slate-700">OT is automatically calculated from punch-logs (Work Hours - Shift Hours)</p>
          </div>
          <span className="px-3 py-1 text-[10px] font-black uppercase rounded-full border bg-brand-50 text-brand-700 border-brand-200">Automated</span>
        </div>
      </div>

      {/* Attendance Export */}
      <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-800 flex items-center space-x-2">
            <FileSpreadsheet className="w-6 h-6 text-emerald-500" />
            <span>Attendance Matrix — {monthLabel}</span>
          </h3>
          <p className="text-slate-500 text-sm mt-1 font-medium">Exact punch states (P/HD/L/A) mapped to each calendar day for the selected month.</p>
        </div>
        <button disabled={loading} onClick={exportAttendance} className="px-6 py-4 bg-slate-900 text-white font-bold rounded-xl flex items-center space-x-2 hover:bg-slate-800 transition shadow-lg shrink-0 disabled:opacity-50">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
          <span>Download Matrix</span>
        </button>
      </div>

      {/* Salary Export */}
      <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-800 flex items-center space-x-2">
            <FileSpreadsheet className="w-6 h-6 text-brand-500" />
            <span>Salary Register — {monthLabel}</span>
          </h3>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            Real present days · Dynamic month days ({getDaysInMonth(exportYear, exportMonth)} days this month) · Loan EMI deduction · EPF, PT, ESI · Bank & designation columns included.
          </p>
        </div>
        <button disabled={loading} onClick={exportSalary} className="px-6 py-4 bg-brand-500 text-white font-bold rounded-xl flex items-center space-x-2 hover:bg-brand-600 transition shadow-lg shadow-brand-500/20 shrink-0 disabled:opacity-50">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
          <span>Generate Register</span>
        </button>
      </div>
    </div>
  );
}
