import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const content = fs.readFileSync('.env.local', 'utf-8');
const urlMatch = content.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = content.match(/VITE_SUPABASE_SERVICE_ROLE_KEY=(.*)/);

if (urlMatch && keyMatch) {
  const supabase = createClient(urlMatch[1], keyMatch[1]);
  supabase.from('attendance_corrections').select('*').limit(1).then(res => {
    console.log("Query Response:", res);
  });
}
