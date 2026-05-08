import { NextResponse } from 'next/server';
import xmlrpc from 'xmlrpc';
import { createClient } from '@supabase/supabase-js';

// Internal server-side supabase client to avoid issues with env vars in API routes
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

export async function POST(req: Request) {
  try {
    const { name, street, rating, place_id, category } = await req.json();

    // 1. Get Odoo Settings from Supabase
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('odoo_settings')
      .select('*')
      .maybeSingle();

    if (settingsError || !settings) {
      return NextResponse.json({ 
        success: false, 
        error: 'Odoo settings not configured. Go to Admin > Settings to link Odoo Online.' 
      });
    }

    const { url, db, username, api_key } = settings;
    // Odoo Online URLs are like https://company.odoo.com
    const cleanUrl = url.replace(/\/$/, '').replace('https://', '');
    
    // 2. Authenticate
    const commonClient = xmlrpc.createSecureClient({
      host: cleanUrl,
      port: 443,
      path: '/xmlrpc/2/common'
    });

    const uid = await callOdoo(commonClient, 'authenticate', [db, username, api_key, {}]);

    if (!uid) {
      return NextResponse.json({ success: false, error: 'Odoo Authentication Failed.' });
    }

    // 3. Create Lead
    const modelsClient = xmlrpc.createSecureClient({
      host: cleanUrl,
      port: 443,
      path: '/xmlrpc/2/object'
    });
    
    const leadData = {
      name: `[Discovery] ${name}`,
      street: street,
      description: `Rating: ${rating}\nCategory: ${category}\nGoogle Place ID: ${place_id}`,
      type: 'lead',
    };

    const leadId = await callOdoo(modelsClient, 'execute_kw', [
      db, uid, api_key,
      'crm.lead', 'create',
      [leadData]
    ]);

    return NextResponse.json({ success: true, lead_id: leadId });
  } catch (err: any) {
    console.error('Odoo Sync Error:', err);
    return NextResponse.json({ success: false, error: err.message });
  }
}
