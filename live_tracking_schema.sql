-- Add live tracking columns to profiles table
ALTER TABLE profiles 
ADD COLUMN current_latitude DOUBLE PRECISION,
ADD COLUMN current_longitude DOUBLE PRECISION,
ADD COLUMN last_location_update TIMESTAMPTZ;

-- Notify users that this script needs to be run on their Supabase SQL editor
