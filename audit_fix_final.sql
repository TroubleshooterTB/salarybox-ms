-- =========================================================================
-- MINIMAL STROKE ERP - COMPREHENSIVE AUDIT & SECURITY FIX (VERSION 2.2)
-- Run this in your Supabase SQL Editor to resolve all RLS and Schema issues.
-- =========================================================================

-- 1. SECURITY DEFINER HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE public.profiles.id = user_id AND public.profiles.role IN ('Super Admin', 'Branch Admin', 'Admin', 'Manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1.1 USER ROLE FIX (Crucial for ADMIN99)
-- Ensure the test accounts have the correct roles to bypass RLS.
UPDATE public.profiles SET role = 'Super Admin' WHERE employee_id IN ('ADMIN99', 'ADMIN01', 'SADMIN01');
UPDATE public.profiles SET role = 'Admin' WHERE employee_id IN ('ADMIN02');

-- 2. SCHEMA ALIGNMENT: ATTENDANCE TABLE
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'branch') THEN
        ALTER TABLE public.attendance ADD COLUMN branch TEXT;
    END IF;
END $$;

-- 3. TRIGGER FIX: apply_attendance_correction (Hardened)
CREATE OR REPLACE FUNCTION public.apply_attendance_correction()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.status = 'Approved' AND OLD.status = 'Pending') THEN
        -- Insert Punch In
        IF NEW.requested_punch_in IS NOT NULL THEN
            INSERT INTO public.attendance (user_id, timestamp, type, status, address_string, branch)
            VALUES (
                NEW.user_id, 
                (NEW.date::text || ' ' || NEW.requested_punch_in::text)::timestamp, 
                'In', 
                'Present', 
                'Correction', 
                (SELECT branch FROM public.profiles WHERE id = NEW.user_id)
            );
        END IF;

        -- Insert Punch Out
        IF NEW.requested_punch_out IS NOT NULL THEN
            INSERT INTO public.attendance (user_id, timestamp, type, status, address_string, branch)
            VALUES (
                NEW.user_id, 
                (NEW.date::text || ' ' || NEW.requested_punch_out::text)::timestamp, 
                'Out', 
                'Present', 
                'Correction', 
                (SELECT branch FROM public.profiles WHERE id = NEW.user_id)
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RLS STANDARDIZATION (Safe & Dynamic)

-- PROFILES
DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Enable select for authenticated users" ON public.profiles;
    DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.profiles;
    DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.profiles;
    DROP POLICY IF EXISTS "Profiles Read Access" ON public.profiles;
    DROP POLICY IF EXISTS "Profiles Manage Access" ON public.profiles;
    DROP POLICY IF EXISTS "Profiles Admin Insert" ON public.profiles;
    
    EXECUTE 'CREATE POLICY "Profiles Read Access" ON public.profiles FOR SELECT USING (auth.role() = ''authenticated'')';
    EXECUTE 'CREATE POLICY "Profiles Manage Access" ON public.profiles FOR ALL USING (auth.uid() = id OR public.is_admin(auth.uid()))';
    EXECUTE 'CREATE POLICY "Profiles Admin Insert" ON public.profiles FOR INSERT WITH CHECK (public.is_admin(auth.uid()))';
END $$;

-- ATTENDANCE
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'user_id') THEN
        DROP POLICY IF EXISTS "Users can view their own attendance" ON public.attendance;
        DROP POLICY IF EXISTS "Users can insert their own attendance" ON public.attendance;
        DROP POLICY IF EXISTS "Attendance Read Access" ON public.attendance;
        DROP POLICY IF EXISTS "Attendance Insert Access" ON public.attendance;
        DROP POLICY IF EXISTS "Attendance Update Access" ON public.attendance;
        EXECUTE 'CREATE POLICY "Attendance Read Access" ON public.attendance FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()))';
        EXECUTE 'CREATE POLICY "Attendance Insert Access" ON public.attendance FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()))';
        EXECUTE 'CREATE POLICY "Attendance Update Access" ON public.attendance FOR UPDATE USING (public.is_admin(auth.uid()))';
    END IF;
END $$;

-- LEAVE REQUESTS
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leave_requests' AND column_name = 'user_id') THEN
        DROP POLICY IF EXISTS "Enable read/write for all authenticated users" ON public.leave_requests;
        DROP POLICY IF EXISTS "Leave Requests Access" ON public.leave_requests;
        EXECUTE 'CREATE POLICY "Leave Requests Access" ON public.leave_requests FOR ALL USING (auth.uid() = user_id OR public.is_admin(auth.uid()))';
    END IF;
END $$;

-- ATTENDANCE CORRECTIONS
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_corrections' AND column_name = 'user_id') THEN
        DROP POLICY IF EXISTS "Users can see their own corrections" ON public.attendance_corrections;
        DROP POLICY IF EXISTS "Users can insert their own corrections" ON public.attendance_corrections;
        DROP POLICY IF EXISTS "Admins can manage all corrections" ON public.attendance_corrections;
        DROP POLICY IF EXISTS "Corrections Member Access" ON public.attendance_corrections;
        DROP POLICY IF EXISTS "Corrections Insert" ON public.attendance_corrections;
        DROP POLICY IF EXISTS "Corrections Admin Manage" ON public.attendance_corrections;
        EXECUTE 'CREATE POLICY "Corrections Member Access" ON public.attendance_corrections FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()))';
        EXECUTE 'CREATE POLICY "Corrections Insert" ON public.attendance_corrections FOR INSERT WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Corrections Admin Manage" ON public.attendance_corrections FOR ALL USING (public.is_admin(auth.uid()))';
    END IF;
END $$;

-- LOANS & SCHEDULES
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loans' AND column_name = 'user_id') THEN
        DROP POLICY IF EXISTS "Users can view their own loans" ON public.loans;
        DROP POLICY IF EXISTS "Loans Access" ON public.loans;
        EXECUTE 'CREATE POLICY "Loans Access" ON public.loans FOR ALL USING (auth.uid() = user_id OR public.is_admin(auth.uid()))';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loan_schedules' AND column_name = 'user_id') THEN
        DROP POLICY IF EXISTS "Enable read/write for all authenticated users" ON public.loan_schedules;
        DROP POLICY IF EXISTS "Loan Schedules Access" ON public.loan_schedules;
        EXECUTE 'CREATE POLICY "Loan Schedules Access" ON public.loan_schedules FOR ALL USING (auth.uid() = user_id OR public.is_admin(auth.uid()))';
    END IF;
END $$;

-- NOTIFICATIONS
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'user_id') THEN
        DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
        DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
        DROP POLICY IF EXISTS "Notifications Access" ON public.notifications;
        EXECUTE 'CREATE POLICY "Notifications Access" ON public.notifications FOR ALL USING (auth.uid() = user_id OR public.is_admin(auth.uid()))';
    END IF;
END $$;

-- BRANCHES
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public Staff Read Access" ON public.branches;
    DROP POLICY IF EXISTS "Admin Manage Branches" ON public.branches;
    DROP POLICY IF EXISTS "Branches Staff Read" ON public.branches;
    DROP POLICY IF EXISTS "Branches Admin Manage" ON public.branches;
    EXECUTE 'CREATE POLICY "Branches Staff Read" ON public.branches FOR SELECT USING (auth.role() = ''authenticated'')';
    EXECUTE 'CREATE POLICY "Branches Admin Manage" ON public.branches FOR ALL USING (public.is_admin(auth.uid()))';
END $$;

-- PROFILE UPDATE REQUESTS
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profile_update_requests' AND column_name = 'user_id') THEN
        EXECUTE 'DROP POLICY IF EXISTS "Users can view their own requests" ON public.profile_update_requests';
        EXECUTE 'DROP POLICY IF EXISTS "Users can create their own requests" ON public.profile_update_requests';
        EXECUTE 'DROP POLICY IF EXISTS "Admins can manage all requests" ON public.profile_update_requests';
        EXECUTE 'DROP POLICY IF EXISTS "Profile Updates Access" ON public.profile_update_requests';
        EXECUTE 'CREATE POLICY "Profile Updates Access" ON public.profile_update_requests FOR ALL USING (auth.uid() = user_id OR public.is_admin(auth.uid()))';
    END IF;
END $$;
