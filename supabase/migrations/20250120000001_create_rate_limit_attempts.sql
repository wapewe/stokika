-- Create rate_limit_attempts table for general rate limiting
-- 
-- This table stores rate limit attempts for various operations including:
-- - Login attempts
-- - Password reset requests
-- - Stock requests
-- - Payment intents
-- - M-Pesa callbacks
-- - API queries
--
-- Requirements:
-- - 22.1-22.6: Rate limiting for various operations
-- - 22.9: Store rate limit counters with TTL
-- - 22.10: Log rate limit violations to audit

CREATE TABLE IF NOT EXISTS rate_limit_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,           -- User ID, IP address, email, phone, or transaction ID
  operation TEXT NOT NULL,             -- Operation type: login, password_reset, stock_request, payment_intent, mpesa_callback, api_query
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for efficient rate limit queries
CREATE INDEX idx_rate_limit_attempts_identifier_operation ON rate_limit_attempts(identifier, operation);
CREATE INDEX idx_rate_limit_attempts_attempted_at ON rate_limit_attempts(attempted_at);
CREATE INDEX idx_rate_limit_attempts_operation ON rate_limit_attempts(operation);

-- Automatic cleanup function to remove old attempts (older than 24 hours)
-- This keeps the table size manageable and ensures we only track recent attempts
CREATE OR REPLACE FUNCTION cleanup_old_rate_limit_attempts()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM rate_limit_attempts
  WHERE attempted_at < (now() - INTERVAL '24 hours');
  
  RAISE NOTICE 'Cleaned up old rate limit attempts';
END;
$$;

-- Schedule cleanup to run daily (this would need to be set up via cron job or scheduled function)
COMMENT ON FUNCTION cleanup_old_rate_limit_attempts() IS 
'Removes rate limit attempts older than 24 hours. Should be run daily via scheduled job.';

-- Enable Row Level Security (no direct user access needed)
ALTER TABLE rate_limit_attempts ENABLE ROW LEVEL SECURITY;

-- Service role policy (Edge Functions can manage rate limits)
CREATE POLICY service_role_all ON rate_limit_attempts
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Comment
COMMENT ON TABLE rate_limit_attempts IS 
'Tracks rate limit attempts for various operations to prevent abuse and ensure fair usage.';
