-- Migration: Create Inventory Management Tables
-- Description: Creates inventory and inventory movements tables for supplier stock tracking
-- Requirements: Inventory service support

-- ============================================================================
-- Inventory Table
-- ============================================================================

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

-- Create indexes for inventory
CREATE INDEX IF NOT EXISTS idx_inventory_supplier ON inventory(supplier_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_available ON inventory(available_quantity);
CREATE INDEX IF NOT EXISTS idx_inventory_reorder_level ON inventory(reorder_level);

-- Apply updated_at trigger
CREATE TRIGGER update_inventory_updated_at 
    BEFORE UPDATE ON inventory
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Inventory Movements Table
-- ============================================================================

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

-- Create indexes for inventory_movements
CREATE INDEX IF NOT EXISTS idx_inventory_movements_inventory ON inventory_movements(inventory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON inventory_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_reference ON inventory_movements(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON inventory_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_by ON inventory_movements(created_by);

-- ============================================================================
-- Enable RLS
-- ============================================================================

ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies for Inventory
-- ============================================================================

-- Suppliers can view and manage their own inventory
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

-- Operations and admin can view all inventory
CREATE POLICY "Staff can view all inventory"
ON inventory FOR SELECT
USING (has_role(ARRAY['operations', 'finance', 'admin', 'super_admin']));

-- Vendors can view inventory for products they're interested in (read-only)
CREATE POLICY "Vendors can view available inventory"
ON inventory FOR SELECT
USING (
    EXISTS (SELECT 1 FROM vendors WHERE profile_id = auth.uid())
    AND available_quantity > 0
);

-- ============================================================================
-- RLS Policies for Inventory Movements
-- ============================================================================

-- Suppliers can view movements for their inventory
CREATE POLICY "Suppliers can view own movements"
ON inventory_movements FOR SELECT
USING (
    inventory_id IN (
        SELECT id FROM inventory WHERE supplier_id IN (
            SELECT id FROM suppliers WHERE profile_id = auth.uid()
        )
    )
);

-- Suppliers can create movements for their inventory
CREATE POLICY "Suppliers can create own movements"
ON inventory_movements FOR INSERT
WITH CHECK (
    inventory_id IN (
        SELECT id FROM inventory WHERE supplier_id IN (
            SELECT id FROM suppliers WHERE profile_id = auth.uid()
        )
    )
);

-- Staff can view all movements
CREATE POLICY "Staff can view all movements"
ON inventory_movements FOR SELECT
USING (has_role(ARRAY['operations', 'finance', 'admin', 'super_admin']));

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE inventory IS 'Supplier inventory levels and stock tracking';
COMMENT ON TABLE inventory_movements IS 'Audit trail of inventory changes (receipts, sales, adjustments)';
COMMENT ON COLUMN inventory.quantity_on_hand IS 'Total physical quantity in stock';
COMMENT ON COLUMN inventory.reserved_quantity IS 'Quantity reserved for pending orders';
COMMENT ON COLUMN inventory.available_quantity IS 'Computed: quantity_on_hand - reserved_quantity';
COMMENT ON COLUMN inventory.reorder_level IS 'Minimum stock level that triggers reorder alert';
COMMENT ON COLUMN inventory.reorder_quantity IS 'Standard quantity to order when restocking';
COMMENT ON COLUMN inventory.unit_cost IS 'Cost per unit for inventory valuation';
COMMENT ON COLUMN inventory_movements.movement_type IS 'Type of inventory movement';
COMMENT ON COLUMN inventory_movements.quantity IS 'Quantity moved (positive or negative)';
COMMENT ON COLUMN inventory_movements.reference_type IS 'Type of document causing the movement';
COMMENT ON COLUMN inventory_movements.reference_id IS 'UUID of the referenced document';
