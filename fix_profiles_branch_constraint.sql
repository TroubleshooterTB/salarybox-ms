-- =========================================================================
-- FIX: REMOVE HARDCODED BRANCH CONSTRAINT
-- This script removes the restrictive CHECK constraint on the branch column
-- to allow new branches/shifts to be created and assigned to employees.
-- =========================================================================

-- 1. Drop the restrictive branch check constraint
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_branch_check;

-- 2. (Optional but Recommended) Drop the restrictive department check constraint 
-- to prevent similar issues in the future as the organization grows
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_department_check;

-- 3. Verify the changes (Run this in Supabase SQL Editor)
-- SELECT 
--     conname AS constraint_name, 
--     consrc AS constraint_definition
-- FROM 
--     pg_constraint 
-- WHERE 
--     conrelid = 'public.profiles'::regclass;
