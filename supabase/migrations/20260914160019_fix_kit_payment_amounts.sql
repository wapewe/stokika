-- Migration: Fix Kit Payment Amounts and Add Payment Intent
-- Description: Updates kit amounts, adds payment intent, and enforces backend validation
-- Changes:
-- 1. Field agent kit: KES 2,500 → KES 1,550
-- 2. Add payment_intent to track initiation vs completion
-- 3. Update CHECK constraints for new amounts

-- ============================================================================
-- Update Kit Configuration Amounts
-- ============================================================================

UPDATE stokika_kit_config
SET kit_amount = 1550.00
WHERE user_type = 'field_agent';

-- ============================================================================
-- Add Payment Intent Column
-- ============================================================================

ALTER TABLE stokika_kit_payments
ADD COLUMN IF NOT EXISTS payment_intent TEXT CHECK (payment_intent IN ('initiated', 'pending', 'completed', 'failed'));

-- Set default for existing records
UPDATE stokika_kit_payments
SET payment_intent = CASE
    WHEN payment_status = 'completed' THEN 'completed'
    WHEN payment_status IN ('failed', 'timeout', 'rejected') THEN 'failed'
    WHEN payment_status = 'pending' THEN 'pending'
    ELSE 'initiated'
END
WHERE payment_intent IS NULL;

-- Make it NOT NULL after setting defaults
ALTER TABLE stokika_kit_payments
ALTER COLUMN payment_intent SET DEFAULT 'initiated',
ALTER COLUMN payment_intent SET NOT NULL;

-- ============================================================================
-- Update Amount Validation Constraints
-- ============================================================================

-- Drop old amount constraint
ALTER TABLE stokika_kit_payments
DROP CONSTRAINT IF EXISTS stokika_kit_payments_kit_amount_check;

-- Add new constraint with updated amounts (1550 for agents, 3500 for supervisors)
ALTER TABLE stokika_kit_payments
ADD CONSTRAINT stokika_kit_payments_kit_amount_check
CHECK (kit_amount IN (1550, 3500));

-- Also update the old constraint name if it exists
ALTER TABLE stokika_kit_payments
DROP CONSTRAINT IF EXISTS valid_kit_amount;

-- ============================================================================
-- Backend Amount Validation Function
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_kit_payment_amount()
RETURNS TRIGGER AS $$
DECLARE
    v_expected_amount DECIMAL(10,2);
BEGIN
    -- Get expected amount from config
    SELECT kit_amount INTO v_expected_amount
    FROM stokika_kit_config
    WHERE user_type = NEW.user_type
    AND is_active = TRUE;
    
    -- If amount doesn't match expected, reject
    IF NEW.kit_amount != v_expected_amount THEN
        RAISE EXCEPTION 'Invalid kit amount. Expected % for %, received %',
            v_expected_amount, NEW.user_type, NEW.kit_amount
            USING ERRCODE = 'check_violation';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce amount validation
DROP TRIGGER IF EXISTS enforce_kit_amount ON stokika_kit_payments;
CREATE TRIGGER enforce_kit_amount
    BEFORE INSERT OR UPDATE OF kit_amount ON stokika_kit_payments
    FOR EACH ROW
    EXECUTE FUNCTION validate_kit_payment_amount();

-- ============================================================================
-- Payment Intent Transition Function
-- ============================================================================

CREATE OR REPLACE FUNCTION update_payment_intent()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-update payment_intent based on payment_status
    IF NEW.payment_status = 'completed' THEN
        NEW.payment_intent = 'completed';
    ELSIF NEW.payment_status IN ('failed', 'timeout', 'rejected') THEN
        NEW.payment_intent = 'failed';
    ELSIF NEW.payment_status = 'pending' AND NEW.checkout_request_id IS NOT NULL THEN
        NEW.payment_intent = 'pending';
    ELSIF NEW.payment_status = 'pending' AND NEW.checkout_request_id IS NULL THEN
        NEW.payment_intent = 'initiated';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for payment intent
DROP TRIGGER IF EXISTS sync_payment_intent ON stokika_kit_payments;
CREATE TRIGGER sync_payment_intent
    BEFORE INSERT OR UPDATE OF payment_status ON stokika_kit_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_intent();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON COLUMN stokika_kit_payments.payment_intent IS 'Payment lifecycle: initiated (created) → pending (STK sent) → completed/failed';
COMMENT ON FUNCTION validate_kit_payment_amount IS 'Backend validation: Ensures payment amount matches kit config - users cannot manipulate amounts';
COMMENT ON FUNCTION update_payment_intent IS 'Auto-syncs payment_intent with payment_status for accurate lifecycle tracking';

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Kit payment amounts updated:';
    RAISE NOTICE '   - Field Agent: KES 1,550 (was 2,500)';
    RAISE NOTICE '   - Supervisor: KES 3,500 (unchanged)';
    RAISE NOTICE '✅ Payment intent column added';
    RAISE NOTICE '✅ Backend amount validation enforced';
    RAISE NOTICE '✅ Users CANNOT change payment amounts';
    RAISE NOTICE '';
    RAISE NOTICE '📌 Flow: Apply → Pay (1550/3500) → Account Activated';
END $$;
