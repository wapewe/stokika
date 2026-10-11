/**
 * Get Registration Fee Edge Function
 * 
 * Returns the current vendor registration fee from the database.
 * This endpoint is public (no authentication required) but rate-limited
 * to prevent abuse.
 * 
 * Requirements:
 * - 2.1: Fetch fee when registration form loads
 * - 4.1: Query PostgreSQL function get_registration_fee()
 * - 4.2: Return JSON response with structure {"fee": 1050.00, "currency": "KES"}
 * - 4.3: Rate limiting of 20 requests per minute per IP
 * - 4.4: No parameters accepted (fee is fixed server-side)
 * - 4.5: Return HTTP 200 with fee or HTTP 500 with error message
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

/**
 * Rate limiter using Deno KV for in-memory storage
 */
class RateLimiter {
  private readonly limit: number = 20; // 20 requests per minute
  private readonly windowMs: number = 60 * 1000; // 1 minute window
  
  /**
   * Check if IP address has exceeded rate limit
   */
  async isRateLimited(ip: string): Promise<{ limited: boolean; retryAfter?: number }> {
    try {
      const kv = await Deno.openKv();
      const key = ['ratelimit', 'get-registration-fee', ip];
      const now = Date.now();
      
      // Get current count and timestamp
      const entry = await kv.get<{ count: number; firstRequest: number }>(key);
      
      if (!entry.value) {
        // First request in window
        await kv.set(key, { count: 1, firstRequest: now }, { expireIn: this.windowMs });
        kv.close();
        return { limited: false };
      }
      
      const { count, firstRequest } = entry.value;
      const windowEnd = firstRequest + this.windowMs;
      
      // Check if window has expired
      if (now >= windowEnd) {
        // Reset window
        await kv.set(key, { count: 1, firstRequest: now }, { expireIn: this.windowMs });
        kv.close();
        return { limited: false };
      }
      
      // Check if limit exceeded
      if (count >= this.limit) {
        const retryAfter = Math.ceil((windowEnd - now) / 1000); // seconds
        kv.close();
        return { limited: true, retryAfter };
      }
      
      // Increment counter
      await kv.set(key, { count: count + 1, firstRequest }, { expireIn: this.windowMs });
      kv.close();
      return { limited: false };
      
    } catch (error) {
      console.error('[Rate Limiter] Error:', error);
      // On error, allow request (fail open for better UX)
      return { limited: false };
    }
  }
}

/**
 * Response interface
 */
interface RegistrationFeeResponse {
  fee: number;
  currency: string;
}

interface ErrorResponse {
  error: string;
}

/**
 * Main Edge Function handler
 */
serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }
  
  // Only allow GET requests
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' } as ErrorResponse),
      {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
  
  try {
    // Extract IP address for rate limiting
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
               req.headers.get('x-real-ip') || 
               'unknown';
    
    console.log(`[Get Registration Fee] Request from IP: ${ip}`);
    
    // Check rate limit
    const rateLimiter = new RateLimiter();
    const { limited, retryAfter } = await rateLimiter.isRateLimited(ip);
    
    if (limited) {
      console.log(`[Get Registration Fee] Rate limit exceeded for IP: ${ip}`);
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded' } as ErrorResponse),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Retry-After': retryAfter?.toString() || '60'
          }
        }
      );
    }
    
    // Initialize Supabase client with Service Role Key
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Get Registration Fee] Missing environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' } as ErrorResponse),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Call the get_registration_fee() database function
    const { data, error } = await supabase.rpc('get_registration_fee');
    
    if (error) {
      console.error('[Get Registration Fee] Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch registration fee' } as ErrorResponse),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }
    
    // Convert to number and validate
    const fee = typeof data === 'number' ? data : parseFloat(data);
    
    if (isNaN(fee) || fee <= 0) {
      console.error('[Get Registration Fee] Invalid fee value:', data);
      return new Response(
        JSON.stringify({ error: 'Invalid fee configuration' } as ErrorResponse),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }
    
    console.log(`[Get Registration Fee] Successfully retrieved fee: KES ${fee}`);
    
    // Return fee with currency
    const response: RegistrationFeeResponse = {
      fee: fee,
      currency: 'KES'
    };
    
    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
        }
      }
    );
    
  } catch (error) {
    console.error('[Get Registration Fee] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' } as ErrorResponse),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
});
