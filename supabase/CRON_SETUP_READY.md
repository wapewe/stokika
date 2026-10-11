# ✅ Cron Schedule Setup - Ready to Execute

## 🎯 What's Been Prepared

I've created a complete pg_cron setup for your Stokika project with:

### 📅 Scheduled Jobs
1. **daily-scoring-update** → Runs at 2:00 AM UTC (5:00 AM EAT)
   - Recalculates all vendor and supplier scores
   - Function: `scheduled-scoring-update`

2. **daily-cycle-check** → Runs at 3:00 AM UTC (6:00 AM EAT)  
   - Checks for overdue payment cycles
   - Updates cycle status to "overdue"
   - Reduces vendor scores for late payments
   - Function: `scheduled-cycle-check`

### 📁 Files Created

1. **EXECUTE_CRON_SETUP.sql** ⭐ **START HERE**
   - Complete SQL script with your service role key
   - Ready to execute in Supabase SQL Editor
   - Includes verification queries

2. **CRON_SETUP_GUIDE.md**
   - Comprehensive 200+ line guide
   - Troubleshooting steps
   - Monitoring queries
   - Time zone conversions

3. **CRON_QUICK_REFERENCE.md**
   - Quick reference card
   - Common commands
   - SQL snippets for monitoring

4. **20260914210236_setup_cron_schedules.sql** (Migration)
   - Template migration file
   - Can be used for version control

## 🚀 Execute Now (3 Steps)

### Step 1: Open Supabase SQL Editor
Go to: https://app.supabase.com/project/eidsqrnwfndruuufyacc/sql

### Step 2: Copy and Run the SQL Script
1. Open file: `supabase/EXECUTE_CRON_SETUP.sql`
2. Copy the entire contents
3. Paste into SQL Editor
4. Click **Run** button

### Step 3: Verify Output
You should see 2 rows in the result:

```
jobid | jobname                | schedule   | active
------|------------------------|------------|--------
1     | daily-cycle-check      | 0 3 * * *  | t
2     | daily-scoring-update   | 0 2 * * *  | t
```

✅ Both jobs should show `active = t` (true)

## 🧪 Optional: Test Immediately

After setup, you can test the functions manually by uncommenting these lines in the SQL script:

```sql
-- Test scoring update
SELECT net.http_post(
  url := 'https://eidsqrnwfndruuufyacc.supabase.co/functions/v1/scheduled-scoring-update',
  headers := jsonb_build_object(
    'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
  )
);
```

This will trigger an immediate execution without waiting for the scheduled time.

## 📊 Monitor Execution

### View Cron Job History
```sql
SELECT 
  j.jobname,
  r.start_time,
  r.end_time,
  r.status,
  r.return_message
FROM cron.job_run_details r
JOIN cron.job j ON j.jobid = r.jobid
WHERE j.jobname IN ('daily-scoring-update', 'daily-cycle-check')
ORDER BY r.start_time DESC
LIMIT 10;
```

### View Function Logs (CLI)
```bash
# Scoring update
supabase functions logs scheduled-scoring-update --tail

# Cycle check
supabase functions logs scheduled-cycle-check --tail
```

### Check Audit Logs
```sql
SELECT 
  action_type,
  resource_type,
  action_status,
  details->>'job_type' as job_type,
  created_at
FROM audit_logs
WHERE user_id IS NULL
  AND details->>'job_type' IN ('scheduled_scoring_update', 'scheduled_cycle_check')
ORDER BY created_at DESC
LIMIT 20;
```

## ⏰ Schedule Summary

| Time (UTC) | Time (EAT) | Job | What Happens |
|------------|------------|-----|--------------|
| 2:00 AM | 5:00 AM | daily-scoring-update | Recalculates all vendor/supplier scores based on payment history, order fulfillment, etc. |
| 3:00 AM | 6:00 AM | daily-cycle-check | Identifies overdue payment cycles, marks them as overdue, recalculates affected vendor scores |

**Why this sequence?**
- Scoring update runs first to establish baseline scores
- Cycle check runs after to apply overdue penalties
- Ensures vendor scores reflect both base performance and payment compliance

## 🔧 Troubleshooting

### If Jobs Don't Appear
```sql
-- Check extensions are enabled
SELECT * FROM pg_extension WHERE extname IN ('pg_cron', 'pg_net');
```

Expected: 2 rows (both extensions)

### If Service Key Not Found
```sql
-- Verify key is set
SELECT current_setting('app.settings.service_role_key', true);
```

Should return your service role key

### If Function Fails
1. Verify functions are deployed:
   ```bash
   supabase functions list
   ```

2. Check function logs for errors
3. Test function manually using the test queries

## 🔒 Security Notes

- ✅ Service role key stored in database configuration (not in code)
- ✅ Key never exposed to frontend/client code
- ✅ All executions logged to audit_logs table
- ✅ Only database administrators can view/modify cron jobs

## 📚 Documentation

Full documentation available in:
- `supabase/CRON_SETUP_GUIDE.md` - Complete guide
- `supabase/CRON_QUICK_REFERENCE.md` - Quick reference
- `supabase/functions/scheduled-scoring-update/README.md` - Scoring function docs
- `supabase/functions/scheduled-cycle-check/README.md` - Cycle check function docs

## ✅ Summary

Your cron schedule is ready to deploy! Just:
1. Open Supabase SQL Editor
2. Run `EXECUTE_CRON_SETUP.sql`
3. Verify 2 jobs are active
4. (Optional) Test manually
5. Monitor execution starting tomorrow

**Project:** stokika (eidsqrnwfndruuufyacc)
**Environment:** Production
**Next Execution:** Tomorrow at 2:00 AM UTC (5:00 AM EAT)
