-- Table for Odoo Connection Settings
CREATE TABLE IF NOT EXISTS odoo_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    url TEXT NOT NULL,
    db TEXT NOT NULL,
    username TEXT NOT NULL,
    api_key TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for Field Expenses
CREATE TABLE IF NOT EXISTS field_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    visit_id UUID REFERENCES field_visits(id),
    amount DECIMAL(10,2) NOT NULL,
    category TEXT NOT NULL, -- Fuel, Food, Others
    receipt_url TEXT,
    status TEXT DEFAULT 'Pending', -- Pending, Approved, Rejected
    admin_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add Odoo Sync status to field_visit_logs if needed, or just track it
ALTER TABLE field_visit_logs ADD COLUMN IF NOT EXISTS odoo_lead_id TEXT;
