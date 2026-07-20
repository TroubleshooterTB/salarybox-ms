import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const content = fs.readFileSync('.env.local', 'utf-8');
const urlMatch = content.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = content.match(/VITE_SUPABASE_SERVICE_ROLE_KEY=(.*)/);

async function test() {
  if (!urlMatch || !keyMatch) return;
  const supabaseAdmin = createClient(urlMatch[1], keyMatch[1]);
  
  const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) {
    console.error("Error listing users:", error);
  } else {
    const user = users.users.find(u => u.email === 'ms001@minimalstroke.com');
    console.log("User found:", user ? { email: user.email, confirmed_at: user.email_confirmed_at } : 'Not found');
  }
}
test();
