-- Migration: Create generate_field_agent_code RPC function
-- Description: Implements ID-based application code generation for field agents
-- Format: SFA + first_4_id_digits + 4_random_digits
-- Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 5.1, 5.2, 5.3, 5.4, 5.5, 10.1, 10.7, 10.8
-- Date: 2026-01-25

-- ============================================================
-- Function: generate_field_agent_code
-- Purpose: Generate unique application code for field agent applicants
-- ============================================================

CREATE OR REPLACE FUNCTION generate_field_agent_code(id_number TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id_prefix TEXT;
    v_random_suffix TEXT;
    v_application_code TEXT;
    v_attempt INTEGER := 0;
    v_max_attempts CONSTANT INTEGER := 10;
    v_exists BOOLEAN;
BEGIN
    -- ============================================================
    -- STEP 1: Validate ID Number Format
    -- ============================================================
    
    -- Check if ID number is null or empty
    IF id_number IS NULL OR id_number = '' THEN
        RETURN 'ERROR: ID number is required';
    END IF;
    
    -- Check if ID number is exactly 8 digits
    IF LENGTH(id_number) <> 8 THEN
        RETURN 'ERROR: ID number must be exactly 8 digits';
    END IF;
    
    -- Check if ID number contains only digits
    IF id_number !~ '^[0-9]{8}$' THEN
        RETURN 'ERROR: ID number must contain only digits';
    END IF;
    
    -- ============================================================
    -- STEP 2: Check if ID Number Already Exists
    -- ============================================================
    
    SELECT EXISTS (
        SELECT 1 
        FROM field_agents 
        WHERE field_agents.id_number = generate_field_agent_code.id_number
    ) INTO v_exists;
    
    IF v_exists THEN
        RETURN 'ERROR: This ID number has already been used for an application';
    END IF;
    
    -- ============================================================
    -- STEP 3: Extract First 4 Digits from ID Number
    -- ============================================================
    
    v_id_prefix := SUBSTRING(id_number FROM 1 FOR 4);
    
    -- ============================================================
    -- STEP 4: Generate Unique Application Code (with retry logic)
    -- ============================================================
    
    WHILE v_attempt < v_max_attempts LOOP
        v_attempt := v_attempt + 1;
        
        -- Generate 4 random digits (0000-9999)
        v_random_suffix := LPAD(
            FLOOR(RANDOM() * 10000)::TEXT,
            4,
            '0'
        );
        
        -- Construct application code: SFA + first_4_id_digits + 4_random_digits
        v_application_code := 'SFA' || v_id_prefix || v_random_suffix;
        
        -- Check if this code already exists
        SELECT EXISTS (
            SELECT 1 
            FROM field_agents 
            WHERE application_code = v_application_code
        ) INTO v_exists;
        
        -- If code is unique, return it
        IF NOT v_exists THEN
            RETURN v_application_code;
        END IF;
        
        -- Otherwise, loop continues to try another random suffix
    END LOOP;
    
    -- ============================================================
    -- STEP 5: If All Attempts Exhausted, Return Error
    -- ============================================================
    
    RETURN 'ERROR: Unable to generate unique code, please try again';
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'ERROR: ' || SQLERRM;
END;
$$;

-- ============================================================
-- Grant Execute Permission
-- ============================================================

-- Grant execute permission to authenticated users (applicants)
GRANT EXECUTE ON FUNCTION generate_field_agent_code(TEXT) TO authenticated;

-- Grant execute permission to anon users (for public application form)
GRANT EXECUTE ON FUNCTION generate_field_agent_code(TEXT) TO anon;

-- ============================================================
-- Add Comment for Documentation
-- ============================================================

COMMENT ON FUNCTION generate_field_agent_code(TEXT) IS 
'Generates unique application code for field agent applicants.
Format: SFA + first 4 digits of ID + 4 random digits.
Validates ID format (8 digits, numeric only).
Enforces ID uniqueness (one application per person).
Returns application code or error message with ERROR: prefix.
Example: generate_field_agent_code(''12345678'') returns ''SFA12341234''';
