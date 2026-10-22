-- ============================================================================
-- FIX SUPPLIER REGISTRATION PERMISSIONS
-- ============================================================================
-- Run this in Supabase Dashboard > SQL Editor
-- Issue: Edge Function getting "permission denied for table suppliers"
-- Solution: Grant service_role full access to supplier tables
-- ============================================================================

-- GRANT PERMISSIONS TO SERVICE ROLE
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_products TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_locations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_certifications TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_volume_pricing TO service_role;

-- ============================================================================
-- CREATE SERVICE ROLE POLICY (Full Bypass)
-- ============================================================================

-- Drop existing if present
DROP POLICY IF EXISTS "Service role full access to suppliers" ON suppliers;

-- Create service role policy
CREATE POLICY "Service role full access to suppliers"
    ON suppliers FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- VERIFY SUCCESS
-- ============================================================================

-- Check if policies exist
SELECT 
    schemaname,
    tablename,
    policyname,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'suppliers'
ORDER BY policyname;

-- Check if permissions granted
SELECT 
    grantee,
    table_name,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'suppliers' AND grantee = 'service_role';

-- ============================================================================
-- EXPECTED OUTPUT
-- ============================================================================
-- Should see:
-- 1. "Service role full access to suppliers" policy listed
-- 2. service_role with SELECT, INSERT, UPDATE, DELETE privileges
-- ============================================================================
