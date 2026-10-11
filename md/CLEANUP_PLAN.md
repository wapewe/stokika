# Project Cleanup Plan

## Files to Delete (Obsolete/Redundant)

### HTML Files
- [ ] `html/ultra-secure-signin.html` - Replaced by `html/signin.html`

### JavaScript Files
- [ ] `js/ultra-secure-auth.js` - Replaced by `js/secure-auth.js`
- [ ] `js/enhanced-security.js` - Functionality moved to `js/secure-auth.js`
- [ ] `js/enhanced-auth.js` - Replaced by `js/secure-auth.js`

### CSS Files (Check if used elsewhere first)
- [ ] `css/otp-styles.css` - Only used by ultra-secure-signin.html
- [ ] `css/security-styles.css` - Only used by ultra-secure-signin.html

### Configuration Files (Backup before deleting)
- [ ] `js/setup.js` - Credentials removed, now uses config-loader.js
- [ ] `config/cpanel-config.js` - Check if still needed

### Documentation Files (Outdated)
- [ ] `ULTRA_SECURE_DEPLOYMENT.md` - References removed system
- [ ] `LOGIN_PAGES_UPDATE.md` - Outdated information
- [ ] `ADVANCED_SECURITY_IMPLEMENTATION_COMPLETE.md` - Superseded

## Files to Keep (Active/Required)

### Core HTML
- ✅ `index.html` - Main landing page
- ✅ `html/signin.html` - NEW secure signin
- ✅ `html/admin-login.html` - Admin authentication
- ✅ `html/admin.html` - Admin dashboard
- ✅ `html/inventory.html` - Vendor dashboard
- ✅ `html/supplier.html` - Supplier dashboard
- ✅ `html/supervisor.html` - Supervisor dashboard
- ✅ `html/agent.html` - Field agent dashboard
- ✅ `html/reset-password.html` - Password reset

### Core JavaScript
- ✅ `js/config-loader.js` - NEW secure config
- ✅ `js/secure-auth.js` - NEW authentication system
- ✅ `js/supabase-config.js` - Supabase integration
- ✅ `js/file-upload-handler.js` - NEW file uploads
- ✅ `js/auth-middleware.js` - Session management
- ✅ `js/dashboard-auth.js` - Dashboard protection
- ✅ `js/admin.js` - Admin functionality
- ✅ `js/admin-login.js` - Admin login
- ✅ All dashboard-specific JS files

### Core CSS
- ✅ `css/styles.css` - Main styles
- ✅ `css/signin.css` - Signin page styles
- ✅ `css/admin.css` - Admin dashboard styles
- ✅ All dashboard-specific CSS files

### Configuration
- ✅ `.env.example` - NEW environment template
- ✅ `.gitignore` - Git configuration
- ✅ `.htaccess` - Security headers
- ✅ `manifest.json` - PWA manifest
- ✅ All SQL schema files in `config/`

### Documentation
- ✅ `README.md` - Project overview
- ✅ `SECURITY.md` - Security documentation
- ✅ `DEPLOYMENT.md` - Deployment guide
- ✅ `SECURITY_FIXES_IMPLEMENTED.md` - NEW security fixes
- ✅ `BACKUP_DISASTER_RECOVERY.md` - NEW backup guide
- ✅ `CLEANUP_PLAN.md` - This file

## Cleanup Steps

### Step 1: Backup Everything
```bash
# Create backup before cleanup
mkdir backups
xcopy /E /I /Y . backups\pre-cleanup-backup
```

### Step 2: Verify No Dependencies
Before deleting each file, search for references:
```bash
# Search for file references
findstr /s /i "filename" *.html *.js *.css
```

### Step 3: Delete Obsolete Files
```bash
# Delete HTML files
del html\ultra-secure-signin.html

# Delete JS files
del js\ultra-secure-auth.js
del js\enhanced-security.js
del js\enhanced-auth.js

# Delete CSS files (if confirmed unused)
del css\otp-styles.css
del css\security-styles.css
```

### Step 4: Clean Documentation
```bash
# Move outdated docs to archive
mkdir docs\archive
move ULTRA_SECURE_DEPLOYMENT.md docs\archive\
move LOGIN_PAGES_UPDATE.md docs\archive\
move ADVANCED_SECURITY_IMPLEMENTATION_COMPLETE.md docs\archive\
```

### Step 5: Update References
- [x] Updated all references to use `signin.html`
- [x] Updated service-worker.js cache
- [x] Updated index.html links
- [x] Updated all JS redirects

## Redundant/Duplicate Files Analysis

### Potential Duplicates (Review Needed)

#### Authentication Files
- `js/auth-middleware.js` vs `js/dashboard-auth.js`
  - **Keep both**: Different purposes
  - auth-middleware: General auth utilities
  - dashboard-auth: Page-specific protection

#### Configuration Files
- `js/setup.js` vs `js/config-loader.js`
  - **Delete setup.js**: Replaced by config-loader.js
  - **Keep config-loader.js**: New secure system

#### Security Files
- `js/enhanced-security.js` vs `js/secure-auth.js`
  - **Delete enhanced-security.js**: Functionality in secure-auth.js
  - **Keep secure-auth.js**: New implementation

### Database Schema Files (config/)
Keep all SQL files for reference and migration:
- ✅ `unified-database-schema.sql` - Main schema
- ✅ `complete-database-schema.sql` - Complete version
- ✅ All migration files
- ✅ All policy files

## File Organization Improvements

### Suggested Structure
```
stokika/
├── html/              # All HTML files
├── css/               # All CSS files
├── js/                # All JavaScript files
│   ├── auth/         # Authentication related
│   ├── dashboard/    # Dashboard specific
│   └── utils/        # Utility functions
├── config/            # Configuration & SQL
├── docs/              # Documentation
│   └── archive/      # Outdated docs
├── assets/            # Images, logos
└── backups/           # Local backups
```

### Future Organization (Optional)
Consider organizing JS files into subdirectories:
- `js/auth/` - All authentication files
- `js/dashboard/` - Dashboard-specific files
- `js/utils/` - Utility functions
- `js/features/` - Feature-specific files

## Cleanup Checklist

### Pre-Cleanup
- [x] Create full backup
- [x] Document all files to delete
- [x] Search for dependencies
- [x] Update all references
- [x] Test application functionality

### Cleanup Execution
- [ ] Delete ultra-secure-signin.html
- [ ] Delete ultra-secure-auth.js
- [ ] Delete enhanced-security.js
- [ ] Delete enhanced-auth.js
- [ ] Delete otp-styles.css (if unused)
- [ ] Delete security-styles.css (if unused)
- [ ] Archive outdated documentation

### Post-Cleanup
- [ ] Test all authentication flows
- [ ] Test all dashboard access
- [ ] Verify no broken links
- [ ] Verify no console errors
- [ ] Update service worker cache
- [ ] Clear browser cache and test
- [ ] Document cleanup in changelog

## Testing After Cleanup

### Authentication Tests
- [ ] Login as vendor
- [ ] Login as supplier
- [ ] Login as supervisor
- [ ] Login as field agent
- [ ] Login as admin
- [ ] Password reset flow
- [ ] Logout from all dashboards

### Navigation Tests
- [ ] All links work
- [ ] No 404 errors
- [ ] Redirects work correctly
- [ ] Dashboard access control works

### Console Tests
- [ ] No JavaScript errors
- [ ] No missing file errors
- [ ] No console warnings
- [ ] All scripts load correctly

## Rollback Plan

If issues occur after cleanup:

### Quick Rollback
```bash
# Restore from backup
xcopy /E /I /Y backups\pre-cleanup-backup\* .
```

### Selective Restore
```bash
# Restore specific file
copy backups\pre-cleanup-backup\path\to\file .
```

## Maintenance Schedule

### Weekly
- Review new files added
- Check for duplicates
- Update documentation

### Monthly
- Full cleanup review
- Archive old backups
- Update file inventory

### Quarterly
- Major cleanup
- Reorganize if needed
- Update documentation

---

**Cleanup Status:** Ready to execute
**Backup Created:** [Date]
**Estimated Time:** 30 minutes
**Risk Level:** Low (backup created)
