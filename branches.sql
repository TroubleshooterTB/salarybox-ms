-- =========================================================================
-- SUPER ADMIN: BRANCH GEOLOCATION TABLE
-- Run this securely in your Supabase SQL Editor!
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.branches (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    radius_meters INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- 1. All Staff can VIEW the branches (Required for their Mobile App Geofence block to work)
CREATE POLICY "Public Staff Read Access" 
    ON public.branches FOR SELECT 
    USING (auth.role() = 'authenticated');

-- 2. Admins can MANAGE the branches (Full Privileges via Dashboard)
CREATE POLICY "Admin Insert Access"
    ON public.branches FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admin Update Access"
    ON public.branches FOR UPDATE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Admin Delete Access"
    ON public.branches FOR DELETE
    USING (auth.role() = 'authenticated');

-- Seed Default Database Branches so you don't start with 0 locations
INSERT INTO public.branches (name, latitude, longitude, radius_meters) VALUES
('Factory', 18.5204, 73.8567, 100),
('Main', 18.5304, 73.8667, 100),
('The Mint', 18.5404, 73.8767, 100),
('Wings', 18.5504, 73.8867, 100)
ON CONFLICT (name) DO NOTHING;
