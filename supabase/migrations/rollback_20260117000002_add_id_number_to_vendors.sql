-- Rollback Migration: Remove id_number column from vendors table
-- Date: 2026-01-17
-- Purpose: Rollback migration 20260117000002_add_id_number_to_vendors.sql
-- Spec: vendor-id-manual-payment
-- Requirements: 12.9 (migration rollback instructions)

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- This script reverts the changes made by migration 20260117000002
-- It removes the id_number column and all associated indexes from vendors table
-- 
-- To apply this rollback:
-- 1. Ensure no active transactions are using id_number column
-- 2. Ensure no payment matching processes are running
-- 3. Run this script via Supabase Dashboard or CLI
-- 4. Verify column and indexes are removed using verification queries below
--
-- WARNING: This will permanently delete all id_number data from vendors table
-- This will break payment matching if manual paybill payments are in use
-- ============================================================================

-- Drop lookup index for C2B payment matching
DROP INDEX IF EXISTS idx_vendors_id_number_lookup;

-- Drop unique index for duplicate prevention  
DROP INDEX IF EXISTS idx_vendors_id_number;

-- Drop id_number column (includes automatic removal of CHECK constraint)
ALTER TABLE vendors DROP COLUMN IF EXISTS id_number;

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- Run these queries after rollback to verify successful removal:
--
-- Check column is removed:
-- SELECT column_name FROM information_schema.columns 
-- WHERE table_name = 'vendors' AND column_name = 'id_number';
-- (Should return 0 rows)
--
-- Check indexes are removed:
-- SELECT indexname FROM pg_indexes 
-- WHERE tablename = 'vendors' AND indexname LIKE '%id_number%';
-- (Should return 0 rows)
--
-- Check constraints are removed:
-- SELECT constraint_name FROM information_schema.check_constraints 
-- WHERE constraint_name LIKE '%vendors%id_number%';
-- (Should return 0 rows)
--
-- Check for orphaned payment_transactions using id_number:
-- SELECT COUNT(*) FROM payment_transactions 
-- WHERE account_reference ~ '^[0-9]{8}$';
-- (These payments may need manual reconciliation after rollback)
-- ============================================================================

-- Log rollback completion
DO $$
DECLARE
    payment_count INTEGER;
BEGIN
    -- Check for existing payments using ID numbers as account_reference
    SELECT COUNT(*) INTO payment_count
    FROM payment_transactions 
    WHERE account_reference ~ '^[0-9]{8}$';
    
    RAISE NOTICE '✅ Rollback Complete: Migration 20260117000002_add_id_number_to_vendors';
    RAISE NOTICE '   - Dropped idx_vendors_id_number_lookup index';
    RAISE NOTICE '   - Dropped idx_vendors_id_number unique index';
    RAISE NOTICE '   - Dropped id_number column from vendors table';
    RAISE NOTICE '   - Removed CHECK constraint for id_number format';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  WARNING: All id_number data has been permanently deleted from vendors table';
    
    IF payment_count > 0 THEN
        RAISE WARNING '⚠️  CRITICAL: % payment_transactions exist with ID number account_references', payment_count;
        RAISE WARNING '   These payments may need manual reconciliation';
        RAISE WARNING '   Consider running payment reconciliation before continuing operations';
    END IF;
END $$;
