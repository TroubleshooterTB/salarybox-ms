-- =========================================================================
-- V2.0 MIGRATION: ERP OVERHAUL
-- Run this in your Supabase SQL Editor to append Phase 10 Requirements
-- =========================================================================

-- 1. Profile Field Additions
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_leaving DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS background_verified BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS professional_tax_applicable BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS multiple_branches TEXT[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_account_details TEXT;

-- 2. Role Based Access Control Upgrade
-- If job_title exists, we retain it for vanity, but use 'role' for rigid RBAC
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'Employee' 
    CHECK (role IN ('Employee', 'Branch Admin', 'Attendance Manager', 'Advanced Attendance Manager', 'Super Admin'));

-- 3. Overtime Type
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS overtime_type TEXT DEFAULT 'None' 
    CHECK (overtime_type IN ('None', 'Hourly', 'Day Basic'));

-- 4. Leave Request Additions
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS is_half_day BOOLEAN DEFAULT false;

-- 5. Loan Schedules Engine (Flexible Deductions)
CREATE TABLE IF NOT EXISTS public.loan_schedules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_month TEXT NOT NULL, -- e.g., '2026-03'
    deduction_amount NUMERIC(12, 2) NOT NULL,
    is_processed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.loan_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read/write for all authenticated users" 
ON public.loan_schedules FOR ALL USING (auth.role() = 'authenticated');
