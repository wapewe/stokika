-- Fix service_role permissions for Edge Functions
-- Edge Functions need to access these tables using service_role key

-- Grant full access to service_role on all payment-related tables that exist
GRANT ALL ON payment_timeout_config TO service_role;
GRANT ALL ON rate_limits TO service_role;
GRANT ALL ON payment_transactions TO service_role;
GRANT ALL ON payment_intents TO service_role;
GRANT ALL ON payment_notifications TO service_role;
GRANT ALL ON payment_metrics TO service_role;

-- Grant read access to profiles and vendor tables for validation
GRANT SELECT, INSERT, UPDATE ON profiles TO service_role;
GRANT SELECT, INSERT, UPDATE ON vendors TO service_role;

-- Enable RLS but allow service_role to bypass it
ALTER TABLE payment_timeout_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies that allow service_role full access (service_role bypasses RLS by default, but explicit policies help)
-- These policies ensure Edge Functions can operate properly

-- Payment timeout config: service_role full access
DROP POLICY IF EXISTS payment_timeout_config_service_role_all ON payment_timeout_config;
CREATE POLICY payment_timeout_config_service_role_all ON payment_timeout_config
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Rate limits: service_role full access
DROP POLICY IF EXISTS rate_limits_service_role_all ON rate_limits;
CREATE POLICY rate_limits_service_role_all ON rate_limits
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Payment transactions: service_role full access
DROP POLICY IF EXISTS payment_transactions_service_role_all ON payment_transactions;
CREATE POLICY payment_transactions_service_role_all ON payment_transactions
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Payment notifications: service_role full access
DROP POLICY IF EXISTS payment_notifications_service_role_all ON payment_notifications;
CREATE POLICY payment_notifications_service_role_all ON payment_notifications
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Payment metrics: service_role full access
DROP POLICY IF EXISTS payment_metrics_service_role_all ON payment_metrics;
CREATE POLICY payment_metrics_service_role_all ON payment_metrics
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Add comments
COMMENT ON POLICY payment_timeout_config_service_role_all ON payment_timeout_config IS 
'Allow Edge Functions using service_role to access payment timeout configuration';

COMMENT ON POLICY rate_limits_service_role_all ON rate_limits IS 
'Allow Edge Functions using service_role to manage rate limiting';

COMMENT ON POLICY payment_transactions_service_role_all ON payment_transactions IS 
'Allow Edge Functions using service_role to create and update payment transactions';
