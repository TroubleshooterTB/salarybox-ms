import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('profiles').select('id, full_name, employee_id');
  if (error) {
    console.error(error);
    return;
  }
  console.log("Total Profiles:", data.length);
  const emptyIds = data.filter(p => !p.employee_id);
  console.log("Empty IDs:", emptyIds.length);
  emptyIds.forEach(p => console.log(`- ${p.full_name} (${p.id})`));
}

check();
