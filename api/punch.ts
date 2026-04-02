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

    // 3. Server-Side Selfie Upload (if provided)
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

      if (uploadError) {
        console.error('Storage Upload Error:', uploadError);
        throw new Error(`Storage failure: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabaseAdmin.storage
        .from('attendance-photos')
        .getPublicUrl(fileName);
        
      finalSelfieUrl = publicUrl;
    }

    // 4. Server-Side Database Insert (Bypasses RLS)
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
        branch: punchData.branch
      })
      .select()
      .single()

    if (insertError) {
      console.error('Database Insert Error:', insertError);
      throw insertError;
    }

    return res.status(200).json({ success: true, data })

  } catch (err: any) {
    console.error('Nuclear Punch Failure:', err.message)
    return res.status(500).json({ error: `Nuclear failure: ${err.message}` })
  }
}
