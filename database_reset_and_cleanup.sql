--
-- DATABASE RESET & SCHEMA STABILIZATION
-- This script cleans test data and standardizes the attendance schema
--

-- 1. CLEANUP TEST DATA
DELETE FROM public.attendance WHERE user_id IN (SELECT id FROM public.profiles WHERE employee_id LIKE 'TEST%' OR employee_id LIKE 'MS_TEST%' OR full_name ILIKE '%Test%' OR full_name ILIKE '%Demo%');
DELETE FROM public.attendance_corrections WHERE user_id IN (SELECT id FROM public.profiles WHERE employee_id LIKE 'TEST%' OR employee_id LIKE 'MS_TEST%' OR full_name ILIKE '%Test%' OR full_name ILIKE '%Demo%');
DELETE FROM public.leaves WHERE user_id IN (SELECT id FROM public.profiles WHERE employee_id LIKE 'TEST%' OR employee_id LIKE 'MS_TEST%' OR full_name ILIKE '%Test%' OR full_name ILIKE '%Demo%');
DELETE FROM public.profiles WHERE employee_id LIKE 'TEST%' OR employee_id LIKE 'MS_TEST%' OR full_name ILIKE '%Test%' OR full_name ILIKE '%Demo%';

-- 2. SCHEMA ALIGNMENT: Standardize on 'user_id' and add metadata
-- Rename profile_id to user_id if it exists in attendance
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attendance' AND column_name='profile_id') THEN
        ALTER TABLE public.attendance RENAME COLUMN profile_id TO user_id;
    END IF;
END $$;

-- Add helper columns for simpler reporting (Denormalization)
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS employee_name TEXT;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS employee_id TEXT;

ALTER TABLE public.attendance_corrections ADD COLUMN IF NOT EXISTS employee_name TEXT;
ALTER TABLE public.attendance_corrections ADD COLUMN IF NOT EXISTS employee_id TEXT;

-- 3. UPDATED REGULARIZATION TRIGGER
CREATE OR REPLACE FUNCTION public.apply_attendance_correction()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.status = 'Approved') THEN
        -- Insert Punch In
        IF (NEW.requested_punch_in IS NOT NULL) THEN
            INSERT INTO public.attendance (user_id, employee_name, employee_id, timestamp, type, status, address_string)
            VALUES (
                NEW.user_id, 
                NEW.employee_name,
                NEW.employee_id,
                (NEW.date::text || ' ' || NEW.requested_punch_in)::timestamp AT TIME ZONE 'Asia/Kolkata', 
                'In', 
                'Present', 
                'Regularized: ' || NEW.reason
            );
        END IF;

        -- Insert Punch Out
        IF (NEW.requested_punch_out IS NOT NULL) THEN
            INSERT INTO public.attendance (user_id, employee_name, employee_id, timestamp, type, status, address_string)
            VALUES (
                NEW.user_id, 
                NEW.employee_name,
                NEW.employee_id,
                (NEW.date::text || ' ' || NEW.requested_punch_out)::timestamp AT TIME ZONE 'Asia/Kolkata', 
                'Out', 
                'Present', 
                'Regularized: ' || NEW.reason
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. PROFILE UPDATE REQUESTS Table (Re-verify)
CREATE TABLE IF NOT EXISTS public.profile_update_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    employee_name TEXT,
    employee_id TEXT,
    request_data JSONB NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
