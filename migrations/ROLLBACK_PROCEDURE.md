# Vendor Registration Restructure - Rollback Procedure

## Overview

This document provides step-by-step instructions for rolling back the Vendor Registration Restructure (Migrations 002 and 003) in case of issues with the new dimensional business structure.

**Related Task**: Task 1.4 - Create database rollback script  
**Requirements**: 15.1

## When to Use This Rollback

Roll back to the legacy schema if you encounter:

1. **Critical Production Issues**
   - Vendor registration failures exceeding 10%
   - Data integrity issues with dimensional fields
   - Performance degradation in vendor queries

2. **Business Requirements Change**
   - Need to revert to simplified business size field
   - Stakeholder decision to postpone restructure

3. **Technical Issues**
   - Frontend integration problems
   - API endpoint failures
   - Database performance issues

## Prerequisites

### Before Starting Rollback

1. **Database Backup**
   ```bash
   # Create full database backup
   pg_dump -h <host> -U <user> -d stokika_db > backup_before_rollback_$(date +%Y%m%d_%H%M%S).sql
   
   # Verify backup file size (should be >1MB for non-empty database)
   ls -lh backup_before_rollback_*.sql
   ```

2. **Test Backup Integrity**
   ```bash
   # Test restore to temporary database
   createdb test_restore
   psql -d test_restore -f backup_before_rollback_YYYYMMDD_HHMMSS.sql
   psql -d test_restore -c "SELECT COUNT(*) FROM vendors;"
   dropdb test_restore
   ```

3. **Stakeholder Approval**
   - [ ] Get approval from technical lead
   - [ ] Get approval from product owner
   - [ ] Notify business stakeholders
   - [ ] Schedule maintenance window (recommended: 2 hours)

4. **Communication Plan**
   - [ ] Notify vendors of maintenance window
   - [ ] Prepare status page update
   - [ ] Alert support team
   - [ ] Prepare rollback announcement

## Rollback Process

### Phase 1: Pre-Rollback Verification (15 minutes)

#### 1.1 Connect to Database

```bash
# Production environment
psql -h <production-host> -U <username> -d stokika_db

# Or via connection string
psql postgresql://<user>:<password>@<host>:5432/stokika_db
```

#### 1.2 Document Current State

```sql
-- Count total vendors
SELECT COUNT(*) as total_vendors FROM vendors;

-- Count vendors with dimensional data
SELECT 
    COUNT(*) FILTER (WHERE business_status_id IS NOT NULL) as with_status,
    COUNT(*) FILTER (WHERE business_size_id IS NOT NULL) as with_size,
    COUNT(*) FILTER (WHERE business_model_id IS NOT NULL) as with_model,
    COUNT(*) FILTER (WHERE bmc_completed = true) as with_bmc
FROM vendors;

-- Check vendor_bmc records
SELECT COUNT(*) as bmc_records FROM vendor_bmc;

-- Save results to file for comparison
\o pre_rollback_state.txt
\echo 'Pre-Rollback State Captured at: ' `date`
\o
```

#### 1.3 Verify Rollback Script Availability

```sql
-- Check if rollback script exists and is readable
\! ls -l /path/to/migrations/rollback_vendor_registration_restructure.sql
```

### Phase 2: Execute Rollback (30 minutes)

#### 2.1 Set Maintenance Mode

```bash
# Touch maintenance file (application-specific)
touch /var/www/html/maintenance.flag

# Or update status page
curl -X POST https://status.stokika.com/api/incidents \
  -d "status=investigating&message=Performing database maintenance"
```

#### 2.2 Stop Application Servers (Optional but Recommended)

```bash
# Stop web servers to prevent new connections
sudo systemctl stop apache2  # or nginx
# Or scale down containers
kubectl scale deployment stokika-web --replicas=0
```

#### 2.3 Execute Rollback Script

```bash
# Run rollback script with output logging
psql -h <host> -U <user> -d stokika_db \
  -f migrations/rollback_vendor_registration_restructure.sql \
  2>&1 | tee rollback_execution_$(date +%Y%m%d_%H%M%S).log
```

**Expected Output:**
```
============================================================
ROLLBACK: Vendor Registration Restructure
============================================================
...
✓ Step 1: Created backup table with XXX vendor records
✓ Step 3: Dropped performance indexes
✓ Step 4: Cleared dimensional data from XXX vendor records
✓ Step 5: Dropped CHECK constraints
✓ Step 6: Dropped new columns from vendors table
✓ Step 7: Dropped legacy_business_size column
============================================================
✓✓✓ ROLLBACK COMPLETED SUCCESSFULLY ✓✓✓
============================================================
```

#### 2.4 Handle Errors (if any)

If rollback fails:

```sql
-- Check what transaction is open
SELECT * FROM pg_stat_activity WHERE state = 'active';

-- If script failed mid-transaction, rollback manually
ROLLBACK;

-- Review error message
-- Fix issue (e.g., locked tables, permissions)
-- Re-run rollback script
```

### Phase 3: Post-Rollback Verification (30 minutes)

#### 3.1 Verify Schema Changes

```sql
-- Verify columns were dropped
SELECT column_name 
FROM information_schema.columns
WHERE table_name = 'vendors'
  AND column_name IN (
    'business_category_other',
    'stock_cycle',
    'stock_requirement_amount',
    'stock_justification',
    'bmc_completed',
    'legacy_business_size'
  );
-- Should return 0 rows

-- Verify indexes were dropped
SELECT indexname 
FROM pg_indexes
WHERE tablename = 'vendors'
  AND indexname IN (
    'idx_vendors_business_category',
    'idx_vendors_business_status',
    'idx_vendors_business_size',
    'idx_vendors_business_model',
    'idx_vendors_bmc_completed',
    'idx_vendors_stock_cycle'
  );
-- Should return 0 rows
```

#### 3.2 Verify Data Preservation

```sql
-- Verify all vendors still exist
SELECT COUNT(*) as vendors_after_rollback FROM vendors;
-- Compare with pre-rollback count

-- Verify backup table created
SELECT COUNT(*) as backup_records FROM vendors_before_rollback;
-- Should match vendor count

-- Verify dimensional data cleared
SELECT 
    COUNT(*) FILTER (WHERE business_status_id IS NOT NULL) as with_status,
    COUNT(*) FILTER (WHERE business_size_id IS NOT NULL) as with_size,
    COUNT(*) FILTER (WHERE business_model_id IS NOT NULL) as with_model
FROM vendors;
-- All should be 0
```

#### 3.3 Test Basic Queries

```sql
-- Test vendor retrieval
SELECT id, business_name, county, phone, email
FROM vendors
LIMIT 5;

-- Test joins with profiles
SELECT v.id, v.business_name, p.full_name
FROM vendors v
JOIN profiles p ON v.profile_id = p.id
LIMIT 5;

-- Measure query performance
EXPLAIN ANALYZE
SELECT * FROM vendors WHERE county = 'Nairobi';
```

### Phase 4: Application Updates (45 minutes)

#### 4.1 Revert Frontend Changes

```bash
# Checkout previous version of dalana.html
cd /path/to/stokika
git checkout <previous-commit-hash> -- dalana.html

# Revert vendor registration JavaScript
git checkout <previous-commit-hash> -- js/vendor-modal-fix.js

# Remove new files (if any)
rm -f js/vendor-registration-wizard.js
```

#### 4.2 Revert Backend API Changes

```bash
# Remove new API endpoint
rm -f api/vendor-registration.php

# Revert modified files
git checkout <previous-commit-hash> -- api/vendor-registration-legacy.php
```

#### 4.3 Deploy Reverted Code

```bash
# Production deployment (adjust for your setup)
rsync -avz dalana.html production:/var/www/html/
rsync -avz js/ production:/var/www/html/js/
rsync -avz api/ production:/var/www/html/api/

# Or via CI/CD
git tag rollback-vendor-restructure
git push origin rollback-vendor-restructure
# Trigger deployment pipeline
```

#### 4.4 Clear Caches

```bash
# Clear CDN cache
curl -X POST https://cdn.stokika.com/api/purge \
  -d "paths=/dalana.html,/js/vendor-modal-fix.js"

# Clear application cache
php artisan cache:clear  # Laravel
# or
redis-cli FLUSHALL      # Redis
```

### Phase 5: Restart and Monitor (30 minutes)

#### 5.1 Restart Application

```bash
# Start web servers
sudo systemctl start apache2

# Or scale up containers
kubectl scale deployment stokika-web --replicas=3

# Remove maintenance mode
rm /var/www/html/maintenance.flag
```

#### 5.2 Monitor Application Health

```bash
# Check HTTP status
curl -I https://stokika.com/dalana.html
# Should return 200 OK

# Test vendor registration page loads
curl -s https://stokika.com/dalana.html | grep "vendor-registration"
```

#### 5.3 Test Vendor Registration Flow

**Manual Test Checklist:**

1. [ ] Open dalana.html in browser
2. [ ] Click "Register as Vendor" button
3. [ ] Verify legacy modal structure displays
4. [ ] Fill in basic vendor information
5. [ ] Verify legacy "Business Size" dropdown has 3 options:
   - Aspiring Entrepreneur
   - Retail Trader
   - Service Provider
6. [ ] Complete registration
7. [ ] Verify success message
8. [ ] Check database for new vendor record

#### 5.4 Monitor Metrics

```sql
-- Monitor registration attempts (first 2 hours)
SELECT 
    DATE_TRUNC('minute', created_at) as minute,
    COUNT(*) as registrations
FROM vendors
WHERE created_at > NOW() - INTERVAL '2 hours'
GROUP BY minute
ORDER BY minute DESC;

-- Monitor error rates (if logging table exists)
SELECT error_type, COUNT(*) 
FROM error_logs
WHERE created_at > NOW() - INTERVAL '2 hours'
  AND context LIKE '%vendor%'
GROUP BY error_type;
```

## Post-Rollback Actions

### Immediate (First 24 Hours)

1. **Monitor Registration Rate**
   - Expected: Return to baseline rate within 4 hours
   - Alert if rate <50% of baseline after 6 hours

2. **Check Error Logs**
   ```bash
   # Application logs
   tail -f /var/log/apache2/error.log | grep vendor
   
   # Database logs
   tail -f /var/log/postgresql/postgresql-14-main.log
   ```

3. **User Feedback**
   - Monitor support tickets
   - Check social media mentions
   - Review in-app feedback

### Short-term (1-7 Days)

1. **Keep Backup Table**
   ```sql
   -- DO NOT drop vendors_before_rollback yet
   -- Keep for at least 30 days
   ```

2. **Document Lessons Learned**
   - What caused the rollback?
   - What could have been prevented?
   - What testing was missed?

3. **Plan Re-Migration** (if applicable)
   - Fix identified issues
   - Enhanced testing strategy
   - Gradual rollout plan

### Long-term (30+ Days)

1. **Archive Backup Table**
   ```sql
   -- Export backup to file
   \copy vendors_before_rollback TO '/backups/vendors_dimensional_data.csv' CSV HEADER;
   
   -- Drop table after 30 days
   DROP TABLE vendors_before_rollback;
   ```

2. **Remove Unused Lookup Tables** (if not re-migrating)
   ```sql
   DROP TABLE IF EXISTS vendor_bmc CASCADE;
   DROP TABLE IF EXISTS business_models CASCADE;
   DROP TABLE IF EXISTS business_sizes CASCADE;
   DROP TABLE IF EXISTS business_statuses CASCADE;
   DROP TABLE IF EXISTS business_categories CASCADE;
   ```

## Re-Migration Procedure

If you want to re-apply the restructure after fixing issues:

### Step 1: Restore Dimensional Data

```bash
# Run restoration script
psql -h <host> -U <user> -d stokika_db \
  -f migrations/restore_dimensional_data.sql
```

This script:
- Restores data from `vendors_before_rollback` table
- Re-applies dimensional mappings
- Preserves all data integrity

### Step 2: Re-apply Migrations

```bash
# Re-run migration 002 (add columns)
psql -h <host> -U <user> -d stokika_db \
  -f migrations/002_add_vendor_columns.sql

# Re-run migration 003 (migrate data)
psql -h <host> -U <user> -d stokika_db \
  -f migrations/003_migrate_legacy_business_data.sql
```

### Step 3: Deploy Fixed Application Code

```bash
# Deploy updated frontend and backend
# with bug fixes applied
```

## Troubleshooting

### Issue: Rollback Script Fails to Drop Columns

**Symptom:** Error message "cannot drop column ... because other objects depend on it"

**Solution:**
```sql
-- Find dependent objects
SELECT 
    c.conname AS constraint_name,
    t.relname AS table_name
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
WHERE c.conname LIKE '%vendor%';

-- Drop dependent constraints first
ALTER TABLE <dependent_table> DROP CONSTRAINT <constraint_name>;

-- Then re-run rollback script
```

### Issue: Backup Table Not Created

**Symptom:** `vendors_before_rollback` table does not exist after rollback

**Solution:**
```sql
-- Manually create backup from database backup file
-- This is why we created backup BEFORE rollback
-- Restore database from backup and retry rollback
```

### Issue: Application Still Shows New Modal

**Symptom:** Users see dimensional fields after rollback

**Solution:**
```bash
# Clear browser cache
# Clear CDN cache
curl -X POST https://cdn.stokika.com/api/purge-all

# Verify correct file deployed
curl -s https://stokika.com/js/vendor-modal-fix.js | head -20
```

### Issue: Data Loss Detected

**Symptom:** Vendor count decreased after rollback

**Solution:**
```sql
-- Check if vendors exist in backup
SELECT COUNT(*) FROM vendors_before_rollback;

-- Restore missing vendors from database backup
-- DO NOT attempt manual fixes
-- Contact database administrator immediately
```

## Emergency Contacts

- **Database Administrator**: [Contact Info]
- **Technical Lead**: [Contact Info]
- **Product Owner**: [Contact Info]
- **On-Call Engineer**: [Contact Info]

## Rollback Checklist

Print this checklist and check off each item during rollback:

### Pre-Rollback
- [ ] Database backup created and verified
- [ ] Stakeholder approval obtained
- [ ] Maintenance window scheduled
- [ ] Communication plan executed
- [ ] Current state documented

### Rollback Execution
- [ ] Maintenance mode enabled
- [ ] Application servers stopped (optional)
- [ ] Rollback script executed successfully
- [ ] No errors in rollback log

### Post-Rollback
- [ ] Schema changes verified
- [ ] Data preservation verified
- [ ] Backup table created and populated
- [ ] Basic queries tested successfully

### Application Updates
- [ ] Frontend code reverted
- [ ] Backend code reverted
- [ ] Code deployed to production
- [ ] Caches cleared

### Verification
- [ ] Application servers restarted
- [ ] HTTP status checks passing
- [ ] Vendor registration tested manually
- [ ] Metrics monitoring active

### Follow-up
- [ ] 1-hour health check completed
- [ ] 6-hour registration rate verified
- [ ] 24-hour error log review completed
- [ ] Rollback report documented

## Related Documents

- `rollback_vendor_registration_restructure.sql` - Main rollback script
- `restore_dimensional_data.sql` - Restoration script for re-migration
- `migrations/002_add_vendor_columns.sql` - Forward migration (columns)
- `migrations/003_migrate_legacy_business_data.sql` - Forward migration (data)
- `TASK_1.3_COMPLETION_REPORT.md` - Original migration report

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-XX  
**Author**: Database Migration Team
