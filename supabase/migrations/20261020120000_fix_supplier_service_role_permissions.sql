-- Fix Service Role Permissions for Supplier Registration
-- Issue: Edge Function (service_role) getting "permission denied" when inserting suppliers
-- Solution: Grant necessary permissions and ensure service_role policy exists

-- ============================================================================
-- GRANT PERMISSIONS TO SERVICE ROLE
-- ============================================================================

-- Grant full access to suppliers table for service_role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO service_role;

-- Grant full access to supplier_products for service_role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_products TO service_role;

-- Grant full access to supplier_locations for service_role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_locations TO service_role;

-- Grant full access to supplier_certifications for service_role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_certifications TO service_role;

-- Grant full access to supplier_volume_pricing for service_role (if needed in future)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_volume_pricing TO service_role;

-- ============================================================================
-- VERIFY RLS POLICIES FOR SERVICE ROLE
-- ============================================================================

-- Ensure service_role has bypass policy on suppliers (if RLS is enabled)
-- Service role should have full access regardless of RLS

-- Drop existing service role policy if it exists
DROP POLICY IF EXISTS "Service role full access to suppliers" ON suppliers;

-- Create comprehensive service role policy
CREATE POLICY "Service role full access to suppliers"
    ON suppliers FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- VERIFY ANON ROLE CAN READ SUPPLIERS (for public supplier catalog)
-- ============================================================================

-- Allow anonymous users to read active suppliers for catalog/directory
DROP POLICY IF EXISTS "Public can view active suppliers" ON suppliers;

CREATE POLICY "Public can view active suppliers"
    ON suppliers FOR SELECT
    TO anon
    USING (is_active = true AND is_verified = true);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "Service role full access to suppliers" ON suppliers IS 
'Edge Functions running with service_role key need full access for supplier registration';

COMMENT ON POLICY "Public can view active suppliers" ON suppliers IS 
'Allow anonymous users to browse verified and active suppliers in the catalog';
