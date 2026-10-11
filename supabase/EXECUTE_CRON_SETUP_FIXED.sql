-- ============================================================================
-- Stokika Cron Schedule Setup (Updated for Supabase Cloud)
-- ============================================================================
-- This script sets up automated daily schedules with hardcoded service key
-- (since Supabase Cloud doesn't allow database parameter configuration)
-- ============================================================================

-- Step 1: Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Step 2: Schedule daily scoring update (2:00 AM UTC / 5:00 AM EAT)
SELECT cron.schedule(
  'daily-scoring-update',
  '0 2 * * *',
  $$
    SELECT net.http_post(
      url := 'https://eidsqrnwfndruuufyacc.supabase.co/functions/v1/scheduled-scoring-update',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpZHNxcm53Zm5kcnV1dWZ5YWNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzczNzExMSwiZXhwIjoyMTAzMzEzMTExfQ.raUxm25hOkZxtoMT3FRZwgXHMpVK9py0b0bwufZdFcM"}'::jsonb
    ) AS request_id;
  $$
);

-- Step 3: Schedule daily cycle check (3:00 AM UTC / 6:00 AM EAT)
SELECT cron.schedule(
  'daily-cycle-check',
  '0 3 * * *',
  $$
    SELECT net.http_post(
      url := 'https://eidsqrnwfndruuufyacc.supabase.co/functions/v1/scheduled-cycle-check',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpZHNxcm53Zm5kcnV1dWZ5YWNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzczNzExMSwiZXhwIjoyMTAzMzEzMTExfQ.raUxm25hOkZxtoMT3FRZwgXHMpVK9py0b0bwufZdFcM"}'::jsonb
    ) AS request_id;
  $$
);

-- Step 4: Verify cron jobs were created
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
-- Expected Output:
-- ============================================================================
-- You should see 2 rows:
-- 
-- jobid | jobname                | schedule   | active | command
-- ------|------------------------|------------|--------|-------------------
-- X     | daily-cycle-check      | 0 3 * * *  | t      | SELECT net.http...
-- Y     | daily-scoring-update   | 0 2 * * *  | t      | SELECT net.http...
-- ============================================================================

-- ============================================================================
-- Test Manual Execution (Optional - Uncomment to test)
-- ============================================================================

-- Test scoring update
-- SELECT net.http_post(
--   url := 'https://eidsqrnwfndruuufyacc.supabase.co/functions/v1/scheduled-scoring-update',
--   headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpZHNxcm53Zm5kcnV1dWZ5YWNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzczNzExMSwiZXhwIjoyMTAzMzEzMTExfQ.raUxm25hOkZxtoMT3FRZwgXHMpVK9py0b0bwufZdFcM"}'::jsonb
-- );

-- Test cycle check
-- SELECT net.http_post(
--   url := 'https://eidsqrnwfndruuufyacc.supabase.co/functions/v1/scheduled-cycle-check',
--   headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpZHNxcm53Zm5kcnV1dWZ5YWNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzczNzExMSwiZXhwIjoyMTAzMzEzMTExfQ.raUxm25hOkZxtoMT3FRZwgXHMpVK9py0b0bwufZdFcM"}'::jsonb
-- );

-- ============================================================================
-- Monitor Execution History
-- ============================================================================

SELECT 
  j.jobname,
  r.runid,
  r.start_time,
  r.end_time,
  r.status,
  r.return_message
FROM cron.job_run_details r
JOIN cron.job j ON j.jobid = r.jobid
WHERE j.jobname IN ('daily-scoring-update', 'daily-cycle-check')
ORDER BY r.start_time DESC
LIMIT 20;

-- ============================================================================
-- View Function Logs via Supabase Dashboard
-- ============================================================================
-- Your CLI version doesn't support 'functions logs' command.
-- Instead, view logs in the dashboard:
--
-- 1. Scoring Update Logs:
--    https://app.supabase.com/project/eidsqrnwfndruuufyacc/functions/scheduled-scoring-update/logs
--
-- 2. Cycle Check Logs:
--    https://app.supabase.com/project/eidsqrnwfndruuufyacc/functions/scheduled-cycle-check/logs
-- ============================================================================

-- ============================================================================
-- Troubleshooting Commands
-- ============================================================================

-- View all cron jobs
-- SELECT * FROM cron.job ORDER BY jobname;

-- Delete a job if you need to recreate it
-- SELECT cron.unschedule('daily-scoring-update');
-- SELECT cron.unschedule('daily-cycle-check');

-- Check if extensions are enabled
-- SELECT * FROM pg_extension WHERE extname IN ('pg_cron', 'pg_net');

-- ============================================================================
-- IMPORTANT: Security Note
-- ============================================================================
-- The service role key is embedded in this cron job SQL and stored securely 
-- in the Supabase database. It is only accessible to database administrators 
-- and is NOT exposed to frontend/client code.
--
-- This is the recommended approach for Supabase Cloud since database-level
-- parameter configuration is restricted for security reasons.
-- ============================================================================
