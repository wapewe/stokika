# Cron Schedule Setup Guide

## Overview

This guide explains how to set up automated daily schedules for:
1. **scheduled-scoring-update** - Recalculates vendor and supplier scores (2:00 AM UTC)
2. **scheduled-cycle-check** - Checks for overdue payment cycles (3:00 AM UTC)

## Prerequisites

- Supabase project: `eidsqrnwfndruuufyacc`
- Both Edge Functions deployed
- Access to Supabase Dashboard SQL Editor
- Your Supabase Service Role Key

## Step 1: Get Your Service Role Key

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project: **stokika**
3. Navigate to **Settings** → **API**
4. Find **service_role** key (labeled as "secret")
5. Click to reveal and copy the key
6. **IMPORTANT**: Never commit this key to version control

## Step 2: Apply the Migration

### Option A: Using Supabase Dashboard (Recommended)

1. Go to **SQL Editor** in your Supabase Dashboard
2. Create a new query
3. Paste the contents of `20260914210236_setup_cron_schedules.sql`
4. Execute the query
5. Verify output shows 2 rows (both cron jobs)

### Option B: Using Supabase CLI

```bash
# Push migration to remote database
supabase db push

# Or apply specific migration
supabase migration up --db-url "postgresql://postgres:[password]@db.eidsqrnwfndruuufyacc.supabase.co:5432/postgres"
```

## Step 3: Configure Service Role Key

In the Supabase SQL Editor, run:

```sql
ALTER DATABASE postgres SET app.settings.service_role_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

**Replace the value with your actual service role key from Step 1.**

Then reload the configuration:

```sql
SELECT pg_reload_conf();
```

## Step 4: Verify Cron Jobs

### Check Jobs are Scheduled

```sql
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  command
FROM cron.job
WHERE jobname IN ('daily-scoring-update', 'daily-cycle-check')
ORDER BY jobname;
```

Expected output:
```
jobid | jobname                | schedule   | active | command
------|------------------------|------------|--------|-------------------
1     | daily-cycle-check      | 0 3 * * *  | t      | SELECT net.http...
2     | daily-scoring-update   | 0 2 * * *  | t      | SELECT net.http...
```

### Test Manual Execution (Optional)

You can manually trigger the cron jobs to test them:

```sql
-- Test scoring update
SELECT net.http_post(
  url := 'https://eidsqrnwfndruuufyacc.supabase.co/functions/v1/scheduled-scoring-update',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
  )
) AS request_id;

-- Test cycle check
SELECT net.http_post(
  url := 'https://eidsqrnwfndruuufyacc.supabase.co/functions/v1/scheduled-cycle-check',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
  )
) AS request_id;
```

## Step 5: Monitor Execution

### View Cron Job History

```sql
SELECT 
  j.jobname,
  r.runid,
  r.job_pid,
  r.start_time,
  r.end_time,
  r.status,
  r.return_message
FROM cron.job_run_details r
JOIN cron.job j ON j.jobid = r.jobid
WHERE j.jobname IN ('daily-scoring-update', 'daily-cycle-check')
ORDER BY r.start_time DESC
LIMIT 20;
```

### View Function Logs

Using Supabase CLI:

```bash
# View scoring update logs
supabase functions logs scheduled-scoring-update --tail

# View cycle check logs
supabase functions logs scheduled-cycle-check --tail
```

Using Supabase Dashboard:
1. Go to **Edge Functions**
2. Select the function
3. Click **Logs** tab

### Check Audit Logs

```sql
-- Check recent system jobs
SELECT 
  action_type,
  resource_type,
  action_status,
  details,
  created_at
FROM audit_logs
WHERE user_id IS NULL  -- System actions
  AND action_type IN ('configuration_changed', 'vendor_score_changed', 'delivery_status_changed')
  AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 50;
```

## Schedule Details

### Daily Scoring Update (2:00 AM UTC)
- **Job Name**: `daily-scoring-update`
- **Schedule**: `0 2 * * *` (Every day at 2:00 AM UTC)
- **Function**: `scheduled-scoring-update`
- **Purpose**: Recalculates all vendor and supplier scores

### Daily Cycle Check (3:00 AM UTC)
- **Job Name**: `daily-cycle-check`
- **Schedule**: `0 3 * * *` (Every day at 3:00 AM UTC)
- **Function**: `scheduled-cycle-check`
- **Purpose**: Marks overdue cycles and reduces vendor scores

**Why this sequence?**
- Scoring update runs first to refresh all base scores
- Cycle check runs after to apply overdue penalties
- Ensures vendor scores are current before additional deductions

## Troubleshooting

### Cron Jobs Not Running

1. **Check if pg_cron is enabled:**
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_cron';
   ```

2. **Check if pg_net is enabled:**
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_net';
   ```

3. **Verify service role key is set:**
   ```sql
   SELECT current_setting('app.settings.service_role_key', true);
   ```
   (Should return your service role key)

### Function Execution Fails

1. **Check function deployment:**
   ```bash
   supabase functions list
   ```

2. **Test function manually:**
   ```bash
   curl -X POST \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
     https://eidsqrnwfndruuufyacc.supabase.co/functions/v1/scheduled-scoring-update
   ```

3. **Check function logs for errors:**
   ```bash
   supabase functions logs scheduled-scoring-update
   ```

### HTTP Request Fails

Check the cron job execution details:
```sql
SELECT * FROM cron.job_run_details 
WHERE status = 'failed'
ORDER BY start_time DESC;
```

## Unscheduling Jobs (If Needed)

To disable or remove a cron job:

```sql
-- Unschedule scoring update
SELECT cron.unschedule('daily-scoring-update');

-- Unschedule cycle check
SELECT cron.unschedule('daily-cycle-check');
```

To reschedule with different timing:

```sql
-- First unschedule
SELECT cron.unschedule('daily-cycle-check');

-- Then reschedule with new time
SELECT cron.schedule(
  'daily-cycle-check',
  '0 4 * * *',  -- New time: 4:00 AM UTC
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
```

## Time Zone Considerations

**IMPORTANT**: Cron schedules in pg_cron use UTC timezone.

- **2:00 AM UTC** = 5:00 AM EAT (East Africa Time, UTC+3)
- **3:00 AM UTC** = 6:00 AM EAT

To change the schedule for your local timezone:

```
UTC Time  | EAT Time | Cron Expression
----------|----------|----------------
0 2 * * * | 5:00 AM  | Daily scoring update
0 3 * * * | 6:00 AM  | Daily cycle check
```

Example for running at midnight EAT (9:00 PM UTC previous day):

```sql
SELECT cron.schedule(
  'daily-cycle-check',
  '0 21 * * *',  -- 9:00 PM UTC = Midnight EAT
  ...
);
```

## Security Notes

1. **Service Role Key**: Stored in database configuration, not in code
2. **Never expose** service role key in:
   - Version control (Git)
   - Client-side code
   - Public documentation
   - Environment variables in frontend
3. **Access Control**: Only database administrators can view/modify cron jobs
4. **Audit Trail**: All function executions are logged to audit_logs table

## Support

For issues or questions:
1. Check function logs: `supabase functions logs <function-name>`
2. Check cron history: Query `cron.job_run_details`
3. Check audit logs: Query `audit_logs` table
4. Review Edge Function documentation in respective README.md files

## Related Files

- Migration: `supabase/migrations/20260914210236_setup_cron_schedules.sql`
- Scoring Update Function: `supabase/functions/scheduled-scoring-update/`
- Cycle Check Function: `supabase/functions/scheduled-cycle-check/`
- Requirements: `.kiro/specs/stokika-typescript-rebuild/requirements.md` (Req 10.11, 19.9-19.11)
