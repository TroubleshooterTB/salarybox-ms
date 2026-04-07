import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { token, userId, newPassword } = req.body;

  if (!token || !userId || !newPassword) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // 1. Verify that the requester is an Admin
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) throw new Error('Unauthorized');

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !['Admin', 'Super Admin'].includes(profile?.role)) {
      throw new Error('Forbidden: Admin access required');
    }

    // 2. Perform the password update
    const { error: resetError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword
    });

    if (resetError) throw resetError;

    // 3. Log the action
    await supabaseAdmin.from('audit_logs').insert({
        admin_id: user.id,
        employee_id: userId,
        action_type: 'PASSWORD_RESET',
        new_value: { status: 'success' },
        reason: 'Administrative override'
    });

    return res.status(200).json({ message: 'Password reset successful' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
