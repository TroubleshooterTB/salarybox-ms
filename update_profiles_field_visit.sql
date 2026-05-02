ALTER TABLE profiles ADD COLUMN IF NOT EXISTS field_visit_enabled BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS field_visit_allowance_eligible BOOLEAN DEFAULT false;
