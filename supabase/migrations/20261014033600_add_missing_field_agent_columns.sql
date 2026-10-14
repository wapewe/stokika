-- Migration: Add missing columns to field_agents table
-- Fixes PGRST204 errors caused by columns present in form but missing in schema

ALTER TABLE field_agents
    -- Personal identity columns (name, phone, email stored on record directly)
    ADD COLUMN IF NOT EXISTS first_name TEXT,
    ADD COLUMN IF NOT EXISTS last_name TEXT,
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS email TEXT,

    -- Experience details
    ADD COLUMN IF NOT EXISTS experience_other TEXT,

    -- Code of conduct explanation
    ADD COLUMN IF NOT EXISTS code_of_conduct_explanation TEXT,

    -- Document URL columns (uploaded to Supabase Storage)
    ADD COLUMN IF NOT EXISTS id_front_url TEXT,
    ADD COLUMN IF NOT EXISTS id_back_url TEXT,
    ADD COLUMN IF NOT EXISTS cv_url TEXT,
    ADD COLUMN IF NOT EXISTS chief_letter_url TEXT,
    ADD COLUMN IF NOT EXISTS passport_photo_url TEXT,
    ADD COLUMN IF NOT EXISTS good_conduct_url TEXT;

COMMENT ON COLUMN field_agents.first_name IS 'First name extracted from full name at submission';
COMMENT ON COLUMN field_agents.last_name IS 'Last name extracted from full name at submission';
COMMENT ON COLUMN field_agents.phone IS 'Agent phone number in 254XXXXXXXXX format';
COMMENT ON COLUMN field_agents.email IS 'Agent email address';
COMMENT ON COLUMN field_agents.experience_other IS 'Description of other field experience types';
COMMENT ON COLUMN field_agents.code_of_conduct_explanation IS 'Explanation if agent cannot comply with code of conduct';
COMMENT ON COLUMN field_agents.id_front_url IS 'Public URL of uploaded national ID front photo';
COMMENT ON COLUMN field_agents.id_back_url IS 'Public URL of uploaded national ID back photo';
COMMENT ON COLUMN field_agents.cv_url IS 'Public URL of uploaded CV/resume';
COMMENT ON COLUMN field_agents.chief_letter_url IS 'Public URL of uploaded chief/village elder letter';
COMMENT ON COLUMN field_agents.passport_photo_url IS 'Public URL of uploaded passport photo';
COMMENT ON COLUMN field_agents.good_conduct_url IS 'Public URL of uploaded certificate of good conduct';
