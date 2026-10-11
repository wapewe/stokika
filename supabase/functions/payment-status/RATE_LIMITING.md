# Payment Status Rate Limiting

## Overview

The payment-status Edge Function implements per-user rate limiting to prevent abuse and ensure fair resource usage. This document explains the implementation and usage.

## Configuration

- **Rate Limit**: 20 requests per minute per user
- **Window Type**: Sliding window (1 minute)
- **Storage**: Deno KV (key-value store)

## Implementation Details

### Sliding Window Algorithm

The rate limiter uses a sliding window approach that tracks individual request timestamps:

1. **Key Structure**: `['rate_limit', 'payment_status', userId]`
2. **Value Structure**: 
   ```typescript
   {
     requests: number[],  // Array of request timestamps
     lastReset: number    // Last window reset timestamp
   }
   ```

3. **Window Calculation**:
   - Current window = Last 60 seconds from now
   - Expired requests (older than 60s) are filtered out
   - New requests are added to the array

4. **TTL**: KV entries expire automatically after 60 seconds

### Rate Limit Headers

All responses include standard rate limit headers:

```
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 15
X-RateLimit-Reset: 1705444800
```

- **X-RateLimit-Limit**: Maximum requests allowed in window
- **X-RateLimit-Remaining**: Requests remaining in current window
- **X-RateLimit-Reset**: Unix timestamp when the window resets

### 429 Response

When rate limit is exceeded, the API returns:

```json
{
  "success": false,
  "status": "FAILED",
  "message": "Too many requests. Please wait before trying again.",
  "error": "Rate limit exceeded",
  "retry_after": 45
}
```

HTTP Status: `429 Too Many Requests`

Headers include:
- All rate limit headers
- `Retry-After`: Seconds until rate limit resets

## Frontend Integration

### Recommended Polling Strategy

For payment status polling, implement exponential backoff:

```javascript
class PaymentStatusPoller {
  constructor(paymentIntentId) {
    this.paymentIntentId = paymentIntentId;
    this.pollInterval = 5000; // Start at 5 seconds
    this.maxInterval = 30000;  // Max 30 seconds
  }
  
  async poll() {
    try {
      const response = await fetch('/functions/v1/payment-status', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paymentIntentId: this.paymentIntentId
        })
      });
      
      // Check rate limit headers
      const remaining = parseInt(response.headers.get('X-RateLimit-Remaining') || '0');
      
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
        console.warn(`Rate limited. Retry after ${retryAfter}s`);
        
        // Wait for retry period
        await this.wait(retryAfter * 1000);
        return this.poll();
      }
      
      // Adjust polling interval based on remaining quota
      if (remaining < 5) {
        // Slow down polling when approaching limit
        this.pollInterval = Math.min(this.pollInterval * 1.5, this.maxInterval);
      }
      
      const data = await response.json();
      return data;
      
    } catch (error) {
      console.error('Polling error:', error);
      throw error;
    }
  }
  
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Best Practices

1. **Start Slow**: Begin with 5-10 second intervals
2. **Monitor Headers**: Check `X-RateLimit-Remaining` to adjust behavior
3. **Handle 429**: Respect `Retry-After` header
4. **Exponential Backoff**: Increase intervals if approaching limit
5. **Stop on Success**: Don't continue polling after payment confirmed

## Testing

A test script is provided in `test-rate-limit.ts`:

```bash
# Update SUPABASE_URL and TEST_USER_TOKEN in the file
deno run --allow-net --allow-env --unstable test-rate-limit.ts
```

Expected output:
- First 20 requests: Success (200 or 404)
- Last 5 requests: Rate Limited (429)

## Monitoring

### Admin Queries

Check rate limit usage:

```sql
-- Note: Deno KV data is not directly accessible via SQL
-- Use Supabase logs to monitor 429 responses
```

### Logs

Rate limit events are logged:

```
[Payment Status] Rate limit exceeded for user: {userId}
```

Monitor for patterns:
- Repeated 429s from same user = potential abuse
- High 429 rate globally = need to increase limit

## Adjusting Limits

To modify rate limits, update constants in `index.ts`:

```typescript
const RATE_LIMIT_WINDOW = 60; // Window in seconds
const RATE_LIMIT_MAX_REQUESTS = 20; // Max requests per window
```

Deploy changes:
```bash
supabase functions deploy payment-status
```

## Security Considerations

1. **Per-User Limiting**: Rate limits are per authenticated user, preventing one user from exhausting resources
2. **Sliding Window**: More accurate than fixed windows, prevents burst attacks at window boundaries
3. **Automatic Cleanup**: KV TTL ensures old data is cleaned up automatically
4. **DDoS Protection**: Works alongside Supabase's infrastructure-level DDoS protection

## Troubleshooting

### "Rate limit exceeded" but user hasn't made many requests

**Cause**: User might be polling too frequently or multiple tabs/devices are polling

**Solution**: 
- Check `pollInterval` in frontend code
- Ensure polling stops on success
- Consider using WebSockets for real-time updates instead

### Rate limit not working in development

**Cause**: Deno KV might not be available in local development

**Solution**:
- Test against deployed Edge Function
- Or run with `--unstable` flag: `supabase functions serve --unstable`

### Need higher limits for specific users

**Solution**: Implement tiered rate limiting based on user role/plan:

```typescript
async function checkRateLimit(userId: string, userRole: string) {
  const limits = {
    admin: 100,
    premium: 50,
    standard: 20
  };
  
  const maxRequests = limits[userRole] || 20;
  // ... rest of implementation
}
```
