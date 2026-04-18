-- ============================================
-- FIX: attendance table — add missing columns
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================

-- Check what columns exist (for debugging)
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'attendance' ORDER BY ordinal_position;

-- Add missing columns safely (will skip if already exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'branch') THEN
    ALTER TABLE public.attendance ADD COLUMN branch TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'selfie_url') THEN
    ALTER TABLE public.attendance ADD COLUMN selfie_url TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'address_string') THEN
    ALTER TABLE public.attendance ADD COLUMN address_string TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'latitude') THEN
    ALTER TABLE public.attendance ADD COLUMN latitude DOUBLE PRECISION DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'longitude') THEN
    ALTER TABLE public.attendance ADD COLUMN longitude DOUBLE PRECISION DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'status') THEN
    ALTER TABLE public.attendance ADD COLUMN status TEXT DEFAULT 'Present';
  END IF;
END $$;
