/**
 * Enhanced Rate Limiter for Vendor Registration
 * 
 * This module implements specific rate limiting for vendor registration endpoints
 * as required by Task 15.3. It uses Deno KV for storage and provides different
 * limits for validation and payment creation endpoints.
 * 
 * Requirements:
 * - Task 15.3: 5 requests per 15 minutes per IP for validation endpoint
 * - Task 15.3: 3 requests per hour per user for payment creation endpoint
 * - Security section: Rate limiting to prevent abuse
 * 
 * @module enhanced-rate-limiter
 */

/**
 * Rate limit check result
 */
export interface RateLimitCheckResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Current request count in window */
  currentCount: number;
  /** Maximum allowed requests */
  limit: number;
  /** Remaining requests allowed */
  remaining: number;
  /** Unix timestamp when limit resets */
  resetAt: number;
  /** Seconds to wait before retrying */
  retryAfter?: number;
  /** User-friendly error message */
  message?: string;
}

/**
 * Rate limit configuration
 */
interface RateLimitConfig {
  /** Maximum number of requests allowed */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Namespace for the rate limit key */
  namespace: string;
}

/**
 * Rate limit presets for vendor registration
 */
export const VendorRegistrationRateLimits = {
  /**
   * Validation endpoint: 5 requests per 15 minutes per IP
   * Requirements: Task 15.3
   */
  VALIDATION: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    namespace: 'vendor-validation'
  } as RateLimitConfig,
  
  /**
   * Payment creation: 3 requests per hour per user
   * Requirements: Task 15.3
   */
  PAYMENT_CREATION: {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    namespace: 'vendor-payment-creation'
  } as RateLimitConfig
};

/**
 * Extract client IP address from request headers
 * 
 * Handles proxies and load balancers by checking multiple headers
 * in order of preference.
 * 
 * @param req - HTTP request
 * @returns Client IP address
 */
export function extractClientIP(req: Request): string {
  // Check for proxy headers (in order of preference)
  const cfConnectingIP = req.headers.get('cf-connecting-ip'); // Cloudflare
  const xForwardedFor = req.headers.get('x-forwarded-for');
  const xRealIP = req.headers.get('x-real-ip');
  
  if (cfConnectingIP) {
    return cfConnectingIP.trim();
  }
  
  if (xForwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one (original client)
    return xForwardedFor.split(',')[0].trim();
  }
  
  if (xRealIP) {
    return xRealIP.trim();
  }
  
  // Fallback
  return 'unknown';
}

/**
 * Check rate limit using Deno KV
 * 
 * This function checks if the identifier (IP or user ID) has exceeded
 * the rate limit for a specific configuration. It uses Deno KV for
 * storage with automatic expiration.
 * 
 * Requirements:
 * - Task 15.3: Verify rate limits using Deno KV
 * - Return 429 with Retry-After header when exceeded
 * 
 * @param identifier - IP address or user ID
 * @param config - Rate limit configuration
 * @returns Rate limit check result
 * 
 * @example
 * ```typescript
 * const result = await checkRateLimit(
 *   ipAddress,
 *   VendorRegistrationRateLimits.VALIDATION
 * );
 * 
 * if (!result.allowed) {
 *   return new Response(
 *     JSON.stringify({ error: result.message }),
 *     { 
 *       status: 429,
 *       headers: { 'Retry-After': result.retryAfter?.toString() || '900' }
 *     }
 *   );
 * }
 * ```
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitCheckResult> {
  try {
    const kv = await Deno.openKv();
    const key = ['ratelimit', config.namespace, identifier];
    const now = Date.now();
    
    // Get current rate limit state
    const result = await kv.get<{ count: number; resetAt: number }>(key);
    const current = result.value;
    
    // If no existing record or window expired, create new window
    if (!current || now > current.resetAt) {
      const resetAt = now + config.windowMs;
      
      await kv.set(
        key,
        { count: 1, resetAt },
        { expireIn: config.windowMs }
      );
      
      console.log(
        `[Rate Limit] New window created for ${config.namespace}:${identifier}: ` +
        `1/${config.maxRequests} requests`
      );
      
      return {
        allowed: true,
        currentCount: 1,
        limit: config.maxRequests,
        remaining: config.maxRequests - 1,
        resetAt: Math.floor(resetAt / 1000)
      };
    }
    
    // Check if limit exceeded
    if (current.count >= config.maxRequests) {
      const retryAfter = Math.ceil((current.resetAt - now) / 1000);
      const retryMinutes = Math.ceil(retryAfter / 60);
      
      console.warn(
        `[Rate Limit] Limit exceeded for ${config.namespace}:${identifier}: ` +
        `${current.count}/${config.maxRequests} requests, retry in ${retryAfter}s`
      );
      
      // Log rate limit violation to audit logs (optional - requires supabase client)
      // This would be done in the calling function with access to supabase client
      
      return {
        allowed: false,
        currentCount: current.count,
        limit: config.maxRequests,
        remaining: 0,
        resetAt: Math.floor(current.resetAt / 1000),
        retryAfter,
        message: `Rate limit exceeded. Too many requests. Please try again in ${retryMinutes} minute${retryMinutes !== 1 ? 's' : ''}.`
      };
    }
    
    // Increment count
    const newCount = current.count + 1;
    const ttl = current.resetAt - now;
    
    await kv.set(
      key,
      { count: newCount, resetAt: current.resetAt },
      { expireIn: ttl }
    );
    
    console.log(
      `[Rate Limit] Request recorded for ${config.namespace}:${identifier}: ` +
      `${newCount}/${config.maxRequests} requests`
    );
    
    return {
      allowed: true,
      currentCount: newCount,
      limit: config.maxRequests,
      remaining: config.maxRequests - newCount,
      resetAt: Math.floor(current.resetAt / 1000)
    };
    
  } catch (error) {
    console.error('[Rate Limit] Error checking rate limit:', error);
    
    // Fail open - allow request if rate limiting system fails
    // This prevents rate limiter failures from blocking legitimate users
    return {
      allowed: true,
      currentCount: 0,
      limit: config.maxRequests,
      remaining: config.maxRequests,
      resetAt: Math.floor((Date.now() + config.windowMs) / 1000)
    };
  }
}

/**
 * Check validation endpoint rate limit (IP-based)
 * 
 * Convenience function for checking rate limit on the validation endpoint.
 * Uses IP address as identifier.
 * 
 * Requirements:
 * - Task 15.3: 5 requests per 15 minutes per IP
 * 
 * @param req - HTTP request
 * @returns Rate limit check result
 * 
 * @example
 * ```typescript
 * const rateLimit = await checkValidationRateLimit(req);
 * if (!rateLimit.allowed) {
 *   return createRateLimitResponse(rateLimit);
 * }
 * ```
 */
export async function checkValidationRateLimit(
  req: Request
): Promise<RateLimitCheckResult> {
  const ipAddress = extractClientIP(req);
  return await checkRateLimit(
    ipAddress,
    VendorRegistrationRateLimits.VALIDATION
  );
}

/**
 * Check payment creation rate limit (user-based)
 * 
 * Convenience function for checking rate limit on payment creation endpoint.
 * Uses user ID as identifier.
 * 
 * Requirements:
 * - Task 15.3: 3 requests per hour per user
 * 
 * @param userId - Authenticated user ID
 * @returns Rate limit check result
 * 
 * @example
 * ```typescript
 * const rateLimit = await checkPaymentCreationRateLimit(user.id);
 * if (!rateLimit.allowed) {
 *   return createRateLimitResponse(rateLimit);
 * }
 * ```
 */
export async function checkPaymentCreationRateLimit(
  userId: string
): Promise<RateLimitCheckResult> {
  return await checkRateLimit(
    userId,
    VendorRegistrationRateLimits.PAYMENT_CREATION
  );
}

/**
 * Create HTTP 429 response for rate limit exceeded
 * 
 * Creates a properly formatted HTTP 429 response with Retry-After header
 * and rate limit information in response headers.
 * 
 * @param result - Rate limit check result
 * @param additionalHeaders - Optional additional headers to include
 * @returns HTTP Response with status 429
 * 
 * @example
 * ```typescript
 * if (!rateLimit.allowed) {
 *   return createRateLimitResponse(rateLimit);
 * }
 * ```
 */
export function createRateLimitResponse(
  result: RateLimitCheckResult,
  additionalHeaders: Record<string, string> = {}
): Response {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetAt.toString(),
    ...additionalHeaders
  };
  
  if (result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString();
  }
  
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      code: 'RATE_LIMIT_EXCEEDED',
      message: result.message || 'Too many requests. Please try again later.',
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
 * Log rate limit violation to audit logs
 * 
 * Records a rate limit violation event for security monitoring and analysis.
 * 
 * @param supabase - Supabase client
 * @param identifier - IP address or user ID that exceeded limit
 * @param namespace - Rate limit namespace
 * @param currentCount - Current request count
 * @param limit - Maximum allowed requests
 * @param ipAddress - Client IP address (for context)
 * @param userAgent - Client user agent
 * 
 * @example
 * ```typescript
 * await logRateLimitViolation(
 *   supabase,
 *   ipAddress,
 *   'vendor-validation',
 *   6,
 *   5,
 *   ipAddress,
 *   userAgent
 * );
 * ```
 */
export async function logRateLimitViolation(
  supabase: any,
  identifier: string,
  namespace: string,
  currentCount: number,
  limit: number,
  ipAddress: string,
  userAgent: string
): Promise<void> {
  try {
    await supabase
      .from('audit_logs')
      .insert({
        action: 'rate_limit_exceeded',
        resource_type: 'rate_limit',
        resource_id: null,
        action_status: 'denied',
        details: {
          namespace,
          identifier: identifier !== ipAddress ? identifier : '[same as IP]',
          ip_address: ipAddress,
          current_count: currentCount,
          max_allowed: limit,
          timestamp: new Date().toISOString()
        },
        ip_address: ipAddress,
        user_agent: userAgent
      });
    
    console.log(
      `[Security] Rate limit violation logged: ${namespace} for ${identifier}`
    );
  } catch (error) {
    console.error('[Security] Failed to log rate limit violation:', error);
    // Don't throw - logging failure shouldn't block operations
  }
}

/**
 * Get rate limit status without incrementing
 * 
 * Checks current rate limit status without counting as a request.
 * Useful for health checks or status endpoints.
 * 
 * @param identifier - IP address or user ID
 * @param config - Rate limit configuration
 * @returns Current rate limit status
 * 
 * @example
 * ```typescript
 * const status = await getRateLimitStatus(userId, VendorRegistrationRateLimits.PAYMENT_CREATION);
 * console.log(`Remaining requests: ${status.remaining}`);
 * ```
 */
export async function getRateLimitStatus(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitCheckResult> {
  try {
    const kv = await Deno.openKv();
    const key = ['ratelimit', config.namespace, identifier];
    const now = Date.now();
    
    const result = await kv.get<{ count: number; resetAt: number }>(key);
    const current = result.value;
    
    if (!current || now > current.resetAt) {
      return {
        allowed: true,
        currentCount: 0,
        limit: config.maxRequests,
        remaining: config.maxRequests,
        resetAt: Math.floor((now + config.windowMs) / 1000)
      };
    }
    
    return {
      allowed: current.count < config.maxRequests,
      currentCount: current.count,
      limit: config.maxRequests,
      remaining: Math.max(0, config.maxRequests - current.count),
      resetAt: Math.floor(current.resetAt / 1000),
      retryAfter: current.count >= config.maxRequests 
        ? Math.ceil((current.resetAt - now) / 1000)
        : undefined
    };
    
  } catch (error) {
    console.error('[Rate Limit] Error getting status:', error);
    return {
      allowed: true,
      currentCount: 0,
      limit: config.maxRequests,
      remaining: config.maxRequests,
      resetAt: Math.floor((Date.now() + config.windowMs) / 1000)
    };
  }
}

/**
 * Reset rate limit for identifier
 * 
 * Manually resets the rate limit for a specific identifier.
 * Should only be used by administrators or for testing.
 * 
 * @param identifier - IP address or user ID
 * @param config - Rate limit configuration
 * 
 * @example
 * ```typescript
 * // Admin endpoint to reset rate limit
 * await resetRateLimit(userId, VendorRegistrationRateLimits.PAYMENT_CREATION);
 * ```
 */
export async function resetRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<void> {
  try {
    const kv = await Deno.openKv();
    const key = ['ratelimit', config.namespace, identifier];
    await kv.delete(key);
    
    console.log(`[Rate Limit] Reset for ${config.namespace}:${identifier}`);
  } catch (error) {
    console.error('[Rate Limit] Error resetting rate limit:', error);
  }
}
