-- Task 10.4: Implement error logging and alerting for M-Pesa timeout handling

-- Create payment_timeout_events table for detailed timeout logging
CREATE TABLE IF NOT EXISTS payment_timeout_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id uuid NOT NULL REFERENCES stokika_kit_payments(id) ON DELETE CASCADE,
    event_type text NOT NULL CHECK (event_type IN (
        'timeout_detected',
        'status_query_initiated',
        'status_query_success',
        'status_query_failure',
        'auto_recovery_success',
        'manual_fallback_triggered',
        'manual_verification_approved',
        'manual_verification_rejected'
    )),
    event_timestamp timestamptz NOT NULL DEFAULT now(),
    flow_type text,
    payment_amount numeric(10,2),
    phone_number_masked text,
    checkout_request_id text,
    merchant_request_id text,
    mpesa_response jsonb,
    error_message text,
    error_code text,
    admin_user_id uuid REFERENCES profiles(id),
    context jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_payment_timeout_events_payment_id ON payment_timeout_events(payment_id);
CREATE INDEX idx_payment_timeout_events_event_type ON payment_timeout_events(event_type);
CREATE INDEX idx_payment_timeout_events_timestamp ON payment_timeout_events(event_timestamp DESC);
CREATE INDEX idx_payment_timeout_events_flow_type ON payment_timeout_events(flow_type) WHERE flow_type IS NOT NULL;

-- Create alert thresholds configuration table
CREATE TABLE IF NOT EXISTS payment_alert_thresholds (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type text NOT NULL UNIQUE CHECK (alert_type IN (
        'high_timeout_rate',
        'high_status_query_failure_rate',
        'manual_verification_queue_length',
        'monitor_consecutive_failures'
    )),
    threshold_value numeric NOT NULL,
    evaluation_period_minutes int NOT NULL DEFAULT 60,
    alert_enabled boolean NOT NULL DEFAULT true,
    last_triggered_at timestamptz,
    notification_channels jsonb DEFAULT '["email", "dashboard"]'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Insert default alert thresholds
INSERT INTO payment_alert_thresholds (alert_type, threshold_value, evaluation_period_minutes) VALUES
    ('high_timeout_rate', 20.0, 60),
    ('high_status_query_failure_rate', 50.0, 60),
    ('manual_verification_queue_length', 10, 15),
    ('monitor_consecutive_failures', 3, 5)
ON CONFLICT (alert_type) DO NOTHING;

-- Function to log payment timeout events
CREATE OR REPLACE FUNCTION log_payment_timeout_event(
    p_payment_id uuid,
    p_event_type text,
    p_flow_type text DEFAULT NULL,
    p_payment_amount numeric DEFAULT NULL,
    p_phone_masked text DEFAULT NULL,
    p_checkout_request_id text DEFAULT NULL,
    p_merchant_request_id text DEFAULT NULL,
    p_mpesa_response jsonb DEFAULT NULL,
    p_error_message text DEFAULT NULL,
    p_error_code text DEFAULT NULL,
    p_admin_user_id uuid DEFAULT NULL,
    p_context jsonb DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
    v_event_id uuid;
BEGIN
    INSERT INTO payment_timeout_events (
        payment_id,
        event_type,
        flow_type,
        payment_amount,
        phone_number_masked,
        checkout_request_id,
        merchant_request_id,
        mpesa_response,
        error_message,
        error_code,
        admin_user_id,
        context
    ) VALUES (
        p_payment_id,
        p_event_type,
        p_flow_type,
        p_payment_amount,
        p_phone_masked,
        p_checkout_request_id,
        p_merchant_request_id,
        p_mpesa_response,
        p_error_message,
        p_error_code,
        p_admin_user_id,
        p_context
    ) RETURNING id INTO v_event_id;
    
    RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check timeout rate alert
CREATE OR REPLACE FUNCTION check_timeout_rate_alert()
RETURNS TABLE (
    alert_triggered boolean,
    current_rate numeric,
    threshold numeric,
    evaluation_period_minutes int,
    total_payments bigint,
    timeout_count bigint
) AS $$
DECLARE
    v_threshold record;
    v_current_rate numeric;
    v_total_payments bigint;
    v_timeout_count bigint;
BEGIN
    SELECT threshold_value, evaluation_period_minutes, alert_enabled
    INTO v_threshold
    FROM payment_alert_thresholds
    WHERE alert_type = 'high_timeout_rate';
    
    IF NOT FOUND OR NOT v_threshold.alert_enabled THEN
        RETURN QUERY SELECT false, 0::numeric, 0::numeric, 0, 0::bigint, 0::bigint;
        RETURN;
    END IF;
    
    SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE payment_status = 'timeout') as timeouts
    INTO v_total_payments, v_timeout_count
    FROM stokika_kit_payments
    WHERE created_at >= now() - (v_threshold.evaluation_period_minutes || ' minutes')::interval
    AND payment_status IN ('completed', 'timeout', 'failed');
    
    IF v_total_payments > 0 THEN
        v_current_rate := (v_timeout_count::numeric / v_total_payments::numeric) * 100;
    ELSE
        v_current_rate := 0;
    END IF;
    
    RETURN QUERY SELECT 
        (v_current_rate > v_threshold.threshold_value),
        v_current_rate,
        v_threshold.threshold_value,
        v_threshold.evaluation_period_minutes,
        v_total_payments,
        v_timeout_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for active alerts dashboard
CREATE OR REPLACE VIEW v_active_payment_alerts AS
SELECT 
    'high_timeout_rate' as alert_type,
    (SELECT alert_triggered FROM check_timeout_rate_alert()) as is_active,
    (SELECT current_rate FROM check_timeout_rate_alert()) as current_value,
    (SELECT threshold FROM check_timeout_rate_alert()) as threshold_value,
    (SELECT last_triggered_at FROM payment_alert_thresholds WHERE alert_type = 'high_timeout_rate') as last_triggered;

-- Grant permissions
GRANT EXECUTE ON FUNCTION log_payment_timeout_event TO authenticated, anon;
GRANT EXECUTE ON FUNCTION check_timeout_rate_alert TO authenticated;
GRANT SELECT ON v_active_payment_alerts TO authenticated;
GRANT SELECT ON payment_timeout_events TO authenticated;
GRANT SELECT, UPDATE ON payment_alert_thresholds TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE payment_timeout_events IS 'Detailed event log for all M-Pesa payment timeout handling activities';
COMMENT ON TABLE payment_alert_thresholds IS 'Configuration for automated alerting thresholds';
COMMENT ON FUNCTION log_payment_timeout_event IS 'Logs a payment timeout event with full context for monitoring and debugging';
COMMENT ON FUNCTION check_timeout_rate_alert IS 'Checks if current timeout rate exceeds configured threshold';
COMMENT ON VIEW v_active_payment_alerts IS 'Real-time view of all active payment system alerts';
