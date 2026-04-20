import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const { token, punchId } = await req.json();

    if (!token || !punchId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Server configuration error: Missing Supabase keys' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

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

    // Capture the punch info for audit logs before deleting
    const { data: punchToDelete } = await supabaseAdmin
      .from('attendance')
      .select('*')
      .eq('id', punchId)
      .single();

    if (!punchToDelete) {
      return NextResponse.json({ error: 'Punch record not found' }, { status: 404 });
    }

    // Delete the punch
    const { error: deleteError } = await supabaseAdmin
      .from('attendance')
      .delete()
      .eq('id', punchId);

    if (deleteError) throw deleteError;

    // Optional: write an audit log
    await supabaseAdmin.from('audit_logs').insert({
      admin_id: adminUser.id,
      employee_id: punchToDelete.user_id,
      action_type: 'ADMIN_DELETE_PUNCH',
      old_value: punchToDelete,
      new_value: null,
      reason: 'Admin deleted punch from Calendar'
    });

    return NextResponse.json({ success: true, message: 'Punch properly deleted' });

  } catch (err: any) {
    console.error('Delete Punch Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
