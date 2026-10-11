-- Fix payment_intents constraint to allow REGISTRATION payments without entity IDs
-- Registration payments are created BEFORE the vendor exists, so they can't have entity IDs yet

-- Drop the old constraint
ALTER TABLE payment_intents DROP CONSTRAINT IF EXISTS at_least_one_entity;

-- Add new constraint that allows NULL entity IDs for REGISTRATION purpose only
ALTER TABLE payment_intents ADD CONSTRAINT at_least_one_entity CHECK (
    payment_purpose = 'REGISTRATION' 
    OR profile_id IS NOT NULL 
    OR vendor_id IS NOT NULL 
    OR field_agent_id IS NOT NULL 
    OR supervisor_id IS NOT NULL
);

-- Add comment explaining the logic
COMMENT ON CONSTRAINT at_least_one_entity ON payment_intents IS 
'Ensures at least one entity ID exists, except for REGISTRATION payments which are created before the entity exists';
