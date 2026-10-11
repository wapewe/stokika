-- Migration: Create RLS Policies for id_number Column Access
-- Description: Implements Row Level Security policies for id_number column in profiles and vendors tables
-- Date: 2026-01-17
-- Purpose: Control access to sensitive ID number data - users can read their own, admins can read all
-- Requirements: Security requirements from vendor-id-manual-payment design

-- ============================================================================
-- Profiles Table - id_number Access Policies
-- ============================================================================

-- Policy: Users can select their own id_number
CREATE POLICY "profiles_own_id_number_select"
ON profiles FOR SELECT
USING (id = auth.uid());

COMMENT ON POLICY "profiles_own_id_number_select" ON profiles IS 
'Allows users to read their own id_number from their profile';

-- Policy: Admins can select all id_numbers
CREATE POLICY "profiles_admin_id_number_select"
ON profiles FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles p
        JOIN user_roles ur ON p.role_id = ur.id
        WHERE p.id = auth.uid()
        AND ur.role_name IN ('admin', 'super_admin', 'operations')
    )
);

COMMENT ON POLICY "profiles_admin_id_number_select" ON profiles IS 
'Allows admin, super_admin, and operations staff to read all id_numbers for verification and support';

-- ============================================================================
-- Vendors Table - id_number Access Policies
-- ============================================================================

-- Policy: Vendors can select their own id_number
CREATE POLICY "vendors_own_id_number_select"
ON vendors FOR SELECT
USING (profile_id = auth.uid());

COMMENT ON POLICY "vendors_own_id_number_select" ON vendors IS 
'Allows vendors to read their own id_number from their vendor profile';

-- Policy: Admins can select all vendor id_numbers
CREATE POLICY "vendors_admin_id_number_select"
ON vendors FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles p
        JOIN user_roles ur ON p.role_id = ur.id
        WHERE p.id = auth.uid()
        AND ur.role_name IN ('admin', 'super_admin', 'operations', 'finance')
    )
);

COMMENT ON POLICY "vendors_admin_id_number_select" ON vendors IS 
'Allows admin, super_admin, operations, and finance staff to read all vendor id_numbers for payment matching and verification';

-- ============================================================================
-- Rollback Instructions
-- ============================================================================

-- To rollback this migration, run:
-- DROP POLICY IF EXISTS "profiles_own_id_number_select" ON profiles;
-- DROP POLICY IF EXISTS "profiles_admin_id_number_select" ON profiles;
-- DROP POLICY IF EXISTS "vendors_own_id_number_select" ON vendors;
-- DROP POLICY IF EXISTS "vendors_admin_id_number_select" ON vendors;
