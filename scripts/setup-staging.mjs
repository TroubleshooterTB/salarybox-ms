/**
 * Minimal Stroke HR ERP - Staging Sanitization Script
 * Purpose: Prepares a staging database by removing PII (phone numbers) 
 * and notification tokens to prevent accidental live staff contact.
 */
import { createClient } from '@supabase/supabase-js';

const STAGING_URL = process.env.STAGING_SUPABASE_URL;
const STAGING_SERVICE_ROLE = process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY;

if (!STAGING_URL || !STAGING_SERVICE_ROLE) {
  console.error('❌ Error: Missing STAGING environment variables.');
  process.exit(1);
}

const supabase = createClient(STAGING_URL, STAGING_SERVICE_ROLE);

async function sanitizeStaging() {
  console.log('🚀 Starting Staging Sanitization...');

  // 1. Sanitize Phone Numbers in Profiles
  const { error: phoneError } = await supabase
    .from('profiles')
    .update({ phone_number: '0000000000' })
    .neq('phone_number', '0000000000');

  if (phoneError) console.error('❌ Error sanitizing phones:', phoneError.message);
  else console.log('✅ All phone numbers sanitized to 0000000000');

  // 2. Clear Push Notification Tokens (if exists)
  // Checking for 'fcm_token' column dynamically
  try {
    const { error: fcmError } = await supabase
        .from('profiles')
        .update({ fcm_token: null })
        .not('fcm_token', 'is', null);
    
    if (!fcmError) console.log('✅ All FCM notification tokens cleared.');
  } catch (err) {
    console.log('ℹ️ No fcm_token column found in profiles. Skipping.');
  }

  // 3. Reset Device Fingerprints to allow multi-device testing
  const { error: fingerprintError } = await supabase
    .from('profiles')
    .update({ device_fingerprint: null });

  if (fingerprintError) console.error('❌ Error clearing fingerprints:', fingerprintError.message);
  else console.log('✅ Device fingerprints reset.');

  console.log('🎉 Staging Environment is now safe for parallel testing!');
}

sanitizeStaging();
