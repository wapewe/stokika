# CSRF Protection Implementation Guide

## Overview

Cross-Site Request Forgery (CSRF) protection has been implemented using server-side validation with httpOnly cookies and token rotation.

## Architecture

### Client-Side (`js/csrf-protection.js`)
- Fetches CSRF tokens from server (not generated client-side)
- Automatically adds tokens to all forms
- Provides `secureFetch()` wrapper for API calls
- Integrates with `SecureSession` for authenticated requests

### Server-Side (`api/csrf-validator.php`)
- Validates CSRF tokens against server session
- Protects all POST/PUT/DELETE endpoints
- Supports token rotation after sensitive operations
- Returns 403 if validation fails

## Implementation

### 1. Include Required Scripts in HTML

```html
<!-- Load in this order -->
<script src="js/secure-session.js"></script>
<script src="js/csrf-protection.js"></script>
```

### 2. Protect API Endpoints (Server-Side)

**Method 1: Manual Protection**
```php
<?php
require_once __DIR__ . '/csrf-validator.php';
require_once __DIR__ . '/session-manager.php';

// Protect the endpoint
CSRFValidator::protect();

// Or just use this shorthand
requireCSRF();

// Your endpoint logic...
?>
```

**Method 2: Wrapper Function**
```php
<?php
require_once __DIR__ . '/csrf-validator.php';

protectedEndpoint(function() {
    // Your protected code here
    $sessionData = SessionManager::getSessionData();
    
    // Process request...
    echo json_encode(['success' => true]);
});
?>
```

**Method 3: Validate and Rotate (Sensitive Operations)**
```php
<?php
// Use for password changes, payment processing, etc.
CSRFValidator::validateAndRotate();

// Proceed with sensitive operation...
?>
```

### 3. Client-Side Usage

**Automatic Form Protection**
Forms are automatically protected when the page loads:
```html
<form id="myForm" action="/api/endpoint.php" method="POST">
    <!-- CSRF token is automatically added as hidden input -->
    <input type="text" name="data">
    <button type="submit">Submit</button>
</form>
```

**Manual Form Protection**
```javascript
const form = document.getElementById('dynamicForm');
await CSRFProtection.protectForm(form);
```

**Fetch API with CSRF**
```javascript
// Option 1: Use secureFetch (recommended)
const response = await secureFetch('/api/endpoint.php', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({ data: 'value' })
});

// Option 2: Manual token addition
const headers = await CSRFProtection.addToHeaders({
    'Content-Type': 'application/json'
});

const response = await fetch('/api/endpoint.php', {
    method: 'POST',
    credentials: 'include', // Important!
    headers,
    body: JSON.stringify({ data: 'value' })
});
```

**XMLHttpRequest with CSRF**
```javascript
const xhr = new XMLHttpRequest();
xhr.open('POST', '/api/endpoint.php', true);
xhr.withCredentials = true; // Important!

const headers = await CSRFProtection.addToHeaders({
    'Content-Type': 'application/json'
});

Object.entries(headers).forEach(([key, value]) => {
    xhr.setRequestHeader(key, value);
});

xhr.send(JSON.stringify({ data: 'value' }));
```

### 4. jQuery AJAX with CSRF

```javascript
// Setup global AJAX prefilter
$.ajaxPrefilter(async function(options, originalOptions, jqXHR) {
    if (options.type.toUpperCase() !== 'GET') {
        const token = await CSRFProtection.getToken();
        jqXHR.setRequestHeader('X-CSRF-Token', token);
    }
});

// Then use jQuery AJAX normally
$.ajax({
    url: '/api/endpoint.php',
    method: 'POST',
    data: { field: 'value' },
    xhrFields: {
        withCredentials: true // Important!
    },
    success: function(response) {
        console.log('Success:', response);
    }
});
```

### 5. Axios with CSRF

```javascript
// Setup Axios interceptor
axios.interceptors.request.use(async (config) => {
    if (config.method !== 'get') {
        const token = await CSRFProtection.getToken();
        config.headers['X-CSRF-Token'] = token;
    }
    config.withCredentials = true; // Important!
    return config;
});

// Then use Axios normally
axios.post('/api/endpoint.php', { data: 'value' })
    .then(response => console.log(response.data))
    .catch(error => console.error(error));
```

## Token Flow

```
1. User logs in
   ├─> Server creates session with CSRF token
   └─> Token stored in PHP session (server-side)

2. Page loads
   ├─> Client requests token via /api/session.php?action=csrf-token
   └─> Server returns token (validated against session)

3. Form/Request submitted
   ├─> Client includes token in header or body
   ├─> Server validates token against session
   ├─> If valid: process request
   └─> If invalid: return 403 error

4. After sensitive operations
   └─> Server rotates token (generates new one)
```

## Security Features

### ✅ Implemented

1. **Server-side validation** - Tokens validated against PHP session, not client storage
2. **httpOnly session cookies** - Cannot be accessed by JavaScript (XSS protection)
3. **SameSite=Strict cookies** - Prevents CSRF via cookie isolation
4. **Token rotation** - New token after sensitive operations
5. **IP validation** - Session validates IP hasn't changed
6. **Automatic protection** - All forms automatically protected
7. **Method-based validation** - Only POST/PUT/DELETE validated (GET is safe)

### 🔒 Best Practices

1. **Always use credentials: 'include'** in fetch requests
2. **Never expose service role keys** to client
3. **Rotate tokens after**: password changes, payments, role changes
4. **Log failed validations** for security monitoring
5. **Use HTTPS in production** - required for secure cookies

## Troubleshooting

### Issue: "CSRF token missing"

**Cause:** Token not included in request

**Solutions:**
```javascript
// Ensure credentials are included
fetch(url, {
    credentials: 'include', // ← Add this
    // ...
});

// Or use secureFetch
await secureFetch(url, options);
```

### Issue: "Invalid CSRF token"

**Cause:** Token mismatch or expired session

**Solutions:**
1. Check session hasn't expired (30 min timeout)
2. Verify user is authenticated
3. Ensure token is being fetched from server, not generated client-side
4. Check if multiple tabs are causing token conflicts

```javascript
// Refresh token
await CSRFProtection.init();
const newToken = await CSRFProtection.getToken();
```

### Issue: Token works in development but not production

**Cause:** Cookie configuration or CORS issues

**Solutions:**
1. Ensure `session.cookie_secure = 1` in PHP
2. Verify HTTPS is enabled in production
3. Check CORS allows credentials:
   ```php
   header('Access-Control-Allow-Credentials: true');
   ```
4. Verify cookie domain matches

### Issue: Forms not getting tokens

**Cause:** Scripts loading in wrong order

**Solutions:**
```html
<!-- Load in this order -->
<script src="js/secure-session.js"></script>
<script src="js/csrf-protection.js"></script>
<script src="your-app.js"></script>
```

## Testing CSRF Protection

### Test Valid Request
```javascript
// Should succeed
const response = await secureFetch('/api/endpoint.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ test: 'data' })
});
console.log(response.status); // Should be 200
```

### Test Missing Token
```javascript
// Should fail with 403
const response = await fetch('/api/endpoint.php', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ test: 'data' })
    // No CSRF token - should fail
});
console.log(response.status); // Should be 403
```

### Test Invalid Token
```javascript
// Should fail with 403
const response = await fetch('/api/endpoint.php', {
    method: 'POST',
    credentials: 'include',
    headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': 'invalid-token-12345'
    },
    body: JSON.stringify({ test: 'data' })
});
console.log(response.status); // Should be 403
```

## Migration Checklist

For existing endpoints:

- [ ] Add `require_once __DIR__ . '/csrf-validator.php';` at top
- [ ] Add `CSRFValidator::protect();` before processing logic
- [ ] Include `js/csrf-protection.js` in HTML pages
- [ ] Update fetch calls to use `secureFetch()` or add credentials
- [ ] Test all forms and AJAX requests
- [ ] Verify error handling for 403 responses
- [ ] Update API documentation

## Example: Complete Protected Endpoint

```php
<?php
require_once __DIR__ . '/csrf-validator.php';
require_once __DIR__ . '/session-manager.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Credentials: true');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Protect endpoint
CSRFValidator::protect();

// Validate session
$sessionData = SessionManager::getSessionData();
if (!$sessionData) {
    http_response_code(401);
    echo json_encode(['error' => 'Not authenticated']);
    exit();
}

// Process request
try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Your business logic here
    $result = processData($input, $sessionData);
    
    echo json_encode([
        'success' => true,
        'data' => $result
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
```

## Resources

- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [MDN: SameSite Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite)
- [PHP Sessions Security](https://www.php.net/manual/en/session.security.php)

---

**Last Updated:** 2026-08-28  
**Status:** ✅ Implemented - Ready for deployment
