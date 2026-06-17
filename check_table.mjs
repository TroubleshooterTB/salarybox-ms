import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const content = fs.readFileSync('.env.local', 'utf-8');
const urlMatch = content.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = content.match(/VITE_SUPABASE_SERVICE_ROLE_KEY=(.*)/);

async function test() {
  if (!urlMatch || !keyMatch) return;
  const supabaseAdmin = createClient(urlMatch[1], keyMatch[1]);
  
  const email = 'test_ms999@minimalstroke.com';
  console.log("Creating user...");
  const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: 'password123',
    email_confirm: true,
    user_metadata: { full_name: 'Test User', role: 'Employee' },
  });

  if (authErr) {
    console.error("Auth error:", authErr);
    return;
  }
  
  console.log("Created Auth User:", authData.user.id);
  
  console.log("Upserting Profile...");
  const { error: profErr } = await supabaseAdmin.from('profiles').upsert({
    id: authData.user.id,
    full_name: 'Test User',
    employee_id: 'MS999',
    role: 'Employee'
  });
  
  if (profErr) {
    console.error("Profile Error:", profErr);
  } else {
    console.log("Profile upserted successfully!");
  }
  
  // Cleanup
  console.log("Cleaning up...");
  await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
}
test();
