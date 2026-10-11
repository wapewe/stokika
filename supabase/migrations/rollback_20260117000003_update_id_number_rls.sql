-- Rollback Migration: Remove RLS Policies for id_number Column Access
-- Date: 2026-01-17
-- Purpose: Rollback migration 20260117000003_update_id_number_rls.sql
-- Spec: vendor-id-manual-payment
-- Requirements: 12.9 (migration rollback instructions)

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- This script reverts the changes made by migration 20260117000003
-- It removes all RLS policies created for id_number column access control
-- 
-- To apply this rollback:
-- 1. Run this script via Supabase Dashboard or CLI
-- 2. Verify policies are removed using verification queries below
--
-- NOTE: This rollback should be executed BEFORE rolling back the column
-- migrations (20260117000001 and 20260117000002) to avoid policy errors
--
-- EXECUTION ORDER for complete rollback:
-- 1. Run this script (20260117000003_update_id_number_rls_rollback.sql)
-- 2. Run 20260117000002_add_id_number_to_vendors_rollback.sql
-- 3. Run 20260117000001_add_id_number_to_profiles_rollback.sql
-- ============================================================================

-- ============================================================================
-- Remove Profiles Table RLS Policies
-- ============================================================================

-- Drop policy: Users can select their own id_number
DROP POLICY IF EXISTS "profiles_own_id_number_select" ON profiles;

-- Drop policy: Admins can select all id_numbers
DROP POLICY IF EXISTS "profiles_admin_id_number_select" ON profiles;

-- ============================================================================
-- Remove Vendors Table RLS Policies
-- ============================================================================

-- Drop policy: Vendors can select their own id_number
DROP POLICY IF EXISTS "vendors_own_id_number_select" ON vendors;

-- Drop policy: Admins can select all vendor id_numbers
DROP POLICY IF EXISTS "vendors_admin_id_number_select" ON vendors;

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- Run these queries after rollback to verify successful removal:
--
-- Check profiles policies are removed:
-- SELECT policyname FROM pg_policies 
-- WHERE tablename = 'profiles' AND policyname LIKE '%id_number%';
-- (Should return 0 rows)
--
-- Check vendors policies are removed:
-- SELECT policyname FROM pg_policies 
-- WHERE tablename = 'vendors' AND policyname LIKE '%id_number%';
-- (Should return 0 rows)
--
-- List all remaining policies on profiles table:
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'profiles';
--
-- List all remaining policies on vendors table:
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'vendors';
-- ============================================================================

-- Log rollback completion
DO $$
DECLARE
    profiles_policy_count INTEGER;
    vendors_policy_count INTEGER;
BEGIN
    -- Count remaining id_number policies (should be 0)
    SELECT COUNT(*) INTO profiles_policy_count
    FROM pg_policies 
    WHERE tablename = 'profiles' AND policyname LIKE '%id_number%';
    
    SELECT COUNT(*) INTO vendors_policy_count
    FROM pg_policies 
    WHERE tablename = 'vendors' AND policyname LIKE '%id_number%';
    
    RAISE NOTICE '✅ Rollback Complete: Migration 20260117000003_update_id_number_rls';
    RAISE NOTICE '';
    RAISE NOTICE 'Profiles Table Policies Removed:';
    RAISE NOTICE '   - profiles_own_id_number_select';
    RAISE NOTICE '   - profiles_admin_id_number_select';
    RAISE NOTICE '';
    RAISE NOTICE 'Vendors Table Policies Removed:';
    RAISE NOTICE '   - vendors_own_id_number_select';
    RAISE NOTICE '   - vendors_admin_id_number_select';
    RAISE NOTICE '';
    
    IF profiles_policy_count > 0 THEN
        RAISE WARNING '⚠️  WARNING: % id_number policies still exist on profiles table', profiles_policy_count;
    END IF;
    
    IF vendors_policy_count > 0 THEN
        RAISE WARNING '⚠️  WARNING: % id_number policies still exist on vendors table', vendors_policy_count;
    END IF;
    
    IF profiles_policy_count = 0 AND vendors_policy_count = 0 THEN
        RAISE NOTICE '✅ All id_number RLS policies successfully removed';
        RAISE NOTICE '';
        RAISE NOTICE '📋 Next Steps:';
        RAISE NOTICE '   To complete full rollback, execute in order:';
        RAISE NOTICE '   2. Run 20260117000002_add_id_number_to_vendors_rollback.sql';
        RAISE NOTICE '   3. Run 20260117000001_add_id_number_to_profiles_rollback.sql';
    END IF;
END $$;
