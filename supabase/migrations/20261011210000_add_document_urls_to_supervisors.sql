-- Migration: Add document URL columns to supervisors table
-- Description: Adds columns to store Supabase Storage URLs for supervisor application documents
-- Date: 2026-10-11

-- Add document URL columns to supervisors table
ALTER TABLE supervisors
ADD COLUMN IF NOT EXISTS passport_photo_url TEXT,
ADD COLUMN IF NOT EXISTS id_front_url TEXT,
ADD COLUMN IF NOT EXISTS id_back_url TEXT,
ADD COLUMN IF NOT EXISTS cv_url TEXT,
ADD COLUMN IF NOT EXISTS good_conduct_url TEXT;

-- Add comments for documentation
COMMENT ON COLUMN supervisors.passport_photo_url IS 'Supabase Storage URL for passport photo';
COMMENT ON COLUMN supervisors.id_front_url IS 'Supabase Storage URL for National ID front';
COMMENT ON COLUMN supervisors.id_back_url IS 'Supabase Storage URL for National ID back';
COMMENT ON COLUMN supervisors.cv_url IS 'Supabase Storage URL for CV/Resume';
COMMENT ON COLUMN supervisors.good_conduct_url IS 'Supabase Storage URL for Certificate of Good Conduct (optional)';
