-- Migration: Create RLS Policies for Supplier Tables
-- Description: Implements Row Level Security policies for suppliers and supplier_products tables
-- Requirements: 3.1-3.5, 25.1-25.8

-- ============================================================================
-- Enable RLS on Supplier Tables
-- ============================================================================

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_products ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Helper Function
-- ============================================================================

-- Function to check if user is supplier owner
CREATE OR REPLACE FUNCTION is_supplier_owner(supplier_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM suppliers
        WHERE id = supplier_uuid
        AND profile_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Suppliers Table Policies
-- ============================================================================

-- Suppliers can view their own profile
CREATE POLICY "Suppliers can view own profile"
ON suppliers FOR SELECT
USING (profile_id = auth.uid());

-- Vendors can view active verified suppliers
CREATE POLICY "Vendors can view active suppliers"
ON suppliers FOR SELECT
USING (
    is_verified = true
    AND is_active = true
    AND has_role(ARRAY['vendor'])
);

-- Staff can view all suppliers
CREATE POLICY "Staff can view all suppliers"
ON suppliers FOR SELECT
USING (has_role(ARRAY['operations', 'finance', 'admin', 'super_admin']));

-- Suppliers can update their own profile
CREATE POLICY "Suppliers can update own profile"
ON suppliers FOR UPDATE
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

-- Operations can manage suppliers
CREATE POLICY "Operations can manage suppliers"
ON suppliers FOR ALL
USING (has_role(ARRAY['operations', 'admin', 'super_admin']))
WITH CHECK (has_role(ARRAY['operations', 'admin', 'super_admin']));

-- ============================================================================
-- Supplier Products Table Policies
-- ============================================================================

-- Suppliers can view their own products
CREATE POLICY "Suppliers can view own products"
ON supplier_products FOR SELECT
USING (is_supplier_owner(supplier_id));

-- Suppliers can manage their own products
CREATE POLICY "Suppliers can manage own products"
ON supplier_products FOR ALL
USING (is_supplier_owner(supplier_id))
WITH CHECK (is_supplier_owner(supplier_id));

-- Vendors can view available products from verified active suppliers
CREATE POLICY "Vendors can view available products"
ON supplier_products FOR SELECT
USING (
    is_available = true
    AND has_role(ARRAY['vendor'])
    AND EXISTS (
        SELECT 1 FROM suppliers
        WHERE suppliers.id = supplier_products.supplier_id
        AND suppliers.is_verified = true
        AND suppliers.is_active = true
    )
);

-- Staff can view all supplier products
CREATE POLICY "Staff can view all supplier products"
ON supplier_products FOR SELECT
USING (has_role(ARRAY['operations', 'finance', 'admin', 'super_admin']));

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON POLICY "Suppliers can view own profile" ON suppliers IS 'Suppliers can only see their own supplier profile';
COMMENT ON POLICY "Vendors can view active suppliers" ON suppliers IS 'Vendors can see verified and active suppliers';
COMMENT ON FUNCTION is_supplier_owner(UUID) IS 'Check if current user is the owner of specified supplier';