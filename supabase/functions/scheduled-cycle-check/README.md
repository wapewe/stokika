# Scheduled Cycle Check Edge Function

## Overview

This Edge Function is designed to check for overdue stock repayment cycles on a scheduled basis (daily recommended). It identifies cycles where the end date has passed with an outstanding balance, marks them as overdue, recalculates vendor scores, and logs all actions to the audit trail.

**Requirements:** 10.11, 19.9, 19.10, 19.11

## Functionality

### What It Does

1. **Queries Overdue Cycles**: Finds all `stock_cycles` where:
   - `cycle_status = 'active'`
   - `end_date < today`
   - `balance > 0`
2. **Marks as Overdue**: Updates `cycle_status` to `'overdue'` for matching cycles
3. **Recalculates Vendor Scores**: Calls `calculate-vendor-score` for each affected vendor (overdue cycles reduce payment_score)
4. **Audit Logging**: Logs cycle status changes and score updates to `audit_logs` table
5. **Returns Summary**: Provides detailed summary of the operation

### Business Context

When a vendor receives stock on credit, a repayment cycle is created based on agreed terms (Daily, Weekly, Fortnightly, or Monthly). If the cycle end date passes and the vendor hasn't fully paid (balance > 0), the cycle becomes overdue. This triggers:

- Automatic status update to 'overdue'
- Vendor score reduction (affecting future eligibility)
- Audit trail for compliance and reporting

### Response Format

```json
{
  "success": true,
  "timestamp": "2026-09-14T19:08:00.000Z",
  "cycles_checked": 12,
  "cycles_marked_overdue": 12,
  "cycles_failed": 0,
  "vendors_scored": 5,
  "vendors_score_failed": 0,
  "duration_ms": 3421,
  "errors": []
}
```

## Deployment

### Deploy to Supabase

```bash
# From project root
supabase functions deploy scheduled-cycle-check
```

### Set Environment Variables

This function requires the following environment variables (automatically available in Supabase):

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for privileged operations

## Scheduling

### Option 1: Using pg_cron (Recommended for Supabase)

You can use PostgreSQL's `pg_cron` extension to schedule this function:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the function to run daily at 3 AM
SELECT cron.schedule(
  'daily-cycle-check',
  '0 3 * * *',  -- Cron expression: Every day at 3:00 AM
  $$
    SELECT net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/scheduled-cycle-check',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
    );
  $$
);
```

**Note**: Recommend running this AFTER `scheduled-scoring-update` (which runs at 2 AM) to ensure scores are current before additional deductions.

### Option 2: Using External Cron Services

You can also use external cron services like:

- **Cron-job.org**: Free online cron service
- **EasyCron**: Feature-rich cron service
- **GitHub Actions**: Free for public repos
- **AWS CloudWatch Events**: If using AWS infrastructure

Example GitHub Actions workflow (`.github/workflows/daily-cycle-check.yml`):

```yaml
name: Daily Cycle Check

on:
  schedule:
    - cron: '0 3 * * *'  # Every day at 3:00 AM UTC
  workflow_dispatch:  # Allow manual triggering

jobs:
  check-cycles:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Cycle Check
        run: |
          curl -X POST \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            https://YOUR_PROJECT_REF.supabase.co/functions/v1/scheduled-cycle-check
```

### Option 3: Using Supabase CLI with System Cron

On a server with cron access:

```bash
# Edit crontab
crontab -e

# Add this line to run daily at 3 AM
0 3 * * * curl -X POST -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" https://YOUR_PROJECT_REF.supabase.co/functions/v1/scheduled-cycle-check
```

## Manual Invocation

For testing or manual cycle checks:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/scheduled-cycle-check
```

## Monitoring

### Check Logs

View function logs in Supabase Dashboard or using CLI:

```bash
supabase functions logs scheduled-cycle-check --tail
```

### Expected Log Output

```
Scheduled cycle check started: {"timestamp":"2026-09-14T19:08:00.000Z","method":"POST"}
Querying for overdue cycles...
Found 12 overdue cycles to process
Marking cycles as overdue...
Processing cycle: abc-123-def for vendor Acme Corp {"cycle_id":"abc-123-def","vendor_id":"xyz-789","end_date":"2026-09-13","balance":5000}
✓ Marked cycle abc-123-def as overdue
Processing cycle: def-456-ghi for vendor Beta Store {"cycle_id":"def-456-ghi","vendor_id":"xyz-789","end_date":"2026-09-10","balance":3500}
✓ Marked cycle def-456-ghi as overdue
...
Updating scores for 5 affected vendors...
Recalculating score for vendor: Acme Corp (xyz-789)
✓ Vendor score recalculated: Acme Corp {"vendor_id":"xyz-789","score":68.5}
...
Scheduled cycle check completed: {"success":true,"cycles_checked":12,...}
```

## Error Handling

The function is designed to be resilient:

1. **Individual Failures Don't Stop Processing**: If one cycle update fails, the function continues processing others
2. **Comprehensive Error Tracking**: All errors are logged and returned in the summary
3. **Always Returns 200**: Even if some cycles fail, the function returns HTTP 200 with details in the response body
4. **Audit Log Warnings**: If audit logging fails, it logs a warning but doesn't fail the operation

## Database Operations

### Query

```sql
SELECT *
FROM stock_cycles
WHERE cycle_status = 'active'
  AND end_date < CURRENT_DATE
  AND balance > 0
ORDER BY end_date ASC;
```

### Updates Performed

1. **Update Cycle Status**:
   ```sql
   UPDATE stock_cycles
   SET cycle_status = 'overdue',
       updated_at = NOW()
   WHERE id = cycle_id;
   ```

2. **Insert Audit Log** (for each cycle):
   ```sql
   INSERT INTO audit_logs (
     user_id,
     action_type,
     resource_type,
     resource_id,
     action_status,
     details
   ) VALUES (
     NULL,
     'delivery_status_changed',
     'stock_cycle',
     cycle_id,
     'success',
     {...}
   );
   ```

3. **Trigger Vendor Score Recalculation**:
   - Calls `calculate-vendor-score` Edge Function
   - This recalculates payment_score component (overdue cycles reduce score)

4. **Insert Score Change Audit Log** (for each vendor):
   ```sql
   INSERT INTO audit_logs (
     user_id,
     action_type,
     resource_type,
     resource_id,
     action_status,
     details
   ) VALUES (
     NULL,
     'vendor_score_changed',
     'vendor',
     vendor_id,
     'success',
     {...}
   );
   ```

## Dependencies

This function depends on the following:

### Edge Functions
- `calculate-vendor-score`: Recalculates vendor scores (includes payment performance)

### Database Tables
- `stock_cycles`: Source of overdue cycle data
- `vendors`: Vendor information for logging
- `audit_logs`: Audit trail storage

Ensure these are deployed and configured before scheduling this function.

## Security

- **No JWT Authentication Required**: This function is designed for internal cron invocation, not user-facing requests
- **Service Role Key**: Uses service role key for privileged database access
- **No User Input**: All data comes from the database, no user-provided parameters
- **Audit Trail**: All actions logged to `audit_logs` for compliance

## Performance Considerations

- **Processing Time**: 
  - ~200ms per overdue cycle (status update + audit log)
  - ~100ms per vendor score recalculation
  - For 50 overdue cycles across 20 vendors: ~12 seconds total
- **Database Indexes**: Ensure indexes exist on:
  - `stock_cycles(cycle_status, end_date, balance)`
  - `vendors(id)`
  - `audit_logs(resource_type, resource_id, created_at)`
- **Deduplicated Vendor Updates**: Tracks unique vendors, only recalculates each vendor's score once even if they have multiple overdue cycles

## Troubleshooting

### No Cycles Found

This is normal if no cycles are overdue. The function will return:

```json
{
  "success": true,
  "cycles_checked": 0,
  "cycles_marked_overdue": 0,
  ...
}
```

### Cycle Update Fails

Check logs for specific error. Common issues:
- Database constraint violations
- RLS policy conflicts (shouldn't happen with service role key)
- Network timeout

### Vendor Score Calculation Fails

Ensure `calculate-vendor-score` Edge Function is deployed and working:

```bash
# Test vendor score calculation
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -d '{"vendor_id": "test-vendor-id"}' \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/calculate-vendor-score
```

### Authentication Errors

Verify that `SUPABASE_SERVICE_ROLE_KEY` is correctly set in your environment.

## Related Requirements

From the Stokika TypeScript Rebuild specification:

### Requirement 10: Vendor Scoring
- **10.11**: The Edge_Function SHALL run scheduled job daily to recalculate all vendor scores

### Requirement 19: Stock Repayment Cycle Management
- **19.9**: When cycle end date passes and balance is greater than 0, the Edge_Function SHALL update cycle status to "Overdue"
- **19.10**: The Edge_Function SHALL run scheduled job daily to check for overdue cycles
- **19.11**: The Edge_Function SHALL reduce vendor score when cycles become overdue

## Related Tasks

- Task 16.1: Create calculate-vendor-score Edge Function
- Task 19.1: Create stock_cycles table migration
- Task 19.3: Create scheduled job configuration for cycle checks

## Testing

### Test Scenario 1: No Overdue Cycles

```sql
-- Ensure all cycles are current or completed
UPDATE stock_cycles
SET end_date = CURRENT_DATE + 7
WHERE cycle_status = 'active';

-- Run function
-- Expected: cycles_checked = 0
```

### Test Scenario 2: Create Overdue Cycle

```sql
-- Create a test overdue cycle
INSERT INTO stock_cycles (
  stock_order_id,
  vendor_id,
  cycle_type,
  start_date,
  end_date,
  total_amount,
  paid_amount,
  cycle_status
) VALUES (
  'test-order-id',
  'test-vendor-id',
  'Weekly',
  CURRENT_DATE - 14,
  CURRENT_DATE - 7,
  10000.00,
  3000.00,
  'active'
);

-- Run function
-- Expected: cycles_marked_overdue = 1, vendors_scored = 1
```

### Test Scenario 3: Verify Status Update

```sql
-- After running function, check cycle status
SELECT 
  id,
  cycle_status,
  end_date,
  balance,
  updated_at
FROM stock_cycles
WHERE end_date < CURRENT_DATE
  AND balance > 0;

-- All should have cycle_status = 'overdue'
```

### Test Scenario 4: Verify Audit Logs

```sql
-- Check audit logs for cycle status changes
SELECT 
  action_type,
  resource_type,
  resource_id,
  action_status,
  details,
  created_at
FROM audit_logs
WHERE action_type IN ('delivery_status_changed', 'vendor_score_changed')
  AND created_at::date = CURRENT_DATE
ORDER BY created_at DESC;
```

### Test Scenario 5: Verify Vendor Score Reduction

```sql
-- Compare scores before and after
SELECT 
  v.business_name,
  vs.score_value,
  vs.payment_score,
  vs.calculation_date
FROM vendors v
JOIN vendor_scores vs ON vs.vendor_id = v.id
WHERE vs.calculation_date::date = CURRENT_DATE
ORDER BY vs.calculation_date DESC;
```

## Integration with Payment Workflow

This function works as part of the complete payment cycle management:

1. **Vendor receives stock** → Stock order created → Stock cycle created
2. **Cycle starts** → `cycle_status = 'active'`, `balance = total_amount`
3. **Vendor makes payments** → `allocate-payment` updates `paid_amount`, reduces `balance`
4. **Cycle fully paid** → `cycle_status = 'completed'` (auto-updated by `allocate-payment`)
5. **Cycle end date passes with balance > 0** → **THIS FUNCTION** marks as `'overdue'` and reduces vendor score
6. **Late payment received** → `allocate-payment` still accepts payments, updates balance, but cycle remains `'overdue'` (status doesn't revert)

## Future Enhancements

Potential improvements for future iterations:

1. **Configurable Grace Period**: Allow X days grace period before marking overdue
2. **Notification Integration**: Send SMS/email to vendor when cycle becomes overdue
3. **Escalation Levels**: Different severity levels for cycles overdue by 1 week, 1 month, etc.
4. **Recovery Tracking**: Track when overdue cycles are eventually paid
5. **Batch Processing**: Process cycles in batches if volume grows large

