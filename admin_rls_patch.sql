-- =========================================================================
-- SUPER ADMIN: RLS POLICY PATCH
-- Run this in your Supabase SQL Editor to allow your new Admin UX to work!
-- =========================================================================

-- 1. Profiles Table Policies
-- Drop the restrictive policies that prevent Admins from creating new staff
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create new policies allowing your new AdminStaff.tsx Dashboard to manage the database
CREATE POLICY "Enable insert for authenticated users" 
ON public.profiles FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable select for authenticated users" 
ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" 
ON public.profiles FOR UPDATE USING (auth.role() = 'authenticated');


-- 2. Leave Requests Table (Needed for AdminApprovals.tsx)
CREATE TABLE IF NOT EXISTS public.leave_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    leave_type TEXT NOT NULL CHECK (leave_type IN ('Privilege', 'Sick', 'Casual', 'Unpaid')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read/write for all authenticated users" 
ON public.leave_requests FOR ALL USING (auth.role() = 'authenticated');

-- 3. Update Leaves Table RLS so AdminApprovals can deduct balances
DROP POLICY IF EXISTS "Users can view their own leaves" ON public.leaves;
CREATE POLICY "Enable read/write for all authenticated users" 
ON public.leaves FOR ALL USING (auth.role() = 'authenticated');

-- 4. Update Attendance Table RLS so AdminCalendar can edit records
DROP POLICY IF EXISTS "Users can view their own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Users can insert their own attendance" ON public.attendance;
CREATE POLICY "Enable read/write for all authenticated users" 
ON public.attendance FOR ALL USING (auth.role() = 'authenticated');
