-- =========================================================================
-- MINIMAL STROKE ERP - PHASE 4: MISSED PUNCH DETECTION
-- =========================================================================

CREATE OR REPLACE FUNCTION public.check_previous_missed_punch()
RETURNS TRIGGER AS $$
DECLARE
    last_punch_type TEXT;
    last_punch_time TIMESTAMP WITH TIME ZONE;
    user_name TEXT;
BEGIN
    -- Only trigger on 'In' punches
    IF (NEW.type = 'In') THEN
        -- Find the last punch for this user BEFORE the current one
        SELECT type, timestamp INTO last_punch_type, last_punch_time
        FROM public.attendance
        WHERE user_id = NEW.user_id AND timestamp < NEW.timestamp
        ORDER BY timestamp DESC
        LIMIT 1;

        -- If the last punch was also an 'In', it means they missed a 'Out'
        IF (last_punch_type = 'In') THEN
            -- Get user full name
            SELECT full_name INTO user_name FROM public.profiles WHERE id = NEW.user_id;

            -- 1. Notify the User
            INSERT INTO public.notifications (user_id, title, message, type)
            VALUES (
                NEW.user_id,
                'Missed Punch-Out',
                'You missed a punch-out on ' || TO_CHAR(last_punch_time, 'DD Mon') || '. Please contact HR for regularization.',
                'Warning'
            );

            -- 2. Notify Admins/HR (Super Admin)
            -- Simple version: notify all Super Admins
            INSERT INTO public.notifications (user_id, title, message, type)
            SELECT id, 'Attendance Gap: ' || user_name, user_name || ' missed a punch-out on ' || TO_CHAR(last_punch_time, 'DD Mon'), 'Alert'
            FROM public.profiles
            WHERE role = 'Super Admin';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ATTACH TRIGGER
DROP TRIGGER IF EXISTS tr_check_missed_punch ON public.attendance;
CREATE TRIGGER tr_check_missed_punch
    AFTER INSERT ON public.attendance
    FOR EACH ROW
    EXECUTE FUNCTION public.check_previous_missed_punch();
