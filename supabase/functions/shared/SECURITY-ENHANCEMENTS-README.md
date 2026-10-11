# Security Enhancements for Vendor ID Manual Payment

This document describes the security enhancements implemented for Task 15 of the vendor-id-manual-payment spec.

## Overview

Three key security enhancements have been implemented:

1. **ID Number Sanitization** (Task 15.1)
2. **ID Number Hashing for Logs** (Task 15.2)
3. **Enhanced Rate Limiting** (Task 15.3)

## Files Created

### 1. `id-number-security.ts`

Comprehensive ID number security utilities module providing:

#### Functions

**Sanitization & Validation:**
- `sanitizeIdNumber(idNumber)` - Removes whitespace and non-numeric characters
- `validateIdNumber(idNumber)` - Validates 8-digit format
- `sanitizeAndValidateIdNumber(idNumber)` - Combined sanitization and validation
- `sanitizeIdNumberForDatabase(idNumber)` - Safe database query preparation
- `containsSqlInjectionPatterns(idNumber)` - SQL injection detection
- `isIdNumberFormat(value)` - Quick format check (for BillRefNumber matching)

**Hashing & Privacy:**
- `hashIdNumber(idNumber, salt?)` - SHA-256 hashing with optional salt
- `hashIdNumberShort(idNumber, salt?)` - Truncated hash for display
- `verifyIdNumberHash(idNumber, hash, salt?)` - Hash verification
- `redactIdNumber(idNumber)` - Partial redaction (12****78)

**Logging:**
- `logIdNumberSecurityEvent(supabase, eventType, idNumber, details, ipAddress, userAgent)` - Security event logging with automatic hashing

#### Usage Examples

```typescript
// Sanitize and validate user input
const result = sanitizeAndValidateIdNumber(userInput);
if (result.valid) {
  const cleanId = result.sanitized; // '12345678'
} else {
  console.error(result.error);
}

// Hash for audit logs
const hash = await hashIdNumber('12345678');
await supabase.from('audit_logs').insert({
  action: 'vendor_registration',
  details: { id_number_hash: hash }
});

// Redact for display
const redacted = redactIdNumber('12345678'); // '12****78'
```

### 2. `enhanced-rate-limiter.ts`

Enhanced rate limiting specifically for vendor registration endpoints.

#### Rate Limit Configurations

**Validation Endpoint:**
- Limit: 5 requests per 15 minutes per IP
- Identifier: Client IP address
- Namespace: `vendor-validation`

**Payment Creation Endpoint:**
- Limit: 3 requests per hour per user
- Identifier: User ID
- Namespace: `vendor-payment-creation`

#### Functions

**Rate Limiting:**
- `checkRateLimit(identifier, config)` - Generic rate limit check
- `checkValidationRateLimit(req)` - Validation endpoint check (IP-based)
- `checkPaymentCreationRateLimit(userId)` - Payment endpoint check (user-based)
- `getRateLimitStatus(identifier, config)` - Status check without incrementing

**Response Handling:**
- `createRateLimitResponse(result, additionalHeaders?)` - HTTP 429 response with Retry-After
- `logRateLimitViolation(supabase, identifier, namespace, currentCount, limit, ipAddress, userAgent)` - Audit logging

**Utilities:**
- `extractClientIP(req)` - IP extraction with proxy support
- `resetRateLimit(identifier, config)` - Manual reset (admin only)

#### Usage Examples

```typescript
// In validate-vendor-registration edge function
const rateLimit = await checkValidationRateLimit(req);
if (!rateLimit.allowed) {
  await logRateLimitViolation(supabase, ip, 'vendor-validation', rateLimit.currentCount, rateLimit.limit, ip, userAgent);
  return createRateLimitResponse(rateLimit);
}

// In create-vendor-registration-payment edge function
const rateLimit = await checkPaymentCreationRateLimit(user.id);
if (!rateLimit.allowed) {
  return createRateLimitResponse(rateLimit, corsHeaders);
}
```

## Edge Functions Updated

### 1. `validate-vendor-registration/index.ts`

**Changes:**
- Imported `id-number-security` utilities
- Imported `enhanced-rate-limiter` utilities
- Replaced custom rate limiting with `checkValidationRateLimit()`
- Replaced ID validation with `sanitizeAndValidateIdNumber()`
- Added SQL injection detection with `containsSqlInjectionPatterns()`
- Updated duplicate checks to use `sanitizeIdNumberForDatabase()`
- Replaced custom hashing with `hashIdNumber()`
- Updated security logging to use `logIdNumberSecurityEvent()`

**Rate Limit:** 5 requests per 15 minutes per IP

### 2. `create-vendor-registration-payment/index.ts`

**Changes:**
- Imported `id-number-security` utilities
- Imported `enhanced-rate-limiter` utilities
- Replaced custom rate limiting with `checkPaymentCreationRateLimit()`
- Replaced ID validation with `sanitizeAndValidateIdNumber()`
- Uses sanitized ID number for all operations

**Rate Limit:** 3 requests per hour per user

### 3. `create-vendor-from-payment/index.ts`

**Changes:**
- Imported `id-number-security` utilities
- Removed duplicate `hashIdNumber()` and `validateIdNumber()` functions
- Updated ID extraction to use `sanitizeAndValidateIdNumber()`
- Uses module functions for all ID number operations

## Security Benefits

### 1. ID Number Sanitization (Task 15.1)

**Protection Against:**
- Whitespace and formatting inconsistencies
- Non-numeric character injection
- SQL injection attempts
- Database constraint violations

**Benefits:**
- Consistent data format in database
- Reliable matching and lookups
- Defense-in-depth against injection attacks
- Graceful error handling with user-friendly messages

### 2. ID Number Hashing (Task 15.2)

**Protection Against:**
- PII exposure in logs
- Unauthorized access to sensitive data
- Compliance violations (GDPR, data protection)

**Benefits:**
- Secure audit trails
- Correlatable events without exposing raw data
- Environment-based salt for additional security
- Partial redaction for safe display

**Implementation:**
- SHA-256 algorithm
- Optional salt from `ID_NUMBER_HASH_SALT` environment variable
- Consistent hashing across all functions
- Never logs raw ID numbers except in designated encrypted audit logs

### 3. Enhanced Rate Limiting (Task 15.3)

**Protection Against:**
- Brute force attacks
- Account enumeration
- DoS/DDoS attempts
- Abuse of payment creation

**Benefits:**
- IP-based limiting for validation (prevents automated scripts)
- User-based limiting for payments (prevents abuse by authenticated users)
- Proper HTTP 429 responses with Retry-After headers
- Automatic cleanup via Deno KV expiration
- Comprehensive audit logging of violations

## Environment Variables

### Required

None - all functions work with defaults.

### Optional

**`ID_NUMBER_HASH_SALT`** (recommended for production)
- Used as salt for ID number hashing
- Increases security by making hashes unique to deployment
- Should be a random string (e.g., 32+ characters)
- Example: `openssl rand -base64 32`

```bash
# In .env or Supabase secrets
ID_NUMBER_HASH_SALT=your-random-salt-string-here
```

## Testing

### ID Number Sanitization Tests

```typescript
// Valid inputs
sanitizeAndValidateIdNumber('12345678')       // ✓ { valid: true, sanitized: '12345678' }
sanitizeAndValidateIdNumber('  12345678  ')   // ✓ { valid: true, sanitized: '12345678' }
sanitizeAndValidateIdNumber('12-34-56-78')    // ✓ { valid: true, sanitized: '12345678' }

// Invalid inputs
sanitizeAndValidateIdNumber('1234567')        // ✗ Must be exactly 8 digits
sanitizeAndValidateIdNumber('12345678a')      // ✗ Must contain only numbers
sanitizeAndValidateIdNumber('')               // ✗ ID Number is required
```

### Rate Limiting Tests

```bash
# Test validation endpoint (5 per 15 min)
for i in {1..6}; do
  curl -X POST https://your-project.supabase.co/functions/v1/validate-vendor-registration \
    -H "Content-Type: application/json" \
    -d '{"fullName":"Test","email":"test@test.com",...}'
done
# 6th request should return 429

# Test payment creation (3 per hour)
for i in {1..4}; do
  curl -X POST https://your-project.supabase.co/functions/v1/create-vendor-registration-payment \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"validationToken":"...","phoneNumber":"254712345678","paymentMethod":"stkpush"}'
done
# 4th request should return 429
```

### Hashing Tests

```typescript
// Test hashing consistency
const hash1 = await hashIdNumber('12345678');
const hash2 = await hashIdNumber('12345678');
console.assert(hash1 === hash2, 'Hashes should be consistent');

// Test hash verification
const matches = await verifyIdNumberHash('12345678', hash1);
console.assert(matches === true, 'Verification should succeed');

// Test with salt
const saltedHash = await hashIdNumber('12345678', 'custom-salt');
console.assert(saltedHash !== hash1, 'Salted hash should differ');
```

## Migration Guide

### For Existing Edge Functions

To add ID number security to existing edge functions:

```typescript
// 1. Import utilities
import {
  sanitizeAndValidateIdNumber,
  hashIdNumber,
  logIdNumberSecurityEvent
} from '../shared/id-number-security.ts'

// 2. Replace validation logic
// Before:
const idNumber = data.idNumber?.trim()
if (!idNumber || !/^[0-9]{8}$/.test(idNumber)) {
  return error('Invalid ID')
}

// After:
const idValidation = sanitizeAndValidateIdNumber(data.idNumber)
if (!idValidation.valid) {
  return error(idValidation.error)
}
const idNumber = idValidation.sanitized

// 3. Hash before logging
// Before:
await supabase.from('audit_logs').insert({
  details: { id_number: idNumber }
})

// After:
const hashedId = await hashIdNumber(idNumber)
await supabase.from('audit_logs').insert({
  details: { id_number_hash: hashedId }
})

// 4. Or use convenience function
await logIdNumberSecurityEvent(
  supabase,
  'EVENT_TYPE',
  idNumber,
  { additional: 'details' },
  ipAddress,
  userAgent
)
```

## Compliance

These security enhancements help meet:

- **GDPR:** Minimization and protection of PII (hashed ID numbers)
- **PCI DSS:** Input validation and sanitization
- **OWASP Top 10:** Protection against injection, broken authentication, security misconfiguration
- **Data Protection Laws:** Secure handling of government ID numbers

## Troubleshooting

### Rate Limiting Not Working

1. Verify Deno KV is available in deployment environment
2. Check logs for "Rate Limit] Error checking rate limit"
3. Confirm functions are using correct rate limit functions
4. Test with `getRateLimitStatus()` to inspect state

### ID Number Validation Failing

1. Check exact error message from validation result
2. Verify input is being passed correctly
3. Test with `sanitizeIdNumber()` first to see sanitized output
4. Check for hidden characters (copy-paste from PDF, etc.)

### Hashing Inconsistency

1. Verify same salt is used (check `ID_NUMBER_HASH_SALT` env var)
2. Ensure ID number is sanitized before hashing
3. Check if different hashing functions are being used
4. Verify crypto.subtle.digest is available

## Future Enhancements

Potential improvements for future iterations:

1. **Redis-based rate limiting** for distributed deployments
2. **Geolocation-based rate limiting** (stricter for high-risk countries)
3. **Behavioral analysis** (detect patterns beyond simple counting)
4. **ID number checksum validation** (if Kenya uses Luhn or similar)
5. **Encrypted ID number storage** (with keys in HSM/KMS)
6. **Audit log rotation** (archive old logs to cold storage)
7. **Real-time anomaly detection** (ML-based)

## Support

For issues or questions:

1. Check Edge Function logs in Supabase dashboard
2. Review audit_logs table for security events
3. Test with isolated inputs to identify issue
4. Contact system administrator if rate limits need adjustment

---

**Last Updated:** January 2026  
**Spec:** vendor-id-manual-payment  
**Task:** 15 - Security Enhancements  
**Status:** ✅ Complete
