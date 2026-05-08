import { createClient } from '@supabase/supabase-js';

const NEXT_PUBLIC_SUPABASE_URL = 'https://gxekdcwwzebvtxdlddkb.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4ZWtkY3d3emVidnR4ZGxkZGtiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQyMjg2NywiZXhwIjoyMDg5OTk4ODY3fQ.oW793bd8JHPgdvMC0GIsvPEVKtsVSyur0ES506QnUlk';

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkSchema() {
  const tables = ['leave_quotas', 'leave_requests', 'field_visits'];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (data && data.length > 0) {
      console.log(`${table} columns:`, Object.keys(data[0]));
    } else if (error) {
       console.log(`${table} Error:`, error.message);
    } else {
       console.log(`${table}: No data to infer columns`);
    }
  }
}

checkSchema();
