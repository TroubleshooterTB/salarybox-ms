-- Minimal Stroke ERP Supabase Schema

-- 1. Profiles Table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone_number TEXT,
  employee_id TEXT UNIQUE,
  job_title TEXT,
  branch TEXT CHECK (branch IN ('Factory', 'Main', 'The Mint', 'Wings')),
  department TEXT CHECK (department IN ('Q1', 'Q2')),
  joining_date DATE,
  ctc_amount NUMERIC(12, 2),
  bank_account TEXT,
  ifsc_code TEXT,
  device_fingerprint TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: In a real app we'd enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);

-- 2. Attendance Table
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('In', 'Out')),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  address_string TEXT,
  selfie_url TEXT,
  status TEXT CHECK (status IN ('Present', 'Late', 'Early Leaving', 'Half Day', 'Absent')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own attendance" ON attendance FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own attendance" ON attendance FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Leaves Table (Balances)
CREATE TABLE leaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  privilege_balance NUMERIC(5, 2) DEFAULT 0,
  sick_balance NUMERIC(5, 2) DEFAULT 0,
  casual_balance NUMERIC(5, 2) DEFAULT 0,
  last_carried_forward_year INTEGER
);
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own leaves" ON leaves FOR SELECT USING (auth.uid() = user_id);

-- 4. Loans Ledger
CREATE TABLE loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  loan_amount NUMERIC(12, 2) NOT NULL,
  type TEXT CHECK (type IN ('Debit', 'Credit')),
  transaction_date DATE DEFAULT CURRENT_DATE,
  remaining_balance NUMERIC(12, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own loans" ON loans FOR SELECT USING (auth.uid() = user_id);

-- 5. Storage BUCKET for Selfies
-- (Assuming auth.uid() check for inserting logic in Storage policies. You might need to create the bucket 'attendance-photos' manually via dashboard and attach standard policies.)
-- Example SQL to create bucket if running as superuser:
INSERT INTO storage.buckets (id, name, public) VALUES ('attendance-photos', 'attendance-photos', true)
ON CONFLICT (id) DO NOTHING;
