# Security Implementation Guide
**Stokika B2B Marketplace Platform**  
**Version:** 1.0  
**Last Updated:** August 29, 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Security Components](#security-components)
3. [Implementation Instructions](#implementation-instructions)
4. [API Security](#api-security)
5. [Frontend Security](#frontend-security)
6. [Deployment Security](#deployment-security)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Incident Response](#incident-response)

---

## Overview

This guide documents all security implementations in the Stokika platform. The application follows defense-in-depth principles with multiple layers of security controls.

### Security Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     User Request                         │
└──────────────────────┬──────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────┐
│  Layer 1: Apache (.htaccess)                            │
│  - Security Headers (CSP, HSTS, X-Frame-Options)        │
│  - File Access Control                                   │
│  - SQL Injection Pattern Blocking                        │
└──────────────────────┬──────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────┐
│  Layer 2: PHP Security                                   │
│  - Rate Limiting (rate-limiter.php)                     │
│  - CORS Validation (cors-config.php)                    │
│  - Input Validation (input-validator.php)               │
│  - CSRF Protection (csrf-validator.php)                 │
└──────────────────────┬──────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────┐
│  Layer 3: Session Security                               │
│  - httpOnly Cookies                                      │
│  - IP Validation                                         │
│  - Session Timeout                                       │
│  - CSRF Tokens                                           │
└──────────────────────┬──────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────┐
│  Layer 4: Application Logic                              │
│  - Authentication (Supabase Auth)                        │
│  - Authorization (RLS Policies)                          │
│  - Business Logic                                        │
└──────────────────────┬──────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────┐
│  Layer 5: Database (Supabase)                           │
│  - Row Level Security (RLS)                              │
│  - Parameterized Queries                                 │
│  - Encrypted at Rest                                     │
└─────────────────────────────────────────────────────────┘
```

---

## Security Components

### 1. Rate Limiter (`api/rate-limiter.php`)

**Purpose:** Prevent brute force attacks and API abuse

**Features:**
- IP-based request tracking
- Configurable limits per endpoint
- Automatic lockout mechanism
- Violation logging

**Usage:**
```php
require_once __DIR__ . '/rate-limiter.php';

// Check rate limit with preset
RateLimiter::checkPreset('login'); // 5 attempts per 15 min

// Custom rate limit
RateLimiter::blockRequest('custom-endpoint', 100, 60); // 100 req/min

// Check status
$status = RateLimiter::getStatus('api', 100, 60);
```

**Presets:**
- `login`: 5 attempts per 15 minutes
- `api`: 100 requests per minute
- `payment`: 3 payments per 5 minutes
- `mpesa_callback`: 10 callbacks per minute
- `signup`: 3 signups per hour
- `password_reset`: 3 resets per hour
- `strict`: 1 attempt per minute

**Cleanup:**
Run as cron job daily:
```bash
php -r "require 'api/rate-limiter.php'; RateLimiter::cleanup();"
```

---

### 2. Input Validator (`api/input-validator.php`)

**Purpose:** Sanitize and validate all user inputs

**Features:**
- Type-based sanitization
- Pattern validation
- SQL injection detection
- XSS pattern detection
- Path traversal detection

**Usage:**
```php
require_once __DIR__ . '/input-validator.php';

// Sanitize single input
$email = InputValidator::sanitize($_POST['email'], 'email');

// Validate with constraints
$result = InputValidator::validate($_POST['phone'], 'phone', [
    'required' => true,
    'pattern' => '/^254[17]\d{8}$/'
]);

if ($result['valid']) {
    $safePhone = $result['value'];
} else {
    echo $result['error'];
}

// Batch validation
$rules = [
    'email' => ['type' => 'email', 'constraints' => ['required' => true]],
    'phone' => ['type' => 'phone', 'constraints' => ['required' => true]],
    'amount' => ['type' => 'int', 'constraints' => ['min' => 100, 'max' => 100000]]
];

$validation = InputValidator::validateBatch($_POST, $rules);

if ($validation['valid']) {
    $safeData = $validation['data'];
} else {
    $errors = $validation['errors'];
}

// Security checks
if (!InputValidator::isSafe($userInput)) {
    die('Malicious input detected');
}
```

**Supported Types:**
- `email` - Email addresses
- `phone` - Kenyan phone numbers (254XXXXXXXXX)
- `int` / `integer` - Integers
- `float` / `decimal` - Decimal numbers
- `url` - URLs
- `string` - General text
- `html` - HTML content (sanitized)
- `filename` - File names
- `alphanumeric` - Letters and numbers only
- `slug` - URL-safe slugs

---

### 3. M-Pesa Callback Validator (`api/mpesa-callback-validator.php`)

**Purpose:** Secure M-Pesa payment callback processing

**Features:**
- IP whitelist validation (Safaricom IPs only)
- Idempotency enforcement (prevent duplicate processing)
- JSON validation
- Comprehensive logging

**Usage:**
```php
require_once __DIR__ . '/mpesa-callback-validator.php';

// Validate callback
$validation = MpesaCallbackValidator::validateCallback();

if ($validation['valid']) {
    $callbackData = $validation['data'];
    
    // Process payment
    // ...
    
    // Send response to M-Pesa
    MpesaCallbackValidator::sendResponse(true, 'Payment processed');
} else {
    // Log and reject
    error_log('Invalid M-Pesa callback: ' . $validation['error']);
    MpesaCallbackValidator::sendResponse(false, $validation['error']);
}
```

**Safaricom IP Ranges (Update if changed):**
```php
'196.201.214.0/24'
'196.201.213.0/24'
'196.201.212.0/24'
```

**Cleanup Idempotency Files:**
```bash
php -r "require 'api/mpesa-callback-validator.php'; MpesaCallbackValidator::cleanupIdempotency();"
```

---

### 4. Security Logger (`api/security-logger.php`)

**Purpose:** Centralized security event logging and monitoring

**Features:**
- Severity-based logging (INFO, WARNING, CRITICAL, EMERGENCY)
- Automatic suspicious activity detection
- Log rotation
- Search and analytics

**Usage:**
```php
require_once __DIR__ . '/security-logger.php';

// Log security event
SecurityLogger::logSecurityEvent('LOGIN_FAILED', [
    'email' => $email,
    'reason' => 'Invalid password'
]);

// Log with custom severity
SecurityLogger::logSecurityEvent('CUSTOM_EVENT', [
    'details' => 'Something happened'
], SecurityLogger::SEVERITY_WARNING);

// Get log summary
$summary = SecurityLogger::getLogSummary(7); // Last 7 days

// Search logs
$results = SecurityLogger::searchLogs([
    'ip' => '192.168.1.1',
    'event_type' => 'LOGIN_FAILED'
], 7);
```

**Event Types:**
- Authentication: `LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGOUT`, `SESSION_EXPIRED`, `SESSION_HIJACK_ATTEMPT`
- Authorization: `UNAUTHORIZED_ACCESS`, `PRIVILEGE_ESCALATION`
- Rate Limiting: `RATE_LIMIT_EXCEEDED`, `RATE_LIMIT_VIOLATION`
- Injection: `SQL_INJECTION_ATTEMPT`, `XSS_ATTEMPT`, `PATH_TRAVERSAL_ATTEMPT`, `COMMAND_INJECTION_ATTEMPT`
- CSRF: `CSRF_VALIDATION_FAILED`, `CSRF_TOKEN_MISSING`
- M-Pesa: `MPESA_CALLBACK_VALID`, `MPESA_INVALID_IP`, `MPESA_DUPLICATE_CALLBACK`
- General: `SUSPICIOUS_ACTIVITY`, `SECURITY_SCAN_DETECTED`

**Log Location:**
```
private/security-logs/
├── security-2026-08-29.log
├── critical-2026-08-29.log
└── violations.log
```

**Cleanup:**
```bash
php -r "require 'api/security-logger.php'; SecurityLogger::cleanupOldLogs();"
```

---

## Implementation Instructions

### Step 1: Integrate Rate Limiting

Add to all authentication endpoints:

```php
// login.php
require_once __DIR__ . '/api/rate-limiter.php';
require_once __DIR__ . '/api/security-logger.php';

// Check rate limit
RateLimiter::checkPreset('login');

// Process login
$result = authenticateUser($email, $password);

if ($result['success']) {
    SecurityLogger::logSecurityEvent('LOGIN_SUCCESS', ['email' => $email]);
} else {
    SecurityLogger::logSecurityEvent('LOGIN_FAILED', ['email' => $email]);
}
```

### Step 2: Add Input Validation

Validate all user inputs:

```php
// Example: User registration
require_once __DIR__ . '/api/input-validator.php';

$rules = [
    'email' => [
        'type' => 'email',
        'constraints' => ['required' => true, 'maxLength' => 255]
    ],
    'phone' => [
        'type' => 'phone',
        'constraints' => ['required' => true]
    ],
    'name' => [
        'type' => 'string',
        'constraints' => ['required' => true, 'minLength' => 2, 'maxLength' => 100]
    ]
];

$validation = InputValidator::validateBatch($_POST, $rules);

if (!$validation['valid']) {
    http_response_code(400);
    echo json_encode(['errors' => $validation['errors']]);
    exit();
}

$safeData = $validation['data'];
// Proceed with registration
```

### Step 3: Secure M-Pesa Callbacks

Update M-Pesa callback handler:

```php
// mpesa-callback.php
require_once __DIR__ . '/api/mpesa-callback-validator.php';
require_once __DIR__ . '/api/rate-limiter.php';
require_once __DIR__ . '/api/security-logger.php';

// Rate limit callbacks
RateLimiter::checkPreset('mpesa_callback');

// Validate callback
$validation = MpesaCallbackValidator::validateCallback();

if (!$validation['valid']) {
    SecurityLogger::logSecurityEvent('MPESA_INVALID_CALLBACK', [
        'error' => $validation['error'],
        'code' => $validation['code']
    ], SecurityLogger::SEVERITY_CRITICAL);
    
    MpesaCallbackValidator::sendResponse(false, 'Invalid callback');
}

// Process payment
$callbackData = $validation['data'];
$resultCode = $callbackData['ResultCode'];

if ($resultCode == 0) {
    // Success - update database
    SecurityLogger::logSecurityEvent('MPESA_PAYMENT_SUCCESS', [
        'checkout_request_id' => $callbackData['CheckoutRequestID'],
        'amount' => $callbackData['CallbackMetadata']['Item'][0]['Value'] ?? 0
    ]);
} else {
    // Failed payment
    SecurityLogger::logSecurityEvent('MPESA_PAYMENT_FAILED', [
        'checkout_request_id' => $callbackData['CheckoutRequestID'],
        'result_code' => $resultCode,
        'result_desc' => $callbackData['ResultDesc']
    ]);
}

MpesaCallbackValidator::sendResponse(true, 'Callback processed');
```

### Step 4: Monitor Security Logs

Create admin dashboard to view logs:

```php
// admin/security-dashboard.php
require_once __DIR__ . '/../api/security-logger.php';

// Get summary
$summary = SecurityLogger::getLogSummary(7);

echo "Total Events: " . $summary['total_events'] . "\n";
echo "By Severity:\n";
print_r($summary['by_severity']);
echo "Top IPs:\n";
print_r($summary['top_ips']);

// Search for specific events
$failedLogins = SecurityLogger::searchLogs([
    'event_type' => 'LOGIN_FAILED'
], 1);

echo "Failed Logins Today: " . count($failedLogins) . "\n";
```

---

## API Security

### Protected Endpoint Template

Use this template for all API endpoints:

```php
<?php
/**
 * Protected API Endpoint Template
 * Copy this pattern for all API files
 */

// 1. Load security components
require_once __DIR__ . '/rate-limiter.php';
require_once __DIR__ . '/input-validator.php';
require_once __DIR__ . '/csrf-validator.php';
require_once __DIR__ . '/session-manager.php';
require_once __DIR__ . '/security-logger.php';
require_once __DIR__ . '/cors-config.php';

// 2. Apply CORS
CORSConfig::apply();

// 3. Security headers
header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');

// 4. Rate limiting
RateLimiter::checkPreset('api');

// 5. CSRF protection (for non-GET requests)
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    CSRFValidator::protect();
}

// 6. Session validation
$session = SessionManager::validateSession();
if (!$session['valid']) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit();
}

// 7. Input validation
$input = json_decode(file_get_contents('php://input'), true);

if (!InputValidator::isSafe(json_encode($input))) {
    SecurityLogger::logSecurityEvent('INVALID_INPUT', [
        'endpoint' => $_SERVER['REQUEST_URI'],
        'user_id' => $session['userId']
    ], SecurityLogger::SEVERITY_WARNING);
    
    http_response_code(400);
    echo json_encode(['error' => 'Invalid input']);
    exit();
}

// 8. Your API logic here
try {
    // Process request
    $result = processRequest($input, $session);
    
    // Log success if needed
    SecurityLogger::logSecurityEvent('API_SUCCESS', [
        'endpoint' => $_SERVER['REQUEST_URI'],
        'user_id' => $session['userId']
    ]);
    
    echo json_encode($result);
    
} catch (Exception $e) {
    SecurityLogger::logSecurityEvent('API_ERROR', [
        'endpoint' => $_SERVER['REQUEST_URI'],
        'error' => $e->getMessage(),
        'user_id' => $session['userId']
    ], SecurityLogger::SEVERITY_CRITICAL);
    
    http_response_code(500);
    echo json_encode(['error' => 'Server error']);
}
?>
```

---

## Frontend Security

### XSS Protection

Always use XSSProtection utilities:

```javascript
// GOOD ✅
const name = XSSProtection.escapeHtml(userData.name);
element.textContent = name;

// GOOD ✅
element.innerHTML = XSSProtection.sanitize(`<div>${userData.name}</div>`);

// BAD ❌
element.innerHTML = `<div>${userData.name}</div>`; // Direct user data!

// BAD ❌
element.innerHTML = userData.html; // Unsafe!
```

### CSRF Protection

All forms and AJAX requests need CSRF tokens:

```javascript
// Initialize CSRF protection
await CSRFProtection.init();

// Form submission
const form = document.getElementById('myForm');
await CSRFProtection.protectForm(form);

// AJAX request
const response = await CSRFProtection.secureFetch('/api/endpoint', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
});
```

### Secure Session Management

Use SecureSession for authentication:

```javascript
// Initialize session
await SecureSession.init();

// Check if authenticated
if (!SecureSession.isAuthenticated()) {
    window.location.href = '/signin.html';
}

// Get user data
const userData = SecureSession.getUserData();

// Logout
await SecureSession.destroy();
```

---

## Deployment Security

### Pre-Deployment Checklist

- [ ] Update `.user.ini` with actual cPanel username
- [ ] Set all environment variables in cPanel
- [ ] Replace M-Pesa sandbox with production credentials
- [ ] Set SMTP password
- [ ] Add admin IP to whitelist
- [ ] Generate new SESSION_SECRET
- [ ] Verify HTTPS is enforced
- [ ] Test rate limiting
- [ ] Verify CORS configuration
- [ ] Check all security headers
- [ ] Test M-Pesa callback with small amount
- [ ] Backup database

### cPanel Configuration

1. **Environment Variables** (cPanel → Select PHP Version → Options):
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-encryption-key
SESSION_SECRET=your-session-secret
MPESA_CONSUMER_KEY=your-production-key
MPESA_CONSUMER_SECRET=your-production-secret
MPESA_SHORTCODE=your-shortcode
MPESA_PASSKEY=your-passkey
MPESA_ENVIRONMENT=production
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=noreply@stokika.com
SMTP_PASS=your-app-password
ADMIN_IP_WHITELIST=your-office-ip
```

2. **PHP Settings** (cPanel → Select PHP Version):
```
display_errors = Off
log_errors = On
expose_php = Off
session.cookie_httponly = On
session.cookie_secure = On
session.use_strict_mode = On
```

3. **Cron Jobs** (cPanel → Cron Jobs):

Daily cleanup (runs at 3 AM):
```bash
0 3 * * * cd /home/youruser/public_html && php -r "require 'api/rate-limiter.php'; RateLimiter::cleanup();"
```

Weekly log cleanup (runs Sunday at 4 AM):
```bash
0 4 * * 0 cd /home/youruser/public_html && php -r "require 'api/security-logger.php'; SecurityLogger::cleanupOldLogs();"
```

M-Pesa idempotency cleanup (runs daily at 2 AM):
```bash
0 2 * * * cd /home/youruser/public_html && php -r "require 'api/mpesa-callback-validator.php'; MpesaCallbackValidator::cleanupIdempotency();"
```

---

## Monitoring & Maintenance

### Daily Monitoring

1. **Check Security Logs:**
```bash
tail -n 100 private/security-logs/security-$(date +%Y-%m-%d).log
```

2. **Review Failed Logins:**
```bash
grep "LOGIN_FAILED" private/security-logs/security-$(date +%Y-%m-%d).log
```

3. **Check Rate Limit Violations:**
```bash
cat private/rate-limits/violations.log
```

4. **Monitor M-Pesa Callbacks:**
```bash
grep "MPESA" private/security-logs/security-$(date +%Y-%m-%d).log
```

### Weekly Security Tasks

- [ ] Review critical security logs
- [ ] Check for suspicious IP addresses
- [ ] Verify backup integrity
- [ ] Update dependencies (if any)
- [ ] Review rate limit thresholds
- [ ] Test disaster recovery procedure

### Monthly Security Tasks

- [ ] Security audit using OWASP ZAP
- [ ] Penetration testing
- [ ] Review access logs
- [ ] Update documentation
- [ ] Security training for team
- [ ] Test incident response plan

---

## Incident Response

### Security Incident Procedure

1. **Detection:**
   - Monitor security logs for CRITICAL/EMERGENCY events
   - Check for unusual patterns (multiple failed logins, etc.)
   - Review rate limit violations

2. **Assessment:**
   - Determine severity and scope
   - Identify affected systems/users
   - Collect evidence from logs

3. **Containment:**
   - Block malicious IPs (add to .htaccess)
   - Reset compromised credentials
   - Disable affected accounts
   - Take affected services offline if necessary

4. **Eradication:**
   - Remove malicious code/access
   - Patch vulnerabilities
   - Update security configurations

5. **Recovery:**
   - Restore from backup if needed
   - Verify system integrity
   - Re-enable services
   - Monitor closely

6. **Post-Incident:**
   - Document incident
   - Update procedures
   - Conduct lessons learned
   - Implement preventive measures

### Emergency Contacts

```
Security Lead: [Add contact]
System Admin: [Add contact]
Hosting Provider: HostPinnacle Support
Database: Supabase Support
Payment Gateway: Safaricom M-Pesa Support
```

### Quick Response Commands

Block an IP immediately:
```bash
# Add to .htaccess
echo "Deny from 123.123.123.123" >> .htaccess
```

Disable rate limiting temporarily (emergency only):
```bash
rm -rf private/rate-limits/*.json
```

View active sessions:
```bash
ls -la /tmp/sess_* | wc -l
```

---

## Security Testing

### Test Security Headers

```bash
curl -I https://stokika.com
```

Expected headers:
```
X-XSS-Protection: 1; mode=block
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Content-Security-Policy: ...
Permissions-Policy: ...
```

### Test Rate Limiting

```bash
# Should block after 5 attempts
for i in {1..10}; do
    curl -X POST https://stokika.com/api/login -d "email=test@test.com&password=wrong"
done
```

### Test CSRF Protection

```bash
# Should fail without CSRF token
curl -X POST https://stokika.com/api/protected-endpoint \
  -H "Content-Type: application/json" \
  -d '{"data":"test"}'
```

### Test Input Validation

```bash
# Should block SQL injection
curl -X POST https://stokika.com/api/endpoint \
  -d "input='; DROP TABLE users; --"
```

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)
- [Security Headers](https://securityheaders.com/)
- [SSL Labs](https://www.ssllabs.com/ssltest/)
- [Supabase Security](https://supabase.com/docs/guides/platform/security)

---

**Document Version:** 1.0  
**Last Updated:** August 29, 2026  
**Next Review:** November 29, 2026
