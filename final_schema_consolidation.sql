-- 
-- FINAL CONSOLIDATION: ATTENDANCE CORRECTIONS & PROFILE UPDATES
-- Run this in your Supabase SQL Editor to ensure perfect synchronization
--

-- 1. ATTENDANCE CORRECTIONS Table Refinement
CREATE TABLE IF NOT EXISTS public.attendance_corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    requested_punch_in TEXT,
    requested_punch_out TEXT,
    reason TEXT,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. AUTOMATED REGULARIZATION TRIGGER
CREATE OR REPLACE FUNCTION public.apply_attendance_correction()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.status = 'Approved') THEN
        -- Insert Punch In
        IF (NEW.requested_punch_in IS NOT NULL) THEN
            INSERT INTO public.attendance (user_id, timestamp, type, status, address_string)
            VALUES (
                NEW.user_id, 
                (NEW.date::text || ' ' || NEW.requested_punch_in)::timestamp AT TIME ZONE 'Asia/Kolkata', 
                'In', 
                'Present', 
                'Regularized: ' || NEW.reason
            );
        END IF;

        -- Insert Punch Out
        IF (NEW.requested_punch_out IS NOT NULL) THEN
            INSERT INTO public.attendance (user_id, timestamp, type, status, address_string)
            VALUES (
                NEW.user_id, 
                (NEW.date::text || ' ' || NEW.requested_punch_out)::timestamp AT TIME ZONE 'Asia/Kolkata', 
                'Out', 
                'Present', 
                'Regularized: ' || NEW.reason
            );
        END IF;
        
        -- Optional: Log the change
        INSERT INTO public.attendance_logs (user_id, action, details)
        VALUES (NEW.user_id, 'Regularized', 'Approved correction for ' || NEW.date);
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

-- 3. PROFILE UPDATE REQUESTS Table
CREATE TABLE IF NOT EXISTS public.profile_update_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    request_data JSONB NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. RLS POLICIES (Safety Net)
ALTER TABLE public.attendance_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_update_requests ENABLE ROW LEVEL SECURITY;

-- Allow employees to see/create their own requests
DROP POLICY IF EXISTS "Users can view own corrections" ON public.attendance_corrections;
CREATE POLICY "Users can view own corrections" ON public.attendance_corrections
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own corrections" ON public.attendance_corrections;
CREATE POLICY "Users can insert own corrections" ON public.attendance_corrections
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow admins to manage all requests
DROP POLICY IF EXISTS "Admins can manage all corrections" ON public.attendance_corrections;
CREATE POLICY "Admins can manage all corrections" ON public.attendance_corrections
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin'))
    );
