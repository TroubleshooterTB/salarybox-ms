-- ============================================================
-- Migration: April 29, 2026 - Three Bug Fixes
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add late_half_day_threshold_mins to company_settings
--    (default 180 = 3 hours late triggers Half Day status)
ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS late_half_day_threshold_mins INTEGER DEFAULT 180;

-- 2. Add opening_leave_balance columns to profiles
--    (for carry-forward leave balance as on a specific date)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS opening_leave_balance NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS opening_leave_balance_date DATE;

-- 3. Ensure loans table has 'Balance Correction' as a valid type
--    (No schema change needed - type column is TEXT, any value is allowed)

-- ============================================================
-- Verify columns added successfully
-- ============================================================
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name IN ('company_settings', 'profiles')
  AND column_name IN (
    'late_half_day_threshold_mins',
    'opening_leave_balance',
    'opening_leave_balance_date'
  )
ORDER BY table_name, column_name;
