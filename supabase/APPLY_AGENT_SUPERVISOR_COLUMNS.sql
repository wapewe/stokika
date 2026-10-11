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
ADD COLUMN IF NOT EXISTS phone TEXT CHECK (phone ~ ''^254[0-9]{9}$''),
ADD COLUMN IF NOT EXISTS email TEXT CHECK (email ~ ''^[^@]+@[^@]+\.[^@]+$'');

-- Experience details
ALTER TABLE field_agents
ADD COLUMN IF NOT EXISTS field_experience_types TEXT[], -- Array of experience types
ADD COLUMN IF NOT EXISTS other_experience TEXT,
ADD COLUMN IF NOT EXISTS training_no_explanation TEXT;

-- Add comments
COMMENT ON COLUMN field_agents.first_name IS ''First name from onboarding form'';
COMMENT ON COLUMN field_agents.last_name IS ''Last name from onboarding form'';
COMMENT ON COLUMN field_agents.phone IS ''Phone number in 254XXXXXXXXX format'';
COMMENT ON COLUMN field_agents.email IS ''Email address'';
COMMENT ON COLUMN field_agents.field_experience_types IS ''Array of previous field experience types (sales-agent, community-mobilizer, loan-officer, fmcg-distribution, market-research, other)'';
COMMENT ON COLUMN field_agents.other_experience IS ''Other field experience if selected'';
COMMENT ON COLUMN field_agents.training_no_explanation IS ''Explanation if training is declined'';

-- ============================================================================
-- Add Missing Columns to supervisors Table
-- ============================================================================

-- Basic personal information (split from fullName in form)
ALTER TABLE supervisors
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT CHECK (phone ~ ''^254[0-9]{9}$''),
ADD COLUMN IF NOT EXISTS email TEXT CHECK (email ~ ''^[^@]+@[^@]+\.[^@]+$'');

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

-- Add comments
COMMENT ON COLUMN supervisors.first_name IS ''First name from onboarding form'';
COMMENT ON COLUMN supervisors.last_name IS ''Last name from onboarding form'';
COMMENT ON COLUMN supervisors.phone IS ''Phone number in 254XXXXXXXXX format'';
COMMENT ON COLUMN supervisors.email IS ''Email address'';
COMMENT ON COLUMN supervisors.education IS ''Highest education level (diploma, degree, hnd, other)'';
COMMENT ON COLUMN supervisors.institution IS ''Educational institution attended'';
COMMENT ON COLUMN supervisors.course IS ''Course or field of study'';
COMMENT ON COLUMN supervisors.experience IS ''Array of relevant experience types'';
COMMENT ON COLUMN supervisors.years_experience IS ''Number of years of relevant experience'';
COMMENT ON COLUMN supervisors.experience_summary IS ''Summary of work experience'';
COMMENT ON COLUMN supervisors.tech_skills IS ''Array of technology skills'';
COMMENT ON COLUMN supervisors.tech_confidence IS ''Technology confidence level (beginner, intermediate, advanced)'';

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

-- ============================================================================
-- Update Constraints to Make Required Fields NOT NULL (After Data Migration)
-- ============================================================================

-- Note: These ALTER statements should be run AFTER existing data is populated
-- Commented out for initial migration - uncomment after data cleanup

-- ALTER TABLE field_agents 
-- ALTER COLUMN first_name SET NOT NULL,
-- ALTER COLUMN last_name SET NOT NULL,
-- ALTER COLUMN phone SET NOT NULL,
-- ALTER COLUMN email SET NOT NULL;

-- ALTER TABLE supervisors
-- ALTER COLUMN first_name SET NOT NULL,
-- ALTER COLUMN last_name SET NOT NULL,
-- ALTER COLUMN phone SET NOT NULL,
-- ALTER COLUMN email SET NOT NULL;

-- ============================================================================
-- Success Message
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE ''✅ Successfully added missing columns to field_agents and supervisors tables'';
    RAISE NOTICE ''📋 New columns added to field_agents: first_name, last_name, phone, email, field_experience_types, other_experience, training_no_explanation'';
    RAISE NOTICE ''📋 New columns added to supervisors: first_name, last_name, phone, email, education, institution, course, experience, years_experience, experience_summary, tech_skills, tech_confidence'';
    RAISE NOTICE ''⚠️  Remember to set NOT NULL constraints after migrating existing data'';
END $$;