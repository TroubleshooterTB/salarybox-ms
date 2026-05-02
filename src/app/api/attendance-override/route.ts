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

    // 3. If Admin, insert to manual_punch_requests. If Super Admin, update directly.
    if (profile?.role === 'Super Admin') {
      const { error: updateError } = await supabaseAdmin
        .from('attendance')
        .update({ status: newStatus, timestamp: newTimestamp })
        .eq('id', attendanceId);

      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabaseAdmin
        .from('manual_punch_requests')
        .insert({
          user_id: oldRecord.user_id,
          admin_id: user.id,
          action_type: 'UPDATE',
          target_attendance_id: attendanceId,
          date: newTimestamp.split('T')[0],
          punch_in: oldRecord.type === 'In' ? newTimestamp : null,
          punch_out: oldRecord.type === 'Out' ? newTimestamp : null,
          new_status: newStatus,
          reason,
          status: 'Pending'
        });

      if (insertError) throw insertError;
      
      return NextResponse.json({ message: 'Edit request sent for Super Admin approval' });
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
