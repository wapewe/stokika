/**
 * Rate Limiter for Supabase Edge Functions
 * 
 * Implements IP-based rate limiting using PostgreSQL as storage.
 * Protects against brute force attacks and API abuse.
 * 
 * Features:
 * - IP-based tracking (handles proxies via X-Forwarded-For)
 * - Configurable limits and time windows
 * - Automatic cleanup of expired entries
 * - Returns 429 with Retry-After header when limit exceeded
 * 
 * Requirements: Task 6.1
 * - 5 attempts per hour per IP for vendor registration
 * - Returns 429 status code
 * - Logs rate limit violations
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /** Maximum number of requests allowed */
  maxRequests: number;
  /** Time window in seconds */
  windowSeconds: number;
  /** Namespace to isolate different rate limits */
  namespace: string;
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Current request count */
  currentCount: number;
  /** Maximum allowed requests */
  limit: number;
  /** Remaining requests */
  remaining: number;
  /** Unix timestamp when the limit resets */
  resetAt: number;
  /** Seconds until the limit resets */
  retryAfter?: number;
}

/**
 * Extract client IP address from request
 * Handles proxies and load balancers
 */
function getClientIP(req: Request): string {
  // Check for proxy headers (in order of preference)
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  const cfConnectingIP = req.headers.get('cf-connecting-ip'); // Cloudflare
  
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  // Fallback (should not happen in production)
  return 'unknown';
}

/**
 * Generate rate limit key
 */
function getRateLimitKey(ip: string, namespace: string): string {
  return `${namespace}:${ip}`;
}

/**
 * Check rate limit using PostgreSQL
 * 
 * Uses a dedicated rate_limits table in PostgreSQL to track requests.
 * This approach works well for Supabase without requiring Deno KV.
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  req: Request,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const ip = getClientIP(req);
  const key = getRateLimitKey(ip, config.namespace);
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowSeconds * 1000);
  
  try {
    // Count requests in the current time window
    const { count, error: countError } = await supabase
      .from('rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('key', key)
      .gte('created_at', windowStart.toISOString());
    
    if (countError) {
      console.error('[Rate Limiter] Error counting requests:', countError);
      // Fail open (allow request) if database has issues
      return {
        allowed: true,
        currentCount: 0,
        limit: config.maxRequests,
        remaining: config.maxRequests,
        resetAt: Math.floor((now.getTime() + config.windowSeconds * 1000) / 1000)
      };
    }
    
    const currentCount = count || 0;
    
    // Check if limit exceeded
    if (currentCount >= config.maxRequests) {
      // Find oldest request in window to calculate reset time
      const { data: oldestRequest } = await supabase
        .from('rate_limits')
        .select('created_at')
        .eq('key', key)
        .gte('created_at', windowStart.toISOString())
        .order('created_at', { ascending: true })
        .limit(1)
        .single();
      
      const oldestTime = oldestRequest 
        ? new Date(oldestRequest.created_at).getTime()
        : now.getTime();
      
      const resetAt = Math.floor((oldestTime + config.windowSeconds * 1000) / 1000);
      const retryAfter = Math.ceil((resetAt * 1000 - now.getTime()) / 1000);
      
      // Log rate limit violation
      await logRateLimitViolation(supabase, ip, config.namespace, currentCount, config.maxRequests);
      
      return {
        allowed: false,
        currentCount,
        limit: config.maxRequests,
        remaining: 0,
        resetAt,
        retryAfter
      };
    }
    
    // Record this request
    const { error: insertError } = await supabase
      .from('rate_limits')
      .insert({
        key,
        ip_address: ip,
        namespace: config.namespace,
        created_at: now.toISOString()
      });
    
    if (insertError) {
      console.error('[Rate Limiter] Error recording request:', insertError);
    }
    
    // Clean up old entries (async, don'\''t wait)
    cleanupExpiredEntries(supabase, config.windowSeconds).catch(err => {
      console.error('[Rate Limiter] Cleanup error:', err);
    });
    
    const remaining = config.maxRequests - currentCount - 1;
    const resetAt = Math.floor((now.getTime() + config.windowSeconds * 1000) / 1000);
    
    return {
      allowed: true,
      currentCount: currentCount + 1,
      limit: config.maxRequests,
      remaining: Math.max(0, remaining),
      resetAt
    };
    
  } catch (error) {
    console.error('[Rate Limiter] Unexpected error:', error);
    // Fail open (allow request) on unexpected errors
    return {
      allowed: true,
      currentCount: 0,
      limit: config.maxRequests,
      remaining: config.maxRequests,
      resetAt: Math.floor((now.getTime() + config.windowSeconds * 1000) / 1000)
    };
  }
}

/**
 * Log rate limit violation to audit_logs
 */
async function logRateLimitViolation(
  supabase: SupabaseClient,
  ip: string,
  namespace: string,
  currentCount: number,
  maxAllowed: number
): Promise<void> {
  try {
    await supabase
      .from('audit_logs')
      .insert({
        action: 'rate_limit_exceeded',
        resource_type: 'rate_limit',
        resource_id: null,
        details: {
          namespace,
          ip_address: ip,
          current_count: currentCount,
          max_allowed: maxAllowed,
          timestamp: new Date().toISOString()
        }
      });
  } catch (error) {
    console.error('[Rate Limiter] Error logging violation:', error);
  }
}

/**
 * Clean up expired rate limit entries
 * Run periodically to prevent table bloat
 */
async function cleanupExpiredEntries(
  supabase: SupabaseClient,
  windowSeconds: number
): Promise<void> {
  const cutoffTime = new Date(Date.now() - windowSeconds * 1000 * 2); // 2x window for safety
  
  await supabase
    .from('rate_limits')
    .delete()
    .lt('created_at', cutoffTime.toISOString());
}

/**
 * Create rate limit response with appropriate headers
 */
export function createRateLimitResponse(result: RateLimitResult, message?: string): Response {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetAt.toString()
  };
  
  if (result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString();
  }
  
  const retryMinutes = result.retryAfter ? Math.ceil(result.retryAfter / 60) : 0;
  
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Rate limit exceeded',
      code: 'RATE_LIMIT_EXCEEDED',
      message: message || `Too many requests. Please try again in ${retryMinutes} minute${retryMinutes !== 1 ? 's' : ''}.`,
      limit: result.limit,
      remaining: result.remaining,
      resetAt: result.resetAt,
      retryAfter: result.retryAfter
    }),
    {
      status: 429,
      headers
    }
  );
}

/**
 * Preset rate limit configurations
 */
export const RateLimitPresets = {
  /** 5 attempts per hour - for sensitive operations like registration */
  VENDOR_REGISTRATION: {
    maxRequests: 5,
    windowSeconds: 3600, // 1 hour
    namespace: 'vendor_registration'
  },
  
  /** 3 attempts per 15 minutes - for authentication */
  AUTH_LOGIN: {
    maxRequests: 3,
    windowSeconds: 900, // 15 minutes
    namespace: 'auth_login'
  },
  
  /** 10 attempts per minute - for payment callbacks */
  PAYMENT_CALLBACK: {
    maxRequests: 10,
    windowSeconds: 60,
    namespace: 'payment_callback'
  },
  
  /** 100 requests per minute - for general API endpoints */
  API_GENERAL: {
    maxRequests: 100,
    windowSeconds: 60,
    namespace: 'api_general'
  }
};