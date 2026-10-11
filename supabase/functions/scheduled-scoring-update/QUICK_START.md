# Scheduled Scoring Update - Quick Start Guide

## What This Function Does

Automatically recalculates vendor and supplier scores for all active entities in the system. Designed to run daily via cron job.

## 5-Minute Setup

### 1. Deploy the Function

**Windows:**
```powershell
cd supabase\functions\scheduled-scoring-update
.\deploy.ps1
```

**Linux/Mac:**
```bash
cd supabase/functions/scheduled-scoring-update
chmod +x deploy.sh
./deploy.sh
```

### 2. Test It Works

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/scheduled-scoring-update
```

Expected response:
```json
{
  "success": true,
  "vendors_processed": 25,
  "suppliers_processed": 10,
  ...
}
```

### 3. Schedule Daily Execution

**Easiest: PostgreSQL pg_cron**

Run this SQL in Supabase SQL Editor:

```sql
-- Enable pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily at 2 AM
SELECT cron.schedule(
  'daily-scoring-update',
  '0 2 * * *',
  $$
    SELECT net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/scheduled-scoring-update',
      headers := '{"Authorization": "Bearer YOUR_SERVICE_KEY"}'::jsonb
    );
  $$
);
```

## Common Commands

### View Logs
```bash
supabase functions logs scheduled-scoring-update --tail
```

### List All Functions
```bash
supabase functions list
```

### Manual Invoke
```bash
curl -X POST \
  -H "Authorization: Bearer SERVICE_KEY" \
  https://PROJECT_REF.supabase.co/functions/v1/scheduled-scoring-update
```

### Run Tests
```bash
deno run --allow-net --allow-env test.ts
```

### Check Cron Jobs (pg_cron)
```sql
SELECT * FROM cron.job;
```

### View Cron Run History
```sql
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;
```

## What Gets Updated

### Vendors
- Queries: `WHERE onboarding_completed = true`
- Calls: `calculate-vendor-score` for each
- Updates: `vendor_scores` table

### Suppliers
- Queries: `WHERE is_active = true`
- Calls: `calculate-supplier-score` for each
- Updates: `supplier_scores` table

## Expected Performance

- **Small**: 10 vendors + 5 suppliers = ~1.5 seconds
- **Medium**: 100 vendors + 50 suppliers = ~15 seconds
- **Large**: 1000 vendors + 500 suppliers = ~2.5 minutes

## Troubleshooting

### Function not found
```bash
# Redeploy
supabase functions deploy scheduled-scoring-update
```

### Authentication error
```bash
# Verify service key
echo $SUPABASE_SERVICE_ROLE_KEY
```

### No entities processed
```sql
-- Check if entities exist
SELECT COUNT(*) FROM vendors WHERE onboarding_completed = true;
SELECT COUNT(*) FROM suppliers WHERE is_active = true;
```

### Timeout error
- Increase function timeout
- Implement batch processing
- Schedule more frequently with smaller batches

## Dependencies

Must be deployed first:
- ✅ `calculate-vendor-score`
- ✅ `calculate-supplier-score`

Check with:
```bash
supabase functions list
```

## Monitoring

### Check Today's Scores
```sql
-- Vendor scores from today
SELECT v.business_name, vs.score_value, vs.calculation_date
FROM vendors v
JOIN vendor_scores vs ON vs.vendor_id = v.id
WHERE vs.calculation_date::date = CURRENT_DATE;

-- Supplier scores from today
SELECT s.business_name, ss.score_value, ss.calculation_date
FROM suppliers s
JOIN supplier_scores ss ON ss.supplier_id = s.id
WHERE ss.calculation_date::date = CURRENT_DATE;
```

### View Function Response
```bash
curl -s -X POST \
  -H "Authorization: Bearer SERVICE_KEY" \
  https://PROJECT_REF.supabase.co/functions/v1/scheduled-scoring-update \
  | jq '.'
```

## Security Notes

- ✅ Uses service role key (privileged access)
- ✅ No user JWT required (internal cron job)
- ✅ No user input (queries database only)
- ✅ Comprehensive logging
- ⚠️ Keep service role key secret

## Support

- Full Documentation: [README.md](./README.md)
- Implementation Details: [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)
- Design Document: [../../../.kiro/specs/stokika-typescript-rebuild/design.md](../../../.kiro/specs/stokika-typescript-rebuild/design.md)
- Requirements: [../../../.kiro/specs/stokika-typescript-rebuild/requirements.md](../../../.kiro/specs/stokika-typescript-rebuild/requirements.md)

## Quick Health Check

```bash
# 1. Is function deployed?
supabase functions list | grep scheduled-scoring-update

# 2. Can it be invoked?
curl -X POST -H "Authorization: Bearer KEY" FUNCTION_URL

# 3. Are scores being updated?
# Run the SQL query above to check today's scores

# 4. Is cron job running?
SELECT * FROM cron.job WHERE jobname = 'daily-scoring-update';
```

---

**Status**: ✅ Ready for Production  
**Last Updated**: 2026-09-14  
**Version**: 1.0.0
