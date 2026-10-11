/**
 * M-Pesa STK Push Edge Function (Enhanced with Timeout Tracking)
 * 
 * This Supabase Edge Function initiates M-Pesa STK Push payments for kit
 * registrations and order payments. It handles authentication, validation,
 * rate limiting, and secure communication with the M-Pesa Daraja API.
 * 
 * ENHANCEMENTS (Section 9):
 * - 9.1: Retrieve timeout configuration before STK Push
 * - 9.2: Accept and store flow_type parameter
 * - 9.3: Record payment initiation timestamp
 * - 9.4: Record payment initiation metrics
 * - Store timeout configuration with payment record
 * 
 * Original Requirements:
 * - 2.1-2.8: STK Push payment initiation and processing
 * - 3.4: Rate limiting per user and phone number
 * - 11.1-11.3: Multi-level rate limiting and amount validation
 * - 24.1-24.4: Error handling with retry logic
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getValidToken, validateCredentials } from '../shared/mpesa-auth.ts';

// Timeout configuration interface
interface TimeoutConfig {
  flow_type: string;
  timeout_duration: number;
  max_retries: number;
  retry_interval: number;
}

// Default timeout configuration (fallback)
const DEFAULT_TIMEOUT_CONFIG: TimeoutConfig = {
  flow_type: 'kit_payment',
  timeout_duration: 60,
  max_retries: 3,
  retry_interval: 15
};

function validateAmount(amount: number): { valid: boolean; error?: string } {
  if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
    return { valid: false, error: 'Amount must be greater than 0' };
  }
  return { valid: true };
}

async function checkRateLimit(
  supabase: any,
  identifier: string,
  type: 'user' | 'phone'
): Promise<{ allowed: boolean; reason?: string; retryAfter?: number }> {
  const windowSeconds = type === 'user' ? 600 : 3600;
  const maxRequests = type === 'user' ? 3 : 5;
  const key = `stk_${type}:${identifier}`;
  const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString();

  try {
    const { count, error } = await supabase
      .from('rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('key', key)
      .gte('created_at', windowStart);

    if (error) {
      return { allowed: true };
    }

    if ((count || 0) >= maxRequests) {
      return {
        allowed: false,
        reason: `Too many payment requests for this ${type}. Please try again later.`,
        retryAfter: windowSeconds
      };
    }

    return { allowed: true };
  } catch (_) {
    return { allowed: true };
  }
}

async function recordPaymentAttempt(
  supabase: any,
  identifier: string,
  type: 'user' | 'phone'
): Promise<void> {
  const key = `stk_${type}:${identifier}`;
  try {
    await supabase.from('rate_limits').insert({
      key,
      ip_address: identifier,
      namespace: `stk_${type}`,
      created_at: new Date().toISOString()
    });
  } catch (_) {}
}

/**
 * Retrieve timeout configuration for flow type
 * 
 * Section 9.1: Query payment_timeout_config table
 * Falls back to default if query fails
 */
async function getTimeoutConfig(
  supabase: any,
  flowType: string
): Promise<TimeoutConfig> {
  try {
    console.log(`[STK Push] Retrieving timeout config for flow: ${flowType}`);
    
    const { data, error } = await supabase
      .from('payment_timeout_config')
      .select('*')
      .eq('flow_type', flowType)
      .single();
    
    if (error || !data) {
      console.warn(`[STK Push] Failed to retrieve timeout config, using defaults:`, error?.message);
      return { ...DEFAULT_TIMEOUT_CONFIG, flow_type: flowType };
    }
    
    console.log(`[STK Push] Timeout config retrieved:`, data);
    return data as TimeoutConfig;
  } catch (error) {
    console.error(`[STK Push] Error retrieving timeout config:`, error);
    return { ...DEFAULT_TIMEOUT_CONFIG, flow_type: flowType };
  }
}

/**
 * Record payment initiation metric
 * 
 * Section 9.4: Insert metric record for STK Push initiation
 */
async function recordPaymentInitiationMetric(
  supabase: any,
  paymentId: string,
  flowType: string,
  metadata: any
): Promise<void> {
  try {
    await supabase.from('payment_metrics').insert({
      metric_type: 'payment_initiated',
      payment_id: paymentId,
      flow_type: flowType,
      metadata: metadata
    });
    console.log(`[STK Push] Payment initiation metric recorded`);
  } catch (error) {
    console.error(`[STK Push] Failed to record metric:`, error);
  }
}

/**
 * STK Push request interface
 * 
 * ENHANCED: Added flowType parameter (Section 9.2)
 */
interface STKPushRequest {
  phoneNumber: string;      // Format: 254XXXXXXXXX
  amount: number;           // KES amount
  applicationCode?: string; // User application code or payment reference
  userType: 'field_agent' | 'supervisor' | 'vendor';
  accountReference?: string; // Optional, defaults to generated reference
  paymentIntentId?: string; // Optional, passed if payment_intents already created
  transactionDesc?: string;
  flowType?: string;        // NEW: Payment flow type (kit_payment, vendor_registration, etc.)
}

/**
 * STK Push response interface
 */
interface STKPushResponse {
  success: boolean;
  checkoutRequestId?: string;
  merchantRequestId?: string;
  responseCode?: string;
  responseDescription?: string;
  customerMessage?: string;
  error?: string;
  retryAfter?: number;
  timeoutConfig?: TimeoutConfig; // NEW: Return timeout config to client
}

/**
 * M-Pesa API response interface
 */
interface MpesaSTKPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

/**
 * Phone number validation regex
 */
const PHONE_REGEX = /^254[0-9]{9}$/;

/**
 * Kit prices by user type
 */
const KIT_PRICES = {
  field_agent: 2050,
  supervisor: 3050,
  vendor: 1050
};

/**
 * Normalize phone number to 254XXXXXXXXX format
 */
function normalizePhoneNumber(phone: string): string {
  if (!phone || typeof phone !== 'string') return '';
  let clean = phone.replace(/[\s\-\(\)\+]/g, '');
  if (clean.startsWith('0')) {
    clean = '254' + clean.substring(1);
  } else if ((clean.startsWith('7') || clean.startsWith('1')) && clean.length === 9) {
    clean = '254' + clean;
  }
  return clean;
}

/**
 * Validate STK Push request data
 */
function validateRequest(request: STKPushRequest): { valid: boolean; error?: string } {
  // Validate phone number format
  if (!request.phoneNumber || !PHONE_REGEX.test(request.phoneNumber)) {
    return {
      valid: false,
      error: 'Invalid phone number format. Must be 254XXXXXXXXX (e.g., 254712345678)'
    };
  }
  
  // Validate user type
  if (!request.userType || !['field_agent', 'supervisor', 'vendor'].includes(request.userType)) {
    return {
      valid: false,
      error: 'Invalid user type. Must be "field_agent", "supervisor", or "vendor"'
    };
  }
  
  // Validate amount matches expected price (skip for registration flows)
  const expectedAmount = KIT_PRICES[request.userType];
  const isRegistrationFlow = request.flowType === 'vendor_registration';
  
  if (!isRegistrationFlow && request.amount !== expectedAmount) {
    return {
      valid: false,
      error: `Invalid amount. ${request.userType} payment is KES ${expectedAmount}`
    };
  }
  
  // Validate application code or payment intent ID
  if (!request.applicationCode && !request.paymentIntentId) {
    return {
      valid: false,
      error: 'Application code or payment intent ID is required'
    };
  }
  
  // Validate amount range (general check)
  const amountValidation = validateAmount(request.amount);
  if (!amountValidation.valid) {
    return amountValidation;
  }
  
  return { valid: true };
}

/**
 * Create payment intent and transaction records
 * 
 * ENHANCED: Store flow_type and timeout config with payment (Section 9.2)
 */
async function createPaymentRecords(
  supabase: any,
  request: STKPushRequest,
  timeoutConfig: TimeoutConfig
): Promise<{ intentId: string; transactionId: string; referenceCode: string; kitPaymentId?: string }> {
  const flowType = request.flowType || 'kit_payment';
  
  // If payment intent already exists (e.g. from vendor registration)
  if (request.paymentIntentId || request.userType === 'vendor') {
    const intentId = request.paymentIntentId;
    let referenceCode = request.accountReference || request.applicationCode || 'REGISTRATION';
    let profileId: string | null = null;
    let vendorId: string | null = null;

    if (intentId) {
      const { data: intent } = await supabase
        .from('payment_intents')
        .select('id, payment_reference, profile_id, vendor_id')
        .eq('id', intentId)
        .single();
      
      if (intent) {
        referenceCode = intent.payment_reference;
        profileId = intent.profile_id;
        vendorId = intent.vendor_id;
      }
    }

    // Create payment transaction for STK Push
    const { data: transaction, error: transactionError } = await supabase
      .from('payment_transactions')
      .insert({
        payment_intent_id: intentId || null,
        profile_id: profileId,
        vendor_id: vendorId,
        provider: 'MPESA',
        transaction_type: 'STK_PUSH',
        payment_channel: 'STK_PUSH',
        amount: request.amount,
        currency: 'KES',
        payer_phone: request.phoneNumber,
        account_reference: referenceCode,
        status: 'PENDING',
        metadata: {
          user_type: request.userType,
          payment_purpose: 'REGISTRATION',
          flow_type: flowType,
          timeout_config: timeoutConfig,
          initiated_at: new Date().toISOString()
        }
      })
      .select('id')
      .single();

    if (transactionError || !transaction) {
      throw new Error(`Failed to create payment transaction: ${transactionError?.message || 'Unknown error'}`);
    }

    if (intentId) {
      await supabase.from('payment_events').insert({
        payment_intent_id: intentId,
        payment_transaction_id: transaction.id,
        event_type: 'STK_INITIATED',
        provider: 'MPESA',
        event_data: {
          phone_number: request.phoneNumber,
          amount: request.amount,
          flow_type: flowType,
          timeout_duration: timeoutConfig.timeout_duration
        }
      });
    }

    return {
      intentId: intentId || transaction.id,
      transactionId: transaction.id,
      referenceCode
    };
  }

  // Determine payment purpose based on user type
  const paymentPurpose = request.userType === 'field_agent' 
    ? 'FIELD_AGENT_KIT' 
    : 'SUPERVISOR_KIT';
  
  // Generate unique reference using database function
  const { data: refData, error: refError } = await supabase
    .rpc('generate_payment_reference', { purpose: paymentPurpose });
  
  if (refError || !refData) {
    throw new Error(`Failed to generate payment reference: ${refError?.message || 'Unknown error'}`);
  }
  
  const referenceCode = refData;
  console.log(`[STK Push] Generated payment reference: ${referenceCode}`);
  
  // Get user info based on application code
  const userTable = request.userType === 'field_agent' ? 'field_agents' : 'supervisors';
  const { data: userData, error: userError } = await supabase
    .from(userTable)
    .select('id, user_id')
    .eq('application_code', request.applicationCode)
    .single();
  
  if (userError || !userData) {
    throw new Error(`User not found for application code: ${request.applicationCode}`);
  }
  
  // Create payment intent (the obligation)
  const { data: intent, error: intentError } = await supabase
    .from('payment_intents')
    .insert({
      payment_reference: referenceCode,
      user_id: userData.user_id,
      [request.userType === 'field_agent' ? 'field_agent_id' : 'supervisor_id']: userData.id,
      payment_purpose: paymentPurpose,
      expected_amount: request.amount,
      currency: 'KES',
      status: 'PROCESSING',
      description: `${request.userType.replace('_', ' ')} kit payment`,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      metadata: {
        application_code: request.applicationCode,
        initiated_via: 'STK_PUSH',
        flow_type: flowType,
        timeout_config: timeoutConfig
      }
    })
    .select('id')
    .single();
  
  if (intentError || !intent) {
    throw new Error(`Failed to create payment intent: ${intentError?.message || 'Unknown error'}`);
  }
  
  console.log(`[STK Push] Payment intent created: ${intent.id}`);
  
  // Create payment transaction (pending STK Push)
  const { data: transaction, error: transactionError } = await supabase
    .from('payment_transactions')
    .insert({
      payment_intent_id: intent.id,
      user_id: userData.user_id,
      [request.userType === 'field_agent' ? 'field_agent_id' : 'supervisor_id']: userData.id,
      provider: 'MPESA',
      transaction_type: 'STK_PUSH',
      payment_channel: 'STK_PUSH',
      amount: request.amount,
      currency: 'KES',
      payer_phone: request.phoneNumber,
      account_reference: referenceCode,
      status: 'PENDING',
      metadata: {
        application_code: request.applicationCode,
        user_type: request.userType,
        flow_type: flowType,
        timeout_config: timeoutConfig,
        initiated_at: new Date().toISOString()
      }
    })
    .select('id')
    .single();
  
  if (transactionError || !transaction) {
    throw new Error(`Failed to create payment transaction: ${transactionError?.message || 'Unknown error'}`);
  }
  
  console.log(`[STK Push] Payment transaction created: ${transaction.id}`);
  
  // Log intent created event
  await supabase.from('payment_events').insert({
    payment_intent_id: intent.id,
    event_type: 'INTENT_CREATED',
    provider: 'MPESA',
    event_data: {
      payment_purpose: paymentPurpose,
      expected_amount: request.amount,
      payment_channel: 'STK_PUSH',
      flow_type: flowType
    }
  });
  
  // Log STK initiated event
  await supabase.from('payment_events').insert({
    payment_intent_id: intent.id,
    payment_transaction_id: transaction.id,
    event_type: 'STK_INITIATED',
    provider: 'MPESA',
    event_data: {
      phone_number: request.phoneNumber,
      amount: request.amount,
      flow_type: flowType,
      timeout_duration: timeoutConfig.timeout_duration
    }
  });

  // For field agents and supervisors, maintain stokika_kit_payments with timeout tracking
  let kitPaymentId: string = intent.id;
  try {
    const now = new Date().toISOString();
    const { data: kitPayment } = await supabase
      .from('stokika_kit_payments')
      .insert({
        application_code: request.applicationCode,
        phone_number: request.phoneNumber,
        kit_amount: request.amount,
        user_type: request.userType,
        payment_status: 'pending',
        payment_method: 'mpesa_stk',
        flow_type: flowType,
        created_at: now,
        updated_at: now
      })
      .select('id')
      .single();
    if (kitPayment?.id) {
      kitPaymentId = kitPayment.id;
    }
  } catch (kitErr) {
    console.warn('[STK Push] Notice: stokika_kit_payments insert skipped:', kitErr);
  }
  
  return {
    intentId: intent.id,
    transactionId: transaction.id,
    referenceCode,
    kitPaymentId
  };
}

function generateSTKPushPassword(): { password: string; timestamp: string } {
  const shortcode = Deno.env.get('MPESA_SHORTCODE')!;
  const passkey = Deno.env.get('MPESA_PASSKEY')!;
  
  const now = new Date();
  const timestamp = now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    now.getDate().toString().padStart(2, '0') +
    now.getHours().toString().padStart(2, '0') +
    now.getMinutes().toString().padStart(2, '0') +
    now.getSeconds().toString().padStart(2, '0');
  
  const rawPassword = shortcode + passkey + timestamp;
  const password = btoa(rawPassword);
  
  return { password, timestamp };
}

async function callMpesaSTKPushAPI(
  accessToken: string,
  request: STKPushRequest,
  referenceCode: string
): Promise<MpesaSTKPushResponse> {
  const environment = Deno.env.get('MPESA_ENVIRONMENT') || 'sandbox';
  const shortcode = Deno.env.get('MPESA_SHORTCODE')!;
  const callbackUrl = Deno.env.get('MPESA_CALLBACK_URL') || 
    `${Deno.env.get('SUPABASE_URL')}/functions/v1/mpesa-stk-callback`;
  
  const apiUrl = environment === 'production'
    ? 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
    : 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';
  
  const { password, timestamp } = generateSTKPushPassword();
  
  const payload = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: request.amount,
    PartyA: request.phoneNumber,
    PartyB: shortcode,
    PhoneNumber: request.phoneNumber,
    CallBackURL: callbackUrl,
    AccountReference: request.accountReference || referenceCode,
    TransactionDesc: request.transactionDesc || `Stokika ${request.userType.replace('_', ' ')} payment`
  };
  
  console.log(`[STK Push] Calling M-Pesa API: ${apiUrl}`);
  
  const maxRetries = 3;
  const retryDelays = [1000, 2000, 4000];
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const responseData = await response.json();
      
      console.log(`[STK Push] M-Pesa response (attempt ${attempt}):`, JSON.stringify(responseData));
      
      if (response.ok && responseData.ResponseCode === '0') {
        return responseData as MpesaSTKPushResponse;
      }
      
      const errorMessage = responseData.errorMessage || responseData.ResponseDescription || 'Unknown error';
      const error = new Error(`M-Pesa API error: ${errorMessage}`);
      
      if (response.status >= 500 || response.status === 429) {
        lastError = error;
        console.error(`[STK Push] Retryable error on attempt ${attempt}:`, error.message);
        
        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after');
          if (retryAfter && attempt < maxRetries) {
            const delay = parseInt(retryAfter) * 1000;
            console.log(`[STK Push] Rate limited, waiting ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        
        if (attempt < maxRetries) {
          const delay = retryDelays[attempt - 1];
          console.log(`[STK Push] Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      } else {
        console.error('[STK Push] Non-retryable M-Pesa error:', error.message);
        throw error;
      }
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[STK Push] Error on attempt ${attempt}:`, lastError.message);
      
      if (attempt < maxRetries) {
        const delay = retryDelays[attempt - 1];
        console.log(`[STK Push] Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
  }
  
  console.error('[STK Push] All retry attempts exhausted');
  throw new Error(
    `Failed to initiate STK Push after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`
  );
}

async function updatePaymentTransaction(
  supabase: any,
  transactionId: string,
  intentId: string,
  mpesaResponse?: MpesaSTKPushResponse,
  isError?: boolean
): Promise<void> {
  if (isError) {
    const { error } = await supabase
      .from('payment_transactions')
      .update({
        status: 'FAILED',
        failure_reason: mpesaResponse?.ResponseDescription || 'STK Push initiation failed',
        updated_at: new Date().toISOString()
      })
      .eq('id', transactionId);
    
    if (error) {
      console.error('[STK Push] Failed to update payment transaction as failed:', error);
    } else {
      console.log(`[STK Push] Payment transaction ${transactionId} marked as failed`);
    }
    
    await supabase
      .from('payment_intents')
      .update({
        status: 'FAILED',
        updated_at: new Date().toISOString()
      })
      .eq('id', intentId);
    
    await supabase.from('payment_events').insert({
      payment_intent_id: intentId,
      payment_transaction_id: transactionId,
      event_type: 'STK_FAILED',
      provider: 'MPESA',
      event_data: {
        reason: mpesaResponse?.ResponseDescription || 'STK Push initiation failed'
      }
    });
    
  } else if (mpesaResponse) {
    const { error } = await supabase
      .from('payment_transactions')
      .update({
        checkout_request_id: mpesaResponse.CheckoutRequestID,
        merchant_request_id: mpesaResponse.MerchantRequestID,
        updated_at: new Date().toISOString()
      })
      .eq('id', transactionId);
    
    if (error) {
      console.error('[STK Push] Failed to update payment transaction with M-Pesa IDs:', error);
    } else {
      console.log(`[STK Push] Payment transaction ${transactionId} updated with CheckoutRequestID: ${mpesaResponse.CheckoutRequestID}`);
    }
    
    await supabase.from('payment_events').insert({
      payment_intent_id: intentId,
      payment_transaction_id: transactionId,
      event_type: 'STK_CALLBACK_RECEIVED',
      provider: 'MPESA',
      provider_transaction_id: mpesaResponse.CheckoutRequestID,
      event_data: {
        checkout_request_id: mpesaResponse.CheckoutRequestID,
        merchant_request_id: mpesaResponse.MerchantRequestID,
        response_description: mpesaResponse.ResponseDescription
      }
    });
  }
}

function getUserFriendlyErrorMessage(error: string): string {
  const errorLower = error.toLowerCase();
  
  if (errorLower.includes('insufficient') || errorLower.includes('balance')) {
    return 'Insufficient balance in M-Pesa account. Please top up and try again.';
  }
  
  if (errorLower.includes('invalid') && errorLower.includes('phone')) {
    return 'Invalid phone number. Please check and try again.';
  }
  
  if (errorLower.includes('timeout') || errorLower.includes('timed out')) {
    return 'Payment request timed out. Please try again.';
  }
  
  if (errorLower.includes('cancelled') || errorLower.includes('canceled')) {
    return 'Payment was cancelled. Please try again when ready.';
  }
  
  if (errorLower.includes('unavailable') || errorLower.includes('service')) {
    return 'M-Pesa service temporarily unavailable. Please try again in a few minutes.';
  }
  
  return 'Payment could not be processed. Please try again or contact support.';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
      }
    });
  }
  
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  try {
    console.log('[STK Push] Function invoked (Enhanced with Timeout Tracking)');
    
    validateCredentials();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    let requestData: STKPushRequest;
    try {
      requestData = await req.json();
    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid JSON in request body'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log('[STK Push] Request data received');
    
    // Normalize phone number
    if (requestData.phoneNumber) {
      requestData.phoneNumber = normalizePhoneNumber(requestData.phoneNumber);
    }
    
    console.log('[STK Push] Normalized phone:', requestData.phoneNumber?.replace(/(\d{3})(\d{3})(\d{3})/, '$1XXX$3'));
    
    // Validate request
    const validation = validateRequest(requestData);
    if (!validation.valid) {
      console.log('[STK Push] Validation failed:', validation.error);
      return new Response(
        JSON.stringify({
          success: false,
          error: validation.error
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // SECTION 9.1 & 9.2: Retrieve timeout configuration
    const flowType = requestData.flowType || 'kit_payment';
    const timeoutConfig = await getTimeoutConfig(supabase, flowType);
    console.log(`[STK Push] Using timeout config:`, timeoutConfig);
    
    // Check user rate limit
    if (requestData.userType !== 'vendor' && requestData.applicationCode) {
      const userRateLimit = await checkRateLimit(supabase, requestData.applicationCode, 'user');
      if (!userRateLimit.allowed) {
        console.log('[STK Push] User rate limit exceeded');
        return new Response(
          JSON.stringify({
            success: false,
            error: userRateLimit.reason,
            retryAfter: userRateLimit.retryAfter
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': String(userRateLimit.retryAfter || 600)
            }
          }
        );
      }
      await recordPaymentAttempt(supabase, requestData.applicationCode, 'user');
    }
    
    // Check phone rate limit
    const phoneRateLimit = await checkRateLimit(supabase, requestData.phoneNumber, 'phone');
    if (!phoneRateLimit.allowed) {
      console.log('[STK Push] Phone rate limit exceeded');
      return new Response(
        JSON.stringify({
          success: false,
          error: phoneRateLimit.reason,
          retryAfter: phoneRateLimit.retryAfter
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(phoneRateLimit.retryAfter || 3600)
          }
        }
      );
    }
    
    await recordPaymentAttempt(supabase, requestData.phoneNumber, 'phone');
    
    // Create payment records with timeout config
    const { intentId, transactionId, referenceCode, kitPaymentId } = await createPaymentRecords(
      supabase, 
      requestData, 
      timeoutConfig
    );
    
    // SECTION 9.4: Record payment initiation metric
    await recordPaymentInitiationMetric(supabase, kitPaymentId || intentId, flowType, {
      user_type: requestData.userType,
      amount: requestData.amount,
      phone_number: requestData.phoneNumber,
      timeout_duration: timeoutConfig.timeout_duration
    });
    
    try {
      const accessToken = await getValidToken();
      const mpesaResponse = await callMpesaSTKPushAPI(accessToken, requestData, referenceCode);
      
      await updatePaymentTransaction(supabase, transactionId, intentId, mpesaResponse);

      // Update stokika_kit_payments with checkout request ID
      if (kitPaymentId && mpesaResponse.CheckoutRequestID) {
        try {
          await supabase
            .from('stokika_kit_payments')
            .update({
              checkout_request_id: mpesaResponse.CheckoutRequestID,
              merchant_request_id: mpesaResponse.MerchantRequestID,
              payment_status: 'pending',
              updated_at: new Date().toISOString()
            })
            .eq('id', kitPaymentId);
        } catch (_) {}
      }
      
      const response: STKPushResponse & { paymentId?: string; paymentIntentId?: string } = {
        success: true,
        paymentId: kitPaymentId || intentId,
        paymentIntentId: intentId,
        checkoutRequestId: mpesaResponse.CheckoutRequestID,
        merchantRequestId: mpesaResponse.MerchantRequestID,
        responseCode: mpesaResponse.ResponseCode,
        responseDescription: mpesaResponse.ResponseDescription,
        customerMessage: mpesaResponse.CustomerMessage,
        timeoutConfig: timeoutConfig
      };
      
      console.log('[STK Push] Successfully initiated payment with timeout tracking');
      
      return new Response(
        JSON.stringify(response),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
    } catch (error) {
      console.error('[STK Push] M-Pesa API call failed:', error);
      
      await updatePaymentTransaction(supabase, transactionId, intentId, undefined, true);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      const userMessage = getUserFriendlyErrorMessage(errorMessage);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: userMessage
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
  } catch (error) {
    console.error('[STK Push] Unexpected error:', error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    const userMessage = getUserFriendlyErrorMessage(errorMessage);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: userMessage
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});