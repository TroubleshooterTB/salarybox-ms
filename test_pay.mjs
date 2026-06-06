import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const env = readFileSync('.env.local', 'utf-8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if (k) acc[k.trim()] = v.join('=').trim();
  return acc;
}, {});
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_SERVICE_ROLE_KEY);

const startDate = '2026-05-01T00:00:00.000Z';
const endDate = '2026-05-31T23:59:59.999Z';

const { data: p } = await supabase.from('profiles').select('*').ilike('full_name', '%TUSHAR BANSODE%').single();
console.log("User:", p.full_name);

const { data: att } = await supabase.from('attendance').select('*').eq('user_id', p.id).gte('timestamp', startDate).lte('timestamp', endDate);
console.log("Attendance count:", att.length);

const dayMap = new Map();
att.forEach(r => {
  const rawDate = new Date(r.timestamp);
  const istDate = new Date(rawDate.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
  const d = istDate.getDate();
  if (!dayMap.has(d)) dayMap.set(d, []);
  dayMap.get(d).push(r);
});

let presentDays = 0, halfDays = 0, lateDays = 0, paidWeekOffs = 0, weeklyOffOTDays = 0, weeklyOffOTHalfDays = 0;

for (let day = 1; day <= 31; day++) {
  const records = dayMap.get(day) || [];
  const inPunches = records.filter(r => r.type === 'In').sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const outPunches = records.filter(r => r.type === 'Out').sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  
  const currentDate = new Date(2026, 4, day);
  const dayOfWeek = currentDate.getDay();
  const isWeeklyOff = dayOfWeek === 0; // Assuming Sunday

  let durationMins = 0;
  if (inPunches.length > 0) {
    const firstInTime = new Date(inPunches[0].timestamp);
    let lastOutRecord = null;
    for (let i = 0; i < inPunches.length; i++) {
      const inT = new Date(inPunches[i].timestamp).getTime();
      const outP = outPunches.find(o => new Date(o.timestamp).getTime() > inT);
      if (outP && (!lastOutRecord || new Date(outP.timestamp).getTime() > new Date(lastOutRecord.timestamp).getTime())) {
        lastOutRecord = outP;
      }
    }
    durationMins = lastOutRecord ? Math.round((new Date(lastOutRecord.timestamp).getTime() - firstInTime.getTime()) / 60000) : 0;
  }

  if (isWeeklyOff) {
    if (inPunches.length > 0) {
      const durationHrs = durationMins / 60;
      if (durationHrs > 5) weeklyOffOTDays++;
      else if (durationHrs > 3) weeklyOffOTHalfDays++;
    }
    paidWeekOffs++;
    continue;
  }
  
  // Skip holiday logic for this test to just see normal days
  if (day === 1) { // Assuming May 1 is Holiday
     // holiday
     continue;
  }

  if (inPunches.length > 0) {
     const durationHrs = durationMins / 60;
     const forcedStatus = outPunches.length > 0 ? outPunches[outPunches.length-1].status : null;
     if (forcedStatus === 'Half Day' || (durationHrs > 0 && durationHrs < 4.5)) {
        halfDays++;
     } else {
        presentDays++;
     }
  }
}
console.log({presentDays, halfDays, paidWeekOffs, weeklyOffOTDays, weeklyOffOTHalfDays});
