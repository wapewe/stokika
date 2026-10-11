-- ============================================================================
-- CONSOLIDATED SCHEMA FIXES
-- Run this script in Supabase SQL Editor to add missing tables and fix schemas
-- ============================================================================

-- ============================================================================
-- PART 1: CREATE INVENTORY TABLES
-- ============================================================================

-- Inventory Table
CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity_on_hand INTEGER NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
    reserved_quantity INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
    available_quantity INTEGER GENERATED ALWAYS AS (quantity_on_hand - reserved_quantity) STORED,
    reorder_level INTEGER NOT NULL DEFAULT 0 CHECK (reorder_level >= 0),
    reorder_quantity INTEGER NOT NULL DEFAULT 0 CHECK (reorder_quantity >= 0),
    unit_cost DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
    last_restocked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(supplier_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_supplier ON inventory(supplier_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_available ON inventory(available_quantity);
CREATE INDEX IF NOT EXISTS idx_inventory_reorder_level ON inventory(reorder_level);

CREATE TRIGGER update_inventory_updated_at 
    BEFORE UPDATE ON inventory
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Inventory Movements Table
CREATE TABLE IF NOT EXISTS inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
    movement_type TEXT NOT NULL CHECK (movement_type IN (
        'receipt', 'sale', 'adjustment', 'transfer', 'reservation', 'release'
    )),
    quantity INTEGER NOT NULL,
    reference_type TEXT CHECK (reference_type IN ('order', 'transfer', 'adjustment', 'stock_request')),
    reference_id UUID,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_inventory ON inventory_movements(inventory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON inventory_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_reference ON inventory_movements(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON inventory_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_by ON inventory_movements(created_by);

-- Enable RLS
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Inventory
CREATE POLICY "Suppliers can manage own inventory"
ON inventory FOR ALL
USING (
    supplier_id IN (
        SELECT id FROM suppliers WHERE profile_id = auth.uid()
    )
)
WITH CHECK (
    supplier_id IN (
        SELECT id FROM suppliers WHERE profile_id = auth.uid()
    )
);

CREATE POLICY "Staff can view all inventory"
ON inventory FOR SELECT
USING (has_role(ARRAY['operations', 'finance', 'admin', 'super_admin']));

CREATE POLICY "Vendors can view available inventory"
ON inventory FOR SELECT
USING (
    EXISTS (SELECT 1 FROM vendors WHERE profile_id = auth.uid())
    AND available_quantity > 0
);

-- RLS Policies for Inventory Movements
CREATE POLICY "Suppliers can view own movements"
ON inventory_movements FOR SELECT
USING (
    inventory_id IN (
        SELECT id FROM inventory WHERE supplier_id IN (
            SELECT id FROM suppliers WHERE profile_id = auth.uid()
        )
    )
);

CREATE POLICY "Suppliers can create own movements"
ON inventory_movements FOR INSERT
WITH CHECK (
    inventory_id IN (
        SELECT id FROM inventory WHERE supplier_id IN (
            SELECT id FROM suppliers WHERE profile_id = auth.uid()
        )
    )
);

CREATE POLICY "Staff can view all movements"
ON inventory_movements FOR SELECT
USING (has_role(ARRAY['operations', 'finance', 'admin', 'super_admin']));

-- ============================================================================
-- PART 2: FIX DELIVERY TABLES
-- ============================================================================

-- Add missing columns to deliveries
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS tracking_number TEXT;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS carrier_name TEXT;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS estimated_delivery_date DATE;

-- Update tracking_number to match delivery_number for existing records
UPDATE deliveries SET tracking_number = delivery_number WHERE tracking_number IS NULL;

-- Create index on tracking_number
CREATE INDEX IF NOT EXISTS idx_deliveries_tracking_number ON deliveries(tracking_number);

-- Add missing columns to delivery_status_history
ALTER TABLE delivery_status_history ADD COLUMN IF NOT EXISTS event_location TEXT;
ALTER TABLE delivery_status_history ADD COLUMN IF NOT EXISTS event_notes TEXT;

-- Create index on event_location
CREATE INDEX IF NOT EXISTS idx_delivery_status_history_location ON delivery_status_history(event_location);

-- ============================================================================
-- PART 3: FIX VENDOR ELIGIBILITY
-- ============================================================================

-- Add outstanding_balance column
ALTER TABLE vendor_eligibility ADD COLUMN IF NOT EXISTS outstanding_balance DECIMAL(10,2) DEFAULT 0 CHECK (outstanding_balance >= 0);

-- Create index on outstanding_balance
CREATE INDEX IF NOT EXISTS idx_vendor_eligibility_outstanding ON vendor_eligibility(outstanding_balance);

-- Create view with alias column names for backward compatibility
CREATE OR REPLACE VIEW vendor_eligibility_details AS
SELECT 
    id,
    vendor_id,
    is_eligible,
    eligibility_amount,
    eligibility_amount AS eligible_amount,
    eligibility_tier,
    last_calculated_at,
    last_calculated_at AS calculated_at,
    next_review_date,
    ineligibility_reason,
    outstanding_balance,
    created_at,
    updated_at
FROM vendor_eligibility;

-- Function to calculate remaining credit
CREATE OR REPLACE FUNCTION get_vendor_remaining_credit(p_vendor_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    v_eligible_amount DECIMAL(10,2);
    v_outstanding DECIMAL(10,2);
BEGIN
    SELECT 
        COALESCE(eligibility_amount, 0),
        COALESCE(outstanding_balance, 0)
    INTO v_eligible_amount, v_outstanding
    FROM vendor_eligibility
    WHERE vendor_id = p_vendor_id
    ORDER BY last_calculated_at DESC
    LIMIT 1;
    
    RETURN GREATEST(0, v_eligible_amount - v_outstanding);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE inventory IS 'Supplier inventory levels and stock tracking';
COMMENT ON TABLE inventory_movements IS 'Audit trail of inventory changes';
COMMENT ON COLUMN deliveries.tracking_number IS 'External tracking number for carrier tracking';
COMMENT ON COLUMN deliveries.carrier_name IS 'Name of delivery carrier/company';
COMMENT ON COLUMN deliveries.estimated_delivery_date IS 'Estimated delivery date provided by carrier';
COMMENT ON COLUMN delivery_status_history.event_location IS 'Location where status change occurred';
COMMENT ON COLUMN delivery_status_history.event_notes IS 'Additional notes about the status change event';
COMMENT ON COLUMN vendor_eligibility.outstanding_balance IS 'Current outstanding balance owed by vendor';
COMMENT ON VIEW vendor_eligibility_details IS 'Vendor eligibility with alias columns for backward compatibility';
COMMENT ON FUNCTION get_vendor_remaining_credit IS 'Calculate vendor remaining credit';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify inventory table exists
SELECT 'inventory table created' AS status, COUNT(*) AS column_count 
FROM information_schema.columns 
WHERE table_name = 'inventory';

-- Verify inventory_movements table exists
SELECT 'inventory_movements table created' AS status, COUNT(*) AS column_count 
FROM information_schema.columns 
WHERE table_name = 'inventory_movements';

-- Verify delivery columns added
SELECT 'delivery columns added' AS status, 
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'deliveries' AND column_name = 'tracking_number') AS has_tracking_number,
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'deliveries' AND column_name = 'carrier_name') AS has_carrier_name;

-- Verify eligibility column added
SELECT 'eligibility column added' AS status,
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'vendor_eligibility' AND column_name = 'outstanding_balance') AS has_outstanding_balance;
