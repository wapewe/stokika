/**
 * Simple test for rate limiting functionality
 * Run with: deno run --allow-net --allow-env --unstable test-rate-limit.ts
 */

const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const TEST_USER_TOKEN = 'YOUR_TEST_USER_JWT';

async function testRateLimit() {
  console.log('Testing Payment Status Rate Limiting...\n');
  
  const url = `${SUPABASE_URL}/functions/v1/payment-status`;
  const testPaymentId = 'test-payment-intent-id';
  
  let successCount = 0;
  let rateLimitedCount = 0;
  
  // Make 25 requests (limit is 20, so last 5 should be rate limited)
  for (let i = 1; i <= 25; i++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paymentIntentId: testPaymentId
        })
      });
      
      const rateLimitInfo = {
        limit: response.headers.get('X-RateLimit-Limit'),
        remaining: response.headers.get('X-RateLimit-Remaining'),
        reset: response.headers.get('X-RateLimit-Reset')
      };
      
      if (response.status === 429) {
        rateLimitedCount++;
        const retryAfter = response.headers.get('Retry-After');
        console.log(`Request ${i}: ❌ Rate Limited (429) - Retry after ${retryAfter}s`);
      } else if (response.status === 404) {
        // Expected for test payment ID
        successCount++;
        console.log(`Request ${i}: ✅ Success (${response.status}) - Remaining: ${rateLimitInfo.remaining}`);
      } else {
        successCount++;
        console.log(`Request ${i}: ✅ Success (${response.status}) - Remaining: ${rateLimitInfo.remaining}`);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`Request ${i}: ❌ Error:`, error);
    }
  }
  
  console.log('\n--- Test Results ---');
  console.log(`Total Requests: 25`);
  console.log(`Successful: ${successCount}`);
  console.log(`Rate Limited: ${rateLimitedCount}`);
  console.log(`Expected: 20 successful, 5 rate limited`);
  
  if (successCount === 20 && rateLimitedCount === 5) {
    console.log('\n✅ Rate limiting test PASSED!');
  } else {
    console.log('\n❌ Rate limiting test FAILED!');
  }
}

// Run test
testRateLimit().catch(console.error);
