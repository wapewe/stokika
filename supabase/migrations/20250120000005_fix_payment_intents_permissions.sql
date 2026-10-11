-- Fix payment_intents permissions for Edge Functions
-- Issue: Edge Functions need permission to INSERT payment intents

-- Drop existing policies if they exist
DROP POLICY IF EXISTS payment_intents_service_role_all ON payment_intents;
DROP POLICY IF EXISTS payment_intents_anon_insert ON payment_intents;

-- Allow service role (Edge Functions) full access
CREATE POLICY payment_intents_service_role_all ON payment_intents 
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- Allow anonymous users to insert payment intents (vendor registration)
CREATE POLICY payment_intents_anon_insert ON payment_intents 
FOR INSERT TO anon
WITH CHECK (true);

-- Allow anonymous users to select their own payment intents by reference
CREATE POLICY payment_intents_anon_select ON payment_intents 
FOR SELECT TO anon
USING (true);

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE ON payment_intents TO anon;
GRANT ALL ON payment_intents TO service_role;

-- Also grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

COMMENT ON POLICY payment_intents_service_role_all ON payment_intents IS 'Allow Edge Functions to manage payment intents';
COMMENT ON POLICY payment_intents_anon_insert ON payment_intents IS 'Allow vendor registration to create payment intents';
