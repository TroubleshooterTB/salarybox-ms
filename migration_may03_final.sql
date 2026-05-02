-- migration_may03_final.sql
-- Consolidated SQL for all May 03 updates

-- 1. Field Visits & KM Tracking
CREATE TABLE IF NOT EXISTS field_visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  date DATE DEFAULT CURRENT_DATE,
  start_time TIMESTAMPTZ DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  total_km DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'Running',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS field_visit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visit_id UUID REFERENCES field_visits(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  latitude DECIMAL(10,8),
  longitude DECIMAL(10,8),
  action TEXT,
  selfie_url TEXT
);

-- 2. Leave Balances System
CREATE TABLE IF NOT EXISTS leave_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  year INTEGER NOT NULL,
  privileged_leave_total DECIMAL(5,2) DEFAULT 15,
  privileged_leave_used DECIMAL(5,2) DEFAULT 0,
  sick_leave_total DECIMAL(5,2) DEFAULT 12,
  sick_leave_used DECIMAL(5,2) DEFAULT 0,
  casual_leave_total DECIMAL(5,2) DEFAULT 10,
  casual_leave_used DECIMAL(5,2) DEFAULT 0,
  UNIQUE(user_id, year)
);

-- 3. Payroll Lockdown Mechanism
CREATE TABLE IF NOT EXISTS payroll_lockdown (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  month_year TEXT UNIQUE NOT NULL, -- Format: YYYY-MM
  locked_at TIMESTAMPTZ DEFAULT NOW(),
  locked_by UUID REFERENCES auth.users(id)
);

-- 4. Employee Personal Notes
CREATE TABLE IF NOT EXISTS employee_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Profile Column for Petrol Allowance
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS petrol_allowance_rate DECIMAL(10,2) DEFAULT 3.75;

-- 6. RLS Policies
ALTER TABLE field_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_visit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_lockdown ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_notes ENABLE ROW LEVEL SECURITY;

-- Field Visits Policies
CREATE POLICY "Users can manage own visits" ON field_visits FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins view all field data" ON field_visits FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin')));

CREATE POLICY "Users can add own visit logs" ON field_visit_logs FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM field_visits WHERE id = visit_id AND user_id = auth.uid()));
CREATE POLICY "Admins view all logs" ON field_visit_logs FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin')));

-- Leave Balances Policies
CREATE POLICY "Users view own balances" ON leave_balances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage balances" ON leave_balances FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin')));

-- Lockdown Policies
CREATE POLICY "Anyone can view lockdown" ON payroll_lockdown FOR SELECT USING (true);
CREATE POLICY "Admins manage lockdown" ON payroll_lockdown FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin')));

-- Notes Policies
CREATE POLICY "Users manage own notes" ON employee_notes FOR ALL USING (auth.uid() = user_id);
