-- =========================================================================
-- MINIMAL STROKE ERP - PHASE 2: LEAVE QUOTAS
-- =========================================================================

-- 1. CREATE LEAVE QUOTAS TABLE
CREATE TABLE IF NOT EXISTS public.leave_quotas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    pl_total INTEGER DEFAULT 15,
    pl_used INTEGER DEFAULT 0,
    sl_total INTEGER DEFAULT 12,
    sl_used INTEGER DEFAULT 0,
    cl_total INTEGER DEFAULT 10,
    cl_used INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, year)
);

-- 2. ENABLE RLS
ALTER TABLE public.leave_quotas ENABLE ROW LEVEL SECURITY;

-- 3. RLS POLICIES
DROP POLICY IF EXISTS "Users can view their own quotas" ON public.leave_quotas;
CREATE POLICY "Users can view their own quotas" ON public.leave_quotas FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all quotas" ON public.leave_quotas;
CREATE POLICY "Admins can manage all quotas" ON public.leave_quotas
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('Super Admin', 'Branch Admin', 'Admin')
        )
    );

-- 4. TRIGGER FUNCTION TO UPDATE QUOTA ON APPROVAL
CREATE OR REPLACE FUNCTION public.handle_leave_approval()
RETURNS TRIGGER AS $$
DECLARE
    leave_days INTEGER;
BEGIN
    -- Only trigger when status changes to 'Approved'
    IF (TG_OP = 'UPDATE' AND OLD.status != 'Approved' AND NEW.status = 'Approved') THEN
        -- Calculate days
        leave_days := (NEW.end_date::date - NEW.start_date::date) + 1;
        
        -- Update the quota for the relevant year
        IF (NEW.leave_type = 'PL') THEN
            UPDATE public.leave_quotas SET pl_used = pl_used + leave_days 
            WHERE user_id = NEW.user_id AND year = EXTRACT(YEAR FROM NEW.start_date)::INTEGER;
        ELSIF (NEW.leave_type = 'SL') THEN
            UPDATE public.leave_quotas SET sl_used = sl_used + leave_days 
            WHERE user_id = NEW.user_id AND year = EXTRACT(YEAR FROM NEW.start_date)::INTEGER;
        ELSIF (NEW.leave_type = 'CL') THEN
            UPDATE public.leave_quotas SET cl_used = cl_used + leave_days 
            WHERE user_id = NEW.user_id AND year = EXTRACT(YEAR FROM NEW.start_date)::INTEGER;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. ATTACH TRIGGER TO LEAVE_REQUESTS
DROP TRIGGER IF EXISTS tr_on_leave_approval ON public.leave_requests;
CREATE TRIGGER tr_on_leave_approval
    AFTER UPDATE ON public.leave_requests
    FOR EACH ROW
    WHEN (NEW.status = 'Approved')
    EXECUTE FUNCTION public.handle_leave_approval();

-- 6. INITIALIZE QUOTAS FOR EXISTING EMPLOYEES
INSERT INTO public.leave_quotas (user_id, year)
SELECT id, EXTRACT(YEAR FROM now())::INTEGER FROM public.profiles
ON CONFLICT DO NOTHING;
