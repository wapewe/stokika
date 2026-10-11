# Quick Start: Security Implementation
**Stokika - Get Secure in 30 Minutes**

---

## 🚀 Fast Track to Production Security

This guide gets you from audit to production-ready in minimal time.

---

## Step 1: Verify Files (2 minutes)

Check that these new files exist:

```
✅ api/rate-limiter.php
✅ api/input-validator.php
✅ api/mpesa-callback-validator.php
✅ api/security-logger.php
✅ .htaccess (updated)
✅ package.json (new)
✅ build.config.js (new)
```

---

## Step 2: Create Required Directories (1 minute)

Run these commands in your project root:

```bash
mkdir -p private/security-logs
mkdir -p private/rate-limits
mkdir -p private/mpesa-idempotency

chmod 0700 private/security-logs
chmod 0700 private/rate-limits
chmod 0700 private/mpesa-idempotency
```

Or create manually via cPanel File Manager and set permissions.

---

## Step 3: Add Rate Limiting to Login (5 minutes)

Edit your login endpoint:

```php
<?php
// At the top of your login file
require_once __DIR__ . '/api/rate-limiter.php';
require_once __DIR__ . '/api/security-logger.php';

// Before processing login
RateLimiter::checkPreset('login'); // Blocks after 5 failed attempts

// Your existing login code...
if ($loginSuccess) {
    SecurityLogger::logSecurityEvent('LOGIN_SUCCESS', ['email' => $email]);
} else {
    SecurityLogger::logSecurityEvent('LOGIN_FAILED', ['email' => $email]);
}
?>
```

---

## Step 4: Protect API Endpoints (10 minutes)

Add to EACH API file:

```php
<?php
// Top of every API file
require_once __DIR__ . '/rate-limiter.php';
require_once __DIR__ . '/input-validator.php';
require_once __DIR__ . '/csrf-validator.php';
require_once __DIR__ . '/cors-config.php';

// Apply security
CORSConfig::apply();
RateLimiter::checkPreset('api');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    CSRFValidator::protect();
}

// Validate input
$input = json_decode(file_get_contents('php://input'), true);
if (!InputValidator::isSafe(json_encode($input))) {
    http_response_code(400);
    die(json_encode(['error' => 'Invalid input']));
}

// Your existing API code...
?>
```

---

## Step 5: Secure M-Pesa Callback (5 minutes)

Update your M-Pesa callback handler:

```php
<?php
require_once __DIR__ . '/api/mpesa-callback-validator.php';
require_once __DIR__ . '/api/rate-limiter.php';

RateLimiter::checkPreset('mpesa_callback');

$validation = MpesaCallbackValidator::validateCallback();

if (!$validation['valid']) {
    MpesaCallbackValidator::sendResponse(false, 'Invalid callback');
}

$callbackData = $validation['data'];

// Your existing payment processing...

MpesaCallbackValidator::sendResponse(true, 'Success');
?>
```

---

## Step 6: Configure cPanel (5 minutes)

### Set Environment Variables

1. Go to: **cPanel → Select PHP Version → Options → Environment Variables**
2. Add these (replace placeholders):

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
MPESA_CONSUMER_KEY=your-production-key
MPESA_CONSUMER_SECRET=your-production-secret
MPESA_SHORTCODE=your-shortcode
MPESA_PASSKEY=your-passkey
MPESA_ENVIRONMENT=production
```

### Update .user.ini

Replace `youruser` with your actual cPanel username:

```ini
auto_prepend_file = "/home/YOUR_ACTUAL_USERNAME/private/load-env.php"
```

---

## Step 7: Setup Cron Jobs (2 minutes)

Go to: **cPanel → Cron Jobs**

Add these three jobs:

**Daily Cleanup (3 AM):**
```
0 3 * * * cd /home/youruser/public_html && php -r "require 'api/rate-limiter.php'; RateLimiter::cleanup();"
```

**Weekly Log Cleanup (Sunday 4 AM):**
```
0 4 * * 0 cd /home/youruser/public_html && php -r "require 'api/security-logger.php'; SecurityLogger::cleanupOldLogs();"
```

**Daily Idempotency Cleanup (2 AM):**
```
0 2 * * * cd /home/youruser/public_html && php -r "require 'api/mpesa-callback-validator.php'; MpesaCallbackValidator::cleanupIdempotency();"
```

---

## Step 8: Test Everything (5 minutes)

### Test Rate Limiting

Try logging in with wrong password 6 times - should block after 5:

```bash
# Should work 5 times, then block
curl -X POST https://stokika.com/api/login -d "email=test@test.com&password=wrong"
```

### Test Security Headers

```bash
curl -I https://stokika.com
```

Look for:
```
X-Frame-Options: DENY
Content-Security-Policy: ...
Strict-Transport-Security: ...
```

### Test M-Pesa Callback (Staging)

Send test callback to verify IP validation and idempotency work.

### Check Logs

```bash
# Via cPanel File Manager
private/security-logs/security-2026-08-29.log
```

Should see LOGIN_FAILED events.

---

## ✅ You're Done!

Your application now has:

- ✅ Rate limiting on all endpoints
- ✅ Input validation and sanitization
- ✅ M-Pesa callback security
- ✅ Security event logging
- ✅ Enhanced security headers
- ✅ Production-ready configuration

---

## Optional: Build Optimization (15 minutes)

If you want to optimize JavaScript for production:

```bash
# Install Node.js if you haven't
# Then:
npm install
npm run build

# Upload dist/ folder to cPanel
# Update HTML to use dist/js/* instead of js/*
```

**Skip this if you're in a hurry - raw files work great!**

---

## Quick Reference

### View Security Logs

```php
<?php
require_once 'api/security-logger.php';
$summary = SecurityLogger::getLogSummary(7);
print_r($summary);
?>
```

### Reset Rate Limit for User

```php
<?php
require_once 'api/rate-limiter.php';
RateLimiter::reset('login');
?>
```

### Validate Input

```php
<?php
require_once 'api/input-validator.php';
$result = InputValidator::validate($_POST['email'], 'email', ['required' => true]);
if ($result['valid']) {
    $safeEmail = $result['value'];
}
?>
```

---

## Troubleshooting

### Rate limiting not working

- Check `private/rate-limits/` directory exists
- Check permissions (0700)
- Check file is being included

### Logs not appearing

- Check `private/security-logs/` directory exists
- Check write permissions
- Check `log_errors = On` in PHP config

### M-Pesa callbacks failing

- Check IP whitelist in `mpesa-callback-validator.php`
- Check Supabase function URL
- Check logs for error details

---

## Next Steps

1. ✅ Complete steps above
2. 📖 Read full guides when you have time:
   - `SECURITY_IMPLEMENTATION_GUIDE.md`
   - `PRODUCTION_DEPLOYMENT_SECURITY_CHECKLIST.md`
3. 🚀 Deploy to production
4. 📊 Monitor security logs daily for first week

---

## Need Help?

**Full Documentation:**
- `COMPREHENSIVE_SECURITY_AUDIT_REPORT.md` - Audit findings
- `SECURITY_IMPLEMENTATION_GUIDE.md` - Detailed implementation
- `PRODUCTION_DEPLOYMENT_SECURITY_CHECKLIST.md` - Complete checklist
- `PROJECT_REVIEW_AND_IMPROVEMENTS_SUMMARY.md` - Overview

**Quick Questions:**
- Check the FAQ in each guide
- Review code comments in security files

---

**⏱️ Total Time: ~30 minutes**

**🎉 You're now production-ready with enterprise-grade security!**
