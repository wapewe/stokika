-- Create rate_limits table for Edge Function rate limiting
-- Requirements: Task 6.1 - Rate limiting for registration endpoint

-- Create rate_limits table
CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    namespace TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Indexes for fast lookups
    CONSTRAINT rate_limits_key_created_at_idx UNIQUE (key, created_at)
);

-- Index for efficient time-based queries
CREATE INDEX IF NOT EXISTS idx_rate_limits_key_created_at 
ON rate_limits(key, created_at DESC);

-- Index for namespace filtering
CREATE INDEX IF NOT EXISTS idx_rate_limits_namespace 
ON rate_limits(namespace);

-- Index for cleanup operations
CREATE INDEX IF NOT EXISTS idx_rate_limits_created_at 
ON rate_limits(created_at);

-- Add comment
COMMENT ON TABLE rate_limits IS 'Tracks API requests for rate limiting in Edge Functions';
COMMENT ON COLUMN rate_limits.key IS 'Composite key: namespace:ip_address';
COMMENT ON COLUMN rate_limits.ip_address IS 'Client IP address (extracted from X-Forwarded-For or CF-Connecting-IP)';
COMMENT ON COLUMN rate_limits.namespace IS 'Rate limit category (e.g., vendor_registration, auth_login)';
COMMENT ON COLUMN rate_limits.created_at IS 'Request timestamp for time-window calculations';

-- Enable Row Level Security
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can access rate_limits
CREATE POLICY "Service role only access" ON rate_limits
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Function to automatically clean up old rate limit entries
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete entries older than 2 hours (2x the longest rate limit window)
    DELETE FROM rate_limits
    WHERE created_at < now() - interval '2 hours';
END;
$$;

COMMENT ON FUNCTION cleanup_old_rate_limits IS 'Removes expired rate limit entries to prevent table bloat';

-- Create a scheduled job to run cleanup daily (using pg_cron if available)
-- If pg_cron is not available, cleanup is handled in the rate limiter code
-- Uncomment below if pg_cron extension is available:
-- SELECT cron.schedule(
--     'cleanup-rate-limits',
--     '0 */6 * * *',
--     'SELECT cleanup_old_rate_limits();'
-- );