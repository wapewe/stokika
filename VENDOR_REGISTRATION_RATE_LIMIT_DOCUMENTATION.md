# Vendor Registration Rate Limiting Documentation

## Overview

Rate limiting has been implemented for the vendor registration endpoint to prevent abuse, brute force attacks, and ensure fair resource allocation. This document describes the implementation, configuration, and testing.

## Implementation Details

### Rate Limit Configuration

**Endpoint:** `/api/vendor-registration.php`

**Limits:**
- **Maximum Attempts:** 5 per hour per IP address
- **Time Window:** 3600 seconds (1 hour)
- **Namespace:** `vendor_registration`

### Implementation Location

The rate limiting is implemented in `/api/vendor-registration.php` at line 83-102:

```php
// ============================================
// STEP 1: RATE LIMITING
// ============================================
// 5 attempts per hour per IP address
if (!RateLimiter::checkLimit('vendor_registration', 5, 3600)) {
    // Rate limit exceeded - headers already set by RateLimiter
    $retryAfter = isset($_SERVER['HTTP_RETRY_AFTER']) ? (int)$_SERVER['HTTP_RETRY_AFTER'] : 3600;
    $retryMinutes = ceil($retryAfter / 60);
    
    SecurityLogger::logSecurityEvent('VENDOR_REGISTRATION_RATE_LIMIT', [
        'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
        'retry_after' => $retryAfter
    ]);
    
    sendResponse(429, [
        'success' => false,
        'error' => 'Rate limit exceeded',
        'code' => 'RATE_LIMIT_EXCEEDED',
        'message' => "Too many registration attempts. Please try again in {$retryMinutes} minutes.",
        'retry_after' => $retryAfter,
        'retry_minutes' => $retryMinutes
    ]);
}
```

### Rate Limiter Class

The implementation uses the existing `RateLimiter` class from `/api/rate-limiter.php`, which provides:

1. **File-based storage** - Uses `../private/rate-limits/` directory
2. **IP tracking** - Identifies clients by IP address + User Agent hash
3. **Automatic cleanup** - Removes old rate limit files (24+ hours)
4. **Comprehensive logging** - Logs violations to both file and PHP error log
5. **HTTP headers** - Sends standard rate limit headers

### HTTP Response

When rate limit is exceeded, the endpoint returns:

**Status Code:** `429 Too Many Requests`

**Headers:**
- `Retry-After: <seconds>` - Time until limit resets
- `X-RateLimit-Limit: 5` - Maximum requests allowed
- `X-RateLimit-Remaining: 0` - Remaining requests
- `X-RateLimit-Reset: <timestamp>` - Unix timestamp when limit resets

**Response Body:**
```json
{
    "success": false,
    "error": "Rate limit exceeded",
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many registration attempts. Please try again in X minutes.",
    "retry_after": 3600,
    "retry_minutes": 60
}
```

## Logging

### Rate Limit Violations Log

**Location:** `/private/rate-limits/violations.log`

**Format:**
```
[2025-01-15 14:30:22] RATE_LIMIT_EXCEEDED - Namespace: vendor_registration, Client: a3b5c7d9, IP: 192.168.1.100, Count: 6/5
```

### Security Event Log

Rate limit violations are also logged via `SecurityLogger` with event type `VENDOR_REGISTRATION_RATE_LIMIT` including:
- IP address
- User agent
- Retry after duration
- Timestamp

## Client Identification

Clients are identified using:
1. **IP Address** - Primary identifier
2. **User Agent Hash** - Secondary identifier to prevent evasion
3. **Namespace** - Unique per endpoint (`vendor_registration`)

The combination creates a unique client ID: `md5('vendor_registration:' + IP + ':' + md5(userAgent))`

## Storage

Rate limit data is stored in:
- **Directory:** `/private/rate-limits/`
- **File format:** `<client_id>.json`
- **Structure:**
  ```json
  {
      "requests": [1705327822, 1705327945, 1705328102],
      "last_updated": 1705328102
  }
  ```

### Protection

The storage directory is protected via `.htaccess`:
```
Order deny,allow
Deny from all
```

## Testing

### Manual Testing

Use the test page at `/api/test-vendor-registration-rate-limit.html` to:
1. Send single requests
2. Send burst of 6 requests to trigger rate limit
3. View detailed logs of responses

### Expected Behavior

1. **First 5 requests:** Should succeed (or fail validation, but not rate limited)
2. **6th request:** Should return 429 status with appropriate headers
3. **Subsequent requests:** Should continue to be rate limited until 1 hour passes
4. **After 1 hour:** Rate limit should reset, allowing 5 new attempts

### Test Script

```bash
# Send 6 requests in succession to test rate limiting
for i in {1..6}; do
    echo "Request $i:"
    curl -X POST http://localhost/api/vendor-registration.php \
        -H "Content-Type: application/json" \
        -d '{
            "fullName": "Test Vendor",
            "businessName": "Test Business",
            "businessCategory": "retail-shop",
            "county": "Nairobi",
            "town": "Nairobi",
            "center": "CBD",
            "phone": "0712345678",
            "email": "test@example.com",
            "businessStatus": "operating",
            "businessSize": "small",
            "businessModel": "retail",
            "stockCycle": "weekly",
            "stockRequirement": 50000,
            "stockJustification": "Test justification that meets minimum length requirement.",
            "csrf_token": "test-token",
            "bmcCompleted": "false"
        }'
    echo -e "\n---"
    sleep 1
done
```

## Maintenance

### Cleanup

The `RateLimiter` class automatically cleans up old rate limit files:
- **Trigger:** 1% chance per request
- **Max Age:** 24 hours
- **Action:** Deletes JSON files older than 24 hours

### Manual Reset

To manually reset rate limit for debugging (admin use only):

```php
require_once __DIR__ . '/api/rate-limiter.php';
RateLimiter::reset('vendor_registration');
```

## Security Considerations

### Protection Against

1. **Brute Force Registration Attempts** - Limits malicious mass registration
2. **Resource Exhaustion** - Prevents database/server overload
3. **Data Harvesting** - Limits information gathering attempts
4. **Automated Attacks** - Slows down bot-driven attacks

### Client Identification Strategy

- **IP + User Agent** - Prevents simple IP rotation attacks
- **Namespace isolation** - Each endpoint has independent limits
- **Sliding window** - More accurate than fixed window approach

### Limitations

Rate limiting by IP has limitations:
1. **Shared IPs** - Multiple legitimate users behind NAT may share limit
2. **Dynamic IPs** - Attackers can rotate IPs to bypass limits
3. **VPN/Proxies** - Sophisticated attackers can use proxy networks

**Mitigation:** Combine with other security measures:
- CSRF tokens
- CAPTCHA for suspicious patterns
- Account-based limits (once authenticated)
- Behavioral analysis

## Integration with Requirements

### Requirement 12.7

**Acceptance Criteria:**
- ✅ THE Validation_System SHALL enforce required field validation for all mandatory fields
- ✅ THE Validation_System SHALL validate phone number format in real-time
- ✅ THE Validation_System SHALL validate email address format in real-time
- ✅ THE Validation_System SHALL enforce minimum character requirements for text fields
- ✅ THE Validation_System SHALL prevent SQL injection through input sanitization
- ✅ THE Validation_System SHALL prevent XSS attacks through output encoding
- ✅ THE Validation_System SHALL validate CSRF tokens on form submission
- ✅ THE Validation_System SHALL enforce numeric validation for Stock_Requirement field
- ✅ THE Validation_System SHALL display validation error messages adjacent to invalid fields
- ✅ THE Validation_System SHALL prevent form submission when validation errors exist

**Rate Limiting Specifically:**
- ✅ Limits: 5 attempts per hour per IP
- ✅ Status Code: 429 returned when exceeded
- ✅ Logging: SecurityLogger records violations
- ✅ Headers: Standard Retry-After and X-RateLimit-* headers sent

## Troubleshooting

### Issue: Legitimate Users Getting Rate Limited

**Symptoms:** Users on shared networks (corporate, cafe) hitting limit

**Solutions:**
1. Review logs to confirm legitimate traffic
2. Consider increasing limit for specific IP ranges
3. Implement account-based limits instead of pure IP-based
4. Add user notification explaining shared IP situation

### Issue: Rate Limit Not Working

**Check:**
1. Directory permissions on `/private/rate-limits/`
2. PHP error logs for file write failures
3. `.htaccess` configuration
4. RateLimiter class is properly included

### Issue: Rate Limit Files Growing

**Solution:** Automatic cleanup should handle this, but if needed:

```bash
# Manual cleanup of old files
find /private/rate-limits/ -name "*.json" -mtime +1 -delete
```

## Future Enhancements

1. **Redis Backend** - For better performance and distributed systems
2. **Progressive Penalties** - Increase lockout time for repeat offenders
3. **Whitelist** - Allow trusted IPs to bypass limits
4. **Adaptive Limits** - Adjust based on system load
5. **Geographic Rate Limiting** - Different limits by country/region
6. **Account-based Limits** - Track by user account once authenticated

## References

- Main Implementation: `/api/vendor-registration.php`
- Rate Limiter Class: `/api/rate-limiter.php`
- Security Logger: `/api/security-logger.php`
- Test Page: `/api/test-vendor-registration-rate-limit.html`
- Requirements: `.kiro/specs/vendor-registration-restructure/requirements.md` (Requirement 12.7)
- Tasks: `.kiro/specs/vendor-registration-restructure/tasks.md` (Task 6.1)

---

**Document Version:** 1.0.0  
**Last Updated:** 2025-01-15  
**Status:** ✅ Complete and Verified
