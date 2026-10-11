# Task 15: Security Enhancements - Deployment Checklist

## Pre-Deployment Verification

### 1. Files Created ✅

- [x] `shared/id-number-security.ts` - ID number security utilities
- [x] `shared/enhanced-rate-limiter.ts` - Rate limiting module
- [x] `shared/SECURITY-ENHANCEMENTS-README.md` - Complete documentation
- [x] `shared/TASK-15-IMPLEMENTATION-SUMMARY.md` - Implementation summary
- [x] `shared/ID-NUMBER-SECURITY-QUICK-REFERENCE.md` - Quick reference
- [x] `shared/TASK-15-DEPLOYMENT-CHECKLIST.md` - This checklist

### 2. Edge Functions Updated ✅

- [x] `validate-vendor-registration/index.ts` - Added security imports and rate limiting
- [x] `create-vendor-registration-payment/index.ts` - Added security imports and rate limiting
- [x] `create-vendor-from-payment/index.ts` - Added security imports

### 3. Code Quality ✅

- [x] No TypeScript compilation errors
- [x] All imports correctly referenced
- [x] No duplicate function definitions
- [x] Consistent error handling
- [x] Proper async/await usage

## Deployment Steps

### Step 1: Environment Configuration (Optional but Recommended)

```bash
# Generate a secure salt for ID number hashing
openssl rand -base64 32

# Set in Supabase
supabase secrets set ID_NUMBER_HASH_SALT="<your-generated-salt>"

# Verify it was set
supabase secrets list | grep ID_NUMBER_HASH_SALT
```

**Note:** The system works without this, but adding a salt increases security.

### Step 2: Deploy Shared Modules

The shared modules will be automatically included when edge functions are deployed (Deno imports them at runtime).

No separate deployment needed - they're just TypeScript files that will be bundled.

### Step 3: Deploy Updated Edge Functions

```bash
# Deploy validate-vendor-registration
supabase functions deploy validate-vendor-registration

# Deploy create-vendor-registration-payment
supabase functions deploy create-vendor-registration-payment

# Deploy create-vendor-from-payment
supabase functions deploy create-vendor-from-payment
```

### Step 4: Verify Deployment

```bash
# Check function logs
supabase functions logs validate-vendor-registration --tail
supabase functions logs create-vendor-registration-payment --tail
supabase functions logs create-vendor-from-payment --tail
```

## Post-Deployment Testing

### Test 1: ID Number Sanitization

```bash
# Test with valid ID
curl -X POST https://your-project.supabase.co/functions/v1/validate-vendor-registration \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{
    "fullName": "Test User",
    "businessName": "Test Business",
    "email": "test@example.com",
    "phone": "254712345678",
    "idNumber": "12345678",
    "county": "Nairobi",
    "businessCategory": "Retail",
    "businessStatus": "Registered",
    "businessSize": "Small",
    "businessModel": "B2C",
    "yearsInOperation": "1-3",
    "monthlyRevenue": "50000-100000",
    "stockCategories": "Food",
    "stockValue": "10000-50000",
    "repaymentPeriod": "30"
  }'

# Expected: Success with validation token

# Test with formatted ID (should still work)
curl -X POST ... -d '{"idNumber": "12-34-56-78", ...}'
# Expected: Success (sanitized to 12345678)

# Test with invalid ID
curl -X POST ... -d '{"idNumber": "1234567", ...}'
# Expected: Error "ID Number must be exactly 8 digits"
```

### Test 2: Rate Limiting - Validation Endpoint

```bash
# Send 6 requests quickly (limit is 5 per 15 min)
for i in {1..6}; do
  echo "Request $i:"
  curl -X POST https://your-project.supabase.co/functions/v1/validate-vendor-registration \
    -H "Content-Type: application/json" \
    -H "apikey: YOUR_ANON_KEY" \
    -d '{...}' \
    -w "\nHTTP Status: %{http_code}\n\n"
  sleep 1
done

# Expected:
# Requests 1-5: HTTP 200
# Request 6: HTTP 429 with Retry-After header
```

### Test 3: Rate Limiting - Payment Creation

```bash
# Get auth token first
TOKEN="your-jwt-token"

# Send 4 payment requests (limit is 3 per hour)
for i in {1..4}; do
  echo "Payment request $i:"
  curl -X POST https://your-project.supabase.co/functions/v1/create-vendor-registration-payment \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
      "validationToken": "...",
      "phoneNumber": "254712345678",
      "paymentMethod": "stkpush"
    }' \
    -w "\nHTTP Status: %{http_code}\n\n"
  sleep 1
done

# Expected:
# Requests 1-3: HTTP 200
# Request 4: HTTP 429 with Retry-After header
```

### Test 4: ID Number Hashing in Logs

```sql
-- Check that ID numbers are hashed in payment_events
SELECT 
  event_type,
  event_data->>'id_number_hash' as id_hash,
  event_data->>'id_number' as raw_id,  -- Should be NULL or empty
  occurred_at
FROM payment_events
WHERE event_type IN ('DUPLICATE_ID_ATTEMPT', 'VENDOR_REGISTERED')
ORDER BY occurred_at DESC
LIMIT 10;

-- Verify: id_hash should be populated, raw_id should NOT exist
```

### Test 5: Duplicate ID Detection

```bash
# Register vendor with ID 12345678
curl -X POST .../validate-vendor-registration -d '{"idNumber": "12345678", ...}'
# Complete registration...

# Try to register again with same ID
curl -X POST .../validate-vendor-registration -d '{"idNumber": "12345678", ...}'

# Expected: Error "ID Number already registered"

# Check security event was logged
```

```sql
SELECT 
  event_type,
  event_data
FROM payment_events
WHERE event_type = 'DUPLICATE_ID_ATTEMPT'
ORDER BY occurred_at DESC
LIMIT 5;
```

## Monitoring Setup

### 1. Create Dashboard Queries

```sql
-- Rate limit violations (last 24 hours)
SELECT 
  action,
  details->>'namespace' as endpoint,
  details->>'ip_address' as ip,
  COUNT(*) as violation_count,
  MAX(created_at) as last_violation
FROM audit_logs
WHERE action = 'rate_limit_exceeded'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY action, details->>'namespace', details->>'ip_address'
ORDER BY violation_count DESC;

-- Duplicate ID attempts (last 7 days)
SELECT 
  DATE(occurred_at) as date,
  event_data->>'entity_type' as entity_type,
  COUNT(*) as attempts
FROM payment_events
WHERE event_type = 'DUPLICATE_ID_ATTEMPT'
  AND occurred_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(occurred_at), event_data->>'entity_type'
ORDER BY date DESC;

-- Security events summary
SELECT 
  event_type,
  COUNT(*) as count,
  MAX(occurred_at) as last_occurrence
FROM payment_events
WHERE event_type IN (
  'DUPLICATE_ID_ATTEMPT',
  'VENDOR_REGISTERED',
  'PAYMENT_MATCHED',
  'PAYMENT_UNMATCHED'
)
GROUP BY event_type
ORDER BY count DESC;
```

### 2. Set Up Alerts

Configure alerts for:

- **High rate limit violations:** > 100 per hour
- **High duplicate ID attempts:** > 10 per hour  
- **SQL injection detected:** Any occurrence
- **Rate limiting system errors:** Any occurrence

### 3. Log Monitoring

Watch edge function logs for:

```
[Security] Rate limit exceeded
[Security] Logged duplicate ID attempt
[Security] ID number event logged
[Rate Limit] Error checking rate limit
```

## Rollback Plan

If issues are detected:

### Option 1: Quick Fix (Update Specific Function)

```bash
# Revert specific function to previous version
git checkout HEAD~1 -- supabase/functions/validate-vendor-registration/index.ts
supabase functions deploy validate-vendor-registration
```

### Option 2: Full Rollback

```bash
# Revert all three functions
git checkout HEAD~1 -- supabase/functions/validate-vendor-registration/
git checkout HEAD~1 -- supabase/functions/create-vendor-registration-payment/
git checkout HEAD~1 -- supabase/functions/create-vendor-from-payment/

# Deploy reverted versions
supabase functions deploy validate-vendor-registration
supabase functions deploy create-vendor-registration-payment
supabase functions deploy create-vendor-from-payment
```

**Note:** Security modules can stay in place - they're harmless unless imported.

## Success Criteria

✅ **All tests passing:**
- ID number sanitization working
- Rate limiting enforcing limits
- Hashing applied to all logs
- No raw ID numbers in logs
- Duplicate detection working

✅ **Performance:**
- Response times < 500ms
- No timeout errors
- Rate limiting not affecting legitimate users

✅ **Security:**
- No SQL injection vulnerabilities
- PII protected in logs
- Audit trail complete
- Rate limits preventing abuse

✅ **Monitoring:**
- Logs showing expected events
- Dashboards populated
- Alerts configured
- No unexpected errors

## Common Issues and Solutions

### Issue: "Cannot find module '../shared/id-number-security.ts'"

**Solution:** Ensure shared modules are in correct location and paths are correct. Deno imports are case-sensitive.

```bash
# Verify file exists
ls -la supabase/functions/shared/id-number-security.ts
```

### Issue: Rate limiting not working

**Solution:** Check Deno KV is available:

```typescript
// In edge function
try {
  const kv = await Deno.openKv();
  console.log('Deno KV available');
} catch (error) {
  console.error('Deno KV not available:', error);
}
```

### Issue: Hashes don't match between deploys

**Solution:** Ensure `ID_NUMBER_HASH_SALT` environment variable is consistent:

```bash
# Check current value
supabase secrets list | grep ID_NUMBER_HASH_SALT

# If different, set to same value in all environments
supabase secrets set ID_NUMBER_HASH_SALT="same-value-everywhere"
```

### Issue: Too many rate limit violations

**Solution:** Adjust limits if needed:

```typescript
// In enhanced-rate-limiter.ts
export const VendorRegistrationRateLimits = {
  VALIDATION: {
    maxRequests: 10,  // Increase from 5
    windowMs: 15 * 60 * 1000,
    namespace: 'vendor-validation'
  }
};
```

Then redeploy affected functions.

## Documentation

Reference materials for support:

- **Quick Reference:** `ID-NUMBER-SECURITY-QUICK-REFERENCE.md`
- **Full Documentation:** `SECURITY-ENHANCEMENTS-README.md`
- **Implementation Details:** `TASK-15-IMPLEMENTATION-SUMMARY.md`
- **Source Code:** `id-number-security.ts`, `enhanced-rate-limiter.ts`

## Support

For issues:

1. Check edge function logs in Supabase dashboard
2. Query audit_logs and payment_events tables
3. Review this checklist
4. Consult documentation files
5. Contact system administrator if needed

---

## Sign-Off

- [ ] Pre-deployment verification complete
- [ ] Environment configured (salt set)
- [ ] Edge functions deployed successfully
- [ ] All tests passed
- [ ] Monitoring configured
- [ ] Team notified
- [ ] Documentation reviewed

**Deployment Date:** _________________  
**Deployed By:** _________________  
**Production URL:** _________________  
**Status:** ⬜ Pending  |  ⬜ In Progress  |  ⬜ Complete  |  ⬜ Issues

---

**Ready for deployment!** 🚀
