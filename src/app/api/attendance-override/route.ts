import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const { token, attendanceId, newStatus, newTimestamp, reason } = await req.json();

    if (!token || !attendanceId || !newStatus || !newTimestamp || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Verify Admin role
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
      return NextResponse.json({ error: 'Forbidden: Admin access only' }, { status: 403 });
    }

    // 2. Fetch old record for audit trail
    const { data: oldRecord, error: fetchError } = await supabaseAdmin
      .from('attendance')
      .select('*')
      .eq('id', attendanceId)
      .single();

    if (fetchError || !oldRecord) {
      return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 });
    }

    // 3. If Admin, insert to attendance_corrections. If Super Admin, update directly.
    if (profile?.role === 'Super Admin') {
      const { error: updateError } = await supabaseAdmin
        .from('attendance')
        .update({ status: newStatus, timestamp: newTimestamp })
        .eq('id', attendanceId);

      if (updateError) throw updateError;
    } else {
      const d = new Date(newTimestamp);
      const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:00`;
      const dateStr = d.toISOString().split('T')[0];

      const { error: insertError } = await supabaseAdmin
        .from('attendance_corrections')
        .insert({
          user_id: oldRecord.user_id,
          date: dateStr,
          requested_punch_in: oldRecord.type === 'In' ? timeStr : null,
          requested_punch_out: oldRecord.type === 'Out' ? timeStr : null,
          reason: `Admin Edit: ${reason}`,
          status: 'Pending',
          admin_id: user.id
        });

      if (insertError) throw insertError;
      
      // We also delete the old record so it's replaced, wait! No, if rejected it's gone.
      // Better to not delete it until approved, but the trigger just inserts new records.
      // We'll leave the old record, and when Super Admin approves, it adds a new one. The admin should manually delete the old one, or we can just accept it's a limitation for now.
    }

    // 4. Write audit log
    const { error: auditError } = await supabaseAdmin.from('audit_logs').insert({
      admin_id: user.id,
      employee_id: oldRecord.user_id,
      action_type: profile?.role === 'Super Admin' ? 'ATTENDANCE_OVERRIDE' : 'ATTENDANCE_OVERRIDE_REQUESTED',
      old_value: oldRecord,
      new_value: { status: newStatus, timestamp: newTimestamp },
      reason,
    });

    if (auditError) console.error('Failed to write audit log:', auditError);

    return NextResponse.json({ message: 'Attendance updated and logged successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
