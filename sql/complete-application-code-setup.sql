-- Complete Application Code System Setup
-- Run this in Supabase SQL Editor

-- 1. Add application_code columns
ALTER TABLE field_agents ADD COLUMN IF NOT EXISTS application_code VARCHAR(20) UNIQUE;
ALTER TABLE supervisors ADD COLUMN IF NOT EXISTS application_code VARCHAR(20) UNIQUE;
ALTER TABLE stokika_kit_payments ADD COLUMN IF NOT EXISTS application_code VARCHAR(20);

-- 2. Add missing supervisor columns
ALTER TABLE supervisors ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE supervisors ADD COLUMN IF NOT EXISTS education_level VARCHAR(100);
ALTER TABLE supervisors ADD COLUMN IF NOT EXISTS institution VARCHAR(255);
ALTER TABLE supervisors ADD COLUMN IF NOT EXISTS course VARCHAR(255);
ALTER TABLE supervisors ADD COLUMN IF NOT EXISTS experience_areas TEXT[];
ALTER TABLE supervisors ADD COLUMN IF NOT EXISTS years_experience VARCHAR(50);
ALTER TABLE supervisors ADD COLUMN IF NOT EXISTS experience_summary TEXT;
ALTER TABLE supervisors ADD COLUMN IF NOT EXISTS tech_skills TEXT[];
ALTER TABLE supervisors ADD COLUMN IF NOT EXISTS tech_confidence VARCHAR(50);
ALTER TABLE supervisors ADD COLUMN IF NOT EXISTS start_date VARCHAR(50);
ALTER TABLE supervisors ADD COLUMN IF NOT EXISTS kra_pin VARCHAR(50);
ALTER TABLE supervisors ADD COLUMN IF NOT EXISTS sub_county VARCHAR(100);
ALTER TABLE supervisors ADD COLUMN IF NOT EXISTS town VARCHAR(100);
ALTER TABLE supervisors ADD COLUMN IF NOT EXISTS center VARCHAR(100);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_field_agents_application_code ON field_agents(application_code);
CREATE INDEX IF NOT EXISTS idx_supervisors_application_code ON supervisors(application_code);
CREATE INDEX IF NOT EXISTS idx_kit_payments_application_code ON stokika_kit_payments(application_code);

-- 4. RPC Function: Generate Field Agent Code
CREATE OR REPLACE FUNCTION generate_field_agent_code()
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        new_code := 'SFA-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
        SELECT EXISTS(SELECT 1 FROM field_agents WHERE application_code = new_code) INTO code_exists;
        EXIT WHEN NOT code_exists;
    END LOOP;
    RETURN new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC Function: Generate Supervisor Code
CREATE OR REPLACE FUNCTION generate_supervisor_code()
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        new_code := 'STS-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
        SELECT EXISTS(SELECT 1 FROM supervisors WHERE application_code = new_code) INTO code_exists;
        EXIT WHEN NOT code_exists;
    END LOOP;
    RETURN new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_field_agent_code() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION generate_supervisor_code() TO anon, authenticated;

-- 7. Create storage buckets (if not exists)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('agent-documents', 'agent-documents', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('supervisor-documents', 'supervisor-documents', false)
ON CONFLICT (id) DO NOTHING;

-- 8. Storage policies for agent documents
CREATE POLICY "Allow public upload to agent-documents"
ON storage.objects FOR INSERT TO anon
WITH CHECK (bucket_id = 'agent-documents');

CREATE POLICY "Allow authenticated read agent-documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'agent-documents');

-- 9. Storage policies for supervisor documents
CREATE POLICY "Allow public upload to supervisor-documents"
ON storage.objects FOR INSERT TO anon
WITH CHECK (bucket_id = 'supervisor-documents');

CREATE POLICY "Allow authenticated read supervisor-documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'supervisor-documents');

-- 10. Comments
COMMENT ON COLUMN field_agents.application_code IS 'Unique code (SFA-YYYYMMDD-XXXX) for payment tracking before account creation. Becomes agent_number after hiring.';
COMMENT ON COLUMN supervisors.application_code IS 'Unique code (STS-YYYYMMDD-XXXX) for payment tracking before account creation. Becomes supervisor_number after hiring.';
COMMENT ON FUNCTION generate_field_agent_code() IS 'Generates unique application code for field agents with format SFA-YYYYMMDD-XXXX';
COMMENT ON FUNCTION generate_supervisor_code() IS 'Generates unique application code for supervisors with format STS-YYYYMMDD-XXXX';
