# M-Pesa OAuth Token Management

This module provides secure OAuth token management for M-Pesa Daraja API integration, implementing intelligent caching, automatic refresh, and comprehensive error handling.

## Features

- **Token Caching**: In-memory caching to minimize authentication API calls
- **Automatic Refresh**: Proactive token refresh when within 60 seconds of expiration
- **Retry Logic**: Exponential backoff retry for transient failures (3 attempts: 1s, 2s, 4s)
- **Credential Validation**: Startup validation of all required environment variables
- **Environment Support**: Automatic sandbox/production endpoint selection

## Requirements Implemented

This module fulfills the following requirements from the secure-mpesa-integration spec:

- **1.1**: Retrieve M-Pesa credentials from secure environment variables
- **1.2**: Request OAuth token from M-Pesa API using consumer credentials
- **1.3**: Cache OAuth tokens with expiration timestamps
- **1.4**: Refresh tokens when within 60 seconds of expiration
- **1.5**: Retry failed authentication with exponential backoff (3 attempts)
- **9.2**: Validate that all required M-Pesa environment variables are present
- **20.5**: Cache OAuth tokens to minimize M-Pesa authentication API calls
- **24.1**: Retry HTTP 500/503 errors with exponential backoff

## Environment Variables

The following environment variables must be configured in your Supabase project:

| Variable | Description | Example |
|----------|-------------|---------|
| `MPESA_CONSUMER_KEY` | M-Pesa API consumer key | `xyz123abc456...` |
| `MPESA_CONSUMER_SECRET` | M-Pesa API consumer secret | `abc789xyz321...` |
| `MPESA_SHORTCODE` | M-Pesa business shortcode | `174379` |
| `MPESA_PASSKEY` | M-Pesa API passkey | `bfb279f9aa9b...` |
| `MPESA_ENVIRONMENT` | Environment mode (optional, defaults to `sandbox`) | `sandbox` or `production` |

### Setting Environment Variables in Supabase

```bash
# Using Supabase CLI
supabase secrets set MPESA_CONSUMER_KEY=your_key_here
supabase secrets set MPESA_CONSUMER_SECRET=your_secret_here
supabase secrets set MPESA_SHORTCODE=174379
supabase secrets set MPESA_PASSKEY=your_passkey_here
supabase secrets set MPESA_ENVIRONMENT=sandbox
```

## Usage

### Basic Usage

```typescript
import { getValidToken } from "./shared/mpesa-auth.ts";

// Get a valid OAuth token (cached or fresh)
const token = await getValidToken();

// Use token in M-Pesa API request
const response = await fetch("https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify(requestData)
});
```

### Credential Validation

```typescript
import { validateCredentials } from "./shared/mpesa-auth.ts";

// Validate credentials on function startup
try {
  validateCredentials();
  console.log("✅ M-Pesa credentials validated");
} catch (error) {
  console.error("❌ Credential validation failed:", error.message);
  // Return error response to client
}
```

### Integration in Edge Function

```typescript
// supabase/functions/mpesa-stk-push/index.ts
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { getValidToken, validateCredentials } from "../shared/mpesa-auth.ts";

serve(async (req) => {
  try {
    // Validate credentials on first request
    validateCredentials();
    
    // Get valid OAuth token
    const token = await getValidToken();
    
    // Use token for M-Pesa API call
    const mpesaResponse = await fetch(mpesaApiUrl, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    
    // Process response...
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
```

## API Reference

### `getValidToken(): Promise<string>`

Retrieves a valid OAuth token, using cache or requesting a new one.

**Returns**: `Promise<string>` - The valid OAuth access token

**Throws**: `Error` - If token request fails after all retry attempts

**Behavior**:
1. Checks if a cached token exists
2. Calculates time remaining until token expiry
3. Returns cached token if more than 60 seconds remain
4. Requests new token if cache is empty or token is expiring soon
5. Caches the new token with current timestamp

**Example**:
```typescript
const token = await getValidToken();
console.log(`Token obtained: ${token}`);
```

### `validateCredentials(): void`

Validates that all required M-Pesa credentials are present in environment.

**Throws**: `Error` - With descriptive message if validation fails

**Checks**:
- All required environment variables are set and non-empty
- `MPESA_ENVIRONMENT` is either `sandbox` or `production`

**Example**:
```typescript
try {
  validateCredentials();
  console.log("Credentials validated successfully");
} catch (error) {
  console.error("Validation failed:", error.message);
}
```

### `OAuthToken` Interface

Interface representing an M-Pesa OAuth token with caching metadata.

```typescript
interface OAuthToken {
  access_token: string;  // The OAuth bearer token
  expires_in: number;    // Token lifetime in seconds (typically 3600)
  cached_at: number;     // Timestamp when cached (milliseconds since epoch)
}
```

## Token Caching Strategy

The module implements intelligent token caching to minimize authentication requests:

1. **Cache Duration**: Tokens are cached for their full lifetime (typically 3600 seconds)
2. **Refresh Threshold**: Tokens are refreshed when within 60 seconds of expiration
3. **Cache Invalidation**: Cache is reset between Edge Function cold starts
4. **Thread Safety**: In-memory cache suitable for single-threaded serverless functions

### Token Lifecycle Diagram

```
Token Request
     │
     ├─→ Cache exists? ─No──→ Request new token ──→ Cache token ──→ Return token
     │                              │
     └─→ Yes                        │
          │                         │
          └─→ Expires in > 60s? ────┘
               │
               └─No─→ Request new token ──→ Cache token ──→ Return token
```

## Error Handling

### Retry Logic

The module implements exponential backoff retry for transient failures:

- **Attempt 1**: Immediate request
- **Attempt 2**: Wait 1 second, retry
- **Attempt 3**: Wait 2 seconds, retry
- **Attempt 4**: Wait 4 seconds, final retry

### Retryable Errors

- HTTP 500 (Internal Server Error)
- HTTP 503 (Service Unavailable)
- HTTP 429 (Too Many Requests)
- Network errors (timeout, connection refused, etc.)

### Non-Retryable Errors

- HTTP 400 (Bad Request) - Invalid credentials format
- HTTP 401 (Unauthorized) - Invalid credentials
- HTTP 403 (Forbidden) - Access denied

### Error Messages

All errors include descriptive messages for troubleshooting:

```typescript
// Missing credentials
Error: Missing required M-Pesa environment variables: MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET. 
       Please configure these in your Supabase project settings.

// Invalid environment
Error: Invalid MPESA_ENVIRONMENT value: "invalid". Must be either "sandbox" or "production".

// Authentication failure
Error: Failed to obtain M-Pesa OAuth token after 3 attempts: 
       M-Pesa OAuth failed: 401 Unauthorized - Invalid credentials
```

## Testing

### Unit Tests

Run the unit tests with Deno:

```bash
deno test supabase/functions/shared/mpesa-auth.test.ts --allow-env --allow-net
```

### Integration Tests

For integration testing with real M-Pesa sandbox:

1. Obtain sandbox credentials from [Safaricom Developer Portal](https://developer.safaricom.co.ke/)
2. Set environment variables with sandbox credentials
3. Run tests with `--allow-net` flag

### Test Coverage

The test suite covers:
- ✅ Credential validation with all variables present
- ✅ Missing credential detection
- ✅ Invalid environment value detection
- ✅ Multiple missing variables reporting
- ✅ Sandbox/production URL selection

## Security Considerations

### Credential Protection

- ✅ Credentials stored only in environment variables
- ✅ Never logged or exposed in responses
- ✅ Not accessible from client-side code
- ✅ Encrypted at rest in Supabase

### Token Security

- ✅ Tokens cached only in serverless function memory
- ✅ Cache cleared on cold start
- ✅ Tokens never exposed to clients
- ✅ Automatic expiration handling

### Logging

- ✅ Auth attempts logged with timestamps
- ✅ Credentials never logged (only validation status)
- ✅ Error details logged for troubleshooting
- ✅ Token expiry times logged (not token values)

## Performance Characteristics

- **Cold Start**: ~1-3 seconds (includes token request)
- **Warm Request**: ~10ms (cached token retrieval)
- **Token Request**: ~500-1000ms (M-Pesa API latency)
- **Memory Usage**: ~1KB per cached token

## Troubleshooting

### Error: "Missing required M-Pesa environment variables"

**Solution**: Configure all required environment variables in Supabase project settings.

```bash
supabase secrets set MPESA_CONSUMER_KEY=your_key
supabase secrets set MPESA_CONSUMER_SECRET=your_secret
supabase secrets set MPESA_SHORTCODE=174379
supabase secrets set MPESA_PASSKEY=your_passkey
```

### Error: "Invalid MPESA_ENVIRONMENT value"

**Solution**: Set `MPESA_ENVIRONMENT` to either `sandbox` or `production`.

```bash
supabase secrets set MPESA_ENVIRONMENT=sandbox
```

### Error: "Failed to obtain M-Pesa OAuth token after 3 attempts"

**Causes**:
1. Invalid consumer key/secret
2. M-Pesa API temporarily unavailable
3. Network connectivity issues
4. Incorrect environment (sandbox credentials used with production URL)

**Solutions**:
1. Verify credentials in Safaricom Developer Portal
2. Check M-Pesa API status
3. Retry request after a few minutes
4. Ensure `MPESA_ENVIRONMENT` matches your credentials

### Error: "M-Pesa OAuth failed: 401 Unauthorized"

**Solution**: Verify your consumer key and secret are correct and match the configured environment (sandbox/production).

## Changelog

### Version 1.0.0 (2025-01-12)

- ✅ Initial implementation
- ✅ Token caching with 60-second refresh threshold
- ✅ Exponential backoff retry (3 attempts)
- ✅ Credential validation on startup
- ✅ Sandbox/production environment support
- ✅ Comprehensive error handling and logging

## License

Part of the Stokika M-Pesa integration project.

## Related Documentation

- [M-Pesa Daraja API Documentation](https://developer.safaricom.co.ke/Documentation)
- [Supabase Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [Stokika M-Pesa Integration Spec](../../.kiro/specs/secure-mpesa-integration/design.md)
