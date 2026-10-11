# ID Number Security - Quick Reference

Quick reference for using ID number security utilities in edge functions.

## Import

```typescript
import {
  sanitizeAndValidateIdNumber,
  sanitizeIdNumberForDatabase,
  hashIdNumber,
  logIdNumberSecurityEvent,
  redactIdNumber
} from '../shared/id-number-security.ts'
```

## Common Patterns

### 1. Validate User Input

```typescript
// Get ID from user input
const result = sanitizeAndValidateIdNumber(userInput.idNumber);

if (!result.valid) {
  return new Response(
    JSON.stringify({ error: result.error }),
    { status: 400 }
  );
}

const idNumber = result.sanitized; // Use this value
```

### 2. Database Query

```typescript
// Safe for database queries (throws if invalid)
try {
  const safeId = sanitizeIdNumberForDatabase(userInput.idNumber);
  
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id_number', safeId);
    
} catch (error) {
  return new Response(
    JSON.stringify({ error: 'Invalid ID number format' }),
    { status: 400 }
  );
}
```

### 3. Hash for Logs

```typescript
// Hash before logging
const hashedId = await hashIdNumber(idNumber);

await supabase.from('audit_logs').insert({
  action: 'vendor_registration',
  details: {
    id_number_hash: hashedId,  // ✅ Hashed
    // id_number: idNumber,    // ❌ Never do this
    business_name: businessName
  }
});
```

### 4. Log Security Event

```typescript
// Automatic hashing + structured logging
await logIdNumberSecurityEvent(
  supabase,
  'DUPLICATE_ID_ATTEMPT',
  idNumber,
  {
    entity_type: 'profile',
    existing_entity_id: existingProfileId
  },
  ipAddress,
  userAgent
);
```

### 5. Display to User

```typescript
// Redact for display
const redacted = redactIdNumber(idNumber);
console.log(`ID: ${redacted}`); // "12****78"

// Or in responses (be careful)
return new Response(
  JSON.stringify({
    message: 'Duplicate ID detected',
    idNumber: redacted  // Safe to show
  })
);
```

## Rate Limiting

### Import

```typescript
import {
  checkValidationRateLimit,
  checkPaymentCreationRateLimit,
  createRateLimitResponse,
  logRateLimitViolation,
  extractClientIP
} from '../shared/enhanced-rate-limiter.ts'
```

### Validation Endpoint (IP-based)

```typescript
// Check rate limit (5 per 15 min per IP)
const rateLimit = await checkValidationRateLimit(req);

if (!rateLimit.allowed) {
  const ip = extractClientIP(req);
  const userAgent = req.headers.get('user-agent') || 'unknown';
  
  await logRateLimitViolation(
    supabase,
    ip,
    'vendor-validation',
    rateLimit.currentCount,
    rateLimit.limit,
    ip,
    userAgent
  );
  
  return createRateLimitResponse(rateLimit);
}

// Proceed with request...
```

### Payment Endpoint (User-based)

```typescript
// Check rate limit (3 per hour per user)
const rateLimit = await checkPaymentCreationRateLimit(user.id);

if (!rateLimit.allowed) {
  return createRateLimitResponse(rateLimit, corsHeaders);
}

// Proceed with payment creation...
```

## Do's and Don'ts

### ✅ DO

```typescript
// ✅ Always sanitize and validate
const result = sanitizeAndValidateIdNumber(input);
if (result.valid) {
  const id = result.sanitized;
}

// ✅ Hash before logging
const hash = await hashIdNumber(idNumber);
log({ id_number_hash: hash });

// ✅ Use security utilities
await logIdNumberSecurityEvent(...);

// ✅ Check rate limits
const rateLimit = await checkValidationRateLimit(req);

// ✅ Redact for display
const redacted = redactIdNumber(idNumber);
```

### ❌ DON'T

```typescript
// ❌ Don't use raw input directly
const id = userInput.idNumber; // No validation!
await supabase.from('profiles').insert({ id_number: id });

// ❌ Don't log raw ID numbers
log({ id_number: idNumber }); // PII exposure!

// ❌ Don't trust trimmed input
const id = input.trim(); // Not enough validation

// ❌ Don't skip rate limiting
// Always check rate limits on public endpoints

// ❌ Don't create custom validators
// Use the security utilities instead
```

## Error Handling

```typescript
// Comprehensive error handling
try {
  // Validate
  const validation = sanitizeAndValidateIdNumber(input.idNumber);
  if (!validation.valid) {
    return errorResponse(400, validation.error);
  }
  
  const idNumber = validation.sanitized;
  
  // Use in database
  const { data, error } = await supabase
    .from('profiles')
    .insert({ id_number: idNumber });
  
  if (error) {
    // Handle unique constraint violation (23505)
    if (error.code === '23505' && error.message.includes('id_number')) {
      // Log security event
      await logIdNumberSecurityEvent(
        supabase,
        'DUPLICATE_ID_ATTEMPT',
        idNumber,
        { error: 'Unique constraint violation' },
        ipAddress,
        userAgent
      );
      
      return errorResponse(409, 'This ID Number is already registered');
    }
    
    throw error;
  }
  
  return successResponse(data);
  
} catch (error) {
  console.error('Unexpected error:', error);
  return errorResponse(500, 'Internal server error');
}
```

## Testing

```typescript
// Test sanitization
console.assert(
  sanitizeAndValidateIdNumber('12345678').valid === true,
  'Should accept valid ID'
);

console.assert(
  sanitizeAndValidateIdNumber('  12-34-56-78  ').valid === true,
  'Should sanitize and validate'
);

console.assert(
  sanitizeAndValidateIdNumber('1234567').valid === false,
  'Should reject invalid length'
);

// Test hashing consistency
const hash1 = await hashIdNumber('12345678');
const hash2 = await hashIdNumber('12345678');
console.assert(hash1 === hash2, 'Hashes should be consistent');

// Test rate limiting
const result = await checkValidationRateLimit(mockRequest);
console.assert(result.allowed === true, 'First request should be allowed');
```

## Environment Setup

```bash
# Optional: Set hash salt for production
supabase secrets set ID_NUMBER_HASH_SALT="$(openssl rand -base64 32)"

# Verify
supabase secrets list
```

## Troubleshooting

### "ID Number must be exactly 8 digits"
- Input likely has non-numeric characters
- Use `sanitizeIdNumber()` first to see cleaned value
- Check for hidden characters (zero-width spaces, etc.)

### "Rate limit exceeded"
- Normal behavior when limit is reached
- Returns HTTP 429 with Retry-After header
- Check `getRateLimitStatus()` to inspect current state

### Hashes don't match
- Ensure same salt is used (check `ID_NUMBER_HASH_SALT`)
- Verify ID is sanitized before hashing
- Check if using different functions (hashIdNumber vs custom)

## References

- Full documentation: `SECURITY-ENHANCEMENTS-README.md`
- Implementation summary: `TASK-15-IMPLEMENTATION-SUMMARY.md`
- Module source: `id-number-security.ts`, `enhanced-rate-limiter.ts`

---

**Quick tip:** When in doubt, use `sanitizeAndValidateIdNumber()` first and check if `result.valid` before proceeding.
