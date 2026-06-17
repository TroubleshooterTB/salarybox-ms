import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const content = fs.readFileSync('.env.local', 'utf-8');
const urlMatch = content.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = content.match(/VITE_SUPABASE_SERVICE_ROLE_KEY=(.*)/);

async function test() {
  if (!urlMatch || !keyMatch) return;
  const supabaseAdmin = createClient(urlMatch[1], keyMatch[1]);
  
  console.log("Testing fetchTodaysLogs query...");
  const { data, error } = await supabaseAdmin
    .from('field_visit_logs')
    .select('*, field_visits(user_id)')
    .order('timestamp', { ascending: false })
    .limit(5);

  if (error) {
    console.error("Query Error:", error);
  } else {
    console.log("Query returned", data?.length, "rows");
    if (data && data.length > 0) {
      console.log("Sample log:", JSON.stringify(data[0], null, 2));
    }
  }
}
test();
