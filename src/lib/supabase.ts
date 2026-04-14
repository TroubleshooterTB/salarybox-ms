import { createClient } from '@supabase/supabase-js'

// Direct check for environment variables to avoid the 'placeholder' fallback if possible
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gxekdcwwzebvtxdlddkb.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase configuration missing. Falling back to default or placeholder values.');
}

export const supabase = createClient(
  supabaseUrl, 
  supabaseAnonKey || 'placeholder', 
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
)
