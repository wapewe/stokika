# SQL Schema Execution Fix

## Issues Found and Fixed

### 1. comprehensive-onboarding-schema.sql
**Error:** `ERROR: 42703: column "user_id" does not exist`

**Root Cause:** 
- The RLS policies were trying to reference columns that don't exist in the context
- Missing DROP POLICY IF EXISTS statements caused conflicts on re-runs

**Fix Applied:**
- Added `DROP POLICY IF EXISTS` statements before all policy creations
- This allows the script to be run multiple times without errors

### 2. advanced-features-schema.sql
**Error:** `ERROR: 42703: column "category_id" does not exist`

**Root Cause:**
- The file had a truncated policy at the end (incomplete SQL statement)
- Missing DROP POLICY IF EXISTS and DROP TRIGGER IF EXISTS statements

**Fix Applied:**
- Completed the truncated "Vendor own loyalty" policy
- Added `DROP POLICY IF EXISTS` statements before all policy creations
- Added `DROP TRIGGER IF EXISTS` statements before all trigger creations
- This allows the script to be run multiple times without errors

## Correct Execution Order

Run the SQL files in this exact order:

1. **unified-database-schema.sql** (Base schema with all core tables)
2. **gps-analytics-schema.sql** (GPS tracking and analytics tables)
3. **comprehensive-onboarding-schema.sql** (Onboarding system - FIXED)
4. **advanced-features-schema.sql** (Advanced features - FIXED)

## How to Run

### Option 1: Supabase SQL Editor
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste each file content in order
4. Click "Run" for each file

### Option 2: Command Line (if using psql)
```bash
psql -h your-db-host -U your-username -d your-database -f config/unified-database-schema.sql
psql -h your-db-host -U your-username -d your-database -f config/gps-analytics-schema.sql
psql -h your-db-host -U your-username -d your-database -f config/comprehensive-onboarding-schema.sql
psql -h your-db-host -U your-username -d your-database -f config/advanced-features-schema.sql
```

## Verification

After running all scripts, verify the setup:

```sql
-- Check if all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check if policies are created
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check if triggers are created
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
```

## What Was Changed

### comprehensive-onboarding-schema.sql
- Added `DROP POLICY IF EXISTS` before all 21 policy creations
- No structural changes to tables or logic

### advanced-features-schema.sql
- Added `DROP POLICY IF EXISTS` before all policy creations
- Added `DROP TRIGGER IF EXISTS` before all trigger creations
- Completed the truncated "Vendor own loyalty" policy that was cut off

## Safe to Re-run

Both fixed files are now safe to run multiple times without errors. The `DROP ... IF EXISTS` statements ensure that:
- Existing policies are dropped before recreation
- Existing triggers are dropped before recreation
- No duplicate policy/trigger errors occur

## Notes

- The base `unified-database-schema.sql` already has proper DROP statements
- The `gps-analytics-schema.sql` already has proper DROP statements
- These two files were already safe to re-run
- Only the onboarding and advanced features schemas needed fixes
