# HostPinnacle cPanel Setup Guide

Quick guide for deploying Stokika on HostPinnacle shared hosting.

---

## Method 1: Using .env File (Easiest)

### Step 1: Upload Files via File Manager

1. Login to cPanel
2. Go to **File Manager**
3. Navigate to `public_html/`
4. Upload all your project files EXCEPT `.env`
5. Ensure `.htaccess` is uploaded

### Step 2: Create .env File

1. In File Manager, click **+ File**
2. Name it `.env` (with the dot)
3. Click **Edit**
4. Copy contents from `.env.production.example`
5. Replace all placeholder values with real credentials:

```ini
# Production Environment
NODE_ENV=production
APP_ENV=production
DOMAIN=https://stokika.com

# Supabase (get from https://app.supabase.com)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Generate secrets with: openssl rand -base64 48
JWT_SECRET=YOUR_64_CHAR_SECRET_HERE
ENCRYPTION_KEY=YOUR_32_CHAR_KEY_HERE
SESSION_SECRET=YOUR_64_CHAR_SECRET_HERE
REQUEST_SIGNING_KEY=YOUR_32_CHAR_KEY_HERE

# M-Pesa Production (get from Safaricom)
MPESA_CONSUMER_KEY=YOUR_PRODUCTION_KEY
MPESA_CONSUMER_SECRET=YOUR_PRODUCTION_SECRET
MPESA_SHORTCODE=YOUR_SHORTCODE
MPESA_PASSKEY=YOUR_PRODUCTION_PASSKEY
MPESA_CALLBACK_URL=https://stokika.com/api/mpesa-callback
MPESA_ENVIRONMENT=production

# Email (Gmail App Password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=noreply@stokika.com
SMTP_PASS=your_gmail_app_password
FROM_EMAIL=noreply@stokika.com

# Security
ADMIN_IP_WHITELIST=your.office.ip.address
PASSWORD_MIN_LENGTH=12
SESSION_TIMEOUT_MINUTES=30
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=30
```

6. **Save** the file

### Step 3: Set File Permissions

1. Right-click `.env` file
2. Click **Change Permissions**
3. Set to `600` (Owner: Read/Write, Others: None)
4. Click **Change Permissions**

### Step 4: Verify .htaccess Protection

1. Edit `.htaccess` file
2. Verify this section exists:

```apache
<Files ".env">
    Order allow,deny
    Deny from all
</Files>
```

3. If not present, add it at the top

### Step 5: Test Configuration

1. Visit: `https://stokika.com/.env`
   - Should show: **403 Forbidden** ✓

2. Visit: `https://stokika.com/api/config.php`
   - Should return JSON with configuration ✓

3. Test your website - if you see errors, check error logs in cPanel

---

## Method 2: Using Private Directory (More Secure)

### Step 1: Create Private Directory

1. In File Manager, go UP one level from `public_html/`
2. You should see:
   ```
   /home/youruser/
   ├── public_html/
   ├── mail/
   ├── tmp/
   └── ...
   ```

3. Click **+ Folder**
4. Name it `private`
5. Create file `private/load-env.php`

### Step 2: Create load-env.php

Content for `private/load-env.php`:

```php
<?php
/**
 * Environment Configuration Loader
 * Location: /home/youruser/private/load-env.php
 * 
 * This file is OUTSIDE the web root for security
 */

// Set all environment variables
$_ENV['NODE_ENV'] = 'production';
$_ENV['APP_ENV'] = 'production';
$_ENV['DOMAIN'] = 'https://stokika.com';

// Supabase
$_ENV['SUPABASE_URL'] = 'https://your-project.supabase.co';
$_ENV['SUPABASE_ANON_KEY'] = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
$_ENV['SUPABASE_SERVICE_ROLE_KEY'] = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

// Security Secrets
$_ENV['JWT_SECRET'] = 'your-generated-64-char-secret';
$_ENV['ENCRYPTION_KEY'] = 'your-generated-32-char-key';
$_ENV['SESSION_SECRET'] = 'your-generated-64-char-secret';
$_ENV['REQUEST_SIGNING_KEY'] = 'your-generated-32-char-key';

// M-Pesa Production
$_ENV['MPESA_CONSUMER_KEY'] = 'your-production-consumer-key';
$_ENV['MPESA_CONSUMER_SECRET'] = 'your-production-consumer-secret';
$_ENV['MPESA_SHORTCODE'] = 'your-production-shortcode';
$_ENV['MPESA_PASSKEY'] = 'your-production-passkey';
$_ENV['MPESA_CALLBACK_URL'] = 'https://stokika.com/api/mpesa-callback';
$_ENV['MPESA_ENVIRONMENT'] = 'production';

// Email Configuration
$_ENV['SMTP_HOST'] = 'smtp.gmail.com';
$_ENV['SMTP_PORT'] = '465';
$_ENV['SMTP_USER'] = 'noreply@stokika.com';
$_ENV['SMTP_PASS'] = 'your-gmail-app-password';
$_ENV['FROM_EMAIL'] = 'noreply@stokika.com';

// Security Settings
$_ENV['ADMIN_IP_WHITELIST'] = 'your.office.ip';
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

### Step 3: Create .user.ini

1. Go back to `public_html/`
2. Create file `.user.ini`
3. Add this content (replace `youruser` with your actual username):

```ini
; Load environment configuration on every request
auto_prepend_file = "/home/youruser/private/load-env.php"
```

**To find your username:** Look at the current path in File Manager. It shows `/home/USERNAME/public_html`

### Step 4: Set Permissions

1. Set `private/load-env.php` to `600`
2. Set `.user.ini` to `644`

### Step 5: Wait for Changes to Take Effect

PHP configuration changes may take 5-10 minutes to apply.

### Step 6: Test

Create `public_html/test.php`:

```php
<?php
echo "NODE_ENV: " . getenv('NODE_ENV') . "<br>";
echo "SUPABASE_URL: " . (getenv('SUPABASE_URL') ? 'Set ✓' : 'Not set ✗') . "<br>";
echo "<br><strong>If variables show 'Set ✓', it's working!</strong>";
echo "<br><br>⚠️ DELETE THIS FILE";
?>
```

Visit `https://stokika.com/test.php`

**DELETE test.php after verifying!**

---

## Troubleshooting

### Problem: .env file returns 200 OK instead of 403

**Solution:**
1. Check `.htaccess` has the `<Files ".env">` block
2. Verify Apache `AllowOverride` is enabled (contact support if not)
3. Try renaming `.htaccess` to `htaccess.txt` and back to `.htaccess`

### Problem: .user.ini not working

**Solution:**
1. Verify the file is named `.user.ini` (with dot)
2. Check the path in `auto_prepend_file` is correct
3. Wait 5-10 minutes for PHP to reload configuration
4. Contact HostPinnacle support - some hosts disable `.user.ini`

### Problem: Variables not loading

**Solution:**
1. Check file permissions (600 for sensitive files)
2. Verify PHP version is 7.4 or higher
3. Check for syntax errors in your files
4. View error logs in cPanel → **Errors**

### Problem: Config endpoint returns error

**Solution:**
1. Check `api/config.php` exists and has correct permissions (644)
2. Verify environment variables are set
3. Check PHP error logs for details
4. Test with the `test.php` file above

---

## Quick Reference

### Generate Strong Secrets

Use online tools or run locally:

```bash
# On your computer (Mac/Linux)
openssl rand -base64 48

# Or use an online generator:
# https://www.random.org/strings/
# Generate 64 characters, alphanumeric
```

### File Permissions Quick Guide

```
.env                     → 600 (Owner only)
.htaccess                → 644 (Owner write, all read)
.user.ini                → 644 (Owner write, all read)
private/load-env.php     → 600 (Owner only)
api/*.php                → 644 (Owner write, all read)
js/*.js                  → 644 (Owner write, all read)
css/*.css                → 644 (Owner write, all read)
index.html               → 644 (Owner write, all read)
```

### Test Checklist

- [ ] `.env` blocked (returns 403)
- [ ] `api/config.php` returns JSON
- [ ] Website loads without errors
- [ ] Can login/logout
- [ ] Forms submit successfully
- [ ] Browser console shows no errors
- [ ] PHP error log is clean

---

## Next Steps

After configuration:

1. **Test thoroughly** - Visit all pages
2. **Check security** - Run tests from `SECURE_DEPLOYMENT_GUIDE.md`
3. **Monitor logs** - Check for errors daily for first week
4. **Enable HTTPS** - Force SSL in cPanel
5. **Set up backups** - Enable cPanel automatic backups

---

## Support

- **HostPinnacle Support:** support@hostpinnacle.com
- **Documentation:** See `SECURE_DEPLOYMENT_GUIDE.md`
- **Emergency:** Restore from backups in cPanel

---

**Last Updated:** August 28, 2026  
**Hosting:** HostPinnacle Shared Hosting  
**Control Panel:** cPanel
