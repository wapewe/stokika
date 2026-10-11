-- Section 11 & 12: Notification System and Data Migration (Final)
-- Task 11.1-11.4 and 12.1-12.4

-- ============================================================================
-- Section 12: Update payment_timeout_config constraint
-- ============================================================================

-- Drop old constraint and add new one with more flow types
ALTER TABLE payment_timeout_config DROP CONSTRAINT IF EXISTS valid_flow_type;
ALTER TABLE payment_timeout_config ADD CONSTRAINT valid_flow_type 
    CHECK (flow_type IN ('kit_payment', 'vendor_order', 'manual_payment', 'vendor_registration', 'default'));

-- ============================================================================
-- Section 11: Notification System Tables
-- ============================================================================

-- Create payment_notifications table for tracking notification delivery
CREATE TABLE IF NOT EXISTS payment_notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id uuid NOT NULL REFERENCES stokika_kit_payments(id) ON DELETE CASCADE,
    notification_type text NOT NULL CHECK (notification_type IN (
        'timeout_detected',
        'payment_completed',
        'manual_payment_instructions',
        'manual_payment_approved',
        'manual_payment_rejected',
        'status_query_retry'
    )),
    ui_message text NOT NULL,
    email_subject text,
    email_body text,
    sms_message text,
    sent_at timestamptz NOT NULL DEFAULT now(),
    delivery_status text NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'delivered', 'partial', 'failed')),
    email_sent boolean DEFAULT false,
    sms_sent boolean DEFAULT false,
    error_log jsonb,
    retry_count int DEFAULT 0,
    next_retry_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_notifications_payment_id ON payment_notifications(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_notifications_type ON payment_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_payment_notifications_status ON payment_notifications(delivery_status) WHERE delivery_status = 'failed';
CREATE INDEX IF NOT EXISTS idx_payment_notifications_retry ON payment_notifications(next_retry_at) WHERE next_retry_at IS NOT NULL;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON payment_notifications TO authenticated, anon;

-- ============================================================================
-- Section 12: Data Migration and Backward Compatibility
-- ============================================================================

-- Task 12.2: Initialize default timeout configurations (if not exists)
INSERT INTO payment_timeout_config (flow_type, timeout_duration, max_retries, retry_interval)
VALUES 
    ('kit_payment', 60, 3, 15),
    ('vendor_registration', 60, 3, 15),
    ('default', 60, 3, 15)
ON CONFLICT (flow_type) DO NOTHING;

-- Task 12.3: Update existing pending payments
-- Set default values for any NULL fields in existing records
UPDATE stokika_kit_payments
SET 
    flow_type = COALESCE(flow_type, 
        CASE
            WHEN application_code LIKE 'FA%' THEN 'kit_payment'
            WHEN application_code LIKE 'SV%' THEN 'kit_payment'
            ELSE 'kit_payment'
        END
    ),
    status_query_count = COALESCE(status_query_count, 0),
    manual_fallback_required = COALESCE(manual_fallback_required, false)
WHERE payment_status IN ('pending', 'timeout', 'awaiting_verification');

-- Task 12.4: Feature flag for gradual rollout
-- Add feature flag configuration table
CREATE TABLE IF NOT EXISTS system_feature_flags (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_name text NOT NULL UNIQUE,
    enabled boolean NOT NULL DEFAULT false,
    description text,
    enabled_at timestamptz,
    disabled_at timestamptz,
    config jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Insert timeout handling feature flag
INSERT INTO system_feature_flags (feature_name, enabled, description, enabled_at)
VALUES (
    'enable_timeout_handling',
    true,
    'Enable automatic timeout detection and recovery for M-Pesa payments',
    now()
) ON CONFLICT (feature_name) DO NOTHING;

-- Grant permissions
GRANT SELECT ON system_feature_flags TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON system_feature_flags TO service_role;

-- Function to check if feature is enabled
CREATE OR REPLACE FUNCTION is_feature_enabled(p_feature_name text)
RETURNS boolean AS $$
DECLARE
    v_enabled boolean;
BEGIN
    SELECT enabled INTO v_enabled
    FROM system_feature_flags
    WHERE feature_name = p_feature_name;
    
    RETURN COALESCE(v_enabled, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_feature_enabled TO authenticated, anon;

-- Function to retry failed notifications
CREATE OR REPLACE FUNCTION retry_failed_notifications()
RETURNS TABLE (
    retried_count bigint,
    payment_ids uuid[]
) AS $$
DECLARE
    v_retried_count bigint;
    v_payment_ids uuid[];
BEGIN
    -- Find notifications that need retry
    WITH notifications_to_retry AS (
        SELECT id, payment_id
        FROM payment_notifications
        WHERE delivery_status = 'failed'
        AND retry_count < 3
        AND (next_retry_at IS NULL OR next_retry_at <= now())
        LIMIT 100
    ),
    updated AS (
        UPDATE payment_notifications pn
        SET 
            retry_count = pn.retry_count + 1,
            next_retry_at = now() + (POWER(2, pn.retry_count + 1) || ' minutes')::interval,
            delivery_status = 'pending'
        FROM notifications_to_retry ntr
        WHERE pn.id = ntr.id
        RETURNING pn.payment_id
    )
    SELECT COUNT(*), ARRAY_AGG(DISTINCT payment_id)
    INTO v_retried_count, v_payment_ids
    FROM updated;
    
    RETURN QUERY SELECT v_retried_count, v_payment_ids;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION retry_failed_notifications TO service_role;

-- View for notification delivery metrics
CREATE OR REPLACE VIEW v_notification_delivery_metrics AS
SELECT 
    notification_type,
    COUNT(*) as total_sent,
    COUNT(*) FILTER (WHERE delivery_status = 'delivered') as delivered_count,
    COUNT(*) FILTER (WHERE delivery_status = 'failed') as failed_count,
    COUNT(*) FILTER (WHERE email_sent = true) as email_count,
    COUNT(*) FILTER (WHERE sms_sent = true) as sms_count,
    ROUND(AVG(retry_count), 2) as avg_retry_count,
    MAX(sent_at) as last_sent_at
FROM payment_notifications
WHERE sent_at >= now() - interval '7 days'
GROUP BY notification_type;

GRANT SELECT ON v_notification_delivery_metrics TO authenticated;

-- Comments for documentation
COMMENT ON TABLE payment_notifications IS 'Tracks all payment notification attempts including UI messages, emails, and SMS';
COMMENT ON TABLE system_feature_flags IS 'Feature flags for gradual rollout and A/B testing';
COMMENT ON FUNCTION is_feature_enabled IS 'Checks if a feature flag is enabled';
COMMENT ON FUNCTION retry_failed_notifications IS 'Retries failed notifications with exponential backoff';
COMMENT ON VIEW v_notification_delivery_metrics IS 'Notification delivery success metrics over last 7 days';
