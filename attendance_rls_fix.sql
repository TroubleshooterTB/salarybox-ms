-- =========================================================================
-- ATTENDANCE RLS DEFINITIVE FIX
-- Resolve "new row violates row-level security policy" error during punch.
-- =========================================================================

-- 1. Ensure RLS is enabled 
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- 2. Drop all previous name variants to ensure a clean slate
DROP POLICY IF EXISTS "Users can insert their own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Attendance Insert Access" ON public.attendance;
DROP POLICY IF EXISTS "Enable read/write for all authenticated users" ON public.attendance;
DROP POLICY IF EXISTS "Global Access for Authenticated" ON public.attendance;

-- 3. Create the Simplest Possible Ownership Policy for INSERTS
-- This ensures that any authenticated user can insert a row where user_id = their own ID.
CREATE POLICY "Attendance Insert Access" 
ON public.attendance FOR INSERT 
WITH CHECK (
    auth.role() = 'authenticated' AND 
    auth.uid() = user_id
);

-- 4. Create the Read Policy (Own or Admin)
DROP POLICY IF EXISTS "Attendance Read Access" ON public.attendance;
CREATE POLICY "Attendance Read Access" 
ON public.attendance FOR SELECT 
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('Super Admin', 'Admin', 'Manager')
    )
);

-- 5. Create the Update Policy (Admin Only)
DROP POLICY IF EXISTS "Attendance Update Access" ON public.attendance;
CREATE POLICY "Attendance Update Access" 
ON public.attendance FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('Super Admin', 'Admin', 'Manager')
    )
);
