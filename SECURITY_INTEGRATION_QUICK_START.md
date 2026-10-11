# Security Integration Quick Start Guide

**Quick reference for integrating security fixes into existing HTML pages**

---

## 1. Add CSP Headers to All PHP/HTML Pages

### Step 1: Convert `.html` to `.php` (if needed)
Most pages already are PHP. For pure HTML pages:
```bash
mv page.html page.php
```

### Step 2: Add CSP Header at Top of Page
```php
<?php
// Add this at the VERY TOP of every page (before <!DOCTYPE>)
require_once __DIR__ . '/api/csp-manager.php';
$csp = new CSPManager();
$csp->sendHeaders();
?>
<!DOCTYPE html>
<html>
```

### Step 3: Add Nonces to Inline Scripts
**Find all `<script>` tags WITHOUT `src` attribute and add nonce:**

❌ **Before:**
```html
<script>
    console.log('Hello');
</script>
```

✅ **After:**
```html
<script <?php echo $csp->nonceAttr(); ?>>
    console.log('Hello');
</script>
```

### Step 4: Add Nonces to Inline Styles
**Same for `<style>` tags:**

❌ **Before:**
```html
<style>
    body { margin: 0; }
</style>
```

✅ **After:**
```html
<style <?php echo $csp->nonceAttr(); ?>>
    body { margin: 0; }
</style>
```

---

## 2. Add SRI to All CDN Scripts/Styles

### For External Scripts:

❌ **Before:**
```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js"></script>
```

✅ **After:**
```php
<?php
require_once __DIR__ . '/api/sri-generator.php';
echo SRIGenerator::scriptTag('https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js');
?>
```

### For External Stylesheets:

❌ **Before:**
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
```

✅ **After:**
```php
<?php
echo SRIGenerator::linkTag('https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css');
?>
```

### One-Time Hash Generation:
```bash
# Generate hashes for all your CDN resources
php api/sri-generator.php https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js
```

---

## 3. Add Input Sanitization to All Forms

### Step 1: Add Data Attributes
```html
<form data-sanitize="true" id="myForm">
    <input type="email" 
           name="email" 
           data-sanitize-type="email" 
           required>
    
    <input type="tel" 
           name="phone" 
           data-sanitize-type="phone" 
           pattern="^254[17]\d{8}$"
           required>
    
    <input type="number" 
           name="amount" 
           data-sanitize-type="int" 
           min="100" 
           max="100000"
           required>
    
    <button type="submit">Submit</button>
</form>
```

### Step 2: Add Module Script
```html
<script type="module">
    import { InputSanitizer } from './js/input-sanitizer.js';
    InputSanitizer.initForm('#myForm');
</script>
```

### Available Sanitize Types:
- `email` - Email validation
- `phone` - Kenyan phone (254...)
- `int` / `integer` - Numbers only
- `float` / `decimal` - Decimal numbers
- `string` - Safe text (default)
- `alphanumeric` - Letters and numbers
- `filename` - Safe filenames

---

## 4. Add Rate Limiting to API Endpoints

### For Login/Auth Endpoints:
```php
<?php
require_once __DIR__ . '/api/rate-limiter.php';
require_once __DIR__ . '/api/cors-config.php';

// Apply security
CORSConfig::apply();
RateLimiter::blockRequest('login', 5, 900); // 5 attempts per 15 min

// Your login logic here
?>
```

### For General API Endpoints:
```php
<?php
require_once __DIR__ . '/api/rate-limiter.php';
require_once __DIR__ . '/api/cors-config.php';

CORSConfig::apply();
RateLimiter::blockRequest('api', 100, 60); // 100 requests per minute

// Your API logic
?>
```

### For Payment Endpoints:
```php
<?php
require_once __DIR__ . '/api/rate-limiter.php';

RateLimiter::blockRequest('payment', 3, 300); // 3 payments per 5 min

// Payment processing
?>
```

---

## 5. Complete Page Template

Here's a complete example combining all security features:

```php
<?php
/**
 * Secure Page Template
 * Includes: CSP, Rate Limiting, CORS, Input Sanitization
 */

// 1. CSP Headers
require_once __DIR__ . '/api/csp-manager.php';
$csp = new CSPManager();
$csp->sendHeaders();

// 2. Rate Limiting (optional, for form submission pages)
require_once __DIR__ . '/api/rate-limiter.php';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    RateLimiter::checkPreset('api');
}

// 3. Load SRI Generator
require_once __DIR__ . '/api/sri-generator.php';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Secure Page</title>
    
    <!-- External CSS with SRI -->
    <?php echo SRIGenerator::linkTag('https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css'); ?>
    
    <!-- Inline CSS with CSP Nonce -->
    <style <?php echo $csp->nonceAttr(); ?>>
        body {
            font-family: Arial, sans-serif;
        }
    </style>
</head>
<body>
    <h1>Secure Form Example</h1>
    
    <!-- Form with Input Sanitization -->
    <form data-sanitize="true" id="contactForm" method="post">
        <div>
            <label>Email:</label>
            <input type="email" 
                   name="email" 
                   data-sanitize-type="email" 
                   required 
                   maxlength="100">
        </div>
        
        <div>
            <label>Phone:</label>
            <input type="tel" 
                   name="phone" 
                   data-sanitize-type="phone" 
                   placeholder="0712345678"
                   required>
        </div>
        
        <div>
            <label>Message:</label>
            <textarea name="message" 
                      data-sanitize-type="string" 
                      required 
                      maxlength="500"></textarea>
        </div>
        
        <button type="submit">Send</button>
    </form>
    
    <!-- External JS with SRI -->
    <?php echo SRIGenerator::scriptTag('https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js'); ?>
    
    <!-- Inline JS with CSP Nonce -->
    <script <?php echo $csp->nonceAttr(); ?>>
        console.log('Page loaded securely');
    </script>
    
    <!-- Input Sanitizer Module -->
    <script type="module">
        import { InputSanitizer } from './js/input-sanitizer.js';
        InputSanitizer.initForm('#contactForm');
    </script>
</body>
</html>
```

---

## 6. Server-Side Input Validation (PHP)

**Always validate on server-side too!**

```php
<?php
require_once __DIR__ . '/api/input-validator.php';
require_once __DIR__ . '/api/security-logger.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Validate batch
    $rules = [
        'email' => [
            'type' => 'email',
            'constraints' => ['required' => true, 'maxLength' => 100]
        ],
        'phone' => [
            'type' => 'phone',
            'constraints' => ['required' => true]
        ],
        'message' => [
            'type' => 'string',
            'constraints' => ['required' => true, 'maxLength' => 500]
        ]
    ];
    
    $result = InputValidator::validateBatch($_POST, $rules);
    
    if ($result['valid']) {
        $safeData = $result['data'];
        
        // Process data safely
        // ...
        
        // Log success
        SecurityLogger::logSecurityEvent('FORM_SUBMITTED', [
            'form' => 'contact',
            'email' => $safeData['email']
        ]);
        
    } else {
        // Log validation failure
        SecurityLogger::logSecurityEvent('INVALID_INPUT', [
            'form' => 'contact',
            'errors' => $result['errors']
        ]);
        
        // Return errors
        echo json_encode([
            'success' => false,
            'errors' => $result['errors']
        ]);
    }
}
?>
```

---

## 7. Priority Pages to Update

Update these pages FIRST (highest security risk):

### Authentication Pages:
- ✅ `signin.html` → Add rate limiting + input sanitization
- ✅ `reset-password.html` → Add rate limiting
- ✅ `setup-admin.html` → Add rate limiting
- ✅ `check-admin-status.html` → Add rate limiting

### Payment Pages:
- ✅ `kit-payment.html` → Add rate limiting + input sanitization
- ✅ `payments.html` → Add rate limiting

### Forms:
- ✅ `onboarding.html` → Add input sanitization
- ✅ `supervisor-onboarding.html` → Add input sanitization

### All Other Pages:
- ✅ Add CSP headers
- ✅ Add SRI to CDN resources
- ✅ Add nonces to inline scripts

---

## 8. Testing Each Page

After updating each page:

### ✅ CSP Test:
1. Open browser console (F12)
2. Look for CSP violation errors
3. Fix any blocked resources

### ✅ SRI Test:
1. Open Network tab (F12)
2. Check CDN resources have `integrity` attribute
3. Verify resources load successfully

### ✅ Input Sanitization Test:
1. Try entering `<script>alert('XSS')</script>` in form
2. Should be escaped/blocked
3. Check validation messages appear

### ✅ Rate Limiting Test:
1. Submit form multiple times quickly
2. Should get HTTP 429 after limit
3. Check error message displayed

---

## 9. Common Issues & Solutions

### Issue: "Refused to execute inline script"
**Solution:** Add nonce to the script tag:
```html
<script <?php echo $csp->nonceAttr(); ?>>
```

### Issue: "Refused to load script from CDN"
**Solution:** The CDN is not in whitelist. Either:
1. Add to CSP whitelist in `api/csp-manager.php`
2. Download and host locally

### Issue: Form not submitting
**Solution:** Check if data-sanitize is causing issues:
```javascript
// Debug in console
InputSanitizer.sanitizeForm(document.querySelector('#myForm'));
```

### Issue: Rate limit blocks legitimate users
**Solution:** Adjust limits in `api/rate-limiter.php`:
```php
'login' => ['max' => 10, 'window' => 900], // Increase from 5 to 10
```

---

## 10. Automated Testing Script

Create `test-security.php`:

```php
<?php
/**
 * Security Feature Test Script
 */

echo "Security Feature Tests\n";
echo "=====================\n\n";

// Test 1: Rate Limiter
require_once __DIR__ . '/api/rate-limiter.php';
echo "✓ Rate Limiter loaded\n";

// Test 2: CSP Manager
require_once __DIR__ . '/api/csp-manager.php';
$csp = new CSPManager();
$nonce = $csp->getNonce();
echo "✓ CSP Manager loaded (nonce: " . substr($nonce, 0, 8) . "...)\n";

// Test 3: Input Validator
require_once __DIR__ . '/api/input-validator.php';
$result = InputValidator::validate('test@example.com', 'email');
echo "✓ Input Validator working: " . ($result['valid'] ? 'PASS' : 'FAIL') . "\n";

// Test 4: Security Logger
require_once __DIR__ . '/api/security-logger.php';
echo "✓ Security Logger loaded\n";

// Test 5: CORS Config
require_once __DIR__ . '/api/cors-config.php';
echo "✓ CORS Config loaded\n";

echo "\nAll security modules loaded successfully! ✅\n";
?>
```

Run with:
```bash
php test-security.php
```

---

## Summary Checklist

For each page, ensure:

- [ ] CSP headers added at top
- [ ] All inline `<script>` tags have nonces
- [ ] All inline `<style>` tags have nonces
- [ ] All CDN resources have SRI
- [ ] Forms have `data-sanitize="true"`
- [ ] Form inputs have `data-sanitize-type`
- [ ] InputSanitizer initialized
- [ ] Rate limiting on POST endpoints
- [ ] Server-side validation on forms
- [ ] Security logging for important actions
- [ ] Tested in browser (no console errors)

---

**Quick Start Complete!** 🎉

For detailed documentation, see `SECURITY_IMPLEMENTATION_COMPLETE.md`
