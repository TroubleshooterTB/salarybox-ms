import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const lines = env.split('\n');
const config = {};
lines.forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) config[key.trim()] = value.trim();
});

const supabase = createClient(config.VITE_SUPABASE_URL, config.VITE_SUPABASE_ANON_KEY);

async function checkColumns() {
  const { data, error } = await supabase.from('attendance_corrections').select('*').limit(1);
  if (error) {
    console.error('Error fetching attendance_corrections:', error.message);
  } else if (data && data.length > 0) {
    console.log('Columns in attendance_corrections:', Object.keys(data[0]));
  } else {
    // If no data, try to fetch schema via RPC if available or just list keys from empty result if possible.
    // Supabase JS doesn't expose keys for empty results easily.
    console.log('No data found in attendance_corrections. Table might be empty.');
  }
}

checkColumns();
