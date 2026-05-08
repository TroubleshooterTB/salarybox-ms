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

export async function GET() {
  try {
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('odoo_settings')
      .select('*')
      .maybeSingle();

    if (settingsError || !settings) {
      return NextResponse.json({ success: false, error: 'Odoo settings not configured.' });
    }

    const { url, db, username, api_key } = settings;
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
    
    // Fetch Projects (id, name, display_name, description)
    const projects = await callOdoo(modelsClient, 'execute_kw', [
      db, uid, api_key,
      'project.project', 'search_read',
      [[]], // Filter: all projects. You can add [['active', '=', true]] if needed
      { fields: ['id', 'name', 'display_name'] }
    ]);

    return NextResponse.json({ success: true, projects });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
