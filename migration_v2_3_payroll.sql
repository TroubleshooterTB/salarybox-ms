-- Phase 3: Payroll Adjustments & Variable Earnings
-- This table stores month-specific adjustments for each employee.

CREATE TABLE IF NOT EXISTS payroll_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL, -- Format: YYYY-MM
  bonus NUMERIC DEFAULT 0,
  incentive NUMERIC DEFAULT 0,
  fines NUMERIC DEFAULT 0,
  other_deductions NUMERIC DEFAULT 0,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, month_year)
);

-- Enable RLS
ALTER TABLE payroll_adjustments ENABLE ROW LEVEL SECURITY;

-- Admin/Manager Policies: Full Access
CREATE POLICY "Admins can manage all payroll adjustments"
  ON payroll_adjustments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role IN ('Admin', 'Super Admin', 'Branch Admin'))
    )
  );

-- Employee Policy: Read-Only (view own adjustments)
CREATE POLICY "Employees can view own payroll adjustments"
  ON payroll_adjustments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_payroll_adj_user ON payroll_adjustments(user_id);
CREATE INDEX IF NOT EXISTS idx_payroll_adj_date ON payroll_adjustments(month_year);
