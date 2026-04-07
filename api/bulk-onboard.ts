import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { staffList, token } = req.body;

  if (!staffList || !Array.isArray(staffList)) {
    return res.status(400).json({ error: 'Invalid staff list' });
  }

  // 1. Initialize Supabase Admin
  const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
  );

  // 2. Security Check: Verify caller's identity and role
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || !['Super Admin', 'Admin'].includes(profile.role)) {
    return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
  }

  const results = [];

  // 3. Process the list
  for (const staff of staffList) {
    try {
      const email = `${staff.employee_id.toLowerCase().replace(/\s/g, '')}@minimalstroke.com`;
      
      // A. Create Auth User
      const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: staff.password || 'password123',
        email_confirm: true,
        user_metadata: { full_name: staff.full_name, role: staff.role || 'Employee' }
      });

      if (authErr) throw authErr;

      // B. Create Profile
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
        employee_category: staff.employee_category || null,
        needs_password_reset: true
      });

      if (profErr) throw profErr;

      // C. Setup default leaves
      await supabaseAdmin.from('leaves').insert({
        user_id: authData.user.id, privilege_balance: 11, sick_balance: 4, casual_balance: 4
      });

      results.push({ name: staff.full_name, status: 'success' });
    } catch (err: any) {
      results.push({ name: staff.full_name, status: 'error', message: err.message });
    }
  }

  return res.status(200).json({ results });
}
