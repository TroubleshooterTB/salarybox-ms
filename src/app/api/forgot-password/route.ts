import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { employeeId } = await req.json();

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gxekdcwwzebvtxdlddkb.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    // 1. Check if profile exists (Case Insensitive)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, employee_id')
      .ilike('employee_id', employeeId)
      .maybeSingle();

    if (profileError) {
      console.error('Database Profile Lookup Error:', profileError);
      return NextResponse.json({ error: 'Database error occurred while searching for profile.' }, { status: 500 });
    }

    if (!profile) {
      return NextResponse.json({ error: `Employee ID "${employeeId}" not found in our records.` }, { status: 404 });
    }

    // 2. Register the request in the database
    const { error: requestError } = await supabaseAdmin
      .from('password_reset_requests')
      .insert({
        employee_id: profile.employee_id,
        full_name: profile.full_name,
        status: 'pending'
      });

    if (requestError) {
      console.error('Database Request Insert Error:', requestError);
      return NextResponse.json({ error: 'Failed to record the reset request in the database.' }, { status: 500 });
    }

    // 3. Send Email Notification to business@minimalstroke.com using Resend API (via fetch)
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    
    if (RESEND_API_KEY) {
      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'SalaryBOX Admin <onboarding@resend.dev>', 
            to: ['business@minimalstroke.com'],
            subject: `Password Reset Request: ${profile.full_name}`,
            html: `
              <div style="font-family: sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #0ea5e9;">Password Reset Request</h2>
                <p>A password reset has been requested for the following employee:</p>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Employee Name:</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${profile.full_name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Employee ID:</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${profile.employee_id}</td>
                  </tr>
                </table>
                <p>Please log in to the <strong>Staff Management</strong> dashboard to approve this request.</p>
                <p style="font-size: 12px; color: #777; margin-top: 30px;">
                  This is an automated notification from the Minimal Stroke ERP.
                </p>
              </div>
            `,
          }),
        });

        if (!emailResponse.ok) {
          const errorData = await emailResponse.json();
          console.error('Resend Email Provider Error:', errorData);
          // Still return 200/success to the UI but log the email failure carefully server-side
          // Or if you want to notify the user of email failure:
          // return NextResponse.json({ error: `Request recorded, but notification email failed to send: ${errorData.message}` }, { status: 500 });
        }
      } catch (e: any) {
        console.error('Resend Fetch Exception:', e.message);
      }
    } else {
      console.warn('RESEND_API_KEY not found in environment variables.');
    }

    return NextResponse.json({ success: true, message: 'Reset request submitted to Super Admin.' });
  } catch (err: any) {
    console.error('Forgot Password Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
