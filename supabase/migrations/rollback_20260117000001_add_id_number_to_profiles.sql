-- Rollback Migration: Remove id_number column from profiles table
-- Date: 2026-01-17
-- Purpose: Rollback migration 20260117000001_add_id_number_to_profiles.sql
-- Spec: vendor-id-manual-payment
-- Requirements: 12.9 (migration rollback instructions)

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- This script reverts the changes made by migration 20260117000001
-- It removes the id_number column and all associated indexes
-- 
-- To apply this rollback:
-- 1. Ensure no active transactions are using id_number column
-- 2. Run this script via Supabase Dashboard or CLI
-- 3. Verify column and indexes are removed using verification queries below
--
-- WARNING: This will permanently delete all id_number data from profiles table
-- ============================================================================

-- Drop lookup index for C2B payment matching
DROP INDEX IF EXISTS idx_profiles_id_number_lookup;

-- Drop unique index for duplicate prevention
DROP INDEX IF EXISTS idx_profiles_id_number;

-- Drop id_number column (includes automatic removal of CHECK constraint)
ALTER TABLE profiles DROP COLUMN IF EXISTS id_number;

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- Run these queries after rollback to verify successful removal:
--
-- Check column is removed:
-- SELECT column_name FROM information_schema.columns 
-- WHERE table_name = 'profiles' AND column_name = 'id_number';
-- (Should return 0 rows)
--
-- Check indexes are removed:
-- SELECT indexname FROM pg_indexes 
-- WHERE tablename = 'profiles' AND indexname LIKE '%id_number%';
-- (Should return 0 rows)
--
-- Check constraints are removed:
-- SELECT constraint_name FROM information_schema.check_constraints 
-- WHERE constraint_name LIKE '%profiles%id_number%';
-- (Should return 0 rows)
-- ============================================================================

-- Log rollback completion
DO $$
BEGIN
    RAISE NOTICE '✅ Rollback Complete: Migration 20260117000001_add_id_number_to_profiles';
    RAISE NOTICE '   - Dropped idx_profiles_id_number_lookup index';
    RAISE NOTICE '   - Dropped idx_profiles_id_number unique index';
    RAISE NOTICE '   - Dropped id_number column from profiles table';
    RAISE NOTICE '   - Removed CHECK constraint for id_number format';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  WARNING: All id_number data has been permanently deleted from profiles table';
END $$;
