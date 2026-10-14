-- Fix payment_intents constraint to allow onboarding kit payments without requiring linked profile
-- Onboarding candidates for field agent, supervisor, and vendor pay for kits before auth profiles are created

ALTER TABLE payment_intents DROP CONSTRAINT IF EXISTS at_least_one_entity;

ALTER TABLE payment_intents ADD CONSTRAINT at_least_one_entity CHECK (
    payment_purpose IN ('REGISTRATION', 'FIELD_AGENT_KIT', 'SUPERVISOR_KIT', 'VENDOR_KIT', 'KIT_PAYMENT', 'OTHER') 
    OR profile_id IS NOT NULL 
    OR vendor_id IS NOT NULL 
    OR field_agent_id IS NOT NULL 
    OR supervisor_id IS NOT NULL
);

COMMENT ON CONSTRAINT at_least_one_entity ON payment_intents IS 
'Ensures at least one entity ID exists, except for registration and onboarding kit payments which occur before accounts are fully created';

-- Clear existing rate limits that were tripped during testing errors
DELETE FROM rate_limits WHERE key LIKE 'stk_%';
