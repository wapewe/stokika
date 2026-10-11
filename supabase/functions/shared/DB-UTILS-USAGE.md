# Database Utilities Usage Guide

## Overview

The `db-utils.ts` module provides safe database operations with comprehensive constraint violation handling. This guide shows how to integrate it into Edge Functions.

## Requirements

Task 14.2 - Backend database constraint violation handling:
- Handle PostgreSQL error code 23505 (unique violation)
- Handle PostgreSQL error code 23514 (check constraint)
- Return user-friendly error messages
- Log unexpected database errors

## Installation

```typescript
import { safeInsert, safeUpdate, safeUpsert, formatDbErrorResponse } from '../shared/db-utils.ts'
```

## Usage Examples

### 1. Safe Insert with Constraint Handling

**Before (without safe insert):**
```typescript
const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .insert({
    id: userId,
    email: email,
    phone: phone,
    id_number: idNumber
  })
  .single()

if (profileError) {
  // Generic error handling
  return new Response(
    JSON.stringify({ error: 'Failed to create profile' }),
    { status: 500, headers: corsHeaders }
  )
}
```

**After (with safe insert):**
```typescript
const profileResult = await safeInsert(
  supabase,
  'profiles',
  {
    id: userId,
    email: email,
    phone: phone,
    id_number: idNumber
  }
)

if (profileResult.error) {
  // User-friendly error messages with specific codes
  console.error('[Create Profile] Error:', profileResult.error)
  return new Response(
    JSON.stringify(formatDbErrorResponse(profileResult.error)),
    { 
      status: profileResult.error.code === 'DUPLICATE_ID_NUMBER' ? 409 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

const profile = profileResult.data
```

### 2. Safe Update Example

```typescript
const updateResult = await safeUpdate(
  supabase,
  'vendors',
  vendorId,
  {
    business_status: 'active',
    verification_date: new Date().toISOString()
  }
)

if (updateResult.error) {
  return new Response(
    JSON.stringify(formatDbErrorResponse(updateResult.error)),
    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
```

### 3. Safe Upsert Example

```typescript
const upsertResult = await safeUpsert(
  supabase,
  'profiles',
  {
    id: userId,
    email: email,
    id_number: idNumber,
    updated_at: new Date().toISOString()
  },
  'id' // Conflict column
)

if (upsertResult.error) {
  console.error('[Upsert Profile] Error:', upsertResult.error)
  
  // Check if error is retryable
  if (isRetryableDbError(upsertResult.error)) {
    // Implement retry logic
  }
  
  return new Response(
    JSON.stringify(formatDbErrorResponse(upsertResult.error)),
    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
```

## Error Codes

The utility provides user-friendly error codes:

| Database Error | User-Friendly Code | Message |
|----------------|-------------------|---------|
| 23505 (unique violation on id_number) | `DUPLICATE_ID_NUMBER` | "This ID number is already registered..." |
| 23505 (unique violation on email) | `DUPLICATE_EMAIL` | "This email address is already registered." |
| 23505 (unique violation on phone) | `DUPLICATE_PHONE` | "This phone number is already registered." |
| 23514 (check constraint on id_number) | `INVALID_ID_NUMBER_FORMAT` | "ID number must be exactly 8 digits." |
| 23514 (check constraint on phone) | `INVALID_PHONE_FORMAT` | "Invalid phone number format." |
| 23503 (foreign key violation) | `INVALID_REFERENCE` | "Referenced record does not exist." |
| 23502 (not null violation) | `MISSING_REQUIRED_FIELD` | "A required field is missing." |

## Integration Checklist

When integrating `db-utils.ts` into an Edge Function:

- [ ] Import `safeInsert`, `safeUpdate`, or `safeUpsert` from `../shared/db-utils.ts`
- [ ] Replace raw `.insert()`, `.update()`, or `.upsert()` calls with safe versions
- [ ] Check `result.error` instead of destructuring `error` directly
- [ ] Use `formatDbErrorResponse(error)` for HTTP error responses
- [ ] Log errors with appropriate context
- [ ] Return appropriate HTTP status codes (409 for duplicates, 400 for validation, 500 for unexpected)
- [ ] Consider retry logic for retryable errors using `isRetryableDbError(error)`

## Benefits

1. **User-Friendly Messages**: Instead of raw PostgreSQL errors, users see clear messages
2. **Consistent Error Handling**: Same error handling pattern across all Edge Functions
3. **Detailed Logging**: Errors are logged with full context for debugging
4. **Security**: No sensitive database details exposed to users
5. **Maintainability**: Centralized error handling logic

## Examples in Codebase

See these Edge Functions for integration examples:
- `create-vendor-from-payment/index.ts` (profiles and vendors creation)
- `validate-vendor-registration/index.ts` (duplicate checks)

## Testing

Test with various constraint violations:
```typescript
// Test duplicate ID number
await safeInsert(supabase, 'profiles', { id_number: '12345678', ... })
await safeInsert(supabase, 'profiles', { id_number: '12345678', ... }) // Should return DUPLICATE_ID_NUMBER

// Test invalid ID number format
await safeInsert(supabase, 'profiles', { id_number: '1234567', ... }) // Should return INVALID_ID_NUMBER_FORMAT

// Test missing required field
await safeInsert(supabase, 'profiles', { email: null, ... }) // Should return MISSING_REQUIRED_FIELD
```
