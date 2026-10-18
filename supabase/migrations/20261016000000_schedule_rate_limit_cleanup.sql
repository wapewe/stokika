-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule rate limit cleanup every 10 minutes
-- The cleanup_old_rate_limits() function already exists from 20260918130851
-- 10-minute intervals reduce worst-case lockout duration after window expires
SELECT cron.schedule(
    'cleanup-rate-limits',
    '*/10 * * * *',  -- Every 10 minutes
    'SELECT cleanup_old_rate_limits();'
);

-- Verify the job was created
COMMENT ON FUNCTION cleanup_old_rate_limits IS 'Scheduled cleanup job: Removes rate_limits entries older than 2 hours to prevent permanent lockout';
