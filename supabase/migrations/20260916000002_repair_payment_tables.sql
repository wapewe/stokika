-- Repair script for payment tables migration
-- Cleans up any partial state from previous failed migration attempt

BEGIN;

-- Drop existing payment tables if they exist (in reverse dependency order)
DROP TABLE IF EXISTS payment_reconciliation CASCADE;
DROP TABLE IF EXISTS payment_events CASCADE;
DROP TABLE IF EXISTS payment_allocations CASCADE;
DROP TABLE IF EXISTS payment_transactions CASCADE;
DROP TABLE IF EXISTS payment_intents CASCADE;

-- Drop any existing functions that might interfere
DROP FUNCTION IF EXISTS get_registration_fee() CASCADE;
DROP FUNCTION IF EXISTS generate_payment_reference(TEXT) CASCADE;
DROP FUNCTION IF EXISTS can_accept_payment(UUID) CASCADE;

-- Remove vendor columns if they exist (will be re-added by next migration)
ALTER TABLE vendors DROP COLUMN IF EXISTS registration_fee CASCADE;
ALTER TABLE vendors DROP COLUMN IF EXISTS registration_paid CASCADE;
ALTER TABLE vendors DROP COLUMN IF EXISTS registration_payment_date CASCADE;
ALTER TABLE vendors DROP COLUMN IF EXISTS registration_payment_id CASCADE;

COMMIT;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Payment tables repaired successfully. Ready for fresh migration.';
END $$;