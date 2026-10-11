# M-Pesa STK Push Edge Function

This Supabase Edge Function initiates M-Pesa STK Push payments for the Stokika platform. It handles kit registration payments for field agents and supervisors with comprehensive security controls.

## Features

### ✅ Request Validation (Subtask 4.1)
- Phone number format validation (254XXXXXXXXX)
- Amount validation based on user type (2500 for field_agent, 3500 for supervisor)
- Application code validation
- Comprehensive error messages for validation failures

### ✅ Rate Limiting (Subtask 4.2)
- **User rate limit**: 3 requests per 10 minutes
- **Phone rate limit**: 5 requests per hour across all users
- **Amount validation**: 100-100,000 KES range
- Returns `429 Too Many Requests` with `Retry-After` header when limits exceeded

### ✅ Payment Record Management (Subtask 4.3)
- Creates payment record with status 'pending'
- Generates unique reference code: `STOKIKA_{applicationCode}_{timestamp}`
- Stores phone number, amount, user type, and application code
- Graceful error handling for database operations

### ✅ STK Push Password Generation (Subtask 4.4)
- Generates timestamp in format: YYYYMMDDHHmmss
- Concatenates: shortcode + passkey + timestamp
- Base64 encoding for M-Pesa API authentication

### ✅ M-Pesa API Integration (Subtask 4.5)
- OAuth token retrieval via `getValidToken()`
- Environment-aware API URL selection (sandbox/production)
- Complete M-Pesa request payload construction
- Automatic callback URL configuration
- Retry logic with exponential backoff (3 attempts: 1s, 2s, 4s)
- Handles 429 rate limits with retry-after headers
- User-friendly error message mapping

### ✅ Response Handling (Subtask 4.6)
- Extracts CheckoutRequestID and MerchantRequestID
- Updates payment record with M-Pesa response
- Returns success response with tracking IDs
- Updates status to 'failed' with error reason on failures

## API Specification

### Endpoint
```
POST /functions/v1/mpesa-stk-push
```

### Request Body
```typescript
{
  phoneNumber: string;      // Format: 254XXXXXXXXX
  amount: number;           // 2500 or 3500 based on userType
  applicationCode: string;  // User application code
  userType: 'field_agent' | 'supervisor';
  accountReference?: string; // Optional, defaults to generated reference
}
```

### Success Response (200)
```typescript
{
  success: true,
  checkoutRequestId: string,
  merchantRequestId: string,
  responseCode: string,
  responseDescription: string,
  customerMessage: string
}
```

### Error Responses

#### Validation Error (400)
```typescript
{
  success: false,
  error: string  // Specific validation error message
}
```

#### Rate Limit Exceeded (429)
```typescript
{
  success: false,
  error: string,
  retryAfter: number  // Seconds to wait before retry
}
```

#### Server Error (500)
```typescript
{
  success: false,
  error: string  // User-friendly error message
}
```

## Environment Variables

Required environment variables (configured in Supabase):

```bash
# M-Pesa Credentials
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_SHORTCODE=174379
MPESA_PASSKEY=your_passkey
MPESA_ENVIRONMENT=sandbox  # or 'production'

# Callback Configuration
MPESA_CALLBACK_URL=https://your-project.supabase.co/functions/v1/mpesa-callback

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Database Schema Requirements

### stokika_kit_payments
```sql
CREATE TABLE stokika_kit_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_code VARCHAR(20) NOT NULL,
  phone_number VARCHAR(15) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  user_type VARCHAR(20) NOT NULL,
  payment_status VARCHAR(30) NOT NULL DEFAULT 'pending',
  payment_method VARCHAR(20) DEFAULT 'mpesa_stk',
  checkout_request_id VARCHAR(100) UNIQUE,
  merchant_request_id VARCHAR(100),
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### payment_attempts
```sql
CREATE TABLE payment_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  identifier VARCHAR(100) NOT NULL,
  limit_type VARCHAR(20) NOT NULL,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Error Handling

### Retryable Errors
- HTTP 500/503 (Server errors)
- HTTP 429 (Rate limiting)
- Network timeouts
- Connection failures

**Strategy**: 3 retry attempts with exponential backoff (1s, 2s, 4s)

### Non-Retryable Errors
- HTTP 400 (Bad request)
- HTTP 401/403 (Authentication/authorization)
- Invalid credentials
- Validation failures

**Strategy**: Return error immediately to client

### User-Friendly Error Messages
The function maps technical M-Pesa errors to user-friendly messages:
- Insufficient balance → "Insufficient balance in M-Pesa account. Please top up and try again."
- Invalid phone → "Invalid phone number. Please check and try again."
- Timeout → "Payment request timed out. Please try again."
- Cancelled → "Payment was cancelled. Please try again when ready."
- Service unavailable → "M-Pesa service temporarily unavailable. Please try again in a few minutes."

## Security Features

1. **Credential Protection**: M-Pesa credentials stored in environment variables, never exposed to client
2. **Rate Limiting**: Multi-level rate limiting prevents abuse
3. **Input Validation**: Comprehensive validation of all user inputs
4. **Phone Masking**: Phone numbers masked in logs (254XXX***678)
5. **Amount Validation**: Strict amount validation based on user type
6. **Service Role Auth**: Uses Supabase service role key for database access

## Testing

### Sandbox Testing
Use M-Pesa sandbox credentials and test phone numbers:
- **Test phone**: 254708374149 (auto-completes)
- **Environment**: Set `MPESA_ENVIRONMENT=sandbox`

### Example cURL Request
```bash
curl -X POST https://your-project.supabase.co/functions/v1/mpesa-stk-push \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "phoneNumber": "254712345678",
    "amount": 2500,
    "applicationCode": "FA001",
    "userType": "field_agent"
  }'
```

## Implementation Requirements Met

- ✅ **Requirement 2.1**: Phone number validation (254XXXXXXXXX format)
- ✅ **Requirement 2.2**: Amount validation (2500/3500 based on user type)
- ✅ **Requirement 2.3**: Payment record creation with status 'pending'
- ✅ **Requirement 2.4**: Unique reference code generation
- ✅ **Requirement 2.5**: STK Push password generation and API call
- ✅ **Requirement 2.6**: Store CheckoutRequestID and MerchantRequestID
- ✅ **Requirement 2.7**: Return checkoutRequestId to client
- ✅ **Requirement 2.8**: Update status to 'failed' on errors
- ✅ **Requirement 3.4**: User rate limiting (3 per 10 minutes)
- ✅ **Requirement 11.1**: User rate limiting enforcement
- ✅ **Requirement 11.2**: Phone rate limiting (5 per hour)
- ✅ **Requirement 11.3**: Amount range validation (100-100000)
- ✅ **Requirement 24.1**: Retry logic with exponential backoff
- ✅ **Requirement 24.2**: Handle M-Pesa API rate limits
- ✅ **Requirement 24.4**: Distinguish retryable vs non-retryable errors

## Dependencies

- `@supabase/supabase-js@2.39.3` - Supabase client
- `../shared/mpesa-auth.ts` - OAuth token management
- `../shared/rate-limiter.ts` - Rate limiting logic

## Deployment

Deploy to Supabase:
```bash
supabase functions deploy mpesa-stk-push
```

Set environment variables:
```bash
supabase secrets set MPESA_CONSUMER_KEY=xxx
supabase secrets set MPESA_CONSUMER_SECRET=xxx
supabase secrets set MPESA_SHORTCODE=xxx
supabase secrets set MPESA_PASSKEY=xxx
supabase secrets set MPESA_ENVIRONMENT=sandbox
```

## Monitoring

The function logs all operations with structured logging:
- Request validation results
- Rate limit checks
- M-Pesa API calls and responses
- Payment record updates
- Error details

Monitor logs in Supabase dashboard:
```bash
supabase functions logs mpesa-stk-push
```

## Next Steps

After implementing this function:
1. ✅ Test in sandbox with test phone numbers
2. ⏭️ Implement callback handler (Task 6)
3. ⏭️ Implement status query fallback (Task 7)
4. ⏭️ Create client-side integration library (Task 9)
5. ⏭️ Update UI for M-Pesa payments (Task 10)
