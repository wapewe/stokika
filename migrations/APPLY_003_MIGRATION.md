# Migration 003: Legacy Business Size Data Migration

## Overview

This migration transforms the legacy `business_size` field data into the new dimensional structure with separate `business_status_id`, `business_size_id`, and `business_model_id` fields.

**Task:** 1.3 - Vendor Registration Restructure  
**Requirements:** 15.1-15.7  
**Status:** Ready for execution

## What This Migration Does

### Legacy Mappings

1. **"Aspiring Entrepreneur"** → 
   - `business_status_id`: "Planning"
   - `business_size_id`: "Pre-Launch"
   - `business_model_id`: (default will be set if null)

2. **"Retail Trader"** →
   - `business_status_id`: "Operating"
   - `business_model_id`: "Retail"
   - `business_size_id`: Inferred from `stock_requirement_amount`:
     - < 30,000 KES: Micro
     - < 100,000 KES: Small
     - < 300,000 KES: Growing
     - ≥ 300,000 KES: Medium

3. **"Service Provider"** →
   - `business_status_id`: "Operating"
   - `business_model_id`: "Service Provider"
   - `business_size_id`: Inferred from `stock_requirement_amount`:
     - < 50,000 KES: Micro
     - ≥ 50,000 KES: Small

4. **Default Values** (for any remaining null fields):
   - `business_status_id`: "Operating"
   - `business_size_id`: "Small"
   - `business_model_id`: "Retail"

### Data Preservation

- Creates `legacy_business_size` column to preserve original values
- Updates `updated_at` timestamp for all migrated records
- Maintains referential integrity with lookup tables
- Generates detailed migration statistics

## Prerequisites

**REQUIRED:** Complete these migrations first:
1. ✅ Task 1.1 - Lookup tables must exist (business_categories, business_statuses, business_sizes, business_models)
2. ✅ Task 1.2 - New vendor columns must exist (from migration 002)

**Verify Prerequisites:**
```sql
-- Check if lookup tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN (
  'business_categories', 
  'business_statuses', 
  'business_sizes', 
  'business_models'
);

-- Should return 4 rows

-- Check if new columns exist
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'vendors' 
  AND column_name IN (
    'business_category_other',
    'stock_cycle',
    'stock_requirement_amount',
    'stock_justification',
    'bmc_completed'
  );

-- Should return 5 rows
```

## Pre-Migration Steps

### 1. Create Full Database Backup

**CRITICAL:** Always backup before running migrations!

```bash
# Using pg_dump (PostgreSQL)
pg_dump -h [host] -U [user] -d [database] -F c -f backup_before_migration_003_$(date +%Y%m%d_%H%M%S).dump

# Or using Supabase CLI
supabase db dump -f backup_before_migration_003_$(date +%Y%m%d_%H%M%S).sql
```

**Verify backup:**
```bash
# Check backup file exists and has reasonable size
ls -lh backup_before_migration_003_*.dump
```

### 2. Verify Current Vendor Count

```sql
-- Get baseline vendor count
SELECT COUNT(*) as total_vendors FROM vendors;

-- Check for existing dimension data
SELECT 
    COUNT(*) as total,
    COUNT(business_status_id) as has_status,
    COUNT(business_size_id) as has_size,
    COUNT(business_model_id) as has_model
FROM vendors;
```

**Expected Result:** Most dimension fields should be NULL before migration.

### 3. Test on Staging Environment First

**DO NOT run on production first!**

```sql
-- Connect to staging database
psql -h staging-db.example.com -U postgres -d stokika_staging

-- Run the migration
\i migrations/003_migrate_legacy_business_data.sql

-- Verify results
\i migrations/verify_003_migration.sql
```

## Running the Migration

### Option 1: Using psql (PostgreSQL Client)

```bash
# Connect to database
psql -h [host] -U [user] -d [database]

# Run migration script
\i migrations/003_migrate_legacy_business_data.sql
```

### Option 2: Using Supabase Dashboard

1. Go to Supabase Dashboard → SQL Editor
2. Open `migrations/003_migrate_legacy_business_data.sql`
3. Copy the entire contents
4. Paste into SQL Editor
5. Click "Run"
6. Review output in console

### Option 3: Using Supabase CLI

```bash
# Push migration to Supabase
supabase db push

# Or apply specific migration
supabase migration up --version 003
```

## Verification Steps

### 1. Run Verification Script

```bash
psql -h [host] -U [user] -d [database] -f migrations/verify_003_migration.sql
```

### 2. Manual Verification Checks

```sql
-- Check 1: No NULL dimension fields
SELECT COUNT(*) as unmigrated_vendors
FROM vendors
WHERE business_status_id IS NULL 
   OR business_size_id IS NULL
   OR business_model_id IS NULL;
-- Expected: 0

-- Check 2: Legacy field populated
SELECT COUNT(*) as has_legacy_value
FROM vendors
WHERE legacy_business_size IS NOT NULL;
-- Expected: Equal to total vendor count

-- Check 3: Verify distributions make sense
SELECT 
    bs.status_name,
    COUNT(*) as count
FROM vendors v
JOIN business_statuses bs ON v.business_status_id = bs.id
GROUP BY bs.status_name
ORDER BY count DESC;

-- Check 4: Verify indexes created
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'vendors' 
  AND indexname LIKE '%business%';
-- Expected: Multiple indexes including legacy_business_size
```

### 3. Expected Migration Output

The migration script will output:

```
==========================================
MIGRATION 003: Legacy Business Size Data
==========================================
Total vendors: [N]
Vendors requiring migration: [N]

✓ Migrated [N] "Aspiring Entrepreneur" vendors
  -> Status: Planning, Size: Pre-Launch

✓ Migrated [N] "Retail Trader" vendors
  -> Model: Retail, Status: Operating
  -> Size: Inferred from stock_requirement_amount

✓ Migrated [N] "Service Provider" vendors
  -> Model: Service Provider, Status: Operating
  -> Size: Inferred from stock_requirement_amount

==========================================
MIGRATION VERIFICATION
==========================================
Total vendors: [N]
Successfully migrated: [N]
Remaining unmigrated: 0

✓✓✓ MIGRATION 003 COMPLETED SUCCESSFULLY ✓✓✓
All [N] vendors migrated to new dimensional structure
==========================================

MIGRATION STATISTICS
==========================================
[Detailed statistics follow...]
```

## Post-Migration Steps

### 1. Verify Application Functionality

```bash
# Test vendor registration flow
# - Create new vendor with new dimensional fields
# - Verify old vendors display correctly
# - Check analytics queries work
```

### 2. Monitor for Issues

```sql
-- Check for orphaned records (shouldn't exist)
SELECT v.id, v.business_name
FROM vendors v
WHERE v.business_status_id NOT IN (SELECT id FROM business_statuses)
   OR v.business_size_id NOT IN (SELECT id FROM business_sizes)
   OR v.business_model_id NOT IN (SELECT id FROM business_models);
-- Expected: 0 rows
```

### 3. Update Application Code

**Important:** After migration, update application code to:
- Query new dimensional fields instead of legacy field
- Display business status, size, and model separately
- Use new analytics queries based on dimensions

## Rollback Procedure

If migration fails or needs to be rolled back:

```sql
BEGIN;

-- Clear migrated data
UPDATE vendors SET 
    business_status_id = NULL,
    business_size_id = NULL,
    business_model_id = NULL,
    legacy_business_size = NULL
WHERE legacy_business_size IS NOT NULL;

-- Remove legacy column
ALTER TABLE vendors DROP COLUMN IF EXISTS legacy_business_size;

COMMIT;
```

**Alternative:** Restore from backup:

```bash
# Using pg_restore
pg_restore -h [host] -U [user] -d [database] --clean --if-exists backup_before_migration_003_[timestamp].dump

# Or using SQL dump
psql -h [host] -U [user] -d [database] < backup_before_migration_003_[timestamp].sql
```

## Troubleshooting

### Issue: Migration fails with "relation does not exist"

**Cause:** Lookup tables not created (Task 1.1 not completed)

**Solution:**
```sql
-- Run the lookup table creation migration first
\i supabase/migrations/20260914160002_create_business_characteristics_tables.sql
```

### Issue: Migration fails with "column does not exist"

**Cause:** New vendor columns not added (Task 1.2 not completed)

**Solution:**
```sql
-- Run the column addition migration first
\i migrations/002_add_vendor_columns.sql
```

### Issue: Some vendors remain unmigrated (NULL fields)

**Cause:** Vendor data doesn't match expected patterns

**Solution:**
```sql
-- Identify problematic vendors
SELECT id, business_name, legacy_business_size
FROM vendors
WHERE business_status_id IS NULL;

-- Manually set values or investigate why mapping failed
```

### Issue: Stock amounts causing incorrect size assignments

**Cause:** Stock requirement data missing or zero

**Solution:** The migration handles NULL/zero stock amounts by defaulting to "Micro" size.

## Success Criteria

✅ Migration successful if:
1. All vendors have non-NULL `business_status_id`, `business_size_id`, `business_model_id`
2. `legacy_business_size` column populated for all vendors
3. Distributions match expected patterns:
   - "Aspiring Entrepreneur" → Planning + Pre-Launch
   - "Retail Trader" → Operating + Retail + (size based on stock)
   - "Service Provider" → Operating + Service Provider + (size based on stock)
4. All indexes created successfully
5. No errors in migration output
6. Verification script shows no issues

## Timeline

**Estimated Duration:** 
- Backup: 5-10 minutes
- Migration execution: 1-2 minutes (depends on vendor count)
- Verification: 2-3 minutes
- **Total: ~10-15 minutes**

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review migration output for specific error messages
3. Verify all prerequisites are met
4. Check backup was created successfully before attempting rollback
5. Consult with database administrator if issues persist

## Related Files

- **Migration Script:** `migrations/003_migrate_legacy_business_data.sql`
- **Verification Script:** `migrations/verify_003_migration.sql`
- **This Guide:** `migrations/APPLY_003_MIGRATION.md`
- **Requirements:** `.kiro/specs/vendor-registration-restructure/requirements.md`
- **Design Doc:** `.kiro/specs/vendor-registration-restructure/design.md`
- **Tasks:** `.kiro/specs/vendor-registration-restructure/tasks.md`

## Next Steps

After successful migration:
1. ✅ Mark Task 1.3 as complete
2. ➡️ Proceed to Task 1.4: Create database rollback script
3. ➡️ Continue with Task 2.1: Backend API implementation

---

**Migration 003 Status:** ✅ Ready for execution  
**Last Updated:** 2025-01-09  
**Author:** Kiro AI Assistant
