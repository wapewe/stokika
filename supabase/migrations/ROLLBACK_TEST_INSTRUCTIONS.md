# Rollback Migration Test Instructions

## Overview
This document provides instructions for testing the rollback migrations for the vendor-id-manual-payment feature.

**Rollback Scripts Created:**
- `20260117000001_add_id_number_to_profiles_rollback.sql`
- `20260117000002_add_id_number_to_vendors_rollback.sql`
- `20260117000003_update_id_number_rls_rollback.sql`

## Prerequisites
- Docker Desktop or Podman installed and running
- Supabase CLI installed
- Local Supabase instance initialized (`supabase init`)

## Test Execution Order

### Step 1: Setup Local Supabase Instance
```bash
# Start local Supabase
supabase start

# Verify it's running
supabase status
```

### Step 2: Apply Forward Migrations
```bash
# Apply all forward migrations (if not already applied)
supabase db reset

# Or apply specific migrations
supabase db push
```

### Step 3: Verify Forward Migrations Applied
```sql
-- Connect to local database
supabase db reset

-- Check profiles.id_number column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'id_number';

-- Check vendors.id_number column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'vendors' AND column_name = 'id_number';

-- Check indexes exist
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('profiles', 'vendors')
AND indexname LIKE '%id_number%';

-- Check RLS policies exist
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('profiles', 'vendors')
AND policyname LIKE '%id_number%';
```

### Step 4: Create Test Data
```sql
-- Insert test profile with id_number
INSERT INTO profiles (id, email, id_number)
VALUES (
    gen_random_uuid(),
    'test@example.com',
    '12345678'
);

-- Insert test vendor with id_number
INSERT INTO vendors (profile_id, business_name, id_number)
VALUES (
    (SELECT id FROM profiles WHERE email = 'test@example.com'),
    'Test Business',
    '12345678'
);

-- Verify test data
SELECT id, email, id_number FROM profiles WHERE email = 'test@example.com';
SELECT vendor_id, business_name, id_number FROM vendors WHERE id_number = '12345678';
```

### Step 5: Apply Rollback Migrations (IN ORDER)

**IMPORTANT: Execute rollbacks in reverse order from forward migrations!**

#### 5.1 Rollback RLS Policies First
```bash
# Apply via Supabase CLI
psql postgresql://postgres:postgres@localhost:54322/postgres -f supabase/migrations/20260117000003_update_id_number_rls_rollback.sql
```

**Verify RLS policies removed:**
```sql
SELECT policyname FROM pg_policies 
WHERE tablename = 'profiles' AND policyname LIKE '%id_number%';
-- Expected: 0 rows

SELECT policyname FROM pg_policies 
WHERE tablename = 'vendors' AND policyname LIKE '%id_number%';
-- Expected: 0 rows
```

#### 5.2 Rollback Vendors Table
```bash
psql postgresql://postgres:postgres@localhost:54322/postgres -f supabase/migrations/20260117000002_add_id_number_to_vendors_rollback.sql
```

**Verify vendors.id_number removed:**
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'vendors' AND column_name = 'id_number';
-- Expected: 0 rows

SELECT indexname FROM pg_indexes 
WHERE tablename = 'vendors' AND indexname LIKE '%id_number%';
-- Expected: 0 rows
```

#### 5.3 Rollback Profiles Table
```bash
psql postgresql://postgres:postgres@localhost:54322/postgres -f supabase/migrations/20260117000001_add_id_number_to_profiles_rollback.sql
```

**Verify profiles.id_number removed:**
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'id_number';
-- Expected: 0 rows

SELECT indexname FROM pg_indexes 
WHERE tablename = 'profiles' AND indexname LIKE '%id_number%';
-- Expected: 0 rows
```

### Step 6: Verify Complete Rollback
```sql
-- Check no id_number columns remain
SELECT table_name, column_name 
FROM information_schema.columns
WHERE column_name = 'id_number'
AND table_schema = 'public';
-- Expected: 0 rows

-- Check no id_number indexes remain
SELECT tablename, indexname 
FROM pg_indexes
WHERE indexname LIKE '%id_number%'
AND schemaname = 'public';
-- Expected: 0 rows

-- Check no id_number policies remain
SELECT tablename, policyname 
FROM pg_policies
WHERE policyname LIKE '%id_number%'
AND schemaname = 'public';
-- Expected: 0 rows

-- Check no id_number constraints remain
SELECT constraint_name, table_name
FROM information_schema.check_constraints
WHERE constraint_name LIKE '%id_number%';
-- Expected: 0 rows
```

### Step 7: Test Re-applying Forward Migrations
```bash
# After successful rollback, re-apply forward migrations
supabase db reset

# Verify forward migrations work correctly after rollback
# Follow Step 3 verification queries
```

## Expected Results

### Successful Rollback Indicators
✅ All id_number columns removed from profiles and vendors tables  
✅ All id_number indexes dropped  
✅ All id_number RLS policies removed  
✅ All id_number CHECK constraints removed  
✅ Test data with id_number deleted (cascaded)  
✅ Forward migrations can be re-applied successfully  

### Warning Messages (Expected)
⚠️ "All id_number data has been permanently deleted" - This is expected behavior  
⚠️ "X payment_transactions exist with ID number account_references" - Only if test payments exist  

## Rollback Script Validation Checklist

- [x] Scripts use `DROP ... IF EXISTS` for safe idempotent execution
- [x] Scripts follow reverse order: RLS → Vendors → Profiles
- [x] Scripts include comprehensive comments and warnings
- [x] Scripts include verification queries
- [x] Scripts log completion status with RAISE NOTICE
- [x] Scripts check for orphaned data (payment_transactions)
- [x] Scripts match forward migration structure
- [x] Scripts include execution order instructions

## Common Issues and Solutions

### Issue: "Policy does not exist" error
**Solution:** Policies already removed or never created. This is safe to ignore with IF EXISTS clause.

### Issue: "Column does not exist" error  
**Solution:** Column already removed. This is safe to ignore with IF EXISTS clause.

### Issue: "Cannot drop index because other objects depend on it"
**Solution:** Drop dependent policies first. Follow rollback execution order.

### Issue: Payment reconciliation warnings
**Solution:** If payment_transactions exist with ID number account_references, manually reconcile before production rollback.

## Production Rollback Considerations

⚠️ **CRITICAL WARNINGS FOR PRODUCTION:**

1. **Data Loss:** Rollback permanently deletes all id_number data
2. **Payment Matching:** Manual paybill payments will fail to match after rollback
3. **User Access:** Users cannot login with ID number passwords after rollback
4. **Downtime Required:** Schedule maintenance window for rollback
5. **Backup Required:** Full database backup before rollback
6. **Communication:** Notify users of temporary service disruption

**Recommended Production Rollback Process:**
1. Enable maintenance mode
2. Backup entire database
3. Stop all payment processing services
4. Execute rollback migrations in order
5. Verify rollback completion
6. Clear application caches
7. Test critical user flows
8. Re-enable services
9. Monitor error logs

## Testing Completion Checklist

- [ ] Local Supabase instance started successfully
- [ ] Forward migrations applied and verified
- [ ] Test data created with id_number values
- [ ] Rollback migration 1 (RLS) executed successfully
- [ ] Rollback migration 2 (Vendors) executed successfully
- [ ] Rollback migration 3 (Profiles) executed successfully
- [ ] All verification queries pass (0 rows returned)
- [ ] Forward migrations re-apply successfully
- [ ] No error messages in Supabase logs
- [ ] Rollback scripts are idempotent (can run multiple times)

## Documentation

**Related Files:**
- Forward migrations: `supabase/migrations/20260117000001-3_*.sql`
- Requirements: `.kiro/specs/vendor-id-manual-payment/requirements.md`
- Design: `.kiro/specs/vendor-id-manual-payment/design.md`
- Tasks: `.kiro/specs/vendor-id-manual-payment/tasks.md`

**Contact:** For questions or issues, refer to the vendor-id-manual-payment spec documentation.
