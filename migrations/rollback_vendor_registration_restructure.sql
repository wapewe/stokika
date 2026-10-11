-- ============================================================================
-- ROLLBACK SCRIPT: Vendor Registration Restructure
-- Task: 1.4 - Create database rollback script
-- Requirements: 15.1
-- ============================================================================
-- This script reverses all changes made by migrations 002 and 003:
-- - Removes new columns added to vendors table
-- - Drops indexes created for performance
-- - Restores vendors table to legacy schema state
-- - Preserves all existing vendor data (does not delete records)
--
-- IMPORTANT: Run this script ONLY if you need to rollback the restructure.
-- This is a destructive operation that removes the new dimensional structure.
--
-- BEFORE RUNNING:
-- 1. Create a full database backup
-- 2. Verify backup integrity
-- 3. Get approval from stakeholders
-- 4. Schedule maintenance window
-- ============================================================================

\set ON_ERROR_STOP on

-- ============================================================================
-- Pre-Rollback Verification
-- ============================================================================

DO $$
DECLARE
    vendor_count INTEGER;
    bmc_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'ROLLBACK: Vendor Registration Restructure';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'This script will REVERSE all changes from migrations 002 and 003';
    RAISE NOTICE 'The following changes will be made:';
    RAISE NOTICE '  1. Remove new vendor table columns';
    RAISE NOTICE '  2. Drop performance indexes';
    RAISE NOTICE '  3. Clear dimensional data (status, size, model)';
    RAISE NOTICE '  4. Restore to legacy schema';
    RAISE NOTICE '';
    
    SELECT COUNT(*) INTO vendor_count FROM vendors;
    SELECT COUNT(*) INTO bmc_count FROM vendor_bmc;
    
    RAISE NOTICE 'Current state:';
    RAISE NOTICE '  - Total vendors: %', vendor_count;
    RAISE NOTICE '  - Vendors with BMC: %', bmc_count;
    RAISE NOTICE '';
    RAISE NOTICE 'WARNING: This will remove dimensional business data!';
    RAISE NOTICE 'Ensure you have a recent backup before proceeding.';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- Step 1: Create Backup Table (Safety Net)
-- ============================================================================

BEGIN;

DROP TABLE IF EXISTS vendors_before_rollback;

CREATE TABLE vendors_before_rollback AS
SELECT 
    id,
    business_status_id,
    business_size_id,
    business_model_id,
    business_category_other,
    stock_cycle,
    stock_requirement_amount,
    stock_justification,
    bmc_completed,
    legacy_business_size,
    created_at,
    updated_at
FROM vendors;

DO $$
DECLARE
    backup_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO backup_count FROM vendors_before_rollback;
    RAISE NOTICE '✓ Step 1: Created backup table with % vendor records', backup_count;
    RAISE NOTICE '  Table: vendors_before_rollback';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- Step 2: Export Dimensional Data for Recovery (Optional)
-- This creates a summary of the dimensional mapping before rollback
-- ============================================================================

DO $$
DECLARE
    stats RECORD;
BEGIN
    RAISE NOTICE 'Dimensional Data Summary (for recovery reference):';
    RAISE NOTICE '------------------------------------------------------------';
    RAISE NOTICE '';
    
    -- Business Status distribution
    RAISE NOTICE 'Business Status Distribution:';
    FOR stats IN 
        SELECT bs.status_name, COUNT(*) as count
        FROM vendors v
        JOIN business_statuses bs ON v.business_status_id = bs.id
        GROUP BY bs.status_name
        ORDER BY count DESC
    LOOP
        RAISE NOTICE '  %: % vendors (%.1f%%)', 
            stats.status_name, 
            stats.count,
            ROUND(100.0 * stats.count / (SELECT COUNT(*) FROM vendors), 1);
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Business Size Distribution:';
    FOR stats IN 
        SELECT bz.size_name, COUNT(*) as count
        FROM vendors v
        JOIN business_sizes bz ON v.business_size_id = bz.id
        GROUP BY bz.size_name
        ORDER BY count DESC
    LOOP
        RAISE NOTICE '  %: % vendors (%.1f%%)',
            stats.size_name,
            stats.count,
            ROUND(100.0 * stats.count / (SELECT COUNT(*) FROM vendors), 1);
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Business Model Distribution:';
    FOR stats IN 
        SELECT bm.model_name, COUNT(*) as count
        FROM vendors v
        JOIN business_models bm ON v.business_model_id = bm.id
        GROUP BY bm.model_name
        ORDER BY count DESC
    LOOP
        RAISE NOTICE '  %: % vendors (%.1f%%)',
            stats.model_name,
            stats.count,
            ROUND(100.0 * stats.count / (SELECT COUNT(*) FROM vendors), 1);
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '------------------------------------------------------------';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- Step 3: Drop Indexes Created in Migration 002
-- ============================================================================

DROP INDEX IF EXISTS idx_vendors_business_category;
DROP INDEX IF EXISTS idx_vendors_business_status;
DROP INDEX IF EXISTS idx_vendors_business_size;
DROP INDEX IF EXISTS idx_vendors_business_model;
DROP INDEX IF EXISTS idx_vendors_bmc_completed;
DROP INDEX IF EXISTS idx_vendors_stock_cycle;
DROP INDEX IF EXISTS idx_vendors_legacy_business_size;

RAISE NOTICE '✓ Step 3: Dropped performance indexes';
RAISE NOTICE '';

-- ============================================================================
-- Step 4: Clear Dimensional Data from Vendors Table
-- This removes the foreign key references without dropping the columns yet
-- ============================================================================

DO $$
DECLARE
    cleared_count INTEGER;
BEGIN
    UPDATE vendors
    SET 
        business_status_id = NULL,
        business_size_id = NULL,
        business_model_id = NULL,
        business_category_other = NULL,
        stock_cycle = NULL,
        stock_requirement_amount = NULL,
        stock_justification = NULL,
        bmc_completed = false,
        legacy_business_size = NULL,
        updated_at = now()
    WHERE 
        business_status_id IS NOT NULL
        OR business_size_id IS NOT NULL
        OR business_model_id IS NOT NULL
        OR business_category_other IS NOT NULL
        OR stock_cycle IS NOT NULL
        OR stock_requirement_amount IS NOT NULL
        OR stock_justification IS NOT NULL
        OR bmc_completed = true
        OR legacy_business_size IS NOT NULL;
    
    GET DIAGNOSTICS cleared_count = ROW_COUNT;
    
    RAISE NOTICE '✓ Step 4: Cleared dimensional data from % vendor records', cleared_count;
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- Step 5: Drop Constraints from Migration 002
-- ============================================================================

ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_stock_cycle_check;
ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_stock_requirement_amount_check;
ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_stock_justification_check;

RAISE NOTICE '✓ Step 5: Dropped CHECK constraints';
RAISE NOTICE '';

-- ============================================================================
-- Step 6: Drop Columns Added in Migration 002
-- ============================================================================

ALTER TABLE vendors DROP COLUMN IF EXISTS business_category_other;
ALTER TABLE vendors DROP COLUMN IF EXISTS stock_cycle;
ALTER TABLE vendors DROP COLUMN IF EXISTS stock_requirement_amount;
ALTER TABLE vendors DROP COLUMN IF EXISTS stock_justification;
ALTER TABLE vendors DROP COLUMN IF EXISTS bmc_completed;

RAISE NOTICE '✓ Step 6: Dropped new columns from vendors table';
RAISE NOTICE '  - business_category_other';
RAISE NOTICE '  - stock_cycle';
RAISE NOTICE '  - stock_requirement_amount';
RAISE NOTICE '  - stock_justification';
RAISE NOTICE '  - bmc_completed';
RAISE NOTICE '';

-- ============================================================================
-- Step 7: Drop Legacy Column Added in Migration 003
-- ============================================================================

ALTER TABLE vendors DROP COLUMN IF EXISTS legacy_business_size;

RAISE NOTICE '✓ Step 7: Dropped legacy_business_size column';
RAISE NOTICE '';

-- ============================================================================
-- Step 8: Verify Rollback Completion
-- ============================================================================

DO $$
DECLARE
    remaining_columns TEXT[] := ARRAY[]::TEXT[];
    column_name TEXT;
    vendor_count INTEGER;
BEGIN
    -- Check if any rolled-back columns still exist
    FOR column_name IN 
        SELECT unnest(ARRAY[
            'business_category_other',
            'stock_cycle',
            'stock_requirement_amount',
            'stock_justification',
            'bmc_completed',
            'legacy_business_size'
        ])
    LOOP
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'vendors' 
            AND column_name = column_name
        ) THEN
            remaining_columns := array_append(remaining_columns, column_name);
        END IF;
    END LOOP;
    
    -- Verify backup table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'vendors_before_rollback'
    ) THEN
        RAISE EXCEPTION 'Rollback incomplete: backup table not found';
    END IF;
    
    -- Verify column removal
    IF array_length(remaining_columns, 1) > 0 THEN
        RAISE EXCEPTION 'Rollback incomplete: columns still exist: %', 
            array_to_string(remaining_columns, ', ');
    END IF;
    
    SELECT COUNT(*) INTO vendor_count FROM vendors;
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '✓✓✓ ROLLBACK COMPLETED SUCCESSFULLY ✓✓✓';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Vendors table restored to legacy schema';
    RAISE NOTICE 'Total vendors preserved: %', vendor_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Backup table created: vendors_before_rollback';
    RAISE NOTICE 'This table contains the dimensional data before rollback';
    RAISE NOTICE '';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '  1. Verify application functionality with legacy schema';
    RAISE NOTICE '  2. Test vendor registration with old modal structure';
    RAISE NOTICE '  3. If successful, archive vendors_before_rollback table';
    RAISE NOTICE '  4. Update application code to use legacy field structure';
    RAISE NOTICE '';
    RAISE NOTICE 'TO RESTORE DIMENSIONAL DATA (if needed):';
    RAISE NOTICE '  Run restore_dimensional_data.sql script';
    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
END $$;

COMMIT;

-- ============================================================================
-- Post-Rollback Verification Queries
-- Run these queries to verify the rollback was successful
-- ============================================================================

-- Verify vendors table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'vendors'
ORDER BY ordinal_position;

-- Verify all vendors still exist
SELECT COUNT(*) as total_vendors FROM vendors;

-- Verify backup table
SELECT COUNT(*) as backup_records FROM vendors_before_rollback;

-- ============================================================================
-- NOTES FOR DATABASE ADMINISTRATOR
-- ============================================================================
-- 
-- 1. BACKUP TABLE MANAGEMENT
--    The vendors_before_rollback table contains all dimensional data.
--    Keep this table for at least 30 days after rollback.
--    To drop it after verification: DROP TABLE vendors_before_rollback;
--
-- 2. LOOKUP TABLES
--    This script does NOT drop the lookup tables:
--    - business_categories
--    - business_statuses
--    - business_sizes
--    - business_models
--    - vendor_bmc
--    
--    These tables remain for potential future use.
--    To drop them manually if needed:
--      DROP TABLE IF EXISTS vendor_bmc CASCADE;
--      DROP TABLE IF EXISTS business_models CASCADE;
--      DROP TABLE IF EXISTS business_sizes CASCADE;
--      DROP TABLE IF EXISTS business_statuses CASCADE;
--      DROP TABLE IF EXISTS business_categories CASCADE;
--
-- 3. RE-MIGRATION
--    If you need to re-apply the restructure:
--    - DO NOT run migrations 002 and 003 again immediately
--    - First run: restore_dimensional_data.sql
--    - This will restore data from vendors_before_rollback
--    - Then re-run frontend and backend updates
--
-- 4. APPLICATION CODE
--    After rollback, ensure your application code:
--    - Does NOT reference new columns
--    - Does NOT use dimensional business fields
--    - Uses legacy "Business Size" field structure
--    - Reverts to old vendor registration modal
--
-- 5. MONITORING
--    Monitor these metrics after rollback:
--    - Vendor registration success rate
--    - Database query performance
--    - Application error logs
--    - User feedback on registration flow
--
-- ============================================================================
