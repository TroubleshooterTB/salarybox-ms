import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { token, punchData } = req.body

  if (!token || !punchData) {
    return res.status(400).json({ error: 'Missing token or punch data' })
  }

  // 1. Initialize logic for private admin access
  const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // 2. Verify the user's identity securely
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized: Session expired or invalid' })
  }

  try {
    // 3. Process the Punch on the server-side with Admin privileges (Bypasses RLS)
    const { data, error: insertError } = await supabaseAdmin
      .from('attendance')
      .insert({
        user_id: user.id, // Securely use the ID from the verified token
        type: punchData.type,
        latitude: punchData.latitude,
        longitude: punchData.longitude,
        address_string: punchData.address_string,
        selfie_url: punchData.selfie_url,
        status: punchData.status,
        branch: punchData.branch
      })
      .select()
      .single()

    if (insertError) throw insertError

    return res.status(200).json({ success: true, data })

  } catch (err: any) {
    console.error('Server Punch Error:', err.message)
    return res.status(500).json({ error: `Server-side database failure: ${err.message}` })
  }
}
