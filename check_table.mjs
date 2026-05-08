import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const content = fs.readFileSync('.env.local', 'utf-8');
const urlMatch = content.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = content.match(/VITE_SUPABASE_SERVICE_ROLE_KEY=(.*)/);

if (urlMatch && keyMatch) {
  const supabase = createClient(urlMatch[1], keyMatch[1]);
  supabase.rpc('exec_sql', { query: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'attendance_corrections';" })
    .then(res => console.log(res))
    .catch(err => console.log(err));
}
