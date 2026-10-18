-- Add unique constraints and indexes to prevent duplicate registrations
-- This ensures database-level integrity even if application logic is bypassed

-- ============================================================================
-- 1. NATIONAL ID UNIQUENESS
-- ============================================================================

-- Add unique constraint to delivery_partners.id_number
ALTER TABLE delivery_partners 
DROP CONSTRAINT IF EXISTS delivery_partners_id_number_unique;

ALTER TABLE delivery_partners 
ADD CONSTRAINT delivery_partners_id_number_unique 
UNIQUE (id_number);

-- Add unique constraint to profiles.id_number (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_id_number_unique'
    ) THEN
        ALTER TABLE profiles 
        ADD CONSTRAINT profiles_id_number_unique 
        UNIQUE (id_number);
    END IF;
END $$;

-- Add unique constraint to vendors.id_number (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'vendors_id_number_unique'
    ) THEN
        ALTER TABLE vendors 
        ADD CONSTRAINT vendors_id_number_unique 
        UNIQUE (id_number);
    END IF;
END $$;

-- Add unique constraint to field_agents.id_number (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'field_agents_id_number_unique'
    ) THEN
        ALTER TABLE field_agents 
        ADD CONSTRAINT field_agents_id_number_unique 
        UNIQUE (id_number);
    END IF;
END $$;

-- Add unique constraint to supervisors.id_number (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'supervisors_id_number_unique'
    ) THEN
        ALTER TABLE supervisors 
        ADD CONSTRAINT supervisors_id_number_unique 
        UNIQUE (id_number);
    END IF;
END $$;

-- ============================================================================
-- 2. PHONE NUMBER UNIQUENESS
-- ============================================================================

-- Add unique constraint to delivery_partners.phone
ALTER TABLE delivery_partners 
DROP CONSTRAINT IF EXISTS delivery_partners_phone_unique;

ALTER TABLE delivery_partners 
ADD CONSTRAINT delivery_partners_phone_unique 
UNIQUE (phone);

-- Note: profiles table doesn't have a phone column, skipping

-- ============================================================================
-- 3. M-PESA CODE UNIQUENESS
-- ============================================================================

-- Prevent same M-Pesa code from being used multiple times
-- Add unique constraint to manual_verification_queue.mpesa_code for active records
CREATE UNIQUE INDEX IF NOT EXISTS manual_verification_mpesa_code_active_unique 
ON manual_verification_queue(mpesa_code) 
WHERE status IN ('PENDING', 'APPROVED');

-- Prevent same M-Pesa receipt from being used multiple times in C2B transactions
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'mpesa_c2b_transactions'
    ) THEN
        CREATE UNIQUE INDEX IF NOT EXISTS mpesa_c2b_receipt_unique 
        ON mpesa_c2b_transactions(mpesa_receipt_number) 
        WHERE mpesa_receipt_number IS NOT NULL;
        
        CREATE UNIQUE INDEX IF NOT EXISTS mpesa_c2b_trans_id_unique 
        ON mpesa_c2b_transactions(trans_id) 
        WHERE trans_id IS NOT NULL;
    END IF;
END $$;

-- ============================================================================
-- 4. APPLICATION CODE UNIQUENESS
-- ============================================================================

-- Ensure application codes are unique per table
CREATE UNIQUE INDEX IF NOT EXISTS delivery_partners_application_code_unique 
ON delivery_partners(application_code) 
WHERE application_code IS NOT NULL;

-- ============================================================================
-- 5. PAYMENT INTENT REFERENCE UNIQUENESS
-- ============================================================================

-- Prevent duplicate payment references
CREATE UNIQUE INDEX IF NOT EXISTS payment_intents_reference_unique 
ON payment_intents(payment_reference) 
WHERE payment_reference IS NOT NULL;

-- ============================================================================
-- 6. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON CONSTRAINT delivery_partners_id_number_unique ON delivery_partners IS 
'Prevents duplicate registrations with the same National ID';

COMMENT ON CONSTRAINT delivery_partners_phone_unique ON delivery_partners IS 
'Prevents duplicate registrations with the same phone number';

COMMENT ON INDEX manual_verification_mpesa_code_active_unique IS 
'Ensures each M-Pesa code can only be used once for active/approved verifications';

-- ============================================================================
-- 7. FUNCTION TO CHECK FOR DUPLICATES ACROSS ALL TABLES
-- ============================================================================

CREATE OR REPLACE FUNCTION check_duplicate_national_id(p_id_number TEXT)
RETURNS TABLE (
    found BOOLEAN,
    table_name TEXT,
    record_id UUID,
    created_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check delivery_partners
    RETURN QUERY
    SELECT true, 'delivery_partners'::TEXT, dp.id, dp.created_at
    FROM delivery_partners dp
    WHERE dp.id_number = p_id_number
    LIMIT 1;
    
    IF FOUND THEN RETURN; END IF;
    
    -- Check profiles
    RETURN QUERY
    SELECT true, 'profiles'::TEXT, p.id, p.created_at
    FROM profiles p
    WHERE p.id_number = p_id_number
    LIMIT 1;
    
    IF FOUND THEN RETURN; END IF;
    
    -- Check vendors
    RETURN QUERY
    SELECT true, 'vendors'::TEXT, v.id, v.created_at
    FROM vendors v
    WHERE v.id_number = p_id_number
    LIMIT 1;
    
    IF FOUND THEN RETURN; END IF;
    
    -- Check field_agents
    RETURN QUERY
    SELECT true, 'field_agents'::TEXT, fa.id, fa.created_at
    FROM field_agents fa
    WHERE fa.id_number = p_id_number
    LIMIT 1;
    
    IF FOUND THEN RETURN; END IF;
    
    -- Check supervisors
    RETURN QUERY
    SELECT true, 'supervisors'::TEXT, s.id, s.created_at
    FROM supervisors s
    WHERE s.id_number = p_id_number
    LIMIT 1;
    
    IF FOUND THEN RETURN; END IF;
    
    -- Not found
    RETURN QUERY
    SELECT false, NULL::TEXT, NULL::UUID, NULL::TIMESTAMPTZ;
END;
$$;

COMMENT ON FUNCTION check_duplicate_national_id IS 
'Checks if a national ID exists in any user table (delivery_partners, profiles, vendors, field_agents, supervisors)';

GRANT EXECUTE ON FUNCTION check_duplicate_national_id TO service_role;
GRANT EXECUTE ON FUNCTION check_duplicate_national_id TO authenticated;

-- ============================================================================
-- 8. FUNCTION TO CHECK DUPLICATE PHONE NUMBERS
-- ============================================================================

CREATE OR REPLACE FUNCTION check_duplicate_phone(p_phone TEXT)
RETURNS TABLE (
    found BOOLEAN,
    table_name TEXT,
    record_id UUID,
    name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check delivery_partners
    RETURN QUERY
    SELECT true, 'delivery_partners'::TEXT, dp.id, dp.full_name
    FROM delivery_partners dp
    WHERE dp.phone = p_phone
    LIMIT 1;
    
    IF FOUND THEN RETURN; END IF;
    
    -- Note: profiles table doesn't have phone column, skipped
    
    -- Not found
    RETURN QUERY
    SELECT false, NULL::TEXT, NULL::UUID, NULL::TEXT;
END;
$$;

COMMENT ON FUNCTION check_duplicate_phone IS 
'Checks if a phone number exists in any user table';

GRANT EXECUTE ON FUNCTION check_duplicate_phone TO service_role;
GRANT EXECUTE ON FUNCTION check_duplicate_phone TO authenticated;

-- ============================================================================
-- 9. VERIFICATION SCRIPT
-- ============================================================================

-- Query to verify unique constraints are in place
DO $$
DECLARE
    v_constraints_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_constraints_count
    FROM pg_constraint
    WHERE conname IN (
        'delivery_partners_id_number_unique',
        'delivery_partners_phone_unique',
        'profiles_id_number_unique',
        'vendors_id_number_unique',
        'field_agents_id_number_unique',
        'supervisors_id_number_unique'
    );
    
    RAISE NOTICE 'Unique constraints created: %', v_constraints_count;
    
    IF v_constraints_count < 2 THEN
        RAISE WARNING 'Some unique constraints may not have been created. Check table structure.';
    END IF;
END $$;
