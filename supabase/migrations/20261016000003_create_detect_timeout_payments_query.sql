-- Create RPC function to detect timed-out payments
-- This function is called by the timeout-monitor Edge Function (cron job every minute)
-- Fixes missing RPC function error causing 404s in cron logs
CREATE OR REPLACE FUNCTION detect_timeout_payments_query()
RETURNS TABLE (
    id UUID,
    application_code TEXT,
    phone_number TEXT,
    checkout_request_id TEXT,
    kit_amount NUMERIC,
    created_at TIMESTAMPTZ,
    payment_status TEXT,
    flow_type VARCHAR(50),
    timeout_duration INTEGER,
    elapsed_seconds NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        kp.id,
        kp.application_code,
        kp.phone_number,
        kp.checkout_request_id,
        kp.kit_amount,
        kp.created_at,
        kp.payment_status,
        kp.flow_type,
        COALESCE(tc.timeout_duration, 90) AS timeout_duration,
        EXTRACT(EPOCH FROM (NOW() - kp.created_at)) AS elapsed_seconds
    FROM stokika_kit_payments kp
    LEFT JOIN payment_timeout_config tc ON kp.flow_type = tc.flow_type
    WHERE kp.payment_status = 'pending'
      AND kp.checkout_request_id IS NOT NULL
      AND EXTRACT(EPOCH FROM (NOW() - kp.created_at)) > COALESCE(tc.timeout_duration, 90);
END;
$$;

GRANT EXECUTE ON FUNCTION detect_timeout_payments_query() TO service_role;
GRANT EXECUTE ON FUNCTION detect_timeout_payments_query() TO authenticated;

COMMENT ON FUNCTION detect_timeout_payments_query IS 
'Returns pending payments that have exceeded their timeout_duration from payment_timeout_config';
