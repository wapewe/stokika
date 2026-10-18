# M-Pesa STK Push Fixes - Changes Summary

## Overview
Fixed four critical issues in the M-Pesa STK Push flow based on review findings:
1. Rate limit thresholds inverted
2. Timeout query schema missing fields
3. Payment metrics dual-table logic undocumented
4. Cron cleanup frequency too low

## Files Modified

### 1. supabase/functions/mpesa-stk-push/index.ts

#### Change 1: Fixed Rate Limit Thresholds (lines 55-57)
**Before:**
```typescript
const maxRequests = type === 'user' ? 10 : 5;
```

**After:**
```typescript
// User rate limit: 5 requests per 10 minutes (stricter for individual users)
// Phone rate limit: 10 requests per 1 hour (allows multiple payment attempts per household)
const maxRequests = type === 'user' ? 5 : 10;
```

**Rationale:** Individual users should have stricter limits (5 per 10 minutes) to prevent abuse. Phone-level limits should be more permissive (10 per hour) to allow legitimate retries when users close the STK prompt or encounter network issues.

#### Change 2: Documented Payment Metrics Dual-Table Logic (lines 903-910)
**Before:**
```typescript
// SECTION 9.4: Record payment initiation metric
// Use kitPaymentId for kit flows, intentId for vendor registration flows
const metricPaymentId = flowType === 'kit_payment' ? kitPaymentId : intentId;
```

**After:**
```typescript
// SECTION 9.4: Record payment initiation metric
// payment_id references different tables depending on flow_type:
// - kit_payment: stores stokika_kit_payments.id (kitPaymentId)
// - vendor_registration: stores payment_intents.id (intentId)
// FK constraint was dropped to allow dual-table references (see migration 20261016000004)
const metricPaymentId = flowType === 'kit_payment' ? kitPaymentId : intentId;
```

**Rationale:** Clarifies that the payment_id column can reference different tables based on flow type, explaining why the FK constraint was dropped.

### 2. supabase/migrations/20261016000003_create_detect_timeout_payments_query.sql

#### Change: Added Missing Columns to Return Type
**Before:**
```sql
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
```

**After:**
```sql
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
```

**Added to SELECT:**
```sql
kp.kit_amount,
EXTRACT(EPOCH FROM (NOW() - kp.created_at)) AS elapsed_seconds
```

**Rationale:** The timeout-monitor edge function expects these columns. Without them, the function would fail at runtime when trying to access `payment.kit_amount` and `payment.elapsed_seconds`.

### 3. supabase/migrations/20261016000000_schedule_rate_limit_cleanup.sql

#### Change: Improved Cron Frequency
**Before:**
```sql
SELECT cron.schedule(
    'cleanup-rate-limits',
    '*/30 * * * *',  -- Every 30 minutes
    'SELECT cleanup_old_rate_limits();'
);
```

**After:**
```sql
-- Schedule rate limit cleanup every 10 minutes
-- The cleanup_old_rate_limits() function already exists from 20260918130851
-- 10-minute intervals reduce worst-case lockout duration after window expires
SELECT cron.schedule(
    'cleanup-rate-limits',
    '*/10 * * * *',  -- Every 10 minutes
    'SELECT cleanup_old_rate_limits();'
);
```

**Rationale:** Reduces worst-case lockout duration from 30 minutes to 10 minutes after a rate limit window expires. Combined with inline cleanup (which runs on every rate check), this ensures stale entries don't accumulate.

## Impact Analysis

### Rate Limit Fix
- **Before:** Users could make 10 requests in 10 minutes, phones limited to 5 per hour
- **After:** Users limited to 5 requests in 10 minutes, phones can make 10 per hour
- **User Impact:** Field agents with legitimate payment failures (closed prompt, network timeout) can now retry 10 times within an hour instead of being locked out after 5 attempts

### Timeout Query Fix
- **Before:** RPC function missing required columns, would cause runtime errors
- **After:** Function returns all expected columns matching timeout-monitor interface
- **User Impact:** Timeout detection cron job will now work correctly, automatically querying payment status for stuck transactions

### Payment Metrics Documentation
- **Before:** Dual-table reference logic was implicit and undocumented
- **After:** Inline comments explain which table is referenced for each flow type
- **User Impact:** No functional change, but future developers will understand why payment_id is nullable and how it's used

### Cron Frequency
- **Before:** Cleanup runs every 30 minutes
- **After:** Cleanup runs every 10 minutes
- **User Impact:** Users who hit rate limits will see faster recovery as stale entries are cleaned more frequently

## Testing Checklist

1. **Rate Limiting:**
   - [ ] Deploy edge function
   - [ ] Make 5 STK Push requests from same user within 10 minutes → 6th should be blocked
   - [ ] Make 10 STK Push requests from same phone within 1 hour → 11th should be blocked
   - [ ] Wait 10 minutes after window expires → confirm rate limit counter resets

2. **Timeout Detection:**
   - [ ] Apply migration 20261016000003
   - [ ] Execute `SELECT * FROM detect_timeout_payments_query();` in SQL Editor
   - [ ] Confirm no runtime errors and all expected columns present
   - [ ] Monitor cron job logs: `SELECT * FROM v_timeout_monitor_logs ORDER BY start_time DESC LIMIT 5;`
   - [ ] Confirm no more 404 RPC errors

3. **Payment Metrics:**
   - [ ] Trigger kit_payment flow → verify payment_metrics.payment_id = stokika_kit_payments.id
   - [ ] Trigger vendor_registration flow → verify payment_metrics.payment_id = payment_intents.id
   - [ ] Confirm no foreign key constraint errors

4. **Cron Cleanup:**
   - [ ] Apply migration 20261016000000
   - [ ] Query `SELECT * FROM cron.job WHERE jobname = 'cleanup-rate-limits';`
   - [ ] Confirm schedule is `*/10 * * * *`
   - [ ] After 20 minutes, verify old rate_limits entries are being deleted

## Deployment Order

1. **Apply migrations** in Supabase Dashboard → SQL Editor (in order):
   ```
   20261016000000_schedule_rate_limit_cleanup.sql
   20261016000001_fix_kit_tables_service_role.sql
   20261016000002_fix_payment_events_service_role.sql
   20261016000003_create_detect_timeout_payments_query.sql
   20261016000004_fix_payment_metrics_fk.sql
   ```

2. **Deploy edge function:**
   ```bash
   supabase functions deploy mpesa-stk-push
   ```

3. **Monitor for 1 hour:**
   - Check Supabase logs for 429 errors (should be reduced)
   - Check cron job logs for 404 errors (should be eliminated)
   - Check edge function logs for 42501 permission errors (should be eliminated)
   - Check payment_metrics table for FK constraint violations (should be eliminated)

## Rollback Plan

If issues arise:

1. **Edge function:** Revert deployment (if Supabase supports rollback) or redeploy previous version
2. **Migrations:** These are additive and permissive, safe to leave applied. If necessary:
   - Unschedule cron: `SELECT cron.unschedule('cleanup-rate-limits');`
   - Drop RPC function: `DROP FUNCTION IF EXISTS detect_timeout_payments_query();`
   - Restore FK constraint: `ALTER TABLE payment_metrics ADD CONSTRAINT payment_metrics_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES stokika_kit_payments(id);`

## Review Findings Status

| # | Finding | Status | Fix Location |
|---|---------|--------|--------------|
| 1 | Rate limit thresholds inverted | ✅ FIXED | `index.ts` lines 55-57 |
| 2 | Timeout query schema mismatch | ✅ FIXED | `20261016000003_create_detect_timeout_payments_query.sql` |
| 3 | Payment metrics FK dual-table undocumented | ✅ DOCUMENTED | `index.ts` lines 903-907 |
| 4 | Cron cleanup frequency too low | ✅ IMPROVED | `20261016000000_schedule_rate_limit_cleanup.sql` |

All review findings have been addressed.
