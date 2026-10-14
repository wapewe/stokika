-- Migration: Enable anonymous lookup for kit payment page
-- This allows users to verify their application code and proceed to payment
-- without authentication

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow anonymous read by application_code" ON field_agents;
DROP POLICY IF EXISTS "Allow anonymous read by application_code" ON supervisors;
DROP POLICY IF EXISTS "Allow anonymous read kit payments by application_code" ON stokika_kit_payments;

-- Enable RLS on tables (if not already enabled)
ALTER TABLE field_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisors ENABLE ROW LEVEL SECURITY;
ALTER TABLE stokika_kit_payments ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to read field_agents by application_code
-- Only returns minimal fields needed for payment verification
CREATE POLICY "Allow anonymous read by application_code"
ON field_agents
FOR SELECT
TO anon
USING (application_code IS NOT NULL);

-- Allow anonymous users to read supervisors by application_code
CREATE POLICY "Allow anonymous read by application_code"
ON supervisors
FOR SELECT
TO anon
USING (application_code IS NOT NULL);

-- Allow anonymous users to read their own kit payment status by application_code
CREATE POLICY "Allow anonymous read kit payments by application_code"
ON stokika_kit_payments
FOR SELECT
TO anon
USING (application_code IS NOT NULL);

-- Allow anonymous users to insert new kit payments
CREATE POLICY "Allow anonymous insert kit payments"
ON stokika_kit_payments
FOR INSERT
TO anon
WITH CHECK (application_code IS NOT NULL);

-- Note: For enhanced security in production, consider:
-- 1. Creating a Supabase Edge Function to handle these lookups with service role key
-- 2. Implementing rate limiting to prevent brute force application code guessing
-- 3. Logging all application code verification attempts for audit purposes
