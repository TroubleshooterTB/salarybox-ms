-- =========================================================================
-- MINIMAL STROKE ERP - PHASE 4: NOTIFICATIONS & LOCK-IN
-- =========================================================================

-- 1. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'Info', -- Info, Warning, Alert, Success
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. ENABLE RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 3. RLS POLICIES
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- 4. PAYROLL LOCKDOWN IN PAYROLL_RUNS
-- If not already present, adding is_locked column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payroll_runs' AND column_name = 'is_locked') THEN
        ALTER TABLE public.payroll_runs ADD COLUMN is_locked BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 5. FUNCTION TO CHECK LOCKDOWN
CREATE OR REPLACE FUNCTION public.check_payroll_lockdown()
RETURNS TRIGGER AS $$
DECLARE
    is_locked_month BOOLEAN;
    target_month_year TEXT;
BEGIN
    -- Determine month-year from the record being inserted/updated/deleted
    -- For attendance & leaves, we use the date of the record
    IF (TG_TABLE_NAME = 'attendance') THEN
        target_month_year := TO_CHAR(NEW.timestamp, 'YYYY-MM');
    ELSIF (TG_TABLE_NAME = 'leave_requests') THEN
        target_month_year := TO_CHAR(NEW.start_date, 'YYYY-MM');
    END IF;

    -- Check if ANY payroll run for this month is locked
    SELECT EXISTS (
        SELECT 1 FROM public.payroll_runs 
        WHERE month_year = target_month_year AND is_locked = true
    ) INTO is_locked_month;

    IF (is_locked_month) THEN
        RAISE EXCEPTION 'This month is locked and cannot be modified.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. ATTACH LOCKDOWN TRIGGERS
-- Attendance
DROP TRIGGER IF EXISTS tr_lockdown_attendance ON public.attendance;
CREATE TRIGGER tr_lockdown_attendance
    BEFORE INSERT OR UPDATE OR DELETE ON public.attendance
    FOR EACH ROW
    EXECUTE FUNCTION public.check_payroll_lockdown();

-- Leave Requests
DROP TRIGGER IF EXISTS tr_lockdown_leaves ON public.leave_requests;
CREATE TRIGGER tr_lockdown_leaves
    BEFORE INSERT OR UPDATE OR DELETE ON public.leave_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.check_payroll_lockdown();
