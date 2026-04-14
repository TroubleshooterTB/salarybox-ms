-- 1. Add 'needs_password_reset' column to profiles if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='needs_password_reset') THEN
        ALTER TABLE profiles ADD COLUMN needs_password_reset BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 2. Create 'password_reset_requests' table
CREATE TABLE IF NOT EXISTS password_reset_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id TEXT NOT NULL,
    full_name TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS on password_reset_requests
ALTER TABLE password_reset_requests ENABLE ROW LEVEL SECURITY;

-- 4. Policies for password_reset_requests
-- Public can insert (forgot password page is public)
CREATE POLICY "Public can insert reset requests" ON password_reset_requests FOR INSERT WITH CHECK (true);

-- Admins can view/update all
CREATE POLICY "Admins can view reset requests" ON password_reset_requests FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('Admin', 'Super Admin')
    )
);

CREATE POLICY "Admins can update reset requests" ON password_reset_requests FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('Admin', 'Super Admin')
    )
);
