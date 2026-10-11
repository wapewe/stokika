-- ============================================================================
-- RESTORE SCRIPT: Dimensional Data from Rollback Backup
-- Task: 1.4 - Database rollback script (restoration procedure)
-- Requirements: 15.1
-- ============================================================================
-- This script restores dimensional business data from vendors_before_rollback
-- table after a rollback has been performed.
--
-- USE CASE: You rolled back to legacy schema, but now want to re-apply
-- the dimensional structure without losing the original mappings.
--
-- PREREQUISITES:
-- 1. vendors_before_rollback table must exist
-- 2. Migrations 002 and 003 must be re-run first
-- 3. Lookup tables must be populated
-- 4. Database backup must be taken before restoration
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- ============================================================================
-- Pre-Restoration Verification
-- ============================================================================

DO $$
DECLARE
    backup_exists BOOLEAN;
    backup_count INTEGER;
    vendor_count INTEGER;
    columns_exist BOOLEAN;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'RESTORE: Dimensional Data from Rollback Backup';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '';
    
    -- Check if backup table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'vendors_before_rollback'
    ) INTO backup_exists;
    
    IF NOT backup_exists THEN
        RAISE EXCEPTION 'Cannot restore: vendors_before_rollback table not found';
    END IF;
    
    SELECT COUNT(*) INTO backup_count FROM vendors_before_rollback;
    SELECT COUNT(*) INTO vendor_count FROM vendors;
    
    RAISE NOTICE 'Backup table found: % records', backup_count;
    RAISE NOTICE 'Current vendors table: % records', vendor_count;
    RAISE NOTICE '';
    
    -- Verify required columns exist (migrations 002 must be re-run)
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'vendors'
        AND column_name IN (
            'business_category_other',
            'stock_cycle',
            'stock_requirement_amount',
            'stock_justification',
            'bmc_completed'
        )
        GROUP BY table_name
        HAVING COUNT(*) = 5
    ) INTO columns_exist;
    
    IF NOT columns_exist THEN
        RAISE EXCEPTION 'Cannot restore: New vendor columns not found. Run migration 002 first.';
    END IF;
    
    RAISE NOTICE '✓ All prerequisite checks passed';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- Step 1: Restore Dimensional Data
-- ============================================================================

DO $$
DECLARE
    restored_count INTEGER;
    matched_count INTEGER;
    unmatched_count INTEGER;
BEGIN
    RAISE NOTICE 'Step 1: Restoring dimensional data...';
    RAISE NOTICE '';
    
    -- Update vendors table with data from backup
    WITH restore AS (
        UPDATE vendors v
        SET 
            business_status_id = b.business_status_id,
            business_size_id = b.business_size_id,
            business_model_id = b.business_model_id,
            business_category_other = b.business_category_other,
            stock_cycle = b.stock_cycle,
            stock_requirement_amount = b.stock_requirement_amount,
            stock_justification = b.stock_justification,
            bmc_completed = b.bmc_completed,
            legacy_business_size = b.legacy_business_size,
            updated_at = now()
        FROM vendors_before_rollback b
        WHERE v.id = b.id
        RETURNING v.id
    )
    SELECT COUNT(*) INTO restored_count FROM restore;
    
    -- Count matched records
    SELECT COUNT(*) INTO matched_count
    FROM vendors v
    INNER JOIN vendors_before_rollback b ON v.id = b.id;
    
    -- Count unmatched records (new vendors created after backup)
    SELECT COUNT(*) INTO unmatched_count
    FROM vendors v
    LEFT JOIN vendors_before_rollback b ON v.id = b.id
    WHERE b.id IS NULL;
    
    RAISE NOTICE '✓ Restored dimensional data for % vendors', restored_count;
    RAISE NOTICE '  - Matched and restored: %', matched_count;
    RAISE NOTICE '  - Unmatched (created after backup): %', unmatched_count;
    RAISE NOTICE '';
    
    IF unmatched_count > 0 THEN
        RAISE NOTICE '⚠ WARNING: % vendors created after rollback have NULL dimensions', unmatched_count;
        RAISE NOTICE '  These vendors need dimensional data assigned manually or via migration 003';
        RAISE NOTICE '';
    END IF;
END $$;

-- ============================================================================
-- Step 2: Verify Data Integrity
-- ============================================================================

DO $$
DECLARE
    null_status_count INTEGER;
    null_size_count INTEGER;
    null_model_count INTEGER;
    total_vendors INTEGER;
BEGIN
    RAISE NOTICE 'Step 2: Verifying data integrity...';
    RAISE NOTICE '';
    
    SELECT COUNT(*) INTO total_vendors FROM vendors;
    SELECT COUNT(*) INTO null_status_count FROM vendors WHERE business_status_id IS NULL;
    SELECT COUNT(*) INTO null_size_count FROM vendors WHERE business_size_id IS NULL;
    SELECT COUNT(*) INTO null_model_count FROM vendors WHERE business_model_id IS NULL;
    
    RAISE NOTICE 'Dimensional data completeness:';
    RAISE NOTICE '  - Total vendors: %', total_vendors;
    RAISE NOTICE '  - With business_status: % (%.1f%%)', 
        total_vendors - null_status_count,
        ROUND(100.0 * (total_vendors - null_status_count) / total_vendors, 1);
    RAISE NOTICE '  - With business_size: % (%.1f%%)',
        total_vendors - null_size_count,
        ROUND(100.0 * (total_vendors - null_size_count) / total_vendors, 1);
    RAISE NOTICE '  - With business_model: % (%.1f%%)',
        total_vendors - null_model_count,
        ROUND(100.0 * (total_vendors - null_model_count) / total_vendors, 1);
    RAISE NOTICE '';
    
    IF null_status_count > 0 OR null_size_count > 0 OR null_model_count > 0 THEN
        RAISE NOTICE '⚠ Some vendors have incomplete dimensional data';
        RAISE NOTICE '  Consider running migration 003 to set defaults';
        RAISE NOTICE '';
    END IF;
END $$;

-- ============================================================================
-- Step 3: Regenerate Statistics
-- ============================================================================

DO $$
DECLARE
    stats RECORD;
BEGIN
    RAISE NOTICE 'Step 3: Dimensional data distribution after restore:';
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
            ROUND(100.0 * stats.count / (SELECT COUNT(*) FROM vendors WHERE business_status_id IS NOT NULL), 1);
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
            ROUND(100.0 * stats.count / (SELECT COUNT(*) FROM vendors WHERE business_size_id IS NOT NULL), 1);
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
            ROUND(100.0 * stats.count / (SELECT COUNT(*) FROM vendors WHERE business_model_id IS NOT NULL), 1);
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '------------------------------------------------------------';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- Step 4: Final Verification
-- ============================================================================

DO $$
DECLARE
    vendor_count INTEGER;
    backup_count INTEGER;
    restored_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO vendor_count FROM vendors;
    SELECT COUNT(*) INTO backup_count FROM vendors_before_rollback;
    SELECT COUNT(*) INTO restored_count 
    FROM vendors v
    INNER JOIN vendors_before_rollback b ON v.id = b.id
    WHERE v.business_status_id IS NOT NULL
      AND v.business_size_id IS NOT NULL
      AND v.business_model_id IS NOT NULL;
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '✓✓✓ RESTORATION COMPLETED SUCCESSFULLY ✓✓✓';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Dimensional data restored from backup';
    RAISE NOTICE 'Total vendors: %', vendor_count;
    RAISE NOTICE 'Backup records: %', backup_count;
    RAISE NOTICE 'Successfully restored: %', restored_count;
    RAISE NOTICE '';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '  1. Test vendor registration with new modal structure';
    RAISE NOTICE '  2. Verify dimensional data is correctly displayed';
    RAISE NOTICE '  3. Run migration 003 if needed for new vendors';
    RAISE NOTICE '  4. Archive vendors_before_rollback table after 30 days';
    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
END $$;

COMMIT;

-- ============================================================================
-- Post-Restoration Verification Queries
-- ============================================================================

-- Check vendors with complete dimensional data
SELECT 
    COUNT(*) FILTER (WHERE business_status_id IS NOT NULL) as with_status,
    COUNT(*) FILTER (WHERE business_size_id IS NOT NULL) as with_size,
    COUNT(*) FILTER (WHERE business_model_id IS NOT NULL) as with_model,
    COUNT(*) as total
FROM vendors;

-- Compare backup vs current state
SELECT 
    'Backup' as source,
    COUNT(*) as records,
    COUNT(*) FILTER (WHERE business_status_id IS NOT NULL) as with_status
FROM vendors_before_rollback
UNION ALL
SELECT 
    'Current' as source,
    COUNT(*) as records,
    COUNT(*) FILTER (WHERE business_status_id IS NOT NULL) as with_status
FROM vendors;

-- ============================================================================
-- NOTES FOR DATABASE ADMINISTRATOR
-- ============================================================================
--
-- 1. BACKUP TABLE CLEANUP
--    After successful restoration and verification (30+ days):
--      DROP TABLE vendors_before_rollback;
--
-- 2. HANDLING NEW VENDORS
--    Vendors created between rollback and restoration will have NULL dimensions.
--    Options:
--    a) Run migration 003 to set defaults
--    b) Manually update using admin dashboard
--    c) Prompt vendors to complete profile
--
-- 3. TROUBLESHOOTING
--    If restoration fails:
--    - Verify migrations 002 was re-run successfully
--    - Check that lookup tables are populated
--    - Ensure vendors_before_rollback table is intact
--    - Restore from database backup and retry
--
-- 4. PARTIAL RESTORATION
--    To restore only specific vendors:
--      UPDATE vendors v
--      SET business_status_id = b.business_status_id,
--          business_size_id = b.business_size_id,
--          business_model_id = b.business_model_id
--      FROM vendors_before_rollback b
--      WHERE v.id = b.id
--        AND v.id IN ('vendor-id-1', 'vendor-id-2', ...);
--
-- ============================================================================
