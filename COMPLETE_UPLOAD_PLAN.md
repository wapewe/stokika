# 🚀 Complete Upload Plan - Ready to Deploy

**Status:** ✅ All files verified and ready  
**Date:** August 28, 2026

---

## ⚠️ ACTION REQUIRED BEFORE UPLOAD

### Step 1: Update `.user.ini` (1 minute)

1. Open `.user.ini` in your text editor
2. Find line 10: `auto_prepend_file = "/home/youruser/private/load-env.php"`
3. Replace `youruser` with YOUR actual cPanel username
4. Save the file

**Example:**
```ini
# If your username is "stokika123"
auto_prepend_file = "/home/stokika123/private/load-env.php"
```

### Step 2: Complete `private/load-env.php` (5 minutes)

✅ **Already populated** from your .env file!

**Still need to add manually:**

1. **Line 34:** Supabase Service Role Key
   - Get from: https://app.supabase.com/project/_/settings/api
   - Look for `service_role` key (NOT anon key)

2. **Line 48:** REQUEST_SIGNING_KEY
   - Run: `openssl rand -base64 32`
   - Or generate at: https://www.random.org/strings/

3. **Lines 57-60:** M-Pesa Production Credentials
   - Get from Safaricom after Go-Live approval
   - Use PRODUCTION credentials (not sandbox)

4. **Line 72:** Gmail App Password
   - Generate at: https://myaccount.google.com/apppasswords
   - 16-character code

5. **Line 80:** Add your IP address
   - Find at: https://whatismyipaddress.com/
   - Add after `::1,` like: `127.0.0.1,::1,YOUR.IP.HERE`

---

## 📁 CPANEL UPLOAD PLAN

### PHASE 1: Upload to public_html/

**Location:** `/home/youruser/public_html/`

#### Configuration Files
- ✅ `.htaccess` → Permissions: 644
- ✅ `.user.ini` → Permissions: 644

#### HTML Files (31 files)
- ✅ `*.html` (all HTML files) → Permissions: 644

#### API Folder
- ✅ `api/config.php` → Permissions: 644
- ✅ `api/session.php` → Permissions: 644
- ✅ `api/session-manager.php` → Permissions: 644
- ✅ `api/csrf-validator.php` → Permissions: 644
- ✅ `api/cors-config.php` → Permissions: 644
- ❌ `api/config.dev.php` → **DO NOT UPLOAD** (dev only)
- ❌ `api/example-protected-endpoint.php` → **DO NOT UPLOAD** (example only)

#### JavaScript Folder
- ✅ `js/` (entire folder) → Permissions: 644 for all .js files

#### CSS Folder
- ✅ `css/` (entire folder) → Permissions: 644 for all .css files

#### Assets Folder
- ✅ `assets/` (entire folder with all subfolders)

---

### PHASE 2: Create Private Folder

**Location:** `/home/youruser/private/`

1. In cPanel File Manager, go UP one level from `public_html/`
2. You'll see: `/home/youruser/`
3. Click **+ Folder**
4. Name: `private`
5. Upload to this folder:
   - ✅ `load-env.php` → **Permissions: 600** (important!)

---

### PHASE 3: DO NOT UPLOAD (Keep Local Only)

#### Files to EXCLUDE from cPanel:
```
❌ .env (use load-env.php instead)
❌ .env.example
❌ .env.development.example
❌ .env.production.example
❌ .env.mpesa.example
❌ .git/ (if exists)
❌ .gitignore
❌ .kiro/ (development only)
❌ node_modules/ (if exists)
❌ backups/ (your local backups)
❌ config/ (SQL migration files - see Supabase section)
❌ supabase/ (migration files - see Supabase section)
❌ scripts/ (Node.js scripts for development)
❌ *.md files (documentation - keep locally)
❌ api/config.dev.php
❌ api/example-protected-endpoint.php
```

---

## 📊 SUPABASE DEPLOYMENT

### Files to Upload to Supabase

**Location:** Supabase Dashboard → SQL Editor

#### Required Database Migrations:

Navigate to `config/` folder and run these SQL files IN ORDER:

1. **`complete-database-schema.sql`** (if starting fresh)
   - OR run individual schema files if already have tables

2. **Session & Security Tables:**
   - `admin-rls-final.sql` - Row Level Security
   - `admin-user-policies.sql` - User policies

3. **M-Pesa Integration:**
   - Any M-Pesa related schema files

**How to upload:**
1. Login to Supabase Dashboard
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy and paste SQL file content
5. Click **Run**
6. Verify no errors

#### Supabase Functions (if needed):

If you have Edge Functions in `supabase/functions/`:
1. Use Supabase CLI to deploy
2. Or manually create in Supabase Dashboard → Edge Functions

---

## 📋 DETAILED FOLDER STRUCTURE

### What Goes Where:

```
cPanel Structure:
/home/youruser/
├── private/
│   └── load-env.php          ← Upload here (600)
│
└── public_html/
    ├── .htaccess             ← Upload here (644)
    ├── .user.ini             ← Upload here (644)
    │
    ├── index.html            ← All HTML files (644)
    ├── agent.html
    ├── analytics.html
    ├── [... all other .html files]
    │
    ├── api/
    │   ├── config.php         ← Upload (644)
    │   ├── session.php        ← Upload (644)
    │   ├── session-manager.php ← Upload (644)
    │   ├── csrf-validator.php  ← Upload (644)
    │   └── cors-config.php     ← Upload (644)
    │
    ├── js/
    │   ├── xss-protection.js   ← Upload all (644)
    │   ├── secure-session.js
    │   ├── csrf-protection.js
    │   ├── config-loader.js
    │   ├── auth-middleware.js
    │   └── [all other .js files]
    │
    ├── css/
    │   └── [all .css files]    ← Upload all (644)
    │
    └── assets/
        ├── images/             ← Upload all
        ├── logos/
        └── icons/
```

---

## ✅ PRE-UPLOAD CHECKLIST

Before uploading, verify:

### Configuration Files:
- [ ] `.user.ini` - Username updated (not 'youruser')
- [ ] `private/load-env.php` - Supabase Service Role Key added
- [ ] `private/load-env.php` - M-Pesa credentials added (or marked as TODO)
- [ ] `private/load-env.php` - Gmail App Password added
- [ ] `private/load-env.php` - Your IP added to whitelist

### Files Ready:
- [ ] All critical APIs exist (verified ✓ above)
- [ ] Security JavaScript files exist (verified ✓ above)
- [ ] .htaccess exists
- [ ] No .env file in upload folder

### Credentials Verified:
- [ ] Supabase URL correct
- [ ] Supabase Anon Key correct
- [ ] Security secrets look random (not placeholders)
- [ ] Domain is https://stokika.com

---

## 🎯 UPLOAD PROCEDURE

### Method 1: cPanel File Manager (Recommended)

**Step 1: Prepare Upload**
1. Create a ZIP file of these folders locally:
   - `api/` (exclude config.dev.php and example-protected-endpoint.php)
   - `js/`
   - `css/`
   - `assets/`
2. Keep these separate: `.htaccess`, `.user.ini`, HTML files

**Step 2: Create Private Folder**
1. Login to cPanel → File Manager
2. Navigate to `/home/youruser/` (click up arrow or home icon)
3. Click **+ Folder**, name it `private`
4. Open `private/` folder
5. Click **Upload**
6. Upload `load-env.php`
7. Right-click → **Change Permissions** → Set to `600`

**Step 3: Upload to public_html**
1. Navigate to `public_html/`
2. Upload and extract ZIP file
3. Upload `.htaccess` and `.user.ini`
4. Upload all HTML files
5. Verify folder structure matches plan above

**Step 4: Set Permissions**
1. Select all files in `public_html/` and subfolders
2. Right-click → **Change Permissions** → Set to `644`
3. Verify `.user.ini` is `644`
4. Verify `private/load-env.php` is `600`

---

### Method 2: FTP (Alternative)

If using FTP client (FileZilla, etc.):

1. Connect to your hosting
2. Navigate to `/home/youruser/`
3. Create `private/` folder
4. Upload `load-env.php` to `private/`
5. Navigate to `public_html/`
6. Upload all folders and files
7. Set permissions via FTP client

---

## ⏱️ POST-UPLOAD (Wait 10 Minutes)

PHP needs time to reload configuration after `.user.ini` changes.

**While waiting:**
- Review Supabase SQL migrations
- Check this document for anything missed
- Prepare test procedures

---

## 🧪 TESTING PROCEDURE

### Test 1: Create test-config.php

In `public_html/`, create `test-config.php`:

```php
<?php
echo "<h2>Stokika Configuration Test</h2>";
echo "<p>NODE_ENV: <strong>" . getenv('NODE_ENV') . "</strong></p>";
echo "<p>APP_ENV: <strong>" . getenv('APP_ENV') . "</strong></p>";
echo "<p>SUPABASE_URL: <strong>" . (getenv('SUPABASE_URL') ? '✓ Set' : '✗ Not Set') . "</strong></p>";
echo "<p>JWT_SECRET: <strong>" . (getenv('JWT_SECRET') && strlen(getenv('JWT_SECRET')) > 50 ? '✓ Set' : '✗ Not Set') . "</strong></p>";
echo "<p>MPESA_ENVIRONMENT: <strong>" . getenv('MPESA_ENVIRONMENT') . "</strong></p>";
echo "<hr>";
echo "<h3 style='color: red;'>⚠️ DELETE THIS FILE IMMEDIATELY</h3>";
?>
```

**Visit:** `https://stokika.com/test-config.php`

**Expected Results:**
- NODE_ENV: production
- APP_ENV: production
- SUPABASE_URL: ✓ Set
- JWT_SECRET: ✓ Set
- MPESA_ENVIRONMENT: production

**⚠️ DELETE test-config.php IMMEDIATELY after verification!**

---

### Test 2: Config API Endpoint

```bash
curl https://stokika.com/api/config.php
```

**Expected:** JSON with supabaseUrl and supabaseAnonKey

---

### Test 3: Website Loading

1. Visit `https://stokika.com`
2. Open browser console (F12)
3. Check for JavaScript errors
4. Verify page loads correctly

---

### Test 4: Security Tests

```bash
# .env should be blocked (if it exists)
curl https://stokika.com/.env
# Expected: 403 Forbidden

# Private folder not accessible
curl https://stokika.com/../private/load-env.php
# Expected: 404 or 403

# HTTPS redirect working
curl -I http://stokika.com
# Expected: 301 redirect to https://
```

---

## 🚨 TROUBLESHOOTING

### Variables Not Loading

**Check:**
1. `.user.ini` path uses YOUR username (not 'youruser')
2. `load-env.php` is in `/home/youruser/private/` (not public_html)
3. Waited 10+ minutes for PHP reload
4. File permissions: `.user.ini` = 644, `load-env.php` = 600

**Fix:**
- Verify path in File Manager
- Re-check `.user.ini` content
- Check PHP error log in cPanel → Errors

---

### 500 Internal Server Error

**Causes:**
- PHP syntax error in `load-env.php`
- Wrong path in `.user.ini`
- File permissions wrong

**Fix:**
- Check PHP error log
- Temporarily rename `.user.ini` to disable it
- Fix the issue, then rename back

---

### Website Loads But Errors

**Check:**
- Browser console for JavaScript errors
- Missing security scripts
- API endpoints returning errors

**Fix:**
- Verify all security .js files uploaded
- Test API endpoints individually
- Check PHP error log

---

## 📊 UPLOAD SUMMARY

### ✅ Upload to cPanel public_html/:
- Configuration: `.htaccess`, `.user.ini`
- HTML: All 31 .html files
- Folders: `api/` (5 files), `js/` (all), `css/` (all), `assets/` (all)
- Total: ~100-150 files

### ✅ Upload to cPanel private/:
- `load-env.php` (permissions: 600)

### ✅ Upload to Supabase:
- SQL migrations from `config/` folder
- Run in SQL Editor

### ❌ DO NOT Upload:
- .env files
- .git folder
- Documentation (.md files)
- Node scripts
- Development files
- Backup folders

---

## ✅ READY TO DEPLOY

**All systems verified:**
- ✅ All critical API files exist
- ✅ All security JavaScript files exist
- ✅ Configuration files prepared
- ✅ load-env.php populated from .env
- ✅ Upload plan documented
- ✅ Testing procedure ready
- ✅ Troubleshooting guide included

**Next Steps:**
1. Complete ACTION REQUIRED items above
2. Follow upload procedure
3. Wait 10 minutes
4. Run tests
5. Go live!

---

**Deployment Checklist:**
- [ ] `.user.ini` username updated
- [ ] `load-env.php` credentials completed
- [ ] Files uploaded to cPanel
- [ ] Permissions set correctly
- [ ] Waited 10 minutes
- [ ] Tests passed
- [ ] test-config.php deleted
- [ ] Website working
- [ ] No errors in logs

**Status:** 🟢 READY FOR PRODUCTION  
**Estimated Time:** 30 minutes (including wait time)

---

For detailed steps, see:
- `SETUP_CHECKLIST.md` - Step-by-step guide
- `HOSTPINNACLE_SETUP_GUIDE.md` - HostPinnacle specific  
- `QUICK_START.md` - Fast deployment

**Good luck with your deployment! 🚀**
