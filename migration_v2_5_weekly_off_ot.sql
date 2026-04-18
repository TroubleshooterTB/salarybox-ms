-- Migration V2.5: Weekly Off, Late/Half-Day Policy, Branch Hourly OT
-- Run this in Supabase SQL Editor

-- 1. Add weekly_off_day to profiles (0=Sunday, 1=Monday, ..., 6=Saturday, -1=None)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS weekly_off_day integer DEFAULT 0;

-- 2. Add branch overtime settings to branches table
ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS overtime_applicable boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS overtime_hourly_rate numeric(10,2) DEFAULT 0;

-- Done. No data migration needed - defaults are safe.
SELECT 'Migration V2.5 applied successfully' AS result;
