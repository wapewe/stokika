-- Add application_code column to field_agents table
ALTER TABLE field_agents 
ADD COLUMN IF NOT EXISTS application_code VARCHAR(20) UNIQUE;

-- Add application_code column to supervisors table
ALTER TABLE supervisors 
ADD COLUMN IF NOT EXISTS application_code VARCHAR(20) UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_field_agents_application_code ON field_agents(application_code);
CREATE INDEX IF NOT EXISTS idx_supervisors_application_code ON supervisors(application_code);

-- Update stokika_kit_payments to use application_code instead of user_id
ALTER TABLE stokika_kit_payments 
ADD COLUMN IF NOT EXISTS application_code VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_kit_payments_application_code ON stokika_kit_payments(application_code);

-- Function to generate unique field agent code
CREATE OR REPLACE FUNCTION generate_field_agent_code()
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate code: SFA-YYYYMMDD-XXXX (e.g., SFA-20250115-0001)
        new_code := 'SFA-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
        
        -- Check if code exists
        SELECT EXISTS(SELECT 1 FROM field_agents WHERE application_code = new_code) INTO code_exists;
        
        -- Exit loop if code is unique
        EXIT WHEN NOT code_exists;
    END LOOP;
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Function to generate unique supervisor code
CREATE OR REPLACE FUNCTION generate_supervisor_code()
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate code: STS-YYYYMMDD-XXXX (e.g., STS-20250115-0001)
        new_code := 'STS-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
        
        -- Check if code exists
        SELECT EXISTS(SELECT 1 FROM supervisors WHERE application_code = new_code) INTO code_exists;
        
        -- Exit loop if code is unique
        EXIT WHEN NOT code_exists;
    END LOOP;
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON COLUMN field_agents.application_code IS 'Unique application code (SFA-YYYYMMDD-XXXX) generated on form submission. Becomes employment number when hired.';
COMMENT ON COLUMN supervisors.application_code IS 'Unique application code (STS-YYYYMMDD-XXXX) generated on form submission. Becomes employment number when hired.';
