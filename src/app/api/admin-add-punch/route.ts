import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const { token, userId, type, timestamp, status, reason } = await req.json();

    if (!token || !userId || !type || !timestamp || !status || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Server configuration error: Missing Supabase keys' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Verify Requesting Admin role
    const { data: { user: adminUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !adminUser) {
      return NextResponse.json({ error: 'Unauthorized: Session invalid' }, { status: 401 });
    }

    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', adminUser.id)
      .single();

    if (!['Admin', 'Super Admin'].includes(adminProfile?.role)) {
      return NextResponse.json({ error: 'Forbidden: Admin access only' }, { status: 403 });
    }

    // 2. Fetch the target employee's profile for branch info
    const { data: employeeProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('full_name, branch')
      .eq('id', userId)
      .single();

    if (profileError || !employeeProfile) {
      return NextResponse.json({ error: 'Target employee profile not found' }, { status: 404 });
    }

    // 3. Insert the manual punch record
    const { data: newPunch, error: insertError } = await supabaseAdmin
      .from('attendance')
      .insert({
        user_id: userId,
        type,
        timestamp,
        status,
        branch: employeeProfile.branch,
        address_string: `Admin Manual Entry (${reason})`,
        latitude: 0,
        longitude: 0,
        distance_from_branch: 0
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // 4. Write audit log
    const { error: auditError } = await supabaseAdmin.from('audit_logs').insert({
      admin_id: adminUser.id,
      employee_id: userId,
      action_type: 'ADMIN_ADD_PUNCH',
      old_value: null,
      new_value: newPunch,
      reason
    });

    if (auditError) console.error('Failed to write audit log:', auditError);

    return NextResponse.json({ 
      success: true, 
      message: 'Manual punch added successfully',
      data: newPunch
    });

  } catch (err: any) {
    console.error('Admin Add Punch Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
