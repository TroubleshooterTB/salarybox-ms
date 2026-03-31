-- =========================================================================
-- MINIMAL STROKE ERP - FINAL RLS RECURSION FIX
-- Run this in your Supabase SQL Editor to resolve "infinite recursion"
-- =========================================================================

-- 1. Create Security Definer Function to avoid recursion
-- This function bypasses RLS to check the user's role safely.
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role IN ('Super Admin', 'Branch Admin', 'Admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix PROFILES Table Policies
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable select for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Global Access for Authenticated" ON public.profiles;

-- Allow all authenticated users to read names/titles (needed for dropdowns)
CREATE POLICY "Profiles Read Access" 
ON public.profiles FOR SELECT 
USING (auth.role() = 'authenticated');

-- Allow users to manage their own record OR admins to manage everything
CREATE POLICY "Profiles Manage Access" 
ON public.profiles FOR ALL
USING (
    auth.uid() = id OR public.is_admin(auth.uid())
);


-- 3. Fix BRANCHES Table Policies
DROP POLICY IF EXISTS "Admin Manage Branches" ON public.branches;
DROP POLICY IF EXISTS "Admin Insert Access" ON public.branches;
DROP POLICY IF EXISTS "Admin Update Access" ON public.branches;
DROP POLICY IF EXISTS "Admin Delete Access" ON public.branches;

-- Staff can always see branches they need to punch into
-- (Already exists technically, but ensuring it's clean)
DROP POLICY IF EXISTS "Public Staff Read Access" ON public.branches;
CREATE POLICY "Public Staff Read Access" 
ON public.branches FOR SELECT 
USING (auth.role() = 'authenticated');

-- Admins can manage branches
CREATE POLICY "Admin Manage Branches"
ON public.branches FOR ALL
USING (public.is_admin(auth.uid()));


-- 4. Fix PROFILE_UPDATE_REQUESTS Table Policies (If table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profile_update_requests') THEN
        DROP POLICY IF EXISTS "Admins can manage all requests" ON public.profile_update_requests;
        CREATE POLICY "Admins can manage all requests" 
        ON public.profile_update_requests FOR ALL
        USING (public.is_admin(auth.uid()));
    END IF;
END $$;


-- 5. Fix Attendance & Leaves (Optional but recommended for consistency)
DROP POLICY IF EXISTS "Users can view their own attendance" ON public.attendance;
CREATE POLICY "Attendance Read Access" ON public.attendance FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view their own leaves" ON public.leaves;
CREATE POLICY "Leaves Read Access" ON public.leaves FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
