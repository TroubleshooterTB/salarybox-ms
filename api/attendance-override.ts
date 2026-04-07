import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { token, attendanceId, newStatus, newTimestamp, reason } = req.body;

  if (!token || !attendanceId || !newStatus || !newTimestamp || !reason) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // 1. Verify Admin role
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) throw new Error('Unauthorized');

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!['Admin', 'Super Admin'].includes(profile?.role)) {
      throw new Error('Forbidden: Admin access only');
    }

    // 2. Fetch old value for audit log
    const { data: oldRecord, error: fetchError } = await supabaseAdmin
      .from('attendance')
      .select('*')
      .eq('id', attendanceId)
      .single();

    if (fetchError || !oldRecord) throw new Error('Attendance record not found');

    // 3. Update attendance and insert audit log (using Supabase transaction-like sequential behavior)
    // Note: To be truly atomic, we'd use a Supabase RPC.
    const { error: updateError } = await supabaseAdmin
      .from('attendance')
      .update({ status: newStatus, timestamp: newTimestamp })
      .eq('id', attendanceId);

    if (updateError) throw updateError;

    const { error: auditError } = await supabaseAdmin.from('audit_logs').insert({
        admin_id: user.id,
        employee_id: oldRecord.user_id,
        action_type: 'ATTENDANCE_OVERRIDE',
        old_value: oldRecord,
        new_value: { status: newStatus, timestamp: newTimestamp },
        reason: reason
    });

    if (auditError) throw auditError;

    return res.status(200).json({ message: 'Attendance updated and logged successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
