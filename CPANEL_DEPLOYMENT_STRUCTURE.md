# cPanel Deployment Structure Guide
**Exact folder placement for security and functionality**

---

## 📁 cPanel Directory Structure

### Your cPanel home directory structure:

```
/home/youruser/                    ← Your cPanel home (NOT web accessible)
├── public_html/                   ← Web root (www.stokika.com points here)
│   ├── index.html
│   ├── signin.html
│   ├── agent.html
│   ├── vendor.html
│   ├── supplier.html
│   ├── rembrandts.html
│   ├── analytics.html
│   ├── ... (all other .html files)
│   │
│   ├── .htaccess                  ← Security headers and rules
│   ├── .user.ini                  ← PHP configuration
│   │
│   ├── api/                       ← API endpoints (web accessible)
│   │   ├── config.php
│   │   ├── session.php
│   │   ├── cors-config.php
│   │   ├── csrf-validator.php
│   │   ├── session-manager.php
│   │   ├── rate-limiter.php       ⭐ NEW
│   │   ├── input-validator.php    ⭐ NEW
│   │   ├── mpesa-callback-validator.php  ⭐ NEW
│   │   └── security-logger.php    ⭐ NEW
│   │
│   ├── js/                        ← JavaScript files (web accessible)
│   │   ├── config-loader.js
│   │   ├── xss-protection.js
│   │   ├── csrf-protection.js
│   │   ├── secure-session.js
│   │   └── ... (all other JS files)
│   │
│   ├── dist/                      ← Minified JS (optional, production)
│   │   └── js/
│   │       ├── config-loader.js   (minified)
│   │       └── ... (all minified files)
│   │
│   ├── css/                       ← Stylesheets
│   ├── assets/                    ← Images, logos
│   ├── .well-known/               ← Security.txt, SSL verification
│   └── service-worker.js
│
└── private/                       ⭐ CRITICAL - Outside web root
    ├── load-env.php               ← Environment loader
    ├── security-logs/             ← Security event logs
    │   ├── .htaccess              (deny web access)
    │   └── security-YYYY-MM-DD.log
    ├── rate-limits/               ← Rate limit tracking
    │   ├── .htaccess              (deny web access)
    │   └── *.json
    └── mpesa-idempotency/         ← Payment tracking
        ├── .htaccess              (deny web access)
        └── *.lock
```

---

## 🎯 Where to Place Each Security File

### ✅ API Security Files (All go in `public_html/api/`)

```bash
public_html/api/rate-limiter.php
public_html/api/input-validator.php
public_html/api/mpesa-callback-validator.php
public_html/api/security-logger.php
```

**Why in `api/`?**
- They're PHP libraries used by your API endpoints
- Need to be included via `require_once`
- Follow your existing pattern (cors-config.php, csrf-validator.php are also here)
- Protected by PHP - users can't download .php files

### ✅ Private Directory (Outside web root)

```bash
/home/youruser/private/
```

**How to create (via cPanel File Manager):**

1. Go to File Manager
2. Navigate to `/home/youruser/` (NOT public_html)
3. Click "New Folder" → Name it `private`
4. Inside `private/`, create:
   - `security-logs/` folder
   - `rate-limits/` folder
   - `mpesa-idempotency/` folder
5. Upload `load-env.php` to `/home/youruser/private/`

**Directory Permissions:**
```
private/               → 0700 (drwx------)
private/load-env.php   → 0600 (-rw-------)
security-logs/         → 0700 (drwx------)
rate-limits/          → 0700 (drwx------)
mpesa-idempotency/    → 0700 (drwx------)
```

**Why outside web root?**
- 🔒 SECURITY: Cannot be accessed via web browser
- 🔒 Environment variables stay secret
- 🔒 Logs cannot be downloaded by hackers
- 🔒 Rate limit data cannot be manipulated

---

## 📤 Upload Structure for cPanel

### Method 1: Using cPanel File Manager (Recommended)

#### Step 1: Upload to public_html

Upload these to `public_html/`:
```
✅ All .html files (index.html, signin.html, etc.)
✅ .htaccess (updated version)
✅ .user.ini (with your username)
✅ api/ folder (with all 8 PHP files)
✅ js/ folder (all JavaScript files)
✅ dist/ folder (optional - minified JS)
✅ css/ folder
✅ assets/ folder
✅ .well-known/ folder
✅ service-worker.js
✅ manifest.json
```

#### Step 2: Create private directory

1. Navigate to `/home/youruser/` (use "Up One Level" from public_html)
2. Create `private/` folder
3. Create subfolders:
   - `security-logs/`
   - `rate-limits/`
   - `mpesa-idempotency/`
4. Upload `load-env.php` to `private/`
5. Set permissions (see below)

#### Step 3: Set Permissions

In File Manager:
1. Right-click folder → "Change Permissions"
2. Set:
   - `private/`: 700
   - `private/load-env.php`: 600
   - `security-logs/`: 700
   - `rate-limits/`: 700
   - `mpesa-idempotency/`: 700

---

### Method 2: Using FTP (FileZilla)

```
Connect to: ftp.stokika.com
Username: your_cpanel_username
Password: your_cpanel_password

Upload structure:
/public_html/
    ├── (all web files here)
    └── api/ (all 8 PHP files)

/private/
    ├── load-env.php
    ├── security-logs/
    ├── rate-limits/
    └── mpesa-idempotency/
```

---

## 🔐 Security Verification

### After Upload, Test Security:

**1. Test that private files are NOT accessible:**

Try accessing these URLs - should all return 403 or 404:
```
https://stokika.com/private/load-env.php       ← Should FAIL
https://stokika.com/security-logs/             ← Should FAIL
https://stokika.com/rate-limits/               ← Should FAIL
https://stokika.com/.env                       ← Should FAIL
```

**2. Test that API files ARE accessible (but execute, don't download):**
```
https://stokika.com/api/config.php             ← Should execute (return JSON)
https://stokika.com/api/rate-limiter.php       ← Should execute (not download)
```

**3. Test that .htaccess is working:**
```bash
curl -I https://stokika.com
```
Should see security headers:
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=63072000
```

---

## 📂 What NOT to Upload to cPanel

### ❌ Don't Upload These:

```
❌ .git/ folder           (version control - unnecessary)
❌ .kiro/ folder          (IDE config - unnecessary)
❌ node_modules/ folder   (dev dependencies - huge!)
❌ tests/ folder          (optional - for development)
❌ backups/ folder        (optional - keep locally)
❌ scripts/ folder        (optional - dev tools)
❌ docs/ folder           (optional - documentation)
❌ *.md files             (optional - documentation)
❌ package.json           (optional - only if you need npm on server)
❌ package-lock.json      (optional)
❌ build.config.js        (optional - building happens locally)
❌ .env file              (NEVER! Use cPanel env vars instead)
```

### ✅ Only Upload Production Files:

```
✅ HTML files
✅ PHP files (api/)
✅ JavaScript files (js/ or dist/)
✅ CSS files
✅ Images/assets
✅ .htaccess
✅ .user.ini (updated)
✅ private/load-env.php
```

---

## 🚀 Step-by-Step Upload Checklist

### Pre-Upload (Local Machine)

- [ ] Build production JavaScript (optional):
  ```bash
  npm install
  npm run build
  ```
- [ ] Update `.user.ini` with your cPanel username
- [ ] Verify `.htaccess` has all security headers
- [ ] Remove any `.env` files (use cPanel env vars instead)
- [ ] Test locally one more time

### Upload to cPanel

- [ ] **Step 1:** Upload all files to `public_html/`
- [ ] **Step 2:** Create `/home/youruser/private/` folder
- [ ] **Step 3:** Create subdirectories in `private/`:
  - `security-logs/`
  - `rate-limits/`
  - `mpesa-idempotency/`
- [ ] **Step 4:** Upload `load-env.php` to `private/`
- [ ] **Step 5:** Set folder permissions (700)
- [ ] **Step 6:** Set load-env.php permission (600)
- [ ] **Step 7:** Add .htaccess to each private subfolder:
  ```apache
  Order deny,allow
  Deny from all
  ```

### Post-Upload Configuration

- [ ] **Step 8:** Set environment variables (cPanel → PHP → Options)
- [ ] **Step 9:** Verify `.user.ini` points to correct path
- [ ] **Step 10:** Test website loads
- [ ] **Step 11:** Test API endpoints work
- [ ] **Step 12:** Test security headers
- [ ] **Step 13:** Setup cron jobs for cleanup
- [ ] **Step 14:** Monitor logs for first 24 hours

---

## 🔍 Troubleshooting Upload Issues

### Issue: "private/load-env.php not found"

**Solution:**
```ini
# In .user.ini, update path:
auto_prepend_file = "/home/ACTUAL_USERNAME/private/load-env.php"

# Find your username:
# cPanel → File Manager → look at path
# Example: /home/stokika123/public_html
# Then use: /home/stokika123/private/load-env.php
```

### Issue: "Permission denied" errors

**Solution:**
```bash
# Set correct permissions via cPanel File Manager:
private/                 → 700
private/load-env.php     → 600
security-logs/           → 700
rate-limits/             → 700
mpesa-idempotency/       → 700
```

### Issue: Security logs not writing

**Solution:**
1. Check folder permissions (700)
2. Check PHP error log: `public_html/error_log`
3. Verify path in security-logger.php matches your structure
4. Test write permissions:
   ```php
   <?php
   file_put_contents('/home/youruser/private/security-logs/test.log', 'test');
   ?>
   ```

### Issue: Rate limiting not working

**Solution:**
1. Check `private/rate-limits/` folder exists
2. Check folder is writable (700)
3. Check path in rate-limiter.php
4. Clear cache: delete all .json files in rate-limits/

---

## 📋 Final Directory Structure Verification

After upload, your cPanel should look like this:

```
/home/youruser/
├── public_html/              ← Website root
│   ├── index.html            ✅
│   ├── signin.html           ✅
│   ├── .htaccess             ✅ (updated)
│   ├── .user.ini             ✅ (with your username)
│   ├── api/
│   │   ├── config.php        ✅
│   │   ├── rate-limiter.php  ✅ NEW
│   │   ├── input-validator.php ✅ NEW
│   │   ├── mpesa-callback-validator.php ✅ NEW
│   │   └── security-logger.php ✅ NEW
│   ├── js/                   ✅ (all JavaScript)
│   ├── dist/ (optional)      ✅ (minified JavaScript)
│   └── css/                  ✅
│
└── private/                  ✅ (outside web root!)
    ├── load-env.php          ✅
    ├── security-logs/        ✅
    ├── rate-limits/          ✅
    └── mpesa-idempotency/    ✅
```

**Test command:**
```bash
# SSH into your cPanel (if available) and run:
ls -la /home/youruser/private/
# Should show: load-env.php and 3 subdirectories
```

---

## ✅ Quick Verification Checklist

After deployment, verify:

- [ ] Website loads: https://stokika.com
- [ ] SSL is active (green padlock)
- [ ] Security headers present (use securityheaders.com)
- [ ] Private files not accessible (test URLs above)
- [ ] API endpoints work
- [ ] Login works
- [ ] Rate limiting works (try 6 failed logins)
- [ ] Logs are being written (check File Manager)
- [ ] No PHP errors (check error_log)

---

**Ready to upload? Follow this guide exactly and you'll have a secure, production-ready deployment!** 🚀
