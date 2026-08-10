-- ==========================================
-- MS Salarybox: Operations Module Schema
-- ==========================================

-- 1. Manufacturing Orders Table
CREATE TABLE IF NOT EXISTS public.manufacturing_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mo_id VARCHAR(50) NOT NULL UNIQUE,
    client_name VARCHAR(255) NOT NULL,
    priority VARCHAR(50) NOT NULL DEFAULT 'Standard',
    status INTEGER NOT NULL DEFAULT 1, -- 1: Admin, 2: Planning, 3: Procurement, 4: Production, 5: Final QC
    sla_deadline TIMESTAMP WITH TIME ZONE,
    current_owner VARCHAR(255),
    order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.manufacturing_orders ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to select, insert, update
CREATE POLICY "Allow authenticated users full access to MOs" ON public.manufacturing_orders
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);


-- 2. QC Logs Table
CREATE TABLE IF NOT EXISTS public.qc_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mo_id VARCHAR(50) NOT NULL REFERENCES public.manufacturing_orders(mo_id) ON DELETE CASCADE,
    stage VARCHAR(100) NOT NULL,
    decision VARCHAR(50) NOT NULL, -- 'Pass' or 'Reject'
    image_url TEXT,
    deviation_notes TEXT,
    logged_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.qc_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read/insert QC logs" ON public.qc_logs
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);


-- 3. Franchise Leads Table
CREATE TABLE IF NOT EXISTS public.franchise_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_name VARCHAR(255) NOT NULL,
    target_zone VARCHAR(255),
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50),
    application_status VARCHAR(100) DEFAULT 'New',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.franchise_leads ENABLE ROW LEVEL SECURITY;

-- Public can insert (from the form), authenticated can read
CREATE POLICY "Allow anonymous inserts to franchise leads" ON public.franchise_leads
    FOR INSERT
    TO public, anon, authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated to read franchise leads" ON public.franchise_leads
    FOR SELECT
    TO authenticated
    USING (true);


-- ==========================================
-- Dummy Data for MO Tracker
-- ==========================================
INSERT INTO public.manufacturing_orders (mo_id, client_name, priority, status, sla_deadline, current_owner, order_date)
VALUES 
    ('MO-2608-A', 'Taj Hospitality - Outdoor Swing', 'High', 1, NOW() - INTERVAL '1 day', 'Operations Manager', NOW() - INTERVAL '2 days'),
    ('MO-2608-B', 'Villa 24 - Liso Urbano Set', 'Standard', 1, NOW() + INTERVAL '2 days', 'Operations Manager', NOW() - INTERVAL '1 day'),
    ('MO-2607-X', 'Urban Jula - Custom Weave', 'High', 2, NOW() + INTERVAL '1 day', 'Production Engineer', NOW() - INTERVAL '3 days'),
    ('MO-2607-Y', 'Cafe Mocha - 40 Chairs', 'Standard', 3, NOW() + INTERVAL '4 days', 'Purchase Manager', NOW() - INTERVAL '5 days'),
    ('MO-2606-Z', 'Project Series - Loungers', 'High', 4, NOW() - INTERVAL '2 days', 'Factory Manager', NOW() - INTERVAL '10 days'),
    ('MO-2606-W', 'Residential - Dining Table', 'Standard', 5, NOW() + INTERVAL '5 days', 'Logistics Manager', NOW() - INTERVAL '12 days')
ON CONFLICT (mo_id) DO NOTHING;
