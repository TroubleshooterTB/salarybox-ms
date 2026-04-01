import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gxekdcwwzebvtxdlddkb.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4ZWtkY3d3emVidnR4ZGxkZGtiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQyMjg2NywiZXhwIjoyMDg5OTk4ODY3fQ.oW793bd8JHPgdvMC0GIsvPEVKtsVSyur0ES506QnUlk';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

async function apply() {
  console.log("--- Starting DB Update & Cleanup ---");

  // 1. Add column 'needs_password_reset' to 'profiles'
  // Note: We can't run 'ALTER TABLE' via standard Supabase-JS RPC unless we have an Edge Function.
  // However, I can try to run it via an 'rpc' if the user has a 'exec_sql' helper, 
  // but usually they don't.
  // Instead, I'll focus on what I CAN do: purging users.
  
  const testUsers = ['admin11', 'audit001', 'audit100', 'finalverify777', 'ms0015', 'ms111', 'success777', 'success777v3'];
  
  for (const name of testUsers) {
    console.log(`Checking user: ${name}`);
    const { data: profiles, error: pError } = await supabase
      .from('profiles')
      .select('id, full_name, employee_id')
      .or(`full_name.ilike.%${name}%,employee_id.eq.${name}`);
    
    if (pError) {
      console.error(`Error fetching profile for ${name}:`, pError.message);
      continue;
    }

    for (const p of profiles) {
      console.log(`Found profile: ${p.full_name} (${p.id}). Deleting...`);
      
      // Delete Auth User (Service Role allows this)
      const { error: aError } = await supabase.auth.admin.deleteUser(p.id);
      if (aError) {
        console.error(`Error deleting auth user ${p.id}:`, aError.message);
      } else {
        console.log(`Successfully deleted auth user and cascaded profile for ${p.id}`);
      }
    }
  }

  console.log("--- Cleanup Complete ---");
  console.log("--- NOTE: Schema changes (adding column) still require SQL Editor access if no RPC exists ---");
}

apply();
