-- =========================================================================
-- MINIMAL STROKE ERP - PHASE 5: OPERATIONAL POLISHING & NOTIFICATIONS
-- =========================================================================

-- 1. CREATE PAYROLL LOCKDOWN TABLE
CREATE TABLE IF NOT EXISTS public.payroll_lockdown (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    month_year TEXT NOT NULL UNIQUE, -- Format: YYYY-MM
    locked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    locked_by UUID REFERENCES auth.users(id)
);

-- 2. ENABLE RLS
ALTER TABLE public.payroll_lockdown ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage lockdown" ON public.payroll_lockdown;
CREATE POLICY "Admins can manage lockdown" ON public.payroll_lockdown FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Super Admin', 'Admin'))
);

DROP POLICY IF EXISTS "Everyone can view lockdown" ON public.payroll_lockdown;
CREATE POLICY "Everyone can view lockdown" ON public.payroll_lockdown FOR SELECT USING (true);


-- 3. NOTIFICATION TRIGGER: ON NEW REQUEST (LEAVE / CORRECTION / PROFILE)
CREATE OR REPLACE FUNCTION public.notify_admin_on_new_request()
RETURNS TRIGGER AS $$
DECLARE
    user_name TEXT;
    req_type TEXT;
BEGIN
    SELECT full_name INTO user_name FROM public.profiles WHERE id = (CASE WHEN TG_TABLE_NAME = 'leave_requests' THEN NEW.user_id ELSE NEW.profile_id END);
    
    req_type := CASE 
        WHEN TG_TABLE_NAME = 'leave_requests' THEN 'Leave Request'
        WHEN TG_TABLE_NAME = 'attendance_corrections' THEN 'Correction Request'
        WHEN TG_TABLE_NAME = 'profile_update_requests' THEN 'Profile Update'
        ELSE 'New Request'
    END;

    -- Notify Super Admins
    INSERT INTO public.notifications (user_id, title, message, type)
    SELECT id, 'New ' || req_type, user_name || ' has submitted a new ' || LOWER(req_type) || '.', 'Info'
    FROM public.profiles
    WHERE role = 'Super Admin';

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ATTACH TRIGGERS
DROP TRIGGER IF EXISTS tr_notify_leave ON public.leave_requests;
CREATE TRIGGER tr_notify_leave AFTER INSERT ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.notify_admin_on_new_request();

DROP TRIGGER IF EXISTS tr_notify_correction ON public.attendance_corrections;
CREATE TRIGGER tr_notify_correction AFTER INSERT ON public.attendance_corrections FOR EACH ROW EXECUTE FUNCTION public.notify_admin_on_new_request();

DROP TRIGGER IF EXISTS tr_notify_profile ON public.profile_update_requests;
CREATE TRIGGER tr_notify_profile AFTER INSERT ON public.profile_update_requests FOR EACH ROW EXECUTE FUNCTION public.notify_admin_on_new_request();


-- 4. NOTIFICATION TRIGGER: ON STATUS CHANGE (APPROVED / REJECTED)
CREATE OR REPLACE FUNCTION public.notify_user_on_status_change()
RETURNS TRIGGER AS $$
DECLARE
    target_user_id UUID;
    req_type TEXT;
BEGIN
    target_user_id := (CASE WHEN TG_TABLE_NAME = 'leave_requests' THEN NEW.user_id ELSE NEW.profile_id END);
    
    req_type := CASE 
        WHEN TG_TABLE_NAME = 'leave_requests' THEN 'Leave Request'
        WHEN TG_TABLE_NAME = 'attendance_corrections' THEN 'Correction Request'
        WHEN TG_TABLE_NAME = 'profile_update_requests' THEN 'Profile Update'
        ELSE 'Request'
    END;

    IF (NEW.status != OLD.status) THEN
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (
            target_user_id,
            req_type || ' ' || NEW.status,
            'Your ' || LOWER(req_type) || ' has been ' || LOWER(NEW.status) || '.',
            (CASE WHEN NEW.status = 'Approved' THEN 'Success' ELSE 'Error' END)
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ATTACH TRIGGERS
DROP TRIGGER IF EXISTS tr_notify_leave_status ON public.leave_requests;
CREATE TRIGGER tr_notify_leave_status AFTER UPDATE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.notify_user_on_status_change();

DROP TRIGGER IF EXISTS tr_notify_correction_status ON public.attendance_corrections;
CREATE TRIGGER tr_notify_correction_status AFTER UPDATE ON public.attendance_corrections FOR EACH ROW EXECUTE FUNCTION public.notify_user_on_status_change();

DROP TRIGGER IF EXISTS tr_notify_profile_status ON public.profile_update_requests;
CREATE TRIGGER tr_notify_profile_status AFTER UPDATE ON public.profile_update_requests FOR EACH ROW EXECUTE FUNCTION public.notify_user_on_status_change();
