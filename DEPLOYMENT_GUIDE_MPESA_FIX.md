# M-Pesa Payment System - Critical Fixes Deployment Guide

## 🔥 Issues Fixed

1. **Rate Limiting 429 Errors** - Too many payment requests blocking users
2. **Permission Denied (42501)** - RLS policies blocking service_role on payment tables
3. **Missing RPC Function (404)** - Cron job calling non-existent `detect_timeout_payments_query`
4. **Foreign Key Violation** - payment_metrics table constraint errors

---

## 📋 Pre-Deployment Checklist

- [ ] Logged into Supabase Dashboard
- [ ] Project is linked and accessible
- [ ] Have appropriate database permissions
- [ ] Backup recommendation: Take a snapshot before applying migrations (optional but recommended)

---

## 🚀 Step 1: Apply Database Migrations

Go to your Supabase Dashboard → SQL Editor and run these migrations **IN ORDER**:

### Migration 1: Schedule Rate Limit Cleanup (20261016000000)
```sql
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
```

**Verify:** Run this query to confirm the cron job was created:
```sql
SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'cleanup-rate-limits';
```

---

### Migration 2: Fix Kit Tables Service Role (20261016000001)
```sql
-- Grant full table access to service_role on kit tables
-- Fixes 42501 permission denied errors in mpesa-stk-push edge function
GRANT ALL ON stokika_kit_payments TO service_role;
GRANT ALL ON stokika_kit_config TO service_role;

-- Ensure RLS is enabled (already is, but explicit here)
ALTER TABLE stokika_kit_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stokika_kit_config ENABLE ROW LEVEL SECURITY;

-- Create service_role policies that bypass all checks
DROP POLICY IF EXISTS stokika_kit_payments_service_role_all ON stokika_kit_payments;
CREATE POLICY stokika_kit_payments_service_role_all ON stokika_kit_payments
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS stokika_kit_config_service_role_all ON stokika_kit_config;
CREATE POLICY stokika_kit_config_service_role_all ON stokika_kit_config
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

COMMENT ON POLICY stokika_kit_payments_service_role_all ON stokika_kit_payments IS 
'Allow Edge Functions using service_role to manage kit payment records';

COMMENT ON POLICY stokika_kit_config_service_role_all ON stokika_kit_config IS 
'Allow Edge Functions using service_role to read kit configuration';
```

**Verify:** Run this query:
```sql
SELECT tablename, policyname, cmd, roles 
FROM pg_policies 
WHERE tablename IN ('stokika_kit_payments', 'stokika_kit_config')
  AND policyname LIKE '%service_role%';
```

---

### Migration 3: Fix Payment Events Service Role (20261016000002)
```sql
-- Grant full table access to service_role on payment_events
-- Fixes 42501 permission denied errors when logging payment audit events
GRANT ALL ON payment_events TO service_role;

-- Ensure RLS is enabled (already is, but explicit here)
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;

-- Create service_role policy
DROP POLICY IF EXISTS payment_events_service_role_all ON payment_events;
CREATE POLICY payment_events_service_role_all ON payment_events
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

COMMENT ON POLICY payment_events_service_role_all ON payment_events IS 
'Allow Edge Functions using service_role to log payment audit events';
```

**Verify:** Run this query:
```sql
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename = 'payment_events'
  AND policyname LIKE '%service_role%';
```

---

### Migration 4: Create Missing Timeout Query Function (20261016000003)
```sql
-- Create RPC function to detect timed-out payments
-- This function is called by the timeout-monitor Edge Function (cron job every minute)
-- Fixes missing RPC function error causing 404s in cron logs
CREATE OR REPLACE FUNCTION detect_timeout_payments_query()
RETURNS TABLE (
    id UUID,
    application_code TEXT,
    phone_number TEXT,
    checkout_request_id TEXT,
    kit_amount NUMERIC,
    created_at TIMESTAMPTZ,
    payment_status TEXT,
    flow_type VARCHAR(50),
    timeout_duration INTEGER,
    elapsed_seconds NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        kp.id,
        kp.application_code,
        kp.phone_number,
        kp.checkout_request_id,
        kp.kit_amount,
        kp.created_at,
        kp.payment_status,
        kp.flow_type,
        COALESCE(tc.timeout_duration, 90) AS timeout_duration,
        EXTRACT(EPOCH FROM (NOW() - kp.created_at)) AS elapsed_seconds
    FROM stokika_kit_payments kp
    LEFT JOIN payment_timeout_config tc ON kp.flow_type = tc.flow_type
    WHERE kp.payment_status = 'pending'
      AND kp.checkout_request_id IS NOT NULL
      AND EXTRACT(EPOCH FROM (NOW() - kp.created_at)) > COALESCE(tc.timeout_duration, 90);
END;
$$;

GRANT EXECUTE ON FUNCTION detect_timeout_payments_query() TO service_role;
GRANT EXECUTE ON FUNCTION detect_timeout_payments_query() TO authenticated;

COMMENT ON FUNCTION detect_timeout_payments_query IS 
'Returns pending payments that have exceeded their timeout_duration from payment_timeout_config';
```

**Verify:** Test the function:
```sql
SELECT * FROM detect_timeout_payments_query();
```
(Should return 0 rows if no timed-out payments exist)

---

### Migration 5: Fix Payment Metrics Foreign Key (20261016000004)
```sql
-- Drop the foreign key constraint on payment_metrics.payment_id
-- The column stores either stokika_kit_payments.id or payment_intents.id depending on flow_type
-- Enforcing a single FK is too restrictive and causes insert failures
ALTER TABLE payment_metrics 
DROP CONSTRAINT IF EXISTS payment_metrics_payment_id_fkey;

-- Make payment_id nullable (it may already be, but explicit here)
ALTER TABLE payment_metrics 
ALTER COLUMN payment_id DROP NOT NULL;

-- Add a comment explaining the column's dual purpose
COMMENT ON COLUMN payment_metrics.payment_id IS 
'Stores stokika_kit_payments.id for kit_payment flows, payment_intents.id for vendor_registration flows. No FK enforced due to multi-table reference.';

-- Create an index for fast lookups
CREATE INDEX IF NOT EXISTS idx_payment_metrics_payment_id 
ON payment_metrics(payment_id) 
WHERE payment_id IS NOT NULL;

-- Ensure service_role has access
GRANT ALL ON TABLE payment_metrics TO service_role;
```

**Verify:** Confirm FK is dropped:
```sql
SELECT conname FROM pg_constraint WHERE conname = 'payment_metrics_payment_id_fkey';
```
(Should return 0 rows)

---

## 🔧 Step 2: Deploy Edge Function

The Edge Function code has been updated with:
- ✅ Rate limit cleanup before counting
- ✅ Adjusted rate limits (5 per 10min for users, 10 per hour for phones)
- ✅ Correct payment_id handling for metrics

### Option A: Using Supabase CLI

If you have Supabase CLI installed:
```bash
# From your project directory
cd c:\Users\ADMIN\Music\stokika
supabase functions deploy mpesa-stk-push
```

### Option B: Using Supabase Dashboard

1. Go to Supabase Dashboard → Edge Functions
2. Find `mpesa-stk-push` function
3. Click "Deploy New Version"
4. The function should auto-deploy from your linked project

### Option C: Manual Verification

If deployment fails, you can verify the changes were made by checking:
```bash
# View the updated function
cat supabase\functions\mpesa-stk-push\index.ts | grep -A 10 "checkRateLimit"
```

---

## ✅ Step 3: Verification & Testing

### 1. Clear Old Rate Limits (Optional but Recommended)
If users are currently locked out, manually clean up:
```sql
-- Delete all rate limit entries older than 1 hour
DELETE FROM rate_limits 
WHERE created_at < NOW() - INTERVAL '1 hour';

-- Verify cleanup
SELECT COUNT(*) FROM rate_limits;
```

### 2. Test Rate Limiting
Try making a payment request and verify:
- No 429 errors occur for legitimate requests
- Rate_limits entries are created and cleaned up properly

### 3. Monitor Logs
Check Supabase Logs for:
- ❌ No more "permission denied for table" (42501) errors
- ❌ No more 404 errors for `detect_timeout_payments_query`
- ❌ No more foreign key constraint violations on payment_metrics
- ✅ Successful payment processing

### 4. Check Cron Jobs
```sql
-- Verify cron jobs are running without errors
SELECT 
  j.jobname,
  j.schedule,
  j.active,
  r.status,
  r.return_message,
  r.start_time
FROM cron.job j
LEFT JOIN cron.job_run_details r ON j.jobid = r.jobid
WHERE j.jobname IN ('cleanup-rate-limits', 'mpesa-timeout-monitor')
ORDER BY r.start_time DESC
LIMIT 10;
```

---

## 🔍 Monitoring Queries

### Rate Limits Health Check
```sql
-- Check rate_limits table size
SELECT 
  COUNT(*) as total_entries,
  MAX(created_at) as newest_entry,
  MIN(created_at) as oldest_entry,
  MAX(created_at) - MIN(created_at) as age_range
FROM rate_limits;

-- Should see entries no older than 2 hours
```

### Payment Metrics Health Check
```sql
-- Check recent payment metrics
SELECT 
  id,
  metric_type,
  payment_id,
  flow_type,
  timestamp
FROM payment_metrics
ORDER BY timestamp DESC
LIMIT 20;
```

### Permission Verification
```sql
-- Verify all service_role policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as operation
FROM pg_policies
WHERE policyname LIKE '%service_role%'
  AND tablename IN ('stokika_kit_payments', 'stokika_kit_config', 'payment_events', 'payment_metrics')
ORDER BY tablename;
```

---

## 🎯 Expected Results After Deployment

✅ Users can make payment requests without being permanently locked out
✅ Edge Function can insert into all payment tables without permission errors
✅ Cron jobs run without 404 errors
✅ Payment metrics are recorded for all payment flows
✅ Rate limit entries are automatically cleaned up every 10 minutes

---

## 🚨 Rollback Plan (If Needed)

If issues occur after deployment:

### Rollback Edge Function
```bash
# View deployment history
supabase functions list

# Revert to previous version
supabase functions deploy mpesa-stk-push --version <previous-version>
```

### Rollback Migrations
The migrations are **additive and permissive** - they grant access rather than restrict it. They are safe to leave applied. However, if you need to rollback:

```sql
-- Remove cron job
SELECT cron.unschedule('cleanup-rate-limits');

-- Remove policies (not recommended)
DROP POLICY IF EXISTS stokika_kit_payments_service_role_all ON stokika_kit_payments;
DROP POLICY IF EXISTS stokika_kit_config_service_role_all ON stokika_kit_config;
DROP POLICY IF EXISTS payment_events_service_role_all ON payment_events;

-- Remove function
DROP FUNCTION IF EXISTS detect_timeout_payments_query();
```

---

## 📞 Support

If you encounter issues:
1. Check Supabase logs for specific error messages
2. Verify all migrations were applied successfully
3. Confirm Edge Function deployed correctly
4. Review rate_limits table for unexpected entries

---

## 📝 Git Commit

After successful deployment, commit the changes:
```bash
git add supabase/migrations/20261016*.sql
git add supabase/functions/mpesa-stk-push/index.ts
git add .agents/tasks/mpesa-fix-plan.md
git commit -m "fix: resolve M-Pesa rate limiting, RLS permissions, and FK issues

- Add rate limit cleanup cron job (every 10 minutes)
- Grant service_role access to kit tables and payment_events
- Create missing detect_timeout_payments_query RPC function
- Fix payment_metrics FK constraint for multi-table references
- Update edge function with inline rate limit cleanup
- Adjust rate limits (5 per 10min users, 10 per hour phones)"
```

---

## ✨ Summary

This deployment fixes all four critical issues in the M-Pesa payment system:
1. **Rate limiting lockouts** resolved with automated cleanup
2. **Permission errors** fixed with proper RLS policies
3. **Missing RPC function** created for cron job
4. **Foreign key violations** eliminated by removing restrictive constraint

Total time: ~10-15 minutes for full deployment and verification.
