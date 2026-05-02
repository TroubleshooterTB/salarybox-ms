import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabase';
import { calculatePayroll, getDaysInMonth } from '../../lib/payrollEngine';
import { Download, FileSpreadsheet, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ExportModule({ selectedBranch }: { selectedBranch: string }) {
  const [loading, setLoading] = useState(false);
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

      const [
        { data: attendance }, 
        { data: adjustments }, 
        { data: branches }, 
        { data: loanSchedules },
        { data: approvedLeaves },
        { data: holidays },
        { data: loans },
        { data: fieldVisits },
        { data: fieldVisitLogs }
      ] = await Promise.all([
        supabase.from('attendance').select('user_id, timestamp, type, status').gte('timestamp', startDate).lte('timestamp', endDate),
        supabase.from('payroll_adjustments').select('*').eq('month_year', targetMonthStr),
        supabase.from('branches').select('*'),
        supabase.from('loan_schedules').select('*').eq('target_month', targetMonthStr),
        supabase.from('leave_requests').select('*').eq('status', 'Approved').gte('start_date', startDate).lte('start_date', endDate),
        supabase.from('holidays').select('*').gte('date', startDate).lte('date', endDate),
        supabase.from('loans').select('*').order('transaction_date', { ascending: false }),
        supabase.from('field_visits').select('*').gte('start_time', startDate).lte('start_time', endDate),
        supabase.from('field_visit_logs').select('*').gte('timestamp', startDate).lte('timestamp', endDate)
      ]);

      const rows = await Promise.all((profiles || []).map(async p => {
        const pAtt = attendance?.filter(a => a.user_id === p.id) || [];
        const adj = adjustments?.find(a => a.user_id === p.id);
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

        // Field Visit KM Calculation
        const pVisits = fieldVisits?.filter(v => v.user_id === p.id) || [];
        let totalKm = 0;
        for (const v of pVisits) {
          // Check if there are any manual logs or logs with reports (selfies/checkpoints)
          const vLogs = fieldVisitLogs?.filter(l => l.visit_id === v.id) || [];
          const hasReport = vLogs.some(l => l.action !== 'Auto' || l.selfie_url);
          if (hasReport) {
            totalKm += v.total_km || 0;
          }
        }

        const branchData = (branches || []).find(b => b.name === p.branch);
        const standardShiftHours = branchData?.shift_hours || 8;
        const expectedWorkHours = (presentDays + lateDays + (halfDays * 0.5)) * standardShiftHours;
        const overtimeHours = Math.max(0, actualPaidHours - expectedWorkHours);
        const loanSched = loanSchedules?.find(s => s.user_id === p.id);
        const loanDeduction = loanSched?.deduction_amount ?? 0;
        const employeeLeaves = (approvedLeaves || []).filter(l => l.user_id === p.id);
        const paidLeavesCount = employeeLeaves.reduce((acc, l) => {
          if (l.leave_type !== 'Unpaid') {
            const start = new Date(l.start_date);
            const end = new Date(l.end_date);
            const days = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
            return acc + (l.is_half_day ? 0.5 : days);
          }
          return acc;
        }, 0);
        const holidaysCount = (holidays || []).length;
        const currentLoan = loans?.find(l => l.user_id === p.id);

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
          overtimeType: p.overtime_applicable ? 'Hourly' : 'None',
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
          esiEnabled: p.esi_enabled,
          overtimeHourlyRate: p.overtime_hourly_rate || 0,
          fieldVisitKm: totalKm,
          petrolAllowanceRate: p.petrol_allowance_rate || 3.75
        });

        return {
          'EMP ID': p.employee_id,
          'Name': p.full_name,
          'Branch': p.branch || '',
          'Designation': p.job_title || '',
          'Monthly Base CTC': payroll.baseMonthSalary.toFixed(0),
          'Payable Days': payroll.payableDays,
          'Gross Earned': payroll.grossEarned.toFixed(0),
          'OT Hours': payroll.overtimeHours.toFixed(2),
          'OT Pay': payroll.overtimePay.toFixed(0),
          'Field Visit KM': payroll.fieldVisitKm.toFixed(2),
          'Petrol Allowance': payroll.fieldVisitAllowance.toFixed(0),
          'Total Earnings': payroll.totalEarnings.toFixed(0),
          'Loan EMI': payroll.loanDeduction,
          'Loan Balance': currentLoan?.remaining_balance ?? 0,
          'Net Take Home': payroll.netPay.toFixed(0),
          'Total CTC to Company': payroll.ctcToCompany.toFixed(0)
        };
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Salary_Register");
      XLSX.writeFile(wb, `Salary_${monthLabel.replace(' ', '_')}.xlsx`);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const exportLeaves = async () => {
    setLoading(true);
    try {
      const { data: leaves } = await supabase.from('leave_requests').select('*, profiles(full_name, employee_id, branch)').order('created_at', { ascending: false });
      const rows = leaves?.map(l => ({
        'EMP ID': (l.profiles as any)?.employee_id,
        'Name': (l.profiles as any)?.full_name,
        'Branch': (l.profiles as any)?.branch,
        'Type': l.leave_type,
        'Start': l.start_date,
        'End': l.end_date,
        'Duration': l.is_half_day ? '0.5' : 'Full Day',
        'Status': l.status,
        'Reason': l.reason
      })) || [];
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Leave_Requests");
      XLSX.writeFile(wb, `Leave_Report_${monthLabel.replace(' ', '_')}.xlsx`);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const exportFieldVisits = async () => {
    setLoading(true);
    try {
      const startDate = new Date(exportYear, exportMonth, 1).toISOString();
      const endDate = new Date(exportYear, exportMonth + 1, 0, 23, 59, 59).toISOString();
      const { data: visits } = await supabase.from('field_visits').select('*, profiles(full_name, employee_id, petrol_allowance_rate)').gte('start_time', startDate).lte('start_time', endDate);
      const { data: logs } = await supabase.from('field_visit_logs').select('*');
      
      const rows = visits?.map(v => {
        const vLogs = logs?.filter(l => l.visit_id === v.id) || [];
        const hasReport = vLogs.some(l => l.action !== 'Auto' || l.selfie_url);
        const rate = (v.profiles as any)?.petrol_allowance_rate || 3.75;
        const allowance = hasReport ? (v.total_km * rate) : 0;

        return {
          'Date': v.date,
          'EMP ID': (v.profiles as any)?.employee_id,
          'Name': (v.profiles as any)?.full_name,
          'Start': new Date(v.start_time).toLocaleTimeString(),
          'End': v.end_time ? new Date(v.end_time).toLocaleTimeString() : 'Running',
          'KM Traveled': v.total_km,
          'Allowance Rate': rate,
          'Visit Allowance': allowance.toFixed(2),
          'Status': v.status,
          'Has Report': hasReport ? 'Yes' : 'No',
          'Checkpoints': vLogs.filter(l => l.action !== 'Auto').length,
          'Photos': vLogs.filter(l => l.selfie_url).map(l => l.selfie_url).join(', ')
        };
      }) || [];
      
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Detailed_Field_Visits");
      XLSX.writeFile(wb, `Field_Visit_Detailed_Report_${monthLabel.replace(' ', '_')}.xlsx`);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const exportLoanLedger = async () => {
    setLoading(true);
    try {
      const { data: loans } = await supabase.from('loans').select('*, profiles(full_name, employee_id)').order('transaction_date', { ascending: false });
      const rows = loans?.map(l => ({
        'Date': new Date(l.transaction_date).toLocaleDateString(),
        'EMP ID': (l.profiles as any)?.employee_id,
        'Name': (l.profiles as any)?.full_name,
        'Transaction Type': l.type,
        'Amount': l.loan_amount,
        'Remaining Balance': l.remaining_balance
      })) || [];
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Loan_Ledger");
      XLSX.writeFile(wb, `Loan_Ledger_Report.xlsx`);
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
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">Export Centre</h2>
          <p className="text-slate-500 font-medium text-sm mt-1">Generate comprehensive payroll, attendance, and activity reports.</p>
        </div>
        <div className="flex items-center space-x-4">
          {!isLocked && (
            <button onClick={handleLock} disabled={locking} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black uppercase tracking-widest rounded-xl transition flex items-center space-x-2">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
              <span>Attendance Matrix</span>
            </h3>
            <p className="text-slate-500 text-xs mt-1">Exact punch states (P/HD/L/A) for each calendar day.</p>
          </div>
          <button disabled={loading} onClick={exportAttendance} className="mt-4 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl flex items-center justify-center space-x-2 transition"><Download className="w-4 h-4" /><span>Download Matrix</span></button>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
              <FileSpreadsheet className="w-5 h-5 text-brand-500" />
              <span>Salary Register</span>
            </h3>
            <p className="text-slate-500 text-xs mt-1">Includes Base, OT, Field KM, Petrol Allowance, and Deductions.</p>
          </div>
          <button disabled={loading} onClick={exportSalary} className="mt-4 px-4 py-3 bg-brand-500 text-white font-bold rounded-xl flex items-center justify-center space-x-2 hover:bg-brand-600 transition"><Download className="w-4 h-4" /><span>Generate Register</span></button>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
              <FileSpreadsheet className="w-5 h-5 text-orange-500" />
              <span>Leave Report</span>
            </h3>
            <p className="text-slate-500 text-xs mt-1">All leave requests, statuses, and remaining balances.</p>
          </div>
          <button disabled={loading} onClick={exportLeaves} className="mt-4 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl flex items-center justify-center space-x-2 transition"><Download className="w-4 h-4" /><span>Export Leaves</span></button>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
              <FileSpreadsheet className="w-5 h-5 text-violet-500" />
              <span>Field Visit Detailed Report</span>
            </h3>
            <p className="text-slate-500 text-xs mt-1">Detailed logs, KM traveled, allowance per visit, and photo proofs.</p>
          </div>
          <button disabled={loading} onClick={exportFieldVisits} className="mt-4 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl flex items-center justify-center space-x-2 transition"><Download className="w-4 h-4" /><span>Export Detailed Visits</span></button>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 flex flex-col justify-between md:col-span-2">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
              <FileSpreadsheet className="w-5 h-5 text-rose-500" />
              <span>Loan Ledger Report</span>
            </h3>
            <p className="text-slate-500 text-xs mt-1">Full transaction history of disbursements, credits, and balances.</p>
          </div>
          <button disabled={loading} onClick={exportLoanLedger} className="mt-4 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl flex items-center justify-center space-x-2 transition"><Download className="w-4 h-4" /><span>Export Loan Ledger</span></button>
        </div>
      </div>
    </div>
  );
}
