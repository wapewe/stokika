# Security Features for Edge Functions

This document explains how to use the security middleware and utilities in Supabase Edge Functions.

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Core Security Features](#core-security-features)
4. [Middleware Usage](#middleware-usage)
5. [Input Validation](#input-validation)
6. [Audit Logging](#audit-logging)
7. [Best Practices](#best-practices)

## Overview

The security module provides comprehensive security features for Edge Functions:

- **JWT Validation**: Authenticate users via Supabase Auth tokens
- **Rate Limiting**: Prevent abuse with configurable rate limits
- **Input Validation**: Server-side validation and sanitization
- **Audit Logging**: Log security-critical and business-critical actions
- **CORS Handling**: Proper CORS headers for all responses

### Requirements Satisfied

- **32.12**: JWT validation in all Edge Functions
- **22.1-22.11**: Rate limiting implementation
- **20.9**: Server-side input validation
- **10.11**: Audit logging for business-critical decisions

## Quick Start

### Basic Protected Endpoint

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { withSecurity } from '../shared/middleware.ts';
import { createSuccessResponse } from '../shared/security.ts';

serve(withSecurity(
  async ({ supabase, userId, req }) => {
    // Your handler logic here
    // userId is automatically available and authenticated
    
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      throw new Error(`Failed to fetch vendor: ${error.message}`);
    }
    
    return createSuccessResponse({ vendor: data });
  },
  {
    requireAuth: true,                    // JWT validation (default: true)
    rateLimitOperation: 'apiQuery',       // Rate limit type
    logAuditOnSuccess: true               // Log successful operations
  }
));
```

### Authentication Endpoint (Login)

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { withAuthEndpoint } from '../shared/middleware.ts';
import { createSuccessResponse, createErrorResponse, validateEmail } from '../shared/security.ts';

serve(withAuthEndpoint(
  async ({ supabase, req }) => {
    const { email, password } = await req.json();
    
    // Validate input
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return createErrorResponse(emailValidation.errors![0], 400);
    }
    
    // Authenticate
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      return createErrorResponse('Invalid credentials', 401);
    }
    
    return createSuccessResponse({
      token: data.session?.access_token,
      user: data.user
    });
  },
  'login' // Automatically applies login rate limiting (5 per 15 min)
));
```

### Webhook Endpoint (M-Pesa Callback)

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { withWebhook } from '../shared/middleware.ts';
import { createSuccessResponse } from '../shared/security.ts';

async function validateMpesaSignature(req: Request): Promise<boolean> {
  const signature = req.headers.get('X-Safaricom-Signature');
  const passkey = Deno.env.get('MPESA_PASSKEY');
  
  // Validate signature logic here
  // ... implementation
  
  return true; // or false if invalid
}

serve(withWebhook(
  async ({ supabase, req }) => {
    const callbackData = await req.json();
    
    // Process M-Pesa callback
    // ... implementation
    
    return createSuccessResponse({ message: 'Callback processed' });
  },
  validateMpesaSignature // Custom signature validation
));
```

## Core Security Features

### 1. JWT Validation

Automatically validates JWT tokens from the `Authorization` header:

```typescript
import { validateJWT } from '../shared/security.ts';

// Manual JWT validation (usually handled by middleware)
const auth = await validateJWT(supabase, req.headers.get('Authorization'));
if (!auth.success) {
  return createErrorResponse(auth.error!, 401);
}

const userId = auth.userId!;
```

### 2. Rate Limiting

Configured rate limits for different operations:

| Operation | Limit | Window | Identifier |
|-----------|-------|--------|------------|
| `login` | 5 | 15 minutes | IP address |
| `passwordReset` | 3 | 1 hour | Email |
| `stockRequest` | 10 | 1 hour | User ID |
| `paymentIntent` | 20 | 1 hour | User ID |
| `mpesaCallback` | 10 | 1 minute | Transaction ID |
| `apiQuery` | 100 | 1 minute | User ID |

#### Manual Rate Limiting

```typescript
import { checkRateLimit, recordRateLimitAttempt, RATE_LIMIT_CONFIGS } from '../shared/security.ts';

// Check rate limit
const rateLimitResult = await checkRateLimit(supabase, {
  ...RATE_LIMIT_CONFIGS.stockRequest,
  identifier: userId,
  operation: 'stock_request'
});

if (!rateLimitResult.allowed) {
  return createErrorResponse(
    rateLimitResult.reason!,
    429,
    rateLimitResult.retryAfter
  );
}

// Record attempt
await recordRateLimitAttempt(supabase, userId, 'stock_request');
```

### 3. Input Validation

Comprehensive validation functions:

#### String Validation

```typescript
import { validateString, sanitizeHTML } from '../shared/security.ts';

const validation = validateString(businessName, 'businessName', {
  required: true,
  minLength: 2,
  maxLength: 200,
  pattern: /^[a-zA-Z0-9\s\-\.]+$/
});

if (!validation.valid) {
  return createErrorResponse(validation.errors!.join(', '), 400);
}

// Sanitize for display
const safeName = sanitizeHTML(businessName);
```

#### Email Validation

```typescript
import { validateEmail } from '../shared/security.ts';

const emailValidation = validateEmail(email);
if (!emailValidation.valid) {
  return createErrorResponse(emailValidation.errors![0], 400);
}
```

#### Phone Validation

```typescript
import { validatePhone } from '../shared/security.ts';

const phoneValidation = validatePhone(phoneNumber);
if (!phoneValidation.valid) {
  return createErrorResponse(phoneValidation.errors![0], 400);
}

// Get normalized format (254XXXXXXXXX)
const normalizedPhone = phoneValidation.normalized!;
```

#### UUID Validation

```typescript
import { validateUUID } from '../shared/security.ts';

const uuidValidation = validateUUID(productId, 'Product ID');
if (!uuidValidation.valid) {
  return createErrorResponse(uuidValidation.errors![0], 400);
}
```

#### Number Validation

```typescript
import { validateNumber } from '../shared/security.ts';

const amountValidation = validateNumber(amount, 'Amount', {
  required: true,
  min: 100,
  max: 100000,
  integer: false
});

if (!amountValidation.valid) {
  return createErrorResponse(amountValidation.errors![0], 400);
}
```

## Audit Logging

Log security-critical and business-critical actions:

```typescript
import { logAudit } from '../shared/security.ts';

// Log successful operation
await logAudit(supabase, {
  userId: user.id,
  action: 'stock_request_created',
  resourceType: 'stock_request',
  resourceId: stockRequestId,
  actionStatus: 'success',
  details: {
    total_amount: 50000,
    items_count: 3,
    supplier_id: supplierId
  }
});

// Log failed operation
await logAudit(supabase, {
  userId: user.id,
  action: 'payment_failed',
  resourceType: 'payment',
  resourceId: paymentIntentId,
  actionStatus: 'failure',
  details: {
    reason: 'Insufficient balance',
    amount: 5000
  }
});

// Log access denied
await logAudit(supabase, {
  userId: user.id,
  action: 'access_denied',
  resourceType: 'vendor',
  resourceId: vendorId,
  actionStatus: 'denied',
  details: {
    reason: 'User not authorized to access this vendor'
  }
});
```

### Automatic Sensitive Data Redaction

The audit logging automatically redacts sensitive fields:

```typescript
await logAudit(supabase, {
  userId: user.id,
  action: 'api_key_generated',
  actionStatus: 'success',
  details: {
    key_name: 'Production API Key',
    api_key: 'sk_live_123456789',  // Will be redacted to '[REDACTED]'
    permissions: ['read', 'write']
  }
});

// Logged as:
// {
//   key_name: 'Production API Key',
//   api_key: '[REDACTED]',
//   permissions: ['read', 'write']
// }
```

## Best Practices

### 1. Always Use Middleware

Use `withSecurity` middleware for all protected endpoints:

```typescript
// ✅ Good
serve(withSecurity(
  async ({ supabase, userId, req }) => {
    // Handler logic
  },
  { requireAuth: true, rateLimitOperation: 'apiQuery' }
));

// ❌ Bad - Manual security checks are error-prone
serve(async (req) => {
  const authHeader = req.headers.get('Authorization');
  // ... manual validation
});
```

### 2. Validate All Inputs

Always validate user inputs server-side:

```typescript
// ✅ Good
const emailValidation = validateEmail(email);
if (!emailValidation.valid) {
  return createErrorResponse(emailValidation.errors![0], 400);
}

// ❌ Bad - Trusting client-side validation
const email = req.json().email; // No validation
await supabase.from('users').insert({ email });
```

### 3. Use Appropriate Rate Limits

Choose the correct rate limit operation for your endpoint:

```typescript
// ✅ Good - Stock request has appropriate limit
serve(withSecurity(handler, {
  rateLimitOperation: 'stockRequest' // 10 per hour
}));

// ❌ Bad - Using wrong rate limit type
serve(withSecurity(handler, {
  rateLimitOperation: 'apiQuery' // 100 per minute - too permissive
}));
```

### 4. Log Important Actions

Log all security-critical and business-critical actions:

```typescript
// ✅ Good - Log both success and failure
try {
  const result = await processPayment();
  await logAudit(supabase, {
    userId,
    action: 'payment_processed',
    actionStatus: 'success',
    details: { amount: result.amount }
  });
} catch (error) {
  await logAudit(supabase, {
    userId,
    action: 'payment_failed',
    actionStatus: 'failure',
    details: { error: error.message }
  });
  throw error;
}
```

### 5. Use Helper Functions

Use the helper functions for consistent responses:

```typescript
import { createSuccessResponse, createErrorResponse } from '../shared/security.ts';

// ✅ Good - Consistent responses with CORS headers
return createSuccessResponse({ data: result });
return createErrorResponse('Not found', 404);

// ❌ Bad - Manual response construction
return new Response(JSON.stringify({ data: result }), {
  status: 200,
  headers: { 'Content-Type': 'application/json' }
  // Missing CORS headers
});
```

### 6. Never Trust Client Data

Always re-validate and recalculate server-side:

```typescript
// ✅ Good - Calculate amount server-side
const { data: cycle } = await supabase
  .from('stock_cycles')
  .select('balance')
  .eq('id', cycleId)
  .single();

const expectedAmount = cycle.balance; // Server calculation

// ❌ Bad - Trusting client-provided amount
const { amount } = await req.json(); // Client can manipulate this
await processPayment(amount);
```

### 7. Handle Errors Gracefully

Provide informative but not sensitive error messages:

```typescript
// ✅ Good - Informative without exposing internals
try {
  await processOrder();
} catch (error) {
  console.error('[Order Processing] Error:', error); // Log details
  return createErrorResponse(
    'Failed to process order. Please try again.',
    500
  );
}

// ❌ Bad - Exposing internal details
catch (error) {
  return createErrorResponse(
    `Database error: ${error.message}`, // Exposes database structure
    500
  );
}
```

## Migration Guide

To migrate an existing Edge Function to use the new security features:

### Before (Manual Security)

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

serve(async (req) => {
  // Manual CORS handling
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Manual auth validation
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (!user) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });
  }

  // Handler logic
  // ...

  return new Response(JSON.stringify({ result: 'success' }), { status: 200 });
});
```

### After (With Security Middleware)

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { withSecurity } from '../shared/middleware.ts';
import { createSuccessResponse } from '../shared/security.ts';

serve(withSecurity(
  async ({ supabase, userId, req }) => {
    // Handler logic with automatic auth, rate limiting, and CORS
    // userId is automatically available and validated
    
    // ... your logic here

    return createSuccessResponse({ result: 'success' });
  },
  {
    requireAuth: true,
    rateLimitOperation: 'apiQuery',
    logAuditOnSuccess: true
  }
));
```

## Testing

### Unit Testing Validation Functions

```typescript
import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { validateEmail, validatePhone, validateUUID } from '../shared/security.ts';

Deno.test('validateEmail - valid email', () => {
  const result = validateEmail('user@example.com');
  assertEquals(result.valid, true);
});

Deno.test('validateEmail - invalid email', () => {
  const result = validateEmail('not-an-email');
  assertEquals(result.valid, false);
  assertEquals(result.errors![0], 'Invalid email format');
});

Deno.test('validatePhone - valid Kenyan phone', () => {
  const result = validatePhone('254712345678');
  assertEquals(result.valid, true);
  assertEquals(result.normalized, '254712345678');
});
```

### Integration Testing Rate Limiting

```typescript
Deno.test('Rate limiting - blocks after limit', async () => {
  const supabase = createTestClient();
  
  // Make requests up to limit
  for (let i = 0; i < 5; i++) {
    const result = await checkRateLimit(supabase, {
      maxRequests: 5,
      windowMs: 60000,
      identifier: 'test-user',
      operation: 'test_operation'
    });
    assertEquals(result.allowed, true);
    await recordRateLimitAttempt(supabase, 'test-user', 'test_operation');
  }
  
  // Next request should be blocked
  const blockedResult = await checkRateLimit(supabase, {
    maxRequests: 5,
    windowMs: 60000,
    identifier: 'test-user',
    operation: 'test_operation'
  });
  assertEquals(blockedResult.allowed, false);
});
```

## Troubleshooting

### JWT Validation Fails

**Problem**: `Invalid or expired authentication token`

**Solutions**:
- Check that `Authorization` header format is `Bearer <token>`
- Verify token hasn't expired (default: 1 hour)
- Ensure Supabase project URL and keys are correct
- Check that user still exists in Supabase Auth

### Rate Limit Unexpectedly Triggered

**Problem**: Rate limit exceeded when it shouldn't be

**Solutions**:
- Check if the identifier is correct (user ID vs IP address)
- Verify rate limit window and max requests configuration
- Look at `rate_limit_attempts` table for actual attempts
- Ensure cleanup function runs to remove old attempts

### Audit Logs Not Created

**Problem**: Audit entries not appearing in `audit_logs` table

**Solutions**:
- Check Supabase service role key has permission to insert
- Verify `audit_logs` table exists and has correct schema
- Look for errors in Edge Function logs
- Ensure audit logging failures don't throw errors (fail silently)

## Support

For questions or issues:
1. Check the Edge Function logs in Supabase Dashboard
2. Review the `audit_logs` table for security events
3. Check the `rate_limit_attempts` table for rate limiting data
4. Contact the development team

## License

This security module is part of the Stokika platform and follows the same license.
