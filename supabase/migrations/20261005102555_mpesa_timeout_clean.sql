-- M-Pesa Timeout Handling Database Schema
-- Migration for M-Pesa payment timeout handling feature
-- Includes: timeout config, audit tables, metrics, and monitoring

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- TASK 1.1: Create payment_timeout_config table
-- Requirements: 1.1, 1.3, 1.4, 1.7
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_timeout_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flow_type VARCHAR(50) NOT NULL UNIQUE,
    timeout_duration INTEGER NOT NULL CHECK (timeout_duration BETWEEN 30 AND 300),
    max_retries INTEGER NOT NULL CHECK (max_retries BETWEEN 1 AND 5),
    retry_interval INTEGER NOT NULL CHECK (retry_interval BETWEEN 10 AND 60),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_flow_type CHECK (flow_type IN ('kit_payment', 'vendor_order', 'manual_payment'))
);

CREATE INDEX IF NOT EXISTS idx_payment_timeout_config_flow_type
ON payment_timeout_config(flow_type);

ALTER TABLE payment_timeout_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view timeout configuration" ON payment_timeout_config;
CREATE POLICY "Anyone can view timeout configuration"
    ON payment_timeout_config FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Admins can modify timeout configuration" ON payment_timeout_config;
CREATE POLICY "Admins can modify timeout configuration"
    ON payment_timeout_config FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
        JOIN user_roles ur ON p.role_id = ur.id
        WHERE p.id = auth.uid()
        AND ur.role_name IN ('admin', 'super_admin')
        )
    );

INSERT INTO payment_timeout_config (flow_type, timeout_duration, max_retries, retry_interval)
VALUES ('kit_payment', 90, 3, 30)
ON CONFLICT (flow_type) DO NOTHING;

INSERT INTO payment_timeout_config (flow_type, timeout_duration, max_retries, retry_interval)
VALUES ('vendor_order', 120, 3, 30)
ON CONFLICT (flow_type) DO NOTHING;

INSERT INTO payment_timeout_config (flow_type, timeout_duration, max_retries, retry_interval)
VALUES ('manual_payment', 300, 5, 60)
ON CONFLICT (flow_type) DO NOTHING;

COMMENT ON TABLE payment_timeout_config IS 'Configuration table for payment timeout settings per flow type';

-- ============================================================================
-- TASK 1.2: Enhance stokika_kit_payments table with timeout fields
-- Requirements: 2.1, 2.3, 3.9, 4.8, 7.1, 7.4
-- ============================================================================

ALTER TABLE stokika_kit_payments
ADD COLUMN IF NOT EXISTS flow_type VARCHAR(50) DEFAULT 'kit_payment',
ADD COLUMN IF NOT EXISTS timeout_detected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS status_query_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_status_query_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS manual_fallback_required BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS manual_payment_confirmed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS verification_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_kit_payments_status_created
ON stokika_kit_payments(payment_status, created_at);

ALTER TABLE stokika_kit_payments
DROP CONSTRAINT IF EXISTS valid_status_query_count;

ALTER TABLE stokika_kit_payments
ADD CONSTRAINT valid_status_query_count
CHECK (status_query_count >= 0);

-- Helper function
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
        UPDATE stokika_kit_payments
        SET manual_fallback_required = TRUE
        WHERE checkout_request_id = p_checkout_request_id;
    END IF;
    
    RETURN v_new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Monitoring view
CREATE OR REPLACE VIEW v_payment_timeout_monitoring AS
SELECT 
    id,
    application_code,
    phone_number, kit_amount, payment_status,
    checkout_request_id,
    flow_type,
    created_at,
    timeout_detected_at,
    status_query_count,
    last_status_query_at,
    manual_fallback_required,
    EXTRACT(EPOCH FROM (NOW() - created_at)) AS seconds_since_created,
    CASE 
        WHEN payment_status = 'timeout' THEN 'TIMED_OUT'
        WHEN manual_fallback_required THEN 'MANUAL_REQUIRED'
        WHEN EXTRACT(EPOCH FROM (NOW() - created_at)) > 90 AND payment_status = 'pending' THEN 'SHOULD_TIMEOUT'
        ELSE 'OK'
    END AS monitoring_status
FROM stokika_kit_payments
WHERE payment_status IN ('pending', 'timeout', 'manual_verification_pending')
ORDER BY created_at DESC;

-- ============================================================================
-- TASK 1.3: Create payment_status_queries audit table
-- Requirements: 3.1, 7.5
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_status_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL,
    checkout_request_id VARCHAR(100) NOT NULL,
    query_response JSONB NOT NULL,
    query_attempt INTEGER NOT NULL DEFAULT 1,
    is_automatic_retry BOOLEAN NOT NULL DEFAULT FALSE,
    queried_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_payment_status_queries_payment
        FOREIGN KEY (payment_id)
        REFERENCES stokika_kit_payments(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_payment_status_queries_payment_id
ON payment_status_queries(payment_id);

CREATE INDEX IF NOT EXISTS idx_payment_status_queries_checkout_request
ON payment_status_queries(checkout_request_id);

CREATE INDEX IF NOT EXISTS idx_payment_status_queries_timestamp
ON payment_status_queries(queried_at DESC);

ALTER TABLE payment_status_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all status queries"
    ON payment_status_queries FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
        JOIN user_roles ur ON p.role_id = ur.id
        WHERE p.id = auth.uid()
        AND ur.role_name IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Service role can insert status queries"
    ON payment_status_queries FOR INSERT
    WITH CHECK (true);

COMMENT ON TABLE payment_status_queries IS 'Immutable audit log of all M-Pesa status query attempts';

-- Helper function
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
    SELECT COALESCE(MAX(query_attempt), 0) + 1
    INTO v_query_attempt
    FROM payment_status_queries
    WHERE payment_id = p_payment_id;
    
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
    
    RETURN v_query_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TASK 1.4: Create payment_metrics table for monitoring
-- Requirements: 2.5, 8.1, 8.2, 8.3, 8.4, 8.5
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_type VARCHAR(100) NOT NULL,
    payment_id UUID REFERENCES stokika_kit_payments(id) ON DELETE SET NULL,
    flow_type VARCHAR(50) NOT NULL DEFAULT 'kit_payment',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
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
        'status_query_initiated',
        'status_query_success',
        'status_query_failure'
    ))
);

CREATE INDEX IF NOT EXISTS idx_payment_metrics_metric_type 
ON payment_metrics(metric_type);

CREATE INDEX IF NOT EXISTS idx_payment_metrics_timestamp 
ON payment_metrics(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_payment_metrics_flow_timestamp 
ON payment_metrics(flow_type, timestamp DESC);

ALTER TABLE payment_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all payment metrics"
    ON payment_metrics FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
        JOIN user_roles ur ON p.role_id = ur.id
        WHERE p.id = auth.uid()
        AND ur.role_name IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Service role can insert payment metrics"
    ON payment_metrics FOR INSERT
    WITH CHECK (true);

COMMENT ON TABLE payment_metrics IS 'Payment flow metrics for monitoring timeout rates and recovery success';

-- Helper function
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

-- ============================================================================
-- TASK 1.5: Create admin_audit_log table for admin actions
-- Requirements: 7.2, 7.3
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_admin_audit_log_admin
        FOREIGN KEY (admin_id)
        REFERENCES profiles(id)
        ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_id
ON admin_audit_log(admin_id);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action
ON admin_audit_log(action);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_timestamp
ON admin_audit_log(timestamp DESC);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all audit logs"
    ON admin_audit_log FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
        JOIN user_roles ur ON p.role_id = ur.id
        WHERE p.id = auth.uid()
        AND ur.role_name IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Service role can insert audit logs"
    ON admin_audit_log FOR INSERT
    WITH CHECK (true);

COMMENT ON TABLE admin_audit_log IS 'Immutable audit log of all admin actions';

-- Helper function
CREATE OR REPLACE FUNCTION log_admin_action(
    p_admin_id UUID,
    p_action VARCHAR(100),
    p_details JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
    v_audit_id UUID;
BEGIN
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
    
    RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;