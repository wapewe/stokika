-- Migration: Add id_number column to profiles table
-- Date: 2026-01-17
-- Purpose: Store 8-digit Kenyan government ID numbers for vendor identity verification and payment matching
-- Spec: vendor-id-manual-payment
-- Requirements: 6.1, 6.3, 6.5

-- Add id_number column with CHECK constraint for validation
ALTER TABLE profiles 
ADD COLUMN id_number TEXT 
CHECK (id_number ~ '^[0-9]{8}$');

-- Create unique index to prevent duplicate ID numbers (allows NULL values)
CREATE UNIQUE INDEX idx_profiles_id_number 
ON profiles(id_number) 
WHERE id_number IS NOT NULL;

-- Create lookup index for fast C2B payment matching
CREATE INDEX idx_profiles_id_number_lookup 
ON profiles(id_number);

-- Add column comment for documentation
COMMENT ON COLUMN profiles.id_number IS 
'Eight-digit Kenyan government ID number used for identity verification and payment matching. Must be exactly 8 numeric digits. Used as account_reference in manual paybill payments.';

-- Rollback instructions:
-- To rollback this migration, run:
-- DROP INDEX IF EXISTS idx_profiles_id_number_lookup;
-- DROP INDEX IF EXISTS idx_profiles_id_number;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS id_number;
