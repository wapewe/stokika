/**
 * Security Middleware for Edge Functions
 * 
 * This module provides higher-level middleware functions that combine multiple
 * security features for easy integration into Edge Functions.
 * 
 * Requirements:
 * - 32.12: JWT validation in all Edge Functions
 * - 22.1-22.11: Rate limiting
 * - 20.9: Input validation
 * - 10.11: Audit logging
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import {
  validateJWT,
  checkRateLimit,
  recordRateLimitAttempt,
  logAudit,
  handleCORSPreflight,
  createErrorResponse,
  createSuccessResponse,
  RATE_LIMIT_CONFIGS,
  CORS_HEADERS,
  type AuthResult,
  type RateLimitResult,
  type RateLimitConfig
} from './security.ts';

/**
 * Middleware context passed to handler
 */
export interface MiddlewareContext {
  supabase: ReturnType<typeof createClient>;
  userId: string;
  req: Request;
}

/**
 * Middleware options
 */
export interface MiddlewareOptions {
  requireAuth?: boolean;
  rateLimitOperation?: keyof typeof RATE_LIMIT_CONFIGS;
  customRateLimit?: Partial<RateLimitConfig>;
  logAuditOnSuccess?: boolean;
  logAuditOnFailure?: boolean;
}

/**
 * Handler function type
 */
export type HandlerFunction = (
  context: MiddlewareContext
) => Promise<Response> | Response;

/**
 * Security middleware wrapper
 * 
 * This function wraps an Edge Function handler with automatic security features:
 * - CORS handling
 * - JWT validation
 * - Rate limiting
 * - Audit logging
 * - Error handling
 * 
 * Requirements:
 * - 32.12: JWT validation
 * - 22.1-22.11: Rate limiting
 * - 10.11: Audit logging
 * 
 * @param handler - The actual handler function
 * @param options - Middleware options
 * @returns Wrapped handler function
 * 
 * @example
 * ```typescript
 * import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
 * import { withSecurity } from '../shared/middleware.ts';
 * 
 * serve(withSecurity(
 *   async ({ supabase, userId, req }) => {
 *     // Your handler logic here
 *     return createSuccessResponse({ message: 'Success' });
 *   },
 *   {
 *     requireAuth: true,
 *     rateLimitOperation: 'stockRequest',
 *     logAuditOnSuccess: true
 *   }
 * ));
 * ```
 */
export function withSecurity(
  handler: HandlerFunction,
  options: MiddlewareOptions = {}
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return handleCORSPreflight();
    }

    try {
      // Initialize Supabase client with service role
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

      if (!supabaseUrl || !supabaseServiceKey) {
        console.error('[Middleware] Missing required environment variables');
        return createErrorResponse('Server configuration error', 500);
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Step 1: JWT Validation (if required)
      let userId: string | undefined;

      if (options.requireAuth !== false) { // Default to requiring auth
        const authHeader = req.headers.get('Authorization');
        const authResult = await validateJWT(supabase, authHeader);

        if (!authResult.success) {
          // Log failed authentication attempt
          await logAudit(supabase, {
            userId: null,
            action: 'authentication_failed',
            actionStatus: 'denied',
            details: { reason: authResult.error }
          });

          return createErrorResponse(
            authResult.error || 'Authentication required',
            401
          );
        }

        userId = authResult.userId!;
        console.log(`[Middleware] Authenticated user: ${userId}`);
      }

      // Step 2: Rate Limiting (if configured)
      if (options.rateLimitOperation || options.customRateLimit) {
        const rateLimitConfig = options.customRateLimit || {
          ...RATE_LIMIT_CONFIGS[options.rateLimitOperation!],
          identifier: userId || req.headers.get('cf-connecting-ip') || 'unknown',
          operation: options.rateLimitOperation!
        };

        const rateLimitResult = await checkRateLimit(
          supabase,
          rateLimitConfig as RateLimitConfig
        );

        if (!rateLimitResult.allowed) {
          // Log rate limit violation
          await logAudit(supabase, {
            userId: userId || null,
            action: 'rate_limit_exceeded',
            actionStatus: 'denied',
            details: {
              operation: rateLimitConfig.operation,
              identifier: rateLimitConfig.identifier,
              retry_after: rateLimitResult.retryAfter
            }
          });

          return createErrorResponse(
            rateLimitResult.reason || 'Rate limit exceeded',
            429,
            rateLimitResult.retryAfter
          );
        }

        // Record attempt for rate limiting
        await recordRateLimitAttempt(
          supabase,
          rateLimitConfig.identifier,
          rateLimitConfig.operation
        );

        console.log(
          `[Middleware] Rate limit check passed: ${rateLimitConfig.operation} ` +
          `(${rateLimitResult.remaining} remaining)`
        );
      }

      // Step 3: Call handler
      const context: MiddlewareContext = {
        supabase,
        userId: userId || '',
        req
      };

      const response = await handler(context);

      // Step 4: Log audit on success (if configured)
      if (options.logAuditOnSuccess && userId) {
        await logAudit(supabase, {
          userId,
          action: `${options.rateLimitOperation || 'operation'}_success`,
          actionStatus: 'success',
          details: {
            method: req.method,
            url: req.url,
            status: response.status
          }
        });
      }

      return response;

    } catch (error) {
      console.error('[Middleware] Unhandled error:', error);

      // Log audit on failure (if configured)
      if (options.logAuditOnFailure) {
        try {
          const supabaseUrl = Deno.env.get('SUPABASE_URL');
          const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
          
          if (supabaseUrl && supabaseServiceKey) {
            const supabase = createClient(supabaseUrl, supabaseServiceKey);
            
            await logAudit(supabase, {
              userId: null,
              action: 'operation_failed',
              actionStatus: 'failure',
              details: {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
              }
            });
          }
        } catch (auditError) {
          console.error('[Middleware] Failed to log audit on error:', auditError);
        }
      }

      const errorMessage = error instanceof Error ? error.message : 'Internal server error';
      return createErrorResponse(errorMessage, 500);
    }
  };
}

/**
 * Middleware specifically for authentication endpoints (login, password reset)
 * 
 * These endpoints don't require prior authentication but need rate limiting
 * based on email or IP address.
 * 
 * Requirements:
 * - 22.1: Login rate limiting (5 per 15 min per IP)
 * - 22.2: Password reset rate limiting (3 per hour per email)
 * 
 * @param handler - Handler function
 * @param operation - Operation type ('login' or 'passwordReset')
 * @returns Wrapped handler
 * 
 * @example
 * ```typescript
 * serve(withAuthEndpoint(
 *   async ({ supabase, req }) => {
 *     // Login logic here
 *     return createSuccessResponse({ token: 'xxx' });
 *   },
 *   'login'
 * ));
 * ```
 */
export function withAuthEndpoint(
  handler: (context: Omit<MiddlewareContext, 'userId'>) => Promise<Response> | Response,
  operation: 'login' | 'passwordReset'
): (req: Request) => Promise<Response> {
  return withSecurity(
    async (context) => {
      // Auth endpoints don't have userId yet
      return handler({ supabase: context.supabase, req: context.req });
    },
    {
      requireAuth: false,
      rateLimitOperation: operation,
      logAuditOnFailure: true
    }
  );
}

/**
 * Middleware specifically for public endpoints (no auth required)
 * 
 * Requirements:
 * - 22.6: API query rate limiting (100 per min per user)
 * 
 * @param handler - Handler function
 * @returns Wrapped handler
 * 
 * @example
 * ```typescript
 * serve(withPublicEndpoint(
 *   async ({ supabase, req }) => {
 *     // Public logic here
 *     return createSuccessResponse({ data: 'public data' });
 *   }
 * ));
 * ```
 */
export function withPublicEndpoint(
  handler: (context: Omit<MiddlewareContext, 'userId'>) => Promise<Response> | Response
): (req: Request) => Promise<Response> {
  return withSecurity(
    async (context) => {
      return handler({ supabase: context.supabase, req: context.req });
    },
    {
      requireAuth: false,
      rateLimitOperation: 'apiQuery'
    }
  );
}

/**
 * Middleware for webhook endpoints (M-Pesa callbacks, etc.)
 * 
 * These endpoints require signature validation instead of JWT auth.
 * 
 * Requirements:
 * - 11.6: Validate M-Pesa callback signature
 * - 22.5: M-Pesa callback rate limiting
 * 
 * @param handler - Handler function
 * @param validateSignature - Function to validate webhook signature
 * @returns Wrapped handler
 * 
 * @example
 * ```typescript
 * serve(withWebhook(
 *   async ({ supabase, req }) => {
 *     // Process callback
 *     return createSuccessResponse({ result: 'processed' });
 *   },
 *   async (req) => {
 *     // Validate M-Pesa signature
 *     return validateMpesaSignature(req);
 *   }
 * ));
 * ```
 */
export function withWebhook(
  handler: (context: Omit<MiddlewareContext, 'userId'>) => Promise<Response> | Response,
  validateSignature: (req: Request) => Promise<boolean>
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return handleCORSPreflight();
    }

    try {
      // Initialize Supabase
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

      if (!supabaseUrl || !supabaseServiceKey) {
        return createErrorResponse('Server configuration error', 500);
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Validate webhook signature
      const isValid = await validateSignature(req);

      if (!isValid) {
        await logAudit(supabase, {
          userId: null,
          action: 'webhook_invalid_signature',
          actionStatus: 'denied',
          details: {
            url: req.url,
            headers: Object.fromEntries(req.headers.entries())
          }
        });

        return createErrorResponse('Invalid signature', 401);
      }

      // Rate limiting for webhooks
      const identifier = req.headers.get('x-webhook-id') || 
                        req.headers.get('cf-connecting-ip') || 
                        'unknown';

      const rateLimitResult = await checkRateLimit(supabase, {
        ...RATE_LIMIT_CONFIGS.mpesaCallback,
        identifier,
        operation: 'mpesa_callback'
      });

      if (!rateLimitResult.allowed) {
        return createErrorResponse(
          'Rate limit exceeded',
          429,
          rateLimitResult.retryAfter
        );
      }

      await recordRateLimitAttempt(supabase, identifier, 'mpesa_callback');

      // Call handler
      const response = await handler({ supabase, req });

      return response;

    } catch (error) {
      console.error('[Webhook Middleware] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Internal server error';
      return createErrorResponse(errorMessage, 500);
    }
  };
}
