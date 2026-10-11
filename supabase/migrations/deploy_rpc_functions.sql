-- ============================================================
-- Deploy RPC Functions to Production
-- Task: 13.2 - Deploy RPC functions to Supabase
-- Date: 2025-01-25
-- ============================================================

-- ============================================================
-- Function 1: generate_field_agent_code
-- Purpose: Generate unique application code for field agent applicants
-- Format: SFA + first_4_id_digits + 4_random_digits
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
    -- STEP 1: Validate ID Number Format
    IF id_number IS NULL OR id_number = '' THEN
        RETURN 'ERROR: ID number is required';
    END IF;
    
    IF LENGTH(id_number) <> 8 THEN
        RETURN 'ERROR: ID number must be exactly 8 digits';
    END IF;
    
    IF id_number !~ '^[0-9]{8}$' THEN
        RETURN 'ERROR: ID number must contain only digits';
    END IF;
    
    -- STEP 2: Check if ID Number Already Exists
    SELECT EXISTS (
        SELECT 1 
        FROM field_agents 
        WHERE field_agents.id_number = generate_field_agent_code.id_number
    ) INTO v_exists;
    
    IF v_exists THEN
        RETURN 'ERROR: This ID number has already been used for an application';
    END IF;
    
    -- STEP 3: Extract First 4 Digits from ID Number
    v_id_prefix := SUBSTRING(id_number FROM 1 FOR 4);
    
    -- STEP 4: Generate Unique Application Code (with retry logic)
    WHILE v_attempt < v_max_attempts LOOP
        v_attempt := v_attempt + 1;
        
        v_random_suffix := LPAD(
            FLOOR(RANDOM() * 10000)::TEXT,
            4,
            '0'
        );
        
        v_application_code := 'SFA' || v_id_prefix || v_random_suffix;
        
        SELECT EXISTS (
            SELECT 1 
            FROM field_agents 
            WHERE application_code = v_application_code
        ) INTO v_exists;
        
        IF NOT v_exists THEN
            RETURN v_application_code;
        END IF;
    END LOOP;
    
    -- STEP 5: If All Attempts Exhausted, Return Error
    RETURN 'ERROR: Unable to generate unique code, please try again';
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'ERROR: ' || SQLERRM;
END;
$$;

-- Grant Execute Permissions for Field Agent Function
GRANT EXECUTE ON FUNCTION generate_field_agent_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_field_agent_code(TEXT) TO anon;

COMMENT ON FUNCTION generate_field_agent_code(TEXT) IS 
'Generates unique application code for field agent applicants.
Format: SFA + first 4 digits of ID + 4 random digits.
Validates ID format (8 digits, numeric only).
Enforces ID uniqueness (one application per person).
Returns application code or error message with ERROR: prefix.';

-- ============================================================
-- Function 2: generate_supervisor_code
-- Purpose: Generate unique application code for supervisor applicants
-- Format: SFS + first_4_id_digits + 4_random_digits
-- ============================================================

CREATE OR REPLACE FUNCTION generate_supervisor_code(id_number TEXT)
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
    -- STEP 1: Validate ID Number Format
    IF id_number IS NULL OR id_number = '' THEN
        RETURN 'ERROR: ID number is required';
    END IF;
    
    IF LENGTH(id_number) <> 8 THEN
        RETURN 'ERROR: ID number must be exactly 8 digits';
    END IF;
    
    IF id_number !~ '^[0-9]{8}$' THEN
        RETURN 'ERROR: ID number must contain only digits';
    END IF;
    
    -- STEP 2: Check if ID Number Already Exists
    SELECT EXISTS (
        SELECT 1 
        FROM supervisors 
        WHERE supervisors.id_number = generate_supervisor_code.id_number
    ) INTO v_exists;
    
    IF v_exists THEN
        RETURN 'ERROR: This ID number has already been used for an application';
    END IF;
    
    -- STEP 3: Extract First 4 Digits from ID Number
    v_id_prefix := SUBSTRING(id_number FROM 1 FOR 4);
    
    -- STEP 4: Generate Unique Application Code (with retry logic)
    WHILE v_attempt < v_max_attempts LOOP
        v_attempt := v_attempt + 1;
        
        v_random_suffix := LPAD(
            FLOOR(RANDOM() * 10000)::TEXT,
            4,
            '0'
        );
        
        v_application_code := 'SFS' || v_id_prefix || v_random_suffix;
        
        SELECT EXISTS (
            SELECT 1 
            FROM supervisors 
            WHERE application_code = v_application_code
        ) INTO v_exists;
        
        IF NOT v_exists THEN
            RETURN v_application_code;
        END IF;
    END LOOP;
    
    -- STEP 5: If All Attempts Exhausted, Return Error
    RETURN 'ERROR: Unable to generate unique code, please try again';
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'ERROR: ' || SQLERRM;
END;
$$;

-- Grant Execute Permissions for Supervisor Function
GRANT EXECUTE ON FUNCTION generate_supervisor_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_supervisor_code(TEXT) TO anon;

COMMENT ON FUNCTION generate_supervisor_code(TEXT) IS 
'Generates unique application code for supervisor applicants.
Format: SFS + first 4 digits of ID + 4 random digits.
Validates ID format (8 digits, numeric only).
Enforces ID uniqueness (one application per person).
Returns application code or error message with ERROR: prefix.';

-- ============================================================
-- Deployment Complete
-- ============================================================
