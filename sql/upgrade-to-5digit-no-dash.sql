-- Upgrade Application Code Format to 5-Digit No-Dash Format
-- New Format: SFA2025013000001 or STS2025013000001
-- Capacity: 100,000 codes per day

-- 1. Update column size
ALTER TABLE field_agents ALTER COLUMN application_code TYPE VARCHAR(20);
ALTER TABLE supervisors ALTER COLUMN application_code TYPE VARCHAR(20);
ALTER TABLE stokika_kit_payments ALTER COLUMN application_code TYPE VARCHAR(20);

-- 2. Drop old functions
DROP FUNCTION IF EXISTS generate_field_agent_code();
DROP FUNCTION IF EXISTS generate_supervisor_code();

-- 3. Create new Field Agent Code Generator (5 digits, no dash)
CREATE OR REPLACE FUNCTION generate_field_agent_code()
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        new_code := 'SFA' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');
        SELECT EXISTS(SELECT 1 FROM field_agents WHERE application_code = new_code) INTO code_exists;
        EXIT WHEN NOT code_exists;
    END LOOP;
    RETURN new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create new Supervisor Code Generator (5 digits, no dash)
CREATE OR REPLACE FUNCTION generate_supervisor_code()
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        new_code := 'STS' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');
        SELECT EXISTS(SELECT 1 FROM supervisors WHERE application_code = new_code) INTO code_exists;
        EXIT WHEN NOT code_exists;
    END LOOP;
    RETURN new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION generate_field_agent_code() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION generate_supervisor_code() TO anon, authenticated;

-- 6. Update comments
COMMENT ON COLUMN field_agents.application_code IS 'Unique code format: SFA2025013000001 (100,000 daily capacity)';
COMMENT ON COLUMN supervisors.application_code IS 'Unique code format: STS2025013000001 (100,000 daily capacity)';

-- 7. Test generation
DO $$
DECLARE
    test_code TEXT;
BEGIN
    test_code := generate_field_agent_code();
    RAISE NOTICE 'Sample Field Agent Code: %', test_code;
    
    test_code := generate_supervisor_code();
    RAISE NOTICE 'Sample Supervisor Code: %', test_code;
    
    RAISE NOTICE '✅ Upgraded to 5-digit no-dash format';
    RAISE NOTICE '📊 Capacity: 100,000 applications per day';
END $$;
