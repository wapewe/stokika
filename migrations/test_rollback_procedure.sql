-- ============================================================================
-- TEST SCRIPT: Rollback Procedure Verification
-- Task: 1.4 - Test rollback procedure on copy of database
-- Requirements: 15.1
-- ============================================================================
-- This script tests the rollback procedure on a test database copy to ensure:
-- 1. Rollback script executes without errors
-- 2. Data is preserved correctly
-- 3. Schema changes are applied correctly
-- 4. Restoration procedure works correctly
--
-- USAGE:
-- 1. Create test database copy: createdb stokika_test
-- 2. Restore production backup: psql stokika_test < production_backup.sql
-- 3. Run this test script: psql stokika_test -f test_rollback_procedure.sql
-- ============================================================================

\set ON_ERROR_STOP on

-- ============================================================================
-- Test Setup
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'ROLLBACK PROCEDURE TEST SUITE';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'This test suite will:';
    RAISE NOTICE '  1. Capture pre-rollback state';
    RAISE NOTICE '  2. Execute rollback script';
    RAISE NOTICE '  3. Verify rollback success';
    RAISE NOTICE '  4. Test restoration procedure';
    RAISE NOTICE '  5. Verify restoration success';
    RAISE NOTICE '';
    RAISE NOTICE 'Database: %', current_database();
    RAISE NOTICE 'Timestamp: %', NOW();
    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- Phase 1: Pre-Rollback State Capture
-- ============================================================================

-- Create test results table
CREATE TABLE IF NOT EXISTS rollback_test_results (
    test_id SERIAL PRIMARY KEY,
    test_name TEXT NOT NULL,
    test_phase TEXT NOT NULL,
    test_status TEXT NOT NULL CHECK (test_status IN ('PASS', 'FAIL', 'SKIP')),
    expected_value TEXT,
    actual_value TEXT,
    message TEXT,
    tested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

TRUNCATE rollback_test_results;

-- Capture pre-rollback metrics
CREATE TEMPORARY TABLE pre_rollback_metrics AS
SELECT 
    (SELECT COUNT(*) FROM vendors) as vendor_count,
    (SELECT COUNT(*) FROM vendors WHERE business_status_id IS NOT NULL) as vendors_with_status,
    (SELECT COUNT(*) FROM vendors WHERE business_size_id IS NOT NULL) as vendors_with_size,
    (SELECT COUNT(*) FROM vendors WHERE business_model_id IS NOT NULL) as vendors_with_model,
    (SELECT COUNT(*) FROM vendors WHERE bmc_completed = true) as vendors_with_bmc,
    (SELECT COUNT(*) FROM vendor_bmc) as bmc_records,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'vendors' 
        AND column_name IN ('business_category_other', 'stock_cycle', 'stock_requirement_amount', 
                            'stock_justification', 'bmc_completed')) as new_columns_count,
    (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'vendors' 
        AND indexname IN ('idx_vendors_business_category', 'idx_vendors_business_status',
                          'idx_vendors_business_size', 'idx_vendors_business_model',
                          'idx_vendors_bmc_completed', 'idx_vendors_stock_cycle')) as indexes_count;

-- Test 1: Verify pre-rollback state
INSERT INTO rollback_test_results (test_name, test_phase, test_status, expected_value, actual_value, message)
SELECT 
    'Pre-Rollback Vendor Count',
    'Phase 1: Pre-Rollback',
    CASE WHEN vendor_count > 0 THEN 'PASS' ELSE 'FAIL' END,
    '> 0',
    vendor_count::TEXT,
    CASE 
        WHEN vendor_count > 0 THEN 'Vendors exist in database'
        ELSE 'No vendors found - cannot test rollback'
    END
FROM pre_rollback_metrics;

-- Test 2: Verify dimensional data exists
INSERT INTO rollback_test_results (test_name, test_phase, test_status, expected_value, actual_value, message)
SELECT 
    'Pre-Rollback Dimensional Data',
    'Phase 1: Pre-Rollback',
    CASE WHEN vendors_with_status > 0 AND vendors_with_size > 0 AND vendors_with_model > 0 
         THEN 'PASS' ELSE 'FAIL' END,
    'All vendors have dimensional data',
    FORMAT('Status: %s, Size: %s, Model: %s', vendors_with_status, vendors_with_size, vendors_with_model),
    CASE 
        WHEN vendors_with_status > 0 AND vendors_with_size > 0 AND vendors_with_model > 0
        THEN 'Dimensional data present for rollback testing'
        ELSE 'Missing dimensional data - run migrations 002 and 003 first'
    END
FROM pre_rollback_metrics;

-- Test 3: Verify new columns exist
INSERT INTO rollback_test_results (test_name, test_phase, test_status, expected_value, actual_value, message)
SELECT 
    'Pre-Rollback Column Existence',
    'Phase 1: Pre-Rollback',
    CASE WHEN new_columns_count = 5 THEN 'PASS' ELSE 'FAIL' END,
    '5',
    new_columns_count::TEXT,
    CASE 
        WHEN new_columns_count = 5 THEN 'All new columns exist'
        ELSE FORMAT('Only %s of 5 new columns found', new_columns_count)
    END
FROM pre_rollback_metrics;

RAISE NOTICE '✓ Phase 1 Complete: Pre-rollback state captured';
RAISE NOTICE '';

-- ============================================================================
-- Phase 2: Execute Rollback Script
-- ============================================================================

RAISE NOTICE 'Phase 2: Executing rollback script...';
RAISE NOTICE '';

-- Include the rollback script inline (or use \i to include file)
\i rollback_vendor_registration_restructure.sql

-- If rollback succeeded, we'll continue
INSERT INTO rollback_test_results (test_name, test_phase, test_status, expected_value, actual_value, message)
VALUES (
    'Rollback Script Execution',
    'Phase 2: Rollback Execution',
    'PASS',
    'No errors',
    'Completed successfully',
    'Rollback script executed without errors'
);

RAISE NOTICE '✓ Phase 2 Complete: Rollback executed';
RAISE NOTICE '';

-- ============================================================================
-- Phase 3: Post-Rollback Verification
-- ============================================================================

RAISE NOTICE 'Phase 3: Verifying rollback results...';
RAISE NOTICE '';

-- Capture post-rollback metrics
CREATE TEMPORARY TABLE post_rollback_metrics AS
SELECT 
    (SELECT COUNT(*) FROM vendors) as vendor_count,
    (SELECT COUNT(*) FROM vendors WHERE business_status_id IS NOT NULL) as vendors_with_status,
    (SELECT COUNT(*) FROM vendors WHERE business_size_id IS NOT NULL) as vendors_with_size,
    (SELECT COUNT(*) FROM vendors WHERE business_model_id IS NOT NULL) as vendors_with_model,
    (SELECT COUNT(*) FROM vendors WHERE bmc_completed = true) as vendors_with_bmc,
    (SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'vendors_before_rollback')) as backup_table_exists,
    (SELECT COUNT(*) FROM vendors_before_rollback) as backup_record_count,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'vendors' 
        AND column_name IN ('business_category_other', 'stock_cycle', 'stock_requirement_amount', 
                            'stock_justification', 'bmc_completed', 'legacy_business_size')) as remaining_columns,
    (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'vendors' 
        AND indexname IN ('idx_vendors_business_category', 'idx_vendors_business_status',
                          'idx_vendors_business_size', 'idx_vendors_business_model',
                          'idx_vendors_bmc_completed', 'idx_vendors_stock_cycle')) as remaining_indexes;

-- Test 4: Verify vendor count preserved
INSERT INTO rollback_test_results (test_name, test_phase, test_status, expected_value, actual_value, message)
SELECT 
    'Post-Rollback Vendor Preservation',
    'Phase 3: Post-Rollback Verification',
    CASE WHEN post.vendor_count = pre.vendor_count THEN 'PASS' ELSE 'FAIL' END,
    pre.vendor_count::TEXT,
    post.vendor_count::TEXT,
    CASE 
        WHEN post.vendor_count = pre.vendor_count THEN 'All vendors preserved'
        ELSE FORMAT('Vendor count mismatch: expected %s, got %s', pre.vendor_count, post.vendor_count)
    END
FROM pre_rollback_metrics pre, post_rollback_metrics post;

-- Test 5: Verify dimensional data cleared
INSERT INTO rollback_test_results (test_name, test_phase, test_status, expected_value, actual_value, message)
SELECT 
    'Post-Rollback Data Cleared',
    'Phase 3: Post-Rollback Verification',
    CASE WHEN vendors_with_status = 0 AND vendors_with_size = 0 AND vendors_with_model = 0 
         THEN 'PASS' ELSE 'FAIL' END,
    '0 for all dimensions',
    FORMAT('Status: %s, Size: %s, Model: %s', vendors_with_status, vendors_with_size, vendors_with_model),
    CASE 
        WHEN vendors_with_status = 0 AND vendors_with_size = 0 AND vendors_with_model = 0
        THEN 'All dimensional data cleared successfully'
        ELSE 'Some dimensional data remains'
    END
FROM post_rollback_metrics;

-- Test 6: Verify backup table created
INSERT INTO rollback_test_results (test_name, test_phase, test_status, expected_value, actual_value, message)
SELECT 
    'Post-Rollback Backup Table',
    'Phase 3: Post-Rollback Verification',
    CASE WHEN backup_table_exists AND backup_record_count = vendor_count THEN 'PASS' ELSE 'FAIL' END,
    'Table exists with all records',
    FORMAT('Exists: %s, Records: %s', backup_table_exists, backup_record_count),
    CASE 
        WHEN backup_table_exists AND backup_record_count = vendor_count
        THEN 'Backup table created with all vendor records'
        WHEN NOT backup_table_exists
        THEN 'Backup table not created'
        ELSE FORMAT('Backup record count mismatch: expected %s, got %s', vendor_count, backup_record_count)
    END
FROM post_rollback_metrics;

-- Test 7: Verify columns dropped
INSERT INTO rollback_test_results (test_name, test_phase, test_status, expected_value, actual_value, message)
SELECT 
    'Post-Rollback Columns Dropped',
    'Phase 3: Post-Rollback Verification',
    CASE WHEN remaining_columns = 0 THEN 'PASS' ELSE 'FAIL' END,
    '0',
    remaining_columns::TEXT,
    CASE 
        WHEN remaining_columns = 0 THEN 'All new columns dropped successfully'
        ELSE FORMAT('%s columns remain (should be 0)', remaining_columns)
    END
FROM post_rollback_metrics;

-- Test 8: Verify indexes dropped
INSERT INTO rollback_test_results (test_name, test_phase, test_status, expected_value, actual_value, message)
SELECT 
    'Post-Rollback Indexes Dropped',
    'Phase 3: Post-Rollback Verification',
    CASE WHEN remaining_indexes = 0 THEN 'PASS' ELSE 'FAIL' END,
    '0',
    remaining_indexes::TEXT,
    CASE 
        WHEN remaining_indexes = 0 THEN 'All new indexes dropped successfully'
        ELSE FORMAT('%s indexes remain (should be 0)', remaining_indexes)
    END
FROM post_rollback_metrics;

RAISE NOTICE '✓ Phase 3 Complete: Post-rollback verification done';
RAISE NOTICE '';

-- ============================================================================
-- Phase 4: Test Restoration Procedure
-- ============================================================================

RAISE NOTICE 'Phase 4: Testing restoration procedure...';
RAISE NOTICE '';

-- First, re-run migrations 002 and 003 to set up for restoration
RAISE NOTICE 'Re-applying migrations for restoration test...';
\i 002_add_vendor_columns.sql

-- Now test restoration script
RAISE NOTICE 'Running restoration script...';
\i restore_dimensional_data.sql

-- Test 9: Verify restoration script executed
INSERT INTO rollback_test_results (test_name, test_phase, test_status, expected_value, actual_value, message)
VALUES (
    'Restoration Script Execution',
    'Phase 4: Restoration Test',
    'PASS',
    'No errors',
    'Completed successfully',
    'Restoration script executed without errors'
);

RAISE NOTICE '✓ Phase 4 Complete: Restoration tested';
RAISE NOTICE '';

-- ============================================================================
-- Phase 5: Post-Restoration Verification
-- ============================================================================

RAISE NOTICE 'Phase 5: Verifying restoration results...';
RAISE NOTICE '';

-- Capture post-restoration metrics
CREATE TEMPORARY TABLE post_restoration_metrics AS
SELECT 
    (SELECT COUNT(*) FROM vendors) as vendor_count,
    (SELECT COUNT(*) FROM vendors WHERE business_status_id IS NOT NULL) as vendors_with_status,
    (SELECT COUNT(*) FROM vendors WHERE business_size_id IS NOT NULL) as vendors_with_size,
    (SELECT COUNT(*) FROM vendors WHERE business_model_id IS NOT NULL) as vendors_with_model,
    (SELECT COUNT(*) FROM vendors WHERE bmc_completed = true) as vendors_with_bmc;

-- Test 10: Verify dimensional data restored
INSERT INTO rollback_test_results (test_name, test_phase, test_status, expected_value, actual_value, message)
SELECT 
    'Post-Restoration Data Restored',
    'Phase 5: Post-Restoration Verification',
    CASE WHEN 
        post_rest.vendors_with_status = pre.vendors_with_status AND
        post_rest.vendors_with_size = pre.vendors_with_size AND
        post_rest.vendors_with_model = pre.vendors_with_model
    THEN 'PASS' ELSE 'FAIL' END,
    FORMAT('Status: %s, Size: %s, Model: %s', 
           pre.vendors_with_status, pre.vendors_with_size, pre.vendors_with_model),
    FORMAT('Status: %s, Size: %s, Model: %s', 
           post_rest.vendors_with_status, post_rest.vendors_with_size, post_rest.vendors_with_model),
    CASE 
        WHEN post_rest.vendors_with_status = pre.vendors_with_status AND
             post_rest.vendors_with_size = pre.vendors_with_size AND
             post_rest.vendors_with_model = pre.vendors_with_model
        THEN 'All dimensional data restored to original state'
        ELSE 'Dimensional data mismatch after restoration'
    END
FROM pre_rollback_metrics pre, post_restoration_metrics post_rest;

-- Test 11: Verify vendor count still preserved
INSERT INTO rollback_test_results (test_name, test_phase, test_status, expected_value, actual_value, message)
SELECT 
    'Post-Restoration Vendor Count',
    'Phase 5: Post-Restoration Verification',
    CASE WHEN post_rest.vendor_count = pre.vendor_count THEN 'PASS' ELSE 'FAIL' END,
    pre.vendor_count::TEXT,
    post_rest.vendor_count::TEXT,
    CASE 
        WHEN post_rest.vendor_count = pre.vendor_count 
        THEN 'Vendor count preserved through rollback and restoration'
        ELSE 'Vendor count changed during rollback/restoration cycle'
    END
FROM pre_rollback_metrics pre, post_restoration_metrics post_rest;

RAISE NOTICE '✓ Phase 5 Complete: Post-restoration verification done';
RAISE NOTICE '';

-- ============================================================================
-- Test Summary Report
-- ============================================================================

DO $$
DECLARE
    total_tests INTEGER;
    passed_tests INTEGER;
    failed_tests INTEGER;
    test_record RECORD;
BEGIN
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE test_status = 'PASS'),
        COUNT(*) FILTER (WHERE test_status = 'FAIL')
    INTO total_tests, passed_tests, failed_tests
    FROM rollback_test_results;
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'TEST SUMMARY REPORT';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Total Tests: %', total_tests;
    RAISE NOTICE 'Passed: % (%.1f%%)', passed_tests, 
        ROUND(100.0 * passed_tests / total_tests, 1);
    RAISE NOTICE 'Failed: % (%.1f%%)', failed_tests,
        ROUND(100.0 * failed_tests / total_tests, 1);
    RAISE NOTICE '';
    
    IF failed_tests > 0 THEN
        RAISE NOTICE 'FAILED TESTS:';
        RAISE NOTICE '------------------------------------------------------------';
        FOR test_record IN 
            SELECT test_name, test_phase, expected_value, actual_value, message
            FROM rollback_test_results
            WHERE test_status = 'FAIL'
            ORDER BY test_id
        LOOP
            RAISE NOTICE '';
            RAISE NOTICE 'Test: %', test_record.test_name;
            RAISE NOTICE 'Phase: %', test_record.test_phase;
            RAISE NOTICE 'Expected: %', test_record.expected_value;
            RAISE NOTICE 'Actual: %', test_record.actual_value;
            RAISE NOTICE 'Message: %', test_record.message;
        END LOOP;
        RAISE NOTICE '';
        RAISE NOTICE '------------------------------------------------------------';
    END IF;
    
    RAISE NOTICE '';
    
    IF failed_tests = 0 THEN
        RAISE NOTICE '✓✓✓ ALL TESTS PASSED ✓✓✓';
        RAISE NOTICE '';
        RAISE NOTICE 'Rollback procedure is verified and safe to use in production';
    ELSE
        RAISE NOTICE '✗✗✗ SOME TESTS FAILED ✗✗✗';
        RAISE NOTICE '';
        RAISE NOTICE 'DO NOT use rollback procedure in production until issues are fixed';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '';
END $$;

-- Display detailed test results
SELECT 
    test_id,
    test_name,
    test_phase,
    test_status,
    expected_value,
    actual_value,
    message,
    tested_at
FROM rollback_test_results
ORDER BY test_id;

-- ============================================================================
-- Cleanup (Optional)
-- ============================================================================

-- Uncomment to clean up test artifacts
-- DROP TABLE IF EXISTS rollback_test_results;
-- DROP TABLE IF EXISTS vendors_before_rollback;

RAISE NOTICE '';
RAISE NOTICE 'Test complete. Review test results table for details.';
RAISE NOTICE 'Query: SELECT * FROM rollback_test_results ORDER BY test_id;';
RAISE NOTICE '';

-- ============================================================================
-- END OF TEST SCRIPT
-- ============================================================================
