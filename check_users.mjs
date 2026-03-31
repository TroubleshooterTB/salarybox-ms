import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read .env.local manually because dotenv might not find it
const env = fs.readFileSync('.env.local', 'utf8');
const lines = env.split('\n');
const config = {};
lines.forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) config[key.trim()] = value.trim();
});

const supabase = createClient(config.VITE_SUPABASE_URL, config.VITE_SUPABASE_ANON_KEY);

async function checkUsers() {
  const { data, error } = await supabase.from('profiles').select('employee_id, full_name, role, branch');
  if (error) {
    console.error('Error fetching profiles:', error.message);
  } else {
    console.log('Profiles in database:');
    console.table(data);
  }
}

checkUsers();
