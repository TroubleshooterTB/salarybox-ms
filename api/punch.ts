import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { token, punchData } = req.body

  if (!token || !punchData) {
    return res.status(400).json({ error: 'Missing token or punch data' })
  }

  // 1. Initialize Supabase Admin (Bypasses RLS)
  // Ensure these variables are set in your Vercel Dashboard!
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: 'Server configuration error: Missing Supabase keys on Vercel' })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // 2. Security: Verify User JWT
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized: Session invalid' })
  }

  try {
    let finalSelfieUrl = null;

    // 3. Geofencing Verification (Dynamic)
    const [{ data: profile }, { data: settings }] = await Promise.all([
      supabaseAdmin.from('profiles').select('branch').eq('id', user.id).single(),
      supabaseAdmin.from('company_settings').select('global_geofence_radius').eq('id', 1).single()
    ]);

    if (!profile?.branch) {
      return res.status(403).json({ error: 'Forbidden: No branch assigned to this profile' });
    }

    const { data: branchData } = await supabaseAdmin
      .from('branches')
      .select('latitude, longitude, geofence_radius_meters')
      .eq('name', profile.branch)
      .single();

    if (!branchData) {
      return res.status(500).json({ error: 'Server error: Branch geofence data missing' });
    }

    // Dynamic Radius Priority: Global > Branch > 100m Fallback
    const radius = settings?.global_geofence_radius || branchData.geofence_radius_meters || 100;

    // Haversine Formula for Distance
    const toRad = (val: number) => (val * Math.PI) / 180;
    const R = 6371e3; 
    const phi1 = toRad(branchData.latitude);
    const phi2 = toRad(punchData.latitude);
    const deltaPhi = toRad(punchData.latitude - branchData.latitude);
    const deltaLambda = toRad(punchData.longitude - branchData.longitude);

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    // Strict Enforcement using Dynamic Radius
    if (distance > radius) {
        return res.status(403).json({ 
            error: `OUT_OF_RANGE: You are ${Math.round(distance)}m away. Allowed radius (Global Calibration): ${radius}m.` 
        });
    }

    // 4. Server-Side Selfie Upload (if provided)
    if (punchData.selfie_base64) {
      console.log('Processing server-side selfie upload...');
      // Convert base64 to buffer
      const base64Data = punchData.selfie_base64.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, 'base64');
      const fileName = `${user.id}_${Date.now()}.jpg`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from('attendance-photos')
        .upload(fileName, buffer, { 
          contentType: 'image/jpeg',
          upsert: true
        });

      if (!uploadError) {
        const { data: { publicUrl } } = supabaseAdmin.storage
          .from('attendance-photos')
          .getPublicUrl(fileName);
        finalSelfieUrl = publicUrl;
      }
    }

    // 5. Server-Side Database Insert (Bypasses RLS)
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
        distance_from_branch: Math.round(distance)
      })
      .select()
      .single()

    if (insertError) throw insertError;

    return res.status(200).json({ success: true, data })

  } catch (err: any) {
    console.error('Nuclear Punch Failure:', err.message)
    return res.status(500).json({ error: `Nuclear failure: ${err.message}` })
  }
}
