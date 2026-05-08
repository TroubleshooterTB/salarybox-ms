import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const content = fs.readFileSync('.env.local', 'utf-8');
const urlMatch = content.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = content.match(/VITE_SUPABASE_SERVICE_ROLE_KEY=(.*)/);

if (urlMatch && keyMatch) {
  const supabase = createClient(urlMatch[1], keyMatch[1]);
  supabase.from('attendance_corrections').insert({
    user_id: '00000000-0000-0000-0000-000000000000',
    requested_punch_in: '10:00:00',
    reason: 'test'
  }).then(res => {
    console.log("Insert Response:", res);
  });
}
