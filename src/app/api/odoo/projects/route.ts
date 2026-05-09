import { NextResponse } from 'next/server';
import xmlrpc from 'xmlrpc';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const callOdoo = (client: any, method: string, args: any[]) => {
  return new Promise((resolve, reject) => {
    client.methodCall(method, args, (err: any, value: any) => {
      if (err) reject(err);
      else resolve(value);
    });
  });
};

export async function GET(req: Request) {
  try {
    // Get auth token from header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ success: false, error: 'Unauthorized' });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) return NextResponse.json({ success: false, error: 'Invalid Session' });

    // 1. Get Global Odoo Settings
    const { data: globalSettings } = await supabaseAdmin
      .from('odoo_settings')
      .select('url, db')
      .maybeSingle();

    if (!globalSettings?.url) return NextResponse.json({ success: false, error: 'Company Odoo URL not configured.' });

    // 2. Get User's Personal Odoo Settings
    const { data: userSettings } = await supabaseAdmin
      .from('user_odoo_settings')
      .select('odoo_username, odoo_api_key')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!userSettings?.odoo_api_key) {
      return NextResponse.json({ success: false, error: 'Personal Odoo account not linked.' });
    }

    const { url, db } = globalSettings;
    const { odoo_username: username, odoo_api_key: api_key } = userSettings;
    const cleanUrl = url.replace(/\/$/, '').replace('https://', '');
    
    const commonClient = xmlrpc.createSecureClient({
      host: cleanUrl,
      port: 443,
      path: '/xmlrpc/2/common'
    });

    const uid = await callOdoo(commonClient, 'authenticate', [db, username, api_key, {}]);
    if (!uid) return NextResponse.json({ success: false, error: 'Auth Failed' });

    const modelsClient = xmlrpc.createSecureClient({
      host: cleanUrl,
      port: 443,
      path: '/xmlrpc/2/object'
    });
    
    // 1. Find "Field Visit Plan" Stage ID
    let planStageId: number | null = null;
    try {
      const stages: any = await callOdoo(modelsClient, 'execute_kw', [
        db, uid, api_key,
        'crm.stage', 'search_read',
        [[['name', 'ilike', '%Field Visit Plan%']]],
        { fields: ['id'], limit: 1 }
      ]);
      if (stages && stages.length > 0) {
        planStageId = stages[0].id;
      }
    } catch (e) {
      console.error('Error finding plan stage ID:', e);
    }

    // 2. Fetch Opportunities in "Field Visit Plan" stage assigned to THIS user
    const domain: any[] = [['user_id', '=', uid]];
    if (planStageId) {
      domain.push(['stage_id', '=', planStageId]);
    }

    const projects = await callOdoo(modelsClient, 'execute_kw', [
      db, uid, api_key,
      'crm.lead', 'search_read',
      [domain], 
      { fields: ['id', 'name', 'display_name', 'contact_name', 'street', 'email_from', 'phone'] }
    ]);

    return NextResponse.json({ success: true, projects });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
