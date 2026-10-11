-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests (required for net.http_post)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================================
-- Cron Schedule 1: Daily Scoring Update (2:00 AM UTC)
-- ============================================================================
-- This job recalculates all vendor and supplier scores daily
-- Runs at 2:00 AM to minimize load during business hours

SELECT cron.schedule(
  'daily-scoring-update',
  '0 2 * * *',  -- Cron expression: Every day at 2:00 AM UTC
  $$
    SELECT net.http_post(
      url := 'https://eidsqrnwfndruuufyacc.supabase.co/functions/v1/scheduled-scoring-update',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      )
    ) AS request_id;
  $$
);

-- ============================================================================
-- Cron Schedule 2: Daily Cycle Check (3:00 AM UTC)
-- ============================================================================
-- This job checks for overdue stock cycles and reduces vendor scores
-- Runs at 3:00 AM (after scoring update) to ensure scores are current

SELECT cron.schedule(
  'daily-cycle-check',
  '0 3 * * *',  -- Cron expression: Every day at 3:00 AM UTC
  $$
    SELECT net.http_post(
      url := 'https://eidsqrnwfndruuufyacc.supabase.co/functions/v1/scheduled-cycle-check',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      )
    ) AS request_id;
  $$
);

-- ============================================================================
-- Verify Cron Jobs
-- ============================================================================
-- Query to verify the cron jobs were created successfully
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  command
FROM cron.job
WHERE jobname IN ('daily-scoring-update', 'daily-cycle-check')
ORDER BY jobname;

-- ============================================================================
-- Helpful Queries for Monitoring
-- ============================================================================

-- View all cron jobs
-- SELECT * FROM cron.job ORDER BY jobname;

-- View cron job execution history
-- SELECT * FROM cron.job_run_details 
-- WHERE jobid IN (
--   SELECT jobid FROM cron.job 
--   WHERE jobname IN ('daily-scoring-update', 'daily-cycle-check')
-- )
-- ORDER BY start_time DESC 
-- LIMIT 50;

-- Unschedule a job (if needed)
-- SELECT cron.unschedule('daily-scoring-update');
-- SELECT cron.unschedule('daily-cycle-check');

-- ============================================================================
-- IMPORTANT: Service Role Key Configuration
-- ============================================================================
-- This migration uses a database setting to store the service role key.
-- You MUST set this up using the Supabase SQL Editor:
--
-- ALTER DATABASE postgres SET app.settings.service_role_key = 'your-actual-service-role-key-here';
--
-- Replace 'your-actual-service-role-key-here' with your actual Supabase service role key.
-- You can find this in: Supabase Dashboard → Settings → API → service_role key
--
-- After setting the key, reload the config:
-- SELECT pg_reload_conf();
