import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function main() {
  const { data, count, error } = await supabase.from('attendance').select('*', { count: 'exact' });
  console.log(`Total rows fetched: ${data.length}, total count: ${count}`);
}
main();
