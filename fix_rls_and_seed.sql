-- =========================================================================
-- MINIMAL STROKE ERP - BRANCH MANAGEMENT & RLS FIX (V3)
-- =========================================================================

-- 1. CREATE BRANCHES TABLE IF NOT EXISTS
CREATE TABLE IF NOT EXISTS public.branches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    radius_meters INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. EXTEND BRANCHES TABLE WITH NEW COLUMNS
ALTER TABLE public.branches 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS shift_start TIME DEFAULT '09:00',
ADD COLUMN IF NOT EXISTS shift_end TIME DEFAULT '18:00',
ADD COLUMN IF NOT EXISTS geofence_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS overtime_rate NUMERIC(5,2) DEFAULT 1.5;

-- 3. EXTEND PROFILES TABLE
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS allow_remote_punch BOOLEAN DEFAULT false;

-- 4. ENABLE RLS
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. FIX PROFILES RLS (Allow Admins to Manage Profiles)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles" ON public.profiles
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('Super Admin', 'Branch Admin', 'Admin')
        )
    );

-- 6. FIX BRANCHES RLS
DROP POLICY IF EXISTS "Public Staff Read Access" ON public.branches;
CREATE POLICY "Public Staff Read Access" 
    ON public.branches FOR SELECT 
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin Manage Branches" ON public.branches;
CREATE POLICY "Admin Manage Branches"
    ON public.branches FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('Super Admin', 'Branch Admin', 'Admin')
        )
    );

-- 7. SEED INITIAL BRANCHES IF MISSING
INSERT INTO public.branches (name, latitude, longitude, radius_meters, geofence_enabled)
VALUES 
('Factory', 18.5204, 73.8567, 100, true),
('Main', 18.5304, 73.8667, 100, true),
('The Mint', 18.5404, 73.8767, 100, true),
('Wings', 18.5504, 73.8867, 100, true),
('Remote/Field', 18.5204, 73.8567, 999999, false)
ON CONFLICT (name) DO NOTHING;
