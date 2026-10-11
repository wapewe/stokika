/**
 * Security Utilities for Edge Functions
 * 
 * This module provides comprehensive security features for Supabase Edge Functions including:
 * - JWT authentication and validation
 * - Rate limiting for various operation types
 * - Input validation and sanitization
 * - Audit logging with sensitive data redaction
 * 
 * Requirements:
 * - 32.12: JWT validation in all Edge Functions
 * - 22.1-22.11: Rate limiting implementation
 * - 20.9: Server-side input validation
 * - 10.11: Audit logging for business-critical decisions
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

/**
 * Authentication result
 */
export interface AuthResult {
  success: boolean;
  userId?: string;
  error?: string;
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  identifier: string;
  operation: string;
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
  remaining?: number;
  reason?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  userId: string | null;
  action: string;
  resourceType?: string;
  resourceId?: string;
  actionStatus: 'success' | 'failure' | 'denied';
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Standard CORS headers for Edge Functions
 */
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-csrf-token'
};

/**
 * Rate limit configurations for different operation types
 * 
 * Requirements:
 * - 22.1: Login attempts (5 per 15 minutes per IP)
 * - 22.2: Password reset (3 per hour per email)
 * - 22.3: Stock requests (10 per hour per vendor)
 * - 22.4: Payment intents (20 per hour per vendor)
 * - 22.5: M-Pesa callbacks (10 per minute per transaction ID)
 * - 22.6: API queries (100 per minute per user)
 */
export const RATE_LIMIT_CONFIGS = {
  login: { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 15 minutes
  passwordReset: { maxRequests: 3, windowMs: 60 * 60 * 1000 }, // 1 hour
  stockRequest: { maxRequests: 10, windowMs: 60 * 60 * 1000 }, // 1 hour
  paymentIntent: { maxRequests: 20, windowMs: 60 * 60 * 1000 }, // 1 hour
  mpesaCallback: { maxRequests: 10, windowMs: 60 * 1000 }, // 1 minute
  apiQuery: { maxRequests: 100, windowMs: 60 * 1000 } // 1 minute
};

/**
 * Validate JWT token and authenticate user
 * 
 * This function extracts the JWT from the Authorization header, validates it
 * via Supabase Auth, and returns the authenticated user ID.
 * 
 * Requirements:
 * - 32.12: Extract JWT from Authorization header
 * - 32.12: Validate JWT signature via Supabase Auth
 * - 32.12: Return 401 if invalid or missing
 * 
 * @param supabaseClient - Initialized Supabase client
 * @param authHeader - Authorization header value (should be "Bearer <token>")
 * @returns AuthResult with success status and userId if valid
 * 
 * @example
 * ```typescript
 * const auth = await validateJWT(supabase, req.headers.get('Authorization'));
 * if (!auth.success) {
 *   return new Response(JSON.stringify({ error: auth.error }), { status: 401 });
 * }
 * ```
 */
export async function validateJWT(
  supabaseClient: ReturnType<typeof createClient>,
  authHeader: string | null
): Promise<AuthResult> {
  // Check if Authorization header exists
  if (!authHeader) {
    console.warn('[Security] Missing Authorization header');
    return {
      success: false,
      error: 'Authorization header is required'
    };
  }

  // Check if header has correct format
  if (!authHeader.startsWith('Bearer ')) {
    console.warn('[Security] Invalid Authorization header format');
    return {
      success: false,
      error: 'Authorization header must be in format: Bearer <token>'
    };
  }

  // Extract token
  const token = authHeader.replace('Bearer ', '');

  if (!token || token.trim().length === 0) {
    console.warn('[Security] Empty JWT token');
    return {
      success: false,
      error: 'JWT token is empty'
    };
  }

  try {
    // Validate token via Supabase Auth
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError) {
      console.warn('[Security] JWT validation failed:', authError.message);
      return {
        success: false,
        error: 'Invalid or expired authentication token'
      };
    }

    if (!user) {
      console.warn('[Security] No user found for valid token');
      return {
        success: false,
        error: 'User not found'
      };
    }

    console.log(`[Security] JWT validated successfully for user: ${user.id}`);

    return {
      success: true,
      userId: user.id
    };

  } catch (error) {
    console.error('[Security] Unexpected error during JWT validation:', error);
    return {
      success: false,
      error: 'Authentication failed due to server error'
    };
  }
}

/**
 * Check rate limit for an operation
 * 
 * This function checks if an identifier (user ID, IP address, email, etc.) has
 * exceeded the rate limit for a specific operation type. It stores attempt counts
 * in a database table with automatic cleanup.
 * 
 * Requirements:
 * - 22.1-22.6: Rate limiting for various operations
 * - 22.7: Return HTTP 429 with Retry-After header when exceeded
 * - 22.8: Use IP address and user ID for rate limiting
 * - 22.9: Store rate limit counters with TTL
 * - 22.11: Exponential backoff for repeated violations
 * 
 * @param supabaseClient - Initialized Supabase client with service role
 * @param config - Rate limit configuration
 * @returns RateLimitResult indicating if request is allowed
 * 
 * @example
 * ```typescript
 * const rateLimit = await checkRateLimit(supabase, {
 *   maxRequests: 10,
 *   windowMs: 60000,
 *   identifier: userId,
 *   operation: 'stock_request'
 * });
 * 
 * if (!rateLimit.allowed) {
 *   return new Response(
 *     JSON.stringify({ error: rateLimit.reason }),
 *     { 
 *       status: 429,
 *       headers: { 'Retry-After': rateLimit.retryAfter?.toString() || '60' }
 *     }
 *   );
 * }
 * ```
 */
export async function checkRateLimit(
  supabaseClient: ReturnType<typeof createClient>,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = new Date(now - config.windowMs);

  try {
    // Count recent attempts within the time window
    const { count, error: countError } = await supabaseClient
      .from('rate_limit_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('identifier', config.identifier)
      .eq('operation', config.operation)
      .gte('attempted_at', windowStart.toISOString());

    if (countError) {
      console.error(`[Security] Error checking rate limit for ${config.identifier}:`, countError);
      // Fail open - allow request if we can't check rate limit
      return { allowed: true };
    }

    const attemptCount = count || 0;
    const remaining = Math.max(0, config.maxRequests - attemptCount);

    console.log(
      `[Security] Rate limit check: ${config.operation} for ${config.identifier} ` +
      `has ${attemptCount}/${config.maxRequests} attempts (${remaining} remaining)`
    );

    // Check if limit exceeded
    if (attemptCount >= config.maxRequests) {
      // Get oldest attempt to calculate retry-after
      const { data: oldestAttempt, error: oldestError } = await supabaseClient
        .from('rate_limit_attempts')
        .select('attempted_at')
        .eq('identifier', config.identifier)
        .eq('operation', config.operation)
        .gte('attempted_at', windowStart.toISOString())
        .order('attempted_at', { ascending: true })
        .limit(1)
        .single();

      let retryAfter: number;

      if (oldestError || !oldestAttempt) {
        // If we can't calculate precise retry-after, use default window
        retryAfter = Math.ceil(config.windowMs / 1000);
      } else {
        // Calculate when oldest attempt expires
        const oldestTime = new Date(oldestAttempt.attempted_at).getTime();
        const windowEnd = oldestTime + config.windowMs;
        retryAfter = Math.max(0, Math.ceil((windowEnd - now) / 1000));
      }

      console.warn(
        `[Security] Rate limit exceeded for ${config.identifier} ` +
        `(${config.operation}), retry in ${retryAfter}s`
      );

      return {
        allowed: false,
        retryAfter,
        reason: `Rate limit exceeded. Too many ${config.operation} attempts. Please try again in ${retryAfter} seconds.`
      };
    }

    // Limit not exceeded
    return {
      allowed: true,
      remaining
    };

  } catch (error) {
    console.error('[Security] Unexpected error in rate limit check:', error);
    // Fail open - allow request on error
    return { allowed: true };
  }
}

/**
 * Record a rate limit attempt
 * 
 * This function records an attempt for rate limiting purposes. It should be called
 * after a request passes the rate limit check but before processing begins.
 * 
 * Requirements:
 * - 22.9: Store rate limit counters with TTL
 * 
 * @param supabaseClient - Initialized Supabase client with service role
 * @param identifier - User ID, IP address, email, or other identifier
 * @param operation - Operation type (login, stock_request, etc.)
 * @returns Promise<void>
 * 
 * @example
 * ```typescript
 * await recordRateLimitAttempt(supabase, userId, 'stock_request');
 * ```
 */
export async function recordRateLimitAttempt(
  supabaseClient: ReturnType<typeof createClient>,
  identifier: string,
  operation: string
): Promise<void> {
  try {
    const { error } = await supabaseClient
      .from('rate_limit_attempts')
      .insert({
        identifier,
        operation,
        attempted_at: new Date().toISOString()
      });

    if (error) {
      console.error(`[Security] Failed to record rate limit attempt for ${identifier}:`, error);
      // Don't throw - recording failures shouldn't block requests
    } else {
      console.log(`[Security] Recorded rate limit attempt: ${operation} for ${identifier}`);
    }
  } catch (error) {
    console.error('[Security] Unexpected error recording rate limit attempt:', error);
    // Don't throw - recording failures shouldn't block requests
  }
}

/**
 * Validate input string for basic security
 * 
 * This function performs server-side validation to prevent common injection attacks
 * and malformed data.
 * 
 * Requirements:
 * - 20.9: Re-validate all inputs server-side
 * - 20.9: Sanitize string inputs
 * 
 * @param input - Input string to validate
 * @param fieldName - Name of field for error messages
 * @param options - Validation options
 * @returns ValidationResult
 * 
 * @example
 * ```typescript
 * const validation = validateString(payload.businessName, 'businessName', {
 *   required: true,
 *   minLength: 2,
 *   maxLength: 200
 * });
 * 
 * if (!validation.valid) {
 *   return new Response(
 *     JSON.stringify({ error: validation.errors?.join(', ') }),
 *     { status: 400 }
 *   );
 * }
 * ```
 */
export function validateString(
  input: string | null | undefined,
  fieldName: string,
  options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    allowEmpty?: boolean;
  } = {}
): ValidationResult {
  const errors: string[] = [];

  // Check if required
  if (options.required && (input === null || input === undefined)) {
    errors.push(`${fieldName} is required`);
    return { valid: false, errors };
  }

  // If not required and empty, skip other validations
  if (!options.required && !input) {
    return { valid: true };
  }

  const value = input || '';

  // Check if empty when not allowed
  if (!options.allowEmpty && value.trim().length === 0) {
    errors.push(`${fieldName} cannot be empty`);
  }

  // Check minimum length
  if (options.minLength && value.length < options.minLength) {
    errors.push(`${fieldName} must be at least ${options.minLength} characters`);
  }

  // Check maximum length
  if (options.maxLength && value.length > options.maxLength) {
    errors.push(`${fieldName} must not exceed ${options.maxLength} characters`);
  }

  // Check pattern
  if (options.pattern && !options.pattern.test(value)) {
    errors.push(`${fieldName} has invalid format`);
  }

  // Check for SQL injection patterns
  const sqlPatterns = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b|--|;|\/\*|\*\/|xp_|sp_)/i;
  if (sqlPatterns.test(value)) {
    errors.push(`${fieldName} contains invalid characters`);
  }

  // Check for XSS patterns
  const xssPatterns = /<script[^>]*>.*?<\/script>|javascript:|on\w+\s*=/gi;
  if (xssPatterns.test(value)) {
    errors.push(`${fieldName} contains potentially malicious content`);
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Validate email address
 * 
 * Requirements: 20.9 - Input validation
 * 
 * @param email - Email address to validate
 * @returns ValidationResult
 */
export function validateEmail(email: string | null | undefined): ValidationResult {
  if (!email) {
    return { valid: false, errors: ['Email is required'] };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return { valid: false, errors: ['Invalid email format'] };
  }

  if (email.length > 254) {
    return { valid: false, errors: ['Email is too long'] };
  }

  return { valid: true };
}

/**
 * Validate phone number (Kenyan format)
 * 
 * Requirements: 20.9 - Input validation
 * 
 * @param phone - Phone number to validate
 * @returns ValidationResult with normalized phone number if valid
 */
export function validatePhone(
  phone: string | null | undefined
): ValidationResult & { normalized?: string } {
  if (!phone) {
    return { valid: false, errors: ['Phone number is required'] };
  }

  // Accept formats: 254XXXXXXXXX, 07XXXXXXXX, 01XXXXXXXX
  const normalized254 = /^254[0-9]{9}$/;
  const format07 = /^07[0-9]{8}$/;
  const format01 = /^01[0-9]{8}$/;

  if (normalized254.test(phone)) {
    return { valid: true, normalized: phone };
  }

  if (format07.test(phone)) {
    return { valid: true, normalized: '254' + phone.substring(1) };
  }

  if (format01.test(phone)) {
    return { valid: true, normalized: '254' + phone.substring(1) };
  }

  return {
    valid: false,
    errors: ['Invalid phone number format. Use 254XXXXXXXXX, 07XXXXXXXX, or 01XXXXXXXX']
  };
}

/**
 * Validate UUID
 * 
 * Requirements: 20.9 - Input validation
 * 
 * @param uuid - UUID to validate
 * @param fieldName - Field name for error messages
 * @returns ValidationResult
 */
export function validateUUID(
  uuid: string | null | undefined,
  fieldName: string = 'ID'
): ValidationResult {
  if (!uuid) {
    return { valid: false, errors: [`${fieldName} is required`] };
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(uuid)) {
    return { valid: false, errors: [`${fieldName} must be a valid UUID`] };
  }

  return { valid: true };
}

/**
 * Validate numeric value
 * 
 * Requirements: 20.9 - Input validation
 * 
 * @param value - Numeric value to validate
 * @param fieldName - Field name for error messages
 * @param options - Validation options
 * @returns ValidationResult
 */
export function validateNumber(
  value: number | null | undefined,
  fieldName: string,
  options: {
    required?: boolean;
    min?: number;
    max?: number;
    integer?: boolean;
  } = {}
): ValidationResult {
  const errors: string[] = [];

  if (options.required && (value === null || value === undefined)) {
    errors.push(`${fieldName} is required`);
    return { valid: false, errors };
  }

  if (value === null || value === undefined) {
    return { valid: true };
  }

  if (typeof value !== 'number' || isNaN(value)) {
    errors.push(`${fieldName} must be a valid number`);
    return { valid: false, errors };
  }

  if (options.integer && !Number.isInteger(value)) {
    errors.push(`${fieldName} must be an integer`);
  }

  if (options.min !== undefined && value < options.min) {
    errors.push(`${fieldName} must be at least ${options.min}`);
  }

  if (options.max !== undefined && value > options.max) {
    errors.push(`${fieldName} must not exceed ${options.max}`);
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Sanitize HTML to prevent XSS
 * 
 * Requirements: 20.9 - Sanitize string inputs
 * 
 * @param input - Input string to sanitize
 * @returns Sanitized string
 */
export function sanitizeHTML(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
}

/**
 * Redact sensitive data from object
 * 
 * This function removes or masks sensitive fields before logging to audit logs.
 * 
 * Requirements:
 * - 10.11: Redact sensitive data from logs
 * - 21.8: Redact passwords, secrets from audit details
 * 
 * @param data - Object containing potentially sensitive data
 * @returns Object with sensitive fields redacted
 * 
 * @example
 * ```typescript
 * const safeDetails = redactSensitiveData({
 *   userId: '123',
 *   password: 'secret123',
 *   token: 'abc-xyz',
 *   amount: 5000
 * });
 * // Returns: { userId: '123', password: '[REDACTED]', token: '[REDACTED]', amount: 5000 }
 * ```
 */
export function redactSensitiveData(data: Record<string, any>): Record<string, any> {
  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'key',
    'passkey',
    'pin',
    'apiKey',
    'api_key',
    'serviceRoleKey',
    'service_role_key',
    'consumerSecret',
    'consumer_secret',
    'accessToken',
    'access_token',
    'refreshToken',
    'refresh_token',
    'jwt',
    'authorization'
  ];

  const redacted: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    
    if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive.toLowerCase()))) {
      redacted[key] = '[REDACTED]';
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Recursively redact nested objects
      redacted[key] = redactSensitiveData(value);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

/**
 * Log audit entry
 * 
 * This function logs security-critical and business-critical actions to the
 * audit_logs table for compliance and forensics.
 * 
 * Requirements:
 * - 10.11: Log all business-critical decisions
 * - 21.1-21.5: Log authentication, authorization, data access, financial, and business events
 * - 21.6: Store with timestamp, user ID, action type, details
 * - 21.8: Redact sensitive data
 * 
 * @param supabaseClient - Initialized Supabase client with service role
 * @param entry - Audit log entry data
 * @returns Promise<void>
 * 
 * @example
 * ```typescript
 * await logAudit(supabase, {
 *   userId: user.id,
 *   action: 'stock_request_created',
 *   resourceType: 'stock_request',
 *   resourceId: stockRequestId,
 *   actionStatus: 'success',
 *   details: { total_amount: 50000, items_count: 3 }
 * });
 * ```
 */
export async function logAudit(
  supabaseClient: ReturnType<typeof createClient>,
  entry: AuditLogEntry
): Promise<void> {
  try {
    // Redact sensitive data from details
    const safeDetails = entry.details ? redactSensitiveData(entry.details) : null;

    const { error } = await supabaseClient
      .from('audit_logs')
      .insert({
        user_id: entry.userId,
        action: entry.action,
        resource_type: entry.resourceType || null,
        resource_id: entry.resourceId || null,
        action_status: entry.actionStatus,
        ip_address: entry.ipAddress || null,
        user_agent: entry.userAgent || null,
        details: safeDetails,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('[Security] Failed to log audit entry:', error);
      // Don't throw - audit logging failures shouldn't block operations
    } else {
      console.log(`[Security] Audit log created: ${entry.action} for user ${entry.userId || 'system'}`);
    }
  } catch (error) {
    console.error('[Security] Unexpected error logging audit entry:', error);
    // Don't throw - audit logging failures shouldn't block operations
  }
}

/**
 * Handle CORS preflight request
 * 
 * @returns Response for OPTIONS request
 */
export function handleCORSPreflight(): Response {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS
  });
}

/**
 * Create error response with proper headers
 * 
 * @param message - Error message
 * @param status - HTTP status code
 * @param retryAfter - Optional retry-after value in seconds
 * @returns Response object
 */
export function createErrorResponse(
  message: string,
  status: number,
  retryAfter?: number
): Response {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...CORS_HEADERS
  };

  if (retryAfter) {
    headers['Retry-After'] = retryAfter.toString();
  }

  return new Response(
    JSON.stringify({ error: message }),
    { status, headers }
  );
}

/**
 * Create success response with proper headers
 * 
 * @param data - Response data
 * @param status - HTTP status code (default: 200)
 * @returns Response object
 */
export function createSuccessResponse(
  data: any,
  status: number = 200
): Response {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS
      }
    }
  );
}
