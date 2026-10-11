# Setup Checklist for .user.ini Method

Follow these steps to deploy your configuration securely.

---

## Step 1: Find Your cPanel Username

1. Login to cPanel
2. Open **File Manager**
3. Look at the path at the top - it will show: `/home/USERNAME/public_html`
4. Note down your USERNAME (e.g., `stokika123`)

---

## Step 2: Edit .user.ini File

1. Open `.user.ini` file in your local editor
2. Replace `youruser` with your actual username:

**Before:**
```ini
auto_prepend_file = "/home/youruser/private/load-env.php"
```

**After (example if username is stokika123):**
```ini
auto_prepend_file = "/home/stokika123/private/load-env.php"
```

3. Save the file

---

## Step 3: Generate Strong Secrets

You need to generate strong random secrets. Use one of these methods:

### Option A: On Your Computer (Mac/Linux/Git Bash)

```bash
# Generate JWT_SECRET (64 characters)
openssl rand -base64 48

# Generate ENCRYPTION_KEY (32 characters)  
openssl rand -base64 24

# Generate SESSION_SECRET (64 characters)
openssl rand -base64 48

# Generate REQUEST_SIGNING_KEY (32 characters)
openssl rand -base64 32
```

### Option B: Online Generator

Visit: https://www.random.org/strings/
- Set length to 64
- Choose alphanumeric
- Generate 4 different strings for each secret

### Option C: Password Generator

Use: https://passwordsgenerator.net/
- Set length to 64
- Include all character types
- Generate 4 different passwords

---

## Step 4: Edit private/load-env.php

1. Open `private/load-env.php` file
2. Replace ALL placeholder values:

### Required Changes:

**Supabase Service Role Key:**
```php
// Get from: https://app.supabase.com/project/_/settings/api
$_ENV['SUPABASE_SERVICE_ROLE_KEY'] = 'eyJhbGci...'; // Your actual key
```

**Security Secrets (use generated values from Step 3):**
```php
$_ENV['JWT_SECRET'] = 'your-generated-64-char-secret';
$_ENV['ENCRYPTION_KEY'] = 'your-generated-32-char-key';
$_ENV['SESSION_SECRET'] = 'your-generated-64-char-secret';
$_ENV['REQUEST_SIGNING_KEY'] = 'your-generated-32-char-key';
```

**M-Pesa Production Credentials:**
```php
// Get from: https://developer.safaricom.co.ke after Go-Live approval
$_ENV['MPESA_CONSUMER_KEY'] = 'your-production-consumer-key';
$_ENV['MPESA_CONSUMER_SECRET'] = 'your-production-consumer-secret';
$_ENV['MPESA_SHORTCODE'] = 'your-production-shortcode';
$_ENV['MPESA_PASSKEY'] = 'your-production-passkey';
```

**Gmail App Password:**
```php
// Generate at: https://myaccount.google.com/apppasswords
$_ENV['SMTP_PASS'] = 'your-16-char-app-password';
```

**Admin IP Whitelist:**
```php
// Add your office/home IP address
// Find your IP: https://whatismyipaddress.com/
$_ENV['ADMIN_IP_WHITELIST'] = '127.0.0.1,::1,YOUR.IP.ADDRESS.HERE';
```

3. Save the file

---

## Step 5: Upload Files to cPanel

### Upload to public_html:

1. Go to **File Manager** → `public_html/`
2. Upload `.user.ini` file
3. Upload all your project files (HTML, JS, CSS, API, etc.)
4. **DO NOT upload** the `private/` folder here!

### Create Private Directory:

1. In File Manager, click the **Up One Level** button (or click on home icon)
2. You should see: `/home/youruser/`
3. Click **+ Folder**
4. Name it: `private`
5. Click **Create New Folder**

### Upload to private folder:

1. Open the `private/` folder you just created
2. Upload `load-env.php` from your local `private/` folder
3. This file is now OUTSIDE the web root

---

## Step 6: Set File Permissions

### For .user.ini:
1. Right-click `.user.ini` in `public_html/`
2. Click **Change Permissions**
3. Set to `644`
4. Click **Change Permissions**

### For load-env.php:
1. Navigate to `/home/youruser/private/`
2. Right-click `load-env.php`
3. Click **Change Permissions**
4. Set to `600` (Owner: Read/Write only)
5. Click **Change Permissions**

---

## Step 7: Wait for PHP to Reload

PHP configuration changes take **5-10 minutes** to apply.

- Get a coffee ☕
- Review the security documentation
- Come back in 10 minutes

---

## Step 8: Test Configuration

### Create Test File:

1. In `public_html/`, create file: `test-config.php`
2. Add this content:

```php
<?php
echo "<h2>Environment Configuration Test</h2>";
echo "<p>NODE_ENV: " . getenv('NODE_ENV') . "</p>";
echo "<p>APP_ENV: " . getenv('APP_ENV') . "</p>";
echo "<p>SUPABASE_URL: " . (getenv('SUPABASE_URL') ? '✓ Set' : '✗ Not set') . "</p>";
echo "<p>JWT_SECRET: " . (getenv('JWT_SECRET') ? '✓ Set' : '✗ Not set') . "</p>";
echo "<p>MPESA_ENVIRONMENT: " . getenv('MPESA_ENVIRONMENT') . "</p>";
echo "<hr>";
echo "<strong style='color: red;'>⚠️ DELETE THIS FILE IMMEDIATELY AFTER TESTING</strong>";
?>
```

### Run Test:

1. Visit: `https://stokika.com/test-config.php`
2. You should see all values showing "✓ Set"
3. **IMMEDIATELY DELETE** `test-config.php` file

### If Variables Don't Show:

- Wait another 5 minutes (PHP may not have reloaded yet)
- Check the path in `.user.ini` matches your actual username
- Verify `load-env.php` is in the correct location
- Check file permissions are correct
- Look at PHP error logs in cPanel

---

## Step 9: Test Main Application

### Test API Config Endpoint:

```bash
curl https://stokika.com/api/config.php
```

Should return JSON with `supabaseUrl` and `supabaseAnonKey`.

### Test Website:

1. Visit: `https://stokika.com`
2. Check browser console (F12) for errors
3. Try to login/register
4. Test a form submission
5. Verify no JavaScript errors

---

## Step 10: Security Verification

### Test File Access:

```bash
# Should return 403 or 404 (not found outside web root)
curl https://stokika.com/../private/load-env.php

# Should return 403 (if .env exists)
curl https://stokika.com/.env
```

### Check HTTPS:

```bash
# HTTP should redirect to HTTPS
curl -I http://stokika.com
# Should return: 301 redirect to https://
```

### Verify Security Headers:

```bash
curl -I https://stokika.com | grep -E "Strict-Transport|Content-Security|X-Frame"
```

Should show security headers.

---

## Step 11: Monitor Logs

### In cPanel:

1. Go to **Errors** section
2. Check for any PHP errors
3. Look for environment variable loading errors

### First Day Checks:

- [ ] No PHP errors
- [ ] Website loads correctly
- [ ] Users can register/login
- [ ] Forms submit successfully
- [ ] M-Pesa payments work (test with small amount)
- [ ] Email notifications send

---

## Troubleshooting

### Problem: Variables not loading

**Check:**
1. Path in `.user.ini` is correct (with YOUR username)
2. `load-env.php` is in `/home/youruser/private/` (not in public_html)
3. File permissions: `.user.ini` = 644, `load-env.php` = 600
4. Waited 10+ minutes for PHP to reload
5. No PHP syntax errors in `load-env.php`

**Fix:**
- Re-check file path in `.user.ini`
- Verify file exists: `/home/youruser/private/load-env.php`
- Check PHP error log in cPanel

### Problem: 500 Internal Server Error

**Causes:**
- PHP syntax error in `load-env.php`
- Incorrect path in `.user.ini`
- File permissions too restrictive

**Fix:**
- Check PHP error log
- Verify PHP syntax with: `php -l load-env.php`
- Temporarily comment out the `auto_prepend_file` line to isolate issue

### Problem: M-Pesa not working

**Check:**
- Using PRODUCTION credentials (not sandbox)
- `MPESA_ENVIRONMENT` is set to `production`
- Callback URL is accessible from internet
- Safaricom has approved your Go-Live request

---

## Success Checklist

- [x] `.user.ini` uploaded to public_html
- [x] `load-env.php` uploaded to private folder
- [x] File permissions set correctly
- [x] All placeholder values replaced
- [x] Test file confirms variables load
- [x] Main website works
- [x] No PHP errors in logs
- [x] Security headers present
- [x] HTTPS enforced

---

## Next Steps

Once everything works:

1. **Backup Configuration**
   - Download `load-env.php` and store securely
   - Enable cPanel automatic backups

2. **Monitor for 1 Week**
   - Check error logs daily
   - Monitor user feedback
   - Test all features

3. **Security Audit**
   - Run tests from `SECURITY_CHECKLIST.md`
   - Verify all security measures active
   - Test with XSS payloads

4. **Go Live**
   - Announce to users
   - Monitor traffic and errors
   - Be ready to rollback if issues

---

## Emergency Rollback

If something goes wrong:

1. Delete or rename `.user.ini` file
2. Application will stop loading environment variables
3. You can then troubleshoot without affecting live site
4. Restore `.user.ini` when fixed

---

**Setup Date:** _________________  
**Tested By:** _________________  
**Status:** ⬜ Ready for Production

---

For more information, see:
- `HOSTPINNACLE_SETUP_GUIDE.md` - Detailed setup instructions
- `SECURE_DEPLOYMENT_GUIDE.md` - Complete deployment guide
- `SECURITY_CHECKLIST.md` - Ongoing security tasks
