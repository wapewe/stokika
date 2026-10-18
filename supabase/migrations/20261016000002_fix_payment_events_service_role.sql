-- Grant full table access to service_role on payment_events
-- Fixes 42501 permission denied errors when logging payment audit events
GRANT ALL ON payment_events TO service_role;

-- Ensure RLS is enabled (already is, but explicit here)
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;

-- Create service_role policy
DROP POLICY IF EXISTS payment_events_service_role_all ON payment_events;
CREATE POLICY payment_events_service_role_all ON payment_events
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

COMMENT ON POLICY payment_events_service_role_all ON payment_events IS 
'Allow Edge Functions using service_role to log payment audit events';
