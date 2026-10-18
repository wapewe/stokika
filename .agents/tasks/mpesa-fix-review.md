# M-Pesa STK Push fixes

Four blocking issues identified in the M-Pesa STK Push flow have been addressed: rate limiting causing permanent lockout, RLS permission denials in edge functions, missing RPC function for timeout detection, and a foreign key constraint failure on payment metrics. The fixes target the immediate cause of each failure — cleanup cron for rate limits, service_role grants and policies for RLS, a new function for timeout queries, and dropping the problematic FK constraint.

**Watch for:** Rate limit maxRequests values are inverted (confirmed) — user gets 10 requests instead of 5, phone gets 5 instead of 10. The detect_timeout_payments_query function queries stokika_kit_payments but the original error log references payment_intents fields (confirmed mismatch). The FK drop on payment_metrics makes payment_id nullable but the edge function continues inserting non-null values without handling the dual-table scenario (likely).

**Verdict**: NEEDS_CHANGES

## High-level view

The rate limiting cleanup migration schedules a cron job every 30 minutes and the edge function now deletes expired entries inline before counting, but the maxRequests thresholds are backwards: users are allowed 10 requests in 10 minutes while phone numbers are capped at 5 in 1 hour, which is the opposite of the intended design.

The RLS permissions fix grants ALL on five tables to service_role and creates permissive policies, and the edge function correctly uses SERVICE_ROLE_KEY to authenticate, so permission denials should be resolved.

The detect_timeout_payments_query function was created to query stokika_kit_payments for pending payments that exceeded their timeout_duration, but the original requirement references payment_intents columns (payment_intent_id, amount) and the original error trace shows the cron job expected those fields, creating a schema mismatch.

The payment_metrics FK constraint was dropped and payment_id made nullable to allow dual-table references, but the edge function recordPaymentInitiationMetric still inserts unconditionally without discriminating between kit and vendor flows, so the nullable column may end up with inconsistent data.

<details>
<summary>Issues (4)</summary>

1. **Rate limit thresholds inverted** — user maxRequests is 10, phone is 5; should be user 5, phone 10. Swap them in checkRateLimit.
2. **Timeout query schema mismatch** — detect_timeout_payments_query returns stokika_kit_payments columns (application_code, phone_number, checkout_request_id) but the original error log expects payment_intents fields (payment_intent_id, amount). Verify which table the cron job actually queries and align the function's return type.
3. **Payment metrics FK dropped without handling dual-table scenario** — payment_id is nullable now but recordPaymentInitiationMetric always inserts the ID from whichever table is used (kitPaymentId or intentId) without documenting the flow-specific logic or ensuring consistency. Add inline comments or a check to clarify the dual-table behavior.
4. **Cron cleanup schedule may be too infrequent** — 30-minute intervals mean a phone number hitting the 5-request cap could stay locked for up to 30 minutes after the window expires. Consider 5-minute intervals or 10-minute intervals to reduce worst-case lockout duration.

</details>

<details>
<summary>Details</summary>

## Rate limit cleanup and inline deletion

The migration `20261016000000_schedule_rate_limit_cleanup.sql` schedules a cron job to run `cleanup_old_rate_limits()` every 30 minutes. The edge function `checkRateLimit` now deletes expired entries inline before counting:

```typescript
// Clean up expired entries for this key before counting
await supabase
  .from('rate_limits')
  .delete()
  .eq('key', key)
  .lt('created_at', windowStart);
```

**Issue (confirmed):** The maxRequests thresholds are inverted. Line 55 sets `const maxRequests = type === 'user' ? 10 : 5;`, which means users get 10 requests in 10 minutes and phone numbers get 5 requests in 1 hour. The intended design should limit users more strictly (5 requests) and allow phones more headroom (10 requests), since one phone can serve multiple payment attempts across different users. The values are backwards.

**Issue (possible):** The cron job runs every 30 minutes. If a phone number hits the 5-request cap at minute 0, and the window expires at minute 60, but the cron job runs at minute 30 and minute 60, the user could be locked out for up to 30 minutes beyond the intended 1-hour window. Inline cleanup mitigates this for the specific phone making another attempt, but if the phone stops retrying, the stale row persists until the cron job. Consider 5-minute or 10-minute intervals.

## RLS permissions and service_role grants

Three migrations grant ALL on six tables to service_role and create permissive policies:

- `20261016000001_fix_kit_tables_service_role.sql`: stokika_kit_payments, stokika_kit_config
- `20261016000002_fix_payment_events_service_role.sql`: payment_events
- `20261016000004_fix_payment_metrics_fk.sql`: payment_metrics

Each policy uses `FOR ALL TO service_role USING (true) WITH CHECK (true)`, which bypasses all RLS checks. The edge function authenticates with `SERVICE_ROLE_KEY` (line 783):

```typescript
const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);
```

The environment variable name matches Supabase's standard convention (SERVICE_ROLE_KEY, not SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY), so the edge function should now have unrestricted access to the five tables and no longer encounter 42501 permission denied errors.

## detect_timeout_payments_query function

The migration `20261016000003_create_detect_timeout_payments_query.sql` creates a function that returns pending payments from stokika_kit_payments that have exceeded their timeout_duration:

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

The function uses SECURITY DEFINER and grants EXECUTE to service_role and authenticated. The query joins stokika_kit_payments with payment_timeout_config and filters for `payment_status = 'pending'` and `EXTRACT(EPOCH FROM (NOW() - created_at)) > timeout_duration`.

**Issue (confirmed):** The function queries stokika_kit_payments and returns columns like application_code, phone_number, checkout_request_id. However, the original error log shows fields like payment_intent_id, amount, payer_phone, which are columns from payment_intents and payment_transactions, not stokika_kit_payments. The original spec (Section 9, timeout tracking) references payment_intents as the source table for timeout detection. The cron job calling this function expects payment_intents columns, but the function returns stokika_kit_payments columns. The 404 RPC error is resolved, but the return type doesn't match the expected schema, so the cron job will either fail at runtime or process the wrong data.

## payment_metrics FK constraint fix

The migration `20261016000004_fix_payment_metrics_fk.sql` drops the `payment_metrics_payment_id_fkey` constraint and makes payment_id nullable:

```sql
ALTER TABLE payment_metrics 
DROP CONSTRAINT IF EXISTS payment_metrics_payment_id_fkey;

ALTER TABLE payment_metrics 
ALTER COLUMN payment_id DROP NOT NULL;
```

The comment documents that payment_id stores stokika_kit_payments.id for kit flows and payment_intents.id for vendor flows. The edge function `recordPaymentInitiationMetric` is called at line 867:

```typescript
const metricPaymentId = flowType === 'kit_payment' ? kitPaymentId : intentId;
await recordPaymentInitiationMetric(supabase, metricPaymentId || intentId, flowType, {...});
```

**Issue (likely):** The nullable payment_id column is never checked for null in the edge function. If kitPaymentId is undefined (e.g., stokika_kit_payments insert failed but didn't throw), the fallback `metricPaymentId || intentId` ensures a value is passed, but there's no guard against inserting null. If the insert fails silently or the flow logic is wrong, payment_metrics could accumulate rows with null payment_id, breaking the audit trail. The edge function wraps the stokika_kit_payments insert in try/catch and logs a warning if it fails (line 409-419), so kitPaymentId could legitimately be undefined. The fallback to intentId is reasonable, but it should be documented inline to clarify the dual-table logic.

</details>

<details>
<summary>File map</summary>

- `supabase/functions/mpesa-stk-push/index.ts` — rate limit cleanup added before counting, maxRequests values updated (inverted), SERVICE_ROLE_KEY used for client init, recordPaymentInitiationMetric called with flowType-conditional ID
- `supabase/migrations/20261016000000_schedule_rate_limit_cleanup.sql` — pg_cron job scheduled every 30 minutes
- `supabase/migrations/20261016000001_fix_kit_tables_service_role.sql` — GRANT ALL and permissive policies for stokika_kit_payments, stokika_kit_config
- `supabase/migrations/20261016000002_fix_payment_events_service_role.sql` — GRANT ALL and permissive policy for payment_events
- `supabase/migrations/20261016000003_create_detect_timeout_payments_query.sql` — RPC function querying stokika_kit_payments for timed-out payments
- `supabase/migrations/20261016000004_fix_payment_metrics_fk.sql` — FK constraint dropped, payment_id made nullable

Full diff: `git diff main` (if tracked in version control)

</details>
