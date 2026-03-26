-- Minimal Stroke ERP V2.2 - Phase 1: Statutory & Master Data Migration
-- Run this in your Supabase SQL Editor

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS pan_no TEXT,
ADD COLUMN IF NOT EXISTS uan_no TEXT,
ADD COLUMN IF NOT EXISTS pf_no TEXT,
ADD COLUMN IF NOT EXISTS esi_no TEXT,
ADD COLUMN IF NOT EXISTS pf_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS esi_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS bank_ifsc TEXT,
ADD COLUMN IF NOT EXISTS salary_type TEXT DEFAULT 'Monthly',
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;

-- Update existing records to default values if needed
UPDATE profiles SET salary_type = 'Monthly' WHERE salary_type IS NULL;
UPDATE profiles SET pf_enabled = FALSE WHERE pf_enabled IS NULL;
UPDATE profiles SET esi_enabled = FALSE WHERE esi_enabled IS NULL;

-- Notify Admin regarding the new fields
COMMENT ON COLUMN profiles.pan_no IS 'Employee PAN Card Number';
COMMENT ON COLUMN profiles.uan_no IS 'Employee UAN / PF Account Number';
COMMENT ON COLUMN profiles.pf_enabled IS 'Toggle for EPF statutory deductions';
COMMENT ON COLUMN profiles.esi_enabled IS 'Toggle for ESIC statutory deductions';
