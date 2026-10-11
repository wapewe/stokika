-- Verification Script: generate_field_agent_code function
-- Purpose: Test that the RPC function works correctly
-- Date: 2026-01-25

-- ============================================================
-- Test 1: Valid ID returns code with correct format
-- ============================================================

DO $$
DECLARE
    v_result TEXT;
BEGIN
    -- Test with valid 8-digit ID
    v_result := generate_field_agent_code('12345678');
    
    -- Check result starts with SFA1234
    IF v_result LIKE 'SFA1234%' AND LENGTH(v_result) = 11 THEN
        RAISE NOTICE '✓ Test 1 PASSED: Valid ID returns correctly formatted code: %', v_result;
    ELSE
        RAISE EXCEPTION '✗ Test 1 FAILED: Expected SFA1234XXXX, got %', v_result;
    END IF;
END $$;

-- ============================================================
-- Test 2: Invalid format - too short
-- ============================================================

DO $$
DECLARE
    v_result TEXT;
BEGIN
    v_result := generate_field_agent_code('123');
    
    IF v_result = 'ERROR: ID number must be exactly 8 digits' THEN
        RAISE NOTICE '✓ Test 2 PASSED: Too short ID rejected correctly';
    ELSE
        RAISE EXCEPTION '✗ Test 2 FAILED: Expected error for short ID, got %', v_result;
    END IF;
END $$;

-- ============================================================
-- Test 3: Invalid format - too long
-- ============================================================

DO $$
DECLARE
    v_result TEXT;
BEGIN
    v_result := generate_field_agent_code('123456789');
    
    IF v_result = 'ERROR: ID number must be exactly 8 digits' THEN
        RAISE NOTICE '✓ Test 3 PASSED: Too long ID rejected correctly';
    ELSE
        RAISE EXCEPTION '✗ Test 3 FAILED: Expected error for long ID, got %', v_result;
    END IF;
END $$;

-- ============================================================
-- Test 4: Invalid format - non-numeric characters
-- ============================================================

DO $$
DECLARE
    v_result TEXT;
BEGIN
    v_result := generate_field_agent_code('1234ABCD');
    
    IF v_result = 'ERROR: ID number must contain only digits' THEN
        RAISE NOTICE '✓ Test 4 PASSED: Non-numeric ID rejected correctly';
    ELSE
        RAISE EXCEPTION '✗ Test 4 FAILED: Expected error for non-numeric ID, got %', v_result;
    END IF;
END $$;

-- ============================================================
-- Test 5: Empty ID rejected
-- ============================================================

DO $$
DECLARE
    v_result TEXT;
BEGIN
    v_result := generate_field_agent_code('');
    
    IF v_result = 'ERROR: ID number is required' THEN
        RAISE NOTICE '✓ Test 5 PASSED: Empty ID rejected correctly';
    ELSE
        RAISE EXCEPTION '✗ Test 5 FAILED: Expected error for empty ID, got %', v_result;
    END IF;
END $$;

-- ============================================================
-- Test 6: NULL ID rejected
-- ============================================================

DO $$
DECLARE
    v_result TEXT;
BEGIN
    v_result := generate_field_agent_code(NULL);
    
    IF v_result = 'ERROR: ID number is required' THEN
        RAISE NOTICE '✓ Test 6 PASSED: NULL ID rejected correctly';
    ELSE
        RAISE EXCEPTION '✗ Test 6 FAILED: Expected error for NULL ID, got %', v_result;
    END IF;
END $$;

-- ============================================================
-- Test 7: Duplicate ID detection (if test data exists)
-- ============================================================

DO $$
DECLARE
    v_result1 TEXT;
    v_result2 TEXT;
BEGIN
    -- Generate code for a new ID
    v_result1 := generate_field_agent_code('99999999');
    
    -- If code was generated successfully, insert a test record
    IF v_result1 LIKE 'SFA%' THEN
        -- Insert test record
        INSERT INTO field_agents (id_number, application_code, full_name, phone, email, status, application_date)
        VALUES ('99999999', v_result1, 'Test User', '0700000000', 'test@example.com', 'pending', NOW())
        ON CONFLICT (id_number) DO NOTHING;
        
        -- Try to generate code for same ID
        v_result2 := generate_field_agent_code('99999999');
        
        IF v_result2 = 'ERROR: This ID number has already been used for an application' THEN
            RAISE NOTICE '✓ Test 7 PASSED: Duplicate ID rejected correctly';
            
            -- Clean up test record
            DELETE FROM field_agents WHERE id_number = '99999999';
        ELSE
            -- Clean up test record
            DELETE FROM field_agents WHERE id_number = '99999999';
            RAISE EXCEPTION '✗ Test 7 FAILED: Expected duplicate ID error, got %', v_result2;
        END IF;
    ELSE
        RAISE NOTICE '⚠ Test 7 SKIPPED: Could not generate initial code for duplicate test';
    END IF;
END $$;

-- ============================================================
-- Test 8: Function permissions
-- ============================================================

DO $$
DECLARE
    v_has_execute_authenticated BOOLEAN;
    v_has_execute_anon BOOLEAN;
BEGIN
    -- Check if authenticated role has execute permission
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.routine_privileges
        WHERE routine_name = 'generate_field_agent_code'
        AND grantee = 'authenticated'
        AND privilege_type = 'EXECUTE'
    ) INTO v_has_execute_authenticated;
    
    -- Check if anon role has execute permission
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.routine_privileges
        WHERE routine_name = 'generate_field_agent_code'
        AND grantee = 'anon'
        AND privilege_type = 'EXECUTE'
    ) INTO v_has_execute_anon;
    
    IF v_has_execute_authenticated AND v_has_execute_anon THEN
        RAISE NOTICE '✓ Test 8 PASSED: Function permissions granted correctly';
    ELSE
        RAISE EXCEPTION '✗ Test 8 FAILED: Missing execute permissions (authenticated: %, anon: %)', 
            v_has_execute_authenticated, v_has_execute_anon;
    END IF;
END $$;

-- ============================================================
-- Test 9: Multiple unique codes for same prefix
-- ============================================================

DO $$
DECLARE
    v_code1 TEXT;
    v_code2 TEXT;
    v_code3 TEXT;
BEGIN
    -- Generate codes for IDs with same first 4 digits
    v_code1 := generate_field_agent_code('87654321');
    v_code2 := generate_field_agent_code('87651234');
    v_code3 := generate_field_agent_code('87659999');
    
    -- All should start with SFA8765
    IF v_code1 LIKE 'SFA8765%' AND v_code2 LIKE 'SFA8765%' AND v_code3 LIKE 'SFA8765%' THEN
        -- Check that all codes are different
        IF v_code1 <> v_code2 AND v_code2 <> v_code3 AND v_code1 <> v_code3 THEN
            RAISE NOTICE '✓ Test 9 PASSED: Multiple unique codes generated for same prefix';
            RAISE NOTICE '  Code 1: %', v_code1;
            RAISE NOTICE '  Code 2: %', v_code2;
            RAISE NOTICE '  Code 3: %', v_code3;
        ELSE
            RAISE EXCEPTION '✗ Test 9 FAILED: Duplicate codes generated (%, %, %)', v_code1, v_code2, v_code3;
        END IF;
    ELSE
        RAISE EXCEPTION '✗ Test 9 FAILED: Incorrect prefix in codes (%, %, %)', v_code1, v_code2, v_code3;
    END IF;
END $$;

-- ============================================================
-- Summary
-- ============================================================

RAISE NOTICE '========================================';
RAISE NOTICE 'All verification tests completed!';
RAISE NOTICE '========================================';
