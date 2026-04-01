--
-- DATABASE RESET & SCHEMA STABILIZATION (V2)
-- This script standardizes the schema FIRST, then cleans test data
--

-- 1. SCHEMA ALIGNMENT: Ensure 'user_id' exists as the standard link
-- For 'attendance' table
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attendance' AND column_name='profile_id') THEN
        ALTER TABLE public.attendance RENAME COLUMN profile_id TO user_id;
    END IF;
END $$;

-- For 'attendance_corrections' table
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attendance_corrections' AND column_name='profile_id') THEN
        ALTER TABLE public.attendance_corrections RENAME COLUMN profile_id TO user_id;
    END IF;
END $$;

-- Add helper columns for simpler reporting (Denormalization)
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS employee_name TEXT;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS employee_id TEXT;

ALTER TABLE public.attendance_corrections ADD COLUMN IF NOT EXISTS employee_name TEXT;
ALTER TABLE public.attendance_corrections ADD COLUMN IF NOT EXISTS employee_id TEXT;

-- 2. CLEANUP TEST DATA
-- Now that 'user_id' is standardized, we can safely delete
DELETE FROM public.attendance WHERE user_id IN (SELECT id FROM public.profiles WHERE employee_id LIKE 'TEST%' OR employee_id LIKE 'MS_TEST%' OR full_name ILIKE '%Test%' OR full_name ILIKE '%Demo%');
DELETE FROM public.attendance_corrections WHERE user_id IN (SELECT id FROM public.profiles WHERE employee_id LIKE 'TEST%' OR employee_id LIKE 'MS_TEST%' OR full_name ILIKE '%Test%' OR full_name ILIKE '%Demo%');
DELETE FROM public.leaves WHERE user_id IN (SELECT id FROM public.profiles WHERE employee_id LIKE 'TEST%' OR employee_id LIKE 'MS_TEST%' OR full_name ILIKE '%Test%' OR full_name ILIKE '%Demo%');
DELETE FROM public.profiles WHERE employee_id LIKE 'TEST%' OR employee_id LIKE 'MS_TEST%' OR full_name ILIKE '%Test%' OR full_name ILIKE '%Demo%';

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

DROP TRIGGER IF EXISTS trigger_apply_correction ON public.attendance_corrections;
CREATE TRIGGER trigger_apply_correction
    AFTER UPDATE OF status ON public.attendance_corrections
    FOR EACH ROW
    WHEN (OLD.status = 'Pending' AND NEW.status = 'Approved')
    EXECUTE FUNCTION public.apply_attendance_correction();

-- 4. UPDATE NOTIFICATION TRIGGERS (Align with user_id)
CREATE OR REPLACE FUNCTION public.notify_admin_on_new_request()
RETURNS TRIGGER AS $$
DECLARE
    user_name TEXT;
    req_type TEXT;
BEGIN
    SELECT full_name INTO user_name FROM public.profiles WHERE id = NEW.user_id;
    
    req_type := CASE 
        WHEN TG_TABLE_NAME = 'leave_requests' THEN 'Leave Request'
        WHEN TG_TABLE_NAME = 'attendance_corrections' THEN 'Correction Request'
        WHEN TG_TABLE_NAME = 'profile_update_requests' THEN 'Profile Update'
        ELSE 'New Request'
    END;

    INSERT INTO public.notifications (user_id, title, message, type)
    SELECT id, 'New ' || req_type, user_name || ' has submitted a new ' || LOWER(req_type) || '.', 'Info'
    FROM public.profiles
    WHERE role IN ('Super Admin', 'Admin', 'Branch Admin');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.notify_user_on_status_change()
RETURNS TRIGGER AS $$
DECLARE
    req_type TEXT;
BEGIN
    req_type := CASE 
        WHEN TG_TABLE_NAME = 'leave_requests' THEN 'Leave Request'
        WHEN TG_TABLE_NAME = 'attendance_corrections' THEN 'Correction Request'
        WHEN TG_TABLE_NAME = 'profile_update_requests' THEN 'Profile Update'
        ELSE 'Request'
    END;

    IF (NEW.status != OLD.status) THEN
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (
            NEW.user_id,
            req_type || ' ' || NEW.status,
            'Your ' || LOWER(req_type) || ' has been ' || LOWER(NEW.status) || '.',
            (CASE WHEN NEW.status = 'Approved' THEN 'Success' ELSE 'Error' END)
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. PROFILE UPDATE REQUESTS Table
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
