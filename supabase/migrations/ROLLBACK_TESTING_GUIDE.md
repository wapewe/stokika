# Rollback Migration Testing Guide

## Overview

This guide provides instructions for testing the rollback migration scripts for the vendor ID manual payment feature. The rollback scripts are designed to safely reverse the database schema changes made by the forward migrations.

## Rollback Scripts

### Created Rollback Scripts

1. **20260117000001_add_id_number_to_profiles_rollback.sql**
   - Rolls back the addition of `id_number` column to `profiles` table
   - Removes indexes: `idx_profiles_id_number_lookup` and `idx_profiles_id_number`
   - Forward migration: `20260117000001_add_id_number_to_profiles.sql` (✓ Exists)

2. **20260117000002_add_id_number_to_vendors_rollback.sql**
   - Rolls back the addition of `id_number` column to `vendors` table
   - Removes indexes: `idx_vendors_id_number_lookup` and `idx_vendors_id_number`
   - Forward migration: `20260117000002_add_id_number_to_vendors.sql` (⚠️ Not yet created)

3. **20260117000003_update_id_number_rls_rollback.sql**
   - Rolls back RLS policies for `id_number` access control
   - Removes policies: `profiles_own_id_number_select`, `profiles_admin_id_number_select`, `vendors_own_id_number_select`, `vendors_admin_id_number_select`
   - Forward migration: `20260117000003_update_id_number_rls.sql` (⚠️ Not yet created)

## Prerequisites for Testing

### Local Environment Setup

1. **Docker Desktop** must be installed and running
2. **Supabase CLI** installed (version 2.117.0 confirmed)
3. Local Supabase instance initialized in project directory

### Start Local Supabase

```powershell
# Navigate to project directory
cd c:\Users\ADMIN\Music\stokika

# Start local Supabase instance
supabase start

# Verify status
supabase status
```

## Testing Procedure

### Phase 1: Test Forward Migration (Profiles Only)

Since only the profiles migration exists, we'll test that one first:

```powershell
# Apply the forward migration
supabase db reset

# Verify the migration was applied
supabase db diff --schema public
```

#### Verification Queries

Run these queries to confirm the forward migration worked:

```sql
-- Check if id_number column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'id_number';

-- Expected result:
-- column_name | data_type | is_nullable
-- id_number   | text      | YES

-- Check if indexes exist
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'profiles' AND indexname LIKE '%id_number%';

-- Expected result: 2 rows
-- idx_profiles_id_number
-- idx_profiles_id_number_lookup

-- Check constraint exists
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'profiles'::regclass 
AND contype = 'c' 
AND conname LIKE '%id_number%';

-- Expected result: 1 row with CHECK constraint for regex
```

### Phase 2: Test Rollback Migration (Profiles)

```powershell
# Execute the rollback script
supabase db execute < supabase/migrations/20260117000001_add_id_number_to_profiles_rollback.sql
```

#### Verification Queries After Rollback

```sql
-- Check if id_number column is removed
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'id_number';

-- Expected result: 0 rows (column should not exist)

-- Check if indexes are removed
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'profiles' AND indexname LIKE '%id_number%';

-- Expected result: 0 rows (indexes should not exist)
```

### Phase 3: Test Data Preservation Warning

To test that the rollback properly warns about data loss:

```powershell
# Re-apply forward migration
supabase db reset

# Insert test data
supabase db execute -c "
INSERT INTO profiles (id, full_name, phone, email, id_number) 
VALUES 
  ('test-uuid-1', 'Test User 1', '254712345678', 'test1@example.com', '12345678'),
  ('test-uuid-2', 'Test User 2', '254723456789', 'test2@example.com', '23456789')
ON CONFLICT (id) DO NOTHING;
"

# Verify data exists
supabase db execute -c "SELECT id, full_name, id_number FROM profiles WHERE id_number IS NOT NULL;"

# Expected result: 2 rows with test data

# Now run rollback (THIS WILL DELETE THE DATA)
supabase db execute < supabase/migrations/20260117000001_add_id_number_to_profiles_rollback.sql

# Attempt to query the data
supabase db execute -c "SELECT id, full_name, id_number FROM profiles WHERE id_number IS NOT NULL;"

# Expected result: ERROR - column "id_number" does not exist
```

### Phase 4: Test Re-application After Rollback

```powershell
# After rollback, re-apply the forward migration
supabase db reset

# Verify the column is back
supabase db execute -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'id_number';"

# Expected result: 1 row (column exists again)
```

## Production Rollback Procedure

⚠️ **CRITICAL WARNING**: Only run rollbacks in production if absolutely necessary and with proper authorization.

### Pre-Rollback Checklist

- [ ] Create a full database backup
- [ ] Document the reason for rollback
- [ ] Get approval from stakeholders
- [ ] Schedule maintenance window
- [ ] Notify users of potential downtime
- [ ] Export all ID number data for potential recovery

### Production Rollback Steps

1. **Backup Current State**
   ```sql
   -- Export ID numbers from profiles
   COPY (SELECT id, id_number FROM profiles WHERE id_number IS NOT NULL) 
   TO '/tmp/profiles_id_numbers_backup.csv' CSV HEADER;
   
   -- Export ID numbers from vendors (if migration exists)
   COPY (SELECT id, id_number FROM vendors WHERE id_number IS NOT NULL) 
   TO '/tmp/vendors_id_numbers_backup.csv' CSV HEADER;
   ```

2. **Run Rollback Scripts in Reverse Order**
   ```sql
   -- First: Rollback RLS policies (if exists)
   \i supabase/migrations/20260117000003_update_id_number_rls_rollback.sql
   
   -- Second: Rollback vendors table (if exists)
   \i supabase/migrations/20260117000002_add_id_number_to_vendors_rollback.sql
   
   -- Third: Rollback profiles table
   \i supabase/migrations/20260117000001_add_id_number_to_profiles_rollback.sql
   ```

3. **Verify Rollback Success**
   ```sql
   -- Run all verification queries from Phase 2
   ```

4. **Monitor Application**
   - Check error logs for any references to `id_number` column
   - Verify payment processing still works (without ID number matching)
   - Monitor user registration flow

### Rollback Scenarios

#### Scenario 1: Partial Rollback (Keep Profiles, Remove Vendors)

If you need to keep ID numbers in profiles but remove from vendors:

```sql
-- Only run the vendors rollback
\i supabase/migrations/20260117000002_add_id_number_to_vendors_rollback.sql
```

#### Scenario 2: Rollback RLS Only (Keep Columns)

If you need to change RLS policies but keep the columns:

```sql
-- Only run the RLS rollback
\i supabase/migrations/20260117000003_update_id_number_rls_rollback.sql

-- Then create and apply new RLS policies as needed
```

#### Scenario 3: Complete Rollback

Remove all ID number functionality:

```sql
-- Run all three rollback scripts in reverse order
\i supabase/migrations/20260117000003_update_id_number_rls_rollback.sql
\i supabase/migrations/20260117000002_add_id_number_to_vendors_rollback.sql
\i supabase/migrations/20260117000001_add_id_number_to_profiles_rollback.sql
```

## Common Issues and Solutions

### Issue 1: "Column does not exist" during rollback

**Cause**: The forward migration was never applied or already rolled back.

**Solution**: 
```sql
-- Check if column exists first
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'id_number';

-- If it doesn't exist, no rollback needed
```

### Issue 2: "Index does not exist" during rollback

**Cause**: Indexes were manually dropped or never created.

**Solution**: The rollback scripts use `IF EXISTS` clauses, so this should not cause errors. Continue with the rollback.

### Issue 3: Data loss after rollback

**Cause**: Rollback scripts drop columns, which deletes all data in those columns.

**Solution**: 
- Restore from backup created in Pre-Rollback Checklist
- Re-apply forward migration and restore data:
  ```sql
  -- Re-apply forward migration
  \i supabase/migrations/20260117000001_add_id_number_to_profiles.sql
  
  -- Restore data from backup
  COPY profiles(id, id_number) 
  FROM '/tmp/profiles_id_numbers_backup.csv' CSV HEADER;
  ```

## Testing Status

### Current Status

- ✅ Rollback scripts created for all three migrations
- ✅ Scripts include comprehensive comments and warnings
- ✅ Verification queries included in scripts
- ⚠️ Local testing blocked: Docker not available in current environment
- ⚠️ Forward migrations 2 and 3 not yet created (rollback scripts are ready)

### Recommended Next Steps

1. **For Developer**: Install Docker Desktop to enable local Supabase testing
2. **For Team**: Create forward migrations 2 and 3 (vendors table and RLS policies)
3. **For Testing**: Run the full testing procedure outlined in this guide
4. **For Production**: Only apply after successful local and staging tests

## Contacts and Support

- **Database Admin**: Review all SQL changes before production deployment
- **Security Team**: Review RLS policy changes
- **DevOps**: Coordinate maintenance windows for production rollbacks

## References

- Forward Migration: `supabase/migrations/20260117000001_add_id_number_to_profiles.sql`
- Spec: `.kiro/specs/vendor-id-manual-payment/design.md`
- Requirements: `.kiro/specs/vendor-id-manual-payment/requirements.md` (Requirement 12.9)
