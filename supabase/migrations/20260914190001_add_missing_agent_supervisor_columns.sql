-- Migration: Add Missing Columns to Field Agents and Supervisors Tables
-- Description: Adds columns required by field-agent.html and supervisor-onboarding.html forms
-- Date: 2025-01-16
-- Migration Number: 20260116000001

-- ============================================================================
-- Add Missing Columns to field_agents Table
-- ============================================================================

-- Basic personal information (split from fullName in form)
ALTER TABLE field_agents 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT CHECK (phone ~ '^254[0-9]{9}$'),
ADD COLUMN IF NOT EXISTS email TEXT CHECK (email ~ '^[^@]+@[^@]+\.[^@]+$');

-- Experience details
ALTER TABLE field_agents
ADD COLUMN IF NOT EXISTS field_experience_types TEXT[], -- Array of experience types
ADD COLUMN IF NOT EXISTS other_experience TEXT,
ADD COLUMN IF NOT EXISTS training_no_explanation TEXT;

-- Add comments
COMMENT ON COLUMN field_agents.first_name IS 'First name from onboarding form';
COMMENT ON COLUMN field_agents.last_name IS 'Last name from onboarding form';
COMMENT ON COLUMN field_agents.phone IS 'Phone number in 254XXXXXXXXX format';
COMMENT ON COLUMN field_agents.email IS 'Email address';
COMMENT ON COLUMN field_agents.field_experience_types IS 'Array of previous field experience types (sales-agent, community-mobilizer, loan-officer, fmcg-distribution, market-research, other)';
COMMENT ON COLUMN field_agents.other_experience IS 'Other field experience if selected';
COMMENT ON COLUMN field_agents.training_no_explanation IS 'Explanation if training is declined';

-- ============================================================================
-- Add Missing Columns to supervisors Table
-- ============================================================================

-- Basic personal information (split from fullName in form)
ALTER TABLE supervisors
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT CHECK (phone ~ '^254[0-9]{9}$'),
ADD COLUMN IF NOT EXISTS email TEXT CHECK (email ~ '^[^@]+@[^@]+\.[^@]+$');

-- Education information
ALTER TABLE supervisors
ADD COLUMN IF NOT EXISTS education TEXT, -- diploma, degree, hnd, other
ADD COLUMN IF NOT EXISTS institution TEXT,
ADD COLUMN IF NOT EXISTS course TEXT;

-- Experience information
ALTER TABLE supervisors
ADD COLUMN IF NOT EXISTS experience TEXT[], -- Array of experience types
ADD COLUMN IF NOT EXISTS years_experience TEXT, -- <1, 1-2, 2-3, 3-5, 5+
ADD COLUMN IF NOT EXISTS experience_summary TEXT;

-- Technology skills
ALTER TABLE supervisors
ADD COLUMN IF NOT EXISTS tech_skills TEXT[], -- Array of tech skills
ADD COLUMN IF NOT EXISTS tech_confidence TEXT; -- beginner, intermediate, advanced

-- KRA PIN (if missing)
ALTER TABLE supervisors
ADD COLUMN IF NOT EXISTS kra_pin TEXT;

-- Add comments
COMMENT ON COLUMN supervisors.first_name IS 'First name from onboarding form';
COMMENT ON COLUMN supervisors.last_name IS 'Last name from onboarding form';
COMMENT ON COLUMN supervisors.phone IS 'Phone number in 254XXXXXXXXX format';
COMMENT ON COLUMN supervisors.email IS 'Email address';
COMMENT ON COLUMN supervisors.education IS 'Highest education level (diploma, degree, hnd, other)';
COMMENT ON COLUMN supervisors.institution IS 'Educational institution attended';
COMMENT ON COLUMN supervisors.course IS 'Course or field of study';
COMMENT ON COLUMN supervisors.experience IS 'Array of relevant experience types';
COMMENT ON COLUMN supervisors.years_experience IS 'Number of years of relevant experience';
COMMENT ON COLUMN supervisors.experience_summary IS 'Summary of work experience';
COMMENT ON COLUMN supervisors.tech_skills IS 'Array of technology skills';
COMMENT ON COLUMN supervisors.tech_confidence IS 'Technology confidence level (beginner, intermediate, advanced)';
COMMENT ON COLUMN supervisors.kra_pin IS 'KRA PIN number for tax purposes';

-- ============================================================================
-- Create Indexes for New Columns
-- ============================================================================

-- Field agents indexes
CREATE INDEX IF NOT EXISTS idx_field_agents_email ON field_agents(email);
CREATE INDEX IF NOT EXISTS idx_field_agents_phone ON field_agents(phone);
CREATE INDEX IF NOT EXISTS idx_field_agents_name ON field_agents(first_name, last_name);

-- Supervisors indexes
CREATE INDEX IF NOT EXISTS idx_supervisors_email ON supervisors(email);
CREATE INDEX IF NOT EXISTS idx_supervisors_phone ON supervisors(phone);
CREATE INDEX IF NOT EXISTS idx_supervisors_name ON supervisors(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_supervisors_education ON supervisors(education);
CREATE INDEX IF NOT EXISTS idx_supervisors_kra_pin ON supervisors(kra_pin);

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
DECLARE
    field_agent_cols INTEGER;
    supervisor_cols INTEGER;
BEGIN
    -- Count new columns in field_agents
    SELECT COUNT(*) INTO field_agent_cols
    FROM information_schema.columns
    WHERE table_name = 'field_agents'
    AND column_name IN ('first_name', 'last_name', 'phone', 'email', 'field_experience_types', 'other_experience', 'training_no_explanation');
    
    -- Count new columns in supervisors
    SELECT COUNT(*) INTO supervisor_cols
    FROM information_schema.columns
    WHERE table_name = 'supervisors'
    AND column_name IN ('first_name', 'last_name', 'phone', 'email', 'education', 'institution', 'course', 'experience', 'years_experience', 'experience_summary', 'tech_skills', 'tech_confidence', 'kra_pin');
    
    RAISE NOTICE '✅ Migration Complete!';
    RAISE NOTICE '   field_agents: % new columns added', field_agent_cols;
    RAISE NOTICE '   supervisors: % new columns added', supervisor_cols;
    RAISE NOTICE '   Expected: field_agents=7, supervisors=13';
    
    IF field_agent_cols = 7 AND supervisor_cols = 13 THEN
        RAISE NOTICE '🎉 All columns successfully created!';
    ELSE
        RAISE WARNING '⚠️  Some columns may be missing. Please verify manually.';
    END IF;
END $$;