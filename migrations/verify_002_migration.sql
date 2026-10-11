-- ============================================================================
-- VERIFICATION SCRIPT: Migration 002 - Add Vendor Columns
-- ============================================================================
-- Run this script after applying migration 002 to verify success
-- ============================================================================

\echo '========================================================================='
\echo 'MIGRATION 002 VERIFICATION'
\echo '========================================================================='
\echo ''

-- Check 1: Verify all columns exist
\echo 'Check 1: Verifying columns exist...'
SELECT 
    CASE 
        WHEN COUNT(*) = 5 THEN '✓ PASS: All 5 columns exist'
        ELSE '✗ FAIL: Expected 5 columns, found ' || COUNT(*)::TEXT
    END as result
FROM information_schema.columns
WHERE table_name = 'vendors'
AND column_name IN (
    'business_category_other',
    'stock_cycle',
    'stock_requirement_amount',
    'stock_justification',
    'bmc_completed'
);

\echo ''
\echo 'Column Details:'
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    CASE 
        WHEN column_name = 'business_category_other' AND data_type = 'text' AND is_nullable = 'YES' THEN '✓'
        WHEN column_name = 'stock_cycle' AND data_type = 'text' AND is_nullable = 'YES' THEN '✓'
        WHEN column_name = 'stock_requirement_amount' AND data_type = 'numeric' AND is_nullable = 'YES' THEN '✓'
        WHEN column_name = 'stock_justification' AND data_type = 'text' AND is_nullable = 'YES' THEN '✓'
        WHEN column_name = 'bmc_completed' AND data_type = 'boolean' AND is_nullable = 'NO' AND column_default = 'false' THEN '✓'
        ELSE '✗'
    END as status
FROM information_schema.columns
WHERE table_name = 'vendors'
AND column_name IN (
    'business_category_other',
    'stock_cycle',
    'stock_requirement_amount',
    'stock_justification',
    'bmc_completed'
)
ORDER BY column_name;

\echo ''

-- Check 2: Verify CHECK constraints exist
\echo 'Check 2: Verifying CHECK constraints...'
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition,
    '✓' as status
FROM pg_constraint
WHERE conrelid = 'vendors'::regclass
AND conname IN (
    'vendors_stock_cycle_check',
    'vendors_stock_requirement_amount_check',
    'vendors_stock_justification_check'
)
ORDER BY conname;

\echo ''

-- Check 3: Verify indexes exist
\echo 'Check 3: Verifying indexes...'
SELECT 
    CASE 
        WHEN COUNT(*) >= 6 THEN '✓ PASS: All required indexes exist'
        ELSE '✗ FAIL: Expected at least 6 indexes, found ' || COUNT(*)::TEXT
    END as result
FROM pg_indexes
WHERE tablename = 'vendors'
AND indexname IN (
    'idx_vendors_business_category',
    'idx_vendors_business_status',
    'idx_vendors_business_size',
    'idx_vendors_business_model',
    'idx_vendors_bmc_completed',
    'idx_vendors_stock_cycle'
);

\echo ''
\echo 'Index Details:'
SELECT 
    indexname,
    '✓' as status
FROM pg_indexes
WHERE tablename = 'vendors'
AND indexname IN (
    'idx_vendors_business_category',
    'idx_vendors_business_status',
    'idx_vendors_business_size',
    'idx_vendors_business_model',
    'idx_vendors_bmc_completed',
    'idx_vendors_stock_cycle'
)
ORDER BY indexname;

\echo ''

-- Check 4: Test stock_cycle constraint
\echo 'Check 4: Testing stock_cycle constraint...'
DO $$
DECLARE
    test_passed BOOLEAN := false;
BEGIN
    -- Try to insert invalid stock_cycle value
    BEGIN
        CREATE TEMP TABLE test_stock_cycle AS SELECT * FROM vendors LIMIT 0;
        INSERT INTO test_stock_cycle (id, stock_cycle) VALUES (gen_random_uuid(), 'invalid_value');
        RAISE NOTICE '✗ FAIL: stock_cycle constraint not working (accepted invalid value)';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE '✓ PASS: stock_cycle constraint working (rejected invalid value)';
        test_passed := true;
    END;
    
    -- Try to insert valid stock_cycle value
    IF test_passed THEN
        BEGIN
            DROP TABLE IF EXISTS test_stock_cycle;
            CREATE TEMP TABLE test_stock_cycle AS SELECT * FROM vendors LIMIT 0;
            INSERT INTO test_stock_cycle (id, stock_cycle) VALUES (gen_random_uuid(), 'weekly');
            RAISE NOTICE '✓ PASS: stock_cycle constraint allows valid value';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '✗ FAIL: stock_cycle constraint rejected valid value';
        END;
    END IF;
    
    DROP TABLE IF EXISTS test_stock_cycle;
END $$;

\echo ''

-- Check 5: Test stock_requirement_amount constraint
\echo 'Check 5: Testing stock_requirement_amount constraint...'
DO $$
DECLARE
    test_passed BOOLEAN := false;
BEGIN
    -- Try to insert negative value
    BEGIN
        CREATE TEMP TABLE test_stock_amount AS SELECT * FROM vendors LIMIT 0;
        INSERT INTO test_stock_amount (id, stock_requirement_amount) VALUES (gen_random_uuid(), -100.00);
        RAISE NOTICE '✗ FAIL: stock_requirement_amount constraint not working (accepted negative value)';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE '✓ PASS: stock_requirement_amount constraint working (rejected negative value)';
        test_passed := true;
    END;
    
    -- Try to insert zero value
    IF test_passed THEN
        BEGIN
            DROP TABLE IF EXISTS test_stock_amount;
            CREATE TEMP TABLE test_stock_amount AS SELECT * FROM vendors LIMIT 0;
            INSERT INTO test_stock_amount (id, stock_requirement_amount) VALUES (gen_random_uuid(), 0);
            RAISE NOTICE '✗ FAIL: stock_requirement_amount constraint not working (accepted zero)';
        EXCEPTION WHEN check_violation THEN
            RAISE NOTICE '✓ PASS: stock_requirement_amount constraint working (rejected zero)';
        END;
    END IF;
    
    -- Try to insert positive value
    IF test_passed THEN
        BEGIN
            DROP TABLE IF EXISTS test_stock_amount;
            CREATE TEMP TABLE test_stock_amount AS SELECT * FROM vendors LIMIT 0;
            INSERT INTO test_stock_amount (id, stock_requirement_amount) VALUES (gen_random_uuid(), 50000.00);
            RAISE NOTICE '✓ PASS: stock_requirement_amount constraint allows positive value';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '✗ FAIL: stock_requirement_amount constraint rejected positive value';
        END;
    END IF;
    
    DROP TABLE IF EXISTS test_stock_amount;
END $$;

\echo ''

-- Check 6: Test stock_justification constraint
\echo 'Check 6: Testing stock_justification constraint...'
DO $$
DECLARE
    test_passed BOOLEAN := false;
BEGIN
    -- Try to insert text with less than 20 characters
    BEGIN
        CREATE TEMP TABLE test_justification AS SELECT * FROM vendors LIMIT 0;
        INSERT INTO test_justification (id, stock_justification) VALUES (gen_random_uuid(), 'Too short');
        RAISE NOTICE '✗ FAIL: stock_justification constraint not working (accepted < 20 chars)';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE '✓ PASS: stock_justification constraint working (rejected < 20 chars)';
        test_passed := true;
    END;
    
    -- Try to insert text with 20+ characters
    IF test_passed THEN
        BEGIN
            DROP TABLE IF EXISTS test_justification;
            CREATE TEMP TABLE test_justification AS SELECT * FROM vendors LIMIT 0;
            INSERT INTO test_justification (id, stock_justification) 
            VALUES (gen_random_uuid(), 'This is a valid justification with more than twenty characters');
            RAISE NOTICE '✓ PASS: stock_justification constraint allows text >= 20 chars';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '✗ FAIL: stock_justification constraint rejected valid text';
        END;
    END IF;
    
    DROP TABLE IF EXISTS test_justification;
END $$;

\echo ''

-- Check 7: Test bmc_completed default value
\echo 'Check 7: Testing bmc_completed default value...'
DO $$
BEGIN
    BEGIN
        CREATE TEMP TABLE test_bmc AS SELECT * FROM vendors LIMIT 0;
        INSERT INTO test_bmc (id) VALUES (gen_random_uuid());
        
        IF (SELECT bmc_completed FROM test_bmc LIMIT 1) = false THEN
            RAISE NOTICE '✓ PASS: bmc_completed defaults to false';
        ELSE
            RAISE NOTICE '✗ FAIL: bmc_completed does not default to false';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '✗ FAIL: Could not test bmc_completed default';
    END;
    
    DROP TABLE IF EXISTS test_bmc;
END $$;

\echo ''
\echo '========================================================================='
\echo 'VERIFICATION COMPLETE'
\echo '========================================================================='
\echo ''
\echo 'Summary:'
\echo '- If all checks show ✓ PASS, migration 002 was successful'
\echo '- If any checks show ✗ FAIL, review the migration and reapply if needed'
\echo ''
