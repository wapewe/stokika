-- Migration: Create RLS Policies for Vendor Tables
-- Description: Implements Row Level Security policies for vendors, vendor_scores, and vendor_eligibility tables
-- Requirements: 3.1-3.5, 25.1-25.8

-- ============================================================================
-- Enable RLS on Vendor Tables
-- ============================================================================

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_eligibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_product_catalog ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to check if user is vendor owner
CREATE OR REPLACE FUNCTION is_vendor_owner(vendor_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM vendors
        WHERE id = vendor_uuid
        AND profile_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has role
CREATE OR REPLACE FUNCTION has_role(role_names TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles p
        JOIN user_roles ur ON p.role_id = ur.id
        WHERE p.id = auth.uid()
        AND ur.role_name = ANY(role_names)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Vendors Table Policies
-- ============================================================================

-- Vendors can view their own profile
CREATE POLICY "Vendors can view own profile"
ON vendors FOR SELECT
USING (profile_id = auth.uid());

-- Field agents can view vendors they onboarded
CREATE POLICY "Field agents can view their vendors"
ON vendors FOR SELECT
USING (
    field_agent_id = auth.uid()
    OR has_role(ARRAY['supervisor', 'operations', 'admin', 'super_admin'])
);

-- Staff can view all vendors
CREATE POLICY "Staff can view all vendors"
ON vendors FOR SELECT
USING (has_role(ARRAY['operations', 'finance', 'admin', 'super_admin']));

-- Vendors can update their own profile
CREATE POLICY "Vendors can update own profile"
ON vendors FOR UPDATE
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

-- Field agents can update vendor verification status
CREATE POLICY "Field agents can update verification"
ON vendors FOR UPDATE
USING (
    field_agent_id = auth.uid()
    OR has_role(ARRAY['supervisor', 'operations', 'admin', 'super_admin'])
);

-- Only operations and admin can create vendors
CREATE POLICY "Operations can create vendors"
ON vendors FOR INSERT
WITH CHECK (has_role(ARRAY['operations', 'admin', 'super_admin']));

-- ============================================================================
-- Vendor Scores Table Policies
-- ============================================================================

-- Vendors can view their own scores
CREATE POLICY "Vendors can view own scores"
ON vendor_scores FOR SELECT
USING (is_vendor_owner(vendor_id));

-- Staff can view all vendor scores
CREATE POLICY "Staff can view all scores"
ON vendor_scores FOR SELECT
USING (has_role(ARRAY['operations', 'finance', 'admin', 'super_admin']));

-- Only system (operations) can insert/update scores
CREATE POLICY "Operations can manage scores"
ON vendor_scores FOR ALL
USING (has_role(ARRAY['operations', 'admin', 'super_admin']))
WITH CHECK (has_role(ARRAY['operations', 'admin', 'super_admin']));

-- ============================================================================
-- Vendor Eligibility Table Policies
-- ============================================================================

-- Vendors can view their own eligibility
CREATE POLICY "Vendors can view own eligibility"
ON vendor_eligibility FOR SELECT
USING (is_vendor_owner(vendor_id));

-- Staff can view all eligibility records
CREATE POLICY "Staff can view all eligibility"
ON vendor_eligibility FOR SELECT
USING (has_role(ARRAY['operations', 'finance', 'admin', 'super_admin']));

-- Only operations can manage eligibility
CREATE POLICY "Operations can manage eligibility"
ON vendor_eligibility FOR ALL
USING (has_role(ARRAY['operations', 'admin', 'super_admin']))
WITH CHECK (has_role(ARRAY['operations', 'admin', 'super_admin']));

-- ============================================================================
-- Vendor Product Catalog Table Policies
-- ============================================================================

-- Vendors can view their own catalog
CREATE POLICY "Vendors can view own catalog"
ON vendor_product_catalog FOR SELECT
USING (is_vendor_owner(vendor_id));

-- Vendors can update their own catalog
CREATE POLICY "Vendors can update own catalog"
ON vendor_product_catalog FOR ALL
USING (is_vendor_owner(vendor_id))
WITH CHECK (is_vendor_owner(vendor_id));

-- Staff can view all catalogs
CREATE POLICY "Staff can view all catalogs"
ON vendor_product_catalog FOR SELECT
USING (has_role(ARRAY['operations', 'finance', 'admin', 'super_admin']));

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON POLICY "Vendors can view own profile" ON vendors IS 'Vendors can only see their own vendor profile';
COMMENT ON POLICY "Staff can view all vendors" ON vendors IS 'Platform staff can see all vendor profiles';
COMMENT ON FUNCTION is_vendor_owner(UUID) IS 'Check if current user is the owner of specified vendor';
COMMENT ON FUNCTION has_role(TEXT[]) IS 'Check if current user has any of the specified roles';