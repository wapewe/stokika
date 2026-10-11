# Backup & Disaster Recovery Guide

## Supabase Automatic Backups

### Enable Automatic Backups (Pro Plan Required)
1. Go to Supabase Dashboard → Project Settings → Backups
2. Enable automatic daily backups
3. Configure retention period (7, 14, or 30 days)
4. Backups include:
   - Database (PostgreSQL)
   - Storage files
   - Authentication data

### Manual Backup via Supabase Dashboard
1. Go to Database → Backups
2. Click "Create Backup"
3. Wait for backup to complete
4. Download backup file

## Manual Database Backup

### Using Supabase CLI
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Dump database
supabase db dump -f backup_$(date +%Y%m%d_%H%M%S).sql
```

### Using pg_dump (Direct PostgreSQL)
```bash
# Get connection string from Supabase Dashboard → Settings → Database
pg_dump "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" > backup.sql
```

## Automated Backup Script

### Windows Batch Script
```batch
@echo off
REM backup-stokika.bat
SET BACKUP_DIR=C:\backups\stokika
SET DATE=%date:~-4,4%%date:~-10,2%%date:~-7,2%
SET TIME=%time:~0,2%%time:~3,2%

REM Create backup directory
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

REM Backup database
supabase db dump -f "%BACKUP_DIR%\db_backup_%DATE%_%TIME%.sql"

REM Compress backup
powershell Compress-Archive -Path "%BACKUP_DIR%\db_backup_%DATE%_%TIME%.sql" -DestinationPath "%BACKUP_DIR%\db_backup_%DATE%_%TIME%.zip"

REM Delete old backups (keep last 30 days)
forfiles /p "%BACKUP_DIR%" /s /m *.zip /d -30 /c "cmd /c del @path"

echo Backup completed: %DATE%_%TIME%
```

### Schedule with Task Scheduler
1. Open Task Scheduler
2. Create Basic Task
3. Name: "Stokika Daily Backup"
4. Trigger: Daily at 2:00 AM
5. Action: Start a program
6. Program: `C:\backups\backup-stokika.bat`
7. Save and test

## Storage Backup

### Backup Supabase Storage
```javascript
// backup-storage.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function backupStorage() {
    const buckets = ['uploads', 'avatars', 'documents'];
    
    for (const bucket of buckets) {
        const { data: files, error } = await supabase.storage
            .from(bucket)
            .list('', { limit: 1000 });
        
        if (error) {
            console.error(`Error listing ${bucket}:`, error);
            continue;
        }
        
        for (const file of files) {
            const { data, error } = await supabase.storage
                .from(bucket)
                .download(file.name);
            
            if (!error) {
                const backupPath = path.join('backups', bucket, file.name);
                fs.mkdirSync(path.dirname(backupPath), { recursive: true });
                fs.writeFileSync(backupPath, Buffer.from(await data.arrayBuffer()));
                console.log(`Backed up: ${bucket}/${file.name}`);
            }
        }
    }
}

backupStorage();
```

## Disaster Recovery Procedures

### Database Restoration

#### From Supabase Backup
1. Go to Supabase Dashboard → Database → Backups
2. Select backup to restore
3. Click "Restore"
4. Confirm restoration
5. Wait for completion (5-30 minutes)

#### From SQL File
```bash
# Using Supabase CLI
supabase db reset
supabase db push --file backup.sql

# Using psql
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" < backup.sql
```

### Storage Restoration
```bash
# Upload files back to Supabase Storage
supabase storage upload uploads ./backups/uploads/*
```

### Application Code Restoration
```bash
# From Git repository
git clone https://github.com/your-org/stokika.git
cd stokika
git checkout main

# Restore dependencies
npm install

# Deploy to hosting
# (Follow deployment guide)
```

## Recovery Time Objectives (RTO)

| Component | RTO | RPO | Priority |
|-----------|-----|-----|----------|
| Database | 1 hour | 24 hours | Critical |
| Storage Files | 4 hours | 24 hours | High |
| Application Code | 30 minutes | 0 (Git) | Critical |
| Configuration | 15 minutes | 0 (Git) | Critical |

## Backup Verification

### Monthly Backup Test
1. Download latest backup
2. Restore to test environment
3. Verify data integrity
4. Test critical functions
5. Document results

### Verification Checklist
- [ ] Backup file exists and is not corrupted
- [ ] Backup size is reasonable (not 0 bytes)
- [ ] Can extract/decompress backup
- [ ] Can restore to test database
- [ ] All tables present
- [ ] Row counts match production
- [ ] Critical data accessible
- [ ] Application connects successfully

## Backup Storage Locations

### Primary Backup Location
- Supabase automatic backups (retained 7-30 days)
- Location: Supabase infrastructure

### Secondary Backup Location
- Local server: `C:\backups\stokika\`
- Retention: 30 days
- Automated daily backups

### Offsite Backup Location (Recommended)
- Cloud storage: Google Drive / Dropbox / OneDrive
- Retention: 90 days
- Weekly manual uploads

## Emergency Contacts

### Supabase Support
- Email: support@supabase.io
- Dashboard: https://supabase.com/dashboard
- Status: https://status.supabase.com

### Hosting Provider
- cPanel: pinnacle.co.ke
- Support: [Contact details]

### Internal Team
- Admin: admin@stokika.com
- Technical Lead: [Contact]
- Database Admin: [Contact]

## Disaster Scenarios & Response

### Scenario 1: Database Corruption
1. Stop all write operations
2. Assess extent of corruption
3. Restore from latest backup
4. Verify data integrity
5. Resume operations
6. Document incident

### Scenario 2: Accidental Data Deletion
1. Identify deleted data
2. Check if in recent backup
3. Restore specific tables/rows
4. Verify restoration
5. Implement additional safeguards

### Scenario 3: Complete System Failure
1. Activate disaster recovery team
2. Provision new infrastructure
3. Restore database from backup
4. Restore storage files
5. Deploy application code
6. Update DNS if needed
7. Test all systems
8. Communicate with users

### Scenario 4: Security Breach
1. Immediately revoke all credentials
2. Take system offline if needed
3. Assess breach extent
4. Restore from pre-breach backup
5. Patch vulnerabilities
6. Rotate all keys and passwords
7. Notify affected users
8. Document and report

## Backup Monitoring

### Daily Checks
- [ ] Backup job completed successfully
- [ ] Backup file size reasonable
- [ ] No error messages in logs
- [ ] Backup stored in all locations

### Weekly Checks
- [ ] Test restore on sample data
- [ ] Verify backup integrity
- [ ] Check storage space available
- [ ] Review backup logs

### Monthly Checks
- [ ] Full restore test
- [ ] Update recovery procedures
- [ ] Review and update contacts
- [ ] Audit backup retention

## Backup Retention Policy

| Backup Type | Retention Period | Storage Location |
|-------------|------------------|------------------|
| Daily | 30 days | Local + Supabase |
| Weekly | 90 days | Cloud storage |
| Monthly | 1 year | Cloud storage |
| Yearly | 7 years | Archive storage |

## Cost Considerations

### Supabase Backup Costs
- Free tier: No automatic backups
- Pro tier ($25/month): 7-day retention
- Team tier ($599/month): 14-day retention
- Enterprise: Custom retention

### Storage Costs
- Local storage: Minimal (disk space)
- Cloud storage: ~$5-10/month for 100GB
- Archive storage: ~$1-2/month for 100GB

## Compliance & Legal

### Data Retention Requirements
- Financial records: 7 years
- User data: As per GDPR/local laws
- Audit logs: 1 year minimum
- Backup logs: 1 year

### Encryption
- Backups encrypted at rest
- Encrypted during transfer
- Encryption keys stored separately
- Regular key rotation

## Documentation

### Maintain Documentation For
- Backup procedures
- Restoration procedures
- Test results
- Incident reports
- Configuration changes
- Contact information

### Update Documentation
- After each disaster recovery test
- When procedures change
- When contacts change
- Quarterly review minimum

---

**Last Updated:** [Date]
**Next Review:** [Date + 3 months]
**Document Owner:** Technical Lead
