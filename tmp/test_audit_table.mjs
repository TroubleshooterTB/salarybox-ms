import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testAudit() {
  const { data, error } = await supabase.from('audit_logs').insert({
    action_type: 'TEST_PROBING',
    reason: 'Checking if table exists for audit upgrade',
    timestamp: new Date().toISOString()
  }).select()
  
  if (error) {
    console.error('Error:', error.message)
    if (error.message.includes('relation "public.audit_logs" does not exist')) {
      console.log('Table needs to be created.')
    }
  } else {
    console.log('Success!', data)
  }
}

testAudit()
