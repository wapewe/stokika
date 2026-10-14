/// <reference lib="deno.unstable" />
/**
 * Payment Status Query Edge Function
 * 
 * Allows authenticated users to check the status of their payment intents.
 * This is used by the frontend to poll payment status after initiating
 * a manual C2B payment or STK Push.
 * 
 * Task 13.2: Implement payment status query logic
 * Task 13.3: Add rate limiting
 * Requirements: 10.4, 10.5, Security consideration from design
 */

import { serve } from 'std/http/server.ts';
import { createClient } from '@supabase/supabase-js';

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60; // 1 minute in seconds
const RATE_LIMIT_MAX_REQUESTS = 20; // 20 requests per minute per user

interface PaymentStatusRequest {
  paymentIntentId: string;
}

interface PaymentStatusResponse {
  success: boolean;
  status: 'PENDING' | 'PROCESSING' | 'CONFIRMED' | 'FAILED' | 'EXPIRED';
  message: string;
  amount?: number;
  payment_reference?: string;
  confirmed_at?: string;
  transaction?: PaymentTransactionRecord;
  error?: string;
}

interface PaymentTransactionRecord {
  id: string;
  status: string;
  receipt_number?: string;
  confirmed_at?: string;
  payment_channel?: string;
  amount?: number;
  payer_phone?: string;
  failure_reason?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

/**
 * Rate limiting using Deno KV
 * Implements sliding window rate limiting per user
 * 
 * @param userId - The authenticated user's ID
 * @returns Object with allowed status and rate limit info
 */
async function checkRateLimit(userId: string): Promise<{
  allowed: boolean;
  remaining: number;
  reset: number;
  limit: number;
}> {
  try {
    const kv: Deno.Kv = await Deno.openKv();
    const key = ['rate_limit', 'payment_status', userId];
    const now = Date.now();
    const windowStart = now - (RATE_LIMIT_WINDOW * 1000);
    
    try {
      // Get current rate limit data
      const result = await kv.get<{
        requests: number[];
        lastReset: number;
      }>(key);
      
      let requests: number[] = [];
      
      if (result.value) {
        // Filter out requests outside the current window
        requests = result.value.requests.filter((timestamp: number) => timestamp > windowStart);
      }
      
      // Check if rate limit exceeded
      const requestCount = requests.length;
      const allowed = requestCount < RATE_LIMIT_MAX_REQUESTS;
      
      if (allowed) {
        // Add current request timestamp
        requests.push(now);
        
        // Store updated request list with TTL of window duration
        await kv.set(key, {
          requests,
          lastReset: now
        }, {
          expireIn: RATE_LIMIT_WINDOW * 1000
        });
      }
      
      // Calculate reset time (end of current window)
      const resetTime = Math.ceil((now + (RATE_LIMIT_WINDOW * 1000)) / 1000);
      
      return {
        allowed,
        remaining: Math.max(0, RATE_LIMIT_MAX_REQUESTS - requestCount - (allowed ? 1 : 0)),
        reset: resetTime,
        limit: RATE_LIMIT_MAX_REQUESTS
      };
    } finally {
      kv.close();
    }
  } catch (error) {
    console.warn('[Payment Status] Rate limiting unavailable, failing open:', error);
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_REQUESTS,
      reset: Math.ceil((Date.now() + (RATE_LIMIT_WINDOW * 1000)) / 1000),
      limit: RATE_LIMIT_MAX_REQUESTS
    };
  }
}

/**
 * Create rate limit headers for HTTP response
 */
function createRateLimitHeaders(rateLimit: {
  remaining: number;
  reset: number;
  limit: number;
}): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(rateLimit.limit),
    'X-RateLimit-Remaining': String(rateLimit.remaining),
    'X-RateLimit-Reset': String(rateLimit.reset)
  };
}

/**
 * Main Edge Function handler
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  
  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Method not allowed. Use POST.'
        }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse request body
    const body = await req.json();
    const paymentIntentId = body.paymentIntentId || body.intent_id;
    
    if (!paymentIntentId) {
      return new Response(
        JSON.stringify({
          success: false,
          status: 'FAILED',
          message: 'Payment intent ID required',
          error: 'paymentIntentId is required in request body'
        } as PaymentStatusResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Initialize Supabase with service role key for secure querying
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check optional authenticated user
    const authHeader = req.headers.get('authorization');
    let user: { id: string } | null = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
      if (token && token !== anonKey) {
        try {
          const { data: userData } = await supabase.auth.getUser(token);
          if (userData?.user) {
            user = userData.user;
          }
        } catch (_) {
          // Ignore auth verification error, treat request as unauthenticated
        }
      }
    }

    // Rate limiting: by user ID if authenticated, otherwise by client IP
    const clientIP = req.headers.get('cf-connecting-ip') || 
                     req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    const rateLimitKey = user ? user.id : `ip_${clientIP}`;
    const rateLimit = await checkRateLimit(rateLimitKey);
    const rateLimitHeaders = createRateLimitHeaders(rateLimit);
    
    if (!rateLimit.allowed) {
      console.log(`[Payment Status] Rate limit exceeded for: ${rateLimitKey}`);
      return new Response(
        JSON.stringify({
          success: false,
          status: 'FAILED',
          message: 'Too many requests. Please wait before trying again.',
          error: 'Rate limit exceeded',
          retry_after: rateLimit.reset - Math.floor(Date.now() / 1000)
        } as PaymentStatusResponse & { retry_after: number }),
        {
          status: 429,
          headers: { 
            ...corsHeaders, 
            ...rateLimitHeaders,
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimit.reset - Math.floor(Date.now() / 1000))
          }
        }
      );
    }

    console.log(`[Payment Status] Checking status for intent: ${paymentIntentId}, key: ${rateLimitKey}`);
    
    // Query payment intent with transactions
    let query = supabase
      .from('payment_intents')
      .select(`
        id,
        profile_id,
        payment_reference,
        status,
        expected_amount,
        confirmed_at,
        expires_at,
        payment_purpose,
        metadata,
        payment_transactions (
          id,
          status,
          receipt_number,
          confirmed_at,
          payment_channel,
          amount,
          payer_phone,
          failure_reason
        )
      `)
      .eq('id', paymentIntentId);
    
    if (user) {
      query = query.eq('profile_id', user.id);
    }
    
    const { data: intent, error: intentError } = await query.single();
    
    if (intentError || !intent) {
      console.error('[Payment Status] Intent not found:', intentError);
      return new Response(
        JSON.stringify({
          success: false,
          status: 'FAILED',
          message: 'Payment not found or access denied',
          error: 'Payment not found or access denied'
        } as PaymentStatusResponse),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // For unauthenticated queries, only allow REGISTRATION intents
    if (!user && intent.payment_purpose !== 'REGISTRATION') {
      return new Response(
        JSON.stringify({
          success: false,
          status: 'FAILED',
          message: 'Authentication required for this payment type',
          error: 'Authentication required'
        } as PaymentStatusResponse),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log(`[Payment Status] Intent found - Status: ${intent.status}, Transactions: ${intent.payment_transactions?.length || 0}`);
    
    // Check if payment intent has expired
    const now = new Date();
    const expiresAt = new Date(intent.expires_at);
    const isExpired = now > expiresAt;
    
    // Update status to EXPIRED if expired and not already confirmed
    if (isExpired && intent.status !== 'CONFIRMED' && intent.status !== 'EXPIRED') {
      console.log(`[Payment Status] Intent expired at ${expiresAt}, updating status`);
      
      const { error: updateError } = await supabase
        .from('payment_intents')
        .update({ status: 'EXPIRED' })
        .eq('id', intent.id);
      
      if (updateError) {
        console.error('[Payment Status] Failed to update expired status:', updateError);
      }
      
      // Update local intent object
      intent.status = 'EXPIRED';
    }
    
    // Get current status
    const currentStatus = intent.status as 'PENDING' | 'PROCESSING' | 'CONFIRMED' | 'FAILED' | 'EXPIRED';
    
    // Find the most recent confirmed transaction
    const transactions = (intent.payment_transactions || []) as PaymentTransactionRecord[];
    const confirmedTransaction = transactions.find((t: PaymentTransactionRecord) => t.status === 'CONFIRMED');
    const failedTransaction = transactions.find((t: PaymentTransactionRecord) => t.status === 'FAILED');
    
    // Build status message based on current state
    let message = '';
    let transactionDetails = undefined;
    
    switch (currentStatus) {
      case 'PENDING':
        message = 'Waiting for payment. Please complete the payment process.';
        break;
        
      case 'PROCESSING':
        message = 'Payment is being processed. Please wait...';
        break;
        
      case 'CONFIRMED':
        message = 'Payment confirmed successfully!';
        if (confirmedTransaction) {
          transactionDetails = {
            id: confirmedTransaction.id,
            status: confirmedTransaction.status,
            receipt_number: confirmedTransaction.receipt_number,
            confirmed_at: confirmedTransaction.confirmed_at,
            payment_channel: confirmedTransaction.payment_channel,
            amount: confirmedTransaction.amount,
            payer_phone: confirmedTransaction.payer_phone
          };
        }
        break;
        
      case 'FAILED':
        message = failedTransaction?.failure_reason || 'Payment failed. Please try again.';
        break;
        
      case 'EXPIRED':
        message = 'Payment request has expired. Please initiate a new payment.';
        break;
        
      default:
        message = 'Unknown payment status';
    }
    
    // Build response
    const response: PaymentStatusResponse = {
      success: true,
      status: currentStatus,
      message: message,
      amount: intent.expected_amount,
      payment_reference: intent.payment_reference,
      confirmed_at: intent.confirmed_at,
      transaction: transactionDetails
    };
    
    console.log(`[Payment Status] Returning status: ${currentStatus}`);
    
    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { 
          ...corsHeaders, 
          ...rateLimitHeaders,
          'Content-Type': 'application/json' 
        }
      }
    );
    
  } catch (error) {
    console.error('[Payment Status] Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        status: 'FAILED',
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Internal server error'
      } as PaymentStatusResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
