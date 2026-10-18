-- Grant full table access to service_role on kit tables
-- Fixes 42501 permission denied errors in mpesa-stk-push edge function
GRANT ALL ON stokika_kit_payments TO service_role;
GRANT ALL ON stokika_kit_config TO service_role;

-- Ensure RLS is enabled (already is, but explicit here)
ALTER TABLE stokika_kit_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stokika_kit_config ENABLE ROW LEVEL SECURITY;

-- Create service_role policies that bypass all checks
DROP POLICY IF EXISTS stokika_kit_payments_service_role_all ON stokika_kit_payments;
CREATE POLICY stokika_kit_payments_service_role_all ON stokika_kit_payments
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS stokika_kit_config_service_role_all ON stokika_kit_config;
CREATE POLICY stokika_kit_config_service_role_all ON stokika_kit_config
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

COMMENT ON POLICY stokika_kit_payments_service_role_all ON stokika_kit_payments IS 
'Allow Edge Functions using service_role to manage kit payment records';

COMMENT ON POLICY stokika_kit_config_service_role_all ON stokika_kit_config IS 
'Allow Edge Functions using service_role to read kit configuration';
