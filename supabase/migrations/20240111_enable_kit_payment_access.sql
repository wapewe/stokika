-- Migration: Enable Kit Payment Access
-- Created: 2024-01-11
-- Purpose: Allow edge functions to access tables for kit payment verification

-- Enable RLS on tables (if not already enabled)
ALTER TABLE field_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisors ENABLE ROW LEVEL SECURITY;
ALTER TABLE stokika_kit_payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow anonymous read by application_code" ON field_agents;
DROP POLICY IF EXISTS "Allow anonymous read by application_code" ON supervisors;
DROP POLICY IF EXISTS "Allow anonymous read kit payments by application_code" ON stokika_kit_payments;
DROP POLICY IF EXISTS "Allow anonymous insert kit payments" ON stokika_kit_payments;
DROP POLICY IF EXISTS "Service role full access field_agents" ON field_agents;
DROP POLICY IF EXISTS "Service role full access supervisors" ON supervisors;
DROP POLICY IF EXISTS "Service role full access kit_payments" ON stokika_kit_payments;

-- Grant service role full access (for edge functions)
CREATE POLICY "Service role full access field_agents"
ON field_agents
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role full access supervisors"
ON supervisors
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role full access kit_payments"
ON stokika_kit_payments
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow anonymous users to insert new kit payments
-- This is needed for the payment submission from the frontend
CREATE POLICY "Allow anonymous insert kit payments"
ON stokika_kit_payments
FOR INSERT
TO anon
WITH CHECK (
  application_code IS NOT NULL
  AND kit_amount > 0
  AND payment_method IN ('mpesa-stk', 'manual')
);

-- Allow anonymous users to read their own payment status
CREATE POLICY "Allow anonymous read own kit payments"
ON stokika_kit_payments
FOR SELECT
TO anon
USING (application_code IS NOT NULL);

-- Note: field_agents and supervisors do NOT need anonymous access
-- The edge functions (verify-application-code and get-kit-payment-status)
-- will handle lookups using the service role key

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_field_agents_application_code 
ON field_agents(application_code) 
WHERE application_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_supervisors_application_code 
ON supervisors(application_code) 
WHERE application_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_kit_payments_application_code 
ON stokika_kit_payments(application_code, created_at DESC);

-- Add comments for documentation
COMMENT ON POLICY "Service role full access field_agents" ON field_agents IS 
'Allows edge functions to access field_agents table using service role key';

COMMENT ON POLICY "Service role full access supervisors" ON supervisors IS 
'Allows edge functions to access supervisors table using service role key';

COMMENT ON POLICY "Service role full access kit_payments" ON stokika_kit_payments IS 
'Allows edge functions to manage kit payments using service role key';

COMMENT ON POLICY "Allow anonymous insert kit payments" ON stokika_kit_payments IS 
'Allows unauthenticated users to submit kit payments from the frontend';

COMMENT ON POLICY "Allow anonymous read own kit payments" ON stokika_kit_payments IS 
'Allows unauthenticated users to check their payment status';
