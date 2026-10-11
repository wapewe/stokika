# Rollback Migration Scripts Summary

## Task Completion: 1.4 Create rollback migration scripts

**Status:** ✅ Complete  
**Date:** 2026-01-17  
**Spec:** vendor-id-manual-payment  
**Requirement:** 12.9 (migration rollback instructions)

## Created Files

### 1. `20260117000001_add_id_number_to_profiles_rollback.sql`
**Purpose:** Rollback id_number column addition to profiles table

**Actions:**
- Drops `idx_profiles_id_number_lookup` index
- Drops `idx_profiles_id_number` unique index  
- Drops `id_number` column (automatically removes CHECK constraint)

**Safety Features:**
- All DROP statements use `IF EXISTS`
- Includes verification queries
- Logs rollback completion with RAISE NOTICE
- Warns about permanent data deletion

---

### 2. `20260117000002_add_id_number_to_vendors_rollback.sql`
**Purpose:** Rollback id_number column addition to vendors table

**Actions:**
- Drops `idx_vendors_id_number_lookup` index
- Drops `idx_vendors_id_number` unique index
- Drops `id_number` column (automatically removes CHECK constraint)

**Safety Features:**
- All DROP statements use `IF EXISTS`
- Checks for orphaned payment_transactions with ID number account_references
- Warns if payments need manual reconciliation
- Includes verification queries
- Logs rollback completion with payment count warning

---

### 3. `20260117000003_update_id_number_rls_rollback.sql`
**Purpose:** Rollback RLS policies for id_number access control

**Actions:**
- Drops `profiles_own_id_number_select` policy
- Drops `profiles_admin_id_number_select` policy
- Drops `vendors_own_id_number_select` policy
- Drops `vendors_admin_id_number_select` policy

**Safety Features:**
- All DROP POLICY statements use `IF EXISTS`
- Verifies policy removal count
- Documents execution order (must run BEFORE column rollbacks)
- Includes verification queries
- Provides next steps guidance

---

### 4. `ROLLBACK_TEST_INSTRUCTIONS.md`
**Purpose:** Comprehensive testing guide for rollback migrations

**Contains:**
- Step-by-step test execution instructions
- Verification queries for each rollback stage
- Expected results checklist
- Common issues and solutions
- Production rollback considerations and warnings
- Testing completion checklist

---

## Execution Order (CRITICAL)

Rollback migrations MUST be executed in reverse order:

1. **First:** `20260117000003_update_id_number_rls_rollback.sql` (RLS policies)
2. **Second:** `20260117000002_add_id_number_to_vendors_rollback.sql` (vendors table)
3. **Third:** `20260117000001_add_id_number_to_profiles_rollback.sql` (profiles table)

**Rationale:** Policies depend on columns, so policies must be removed first to avoid dependency errors.

---

## Key Features

### Idempotency
- All scripts use `IF EXISTS` clauses
- Can be run multiple times safely
- No errors if objects already removed

### Safety Checks
- Verification queries included in each script
- Checks for orphaned data (payment_transactions)
- Comprehensive warning messages about data loss
- Production rollback guidance

### Documentation
- Inline comments explain each action
- Rollback instructions at top of each file
- Verification queries at bottom of each file
- References to forward migrations and requirements

### Logging
- Uses PostgreSQL `RAISE NOTICE` for status updates
- Logs each component removed
- Warns about critical issues (orphaned payments)
- Provides next steps guidance

---

## Testing Status

**Local Testing:** ⏸️ Blocked - Docker not available in environment

**Manual Validation:** ✅ Complete
- SQL syntax verified
- DROP statements use IF EXISTS
- Execution order documented
- Verification queries included
- Warning messages appropriate

**Testing Instructions:** ✅ Complete
- Comprehensive test guide created
- Verification queries documented
- Expected results defined
- Common issues documented

---

## Production Rollback Warnings

⚠️ **CRITICAL:** Running these rollback scripts in production will:

1. **Permanently delete all ID number data** from profiles and vendors tables
2. **Break manual paybill payment matching** - payments will not link to vendors
3. **Disable ID number login** - users cannot authenticate with ID numbers
4. **Require manual reconciliation** of existing payments with ID account_references

**Before production rollback:**
- Schedule maintenance window
- Create full database backup
- Stop payment processing services
- Notify users of service disruption
- Plan data migration if ID numbers need preservation

---

## Verification Commands

### Check rollback completion:
```sql
-- No id_number columns should exist
SELECT table_name, column_name 
FROM information_schema.columns
WHERE column_name = 'id_number' AND table_schema = 'public';

-- No id_number indexes should exist
SELECT tablename, indexname 
FROM pg_indexes
WHERE indexname LIKE '%id_number%' AND schemaname = 'public';

-- No id_number policies should exist
SELECT tablename, policyname 
FROM pg_policies
WHERE policyname LIKE '%id_number%' AND schemaname = 'public';
```

All queries should return 0 rows after successful rollback.

---

## Files Relationship

```
Forward Migrations (Apply Order):
1. 20260117000001_add_id_number_to_profiles.sql
2. 20260117000002_add_id_number_to_vendors.sql
3. 20260117000003_update_id_number_rls.sql

Rollback Migrations (Apply Order):
1. 20260117000003_update_id_number_rls_rollback.sql
2. 20260117000002_add_id_number_to_vendors_rollback.sql
3. 20260117000001_add_id_number_to_profiles_rollback.sql
```

---

## Next Steps

1. **When Docker becomes available:**
   - Follow `ROLLBACK_TEST_INSTRUCTIONS.md`
   - Test each rollback script in local environment
   - Verify forward migrations can be re-applied

2. **Before production deployment:**
   - Test rollback scripts in staging environment
   - Document production rollback procedure
   - Create data preservation strategy if needed

3. **Production readiness:**
   - Review rollback scripts with DBA
   - Schedule maintenance window if needed
   - Prepare customer communication plan

---

## Compliance

✅ **Requirement 12.9 Satisfied:**
- Migration scripts include rollback instructions ✓
- Rollback instructions documented in comments ✓
- Standalone rollback scripts created ✓
- DROP statements for indexes and columns included ✓
- Testing instructions provided ✓

---

## Contact

For questions about these rollback scripts, refer to:
- **Spec:** `.kiro/specs/vendor-id-manual-payment/`
- **Requirements:** `requirements.md` (section 12.9)
- **Design:** `design.md`
- **Tasks:** `tasks.md` (Task 1.4)
