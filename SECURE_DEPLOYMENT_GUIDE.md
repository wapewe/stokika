# Secure Deployment Guide

## 🚀 Production Deployment Checklist

This guide ensures all security measures are properly configured when deploying to production.

---

## Pre-Deployment Requirements

### 1. Environment Setup

**Set Environment Variables:**

Choose one of the methods below based on your hosting setup:

---

#### **Method 1: .env File (Quick Setup)**

1. Upload your `.env` file to the web root (or create it via cPanel File Manager)
2. Set file permissions to 600
3. Verify `.htaccess` blocks access to the file
4. Test: `curl https://stokika.com/.env` should return 403

**⚠️ Security Note:** This is acceptable for production if `.htaccess` protection is working, but the file exists on the server which is a risk.

---

#### **Method 2: Private Directory (Recommended)**

1. Create a `private` folder OUTSIDE `public_html`:
   ```
   /home/username/
   ├── public_html/     ← Your website files
   └── private/         ← Secure config here
       └── load-env.php
   ```

2. Create `/home/username/private/load-env.php` with your configuration

3. Create `.user.ini` in `public_html/`:
   ```ini
   auto_prepend_file = "/home/username/private/load-env.php"
   ```

4. PHP will automatically load your config before every request

**✅ Security Note:** Config file is outside web root, cannot be accessed via URL.

---

#### **Method 3: Via SSH (If Available)**

If you have SSH access:

```bash
# Add to ~/.bashrc or ~/.bash_profile
export NODE_ENV=production
export APP_ENV=production
export SUPABASE_URL=https://your-project.supabase.co
# ... etc
```

Then reload: `source ~/.bashrc`

**Note:** This only works for CLI scripts, not for web requests.

---

#### **Method 4: Contact Hosting Support**

If none of the above work, contact HostPinnacle and ask:
- "How can I set PHP environment variables?"
- "Do you support .user.ini files?"
- "Can I use auto_prepend_file directive?"

---

**Generate Secure Secrets:**
```bash
# Generate JWT_SECRET (64 characters)
openssl rand -base64 48

# Generate ENCRYPTION_KEY (32 characters)
openssl rand -base64 24

# Generate SESSION_SECRET (64 characters)
openssl rand -base64 48

# Generate REQUEST_SIGNING_KEY
openssl rand -base64 32
```

---

### 2. Required Environment Variables

**⚠️ IMPORTANT:** Since HostPinnacle cPanel doesn't have PHP environment variables in the UI, you have **two options**:

---

#### **Option A: Use .env File (Easier, Less Secure)**

1. Create a `.env` file in your web root (`public_html/`)
2. Copy from `.env.production.example` and set real values
3. **CRITICAL:** Ensure `.htaccess` blocks access to `.env`:

```apache
<Files ".env">
    Order allow,deny
    Deny from all
</Files>
```

4. Set proper file permissions:
```bash
chmod 600 .env  # Only owner can read/write
```

**Pros:** Easy to set up, works immediately  
**Cons:** File exists on server (security risk if .htaccess fails)

---

#### **Option B: Use php.ini or .user.ini (More Secure)**

1. Create a `.user.ini` file in your web root:

```ini
; PHP Configuration with Environment Variables
; This file is read by PHP on every request

; Supabase Configuration
auto_prepend_file = "/home/username/private/load-env.php"
```

2. Create `/home/username/private/load-env.php` (OUTSIDE web root):

```php
<?php
// Load environment variables - OUTSIDE public_html
$_ENV['NODE_ENV'] = 'production';
$_ENV['APP_ENV'] = 'production';
$_ENV['DOMAIN'] = 'https://stokika.com';

// Supabase
$_ENV['SUPABASE_URL'] = 'https://your-project.supabase.co';
$_ENV['SUPABASE_ANON_KEY'] = 'eyJ...';
$_ENV['SUPABASE_SERVICE_ROLE_KEY'] = 'eyJ...';

// Security Secrets
$_ENV['JWT_SECRET'] = '<generated-secret>';
$_ENV['ENCRYPTION_KEY'] = '<generated-key>';
$_ENV['SESSION_SECRET'] = '<generated-secret>';

// M-Pesa Production
$_ENV['MPESA_CONSUMER_KEY'] = '<production-key>';
$_ENV['MPESA_CONSUMER_SECRET'] = '<production-secret>';
$_ENV['MPESA_SHORTCODE'] = '<production-shortcode>';
$_ENV['MPESA_PASSKEY'] = '<production-passkey>';
$_ENV['MPESA_CALLBACK_URL'] = 'https://stokika.com/api/mpesa-callback';
$_ENV['MPESA_ENVIRONMENT'] = 'production';

// Email
$_ENV['SMTP_HOST'] = 'smtp.gmail.com';
$_ENV['SMTP_PORT'] = '465';
$_ENV['SMTP_USER'] = 'noreply@stokika.com';
$_ENV['SMTP_PASS'] = '<app-password>';
$_ENV['FROM_EMAIL'] = 'noreply@stokika.com';

// Security Settings
$_ENV['ADMIN_IP_WHITELIST'] = 'your.ip,another.ip';
$_ENV['PASSWORD_MIN_LENGTH'] = '12';
$_ENV['SESSION_TIMEOUT_MINUTES'] = '30';
$_ENV['MAX_LOGIN_ATTEMPTS'] = '5';
$_ENV['LOCKOUT_DURATION_MINUTES'] = '30';
$_ENV['RATE_LIMIT_WINDOW'] = '15';
$_ENV['RATE_LIMIT_MAX_REQUESTS'] = '100';

// Make available via getenv()
foreach ($_ENV as $key => $value) {
    putenv("$key=$value");
}
?>
```

3. Set file permissions:
```bash
chmod 600 /home/username/private/load-env.php
```

**Pros:** File is outside web root (more secure), not accessible via web  
**Cons:** Requires SSH or File Manager access to private directory

---

#### **Option C: Contact HostPinnacle Support**

Some cPanel versions hide environment variables under:
- **Advanced** → **Environment Variables**
- **Software** → **Application Environment Variables**
- **Terminal** → Set via shell

Contact HostPinnacle support and ask:
> "How do I set PHP environment variables for my application? I need to set variables like `NODE_ENV=production`."

---

#### **Recommended Configuration Values**

Regardless of which option you choose, here are the values you need:

**Core Configuration:**
```bash
NODE_ENV=production
APP_ENV=production
DOMAIN=https://stokika.com
```

**Supabase:**
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ... (from Supabase dashboard)
SUPABASE_SERVICE_ROLE_KEY=eyJ... (NEVER expose to client)
```

**Security Secrets (Generate these):**
```bash
# Generate with: openssl rand -base64 48
JWT_SECRET=<generated-64-char-secret>

# Generate with: openssl rand -base64 24
ENCRYPTION_KEY=<generated-32-char-key>

# Generate with: openssl rand -base64 48
SESSION_SECRET=<generated-64-char-secret>

# Generate with: openssl rand -base64 32
REQUEST_SIGNING_KEY=<generated-32-char-key>
```

**M-Pesa Production:**
```bash
MPESA_CONSUMER_KEY=<production-key-from-safaricom>
MPESA_CONSUMER_SECRET=<production-secret-from-safaricom>
MPESA_SHORTCODE=<production-shortcode>
MPESA_PASSKEY=<production-passkey>
MPESA_CALLBACK_URL=https://stokika.com/api/mpesa-callback
MPESA_ENVIRONMENT=production
```

**Email Configuration:**
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=noreply@stokika.com
SMTP_PASS=<gmail-app-specific-password>
FROM_EMAIL=noreply@stokika.com
```

**Security Settings:**
```bash
ADMIN_IP_WHITELIST=your.office.ip,another.trusted.ip
PASSWORD_MIN_LENGTH=12
SESSION_TIMEOUT_MINUTES=30
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=30
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
```

---

### 3. File Permissions

**Set proper permissions on sensitive files:**

```bash
# In cPanel File Manager or via SSH:

# Configuration files (read-only)
chmod 600 .env
chmod 600 api/config.php
chmod 600 api/session-manager.php

# Directories
chmod 755 api/
chmod 755 js/
chmod 755 css/

# Make sure .env is NOT web-accessible
# (Should be blocked by .htaccess)
```

**Verify .htaccess protection:**
```apache
<Files ".env">
    Order allow,deny
    Deny from all
</Files>
```

---

### 4. HTTPS Configuration

**Ensure SSL/TLS is enabled:**

1. **Install SSL Certificate** (cPanel: SSL/TLS)
2. **Force HTTPS in .htaccess:**

```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteCond %{HTTPS} !=on
    RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
</IfModule>
```

3. **Verify HSTS header:**
```apache
Header set Strict-Transport-Security "max-age=31536000; includeSubDomains"
```

4. **Test SSL:**
   - Visit: https://www.ssllabs.com/ssltest/
   - Should score A or higher

---

## Deployment Steps

### Step 1: Upload Files

**Via cPanel File Manager or FTP:**

1. Upload all files to `public_html/` or site root
2. **DO NOT upload:**
   - `.env` file (configure on server)
   - `node_modules/` (if present)
   - `.git/` directory
   - Any backup or temporary files

**Files to upload:**
```
✅ api/
✅ js/
✅ css/
✅ assets/
✅ *.html
✅ .htaccess
✅ .env.example (safe - has placeholders)
❌ .env (configure on server)
❌ .env.local
❌ config/*.sql (database migrations - run separately)
```

---

### Step 2: Configure Environment Variables

**In cPanel:**

1. **Select PHP Version** → **Options**
2. Click **Add new variable**
3. Add all variables from `.env.production.example`
4. Use real values (not placeholders)

**Verify configuration:**

**Option A - If using .env file:**
```bash
# Test that .env is blocked
curl https://stokika.com/.env
# Should return: 403 Forbidden

# Test that config endpoint works
curl https://stokika.com/api/config.php
# Should return: JSON with supabaseUrl
```

**Option B - If using load-env.php:**

Create a temporary test file `test-config.php` in `public_html`:
```php
<?php
// test-config.php - DELETE AFTER TESTING
echo "NODE_ENV: " . getenv('NODE_ENV') . "<br>";
echo "SUPABASE_URL: " . (getenv('SUPABASE_URL') ? 'Set ✓' : 'Not set ✗') . "<br>";
echo "JWT_SECRET: " . (getenv('JWT_SECRET') ? 'Set ✓' : 'Not set ✗') . "<br>";
// DO NOT echo actual secret values!
echo "<br>⚠️ DELETE THIS FILE IMMEDIATELY AFTER TESTING";
?>
```

Visit `https://stokika.com/test-config.php` and verify variables are set.

**⚠️ DELETE `test-config.php` IMMEDIATELY AFTER TESTING**

---

**Test the main config endpoint:**
```bash
curl https://stokika.com/api/config.php
# Should return JSON with supabaseUrl and supabaseAnonKey
# Should NOT return service role key or other secrets
```

---

### Step 3: Database Setup

**If using Supabase (recommended):**

1. Go to Supabase Dashboard
2. Run migration files from `config/*.sql`
3. Verify Row Level Security (RLS) is enabled
4. Test database connection

**If using MySQL:**

1. Create database in cPanel
2. Import schema files
3. Update database credentials in environment variables
4. Test connection

---

### Step 4: Security Verification

**Run these tests after deployment:**

#### Test 1: Environment Variables
```bash
# Should NOT be accessible
curl https://stokika.com/.env
# Should return: 403 Forbidden

# Config endpoint should work
curl https://stokika.com/api/config.php
# Should return: JSON with supabaseUrl and supabaseAnonKey
```

#### Test 2: HTTPS Enforcement
```bash
# HTTP should redirect to HTTPS
curl -I http://stokika.com
# Should return: 301 redirect to https://
```

#### Test 3: CORS Configuration
```bash
# Localhost should be blocked
curl -H "Origin: http://localhost:5500" https://stokika.com/api/session.php
# Should return: 403 Forbidden

# Production domain should work
curl -H "Origin: https://stokika.com" https://stokika.com/api/session.php
# Should return: 200 OK (or 401 if not authenticated)
```

#### Test 4: Session Security
- Open browser DevTools → Application → Cookies
- Login to the site
- Check cookie has:
  - ✅ `HttpOnly` flag
  - ✅ `Secure` flag
  - ✅ `SameSite=Strict`

#### Test 5: CSRF Protection
```bash
# Without CSRF token should fail
curl -X POST https://stokika.com/api/session.php?action=update \
     -H "Content-Type: application/json" \
     -d '{"key":"test","value":"data"}'
# Should return: 403 CSRF validation failed
```

#### Test 6: XSS Protection
- Try submitting this in a form: `<script>alert('XSS')</script>`
- Should be escaped and not execute
- Check for CSP headers:
```bash
curl -I https://stokika.com
# Should include: Content-Security-Policy
```

#### Test 7: Rate Limiting
```bash
# Make 101 requests rapidly
for i in {1..101}; do
  curl https://stokika.com/api/config.php
done
# Last request should return: 429 Too Many Requests
```

---

### Step 5: File Structure Verification

**Ensure proper structure:**

```
public_html/
├── api/
│   ├── config.php ✅
│   ├── config.dev.php ✅
│   ├── session.php ✅
│   ├── session-manager.php ✅
│   ├── csrf-validator.php ✅
│   └── cors-config.php ✅
├── js/
│   ├── config-loader.js ✅
│   ├── secure-session.js ✅
│   ├── csrf-protection.js ✅
│   ├── xss-protection.js ✅
│   └── auth-middleware.js ✅
├── .htaccess ✅
├── index.html ✅
└── .env ❌ (should not exist - use environment variables)
```

---

### Step 6: Update HTML Pages

**Add security scripts to ALL HTML pages:**

```html
<!-- Add before closing </body> tag, in this order: -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="js/config-loader.js"></script>
<script src="js/secure-session.js"></script>
<script src="js/csrf-protection.js"></script>
<script src="js/xss-protection.js"></script>
<script src="js/auth-middleware.js"></script>
<!-- Your application scripts here -->
```

**Remove old insecure scripts:**
```html
<!-- ❌ REMOVE THESE -->
<script src="js/load-env.js"></script> <!-- Deprecated -->
```

---

## Post-Deployment Testing

### Functional Testing

1. **User Registration**
   - [ ] New users can register
   - [ ] Email verification works
   - [ ] Passwords are encrypted

2. **User Login**
   - [ ] Login with correct credentials works
   - [ ] Login with wrong credentials fails
   - [ ] Session persists across page refreshes
   - [ ] Session expires after 30 minutes
   - [ ] Logout clears session

3. **CSRF Protection**
   - [ ] All forms have CSRF tokens
   - [ ] Form submissions work
   - [ ] Direct POST requests without token fail

4. **Role-Based Access**
   - [ ] Vendors access vendor dashboard
   - [ ] Agents access agent dashboard
   - [ ] Admins access admin panel
   - [ ] Unauthorized roles are blocked

5. **M-Pesa Integration**
   - [ ] STK Push works
   - [ ] Callbacks are received
   - [ ] Payments are recorded
   - [ ] Production credentials are used

6. **Data Security**
   - [ ] SQL injection attempts fail
   - [ ] XSS attempts are escaped
   - [ ] CSRF attempts are blocked
   - [ ] Sessions cannot be hijacked

---

## Monitoring Setup

### 1. Error Logging

**Enable PHP error logging in cPanel:**
```ini
; In php.ini or .htaccess
log_errors = On
error_log = /home/username/logs/php_error.log
display_errors = Off
```

**Monitor logs:**
```bash
# Via SSH or cPanel Terminal
tail -f ~/logs/php_error.log
```

### 2. Security Monitoring

**Monitor for:**
- Failed CSRF validations
- Blocked CORS requests
- Rate limit violations
- Failed login attempts
- SQL injection attempts (blocked by .htaccess)

**Set up alerts for:**
- 10+ failed logins from same IP
- 100+ CSRF validation failures per hour
- Unusual traffic patterns

### 3. Performance Monitoring

**Track:**
- API response times
- Database query performance
- Session storage size
- Rate limit hits

---

## Rollback Procedure

**If deployment fails:**

1. **Backup current state** (if not already done)
2. **Restore previous files** from backup
3. **Verify environment variables** haven't changed
4. **Test functionality**
5. **Review error logs** to identify issue
6. **Fix issues** in development
7. **Re-deploy** when ready

**Quick rollback:**
```bash
# Via cPanel File Manager:
# 1. Delete current files
# 2. Restore from backup (usually in /backups/)
# 3. Verify .htaccess is present
# 4. Test site
```

---

## Maintenance Schedule

### Daily
- [ ] Check error logs
- [ ] Monitor security alerts
- [ ] Verify backup completed

### Weekly
- [ ] Review failed login attempts
- [ ] Check CSRF validation failures
- [ ] Monitor rate limit violations
- [ ] Review security logs

### Monthly
- [ ] Update dependencies
- [ ] Run XSS vulnerability scanner
- [ ] Review and rotate API keys if needed
- [ ] Test backup restoration
- [ ] Security audit

### Quarterly
- [ ] Rotate JWT_SECRET and other secrets
- [ ] Full security penetration test
- [ ] Review user permissions
- [ ] Update SSL certificate if needed

---

## Troubleshooting

### Issue: "Configuration error" on load

**Cause:** Environment variables not set

**Fix:**
1. Verify environment variables in cPanel
2. Check spelling of variable names
3. Ensure values don't have quotes or extra spaces
4. Restart PHP (if option available)

---

### Issue: CORS errors in browser console

**Cause:** Origin not whitelisted or localhost in production

**Fix:**
1. Verify `APP_ENV=production` is set
2. Check `api/cors-config.php` configuration
3. Ensure origin matches exactly (with https://)
4. Clear browser cache

---

### Issue: CSRF validation fails

**Cause:** Token mismatch or session expired

**Fix:**
1. Check session cookie is being set (HttpOnly)
2. Verify CSRF protection scripts are loaded
3. Check session timeout (30 minutes)
4. Clear browser cookies and try again

---

### Issue: Session not persisting

**Cause:** Cookie configuration or HTTPS issue

**Fix:**
1. Verify HTTPS is enabled
2. Check `session.cookie_secure = 1` in php.ini
3. Verify `session.cookie_httponly = 1`
4. Clear browser cookies
5. Check server time is correct

---

### Issue: M-Pesa not working

**Cause:** Wrong environment or credentials

**Fix:**
1. Verify `MPESA_ENVIRONMENT=production`
2. Check production credentials from Safaricom
3. Verify callback URL is accessible
4. Check Safaricom API logs
5. Test in sandbox first

---

## Security Contacts

**For security incidents:**
1. Document the incident
2. Review security logs
3. Contact hosting support if needed
4. Patch vulnerability immediately
5. Notify affected users if data breach

**Security Resources:**
- Hosting support: [Your hosting support URL]
- Supabase support: https://supabase.com/support
- M-Pesa support: https://developer.safaricom.co.ke/support

---

## Compliance Checklist

- [ ] HTTPS enabled and enforced
- [ ] Data encrypted at rest
- [ ] Data encrypted in transit
- [ ] Sessions secured with httpOnly cookies
- [ ] CSRF protection enabled
- [ ] XSS protection implemented
- [ ] Rate limiting active
- [ ] Error logging enabled
- [ ] Backup system active
- [ ] Security headers configured
- [ ] GDPR compliance (if applicable)
- [ ] PCI DSS compliance (for payments)

---

**Last Updated:** 2026-08-28  
**Next Review:** 2026-09-28  
**Status:** ✅ READY FOR PRODUCTION DEPLOYMENT
