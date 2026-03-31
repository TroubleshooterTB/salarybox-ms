-- =========================================================================
-- MINIMAL STROKE ERP - MASTER CLEANUP SCRIPT (FRESH START)
-- =========================================================================
-- WARNING: This will permanently delete ALL staff accounts and their data.
-- Your 'admin@minimalstroke.com' account will be spared if you follow Step 2.

-- 1. DELETE ALL STAFF DATA
-- This removes everything from all linked tables.
TRUNCATE public.profiles RESTART IDENTITY CASCADE;
TRUNCATE public.attendance RESTART IDENTITY CASCADE;
TRUNCATE public.leaves RESTART IDENTITY CASCADE;
TRUNCATE public.leave_requests RESTART IDENTITY CASCADE;
TRUNCATE public.attendance_corrections RESTART IDENTITY CASCADE;
TRUNCATE public.loans RESTART IDENTITY CASCADE;
TRUNCATE public.payroll_adjustments RESTART IDENTITY CASCADE;

-- 2. DELETE ALL AUTH IDENTITIES (EXCEPT KEY ADMINS)
-- Replace the email below with any admin email you want to KEEP.
DELETE FROM auth.users 
WHERE email NOT IN (
  'admin@minimalstroke.com'
  -- Add other emails to keep here
);

-- 3. RE-SYNC ADMIN PROFILE
-- If your admin profile was cleared in Step 1, this recreates it for the remaining auth user.
INSERT INTO public.profiles (id, full_name, role, job_title, department)
SELECT id, 'System Admin', 'Super Admin', 'Admin', 'Management'
FROM auth.users
WHERE email = 'admin@minimalstroke.com'
ON CONFLICT (id) DO UPDATE SET role = 'Super Admin';
