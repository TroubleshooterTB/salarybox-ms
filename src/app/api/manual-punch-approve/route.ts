import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const { token, requestId, newStatus } = await req.json();

    if (!token || !requestId || !newStatus) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Verify Super Admin role
    const { data: { user: superAdminUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !superAdminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', superAdminUser.id)
      .single();

    if (adminProfile?.role !== 'Super Admin') {
      return NextResponse.json({ error: 'Forbidden: Super Admin access only' }, { status: 403 });
    }

    // 2. Fetch the request
    const { data: request, error: fetchError } = await supabaseAdmin
      .from('manual_punch_requests')
      .select('*, profiles:user_id(*)')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    if (newStatus === 'Approved') {
      if (request.action_type === 'ADD') {
        // Insert new punch
        const { error: insertError } = await supabaseAdmin.from('attendance').insert({
          user_id: request.user_id,
          type: request.punch_in ? 'In' : 'Out',
          timestamp: request.punch_in || request.punch_out,
          status: request.new_status,
          branch: request.profiles.branch,
          employee_name: request.profiles.full_name,
          employee_id: request.profiles.employee_id,
          address_string: `Super Admin Approved Manual Entry (${request.reason})`
        });
        if (insertError) throw insertError;
      } else if (request.action_type === 'UPDATE') {
        // Update existing punch
        const { error: updateError } = await supabaseAdmin.from('attendance').update({
          timestamp: request.punch_in || request.punch_out,
          status: request.new_status
        }).eq('id', request.target_attendance_id);
        if (updateError) throw updateError;
      } else if (request.action_type === 'DELETE') {
        // Delete punch
        const { error: deleteError } = await supabaseAdmin.from('attendance').delete().eq('id', request.target_attendance_id);
        if (deleteError) throw deleteError;
      }
    }

    // 3. Update request status
    const { error: finalUpdateError } = await supabaseAdmin
      .from('manual_punch_requests')
      .update({ status: newStatus })
      .eq('id', requestId);

    if (finalUpdateError) throw finalUpdateError;

    return NextResponse.json({ success: true, message: `Request ${newStatus.toLowerCase()} successfully` });

  } catch (err: any) {
    console.error('Manual Punch Approval Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
