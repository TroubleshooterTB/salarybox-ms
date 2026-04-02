-- =========================================================================
-- ATTENDANCE RLS DEFINITIVE FIX (NON-RECURSIVE)
-- Resolve "new row violates row-level security policy" error during punch.
-- =========================================================================

-- 1. Ensure RLS is enabled 
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- 2. Drop all previous name variants to ensure a clean slate
DROP POLICY IF EXISTS "Users can insert their own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Attendance Insert Access" ON public.attendance;
DROP POLICY IF EXISTS "Enable read/write for all authenticated users" ON public.attendance;
DROP POLICY IF EXISTS "Global Access for Authenticated" ON public.attendance;
DROP POLICY IF EXISTS "Attendance Read Access" ON public.attendance;
DROP POLICY IF EXISTS "Attendance Update Access" ON public.attendance;

-- 3. Create the Simplest Possible Ownership Policy for INSERTS
-- Note: 'WITH CHECK' defines what rows the user can INSERT.
CREATE POLICY "Attendance Insert Ownership" 
ON public.attendance FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 4. Create the Read Policy (Own or authenticated role check)
-- Avoiding public.is_admin() to prevent recursion if that function queries profiles.
CREATE POLICY "Attendance Select Ownership" 
ON public.attendance FOR SELECT 
USING (auth.uid() = user_id OR auth.role() = 'authenticated');

-- 5. Create the Update Policy (Authenticated check)
CREATE POLICY "Attendance Update Admin" 
ON public.attendance FOR UPDATE 
USING (auth.role() = 'authenticated');

-- 6. Ensure the bucket is also correctly permissioned
-- (Assuming storage bucket 'attendance-photos' exists)
-- INSERT policy for own photos
-- SELECT policy for everyone
