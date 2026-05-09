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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ success: false, error: 'Unauthorized' });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ success: false, error: 'Invalid Session' });

    const { data: globalSettings } = await supabaseAdmin.from('odoo_settings').select('url, db').maybeSingle();
    const { data: userSettings } = await supabaseAdmin.from('user_odoo_settings').select('odoo_username, odoo_api_key').eq('user_id', user.id).maybeSingle();

    if (!globalSettings?.url || !userSettings?.odoo_api_key) {
      return NextResponse.json({ success: false, error: 'Odoo not configured' });
    }

    const { url, db } = globalSettings;
    const { odoo_username: username, odoo_api_key: api_key } = userSettings;
    const cleanUrl = url.replace(/\/$/, '').replace('https://', '');
    
    const commonClient = xmlrpc.createSecureClient({ host: cleanUrl, port: 443, path: '/xmlrpc/2/common' });
    const uid = await callOdoo(commonClient, 'authenticate', [db, username, api_key, {}]);
    if (!uid) return NextResponse.json({ success: false, error: 'Auth Failed' });

    const modelsClient = xmlrpc.createSecureClient({ host: cleanUrl, port: 443, path: '/xmlrpc/2/object' });
    
    // Fetch activities for today or overdue
    const today = new Date().toISOString().split('T')[0];
    
    const activities = await callOdoo(modelsClient, 'execute_kw', [
      db, uid, api_key,
      'mail.activity', 'search_read',
      [[['user_id', '=', uid], ['date_deadline', '<=', today]]],
      { fields: ['id', 'summary', 'note', 'activity_type_id', 'date_deadline', 'res_name', 'res_model', 'res_id'], limit: 10 }
    ]);

    return NextResponse.json({ success: true, activities });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
