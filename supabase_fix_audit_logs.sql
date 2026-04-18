-- ============================================
-- FIX: audit_logs table — create if not exists
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================

-- Create the audit_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.audit_logs (
  log_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES auth.users(id),
  employee_id UUID REFERENCES auth.users(id),
  action_type TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- If table exists but is missing columns, add them safely
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'action_type') THEN
    ALTER TABLE public.audit_logs ADD COLUMN action_type TEXT DEFAULT 'UNKNOWN';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'old_value') THEN
    ALTER TABLE public.audit_logs ADD COLUMN old_value JSONB;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'new_value') THEN
    ALTER TABLE public.audit_logs ADD COLUMN new_value JSONB;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'reason') THEN
    ALTER TABLE public.audit_logs ADD COLUMN reason TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'admin_id') THEN
    ALTER TABLE public.audit_logs ADD COLUMN admin_id UUID REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'employee_id') THEN
    ALTER TABLE public.audit_logs ADD COLUMN employee_id UUID REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'timestamp') THEN
    ALTER TABLE public.audit_logs ADD COLUMN timestamp TIMESTAMPTZ DEFAULT now();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'log_id') THEN
    ALTER TABLE public.audit_logs ADD COLUMN log_id UUID DEFAULT gen_random_uuid();
  END IF;
END $$;

-- RLS: Allow service_role full access, admins can read
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (safe to re-run)
DROP POLICY IF EXISTS "Service role full access to audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can read audit_logs" ON public.audit_logs;

-- Service role bypasses RLS automatically, but add admin read policy
CREATE POLICY "Admins can read audit_logs" ON public.audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('Admin', 'Super Admin')
    )
  );

-- Grant access
GRANT ALL ON public.audit_logs TO service_role;
GRANT SELECT ON public.audit_logs TO authenticated;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON public.audit_logs(admin_id);
