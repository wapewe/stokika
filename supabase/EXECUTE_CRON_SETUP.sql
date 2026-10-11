-- ============================================================================
-- Stokika Cron Schedule Setup
-- ============================================================================
-- This script sets up automated daily schedules for:
-- 1. Vendor/Supplier scoring updates (2:00 AM UTC / 5:00 AM EAT)
-- 2. Overdue cycle checks (3:00 AM UTC / 6:00 AM EAT)
-- ============================================================================

-- Step 1: Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Step 2: Configure service role key for HTTP requests
ALTER DATABASE postgres SET app.settings.service_role_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpZHNxcm53Zm5kcnV1dWZ5YWNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzczNzExMSwiZXhwIjoyMTAzMzEzMTExfQ.raUxm25hOkZxtoMT3FRZwgXHMpVK9py0b0bwufZdFcM';
SELECT pg_reload_conf();

-- Step 3: Schedule daily scoring update (2:00 AM UTC)
SELECT cron.schedule(
  'daily-scoring-update',
  '0 2 * * *',
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

-- Step 4: Schedule daily cycle check (3:00 AM UTC)
SELECT cron.schedule(
  'daily-cycle-check',
  '0 3 * * *',
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

-- Step 5: Verify cron jobs were created
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
-- 1     | daily-cycle-check      | 0 3 * * *  | t      | SELECT net.http...
-- 2     | daily-scoring-update   | 0 2 * * *  | t      | SELECT net.http...
-- ============================================================================

-- ============================================================================
-- Test Manual Execution (Optional)
-- ============================================================================
-- Uncomment and run these to test the functions immediately:

-- Test scoring update
-- SELECT net.http_post(
--   url := 'https://eidsqrnwfndruuufyacc.supabase.co/functions/v1/scheduled-scoring-update',
--   headers := jsonb_build_object(
--     'Content-Type', 'application/json',
--     'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpZHNxcm53Zm5kcnV1dWZ5YWNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzczNzExMSwiZXhwIjoyMTAzMzEzMTExfQ.raUxm25hOkZxtoMT3FRZwgXHMpVK9py0b0bwufZdFcM'
--   )
-- );

-- Test cycle check
-- SELECT net.http_post(
--   url := 'https://eidsqrnwfndruuufyacc.supabase.co/functions/v1/scheduled-cycle-check',
--   headers := jsonb_build_object(
--     'Content-Type', 'application/json',
--     'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpZHNxcm53Zm5kcnV1dWZ5YWNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzczNzExMSwiZXhwIjoyMTAzMzEzMTExfQ.raUxm25hOkZxtoMT3FRZwgXHMpVK9py0b0bwufZdFcM'
--   )
-- );

-- ============================================================================
-- Monitor Execution History
-- ============================================================================
-- Run this query to view execution history:

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
-- Next Steps:
-- ============================================================================
-- 1. Copy this entire script
-- 2. Go to Supabase Dashboard → SQL Editor
-- 3. Create a new query
-- 4. Paste and execute this script
-- 5. Verify you see 2 cron jobs in the output
-- 6. (Optional) Test manual execution by uncommenting test queries above
-- 7. Monitor first scheduled run tomorrow morning
-- ============================================================================
