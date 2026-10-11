-- ============================================================================
-- VERIFICATION SCRIPT: ID-Based Application Code Schema Setup
-- Date: 2026-01-25
-- Purpose: Verify migration 20260125000001 was applied correctly
-- ============================================================================

DO $$
DECLARE
    v_test_passed BOOLEAN := TRUE;
    v_constraint_exists BOOLEAN;
    v_index_exists BOOLEAN;
    v_test_number INTEGER := 0;
BEGIN
    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'VERIFICATION: ID-Based Application Code Schema Setup';
    RAISE NOTICE '=================================================================';
    RAISE NOTICE '';
    
    -- ========================================================================
    -- TEST 1: Verify field_agents.id_number unique constraint
    -- ========================================================================
    v_test_number := v_test_number + 1;
    SELECT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_field_agent_id_number'
    ) INTO v_constraint_exists;
    
    IF v_constraint_exists THEN
        RAISE NOTICE 'TEST % PASSED: unique_field_agent_id_number constraint exists', v_test_number;
    ELSE
        RAISE WARNING 'TEST % FAILED: unique_field_agent_id_number constraint missing', v_test_number;
        v_test_passed := FALSE;
    END IF;
    
    -- ========================================================================
    -- TEST 2: Verify field_agents.application_code unique constraint
    -- ========================================================================
    v_test_number := v_test_number + 1;
    SELECT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_field_agent_application_code'
    ) INTO v_constraint_exists;
    
    IF v_constraint_exists THEN
        RAISE NOTICE 'TEST % PASSED: unique_field_agent_application_code constraint exists', v_test_number;
    ELSE
        RAISE WARNING 'TEST % FAILED: unique_field_agent_application_code constraint missing', v_test_number;
        v_test_passed := FALSE;
    END IF;
    
    -- ========================================================================
    -- TEST 3: Verify supervisors.id_number unique constraint
    -- ========================================================================
    v_test_number := v_test_number + 1;
    SELECT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_supervisor_id_number'
    ) INTO v_constraint_exists;
    
    IF v_constraint_exists THEN
        RAISE NOTICE 'TEST % PASSED: unique_supervisor_id_number constraint exists', v_test_number;
    ELSE
        RAISE WARNING 'TEST % FAILED: unique_supervisor_id_number constraint missing', v_test_number;
        v_test_passed := FALSE;
    END IF;
    
    -- ========================================================================
    -- TEST 4: Verify supervisors.application_code unique constraint
    -- ========================================================================
    v_test_number := v_test_number + 1;
    SELECT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_supervisor_application_code'
    ) INTO v_constraint_exists;
    
    IF v_constraint_exists THEN
        RAISE NOTICE 'TEST % PASSED: unique_supervisor_application_code constraint exists', v_test_number;
    ELSE
        RAISE WARNING 'TEST % FAILED: unique_supervisor_application_code constraint missing', v_test_number;
        v_test_passed := FALSE;
    END IF;
    
    -- ========================================================================
    -- TEST 5: Verify field_agents.id_number index
    -- ========================================================================
    v_test_number := v_test_number + 1;
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_field_agents_id_number'
    ) INTO v_index_exists;
    
    IF v_index_exists THEN
        RAISE NOTICE 'TEST % PASSED: idx_field_agents_id_number index exists', v_test_number;
    ELSE
        RAISE WARNING 'TEST % FAILED: idx_field_agents_id_number index missing', v_test_number;
        v_test_passed := FALSE;
    END IF;
    
    -- ========================================================================
    -- TEST 6: Verify field_agents.application_code index
    -- ========================================================================
    v_test_number := v_test_number + 1;
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_field_agents_application_code'
    ) INTO v_index_exists;
    
    IF v_index_exists THEN
        RAISE NOTICE 'TEST % PASSED: idx_field_agents_application_code index exists', v_test_number;
    ELSE
        RAISE WARNING 'TEST % FAILED: idx_field_agents_application_code index missing', v_test_number;
        v_test_passed := FALSE;
    END IF;
    
    -- ========================================================================
    -- TEST 7: Verify supervisors.id_number index
    -- ========================================================================
    v_test_number := v_test_number + 1;
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_supervisors_id_number'
    ) INTO v_index_exists;
    
    IF v_index_exists THEN
        RAISE NOTICE 'TEST % PASSED: idx_supervisors_id_number index exists', v_test_number;
    ELSE
        RAISE WARNING 'TEST % FAILED: idx_supervisors_id_number index missing', v_test_number;
        v_test_passed := FALSE;
    END IF;
    
    -- ========================================================================
    -- TEST 8: Verify supervisors.application_code index
    -- ========================================================================
    v_test_number := v_test_number + 1;
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_supervisors_application_code'
    ) INTO v_index_exists;
    
    IF v_index_exists THEN
        RAISE NOTICE 'TEST % PASSED: idx_supervisors_application_code index exists', v_test_number;
    ELSE
        RAISE WARNING 'TEST % FAILED: idx_supervisors_application_code index missing', v_test_number;
        v_test_passed := FALSE;
    END IF;
    
    -- ========================================================================
    -- TEST 9: Test duplicate ID prevention in field_agents
    -- ========================================================================
    v_test_number := v_test_number + 1;
    BEGIN
        -- Try to create test records with same ID
        INSERT INTO field_agents (id_number, application_code, full_name, phone, email)
        VALUES ('99999999', 'TEST_CODE_1', 'Test User 1', '0700000001', 'test1@test.com');
        
        INSERT INTO field_agents (id_number, application_code, full_name, phone, email)
        VALUES ('99999999', 'TEST_CODE_2', 'Test User 2', '0700000002', 'test2@test.com');
        
        -- If we reach here, constraint didn't work
        RAISE WARNING 'TEST % FAILED: Duplicate ID was allowed in field_agents', v_test_number;
        v_test_passed := FALSE;
        
        -- Clean up test data
        DELETE FROM field_agents WHERE id_number = '99999999';
        
    EXCEPTION
        WHEN unique_violation THEN
            -- This is expected - constraint is working
            RAISE NOTICE 'TEST % PASSED: Duplicate ID correctly prevented in field_agents', v_test_number;
            -- Clean up any test data that might have been inserted
            DELETE FROM field_agents WHERE id_number = '99999999';
    END;
    
    -- ========================================================================
    -- TEST 10: Test duplicate application code prevention in field_agents
    -- ========================================================================
    v_test_number := v_test_number + 1;
    BEGIN
        -- Try to create test records with same application code
        INSERT INTO field_agents (id_number, application_code, full_name, phone, email)
        VALUES ('99999991', 'TEST_DUP_CODE', 'Test User 1', '0700000001', 'test1@test.com');
        
        INSERT INTO field_agents (id_number, application_code, full_name, phone, email)
        VALUES ('99999992', 'TEST_DUP_CODE', 'Test User 2', '0700000002', 'test2@test.com');
        
        -- If we reach here, constraint didn't work
        RAISE WARNING 'TEST % FAILED: Duplicate application code was allowed in field_agents', v_test_number;
        v_test_passed := FALSE;
        
        -- Clean up test data
        DELETE FROM field_agents WHERE application_code = 'TEST_DUP_CODE';
        
    EXCEPTION
        WHEN unique_violation THEN
            -- This is expected - constraint is working
            RAISE NOTICE 'TEST % PASSED: Duplicate application code correctly prevented in field_agents', v_test_number;
            -- Clean up any test data that might have been inserted
            DELETE FROM field_agents WHERE application_code = 'TEST_DUP_CODE';
    END;
    
    -- ========================================================================
    -- TEST 11: Verify column comments exist
    -- ========================================================================
    v_test_number := v_test_number + 1;
    IF EXISTS (
        SELECT 1 FROM pg_description d
        JOIN pg_class c ON d.objoid = c.oid
        JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = d.objsubid
        WHERE c.relname = 'field_agents' 
        AND a.attname = 'id_number'
        AND d.description IS NOT NULL
    ) THEN
        RAISE NOTICE 'TEST % PASSED: field_agents.id_number has documentation comment', v_test_number;
    ELSE
        RAISE WARNING 'TEST % FAILED: field_agents.id_number missing documentation comment', v_test_number;
        v_test_passed := FALSE;
    END IF;
    
    -- ========================================================================
    -- Summary
    -- ========================================================================
    RAISE NOTICE '';
    RAISE NOTICE '=================================================================';
    IF v_test_passed THEN
        RAISE NOTICE 'VERIFICATION PASSED: All % tests successful ✓', v_test_number;
        RAISE NOTICE 'Migration 20260125000001 was applied correctly';
    ELSE
        RAISE WARNING 'VERIFICATION FAILED: Some tests did not pass';
        RAISE WARNING 'Please review warnings above and re-run migration if needed';
    END IF;
    RAISE NOTICE '=================================================================';
    RAISE NOTICE '';
END $$;
