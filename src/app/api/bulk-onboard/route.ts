import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { staffList, token } = await req.json();

    if (!staffList || !Array.isArray(staffList)) {
      return NextResponse.json({ error: 'Invalid staff list' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
      process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
    );

    // Verify caller identity and role
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !['Super Admin', 'Admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const results = [];

    for (const staff of staffList) {
      try {
        const email = `${staff.employee_id.toLowerCase().replace(/\s/g, '')}@minimalstroke.com`;

        // Create auth user
        const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: staff.password || 'password123',
          email_confirm: true,
          user_metadata: { full_name: staff.full_name, role: staff.role || 'Employee' },
        });

        if (authErr) throw authErr;

        // Create profile
        const { error: profErr } = await supabaseAdmin.from('profiles').insert({
          id: authData.user.id,
          full_name: staff.full_name,
          employee_id: staff.employee_id,
          branch: staff.branch,
          department: staff.department || 'Management',
          job_title: staff.job_title || 'Staff',
          role: staff.role || 'Employee',
          phone_number: staff.phone_number || '',
          joining_date: staff.joining_date || new Date().toISOString().split('T')[0],
          ctc_amount: parseFloat(staff.ctc_amount) || 0,
          salary_type: staff.salary_type || 'Monthly',
          pan_no: staff.pan_no || '',
          uan_no: staff.uan_no || '',
          pf_no: staff.pf_no || '',
          esi_no: staff.esi_no || '',
          bank_name: staff.bank_name || '',
          bank_ifsc: staff.bank_ifsc || '',
          bank_account_details: staff.bank_account_details || '',
          pf_enabled: staff.pf_enabled || false,
          esi_enabled: staff.esi_enabled || false,
          professional_tax_applicable: staff.professional_tax_applicable !== false,
          allow_remote_punch: staff.allow_remote_punch || false,
          employee_categories: staff.employee_categories || [],
          needs_password_reset: true,
        });

        if (profErr) throw profErr;

        // Default leave balances
        await supabaseAdmin.from('leaves').insert({
          user_id: authData.user.id,
          privilege_balance: 11,
          sick_balance: 4,
          casual_balance: 4,
        });

        results.push({ name: staff.full_name, status: 'success' });
      } catch (err: any) {
        results.push({ name: staff.full_name, status: 'error', message: err.message });
      }
    }

    return NextResponse.json({ results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
