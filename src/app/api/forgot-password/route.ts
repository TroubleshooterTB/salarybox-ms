import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { employeeId } = await req.json();

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    // 1. Check if profile exists
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, employee_id')
      .eq('employee_id', employeeId)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) {
      return NextResponse.json({ error: 'Employee ID not found' }, { status: 404 });
    }

    // 2. Register the request in the database
    const { error: requestError } = await supabaseAdmin
      .from('password_reset_requests')
      .insert({
        employee_id: profile.employee_id,
        full_name: profile.full_name,
        status: 'pending'
      });

    if (requestError) throw requestError;

    // 3. TODO: Send Email Notification to business@minimalstroke.com
    // For now, we log it. You'll need to configure an SMTP or service like Resend here.
    console.log(`[PASSWORD RESET REQUEST] Employee: ${profile.full_name} (${profile.employee_id})`);
    
    // In a production environment, you would use something like:
    // await sendEmail({
    //   to: 'business@minimalstroke.com',
    //   subject: 'Password Reset Request',
    //   text: `Employee ${profile.full_name} ID: ${profile.employee_id} has requested a password reset.`
    // });

    return NextResponse.json({ success: true, message: 'Reset request submitted to Super Admin.' });
  } catch (err: any) {
    console.error('Forgot Password Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
