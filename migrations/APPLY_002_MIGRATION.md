# Migration 002: Add Vendor Columns - Application Guide

## Overview
This migration adds 5 new columns to the `vendors` table and creates indexes on foreign key columns for the vendor registration restructure.

**Task:** 1.2 - Add new columns to vendors table  
**Requirements:** 11.1-11.10  
**Status:** Ready for Application  

## ⚠️ IMPORTANT PREREQUISITES

### Task 1.1 Must Be Completed First
This migration (Task 1.2) **depends on Task 1.1** being completed. Task 1.1 creates:
- `business_categories` table
- `business_statuses` table
- `business_sizes` table
- `business_models` table
- `vendor_bmc` table
- Foreign key columns in `vendors` table

**If Task 1.1 is not completed:**
- The index creation on foreign key columns will fail
- You should complete Task 1.1 first, then return to this migration

**If Task 1.1 is already completed:**
- Proceed with this migration

## Migration Details

### Columns Being Added
1. **business_category_other** (TEXT)
   - Stores custom category when "Other" is selected
   - No constraints (nullable)

2. **stock_cycle** (TEXT)
   - Values: 'daily', 'weekly', 'fortnightly', 'monthly'
   - CHECK constraint enforces enum values
   - No default value (nullable)

3. **stock_requirement_amount** (DECIMAL(10,2))
   - Estimated stock requirement in KES
   - CHECK constraint: must be > 0
   - No default value (nullable)

4. **stock_justification** (TEXT)
   - Explanation of stock needs
   - CHECK constraint: minimum 20 characters
   - No default value (nullable)

5. **bmc_completed** (BOOLEAN)
   - Indicates BMC completion status
   - Default: `false`
   - NOT NULL constraint

### Indexes Being Created
- `idx_vendors_business_category` on `business_category_id`
- `idx_vendors_business_status` on `business_status_id`
- `idx_vendors_business_size` on `business_size_id`
- `idx_vendors_business_model` on `business_model_id`
- `idx_vendors_bmc_completed` on `bmc_completed`
- `idx_vendors_stock_cycle` on `stock_cycle`

## Application Steps

### Step 1: Backup Current Database
Before applying any migration, create a backup:

```bash
# If you have pg_dump access
pg_dump -h db.eidsqrnwfndruuufyacc.supabase.co \
  -U postgres \
  -d postgres \
  > backup_before_migration_002_$(date +%Y%m%d_%H%M%S).sql
```

**Or use Supabase Dashboard:**
1. Go to Database → Backups
2. Create a manual backup with name: "Before Migration 002 - Vendor Columns"

### Step 2: Verify Task 1.1 Completion
Run this query in Supabase SQL Editor to check if Task 1.1 is complete:

```sql
-- Check if lookup tables exist
SELECT 
    'business_categories' as table_name,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_categories') as exists
UNION ALL
SELECT 'business_statuses', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_statuses')
UNION ALL
SELECT 'business_sizes', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_sizes')
UNION ALL
SELECT 'business_models', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_models')
UNION ALL
SELECT 'vendor_bmc', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vendor_bmc');

-- Check if foreign key columns exist in vendors table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'vendors'
AND column_name IN ('business_category_id', 'business_status_id', 'business_size_id', 'business_model_id');
```

**Expected Result:**
- All tables should exist (exists = true)
- All 4 foreign key columns should be listed

**If Task 1.1 is NOT complete:**
- Stop here and complete Task 1.1 first
- File location: `migrations/001_create_lookup_tables.sql`

### Step 3: Apply Migration via Supabase Dashboard

1. **Open Supabase SQL Editor:**
   - Go to: https://supabase.com/dashboard/project/eidsqrnwfndruuufyacc/sql/new

2. **Open Migration File:**
   - Open: `c:\Users\ADMIN\Music\stokika\migrations\002_add_vendor_columns.sql`

3. **Copy ALL Contents:**
   - Press `Ctrl+A` to select all
   - Press `Ctrl+C` to copy

4. **Paste into SQL Editor:**
   - Click in the Supabase SQL Editor
   - Press `Ctrl+V` to paste

5. **Review the SQL:**
   - Ensure all content pasted correctly
   - Check that BEGIN and COMMIT statements are present

6. **Execute Migration:**
   - Click the **RUN** button (or press `Ctrl+Enter`)

### Step 4: Verify Migration Success

You should see success messages in the output:
```
NOTICE: ✓ Migration 002 successful: All vendor table columns added
NOTICE:   - business_category_other (TEXT)
NOTICE:   - stock_cycle (TEXT with enum constraint)
NOTICE:   - stock_requirement_amount (DECIMAL with positive constraint)
NOTICE:   - stock_justification (TEXT with min 20 chars constraint)
NOTICE:   - bmc_completed (BOOLEAN default false)
NOTICE: ✓ Indexes created on foreign key columns
```

### Step 5: Verify Columns Exist

Run this verification query:

```sql
-- Verify all columns were added
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'vendors'
AND column_name IN (
    'business_category_other',
    'stock_cycle',
    'stock_requirement_amount',
    'stock_justification',
    'bmc_completed'
)
ORDER BY column_name;
```

**Expected Results:**
| column_name | data_type | is_nullable | column_default |
|-------------|-----------|-------------|----------------|
| bmc_completed | boolean | NO | false |
| business_category_other | text | YES | NULL |
| stock_cycle | text | YES | NULL |
| stock_justification | text | YES | NULL |
| stock_requirement_amount | numeric | YES | NULL |

### Step 6: Verify Indexes Exist

Run this verification query:

```sql
-- Verify indexes were created
SELECT 
    indexname,
    tablename
FROM pg_indexes
WHERE tablename = 'vendors'
AND indexname LIKE 'idx_vendors_%'
ORDER BY indexname;
```

**Expected Results:**
- `idx_vendors_bmc_completed`
- `idx_vendors_business_category`
- `idx_vendors_business_model`
- `idx_vendors_business_size`
- `idx_vendors_business_status`
- `idx_vendors_stock_cycle`

### Step 7: Test Constraints

Test that constraints are working correctly:

```sql
-- Test stock_cycle enum constraint (should succeed)
BEGIN;
CREATE TEMP TABLE test_vendors AS SELECT * FROM vendors LIMIT 0;
INSERT INTO test_vendors (id, stock_cycle) VALUES (gen_random_uuid(), 'weekly');
SELECT stock_cycle FROM test_vendors;
ROLLBACK;

-- Test stock_cycle invalid value (should fail)
BEGIN;
CREATE TEMP TABLE test_vendors2 AS SELECT * FROM vendors LIMIT 0;
INSERT INTO test_vendors2 (id, stock_cycle) VALUES (gen_random_uuid(), 'invalid');
-- Should fail with: new row for relation "test_vendors2" violates check constraint "vendors_stock_cycle_check"
ROLLBACK;
```

## Rollback Procedure

If you need to rollback this migration:

```sql
BEGIN;

-- Drop indexes
DROP INDEX IF EXISTS idx_vendors_bmc_completed;
DROP INDEX IF EXISTS idx_vendors_business_category;
DROP INDEX IF EXISTS idx_vendors_business_model;
DROP INDEX IF EXISTS idx_vendors_business_size;
DROP INDEX IF EXISTS idx_vendors_business_status;
DROP INDEX IF EXISTS idx_vendors_stock_cycle;

-- Drop columns (this will permanently delete any data in these columns)
ALTER TABLE vendors DROP COLUMN IF EXISTS business_category_other;
ALTER TABLE vendors DROP COLUMN IF EXISTS stock_cycle;
ALTER TABLE vendors DROP COLUMN IF EXISTS stock_requirement_amount;
ALTER TABLE vendors DROP COLUMN IF EXISTS stock_justification;
ALTER TABLE vendors DROP COLUMN IF EXISTS bmc_completed;

COMMIT;
```

⚠️ **WARNING:** Rollback will permanently delete any data stored in these columns!

## Post-Migration Checklist

- [ ] Migration executed successfully in Supabase Dashboard
- [ ] Success messages displayed in output
- [ ] All 5 columns exist in vendors table (verified)
- [ ] All 6 indexes created (verified)
- [ ] Constraints tested and working
- [ ] No error messages in Supabase logs
- [ ] Backup created before migration
- [ ] Mark task 1.2 as complete in tasks.md

## Next Steps

After completing this migration:
1. **Task 1.3:** Implement data migration script (migrate legacy data)
2. **Task 2.1:** Create InputValidator class with sanitization methods
3. Continue with remaining implementation tasks

## Troubleshooting

### Error: relation "business_categories" does not exist
**Cause:** Task 1.1 not completed  
**Solution:** Complete Task 1.1 first

### Error: column "business_category_id" does not exist
**Cause:** Task 1.1 foreign key columns not added  
**Solution:** Complete Task 1.1 first

### Error: constraint already exists
**Cause:** Migration already partially applied  
**Solution:** The migration script uses `IF NOT EXISTS` clauses and should handle this gracefully. Review output to confirm columns were added.

### Error: permission denied
**Cause:** Insufficient database permissions  
**Solution:** Ensure you're using the service role key or have admin permissions in Supabase

## Support

If you encounter issues:
1. Check Supabase logs (Database → Logs)
2. Review error messages carefully
3. Ensure Task 1.1 is complete
4. Verify database permissions
5. Consult the design document for requirements context

---

**Migration File:** `migrations/002_add_vendor_columns.sql`  
**Created:** 2025-01-XX  
**Status:** Ready for Application
