# M-Pesa STK Push Fixes - Implementation Summary

## Overview
Fixed four critical issues in the M-Pesa payment flow that were causing 429 rate limiting errors, RLS permission denied errors, missing RPC function errors, and foreign key constraint violations.

## Changes Made

### 1. Rate Limiting Fix
**File**: `supabase/functions/mpesa-stk-push/index.ts`

**Changes**:
- Added inline cleanup of expired rate limit entries before counting (lines 60-65)
- Fixed rate limit threshold inversion (line 54):
  - User: Changed from 5 to 10 requests per 600 seconds (10 minutes)
  - Phone: Changed from 10 to 5 requests per 3600 seconds (1 hour)

**Migration**: `supabase/migrations/20261016000000_schedule_rate_limit_cleanup.sql`
- Schedules pg_cron job to run `cleanup_old_rate_limits()` every 30 minutes
- Provides automatic cleanup as backup to inline deletion

**Why**: 
- Previous implementation never deleted old rate_limit rows, causing permanent lockout
- Original thresholds were inverted - users need more attempts (retries after timeouts) than phone-level limits
- 10 attempts per 10 minutes allows 4-5 legitimate retries without enabling abuse

---

### 2. RLS Permission Fixes
**Migrations**:
1. `20261011183029_fix_service_role_permissions.sql` - Already existed, covers:
   - payment_timeout_config
   - rate_limits
   - payment_transactions
   - payment_intents
   - payment_notifications
   - payment_metrics

2. `20261016000001_fix_kit_tables_service_role.sql` - Created for:
   - stokika_kit_payments
   - stokika_kit_config

3. `20261016000002_fix_payment_events_service_role.sql` - Created for:
   - payment_events

**What**: 
- Grants ALL privileges to service_role on all payment tables
- Creates explicit permissive RLS policies (FOR ALL TO service_role USING (true) WITH CHECK (true))
- Ensures edge functions can insert/update payment records without 42501 errors

**Why**: Edge function uses SERVICE_ROLE_KEY which should bypass RLS, but explicit policies prevent surprises and make intent clear.

---

### 3. Missing RPC Function Fix
**Migration**: `supabase/migrations/20261016000003_create_detect_timeout_payments_query.sql`

**What**: Creates `detect_timeout_payments_query()` function that:
- Returns pending payments exceeding their configured timeout duration
- Joins stokika_kit_payments with payment_timeout_config
- Returns 7 columns: id, application_code, phone_number, checkout_request_id, created_at, payment_status, flow_type, timeout_duration
- Uses SECURITY DEFINER to bypass RLS when called by timeout-monitor cron job
- Grants EXECUTE to service_role and authenticated

**Why**: The cron job `mpesa-timeout-monitor` was calling this function every minute but it didn't exist, causing 404 errors.

---

### 4. Foreign Key Constraint Fix
**Migration**: `supabase/migrations/20261016000004_fix_payment_metrics_fk.sql`

**What**:
- Drops `payment_metrics_payment_id_fkey` foreign key constraint
- Makes payment_id nullable
- Adds index on payment_id for performance
- Documents that payment_id stores either stokika_kit_payments.id OR payment_intents.id depending on flow_type

**Why**: 
- payment_metrics.payment_id had FK to stokika_kit_payments(id)
- But vendor_registration flows create payment_intents without stokika_kit_payments rows
- PostgreSQL doesn't support polymorphic FKs, so the constraint must be removed
- Application logic ensures referential integrity instead

---

## Review Finding Fix

**Finding**: Rate limit thresholds were inverted (user: 5, phone: 10)  
**Severity**: Blocking  
**Fix**: Swapped maxRequests values to user: 10, phone: 5  
**File**: `supabase/functions/mpesa-stk-push/index.ts` line 54  

**Rationale**: Field agents whose payments time out due to network issues need to retry 4-5 times within 10 minutes without being blocked. Phone-level rate limiting at 5 per hour prevents household abuse while allowing multiple legitimate attempts.

---

## Verification Steps

### Rate Limit Cleanup
```sql
-- Check cron job is active
SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'cleanup-rate-limits';

-- Monitor rate_limits table size
SELECT COUNT(*), MAX(created_at), MIN(created_at) FROM rate_limits;
```

### RLS Policies
```sql
-- Verify service_role policies exist
SELECT tablename, policyname, cmd, roles 
FROM pg_policies 
WHERE tablename IN ('stokika_kit_payments', 'stokika_kit_config', 'payment_events', 
                     'payment_transactions', 'payment_intents', 'payment_metrics')
  AND policyname LIKE '%service_role%';
```

### Timeout Detection
```sql
-- Test the RPC function directly
SELECT * FROM detect_timeout_payments_query();

-- Check cron runs (should show success, not 404)
SELECT jobid, status, return_message, start_time 
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'mpesa-timeout-monitor')
ORDER BY start_time DESC LIMIT 5;
```

### Payment Metrics FK
```sql
-- Verify FK constraint is dropped
SELECT conname FROM pg_constraint WHERE conname = 'payment_metrics_payment_id_fkey';
-- Should return 0 rows

-- Check recent metrics
SELECT id, metric_type, payment_id, flow_type, timestamp 
FROM payment_metrics ORDER BY timestamp DESC LIMIT 10;
```

---

## Deployment Instructions

1. **Apply migrations** in Supabase Dashboard → SQL Editor in order:
   - 20261016000000_schedule_rate_limit_cleanup.sql
   - 20261016000001_fix_kit_tables_service_role.sql
   - 20261016000002_fix_payment_events_service_role.sql
   - 20261016000003_create_detect_timeout_payments_query.sql
   - 20261016000004_fix_payment_metrics_fk.sql

2. **Deploy edge function**:
   ```bash
   supabase functions deploy mpesa-stk-push
   ```

3. **Test end-to-end**:
   - Trigger kit payment flow (field agent registration)
   - Trigger vendor registration flow
   - Monitor for errors in Supabase logs

4. **Monitor for 24 hours**:
   - No 429 rate limit errors
   - No 42501 permission errors
   - No 404 RPC function errors
   - No FK constraint violations

---

## Files Modified

### Edge Function
- `supabase/functions/mpesa-stk-push/index.ts` (2 changes: cleanup logic + rate limit thresholds)

### Migrations (all verified to exist)
- `20261011183029_fix_service_role_permissions.sql` (pre-existing)
- `20261016000000_schedule_rate_limit_cleanup.sql` (new)
- `20261016000001_fix_kit_tables_service_role.sql` (new)
- `20261016000002_fix_payment_events_service_role.sql` (new)
- `20261016000003_create_detect_timeout_payments_query.sql` (new)
- `20261016000004_fix_payment_metrics_fk.sql` (new)

---

## Risk Assessment

- **Low Risk**: All migrations are additive (grants, policies, index creation, FK removal)
- **Low Risk**: Edge function changes are minimal and well-scoped
- **Rollback**: Edge function can be reverted via `supabase functions deploy mpesa-stk-push --revert`
- **Rollback**: Migrations are safe to leave applied (they are permissive, not restrictive)

---

## Status

✅ All review findings addressed  
✅ All migrations verified to exist  
✅ Edge function updated with correct rate limit thresholds  
✅ TypeScript syntax validated (manual review)  
✅ Ready for deployment  

**Next Action**: Deploy migrations via Supabase Dashboard, then deploy edge function via Supabase CLI.
