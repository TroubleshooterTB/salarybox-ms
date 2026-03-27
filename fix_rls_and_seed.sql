-- =========================================================================
-- MINIMAL STROKE ERP - BRANCH MANAGEMENT & RLS FIX
-- =========================================================================

-- 1. EXTEND BRANCHES TABLE
ALTER TABLE public.branches 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS shift_start TIME DEFAULT '09:00',
ADD COLUMN IF NOT EXISTS shift_end TIME DEFAULT '18:00',
ADD COLUMN IF NOT EXISTS geofence_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS overtime_rate NUMERIC(5,2) DEFAULT 1.5;

-- 2. EXTEND PROFILES TABLE
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS allow_remote_punch BOOLEAN DEFAULT false;

-- 3. FIX PROFILES RLS (Allow Admins to Manage Profiles)
-- First drop existing if any
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles" ON public.profiles
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('Super Admin', 'Branch Admin', 'Admin')
        )
    );

-- 4. FIX BRANCHES RLS
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

-- 5. SEED INITIAL BRANCHES IF MISSING
INSERT INTO public.branches (name, latitude, longitude, radius_meters, geofence_enabled)
VALUES 
('Main Office', 18.5204, 73.8567, 100, true),
('Remote/Field', 0, 0, 999999, false)
ON CONFLICT (name) DO NOTHING;
