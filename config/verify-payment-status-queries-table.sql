-- ============================================================================
-- Verification Script for payment_status_queries Table (Task 1.3)
-- ============================================================================
-- This script verifies the payment_status_queries audit table was created
-- correctly with all required columns, indexes, constraints, and RLS policies.

-- Test 1: Verify table exists
DO $$
DECLARE
    v_table_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'payment_status_queries'
        AND table_schema = 'public'
    ) INTO v_table_exists;
    
    IF v_table_exists THEN
        RAISE NOTICE '✅ Test 1 PASSED: payment_status_queries table exists';
    ELSE
        RAISE EXCEPTION '❌ Test 1 FAILED: payment_status_queries table not found';
    END IF;
END $$;

-- Test 2: Verify all required columns exist
DO $$
DECLARE
    v_columns_exist BOOLEAN;
    v_missing_columns TEXT[];
BEGIN
    WITH required_columns AS (
        SELECT unnest(ARRAY[
            'id', 'payment_id', 'checkout_request_id', 
            'query_response', 'query_attempt', 'is_automatic_retry', 
            'queried_at'
        ]) AS column_name
    ),
    existing_columns AS (
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'payment_status_queries'
        AND table_schema = 'public'
    )
    SELECT ARRAY_AGG(rc.column_name)
    INTO v_missing_columns
    FROM required_columns rc
    LEFT JOIN existing_columns ec ON rc.column_name = ec.column_name
    WHERE ec.column_name IS NULL;
    
    IF v_missing_columns IS NULL THEN
        RAISE NOTICE '✅ Test 2 PASSED: All required columns exist';
    ELSE
        RAISE EXCEPTION '❌ Test 2 FAILED: Missing columns: %', array_to_string(v_missing_columns, ', ');
    END IF;
END $$;

-- Test 3: Verify foreign key constraint exists
DO $$
DECLARE
    v_fk_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_payment_status_queries_payment'
        AND table_name = 'payment_status_queries'
        AND constraint_type = 'FOREIGN KEY'
    ) INTO v_fk_exists;
    
    IF v_fk_exists THEN
        RAISE NOTICE '✅ Test 3 PASSED: Foreign key constraint to stokika_kit_payments exists';
    ELSE
        RAISE EXCEPTION '❌ Test 3 FAILED: Foreign key constraint not found';
    END IF;
END $$;

-- Test 4: Verify indexes exist
DO $$
DECLARE
    v_indexes_exist BOOLEAN;
    v_missing_indexes TEXT[];
BEGIN
    WITH required_indexes AS (
        SELECT unnest(ARRAY[
            'idx_payment_status_queries_payment_id',
            'idx_payment_status_queries_checkout_request',
            'idx_payment_status_queries_timestamp',
            'idx_payment_status_queries_auto_retry'
        ]) AS index_name
    ),
    existing_indexes AS (
        SELECT indexname AS index_name
        FROM pg_indexes
        WHERE tablename = 'payment_status_queries'
        AND schemaname = 'public'
    )
    SELECT ARRAY_AGG(ri.index_name)
    INTO v_missing_indexes
    FROM required_indexes ri
    LEFT JOIN existing_indexes ei ON ri.index_name = ei.index_name
    WHERE ei.index_name IS NULL;
    
    IF v_missing_indexes IS NULL THEN
        RAISE NOTICE '✅ Test 4 PASSED: All required indexes exist';
    ELSE
        RAISE EXCEPTION '❌ Test 4 FAILED: Missing indexes: %', array_to_string(v_missing_indexes, ', ');
    END IF;
END $$;

-- Test 5: Verify RLS is enabled
DO $$
DECLARE
    v_rls_enabled BOOLEAN;
BEGIN
    SELECT relrowsecurity
    INTO v_rls_enabled
    FROM pg_class
    WHERE relname = 'payment_status_queries'
    AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
    
    IF v_rls_enabled THEN
        RAISE NOTICE '✅ Test 5 PASSED: RLS is enabled on payment_status_queries';
    ELSE
        RAISE EXCEPTION '❌ Test 5 FAILED: RLS is not enabled';
    END IF;
END $$;

-- Test 6: Verify RLS policies exist
DO $$
DECLARE
    v_policy_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_policy_count
    FROM pg_policies
    WHERE tablename = 'payment_status_queries'
    AND schemaname = 'public';
    
    IF v_policy_count >= 3 THEN
        RAISE NOTICE '✅ Test 6 PASSED: % RLS policies found', v_policy_count;
    ELSE
        RAISE EXCEPTION '❌ Test 6 FAILED: Expected at least 3 RLS policies, found %', v_policy_count;
    END IF;
END $$;

-- Test 7: Verify helper views exist
DO $$
DECLARE
    v_views_exist BOOLEAN;
    v_missing_views TEXT[];
BEGIN
    WITH required_views AS (
        SELECT unnest(ARRAY[
            'v_recent_status_queries',
            'v_status_query_metrics'
        ]) AS view_name
    ),
    existing_views AS (
        SELECT table_name AS view_name
        FROM information_schema.views
        WHERE table_schema = 'public'
    )
    SELECT ARRAY_AGG(rv.view_name)
    INTO v_missing_views
    FROM required_views rv
    LEFT JOIN existing_views ev ON rv.view_name = ev.view_name
    WHERE ev.view_name IS NULL;
    
    IF v_missing_views IS NULL THEN
        RAISE NOTICE '✅ Test 7 PASSED: All helper views exist';
    ELSE
        RAISE EXCEPTION '❌ Test 7 FAILED: Missing views: %', array_to_string(v_missing_views, ', ');
    END IF;
END $$;

-- Test 8: Verify helper functions exist
DO $$
DECLARE
    v_functions_exist BOOLEAN;
    v_missing_functions TEXT[];
BEGIN
    WITH required_functions AS (
        SELECT unnest(ARRAY[
            'log_status_query',
            'get_payment_status_query_history'
        ]) AS function_name
    ),
    existing_functions AS (
        SELECT proname AS function_name
        FROM pg_proc
        WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    )
    SELECT ARRAY_AGG(rf.function_name)
    INTO v_missing_functions
    FROM required_functions rf
    LEFT JOIN existing_functions ef ON rf.function_name = ef.function_name
    WHERE ef.function_name IS NULL;
    
    IF v_missing_functions IS NULL THEN
        RAISE NOTICE '✅ Test 8 PASSED: All helper functions exist';
    ELSE
        RAISE EXCEPTION '❌ Test 8 FAILED: Missing functions: %', array_to_string(v_missing_functions, ', ');
    END IF;
END $$;

-- Test 9: Verify column data types
DO $$
DECLARE
    v_correct_types BOOLEAN;
BEGIN
    SELECT 
        COUNT(*) = 7
    INTO v_correct_types
    FROM information_schema.columns
    WHERE table_name = 'payment_status_queries'
    AND (
        (column_name = 'id' AND data_type = 'uuid') OR
        (column_name = 'payment_id' AND data_type = 'uuid') OR
        (column_name = 'checkout_request_id' AND character_maximum_length = 100) OR
        (column_name = 'query_response' AND data_type = 'jsonb') OR
        (column_name = 'query_attempt' AND data_type = 'integer') OR
        (column_name = 'is_automatic_retry' AND data_type = 'boolean') OR
        (column_name = 'queried_at' AND data_type = 'timestamp with time zone')
    );
    
    IF v_correct_types THEN
        RAISE NOTICE '✅ Test 9 PASSED: All column data types are correct';
    ELSE
        RAISE EXCEPTION '❌ Test 9 FAILED: One or more columns have incorrect data types';
    END IF;
END $$;

-- Test 10: Test helper function log_status_query (functional test)
-- This requires stokika_kit_payments table to exist
DO $$
DECLARE
    v_test_payment_id UUID;
    v_query_id UUID;
BEGIN
    -- Check if stokika_kit_payments table exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'stokika_kit_payments'
    ) THEN
        -- Create a test payment record
        INSERT INTO stokika_kit_payments (
            application_code,
            phone_number,
            kit_amount,
            user_type,
            payment_status,
            checkout_request_id,
            created_at
        ) VALUES (
            'TEST_APP_001',
            '254712345678',
            2500,
            'field_agent',
            'timeout',
            'ws_CO_TEST_' || EXTRACT(EPOCH FROM NOW())::TEXT,
            NOW()
        ) RETURNING id INTO v_test_payment_id;
        
        -- Test log_status_query function
        SELECT log_status_query(
            v_test_payment_id,
            'ws_CO_TEST_' || EXTRACT(EPOCH FROM NOW())::TEXT,
            '{"ResultCode": "1032", "ResultDesc": "Request cancelled by user"}'::JSONB,
            TRUE
        ) INTO v_query_id;
        
        -- Verify the record was created
        IF EXISTS (
            SELECT 1 FROM payment_status_queries 
            WHERE id = v_query_id 
            AND payment_id = v_test_payment_id
        ) THEN
            RAISE NOTICE '✅ Test 10 PASSED: log_status_query function works correctly';
        ELSE
            RAISE EXCEPTION '❌ Test 10 FAILED: log_status_query did not create record';
        END IF;
        
        -- Cleanup test data
        DELETE FROM payment_status_queries WHERE payment_id = v_test_payment_id;
        DELETE FROM stokika_kit_payments WHERE id = v_test_payment_id;
    ELSE
        RAISE NOTICE '⚠️  Test 10 SKIPPED: stokika_kit_payments table not found (functional test requires it)';
    END IF;
END $$;

-- ============================================================================
-- Final Summary
-- ============================================================================

SELECT 
    '=== VERIFICATION COMPLETE ===' as status,
    'payment_status_queries audit table' as component,
    'Task 1.3' as task,
    'mpesa-timeout-handling spec' as spec,
    'Requirements 3.1, 7.5' as requirements,
    NOW() as verified_at;

-- Display table structure
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'payment_status_queries'
ORDER BY ordinal_position;

-- Display indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'payment_status_queries'
ORDER BY indexname;

-- Display RLS policies
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'payment_status_queries'
ORDER BY policyname;

RAISE NOTICE '📊 To view the table structure, check the query results above';
RAISE NOTICE '📊 To test the views, run:';
RAISE NOTICE '   SELECT * FROM v_recent_status_queries;';
RAISE NOTICE '   SELECT * FROM v_status_query_metrics;';
