-- Add petrol_allowance_rate to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS petrol_allowance_rate DECIMAL(10,2) DEFAULT 3.75;
