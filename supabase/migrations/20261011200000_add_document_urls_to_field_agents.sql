-- Add document URL columns to field_agents table
-- Migration: Add storage URLs for uploaded documents

ALTER TABLE field_agents
ADD COLUMN IF NOT EXISTS id_front_url TEXT,
ADD COLUMN IF NOT EXISTS id_back_url TEXT,
ADD COLUMN IF NOT EXISTS cv_url TEXT,
ADD COLUMN IF NOT EXISTS chief_letter_url TEXT,
ADD COLUMN IF NOT EXISTS passport_photo_url TEXT,
ADD COLUMN IF NOT EXISTS good_conduct_url TEXT;

-- Add comments
COMMENT ON COLUMN field_agents.id_front_url IS 'Supabase Storage URL for National ID front image';
COMMENT ON COLUMN field_agents.id_back_url IS 'Supabase Storage URL for National ID back image';
COMMENT ON COLUMN field_agents.cv_url IS 'Supabase Storage URL for CV document';
COMMENT ON COLUMN field_agents.chief_letter_url IS 'Supabase Storage URL for Chief Letter';
COMMENT ON COLUMN field_agents.passport_photo_url IS 'Supabase Storage URL for passport photo';
COMMENT ON COLUMN field_agents.good_conduct_url IS 'Supabase Storage URL for Certificate of Good Conduct (optional)';

-- Create storage bucket for application documents if it doesn't exist
-- Note: This needs to be run in Supabase Dashboard > Storage
-- Bucket name: application-documents
-- Public: false (documents should be private)
-- Allowed MIME types: image/*, application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document
