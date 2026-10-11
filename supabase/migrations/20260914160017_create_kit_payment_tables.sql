-- Migration: Create Stokika Kit Payment Tables
-- Description: Creates tables for field agent and supervisor kit payment tracking
-- Requirements: M-Pesa integration for kit purchases (separate from vendor stock orders)
-- Note: This is for the field agent/supervisor onboarding workflow

-- ============================================================================
-- Stokika Kit Configuration Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS stokika_kit_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_type TEXT NOT NULL UNIQUE CHECK (user_type IN ('field_agent', 'supervisor')),
    kit_amount DECIMAL(10,2) NOT NULL,
    kit_items TEXT[] NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- Stokika Kit Payments Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS stokika_kit_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_code TEXT,
    user_id UUID,
    user_type TEXT NOT NULL CHECK (user_type IN ('field_agent', 'supervisor')),
    kit_amount DECIMAL(10,2) NOT NULL CHECK (kit_amount IN (2500, 3500)),
    phone_number TEXT NOT NULL CHECK (phone_number ~ '^254[0-9]{9}$'),
    payment_method TEXT DEFAULT 'mpesa_stk',
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN (
        'pending', 'completed', 'verified', 'failed', 
        'timeout', 'awaiting_verification', 'rejected', 
        'refunded', 'callback_missing', 'suspicious'
    )),
    checkout_request_id TEXT UNIQUE,
    merchant_request_id TEXT,
    mpesa_receipt_number TEXT,
    transaction_date TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES profiles(id),
    failure_reason TEXT,
    rejection_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_stokika_kit_payments_application_code 
ON stokika_kit_payments(application_code);

CREATE INDEX IF NOT EXISTS idx_stokika_kit_payments_user 
ON stokika_kit_payments(user_id);

CREATE INDEX IF NOT EXISTS idx_stokika_kit_payments_status 
ON stokika_kit_payments(payment_status);

CREATE INDEX IF NOT EXISTS idx_stokika_kit_payments_checkout 
ON stokika_kit_payments(checkout_request_id) 
WHERE checkout_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_stokika_kit_payments_phone 
ON stokika_kit_payments(phone_number);

CREATE INDEX IF NOT EXISTS idx_stokika_kit_payments_created 
ON stokika_kit_payments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_kit_payments_pending_timeout
ON stokika_kit_payments(created_at, payment_status)
WHERE payment_status = 'pending' AND checkout_request_id IS NOT NULL;

-- ============================================================================
-- Payment Attempts Table (for rate limiting)
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT NOT NULL,  -- user_id or phone_number
    limit_type TEXT NOT NULL CHECK (limit_type IN ('user', 'phone')),
    attempted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Composite index for efficient rate limit checks
CREATE INDEX IF NOT EXISTS idx_payment_attempts_identifier 
ON payment_attempts(identifier, limit_type, attempted_at DESC);

-- Additional index for cleanup operations
CREATE INDEX IF NOT EXISTS idx_payment_attempts_timestamp 
ON payment_attempts(attempted_at);

-- Apply updated_at trigger
CREATE TRIGGER update_stokika_kit_config_updated_at 
    BEFORE UPDATE ON stokika_kit_config
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stokika_kit_payments_updated_at 
    BEFORE UPDATE ON stokika_kit_payments
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Enable RLS
-- ============================================================================

ALTER TABLE stokika_kit_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE stokika_kit_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_attempts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- Kit Config: Everyone can view active kit configurations
CREATE POLICY "Everyone can view active kit config"
ON stokika_kit_config FOR SELECT
USING (is_active = true);

-- Kit Config: Admins can manage configurations
CREATE POLICY "Admins can manage kit config"
ON stokika_kit_config FOR ALL
USING (has_role(ARRAY['admin', 'super_admin']))
WITH CHECK (has_role(ARRAY['admin', 'super_admin']));

-- Kit Payments: Users can view their own payments
CREATE POLICY "Users can view own kit payments"
ON stokika_kit_payments FOR SELECT
USING (user_id = auth.uid() OR application_code IS NOT NULL);

-- Kit Payments: Users can create their own payments
CREATE POLICY "Users can create own kit payments"
ON stokika_kit_payments FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Kit Payments: Staff can view all payments
CREATE POLICY "Staff can view all kit payments"
ON stokika_kit_payments FOR SELECT
USING (has_role(ARRAY['operations', 'finance', 'admin', 'super_admin']));

-- Kit Payments: Finance can manage payments
CREATE POLICY "Finance can manage kit payments"
ON stokika_kit_payments FOR ALL
USING (has_role(ARRAY['finance', 'admin', 'super_admin']))
WITH CHECK (has_role(ARRAY['finance', 'admin', 'super_admin']));

-- Payment Attempts: Service role only
CREATE POLICY "Service role manages payment attempts"
ON payment_attempts FOR ALL
USING (true);

-- ============================================================================
-- Seed Default Kit Configurations
-- ============================================================================

INSERT INTO stokika_kit_config (user_type, kit_amount, kit_items, description) VALUES
('field_agent', 2500.00, ARRAY[
    'Stokika Branded T-Shirt',
    'ID Badge & Lanyard',
    'Product Catalog',
    'Order Forms (50 sheets)',
    'Branded Bag',
    'Training Manual',
    'Mobile App Access'
], 'Complete starter kit for field agents including branded materials and training resources'),
('supervisor', 3500.00, ARRAY[
    'Stokika Branded Polo Shirt',
    'Supervisor ID Badge & Lanyard',
    'Product Catalog',
    'Order Forms (100 sheets)',
    'Branded Laptop Bag',
    'Training Manual',
    'Supervisor Handbook',
    'Mobile App Access',
    'Territory Management Tools'
], 'Complete starter kit for supervisors including management tools and branded materials')
ON CONFLICT (user_type) DO NOTHING;

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to detect and mark timed-out payments
CREATE OR REPLACE FUNCTION detect_payment_timeouts()
RETURNS TABLE (
    updated_count INTEGER,
    updated_ids UUID[]
) AS $$
DECLARE
    v_timeout_threshold INTERVAL := '90 seconds';
    v_updated_ids UUID[];
    v_count INTEGER;
BEGIN
    WITH timeout_payments AS (
        UPDATE stokika_kit_payments
        SET 
            payment_status = 'timeout',
            updated_at = NOW(),
            failure_reason = 'Payment request timed out - user did not complete transaction within 90 seconds'
        WHERE payment_status = 'pending'
          AND created_at < (NOW() - v_timeout_threshold)
          AND checkout_request_id IS NOT NULL
        RETURNING id
    )
    SELECT 
        COUNT(*)::INTEGER,
        ARRAY_AGG(id)
    INTO v_count, v_updated_ids
    FROM timeout_payments;
    
    RETURN QUERY SELECT v_count, COALESCE(v_updated_ids, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old payment attempts
CREATE OR REPLACE FUNCTION cleanup_old_payment_attempts()
RETURNS void AS $$
BEGIN
    DELETE FROM payment_attempts 
    WHERE attempted_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE stokika_kit_config IS 'Configuration for field agent and supervisor starter kits';
COMMENT ON TABLE stokika_kit_payments IS 'Payment records for kit purchases (separate from stock order payments)';
COMMENT ON TABLE payment_attempts IS 'Tracks payment initiation attempts for rate limiting';
COMMENT ON FUNCTION detect_payment_timeouts IS 'Detects and marks payments as timeout if pending for more than 90 seconds';
COMMENT ON FUNCTION cleanup_old_payment_attempts IS 'Removes payment attempt records older than 24 hours';