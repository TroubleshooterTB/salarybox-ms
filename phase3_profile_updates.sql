-- =========================================================================
-- MINIMAL STROKE ERP - PHASE 3: PROFILE UPDATE REQUESTS
-- =========================================================================

-- 1. CREATE TABLE
CREATE TABLE IF NOT EXISTS public.profile_update_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    request_data JSONB NOT NULL, -- The fields they want to change (e.g. { "phone_number": "...", "bank_name": "..." })
    reason TEXT,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    admin_remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. ENABLE RLS
ALTER TABLE public.profile_update_requests ENABLE ROW LEVEL SECURITY;

-- 3. RLS POLICIES
DROP POLICY IF EXISTS "Users can view their own requests" ON public.profile_update_requests;
CREATE POLICY "Users can view their own requests" ON public.profile_update_requests FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own requests" ON public.profile_update_requests;
CREATE POLICY "Users can create their own requests" ON public.profile_update_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all requests" ON public.profile_update_requests;
CREATE POLICY "Admins can manage all requests" ON public.profile_update_requests
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('Super Admin', 'Branch Admin', 'Admin')
        )
    );

-- 4. TRIGGER FOR UPDATED_AT
CREATE OR REPLACE TRIGGER tr_profile_update_requests_updated_at
    BEFORE UPDATE ON public.profile_update_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
