import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gxekdcwwzebvtxdlddkb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4ZWtkY3d3emVidnR4ZGxkZGtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjI4NjcsImV4cCI6MjA4OTk5ODg2N30.jAZiPb0CDN0wKcRqtGAWR1I8rwKgsPtVWSzOCk0sUfs';
const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('Registering STAFF user (MS002)...');
  const { data: d1, error: e1 } = await supabase.auth.signUp({
    email: 'ms002@minimalstroke.com',
    password: 'password123',
  });
  if (e1) console.log(e1.message);
  if (d1?.user) {
    const { error: p1 } = await supabase.from('profiles').upsert({
      id: d1.user.id,
      full_name: 'John Doe',
      employee_id: 'MS002',
      branch: 'Factory',
      job_title: 'Field Tech',
      department: 'Q1',
      ctc_amount: 25000
    });
    if (p1) console.log('Staff profile error:', p1.message);
    else console.log('Staff profile inserted.');
    await supabase.from('leaves').upsert({ user_id: d1.user.id, privilege_balance: 11, sick_balance: 4 });
  }

  console.log('\nRegistering ADMIN user (ADMIN02)...');
  const { data: d2, error: e2 } = await supabase.auth.signUp({
    email: 'admin02@minimalstroke.com',
    password: 'password123',
  });
  if (e2) console.log(e2.message);
  if (d2?.user) {
    const { error: p2 } = await supabase.from('profiles').upsert({
      id: d2.user.id,
      full_name: 'Admin Boss',
      employee_id: 'ADMIN02',
      branch: 'Main',
      job_title: 'Operations Director',
      department: 'Q1',
      role: 'Admin',
      ctc_amount: 95000
    });
    if (p2) console.log('Admin profile error:', p2.message);
    else console.log('Admin profile inserted.');
    await supabase.from('leaves').upsert({ user_id: d2.user.id, privilege_balance: 11, sick_balance: 4 });
  }

  console.log('\nRegistering SUPER ADMIN user (admin01@minimalstroke.com)...');
  const { data: d3, error: e3 } = await supabase.auth.signUp({
    email: 'admin01@minimalstroke.com',
    password: 'password123',
  });
  if (e3) console.log(e3.message);
  if (d3?.user) {
    const { error: p3 } = await supabase.from('profiles').upsert({
      id: d3.user.id,
      full_name: 'Super Admin',
      employee_id: 'SADMIN01',
      branch: 'Main',
      job_title: 'System Architect',
      department: 'Q2',
      role: 'Super Admin',
      ctc_amount: 150000
    });
    if (p3) console.log('Super Admin profile error:', p3.message);
    else console.log('Super Admin profile inserted.');
    await supabase.from('leaves').upsert({ user_id: d3.user.id, privilege_balance: 11, sick_balance: 4 });
  }

  console.log('\nRegistering ADMIN99 user...');
  const { data: d4, error: e4 } = await supabase.auth.signUp({
    email: 'admin99@minimalstroke.com',
    password: 'password123',
  });
  if (e4) console.log(e4.message);
  if (d4?.user) {
    const { error: p4 } = await supabase.from('profiles').upsert({
      id: d4.user.id,
      full_name: 'Admin Ninety Nine',
      employee_id: 'ADMIN99',
      branch: 'Main',
      job_title: 'Global Operations',
      department: 'Q1',
      role: 'Super Admin',
      ctc_amount: 200000
    });
    if (p4) console.log('ADMIN99 profile error:', p4.message);
    else console.log('ADMIN99 profile inserted.');
    await supabase.from('leaves').upsert({ user_id: d4.user.id, privilege_balance: 11, sick_balance: 4 });
  }
  
  console.log('Done');
}

seed();
