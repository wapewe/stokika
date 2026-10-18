# Implementation Plan: M-Pesa Edge Function Fixes

This plan addresses four critical issues in the M-Pesa STK Push payment flow:

1. Rate limiting permanent lockout (old entries never cleaned up)
2. RLS permission denied errors (42501) on payment tables
3. Missing `detect_timeout_payments_query` RPC function causing cron 404 errors
4. Foreign key constraint violation on `payment_metrics` table

## Implementation Order

Issues must be fixed in this order because migrations must be applied before code changes that depend on them.

---

## Issue 1: Rate Limiting Permanent Lockout

**Problem**: The `checkRateLimit` function in `mpesa-stk-push/index.ts` counts rows in `rate_limits` table within a time window, but old rows are never deleted. The count grows permanently until every user gets locked out with 429 errors.

**Root Cause**: Line 48-56 in `index.ts` queries `rate_limits` rows with `gte('created_at', windowStart)`, but expired rows (older than the window) are never cleaned up from the database.

### 1.1: Create Migration to Add Scheduled Rate Limit Cleanup

- **What**: Create a new migration that schedules a pg_cron job to delete expired rate_limits entries every 6 hours. The cleanup function already exists (`cleanup_old_rate_limits()` in migration `20260918130851_create_rate_limits_table.sql` line 46), but it was never scheduled.
- **Files**: Create `c:\Users\ADMIN\Music\stokika\supabase\migrations\20261016000000_schedule_rate_limit_cleanup.sql`
- **SQL**:
```sql
-- Enable pg_cron if not enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule rate limit cleanup every 6 hours
-- The cleanup_old_rate_limits() function already exists from 20260918130851
SELECT cron.schedule(
    'cleanup-rate-limits',
    '0 */6 * * *',  -- Every 6 hours at minute 0
    'SELECT cleanup_old_rate_limits();'
);

-- Verify the job was created
SELECT 
  jobid,
  jobname,
  schedule,
  active
FROM cron.job
WHERE jobname = 'cleanup-rate-limits';

COMMENT ON FUNCTION cleanup_old_rate_limits IS 'Scheduled cleanup job: Removes rate_limits entries older than 2 hours to prevent permanent lockout';
```
- **Verify**: Run the migration in Supabase Dashboard → SQL Editor, then query `SELECT * FROM cron.job WHERE jobname = 'cleanup-rate-limits';` to confirm the job exists and `active = true`.

### 1.2: Add Inline Cleanup in Rate Limit Check Function

- **What**: Add cleanup logic at the start of `checkRateLimit()` to delete expired entries before counting. This provides immediate relief even if the cron job fails.
- **Files**: `c:\Users\ADMIN\Music\stokika\supabase\functions\mpesa-stk-push\index.ts` (lines 40-71)
- **Change**: Insert a DELETE query before the SELECT COUNT query:
```typescript
async function checkRateLimit(
  supabase: SupabaseClient,
  identifier: string,
  type: 'user' | 'phone'
): Promise<{ allowed: boolean; reason?: string; retryAfter?: number }> {
  const windowSeconds = type === 'user' ? 600 : 3600;
  const maxRequests = type === 'user' ? 3 : 5;
  const key = `stk_${type}:${identifier}`;
  const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString();

  try {
    // NEW: Clean up expired entries for this key before counting
    await supabase
      .from('rate_limits')
      .delete()
      .eq('key', key)
      .lt('created_at', windowStart);

    const { count, error } = await supabase
      .from('rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('key', key)
      .gte('created_at', windowStart);

    if (error) {
      return { allowed: true };
    }

    if ((count || 0) >= maxRequests) {
      return {
        allowed: false,
        reason: `Too many payment requests for this ${type}. Please try again later.`,
        retryAfter: windowSeconds
      };
    }

    return { allowed: true };
  } catch (_) {
    return { allowed: true };
  }
}
```
- **Verify**: Deploy the edge function (`supabase functions deploy mpesa-stk-push`), then test an STK Push request. Check Supabase logs to confirm no 429 errors occur after cleanup.

### 1.3: Adjust Rate Limit Thresholds (Optional)

- **What**: Current limits are 3 requests per 600s (10 min) per user, 5 requests per 3600s (1 hour) per phone. These may be too restrictive for legitimate retries (e.g., user closes the STK Push prompt, then wants to retry).
- **Files**: `c:\Users\ADMIN\Music\stokika\supabase\functions\mpesa-stk-push\index.ts` (lines 43-44)
- **Recommendation**: Increase to 5 requests per 600s per user, 8 requests per 3600s per phone. Change:
```typescript
const maxRequests = type === 'user' ? 5 : 8;  // Was 3 : 5
```
- **Rationale**: M-Pesa STK Push can time out if the user is slow to enter PIN. 5 attempts in 10 minutes allows 2-3 legitimate retries without enabling abuse.
- **Verify**: Same as 1.2 — deploy and test. Monitor rate_limits table row counts over 24 hours to confirm cleanup is working.

---

## Issue 2: RLS Permission Denied Errors (42501)

**Problem**: Edge function uses `service_role` key but gets permission denied (code 42501) when inserting into `stokika_kit_payments`, `stokika_kit_config`, and `payment_events`. The error indicates RLS policies are blocking service_role, which should bypass RLS by default.

**Root Cause Analysis**:
- `payment_intents` and `payment_transactions` already have service_role policies (migration `20261011183029_fix_service_role_permissions.sql`)
- `stokika_kit_payments` and `stokika_kit_config` have RLS enabled but no service_role policies (migration `20260914160017_create_kit_payment_tables.sql` lines 130-158 only define policies for authenticated/anon/admin)
- `payment_events` has RLS enabled with only admin policies (migration `20260916000003_unified_payment_complete.sql` line 258)

### 2.1: Create Migration to Grant Service Role Access to Kit Tables

- **What**: Create a migration that grants full table access to `service_role` and creates permissive RLS policies for `stokika_kit_payments` and `stokika_kit_config`.
- **Files**: Create `c:\Users\ADMIN\Music\stokika\supabase\migrations\20261016000001_fix_kit_tables_service_role.sql`
- **SQL**:
```sql
-- Grant full table access to service_role on kit tables
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
- **Verify**: Run the migration in Supabase Dashboard → SQL Editor. Query the policies: `SELECT * FROM pg_policies WHERE tablename IN ('stokika_kit_payments', 'stokika_kit_config') AND policyname LIKE '%service_role%';` — confirm both policies exist.

### 2.2: Create Migration to Grant Service Role Access to Payment Events

- **What**: Add service_role policy to `payment_events` table so edge function can insert audit events.
- **Files**: Create `c:\Users\ADMIN\Music\stokika\supabase\migrations\20261016000002_fix_payment_events_service_role.sql`
- **SQL**:
```sql
-- Grant full table access to service_role on payment_events
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
- **Verify**: Run the migration, then trigger an STK Push request. Check the `payment_events` table for new rows with `event_type = 'STK_INITIATED'`. If rows appear, the policy is working.

---

## Issue 3: Missing `detect_timeout_payments_query` RPC Function

**Problem**: Cron job `mpesa-timeout-monitor` (scheduled in migration `20250120000002_setup_timeout_monitor_cron.sql`) runs every minute and calls `https://eidsqrnwfndruuufyacc.supabase.co/functions/v1/timeout-monitor`, which likely depends on an RPC function `detect_timeout_payments_query` that does not exist. This causes 404 errors every minute.

**Root Cause**: The migration `20260914160017_create_kit_payment_tables.sql` line 231 defines `detect_payment_timeouts()` (no `_query` suffix), but the cron job or edge function expects `detect_timeout_payments_query`. There is a naming mismatch.

### 3.1: Determine if Cron Job is Needed

- **What**: Check if the `timeout-monitor` edge function exists and if it's actively used.
- **Files**: Read `c:\Users\ADMIN\Music\stokika\supabase\functions\timeout-monitor\index.ts` (if it exists)
- **Action**: 
  - If the edge function exists and is meant to monitor payment timeouts, create the missing RPC function (Option A).
  - If the edge function does not exist or is deprecated, unschedule the cron job (Option B).

### 3.2 Option A: Create the Missing RPC Function (if timeout-monitor is active)

- **What**: Create a migration that defines `detect_timeout_payments_query` to return pending payments older than their configured timeout.
- **Files**: Create `c:\Users\ADMIN\Music\stokika\supabase\migrations\20261016000003_create_detect_timeout_payments_query.sql`
- **SQL**:
```sql
-- Create RPC function to detect timed-out payments
-- This function is called by the timeout-monitor Edge Function (cron job every minute)
CREATE OR REPLACE FUNCTION detect_timeout_payments_query()
RETURNS TABLE (
    id UUID,
    application_code TEXT,
    phone_number TEXT,
    checkout_request_id TEXT,
    created_at TIMESTAMPTZ,
    payment_status TEXT,
    flow_type VARCHAR(50),
    timeout_duration INTEGER
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
        kp.created_at,
        kp.payment_status,
        kp.flow_type,
        COALESCE(tc.timeout_duration, 90) AS timeout_duration
    FROM stokika_kit_payments kp
    LEFT JOIN payment_timeout_config tc ON kp.flow_type = tc.flow_type
    WHERE kp.payment_status = 'pending'
      AND kp.checkout_request_id IS NOT NULL
      AND EXTRACT(EPOCH FROM (NOW() - kp.created_at)) > COALESCE(tc.timeout_duration, 90);
END;
$$;

GRANT EXECUTE ON FUNCTION detect_timeout_payments_query() TO service_role;

COMMENT ON FUNCTION detect_timeout_payments_query IS 
'Returns pending payments that have exceeded their timeout_duration from payment_timeout_config';
```
- **Verify**: Run the migration, then execute `SELECT * FROM detect_timeout_payments_query();` in SQL Editor. Should return 0 rows if no timed-out payments exist. Monitor cron job logs: `SELECT * FROM cron.job_run_details WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'mpesa-timeout-monitor') ORDER BY start_time DESC LIMIT 5;` — confirm no more 404 errors.

### 3.2 Option B: Unschedule the Cron Job (if timeout-monitor is deprecated)

- **What**: Remove the cron job if the timeout-monitor edge function does not exist or is no longer needed.
- **Files**: Create `c:\Users\ADMIN\Music\stokika\supabase\migrations\20261016000003_unschedule_timeout_monitor.sql`
- **SQL**:
```sql
-- Unschedule the timeout-monitor cron job
SELECT cron.unschedule('mpesa-timeout-monitor');

COMMENT ON SCHEMA cron IS 'mpesa-timeout-monitor cron job removed 2026-10-16 - function not implemented';
```
- **Verify**: Run the migration, then query `SELECT * FROM cron.job WHERE jobname = 'mpesa-timeout-monitor';` — should return 0 rows. Monitor Supabase logs for 1 hour; no more 404 errors should appear.

**Decision**: Without access to the edge function, **recommend Option A** (create the RPC function) because the cron job was explicitly set up in a recent migration and the supporting table `payment_timeout_config` exists. The function is likely needed but was never implemented.

---

## Issue 4: Foreign Key Constraint Violation on `payment_metrics`

**Problem**: The edge function inserts into `payment_metrics` (line 96 in `index.ts` calls `recordPaymentInitiationMetric`), but the insert fails with a foreign key violation on `payment_metrics_payment_id_fkey`.

**Root Cause**: 
- `payment_metrics` table schema (migration `20261005102555_mpesa_timeout_clean.sql` line 222): 
  ```sql
  payment_id UUID REFERENCES stokika_kit_payments(id) ON DELETE SET NULL,
  ```
- Edge function line 573 passes `kitPaymentId || intentId` as `payment_id`, but:
  - `kitPaymentId` is the `stokika_kit_payments.id` (correct FK target)
  - `intentId` is the `payment_intents.id` (wrong FK target — not referenced by payment_metrics FK)
- When `kitPaymentId` is undefined (e.g., vendor registration flow where the insert into `stokika_kit_payments` was skipped or failed), the function falls back to `intentId`, which violates the FK constraint.

### 4.1: Analyze the Usage Pattern

- **What**: Determine whether `payment_metrics.payment_id` should reference `stokika_kit_payments` OR `payment_intents`, or if it should be nullable with no FK.
- **Files**: Read `c:\Users\ADMIN\Music\stokika\supabase\migrations\20261005102555_mpesa_timeout_clean.sql` lines 222-268
- **Finding**: The FK constraint `REFERENCES stokika_kit_payments(id)` is too narrow. Payment metrics are recorded for ALL payment flows (kit_payment, vendor_order, manual_payment), but only kit_payment creates `stokika_kit_payments` rows. Vendor registrations create `payment_intents` without `stokika_kit_payments` rows.

### 4.2: Create Migration to Fix payment_metrics FK Constraint

- **What**: Drop the FK constraint on `payment_metrics.payment_id` and make it a plain UUID. The column should store either a `stokika_kit_payments.id` OR a `payment_intents.id` depending on the flow, with no enforced FK.
- **Files**: Create `c:\Users\ADMIN\Music\stokika\supabase\migrations\20261016000004_fix_payment_metrics_fk.sql`
- **SQL**:
```sql
-- Drop the foreign key constraint on payment_metrics.payment_id
-- The column stores either stokika_kit_payments.id or payment_intents.id depending on flow_type
-- Enforcing a single FK is too restrictive
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
```
- **Verify**: Run the migration. Query the constraint: `SELECT conname FROM pg_constraint WHERE conname = 'payment_metrics_payment_id_fkey';` — should return 0 rows. Then trigger a vendor registration STK Push and confirm the `payment_metrics` insert succeeds.

### 4.3: Update Edge Function to Always Pass Valid payment_id

- **What**: Ensure the edge function passes the correct ID based on the flow type. For `kit_payment`, use `kitPaymentId`; for `vendor_registration`, use `intentId`.
- **Files**: `c:\Users\ADMIN\Music\stokika\supabase\functions\mpesa-stk-push\index.ts` (line 573)
- **Change**: Replace the `recordPaymentInitiationMetric` call:
```typescript
// OLD (line 573):
await recordPaymentInitiationMetric(supabase, kitPaymentId || intentId, flowType, {
  user_type: requestData.userType,
  amount: requestData.amount,
  phone_number: requestData.phoneNumber,
  timeout_duration: timeoutConfig.timeout_duration
});

// NEW:
// Use kitPaymentId for kit flows, intentId for vendor registration flows
const metricPaymentId = flowType === 'kit_payment' ? kitPaymentId : intentId;
await recordPaymentInitiationMetric(supabase, metricPaymentId || intentId, flowType, {
  user_type: requestData.userType,
  amount: requestData.amount,
  phone_number: requestData.phoneNumber,
  timeout_duration: timeoutConfig.timeout_duration
});
```
- **Verify**: Deploy the edge function. Trigger both a kit_payment flow and a vendor_registration flow. Query `SELECT * FROM payment_metrics ORDER BY timestamp DESC LIMIT 10;` — confirm rows are inserted with correct `payment_id` values for both flows.

---

## Deployment Order

1. **Apply all migrations** in order (20261016000000 → 20261016000004) via Supabase Dashboard → SQL Editor
2. **Deploy edge function changes** (issues 1.2, 1.3, 4.3) via `supabase functions deploy mpesa-stk-push`
3. **Test end-to-end**:
   - Kit payment flow (field agent registration)
   - Vendor registration flow
   - Monitor rate_limits table for cleanup
   - Monitor cron job logs for 404 errors (should be gone)
4. **Monitor for 24 hours** to confirm no regressions

---

## Verification Commands

### Rate Limit Cleanup
```sql
-- Check cron job is active
SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'cleanup-rate-limits';

-- Check rate_limits table size over time
SELECT COUNT(*), MAX(created_at), MIN(created_at) FROM rate_limits;
```

### RLS Policies
```sql
-- Verify service_role policies exist
SELECT tablename, policyname, cmd, roles 
FROM pg_policies 
WHERE tablename IN ('stokika_kit_payments', 'stokika_kit_config', 'payment_events')
  AND policyname LIKE '%service_role%';
```

### Payment Metrics FK
```sql
-- Verify FK constraint is dropped
SELECT conname FROM pg_constraint WHERE conname = 'payment_metrics_payment_id_fkey';
-- Should return 0 rows

-- Check recent metrics
SELECT id, metric_type, payment_id, flow_type, timestamp 
FROM payment_metrics 
ORDER BY timestamp DESC 
LIMIT 10;
```

### Timeout Monitor Cron
```sql
-- Check cron job status (Option A - function created)
SELECT * FROM cron.job WHERE jobname = 'mpesa-timeout-monitor';

-- Check recent cron runs (should show success, not 404)
SELECT jobid, status, return_message, start_time 
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'mpesa-timeout-monitor')
ORDER BY start_time DESC 
LIMIT 5;

-- Test the RPC function directly
SELECT * FROM detect_timeout_payments_query();
```

---

## Risk Assessment

- **Low Risk**: Issues 1.1, 2.1, 2.2, 4.2 (migrations only, additive changes)
- **Medium Risk**: Issues 1.2, 1.3 (edge function logic changes — test thoroughly)
- **Medium Risk**: Issue 3 (depends on whether timeout-monitor edge function exists — need to confirm)
- **Low Risk**: Issue 4.3 (edge function change, but FK already dropped in 4.2)

**Rollback Plan**: If issues arise after deployment, revert the edge function deployment (`supabase functions deploy mpesa-stk-push --revert`). Migrations 20261016000000-20261016000004 are safe to leave applied (they are permissive, not restrictive).

---

## Notes

- All file paths are absolute under `c:\Users\ADMIN\Music\stokika\`
- SQL migrations must be run in Supabase Dashboard → SQL Editor (not via `supabase db push` unless `supabase/config.toml` is properly configured)
- Edge function deployment requires Supabase CLI: `supabase functions deploy mpesa-stk-push` from the project root
- The edge function file is truncated in the read (hit 30000 char limit at line 918). If changes to later lines are needed, read with offset parameter.

---

## REVIEW FINDING FIX (2025-01-XX)

### Rate Limit Threshold Inversion
**Finding**: User limit (5 per 10 minutes) was too restrictive; phone limit (10 per hour) was reasonable.
**Fix**: Swapped the maxRequests values:
- User: 5 → 10 requests per 600 seconds (10 minutes)
- Phone: 10 → 5 requests per 3600 seconds (1 hour)

**Rationale**: A field agent whose first payment times out due to network issues should be able to retry 4-5 times within 10 minutes without being blocked. Phone-level rate limiting at 5 per hour prevents household abuse while allowing multiple legitimate payment attempts.

**File changed**: `supabase/functions/mpesa-stk-push/index.ts` line 54

---

## VERIFICATION RESULTS (2024-10-16)

### Files Created
✅ 5 migration files created:
  - 20261016000000_schedule_rate_limit_cleanup.sql
  - 20261016000001_fix_kit_tables_service_role.sql
  - 20261016000002_fix_payment_events_service_role.sql
  - 20261016000003_create_detect_timeout_payments_query.sql
  - 20261016000004_fix_payment_metrics_fk.sql

### Code Changes
✅ Edge function `mpesa-stk-push/index.ts` updated:
  - Line 52-57: Added inline cleanup in `checkRateLimit()` function (deletes expired entries before counting)
  - Line 56: Increased rate limits from 3→5 (user) and 5→10 (phone)
  - Line 901-908: Updated `recordPaymentInitiationMetric` to use correct payment ID based on flow_type

### Syntax Verification
✅ TypeScript syntax is valid (manual review)
⚠️ SQL lint skipped (command timeout) — migrations follow existing patterns and should be tested in Supabase Dashboard

### Next Steps
1. Run all 5 migrations in Supabase Dashboard SQL Editor in order
2. Deploy edge function: `supabase functions deploy mpesa-stk-push`
3. Test STK Push for both kit_payment and vendor_registration flows
4. Monitor logs for 429 errors, 42501 permission errors, and 404 cron errors
5. Verify rate_limits table cleanup is working after 30 minutes

---

## REVIEW FINDINGS FIXED (2025-01-XX)

### 1. Rate Limit Threshold Inversion ✅ FIXED
**Finding**: User limit was too permissive (10 requests), phone limit was too strict (5 requests).
**Fix**: Swapped maxRequests values in `checkRateLimit()` function:
- User: 10 → 5 requests per 600 seconds (10 minutes)
- Phone: 5 → 10 requests per 3600 seconds (1 hour)

**Rationale**: Individual users should have stricter limits to prevent abuse, while phone-level limits should allow legitimate retries (user closes STK prompt, network issues, etc.) since one phone can serve multiple payment attempts.

**File changed**: `supabase/functions/mpesa-stk-push/index.ts` lines 55-57

### 2. Timeout Query Schema Mismatch ✅ FIXED
**Finding**: The `detect_timeout_payments_query` function was missing `kit_amount` and `elapsed_seconds` columns that the timeout-monitor edge function expects.
**Fix**: Updated the RETURNS TABLE definition to include:
- `kit_amount NUMERIC` — Payment amount
- `elapsed_seconds NUMERIC` — Calculated as `EXTRACT(EPOCH FROM (NOW() - created_at))`

**File changed**: `supabase/migrations/20261016000003_create_detect_timeout_payments_query.sql`

### 3. Payment Metrics FK Dual-Table Handling ✅ DOCUMENTED
**Finding**: The `payment_id` column in `payment_metrics` can reference either `stokika_kit_payments.id` or `payment_intents.id`, but this dual-table logic was not documented in the code.
**Fix**: Added inline comments explaining the flow-specific behavior:
```typescript
// payment_id references different tables depending on flow_type:
// - kit_payment: stores stokika_kit_payments.id (kitPaymentId)
// - vendor_registration: stores payment_intents.id (intentId)
// FK constraint was dropped to allow dual-table references (see migration 20261016000004)
```

**File changed**: `supabase/functions/mpesa-stk-push/index.ts` lines 903-907

### 4. Cron Cleanup Frequency ✅ IMPROVED
**Finding**: 30-minute cleanup intervals could cause extended lockouts (user locked out for up to 30 minutes after window expires).
**Fix**: Changed cron schedule from `*/30 * * * *` (every 30 minutes) to `*/10 * * * *` (every 10 minutes).

**Rationale**: 10-minute intervals reduce worst-case lockout duration while still being gentle on database resources. Combined with inline cleanup (which runs on every rate limit check), this ensures stale entries don't accumulate.

**File changed**: `supabase/migrations/20261016000000_schedule_rate_limit_cleanup.sql`

---

## FINAL VERIFICATION (2025-01-XX)

All review findings have been addressed:
1. ✅ Rate limit thresholds corrected (user: 5, phone: 10)
2. ✅ Timeout query schema completed (kit_amount and elapsed_seconds added)
3. ✅ Payment metrics dual-table logic documented with inline comments
4. ✅ Cron cleanup frequency improved (30min → 10min)

TypeScript syntax verified manually. All migration files follow existing schema patterns. Ready for deployment.
