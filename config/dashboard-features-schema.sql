-- Dashboard Features Schema

-- Supplier Ratings Table
CREATE TABLE IF NOT EXISTS supplier_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id),
    supplier_id UUID REFERENCES suppliers(id),
    vendor_id UUID REFERENCES vendors(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Supplier Inventory Table
CREATE TABLE IF NOT EXISTS supplier_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES suppliers(id),
    product_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    price NUMERIC(10,2) NOT NULL,
    quantity INTEGER DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent Visits Table
CREATE TABLE IF NOT EXISTS agent_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES field_agents(id),
    vendor_id UUID REFERENCES vendors(id),
    visit_type VARCHAR(50),
    notes TEXT,
    photo_url TEXT,
    visit_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add approval fields to orders if not exists
ALTER TABLE orders ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES auth.users(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Enable RLS
ALTER TABLE supplier_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_visits ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view ratings" ON supplier_ratings;
CREATE POLICY "Users can view ratings" ON supplier_ratings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Vendors can create ratings" ON supplier_ratings;
CREATE POLICY "Vendors can create ratings" ON supplier_ratings FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM vendors WHERE vendors.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Suppliers manage inventory" ON supplier_inventory;
CREATE POLICY "Suppliers manage inventory" ON supplier_inventory FOR ALL USING (
    supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users view inventory" ON supplier_inventory;
CREATE POLICY "Users view inventory" ON supplier_inventory FOR SELECT USING (true);

DROP POLICY IF EXISTS "Agents manage visits" ON agent_visits;
CREATE POLICY "Agents manage visits" ON agent_visits FOR ALL USING (
    agent_id IN (SELECT id FROM field_agents WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Supervisors view visits" ON agent_visits;
CREATE POLICY "Supervisors view visits" ON agent_visits FOR SELECT USING (
    EXISTS (SELECT 1 FROM supervisors WHERE supervisors.user_id = auth.uid())
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_supplier_ratings_supplier ON supplier_ratings(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_ratings_vendor ON supplier_ratings(vendor_id);
CREATE INDEX IF NOT EXISTS idx_supplier_inventory_supplier ON supplier_inventory(supplier_id);
CREATE INDEX IF NOT EXISTS idx_agent_visits_agent ON agent_visits(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_visits_vendor ON agent_visits(vendor_id);
