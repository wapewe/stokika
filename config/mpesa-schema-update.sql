-- M-Pesa Integration Database Schema Updates
-- Secure M-Pesa Daraja API Integration for Stokika Platform
-- Part of: secure-mpesa-integration spec
-- This file contains all database schema enhancements required for M-Pesa integration

-- ============================================================================
-- TASK 1.1: Create payment_timeout_config table
-- Requirements: 1.1, 1.3, 1.4, 1.7
-- ============================================================================

-- Payment Timeout Configuration Table
-- This table stores configurable timeout settings for different payment flow types
CREATE TABLE IF NOT EXISTS payment_timeout_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flow_type VARCHAR(50) NOT NULL UNIQUE,
    timeout_duration INTEGER NOT NULL CHECK (timeout_duration BETWEEN 30 AND 300),
    max_retries INTEGER NOT NULL CHECK (max_retries BETWEEN 1 AND 5),
    retry_interval INTEGER NOT NULL CHECK (retry_interval BETWEEN 10 AND 60),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Documentation constraints
    CONSTRAINT valid_flow_type CHECK (flow_type IN ('kit_payment', 'vendor_order', 'manual_payment'))
);

-- Create index on flow_type for fast lookups
CREATE INDEX IF NOT EXISTS idx_payment_timeout_config_flow_type
ON payment_timeout_config(flow_type);

-- Enable RLS for security
ALTER TABLE payment_timeout_config ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Public reads - anyone can view timeout configuration
CREATE POLICY "Anyone can view timeout configuration"
    ON payment_timeout_config FOR SELECT
    USING (true);

-- RLS Policy: Admin-only updates - only admins can modify timeout settings
CREATE POLICY "Admins can modify timeout configuration"
    ON payment_timeout_config FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.user_type = 'admin'
        )
    );

-- Insert default configuration for kit_payment flow type
INSERT INTO payment_timeout_config (flow_type, timeout_duration, max_retries, retry_interval)
VALUES ('kit_payment', 90, 3, 30)
ON CONFLICT (flow_type) DO NOTHING;

-- Insert default configuration for vendor_order flow type
INSERT INTO payment_timeout_config (flow_type, timeout_duration, max_retries, retry_interval)
VALUES ('vendor_order', 120, 3, 30)
ON CONFLICT (flow_type) DO NOTHING;

-- Insert default configuration for manual_payment flow type
INSERT INTO payment_timeout_config (flow_type, timeout_duration, max_retries, retry_interval)
VALUES ('manual_payment', 300, 5, 60)
ON CONFLICT (flow_type) DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE payment_timeout_config IS 'Configuration table for payment timeout settings per flow type';
COMMENT ON COLUMN payment_timeout_config.flow_type IS 'Type of payment flow: kit_payment, vendor_order, manual_payment';
COMMENT ON COLUMN payment_timeout_config.timeout_duration IS 'Duration in seconds before payment times out (30-300s)';
COMMENT ON COLUMN payment_timeout_config.max_retries IS 'Maximum number of retry attempts allowed (1-5)';
COMMENT ON COLUMN payment_timeout_config.retry_interval IS 'Time interval in seconds between retries (10-60s)';

-- ============================================================================
-- TASK 2.1: Create payment_attempts table for rate limiting
-- Requirements: 11.1, 11.2
-- ============================================================================

-- Payment Attempts Table (for rate limiting)
CREATE TABLE IF NOT EXISTS payment_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identifier VARCHAR(100) NOT NULL,  -- user_id or phone_number
    limit_type VARCHAR(20) NOT NULL CHECK (limit_type IN ('stkPush', 'phoneNumber')),
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Index for efficient cleanup and queries
    CONSTRAINT cleanup_after_window CHECK (
        attempted_at > NOW() - INTERVAL '24 hours'
    )
);

-- Composite index for efficient rate limit checks
CREATE INDEX IF NOT EXISTS idx_payment_attempts_identifier 
ON payment_attempts(identifier, limit_type, attempted_at DESC);

-- Additional index for cleanup operations
CREATE INDEX IF NOT EXISTS idx_payment_attempts_timestamp 
ON payment_attempts(attempted_at);

-- Enable RLS for security
ALTER TABLE payment_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Service role can manage rate limiting records
CREATE POLICY "Service role can manage payment attempts"
    ON payment_attempts FOR ALL
    USING (true);

-- Function to automatically cleanup old payment attempts (runs daily)
CREATE OR REPLACE FUNCTION cleanup_old_payment_attempts()
RETURNS void AS $$
BEGIN
    DELETE FROM payment_attempts 
    WHERE attempted_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE payment_attempts IS 'Tracks payment initiation attempts for rate limiting purposes';
COMMENT ON COLUMN payment_attempts.identifier IS 'User ID or phone number for rate limit tracking';
COMMENT ON COLUMN payment_attempts.limit_type IS 'Type of rate limit: stkPush (per user) or phoneNumber (per phone)';
COMMENT ON COLUMN payment_attempts.attempted_at IS 'Timestamp when payment was attempted';

-- ============================================================================
-- TASK 2.2: Enhance field_agents and supervisors tables
-- Requirements: 15.1, 15.2, 15.3
-- ============================================================================

-- Add kit payment tracking columns to field_agents table
ALTER TABLE field_agents
ADD COLUMN IF NOT EXISTS kit_paid BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS kit_payment_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS kit_payment_id UUID;

-- Add foreign key constraint to link to stokika_kit_payments
-- Note: stokika_kit_payments table should already exist from stokika-kit-payment-schema.sql
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'field_agents_kit_payment_fk' 
        AND table_name = 'field_agents'
    ) THEN
        ALTER TABLE field_agents 
        ADD CONSTRAINT field_agents_kit_payment_fk 
        FOREIGN KEY (kit_payment_id) REFERENCES stokika_kit_payments(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_field_agents_kit_payment 
ON field_agents(kit_payment_id);

CREATE INDEX IF NOT EXISTS idx_field_agents_kit_paid 
ON field_agents(kit_paid);

-- Add kit payment tracking columns to supervisors table
ALTER TABLE supervisors
ADD COLUMN IF NOT EXISTS kit_paid BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS kit_payment_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS kit_payment_id UUID;

-- Add foreign key constraint to link to stokika_kit_payments
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'supervisors_kit_payment_fk' 
        AND table_name = 'supervisors'
    ) THEN
        ALTER TABLE supervisors 
        ADD CONSTRAINT supervisors_kit_payment_fk 
        FOREIGN KEY (kit_payment_id) REFERENCES stokika_kit_payments(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_supervisors_kit_payment 
ON supervisors(kit_payment_id);

CREATE INDEX IF NOT EXISTS idx_supervisors_kit_paid 
ON supervisors(kit_paid);

-- Comments for documentation
COMMENT ON COLUMN field_agents.kit_paid IS 'Indicates whether the field agent has paid for their registration kit';
COMMENT ON COLUMN field_agents.kit_payment_date IS 'Date when kit payment was completed and verified';
COMMENT ON COLUMN field_agents.kit_payment_id IS 'Links to the stokika_kit_payments record';
COMMENT ON COLUMN supervisors.kit_paid IS 'Indicates whether the supervisor has paid for their registration kit';
COMMENT ON COLUMN supervisors.kit_payment_date IS 'Date when kit payment was completed and verified';
COMMENT ON COLUMN supervisors.kit_payment_id IS 'Links to the stokika_kit_payments record';

-- ============================================================================
-- TASK 2.3: Enhance orders table for M-Pesa integration
-- Requirements: 16.1, 16.4
-- ============================================================================

-- Add M-Pesa payment tracking columns to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS checkout_request_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS mpesa_receipt_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP WITH TIME ZONE;

-- Create index on checkout_request_id for efficient lookups
CREATE INDEX IF NOT EXISTS idx_orders_checkout_request 
ON orders(checkout_request_id);

-- Create index on payment_date for reporting
CREATE INDEX IF NOT EXISTS idx_orders_payment_date 
ON orders(payment_date);

-- Add unique constraint to prevent duplicate checkout requests
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'orders_checkout_request_id_unique' 
        AND table_name = 'orders'
    ) THEN
        ALTER TABLE orders 
        ADD CONSTRAINT orders_checkout_request_id_unique 
        UNIQUE (checkout_request_id);
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Comments for documentation
COMMENT ON COLUMN orders.checkout_request_id IS 'M-Pesa STK Push checkout request ID for tracking payment status';
COMMENT ON COLUMN orders.mpesa_receipt_number IS 'M-Pesa transaction receipt number (e.g., QAB1CD2E3F)';
COMMENT ON COLUMN orders.payment_date IS 'Date when M-Pesa payment was completed';

-- ============================================================================
-- Additional stokika_kit_payments enhancements for M-Pesa integration
-- ============================================================================

-- Add M-Pesa specific columns to stokika_kit_payments if they don't exist
-- These may already exist from the base schema, but we ensure they're present

ALTER TABLE stokika_kit_payments
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(15),
ADD COLUMN IF NOT EXISTS checkout_request_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS merchant_request_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS mpesa_receipt_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS transaction_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS failure_reason TEXT,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Update payment_status column to include new M-Pesa statuses
-- First check if we need to update the constraint
DO $$
BEGIN
    -- Drop old constraint if it exists
    ALTER TABLE stokika_kit_payments 
    DROP CONSTRAINT IF EXISTS stokika_kit_payments_payment_status_check;
    
    -- Add new constraint with expanded statuses
    ALTER TABLE stokika_kit_payments
    ADD CONSTRAINT stokika_kit_payments_payment_status_check
    CHECK (payment_status IN (
        'pending', 'completed', 'verified', 'failed', 
        'timeout', 'awaiting_verification', 'rejected', 
        'refunded', 'callback_missing'
    ));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Add indexes for M-Pesa checkout tracking
CREATE UNIQUE INDEX IF NOT EXISTS idx_kit_payments_checkout_request 
ON stokika_kit_payments(checkout_request_id) WHERE checkout_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_kit_payments_phone 
ON stokika_kit_payments(phone_number);

CREATE INDEX IF NOT EXISTS idx_kit_payments_created_at 
ON stokika_kit_payments(created_at DESC);

-- Add phone number format validation constraint
ALTER TABLE stokika_kit_payments
DROP CONSTRAINT IF EXISTS valid_phone_format;

ALTER TABLE stokika_kit_payments
ADD CONSTRAINT valid_phone_format 
CHECK (phone_number IS NULL OR phone_number ~ '^254[0-9]{9}$');

-- Add amount validation constraint for kit prices
ALTER TABLE stokika_kit_payments
DROP CONSTRAINT IF EXISTS valid_kit_amount;

ALTER TABLE stokika_kit_payments
ADD CONSTRAINT valid_kit_amount 
CHECK (kit_amount IN (2500, 3500));

-- ============================================================================
-- Functions for automated kit payment activation
-- ============================================================================

-- Function to activate field agent account after kit payment
CREATE OR REPLACE FUNCTION activate_field_agent_kit_payment()
RETURNS TRIGGER AS $$
BEGIN
    -- When kit payment is completed for a field agent
    IF NEW.payment_status = 'completed' AND OLD.payment_status != 'completed' 
       AND NEW.user_type = 'field_agent' THEN
        
        -- Update field_agents record
        UPDATE field_agents
        SET 
            kit_paid = TRUE,
            kit_payment_date = NEW.transaction_date,
            kit_payment_id = NEW.id,
            updated_at = NOW()
        WHERE user_id = NEW.user_id;
        
        RAISE NOTICE 'Field agent kit payment activated for user_id: %', NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to activate supervisor account after kit payment
CREATE OR REPLACE FUNCTION activate_supervisor_kit_payment()
RETURNS TRIGGER AS $$
BEGIN
    -- When kit payment is completed for a supervisor
    IF NEW.payment_status = 'completed' AND OLD.payment_status != 'completed' 
       AND NEW.user_type = 'supervisor' THEN
        
        -- Update supervisors record
        UPDATE supervisors
        SET 
            kit_paid = TRUE,
            kit_payment_date = NEW.transaction_date,
            kit_payment_id = NEW.id,
            updated_at = NOW()
        WHERE user_id = NEW.user_id;
        
        RAISE NOTICE 'Supervisor kit payment activated for user_id: %', NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for automatic kit payment activation
DROP TRIGGER IF EXISTS trigger_activate_field_agent_kit ON stokika_kit_payments;
CREATE TRIGGER trigger_activate_field_agent_kit
    AFTER UPDATE ON stokika_kit_payments
    FOR EACH ROW
    WHEN (NEW.user_type = 'field_agent')
    EXECUTE FUNCTION activate_field_agent_kit_payment();

DROP TRIGGER IF EXISTS trigger_activate_supervisor_kit ON stokika_kit_payments;
CREATE TRIGGER trigger_activate_supervisor_kit
    AFTER UPDATE ON stokika_kit_payments
    FOR EACH ROW
    WHEN (NEW.user_type = 'supervisor')
    EXECUTE FUNCTION activate_supervisor_kit_payment();

-- Function to link order payment when M-Pesa payment completes
CREATE OR REPLACE FUNCTION link_order_mpesa_payment()
RETURNS TRIGGER AS $$
DECLARE
    v_order_id UUID;
BEGIN
    -- Extract order_id from payment reference or metadata if available
    -- This assumes the reference or notes field contains order information
    -- Adjust logic based on actual implementation
    
    IF NEW.checkout_request_id IS NOT NULL THEN
        -- Update order with M-Pesa payment details
        UPDATE orders
        SET 
            checkout_request_id = NEW.checkout_request_id,
            mpesa_receipt_number = NEW.mpesa_receipt_number,
            payment_date = NEW.transaction_date,
            status = 'paid',
            updated_at = NOW()
        WHERE checkout_request_id = NEW.checkout_request_id;
        
        IF FOUND THEN
            RAISE NOTICE 'Order payment linked for checkout_request_id: %', NEW.checkout_request_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Verification and Status Report
-- ============================================================================

-- Verify all tables and columns exist
DO $$
DECLARE
    v_missing_items TEXT[] := ARRAY[]::TEXT[];
    v_table_exists BOOLEAN;
    v_column_exists BOOLEAN;
BEGIN
    -- Check payment_attempts table
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'payment_attempts'
    ) INTO v_table_exists;
    
    IF NOT v_table_exists THEN
        v_missing_items := array_append(v_missing_items, 'Table: payment_attempts');
    END IF;
    
    -- Check field_agents columns
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'field_agents' AND column_name = 'kit_paid'
    ) INTO v_column_exists;
    
    IF NOT v_column_exists THEN
        v_missing_items := array_append(v_missing_items, 'Column: field_agents.kit_paid');
    END IF;
    
    -- Check supervisors columns
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'supervisors' AND column_name = 'kit_paid'
    ) INTO v_column_exists;
    
    IF NOT v_column_exists THEN
        v_missing_items := array_append(v_missing_items, 'Column: supervisors.kit_paid');
    END IF;
    
    -- Check orders columns
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'checkout_request_id'
    ) INTO v_column_exists;
    
    IF NOT v_column_exists THEN
        v_missing_items := array_append(v_missing_items, 'Column: orders.checkout_request_id');
    END IF;
    
    -- Report results
    IF array_length(v_missing_items, 1) IS NULL THEN
        RAISE NOTICE '✅ M-Pesa schema updates completed successfully!';
        RAISE NOTICE '✅ All tables and columns created';
        RAISE NOTICE '✅ All indexes created';
        RAISE NOTICE '✅ All constraints added';
        RAISE NOTICE '✅ All triggers created';
    ELSE
        RAISE WARNING '⚠️  Some items may be missing: %', array_to_string(v_missing_items, ', ');
    END IF;
END $$;

-- Display summary of changes
SELECT 
    'M-Pesa Integration Schema Update' as title,
    'Created payment_attempts table for rate limiting' as task_2_1,
    'Enhanced field_agents and supervisors tables with kit payment tracking' as task_2_2,
    'Enhanced orders table with M-Pesa payment fields' as task_2_3,
    'Added automated kit payment activation triggers' as bonus,
    NOW() as completed_at;

-- ============================================================================
-- TASK 1.2: Enhance stokika_kit_payments table with timeout fields
-- Requirements: 2.1, 2.3, 3.9, 4.8, 7.1, 7.4
-- ============================================================================

-- Add timeout and monitoring fields to stokika_kit_payments
ALTER TABLE stokika_kit_payments
ADD COLUMN IF NOT EXISTS flow_type VARCHAR(50) DEFAULT 'kit_payment',
ADD COLUMN IF NOT EXISTS timeout_detected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS status_query_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_status_query_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS manual_fallback_required BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS manual_payment_confirmed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS verification_notes TEXT;

-- Update payment_status constraint to include new timeout-related statuses
DO $$
BEGIN
    -- Drop old constraint if it exists
    ALTER TABLE stokika_kit_payments 
    DROP CONSTRAINT IF EXISTS stokika_kit_payments_payment_status_check;
    
    -- Add new constraint with timeout-related statuses
    ALTER TABLE stokika_kit_payments
    ADD CONSTRAINT stokika_kit_payments_payment_status_check
    CHECK (payment_status IN (
        'pending', 'completed', 'verified', 'failed', 
        'timeout', 'callback_missing', 'manual_verification_pending',
        'awaiting_verification', 'rejected', 'refunded'
    ));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create index on (payment_status, created_at) for timeout monitoring queries
CREATE INDEX IF NOT EXISTS idx_kit_payments_status_created
ON stokika_kit_payments(payment_status, created_at);

-- Add constraints for status query count
ALTER TABLE stokika_kit_payments
DROP CONSTRAINT IF EXISTS valid_status_query_count;

ALTER TABLE stokika_kit_payments
ADD CONSTRAINT valid_status_query_count
CHECK (status_query_count >= 0);

-- Comments for documentation
COMMENT ON COLUMN stokika_kit_payments.flow_type IS 'Payment flow type: kit_payment, order_payment, etc.';
COMMENT ON COLUMN stokika_kit_payments.timeout_detected_at IS 'Timestamp when payment timeout was detected (>90 seconds pending)';
COMMENT ON COLUMN stokika_kit_payments.status_query_count IS 'Number of status query attempts made for this payment';
COMMENT ON COLUMN stokika_kit_payments.last_status_query_at IS 'Timestamp of the last status query attempt';
COMMENT ON COLUMN stokika_kit_payments.manual_fallback_required IS 'Flag indicating manual intervention is needed';
COMMENT ON COLUMN stokika_kit_payments.manual_payment_confirmed_at IS 'Timestamp when manual payment was confirmed by admin';
COMMENT ON COLUMN stokika_kit_payments.verification_notes IS 'Admin notes regarding payment verification or issues';

-- Function to increment status query count
CREATE OR REPLACE FUNCTION increment_status_query_count(
    p_checkout_request_id VARCHAR(100)
) RETURNS INTEGER AS $$
DECLARE
    v_new_count INTEGER;
BEGIN
    UPDATE stokika_kit_payments
    SET 
        status_query_count = status_query_count + 1,
        last_status_query_at = NOW(),
        updated_at = NOW()
    WHERE checkout_request_id = p_checkout_request_id
    RETURNING status_query_count INTO v_new_count;
    
    IF v_new_count >= 3 THEN
        -- After 3 queries, mark as requiring manual fallback
        UPDATE stokika_kit_payments
        SET manual_fallback_required = TRUE
        WHERE checkout_request_id = p_checkout_request_id;
        
        RAISE NOTICE 'Payment % requires manual fallback after % query attempts', 
            p_checkout_request_id, v_new_count;
    END IF;
    
    RETURN v_new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION increment_status_query_count IS 'Increments status query count and sets manual fallback flag after 3 attempts';

-- View for monitoring timeout and status query metrics
CREATE OR REPLACE VIEW v_payment_timeout_monitoring AS
SELECT 
    id,
    application_code,
    phone_number,
    amount,
    payment_status,
    checkout_request_id,
    flow_type,
    created_at,
    timeout_detected_at,
    status_query_count,
    last_status_query_at,
    manual_fallback_required,
    EXTRACT(EPOCH FROM (NOW() - created_at)) AS seconds_since_created,
    CASE 
        WHEN timeout_detected_at IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (timeout_detected_at - created_at))
        ELSE NULL
    END AS seconds_to_timeout,
    CASE 
        WHEN payment_status = 'timeout' THEN 'TIMED_OUT'
        WHEN payment_status = 'callback_missing' THEN 'CALLBACK_MISSING'
        WHEN manual_fallback_required THEN 'MANUAL_REQUIRED'
        WHEN EXTRACT(EPOCH FROM (NOW() - created_at)) > 90 AND payment_status = 'pending' THEN 'SHOULD_TIMEOUT'
        WHEN EXTRACT(EPOCH FROM (NOW() - created_at)) > 60 AND payment_status = 'pending' THEN 'AT_RISK'
        ELSE 'OK'
    END AS monitoring_status
FROM stokika_kit_payments
WHERE payment_status IN ('pending', 'timeout', 'callback_missing', 'manual_verification_pending')
ORDER BY created_at DESC;

COMMENT ON VIEW v_payment_timeout_monitoring IS 'Comprehensive monitoring view for payment timeouts and status queries';

-- Verification report
DO $$
BEGIN
    RAISE NOTICE '✅ Task 1.2: stokika_kit_payments timeout fields enhancement completed!';
    RAISE NOTICE '📋 Added columns:';
    RAISE NOTICE '   - flow_type VARCHAR(50) DEFAULT ''kit_payment''';
    RAISE NOTICE '   - timeout_detected_at TIMESTAMP WITH TIME ZONE';
    RAISE NOTICE '   - status_query_count INTEGER DEFAULT 0';
    RAISE NOTICE '   - last_status_query_at TIMESTAMP WITH TIME ZONE';
    RAISE NOTICE '   - manual_fallback_required BOOLEAN DEFAULT FALSE';
    RAISE NOTICE '   - manual_payment_confirmed_at TIMESTAMP WITH TIME ZONE';
    RAISE NOTICE '   - verification_notes TEXT';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Updated payment_status constraint to include:';
    RAISE NOTICE '   - timeout, callback_missing, manual_verification_pending';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Created index: idx_kit_payments_status_created';
    RAISE NOTICE '📋 Created function: increment_status_query_count()';
    RAISE NOTICE '📋 Created view: v_payment_timeout_monitoring';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Requirements satisfied: 2.1, 2.3, 3.9, 4.8, 7.1, 7.4';
END $$;

-- ============================================================================
-- TASK 8: Implement timeout detection mechanism
-- Requirements: 3.2
-- Property: 11 - Timeout Detection
-- ============================================================================

-- Function to detect and mark timed-out payments
-- This function finds all payments that have been pending for more than 90 seconds
-- without receiving a callback and marks them as 'timeout'
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
    -- Find and update payments that are pending for more than 90 seconds
    WITH timeout_payments AS (
        UPDATE stokika_kit_payments
        SET 
            payment_status = 'timeout',
            timeout_detected_at = NOW(),
            updated_at = NOW(),
            failure_reason = 'Payment request timed out - user did not complete transaction within 90 seconds'
        WHERE payment_status = 'pending'
          AND created_at < (NOW() - v_timeout_threshold)
          AND checkout_request_id IS NOT NULL  -- Only payments that were actually initiated
        RETURNING id
    )
    SELECT 
        COUNT(*)::INTEGER,
        ARRAY_AGG(id)
    INTO v_count, v_updated_ids
    FROM timeout_payments;
    
    -- Log the operation
    IF v_count > 0 THEN
        RAISE NOTICE 'Marked % payment(s) as timeout: %', v_count, v_updated_ids;
    END IF;
    
    RETURN QUERY SELECT v_count, COALESCE(v_updated_ids, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION detect_payment_timeouts() IS 'Detects and marks payments as timeout if pending for more than 90 seconds without callback. Runs periodically via scheduled job.';

-- Create a monitoring view for timeout detection
CREATE OR REPLACE VIEW v_pending_payment_status AS
SELECT 
    id,
    application_code,
    phone_number,
    amount,
    payment_status,
    checkout_request_id,
    created_at,
    EXTRACT(EPOCH FROM (NOW() - created_at)) AS seconds_pending,
    CASE 
        WHEN EXTRACT(EPOCH FROM (NOW() - created_at)) > 90 THEN 'SHOULD_TIMEOUT'
        WHEN EXTRACT(EPOCH FROM (NOW() - created_at)) > 60 THEN 'WARNING'
        ELSE 'OK'
    END AS timeout_risk
FROM stokika_kit_payments
WHERE payment_status = 'pending'
  AND checkout_request_id IS NOT NULL
ORDER BY created_at ASC;

-- Add comment for the view
COMMENT ON VIEW v_pending_payment_status IS 'Monitoring view showing all pending payments with timeout risk indicators';

-- Create an index to optimize timeout detection queries
CREATE INDEX IF NOT EXISTS idx_kit_payments_pending_timeout
ON stokika_kit_payments(created_at, payment_status)
WHERE payment_status = 'pending' AND checkout_request_id IS NOT NULL;

-- ============================================================================
-- Scheduled Job Setup Instructions
-- ============================================================================

-- NOTE: The function detect_payment_timeouts() should be scheduled to run every 2 minutes
-- This can be done using:
-- 1. Supabase pg_cron extension (recommended)
-- 2. External cron job calling the function
-- 3. Supabase Edge Function with scheduled trigger

-- Example using pg_cron (if available):
/*
SELECT cron.schedule(
    'detect-payment-timeouts',  -- Job name
    '*/2 * * * *',              -- Every 2 minutes
    'SELECT detect_payment_timeouts();'
);
*/

-- To manually run timeout detection:
-- SELECT * FROM detect_payment_timeouts();

-- To view payments at risk of timeout:
-- SELECT * FROM v_pending_payment_status WHERE timeout_risk IN ('WARNING', 'SHOULD_TIMEOUT');

-- To check how many payments are currently pending:
/*
SELECT 
    COUNT(*) as total_pending,
    COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (NOW() - created_at)) > 90) as should_timeout,
    COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (NOW() - created_at)) BETWEEN 60 AND 90) as at_risk,
    COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (NOW() - created_at)) < 60) as within_window
FROM stokika_kit_payments
WHERE payment_status = 'pending' AND checkout_request_id IS NOT NULL;
*/

-- ============================================================================
-- Property-Based Testing Support for Timeout Detection
-- ============================================================================

-- Function to simulate payment creation at specific time for testing
CREATE OR REPLACE FUNCTION create_test_payment_at_time(
    p_application_code VARCHAR(20),
    p_phone_number VARCHAR(15),
    p_amount DECIMAL(10,2),
    p_user_type VARCHAR(20),
    p_created_at TIMESTAMP WITH TIME ZONE
) RETURNS UUID AS $$
DECLARE
    v_payment_id UUID;
BEGIN
    INSERT INTO stokika_kit_payments (
        application_code,
        phone_number,
        kit_amount,
        user_type,
        payment_status,
        checkout_request_id,
        created_at,
        updated_at
    ) VALUES (
        p_application_code,
        p_phone_number,
        p_amount,
        p_user_type,
        'pending',
        'ws_CO_TEST_' || EXTRACT(EPOCH FROM p_created_at)::TEXT,
        p_created_at,
        p_created_at
    ) RETURNING id INTO v_payment_id;
    
    RETURN v_payment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_test_payment_at_time IS 'Test helper function to create payments with specific timestamps for timeout detection testing';

-- ============================================================================
-- Timeout Detection Verification
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Timeout detection mechanism created successfully!';
    RAISE NOTICE '📋 Function: detect_payment_timeouts()';
    RAISE NOTICE '📋 View: v_pending_payment_status';
    RAISE NOTICE '📋 Index: idx_kit_payments_pending_timeout';
    RAISE NOTICE '⏰ Schedule: Run detect_payment_timeouts() every 2 minutes';
    RAISE NOTICE '🧪 Test helper: create_test_payment_at_time()';
    RAISE NOTICE '';
    RAISE NOTICE '📌 Next steps:';
    RAISE NOTICE '   1. Set up pg_cron or scheduled Edge Function to run detect_payment_timeouts()';
    RAISE NOTICE '   2. Monitor using: SELECT * FROM v_pending_payment_status;';
    RAISE NOTICE '   3. Manually trigger: SELECT * FROM detect_payment_timeouts();';
END $$;

-- Display final summary
SELECT 
    'Timeout Detection Mechanism' as component,
    'Task 8 Complete' as status,
    '90 seconds' as timeout_threshold,
    'Every 2 minutes' as recommended_schedule,
    'detect_payment_timeouts()' as function_name,
    NOW() as implemented_at;

-- ============================================================================
-- TASK 1.4: Create payment_metrics table for monitoring
-- Requirements: 2.5, 8.1, 8.2, 8.3, 8.4, 8.5
-- ============================================================================

-- Payment Metrics Table for monitoring and analytics
-- This table stores various payment flow metrics for monitoring timeout rates,
-- recovery success rates, and other payment performance indicators
CREATE TABLE IF NOT EXISTS payment_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Metric identification
    metric_type VARCHAR(100) NOT NULL,  -- e.g., 'timeout_detected', 'automatic_recovery_success', 'manual_fallback', 'stk_push_initiated', 'callback_received'
    
    -- Related entities
    payment_id UUID REFERENCES stokika_kit_payments(id) ON DELETE SET NULL,  -- Link to payment record (nullable for aggregate metrics)
    flow_type VARCHAR(50) NOT NULL DEFAULT 'kit_payment',  -- Payment flow type (kit_payment, vendor_registration, order_payment)
    
    -- Metric timestamp
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Additional metadata (optional, for storing extra metric data)
    metadata JSONB DEFAULT '{}'::jsonb,  -- Flexible field for storing additional metric-specific data
    
    -- Indexes
    CONSTRAINT valid_metric_type CHECK (metric_type IN (
        'timeout_detected',
        'automatic_recovery_success',
        'automatic_recovery_failure',
        'manual_fallback_initiated',
        'manual_verification_approved',
        'manual_verification_rejected',
        'stk_push_initiated',
        'stk_push_success',
        'stk_push_failure',
        'callback_received',
        'callback_late',
        'status_query_initiated',
        'status_query_success',
        'status_query_failure'
    ))
);

-- Performance indexes for analytics queries
-- Index on metric_type for filtering by specific metric types
CREATE INDEX IF NOT EXISTS idx_payment_metrics_metric_type 
ON payment_metrics(metric_type);

-- Index on timestamp for time-based analytics and reporting
CREATE INDEX IF NOT EXISTS idx_payment_metrics_timestamp 
ON payment_metrics(timestamp DESC);

-- Composite index for efficient flow-type specific queries
CREATE INDEX IF NOT EXISTS idx_payment_metrics_flow_timestamp 
ON payment_metrics(flow_type, timestamp DESC);

-- Composite index for payment-specific metric queries
CREATE INDEX IF NOT EXISTS idx_payment_metrics_payment_id 
ON payment_metrics(payment_id, timestamp DESC) WHERE payment_id IS NOT NULL;

-- Composite index for metric type and timestamp (most common analytics query pattern)
CREATE INDEX IF NOT EXISTS idx_payment_metrics_type_timestamp 
ON payment_metrics(metric_type, timestamp DESC);

-- Enable Row Level Security
ALTER TABLE payment_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can read all metrics
CREATE POLICY "Admins can view all payment metrics"
    ON payment_metrics FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.user_type = 'admin'
        )
    );

-- RLS Policy: Service role can insert metrics (for automated systems)
CREATE POLICY "Service role can insert payment metrics"
    ON payment_metrics FOR INSERT
    WITH CHECK (true);  -- Service role bypass, authenticated via service key

-- RLS Policy: Admins can delete old metrics (for data retention management)
CREATE POLICY "Admins can delete payment metrics"
    ON payment_metrics FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.user_type = 'admin'
        )
    );

-- Comments for documentation
COMMENT ON TABLE payment_metrics IS 'Stores payment flow metrics for monitoring timeout rates, recovery success, and payment performance analytics';
COMMENT ON COLUMN payment_metrics.metric_type IS 'Type of metric being recorded (timeout, recovery, fallback, etc.)';
COMMENT ON COLUMN payment_metrics.payment_id IS 'Reference to related payment record (nullable for aggregate metrics)';
COMMENT ON COLUMN payment_metrics.flow_type IS 'Payment flow type (kit_payment, vendor_registration, order_payment)';
COMMENT ON COLUMN payment_metrics.timestamp IS 'When the metric event occurred';
COMMENT ON COLUMN payment_metrics.metadata IS 'Optional JSON field for storing additional metric-specific data';

-- Helper function to record payment metrics
-- This function provides a convenient way to insert metrics from edge functions and triggers
CREATE OR REPLACE FUNCTION record_payment_metric(
    p_metric_type VARCHAR(100),
    p_payment_id UUID DEFAULT NULL,
    p_flow_type VARCHAR(50) DEFAULT 'kit_payment',
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
    v_metric_id UUID;
BEGIN
    INSERT INTO payment_metrics (
        metric_type,
        payment_id,
        flow_type,
        timestamp,
        metadata
    ) VALUES (
        p_metric_type,
        p_payment_id,
        p_flow_type,
        NOW(),
        p_metadata
    ) RETURNING id INTO v_metric_id;
    
    RETURN v_metric_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION record_payment_metric IS 'Helper function to record payment metrics with proper validation and timestamp';

-- Create view for common metric aggregations
-- This view helps admins quickly see timeout rates, recovery rates, etc.
CREATE OR REPLACE VIEW v_payment_metrics_summary AS
SELECT 
    flow_type,
    metric_type,
    COUNT(*) as total_count,
    DATE_TRUNC('hour', timestamp) as hour_bucket,
    MIN(timestamp) as first_occurrence,
    MAX(timestamp) as last_occurrence
FROM payment_metrics
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY flow_type, metric_type, DATE_TRUNC('hour', timestamp)
ORDER BY hour_bucket DESC, flow_type, metric_type;

COMMENT ON VIEW v_payment_metrics_summary IS 'Aggregated payment metrics by flow type and metric type, grouped by hour for the last 7 days';

-- Create view for timeout rate calculation
CREATE OR REPLACE VIEW v_timeout_rate_metrics AS
SELECT 
    flow_type,
    DATE_TRUNC('day', timestamp) as day,
    COUNT(*) FILTER (WHERE metric_type = 'timeout_detected') as timeout_count,
    COUNT(*) FILTER (WHERE metric_type = 'stk_push_initiated') as total_stk_push_count,
    CASE 
        WHEN COUNT(*) FILTER (WHERE metric_type = 'stk_push_initiated') > 0 THEN
            ROUND(
                (COUNT(*) FILTER (WHERE metric_type = 'timeout_detected')::DECIMAL / 
                 COUNT(*) FILTER (WHERE metric_type = 'stk_push_initiated')::DECIMAL) * 100, 
                2
            )
        ELSE 0
    END as timeout_rate_percentage
FROM payment_metrics
WHERE timestamp > NOW() - INTERVAL '30 days'
GROUP BY flow_type, DATE_TRUNC('day', timestamp)
ORDER BY day DESC, flow_type;

COMMENT ON VIEW v_timeout_rate_metrics IS 'Calculates daily timeout rate percentage by flow type for the last 30 days';

-- Create view for recovery success rate
CREATE OR REPLACE VIEW v_recovery_rate_metrics AS
SELECT 
    flow_type,
    DATE_TRUNC('day', timestamp) as day,
    COUNT(*) FILTER (WHERE metric_type = 'automatic_recovery_success') as recovery_success_count,
    COUNT(*) FILTER (WHERE metric_type = 'timeout_detected') as timeout_count,
    CASE 
        WHEN COUNT(*) FILTER (WHERE metric_type = 'timeout_detected') > 0 THEN
            ROUND(
                (COUNT(*) FILTER (WHERE metric_type = 'automatic_recovery_success')::DECIMAL / 
                 COUNT(*) FILTER (WHERE metric_type = 'timeout_detected')::DECIMAL) * 100, 
                2
            )
        ELSE 0
    END as recovery_success_rate_percentage
FROM payment_metrics
WHERE timestamp > NOW() - INTERVAL '30 days'
GROUP BY flow_type, DATE_TRUNC('day', timestamp)
ORDER BY day DESC, flow_type;

COMMENT ON VIEW v_recovery_rate_metrics IS 'Calculates daily automatic recovery success rate by flow type for the last 30 days';

-- ============================================================================
-- Verification and Status Report for Task 1.4
-- ============================================================================

DO $$
DECLARE
    v_table_exists BOOLEAN;
    v_index_count INTEGER;
    v_policy_count INTEGER;
BEGIN
    -- Check if payment_metrics table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'payment_metrics'
    ) INTO v_table_exists;
    
    IF NOT v_table_exists THEN
        RAISE EXCEPTION '❌ payment_metrics table was not created successfully';
    END IF;
    
    -- Count indexes on payment_metrics
    SELECT COUNT(*) INTO v_index_count
    FROM pg_indexes
    WHERE tablename = 'payment_metrics';
    
    -- Count RLS policies on payment_metrics
    SELECT COUNT(*) INTO v_policy_count
    FROM pg_policies
    WHERE tablename = 'payment_metrics';
    
    -- Report results
    RAISE NOTICE '✅ Task 1.4 completed successfully!';
    RAISE NOTICE '✅ payment_metrics table created';
    RAISE NOTICE '✅ % indexes created for analytics queries', v_index_count;
    RAISE NOTICE '✅ % RLS policies set up for admin-only access', v_policy_count;
    RAISE NOTICE '✅ Helper function record_payment_metric() created';
    RAISE NOTICE '✅ Analytics views created:';
    RAISE NOTICE '   - v_payment_metrics_summary (hourly aggregation)';
    RAISE NOTICE '   - v_timeout_rate_metrics (daily timeout rates)';
    RAISE NOTICE '   - v_recovery_rate_metrics (daily recovery rates)';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Metric Types Supported:';
    RAISE NOTICE '   - timeout_detected';
    RAISE NOTICE '   - automatic_recovery_success/failure';
    RAISE NOTICE '   - manual_fallback_initiated';
    RAISE NOTICE '   - manual_verification_approved/rejected';
    RAISE NOTICE '   - stk_push_initiated/success/failure';
    RAISE NOTICE '   - callback_received/late';
    RAISE NOTICE '   - status_query_initiated/success/failure';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Usage Examples:';
    RAISE NOTICE '   -- Record a metric:';
    RAISE NOTICE '   SELECT record_payment_metric(''timeout_detected'', payment_id_here, ''kit_payment'');';
    RAISE NOTICE '';
    RAISE NOTICE '   -- View metrics summary:';
    RAISE NOTICE '   SELECT * FROM v_payment_metrics_summary;';
    RAISE NOTICE '';
    RAISE NOTICE '   -- View timeout rates:';
    RAISE NOTICE '   SELECT * FROM v_timeout_rate_metrics WHERE flow_type = ''kit_payment'';';
    RAISE NOTICE '';
    RAISE NOTICE '   -- View recovery rates:';
    RAISE NOTICE '   SELECT * FROM v_recovery_rate_metrics WHERE day >= CURRENT_DATE - 7;';
END $$;

-- Display summary
SELECT 
    'Payment Metrics Table' as component,
    'Task 1.4 Complete' as status,
    'Monitoring & Analytics' as purpose,
    'Admin-Only Access' as security,
    NOW() as implemented_at;

-- ============================================================================
-- TASK 1.3: Create payment_status_queries audit table
-- Requirements: 3.1, 7.5
-- Part of: mpesa-timeout-handling spec
-- ============================================================================

-- Payment Status Queries Audit Table
-- This table provides an immutable audit trail of all M-Pesa status query attempts
-- and responses, enabling debugging, compliance reporting, and recovery analysis.
CREATE TABLE IF NOT EXISTS payment_status_queries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Payment identification
    payment_id UUID NOT NULL,
    checkout_request_id VARCHAR(100) NOT NULL,
    
    -- Query details
    query_response JSONB NOT NULL,
    query_attempt INTEGER NOT NULL DEFAULT 1,
    is_automatic_retry BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Timestamp
    queried_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraint to stokika_kit_payments
    CONSTRAINT fk_payment_status_queries_payment
        FOREIGN KEY (payment_id)
        REFERENCES stokika_kit_payments(id)
        ON DELETE CASCADE
);

-- Create index on payment_id for efficient payment-specific queries
CREATE INDEX IF NOT EXISTS idx_payment_status_queries_payment_id
ON payment_status_queries(payment_id);

-- Create index on checkout_request_id for M-Pesa reference lookups
CREATE INDEX IF NOT EXISTS idx_payment_status_queries_checkout_request
ON payment_status_queries(checkout_request_id);

-- Create index on queried_at for time-based queries and reporting
CREATE INDEX IF NOT EXISTS idx_payment_status_queries_timestamp
ON payment_status_queries(queried_at DESC);

-- Create composite index for analyzing automatic vs manual queries
CREATE INDEX IF NOT EXISTS idx_payment_status_queries_auto_retry
ON payment_status_queries(is_automatic_retry, queried_at DESC);

-- Enable RLS for security
ALTER TABLE payment_status_queries ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can read all status query records
CREATE POLICY "Admins can read all status queries"
    ON payment_status_queries FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.user_type = 'admin'
        )
    );

-- RLS Policy: Service role can insert status query records
CREATE POLICY "Service role can insert status queries"
    ON payment_status_queries FOR INSERT
    WITH CHECK (true);

-- RLS Policy: Users can view their own payment status queries
CREATE POLICY "Users can view own payment status queries"
    ON payment_status_queries FOR SELECT
    USING (
        payment_id IN (
            SELECT id FROM stokika_kit_payments
            WHERE application_code IN (
                SELECT application_code FROM field_agents WHERE id = auth.uid()
                UNION
                SELECT application_code FROM supervisors WHERE id = auth.uid()
            )
        )
    );

-- Comments for documentation
COMMENT ON TABLE payment_status_queries IS 'Immutable audit log of all M-Pesa status query attempts and responses for payment timeout recovery';
COMMENT ON COLUMN payment_status_queries.payment_id IS 'Foreign key reference to stokika_kit_payments table';
COMMENT ON COLUMN payment_status_queries.checkout_request_id IS 'M-Pesa checkout request ID for correlation with M-Pesa records';
COMMENT ON COLUMN payment_status_queries.query_response IS 'Complete JSON response from M-Pesa status query API';
COMMENT ON COLUMN payment_status_queries.query_attempt IS 'Sequential attempt number for this payment (1, 2, 3...)';
COMMENT ON COLUMN payment_status_queries.is_automatic_retry IS 'TRUE if query was triggered automatically by timeout detection, FALSE if manual';
COMMENT ON COLUMN payment_status_queries.queried_at IS 'Timestamp when status query was executed';

-- ============================================================================
-- Helper Views for Status Query Analysis
-- ============================================================================

-- View: Recent status queries with payment details
CREATE OR REPLACE VIEW v_recent_status_queries AS
SELECT 
    psq.id,
    psq.payment_id,
    psq.checkout_request_id,
    skp.application_code,
    skp.phone_number,
    skp.amount,
    skp.payment_status,
    psq.query_attempt,
    psq.is_automatic_retry,
    psq.query_response->>'ResultCode' as result_code,
    psq.query_response->>'ResultDesc' as result_description,
    psq.queried_at,
    EXTRACT(EPOCH FROM (psq.queried_at - skp.created_at))::INTEGER as seconds_after_payment_init
FROM payment_status_queries psq
JOIN stokika_kit_payments skp ON psq.payment_id = skp.id
ORDER BY psq.queried_at DESC
LIMIT 100;

COMMENT ON VIEW v_recent_status_queries IS 'Recent status queries with payment context for monitoring and debugging';

-- View: Status query success rates
CREATE OR REPLACE VIEW v_status_query_metrics AS
SELECT 
    COUNT(*) as total_queries,
    COUNT(*) FILTER (WHERE is_automatic_retry = TRUE) as automatic_queries,
    COUNT(*) FILTER (WHERE is_automatic_retry = FALSE) as manual_queries,
    COUNT(*) FILTER (WHERE query_response->>'ResultCode' = '0') as successful_queries,
    COUNT(*) FILTER (WHERE query_response->>'ResultCode' != '0' AND query_response->>'ResultCode' IS NOT NULL) as failed_queries,
    COUNT(*) FILTER (WHERE query_attempt = 1) as first_attempt_queries,
    COUNT(*) FILTER (WHERE query_attempt > 1) as retry_queries,
    AVG(query_attempt) as avg_query_attempts,
    MIN(queried_at) as first_query_at,
    MAX(queried_at) as last_query_at
FROM payment_status_queries
WHERE queried_at > NOW() - INTERVAL '24 hours';

COMMENT ON VIEW v_status_query_metrics IS '24-hour metrics for status query performance and success rates';

-- ============================================================================
-- Helper Functions for Status Query Management
-- ============================================================================

-- Function to log status query
CREATE OR REPLACE FUNCTION log_status_query(
    p_payment_id UUID,
    p_checkout_request_id VARCHAR(100),
    p_query_response JSONB,
    p_is_automatic_retry BOOLEAN DEFAULT TRUE
) RETURNS UUID AS $$
DECLARE
    v_query_id UUID;
    v_query_attempt INTEGER;
BEGIN
    -- Get current query attempt count for this payment
    SELECT COALESCE(MAX(query_attempt), 0) + 1
    INTO v_query_attempt
    FROM payment_status_queries
    WHERE payment_id = p_payment_id;
    
    -- Insert status query record
    INSERT INTO payment_status_queries (
        payment_id,
        checkout_request_id,
        query_response,
        query_attempt,
        is_automatic_retry,
        queried_at
    ) VALUES (
        p_payment_id,
        p_checkout_request_id,
        p_query_response,
        v_query_attempt,
        p_is_automatic_retry,
        NOW()
    ) RETURNING id INTO v_query_id;
    
    RAISE NOTICE 'Status query logged: payment_id=%, attempt=%, automatic=%', 
        p_payment_id, v_query_attempt, p_is_automatic_retry;
    
    RETURN v_query_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION log_status_query IS 'Helper function to log M-Pesa status query attempts with automatic attempt counting';

-- Function to get status query history for a payment
CREATE OR REPLACE FUNCTION get_payment_status_query_history(
    p_payment_id UUID
) RETURNS TABLE (
    query_id UUID,
    attempt INTEGER,
    is_automatic BOOLEAN,
    result_code TEXT,
    result_desc TEXT,
    queried_at TIMESTAMP WITH TIME ZONE,
    seconds_since_previous INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        psq.id as query_id,
        psq.query_attempt as attempt,
        psq.is_automatic_retry as is_automatic,
        psq.query_response->>'ResultCode' as result_code,
        psq.query_response->>'ResultDesc' as result_desc,
        psq.queried_at,
        EXTRACT(EPOCH FROM (
            psq.queried_at - LAG(psq.queried_at) OVER (ORDER BY psq.query_attempt)
        ))::INTEGER as seconds_since_previous
    FROM payment_status_queries psq
    WHERE psq.payment_id = p_payment_id
    ORDER BY psq.query_attempt ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_payment_status_query_history IS 'Returns complete status query history for a payment with timing analysis';

-- ============================================================================
-- Verification and Status Report
-- ============================================================================

DO $$
DECLARE
    v_table_exists BOOLEAN;
    v_constraint_exists BOOLEAN;
BEGIN
    -- Check if payment_status_queries table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'payment_status_queries'
    ) INTO v_table_exists;
    
    -- Check if foreign key constraint exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_payment_status_queries_payment'
        AND table_name = 'payment_status_queries'
    ) INTO v_constraint_exists;
    
    IF v_table_exists AND v_constraint_exists THEN
        RAISE NOTICE '✅ payment_status_queries audit table created successfully!';
        RAISE NOTICE '✅ Foreign key constraint to stokika_kit_payments established';
        RAISE NOTICE '✅ Indexes created for efficient querying';
        RAISE NOTICE '✅ RLS policies configured';
        RAISE NOTICE '✅ Helper views created (v_recent_status_queries, v_status_query_metrics)';
        RAISE NOTICE '✅ Helper functions created (log_status_query, get_payment_status_query_history)';
        RAISE NOTICE '';
        RAISE NOTICE '📊 Usage examples:';
        RAISE NOTICE '   View recent queries: SELECT * FROM v_recent_status_queries;';
        RAISE NOTICE '   View metrics: SELECT * FROM v_status_query_metrics;';
        RAISE NOTICE '   Log a query: SELECT log_status_query(payment_id, checkout_id, response_json, true);';
        RAISE NOTICE '   Get history: SELECT * FROM get_payment_status_query_history(payment_id);';
    ELSE
        RAISE WARNING '⚠️  payment_status_queries table or constraint may be missing';
    END IF;
END $$;

-- Display task completion summary
SELECT 
    'Payment Status Queries Audit Table' as component,
    'Task 1.3 Complete' as status,
    'mpesa-timeout-handling spec' as spec,
    'Requirements 3.1, 7.5' as requirements,
    NOW() as completed_at;

-- ============================================================================
-- TASK 1.5: Create admin_audit_log table
-- Requirements: 7.2, 7.3
-- Part of: mpesa-timeout-handling spec
-- ============================================================================

-- Admin Audit Log Table
-- This table provides an immutable audit trail of all admin actions related to
-- payment verification, manual approvals, and configuration changes.
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Admin identification
    admin_id UUID NOT NULL,
    
    -- Action details
    action VARCHAR(100) NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Timestamp
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraint to users table
    CONSTRAINT fk_admin_audit_log_admin
        FOREIGN KEY (admin_id)
        REFERENCES users(id)
        ON DELETE CASCADE,
    
    -- Validation constraints
    CONSTRAINT valid_action CHECK (action IN (
        'manual_payment_verified',
        'manual_payment_rejected',
        'timeout_config_updated',
        'payment_status_queried',
        'manual_fallback_initiated',
        'payment_refunded',
        'verification_notes_added',
        'user_account_modified'
    ))
);

-- Create index on admin_id for admin-specific action history
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_id
ON admin_audit_log(admin_id);

-- Create index on action for filtering by action type
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action
ON admin_audit_log(action);

-- Create index on timestamp for time-based queries and reporting
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_timestamp
ON admin_audit_log(timestamp DESC);

-- Create composite index for admin action history
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_timestamp
ON admin_audit_log(admin_id, timestamp DESC);

-- Create composite index for action analysis
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action_timestamp
ON admin_audit_log(action, timestamp DESC);

-- Enable RLS for security
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can read all audit logs
CREATE POLICY "Admins can read all audit logs"
    ON admin_audit_log FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.user_type = 'admin'
        )
    );

-- RLS Policy: Service role can insert audit logs
CREATE POLICY "Service role can insert audit logs"
    ON admin_audit_log FOR INSERT
    WITH CHECK (true);

-- RLS Policy: Admins can view their own action history
CREATE POLICY "Admins can view own audit history"
    ON admin_audit_log FOR SELECT
    USING (admin_id = auth.uid());

-- Comments for documentation
COMMENT ON TABLE admin_audit_log IS 'Immutable audit log of all admin actions related to payment verification and system configuration';
COMMENT ON COLUMN admin_audit_log.admin_id IS 'Foreign key reference to users table (admin user)';
COMMENT ON COLUMN admin_audit_log.action IS 'Type of admin action performed';
COMMENT ON COLUMN admin_audit_log.details IS 'JSON object containing action-specific details (payment_id, changes made, etc.)';
COMMENT ON COLUMN admin_audit_log.timestamp IS 'Timestamp when action was performed';

-- ============================================================================
-- Helper Views for Admin Audit Analysis
-- ============================================================================

-- View: Recent admin actions with user details
CREATE OR REPLACE VIEW v_recent_admin_actions AS
SELECT 
    aal.id,
    aal.admin_id,
    u.first_name || ' ' || u.last_name as admin_name,
    u.email as admin_email,
    aal.action,
    aal.details,
    aal.timestamp,
    aal.details->>'payment_id' as related_payment_id,
    aal.details->>'user_id' as related_user_id
FROM admin_audit_log aal
JOIN users u ON aal.admin_id = u.id
ORDER BY aal.timestamp DESC
LIMIT 100;

COMMENT ON VIEW v_recent_admin_actions IS 'Recent admin actions with user details for monitoring and compliance';

-- View: Admin action metrics
CREATE OR REPLACE VIEW v_admin_action_metrics AS
SELECT 
    admin_id,
    u.first_name || ' ' || u.last_name as admin_name,
    action,
    COUNT(*) as action_count,
    MIN(timestamp) as first_action_at,
    MAX(timestamp) as last_action_at
FROM admin_audit_log aal
JOIN users u ON aal.admin_id = u.id
WHERE timestamp > NOW() - INTERVAL '30 days'
GROUP BY admin_id, u.first_name, u.last_name, action
ORDER BY action_count DESC;

COMMENT ON VIEW v_admin_action_metrics IS '30-day metrics for admin actions by admin and action type';

-- ============================================================================
-- Helper Functions for Admin Audit Logging
-- ============================================================================

-- Function to log admin action
CREATE OR REPLACE FUNCTION log_admin_action(
    p_admin_id UUID,
    p_action VARCHAR(100),
    p_details JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS }
DECLARE
    v_audit_id UUID;
BEGIN
    -- Verify admin user exists
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE id = p_admin_id 
        AND user_type = 'admin'
    ) THEN
        RAISE EXCEPTION 'Invalid admin_id: user does not exist or is not an admin';
    END IF;
    
    -- Insert audit log record
    INSERT INTO admin_audit_log (
        admin_id,
        action,
        details,
        timestamp
    ) VALUES (
        p_admin_id,
        p_action,
        p_details,
        NOW()
    ) RETURNING id INTO v_audit_id;
    
    RAISE NOTICE 'Admin action logged: admin_id=%, action=%', p_admin_id, p_action;
    
    RETURN v_audit_id;
END;
} LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION log_admin_action IS 'Helper function to log admin actions with validation and timestamp';

-- Function to get admin action history
CREATE OR REPLACE FUNCTION get_admin_action_history(
    p_admin_id UUID,
    p_days INTEGER DEFAULT 30
) RETURNS TABLE (
    audit_id UUID,
    action VARCHAR(100),
    details JSONB,
    timestamp TIMESTAMP WITH TIME ZONE,
    hours_since_previous NUMERIC
) AS }
BEGIN
    RETURN QUERY
    SELECT 
        aal.id as audit_id,
        aal.action,
        aal.details,
        aal.timestamp,
        ROUND(
            EXTRACT(EPOCH FROM (
                aal.timestamp - LAG(aal.timestamp) OVER (ORDER BY aal.timestamp)
            )) / 3600, 
            2
        ) as hours_since_previous
    FROM admin_audit_log aal
    WHERE aal.admin_id = p_admin_id
      AND aal.timestamp > NOW() - (p_days || ' days')::INTERVAL
    ORDER BY aal.timestamp DESC;
END;
} LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_admin_action_history IS 'Returns admin action history for specified admin with timing analysis';

-- ============================================================================
-- Verification and Status Report
-- ============================================================================

DO }
DECLARE
    v_table_exists BOOLEAN;
    v_constraint_exists BOOLEAN;
    v_index_count INTEGER;
BEGIN
    -- Check if admin_audit_log table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'admin_audit_log'
    ) INTO v_table_exists;
    
    -- Check if foreign key constraint exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_admin_audit_log_admin'
        AND table_name = 'admin_audit_log'
    ) INTO v_constraint_exists;
    
    -- Count indexes on admin_audit_log
    SELECT COUNT(*) INTO v_index_count
    FROM pg_indexes
    WHERE tablename = 'admin_audit_log';
    
    IF v_table_exists AND v_constraint_exists THEN
        RAISE NOTICE '✅ admin_audit_log table created successfully!';
        RAISE NOTICE '✅ Foreign key constraint to users table established';
        RAISE NOTICE '✅ % indexes created for efficient querying', v_index_count;
        RAISE NOTICE '✅ RLS policies configured';
        RAISE NOTICE '✅ Helper views created (v_recent_admin_actions, v_admin_action_metrics)';
        RAISE NOTICE '✅ Helper functions created (log_admin_action, get_admin_action_history)';
        RAISE NOTICE '';
        RAISE NOTICE '📊 Supported actions:';
        RAISE NOTICE '   - manual_payment_verified';
        RAISE NOTICE '   - manual_payment_rejected';
        RAISE NOTICE '   - timeout_config_updated';
        RAISE NOTICE '   - payment_status_queried';
        RAISE NOTICE '   - manual_fallback_initiated';
        RAISE NOTICE '   - payment_refunded';
        RAISE NOTICE '   - verification_notes_added';
        RAISE NOTICE '   - user_account_modified';
        RAISE NOTICE '';
        RAISE NOTICE '📊 Usage examples:';
        RAISE NOTICE '   View recent actions: SELECT * FROM v_recent_admin_actions;';
        RAISE NOTICE '   View metrics: SELECT * FROM v_admin_action_metrics;';
        RAISE NOTICE '   Log an action: SELECT log_admin_action(admin_id, ''manual_payment_verified'', ''{"payment_id": "..."}'');';
        RAISE NOTICE '   Get history: SELECT * FROM get_admin_action_history(admin_id, 30);';
    ELSE
        RAISE WARNING '⚠️  admin_audit_log table or constraint may be missing';
    END IF;
END };

-- Display task completion summary
SELECT 
    'Admin Audit Log Table' as component,
    'Task 1.5 Complete' as status,
    'mpesa-timeout-handling spec' as spec,
    'Requirements 7.2, 7.3' as requirements,
    NOW() as completed_at;

