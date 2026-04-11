import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { token, punchData } = await req.json();

    if (!token || !punchData) {
      return NextResponse.json({ error: 'Missing token or punch data' }, { status: 400 });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server configuration error: Missing Supabase keys' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: Session invalid' }, { status: 401 });
    }

    let finalSelfieUrl = null;

    const [{ data: profile }, { data: settings }] = await Promise.all([
      supabaseAdmin.from('profiles').select('branch, allow_remote_punch').eq('id', user.id).single(),
      supabaseAdmin.from('company_settings').select('global_geofence_radius').eq('id', 1).single(),
    ]);

    if (!profile?.branch) {
      return NextResponse.json({ error: 'Forbidden: No branch assigned to this profile' }, { status: 403 });
    }

    const { data: branchData } = await supabaseAdmin
      .from('branches')
      .select('latitude, longitude, geofence_radius_meters, geofence_enabled')
      .eq('name', profile.branch)
      .single();

    // Geofence check (skip if remote punch allowed or geofence disabled)
    let distance = 0;
    if (branchData && branchData.geofence_enabled !== false && !profile.allow_remote_punch) {
      const toRad = (val: number) => (val * Math.PI) / 180;
      const R = 6371e3;
      const phi1 = toRad(branchData.latitude);
      const phi2 = toRad(punchData.latitude);
      const deltaPhi = toRad(punchData.latitude - branchData.latitude);
      const deltaLambda = toRad(punchData.longitude - branchData.longitude);
      const a =
        Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) *
        Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      distance = R * c;

      const radius = settings?.global_geofence_radius || branchData.geofence_radius_meters || 100;
      if (distance > radius) {
        return NextResponse.json(
          { error: `OUT_OF_RANGE: You are ${Math.round(distance)}m away. Allowed radius: ${radius}m.` },
          { status: 403 }
        );
      }
    } else if (branchData) {
      // Still calculate distance for logging even if not enforced
      const toRad = (val: number) => (val * Math.PI) / 180;
      const R = 6371e3;
      const phi1 = toRad(branchData.latitude);
      const phi2 = toRad(punchData.latitude);
      const deltaPhi = toRad(punchData.latitude - branchData.latitude);
      const deltaLambda = toRad(punchData.longitude - branchData.longitude);
      const a =
        Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) *
        Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
      distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // Server-side selfie upload
    if (punchData.selfie_base64) {
      const base64Data = punchData.selfie_base64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const fileName = `${user.id}_${Date.now()}.jpg`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from('attendance-photos')
        .upload(fileName, buffer, { contentType: 'image/jpeg', upsert: true });

      if (!uploadError) {
        const { data: { publicUrl } } = supabaseAdmin.storage
          .from('attendance-photos')
          .getPublicUrl(fileName);
        finalSelfieUrl = publicUrl;
      }
    }

    const { data, error: insertError } = await supabaseAdmin
      .from('attendance')
      .insert({
        user_id: user.id,
        type: punchData.type,
        latitude: punchData.latitude,
        longitude: punchData.longitude,
        address_string: punchData.address_string,
        selfie_url: finalSelfieUrl,
        status: punchData.status,
        branch: profile.branch,
        distance_from_branch: Math.round(distance),
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('Punch API Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
