import { createClient } from '@supabase/supabase-js';

const NEXT_PUBLIC_SUPABASE_URL = 'https://gxekdcwwzebvtxdlddkb.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4ZWtkY3d3emVidnR4ZGxkZGtiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQyMjg2NywiZXhwIjoyMDg5OTk4ODY3fQ.oW793bd8JHPgdvMC0GIsvPEVKtsVSyur0ES506QnUlk';

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkTables() {
  const tables = ['payslips', 'payroll_locks', 'payroll_data', 'reimbursements', 'expenses'];
  for (const table of tables) {
    try {
      const { error: tError } = await supabase.from(table).select('count', { count: 'exact', head: true });
      console.log(`${table}: ${tError ? 'Missing or Error: ' + tError.message : 'Exists'}`);
    } catch (e) {
      console.log(`${table}: Exception: ${e.message}`);
    }
  }
}

checkTables();
