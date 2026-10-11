# Scheduled Scoring Update Edge Function

## Overview

This Edge Function is designed to recalculate vendor and supplier scores on a scheduled basis (daily recommended). It's intended to be invoked by a cron job scheduler rather than by end users.

**Requirements:** 10.11, 16.3, 16.6

## Functionality

### What It Does

1. **Fetches Active Vendors**: Queries all vendors with `onboarding_completed = true`
2. **Calculates Vendor Scores**: Calls `calculate-vendor-score` Edge Function for each vendor
3. **Fetches Active Suppliers**: Queries all suppliers with `is_active = true`
4. **Calculates Supplier Scores**: Calls `calculate-supplier-score` Edge Function for each supplier
5. **Comprehensive Logging**: Logs success and failure for each entity processed
6. **Returns Summary**: Provides detailed summary of the batch scoring operation

### Response Format

```json
{
  "success": true,
  "timestamp": "2026-09-14T19:08:00.000Z",
  "vendors_processed": 25,
  "vendors_succeeded": 24,
  "vendors_failed": 1,
  "suppliers_processed": 10,
  "suppliers_succeeded": 10,
  "suppliers_failed": 0,
  "duration_ms": 5432,
  "errors": [
    "Vendor Acme Corp: HTTP 500: Internal server error"
  ]
}
```

## Deployment

### Deploy to Supabase

```bash
# From project root
supabase functions deploy scheduled-scoring-update
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

-- Schedule the function to run daily at 2 AM
SELECT cron.schedule(
  'daily-scoring-update',
  '0 2 * * *',  -- Cron expression: Every day at 2:00 AM
  $$
    SELECT net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/scheduled-scoring-update',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
    );
  $$
);
```

### Option 2: Using External Cron Services

You can also use external cron services like:

- **Cron-job.org**: Free online cron service
- **EasyCron**: Feature-rich cron service
- **GitHub Actions**: Free for public repos
- **AWS CloudWatch Events**: If using AWS infrastructure

Example GitHub Actions workflow (`.github/workflows/daily-scoring.yml`):

```yaml
name: Daily Scoring Update

on:
  schedule:
    - cron: '0 2 * * *'  # Every day at 2:00 AM UTC
  workflow_dispatch:  # Allow manual triggering

jobs:
  update-scores:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Scoring Update
        run: |
          curl -X POST \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            https://YOUR_PROJECT_REF.supabase.co/functions/v1/scheduled-scoring-update
```

### Option 3: Using Supabase CLI with System Cron

On a server with cron access:

```bash
# Edit crontab
crontab -e

# Add this line to run daily at 2 AM
0 2 * * * curl -X POST -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" https://YOUR_PROJECT_REF.supabase.co/functions/v1/scheduled-scoring-update
```

## Manual Invocation

For testing or manual score updates:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/scheduled-scoring-update
```

## Monitoring

### Check Logs

View function logs in Supabase Dashboard or using CLI:

```bash
supabase functions logs scheduled-scoring-update --tail
```

### Expected Log Output

```
Scheduled scoring update started: {"timestamp":"2026-09-14T19:08:00.000Z","method":"POST"}
Fetching active vendors...
Found 25 active vendors to process
Processing vendor: Acme Corp (abc-123-def)
✓ Vendor score calculated: Acme Corp {"vendor_id":"abc-123-def","score":75.5}
Processing vendor: Beta Store (def-456-ghi)
✓ Vendor score calculated: Beta Store {"vendor_id":"def-456-ghi","score":82.3}
...
Fetching active suppliers...
Found 10 active suppliers to process
Processing supplier: Mega Supplies Ltd (ghi-789-jkl)
✓ Supplier score calculated: Mega Supplies Ltd {"supplier_id":"ghi-789-jkl","score":88.7}
...
Scheduled scoring update completed: {"success":true,"vendors_processed":25,...}
```

## Error Handling

The function is designed to be resilient:

1. **Individual Failures Don't Stop Processing**: If one vendor/supplier score calculation fails, the function continues processing others
2. **Comprehensive Error Tracking**: All errors are logged and returned in the summary
3. **Always Returns 200**: Even if some scores fail, the function returns HTTP 200 with details in the response body

## Dependencies

This function depends on the following Edge Functions being deployed:

- `calculate-vendor-score`: Calculates individual vendor scores
- `calculate-supplier-score`: Calculates individual supplier scores

Ensure these functions are deployed and working before scheduling this batch function.

## Security

- **No JWT Authentication Required**: This function is designed for internal cron invocation, not user-facing requests
- **Service Role Key**: Uses service role key for privileged database access
- **No User Input**: All data comes from the database, no user-provided parameters

## Performance Considerations

- **Processing Time**: Scales linearly with the number of vendors and suppliers
  - ~100ms per entity on average
  - For 100 vendors + 50 suppliers: ~15 seconds total
- **Rate Limiting**: Individual scoring functions may have rate limits; adjust cron frequency accordingly
- **Database Load**: Queries all active vendors and suppliers; ensure indexes are in place

## Troubleshooting

### Function Times Out

If you have many vendors/suppliers and the function times out:

1. Consider breaking into smaller batches
2. Increase function timeout in `supabase/functions/scheduled-scoring-update/index.ts`:
   ```typescript
   // Add at the top of serve()
   const controller = new AbortController();
   const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes
   ```

### Scoring Functions Not Found

Ensure `calculate-vendor-score` and `calculate-supplier-score` are deployed:

```bash
supabase functions list
```

### Authentication Errors

Verify that `SUPABASE_SERVICE_ROLE_KEY` is correctly set in your environment.

## Related Tasks

- Task 16.1: Create calculate-vendor-score Edge Function
- Task 16.4: Create calculate-supplier-score Edge Function
- Task 19.2: Create scheduled-cycle-check Edge Function

## Testing

### Test with Mock Data

Create a few test vendors and suppliers, then invoke the function manually:

```bash
# Manual invocation
curl -X POST \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/scheduled-scoring-update

# Check response
{
  "success": true,
  "vendors_processed": 3,
  "vendors_succeeded": 3,
  "vendors_failed": 0,
  ...
}
```

### Verify Score Updates

After running, check that scores were updated in the database:

```sql
-- Check latest vendor scores
SELECT 
  v.business_name,
  vs.score_value,
  vs.calculation_date
FROM vendors v
JOIN vendor_scores vs ON vs.vendor_id = v.id
WHERE vs.calculation_date::date = CURRENT_DATE
ORDER BY vs.calculation_date DESC;

-- Check latest supplier scores
SELECT 
  s.business_name,
  ss.score_value,
  ss.calculation_date
FROM suppliers s
JOIN supplier_scores ss ON ss.supplier_id = s.id
WHERE ss.calculation_date::date = CURRENT_DATE
ORDER BY ss.calculation_date DESC;
```
