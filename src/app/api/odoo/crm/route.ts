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

export async function POST(req: Request) {
  try {
    const { 
      name, 
      street, 
      rating, 
      place_id, 
      category,
      contact_name,
      email,
      phone,
      expected_revenue
    } = await req.json();

    // Get auth token from header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ success: false, error: 'Unauthorized' });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) return NextResponse.json({ success: false, error: 'Invalid Session' });

    // 1. Get Global Odoo Settings (URL & DB)
    const { data: globalSettings } = await supabaseAdmin
      .from('odoo_settings')
      .select('url, db')
      .maybeSingle();

    if (!globalSettings?.url || !globalSettings?.db) {
      return NextResponse.json({ 
        success: false, 
        error: 'Company Odoo URL not configured. Please ask Admin to set the Odoo URL in Settings.' 
      });
    }

    // 2. Get User's Personal Odoo Settings (Username & API Key)
    const { data: userSettings } = await supabaseAdmin
      .from('user_odoo_settings')
      .select('odoo_username, odoo_api_key')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!userSettings?.odoo_api_key) {
      return NextResponse.json({ 
        success: false, 
        error: 'Your personal Odoo account is not linked. Please go to your Profile and add your Odoo API Key.' 
      });
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

    if (!uid) {
      return NextResponse.json({ success: false, error: 'Odoo Authentication Failed. Check your personal API key.' });
    }

    const modelsClient = xmlrpc.createSecureClient({
      host: cleanUrl,
      port: 443,
      path: '/xmlrpc/2/object'
    });

    // 3. Find "Field Visit Done" Stage ID
    let stageId: number | null = null;
    try {
      const stages: any = await callOdoo(modelsClient, 'execute_kw', [
        db, uid, api_key,
        'crm.stage', 'search_read',
        [[['name', 'ilike', 'Field Visit Done']]],
        { fields: ['id'], limit: 1 }
      ]);
      if (stages && stages.length > 0) {
        stageId = stages[0].id;
      }
    } catch (e) {
      console.error('Error finding stage ID:', e);
    }
    
    const leadData: any = {
      name: name || `[Discovery] ${category}`,
      contact_name: contact_name || name,
      street: street,
      email_from: email,
      phone: phone,
      planned_revenue: expected_revenue ? parseFloat(expected_revenue) : 0,
      description: `Rating: ${rating}\nCategory: ${category}\nGoogle Place ID: ${place_id}\nSynced from SalaryBOX MS`,
      type: 'opportunity',
      user_id: uid 
    };

    if (stageId) {
      leadData.stage_id = stageId;
    }

    const leadId = await callOdoo(modelsClient, 'execute_kw', [
      db, uid, api_key,
      'crm.lead', 'create',
      [leadData]
    ]);

    if (typeof leadId !== 'number') {
      throw new Error(`Odoo creation failed: ${JSON.stringify(leadId)}`);
    }

    return NextResponse.json({ success: true, lead_id: leadId });
  } catch (err: any) {
    console.error('Odoo Sync Error:', err);
    return NextResponse.json({ success: false, error: err.message });
  }
}
