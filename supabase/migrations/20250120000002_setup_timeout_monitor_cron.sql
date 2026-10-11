-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant necessary permissions to postgres role for cron scheduling
GRANT USAGE ON SCHEMA cron TO postgres;

-- Schedule timeout-monitor Edge Function to run every minute
-- This monitors payments for timeouts and triggers automatic recovery
SELECT cron.schedule(
    'mpesa-timeout-monitor',
    '* * * * *',
    $$
    SELECT
      net.http_post(
          url:='https://eidsqrnwfndruuufyacc.supabase.co/functions/v1/timeout-monitor',
          headers:=jsonb_build_object(
              'Content-Type','application/json',
              'Authorization','Bearer ' || current_setting('app.settings.service_role_key', true)
          ),
          body:=jsonb_build_object('scheduled', true)
      ) as request_id;
    $$
);

-- Create a function to check timeout-monitor health
CREATE OR REPLACE FUNCTION check_timeout_monitor_health()
RETURNS TABLE (
    job_name text,
    schedule text,
    active boolean,
    last_run timestamptz,
    next_run timestamptz,
    run_count bigint,
    failure_count bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        j.jobname::text,
        j.schedule::text,
        j.active,
        (SELECT MAX(end_time) FROM cron.job_run_details WHERE jobid = j.jobid) as last_run,
        cron.schedule_next_run(j.schedule, CURRENT_TIMESTAMP) as next_run,
        (SELECT COUNT(*) FROM cron.job_run_details WHERE jobid = j.jobid) as run_count,
        (SELECT COUNT(*) FROM cron.job_run_details WHERE jobid = j.jobid AND status = 'failed') as failure_count
    FROM cron.job j
    WHERE j.jobname = 'mpesa-timeout-monitor';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on health check function
GRANT EXECUTE ON FUNCTION check_timeout_monitor_health() TO authenticated;
GRANT EXECUTE ON FUNCTION check_timeout_monitor_health() TO anon;

-- Create a view for monitor execution logs
CREATE OR REPLACE VIEW v_timeout_monitor_logs AS
SELECT 
    jrd.jobid,
    j.jobname,
    jrd.runid,
    jrd.status,
    jrd.return_message,
    jrd.start_time,
    jrd.end_time,
    EXTRACT(EPOCH FROM (jrd.end_time - jrd.start_time)) as duration_seconds
FROM cron.job_run_details jrd
JOIN cron.job j ON j.jobid = jrd.jobid
WHERE j.jobname = 'mpesa-timeout-monitor'
ORDER BY jrd.start_time DESC
LIMIT 100;

-- Grant access to monitor logs view
GRANT SELECT ON v_timeout_monitor_logs TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION check_timeout_monitor_health() IS 'Checks the health status of the M-Pesa timeout monitor cron job including last run time, next scheduled run, and failure count';
COMMENT ON VIEW v_timeout_monitor_logs IS 'Last 100 execution logs for the M-Pesa timeout monitor cron job';
