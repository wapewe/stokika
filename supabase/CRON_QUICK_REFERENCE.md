# Cron Schedule Quick Reference

## ⚡ Quick Setup (3 Steps)

### 1️⃣ Get Service Role Key
- Go to Supabase Dashboard → Settings → API
- Copy the **service_role** key (secret)

### 2️⃣ Apply Migration
Open Supabase SQL Editor and run:
```sql
-- File: supabase/migrations/20260914210236_setup_cron_schedules.sql
-- Copy and paste the entire file contents
```

### 3️⃣ Configure Service Key
In SQL Editor, run (replace with your actual key):
```sql
ALTER DATABASE postgres SET app.settings.service_role_key = 'eyJhbGc...YOUR_KEY_HERE';
SELECT pg_reload_conf();
```

## 📅 Schedule Summary

| Job Name | Time (UTC) | Time (EAT) | Function | Purpose |
|----------|------------|------------|----------|---------|
| `daily-scoring-update` | 2:00 AM | 5:00 AM | scheduled-scoring-update | Recalculate all vendor/supplier scores |
| `daily-cycle-check` | 3:00 AM | 6:00 AM | scheduled-cycle-check | Mark overdue cycles, reduce scores |

## ✅ Verify Setup

```sql
-- Check jobs are scheduled
SELECT jobid, jobname, schedule, active 
FROM cron.job 
WHERE jobname IN ('daily-scoring-update', 'daily-cycle-check');
```

Expected: 2 rows, both `active = true`

## 📊 Monitor Execution

```sql
-- View recent runs
SELECT j.jobname, r.start_time, r.status, r.return_message
FROM cron.job_run_details r
JOIN cron.job j ON j.jobid = r.jobid
WHERE j.jobname IN ('daily-scoring-update', 'daily-cycle-check')
ORDER BY r.start_time DESC
LIMIT 10;
```

## 🧪 Test Manually

```sql
-- Test scoring update
SELECT net.http_post(
  url := 'https://eidsqrnwfndruuufyacc.supabase.co/functions/v1/scheduled-scoring-update',
  headers := jsonb_build_object(
    'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
  )
);

-- Test cycle check
SELECT net.http_post(
  url := 'https://eidsqrnwfndruuufyacc.supabase.co/functions/v1/scheduled-cycle-check',
  headers := jsonb_build_object(
    'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
  )
);
```

## 🔧 Common Commands

```sql
-- View all cron jobs
SELECT * FROM cron.job;

-- Unschedule a job
SELECT cron.unschedule('daily-cycle-check');

-- Reschedule with new time
SELECT cron.schedule('daily-cycle-check', '0 4 * * *', $$ ... $$);
```

## 📱 View Logs (CLI)

```bash
# Scoring update logs
supabase functions logs scheduled-scoring-update --tail

# Cycle check logs
supabase functions logs scheduled-cycle-check --tail
```

## 🚨 Troubleshooting

**Jobs not running?**
1. Check extensions: `SELECT * FROM pg_extension WHERE extname IN ('pg_cron', 'pg_net');`
2. Verify key: `SELECT current_setting('app.settings.service_role_key', true);`
3. Check job status: `SELECT * FROM cron.job WHERE active = false;`

**Function fails?**
1. Test manually using SQL above
2. Check function logs
3. Verify functions are deployed: `supabase functions list`

## 📖 Full Documentation
See: `supabase/CRON_SETUP_GUIDE.md`

## 🔗 Related Files
- Migration: `supabase/migrations/20260914210236_setup_cron_schedules.sql`
- Functions: 
  - `supabase/functions/scheduled-scoring-update/`
  - `supabase/functions/scheduled-cycle-check/`
