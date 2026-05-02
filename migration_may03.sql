-- ============================================================
-- Migration: May 03, 2026 - Leave Balances, Field Visits, Reports
-- ============================================================

-- 1. Create leave_balances table
CREATE TABLE IF NOT EXISTS leave_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    sick_leave_total NUMERIC(5,2) DEFAULT 12,
    sick_leave_used NUMERIC(5,2) DEFAULT 0,
    privileged_leave_total NUMERIC(5,2) DEFAULT 15,
    privileged_leave_used NUMERIC(5,2) DEFAULT 0,
    casual_leave_total NUMERIC(5,2) DEFAULT 10,
    casual_leave_used NUMERIC(5,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, year)
);

ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage leave balances" ON leave_balances;
CREATE POLICY "Admins can manage leave balances" ON leave_balances
    FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin')));

DROP POLICY IF EXISTS "Users can view their own leave balances" ON leave_balances;
CREATE POLICY "Users can view their own leave balances" ON leave_balances
    FOR SELECT USING (auth.uid() = user_id);

-- 2. Create field_visits table
CREATE TABLE IF NOT EXISTS field_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE,
    start_time TIMESTAMPTZ DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    total_km NUMERIC(10,2) DEFAULT 0,
    status TEXT CHECK (status IN ('Active', 'Paused', 'Completed')) DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE field_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage field visits" ON field_visits;
CREATE POLICY "Admins can manage field visits" ON field_visits
    FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin')));

DROP POLICY IF EXISTS "Users can view their own field visits" ON field_visits;
CREATE POLICY "Users can view their own field visits" ON field_visits
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own field visits" ON field_visits;
CREATE POLICY "Users can insert their own field visits" ON field_visits
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own field visits" ON field_visits;
CREATE POLICY "Users can update their own field visits" ON field_visits
    FOR UPDATE USING (auth.uid() = user_id);

-- 3. Create field_visit_logs table
CREATE TABLE IF NOT EXISTS field_visit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID REFERENCES field_visits(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    type TEXT CHECK (type IN ('Start', 'Pause', 'Resume', 'Checkpoint', 'End', 'Stationary')),
    selfie_url TEXT,
    distance_from_last NUMERIC(10,2) DEFAULT 0,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE field_visit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage field visit logs" ON field_visit_logs;
CREATE POLICY "Admins can manage field visit logs" ON field_visit_logs
    FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin')));

DROP POLICY IF EXISTS "Users can view their own field visit logs" ON field_visit_logs;
CREATE POLICY "Users can view their own field visit logs" ON field_visit_logs
    FOR SELECT USING (EXISTS (SELECT 1 FROM field_visits WHERE id = visit_id AND user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own field visit logs" ON field_visit_logs;
CREATE POLICY "Users can insert their own field visit logs" ON field_visit_logs
    FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM field_visits WHERE id = visit_id AND user_id = auth.uid()));

-- 4. Ensure leave_requests has required columns and constraints
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS leave_type TEXT;
-- Update constraint if it exists
ALTER TABLE leave_requests DROP CONSTRAINT IF EXISTS leave_requests_leave_type_check;
ALTER TABLE leave_requests ADD CONSTRAINT leave_requests_leave_type_check 
    CHECK (leave_type IN ('PL', 'SL', 'CL', 'Unpaid', 'Sick Leave', 'Privileged Leave', 'Casual Leave'));
