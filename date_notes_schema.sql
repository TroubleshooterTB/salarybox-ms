-- =========================================================================
-- MINIMAL STROKE ERP - DATE NOTES & UNIFIED PUNCH MANAGEMENT
-- =========================================================================

-- 1. CREATE DATE NOTES TABLE
CREATE TABLE IF NOT EXISTS public.date_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    author_id UUID REFERENCES public.profiles(id) NOT NULL,
    date DATE NOT NULL,
    note TEXT NOT NULL,
    branch TEXT, -- For easier notification filtering
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ENABLE RLS
ALTER TABLE public.date_notes ENABLE ROW LEVEL SECURITY;

-- 3. RLS POLICIES
DROP POLICY IF EXISTS "Users can view their own date notes" ON public.date_notes;
CREATE POLICY "Users can view their own date notes" ON public.date_notes
    FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users/Admins can insert date notes" ON public.date_notes;
CREATE POLICY "Users/Admins can insert date notes" ON public.date_notes
    FOR INSERT WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Authors can update their own notes" ON public.date_notes;
CREATE POLICY "Authors can update their own notes" ON public.date_notes
    FOR UPDATE USING (auth.uid() = author_id);

-- 4. ENSURE NOTIFICATIONS TABLE EXISTS AND HAS RLS
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT CHECK (type IN ('Info', 'Success', 'Warning', 'Error')) DEFAULT 'Info',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own notifications" ON public.notifications;
CREATE POLICY "Users can manage their own notifications" ON public.notifications
    FOR ALL USING (auth.uid() = user_id);

-- 5. FUNCTION TO NOTIFY ADMINS ON NEW DATE NOTE
CREATE OR REPLACE FUNCTION public.notify_admin_on_date_note()
RETURNS TRIGGER AS $$
DECLARE
    author_name TEXT;
    target_branch TEXT;
    admin_id UUID;
BEGIN
    -- Only notify if an employee is writing to their own or another record (not admin writing to employee)
    -- Actually, the requirement is "note should be sent to all admin as notification".
    -- Let's get author name
    SELECT full_name, branch INTO author_name, target_branch FROM public.profiles WHERE id = NEW.author_id;
    
    -- Notify all admins/super-admins
    INSERT INTO public.notifications (user_id, title, message, type)
    SELECT id, 'New Member Note', author_name || ' added a note for ' || NEW.date || '.', 'Info'
    FROM public.profiles
    WHERE role IN ('Super Admin', 'Admin') AND id != NEW.author_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ATTACH TRIGGER
DROP TRIGGER IF EXISTS tr_notify_date_note ON public.date_notes;
CREATE TRIGGER tr_notify_date_note AFTER INSERT ON public.date_notes FOR EACH ROW EXECUTE FUNCTION public.notify_admin_on_date_note();
