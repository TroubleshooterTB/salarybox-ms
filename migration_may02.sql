-- ============================================================
-- Migration: May 02, 2026 - OT, Manual Punch, Loans, Weekly Off
-- ============================================================

-- 1. Update Profiles for Employee-level OT and Second Weekly Off
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS overtime_applicable BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS overtime_hourly_rate NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weekly_off_day_2 INTEGER DEFAULT -1, -- -1 means No Second Weekly Off
  ADD COLUMN IF NOT EXISTS needs_password_reset BOOLEAN DEFAULT FALSE;

-- 2. Create manual_punch_requests table
CREATE TABLE IF NOT EXISTS manual_punch_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES auth.users(id),
    action_type TEXT CHECK (action_type IN ('ADD', 'UPDATE', 'DELETE')),
    target_attendance_id UUID REFERENCES attendance(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    punch_in TIMESTAMPTZ,
    punch_out TIMESTAMPTZ,
    new_status TEXT,
    reason TEXT,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE manual_punch_requests ENABLE ROW LEVEL SECURITY;

-- Admins/Super Admins can manage all
CREATE POLICY "Admins can manage manual punch requests" ON manual_punch_requests
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin'))
    );

-- Employees can view their own
CREATE POLICY "Users can view their own manual punch requests" ON manual_punch_requests
    FOR SELECT USING (auth.uid() = user_id);

-- 3. Update branches table (optional: clean up OT fields later if desired, keeping for now to avoid breaking existing code during migration)
-- ALTER TABLE branches DROP COLUMN IF EXISTS overtime_applicable;
-- ALTER TABLE branches DROP COLUMN IF EXISTS overtime_hourly_rate;

-- 4. Loan Management Tables
CREATE TABLE IF NOT EXISTS loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT, -- Disbursement, Credit, Balance Correction
    loan_amount NUMERIC(12, 2) DEFAULT 0,
    remaining_balance NUMERIC(12, 2) DEFAULT 0,
    transaction_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loan_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    target_month TEXT NOT NULL, -- YYYY-MM
    deduction_amount NUMERIC(12, 2) DEFAULT 0,
    is_processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist if table was already there
ALTER TABLE loan_schedules ADD COLUMN IF NOT EXISTS is_skipped BOOLEAN DEFAULT FALSE;
ALTER TABLE loan_schedules ADD COLUMN IF NOT EXISTS skip_reason TEXT;

-- RLS for Loan Tables
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_schedules ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts if re-running
DROP POLICY IF EXISTS "Admins can manage loans" ON loans;
DROP POLICY IF EXISTS "Admins can manage loan schedules" ON loan_schedules;
DROP POLICY IF EXISTS "Users can view their own loans" ON loans;
DROP POLICY IF EXISTS "Users can view their own loan schedules" ON loan_schedules;

CREATE POLICY "Admins can manage loans" ON loans
    FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin')));

CREATE POLICY "Admins can manage loan schedules" ON loan_schedules
    FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin')));

CREATE POLICY "Users can view their own loans" ON loans
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own loan schedules" ON loan_schedules
    FOR SELECT USING (auth.uid() = user_id);
