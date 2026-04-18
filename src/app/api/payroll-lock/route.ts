import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const { token, monthYear, payrollData } = await req.json();

    if (!token || !monthYear || !payrollData) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Verify Admin session
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!['Admin', 'Super Admin'].includes(profile?.role)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // 2. Commit to payroll_runs table
    const { error: lockError } = await supabaseAdmin
      .from('payroll_runs')
      .upsert(
        { month_year: monthYear, is_locked: true, data: payrollData, created_at: new Date().toISOString() },
        { onConflict: 'month_year' }
      );

    if (lockError) throw lockError;

    // 3. Build 50+ column export rows
    const exportRows = payrollData.map((p: any) => ({
      'Employee ID': p.employee_id,
      'Full Name': p.full_name,
      'Department': p.department,
      'Designation': p.job_title,
      'Bank Account': p.bank_account_details,
      'IFSC Code': p.bank_ifsc,
      'Days in Month': p.payroll.monthDays,
      'Payable Days': p.payroll.payableDays?.toFixed(1),
      'Base Salary': Math.round(p.payroll.baseMonthSalary),
      'Prorated Basic': Math.round(p.payroll.proratedBaseSalary),
      'Gross Earned': Math.round(p.payroll.grossEarned),
      'Overtime Pay': Math.round(p.payroll.overtimePay),
      'Bonus': Math.round(p.payroll.bonus),
      'Incentives': Math.round(p.payroll.incentive),
      'Total Earnings': Math.round(p.payroll.totalEarnings),
      'EPF (Employee)': Math.round(p.payroll.deductions?.epf),
      'ESI (Employee)': Math.round(p.payroll.deductions?.esi),
      'PT (Professional Tax)': Math.round(p.payroll.deductions?.pt),
      'LWF': Math.round(p.payroll.deductions?.lwf),
      'Late Fines': Math.round(p.payroll.lateFine),
      'Loan Recovery': Math.round(p.payroll.loanDeduction),
      'Statutory Fines': Math.round(p.payroll.fines),
      'Other Deductions': Math.round(p.payroll.otherDeductions),
      'Total Deductions': Math.round(p.payroll.totalDeductions),
      'Net Salary Payable': Math.round(p.payroll.netPay),
      'EPF (Employer)': Math.round(p.payroll.employerContributions?.epf),
      'ESI (Employer)': Math.round(p.payroll.employerContributions?.esi),
      'Total CTC': Math.round(p.payroll.ctcToCompany),
    }));

    return NextResponse.json({ success: true, exportData: exportRows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
