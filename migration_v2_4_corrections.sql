-- Attendance Corrections Table for V2.2
CREATE TABLE IF NOT EXISTS public.attendance_corrections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    requested_punch_in TIME,
    requested_punch_out TIME,
    reason TEXT,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    approved_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for Corrections
ALTER TABLE public.attendance_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their own corrections" 
ON public.attendance_corrections FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own corrections" 
ON public.attendance_corrections FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all corrections" 
ON public.attendance_corrections FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin', 'Manager')
    )
);

-- Function to sync approved correction to attendance table
CREATE OR REPLACE FUNCTION public.apply_attendance_correction()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.status = 'Approved' AND OLD.status = 'Pending') THEN
        -- Upsert Punch In
        IF NEW.requested_punch_in IS NOT NULL THEN
            INSERT INTO public.attendance (user_id, timestamp, type, status, location, branch)
            VALUES (
                NEW.user_id, 
                (NEW.date::text || ' ' || NEW.requested_punch_in::text)::timestamp, 
                'In', 
                'Present', 
                'Correction', 
                (SELECT branch FROM public.profiles WHERE id = NEW.user_id)
            );
        END IF;

        -- Upsert Punch Out
        IF NEW.requested_punch_out IS NOT NULL THEN
            INSERT INTO public.attendance (user_id, timestamp, type, status, location, branch)
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_apply_correction
AFTER UPDATE ON public.attendance_corrections
FOR EACH ROW
EXECUTE FUNCTION public.apply_attendance_correction();
