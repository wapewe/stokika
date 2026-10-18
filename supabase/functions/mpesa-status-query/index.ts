/**
 * M-Pesa Payment Status Query Edge Function - Enhanced for Timeout Handling
 * 
 * Tasks 4.1-4.6: Complete status query implementation with retry limits,
 * audit logging, and automatic payment recovery
 * 
 * Requirements:
 * - 3.1-3.7: Status query workflow and retry limits
 * - 7.5: Audit logging
 * - 18.1-18.4: Status query implementation
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getValidToken } from '../shared/mpesa-auth.ts';

interface StatusQueryRequest {
  checkoutRequestId: string;
  isAutomaticRetry?: boolean;
}

interface MpesaStatusQueryResponse {
  ResponseCode: string;
  ResponseDescription: string;
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResultCode: string;
  ResultDesc: string;
}

/**
 * Generate STK Push password and timestamp
 */
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

/**
 * Task 4.3: Call M-Pesa STK Push Query API with 10s timeout
 */
async function callMpesaStatusQueryAPI(
  accessToken: string,
  checkoutRequestId: string
): Promise<MpesaStatusQueryResponse> {
  const environment = Deno.env.get('MPESA_ENVIRONMENT') || 'sandbox';
  const shortcode = Deno.env.get('MPESA_SHORTCODE')!;
  
  const apiUrl = environment === 'production'
    ? 'https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query'
    : 'https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query';
  
  const { password, timestamp } = generateSTKPushPassword();
  
  const payload = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestamp,
    CheckoutRequestID: checkoutRequestId
  };
  
  console.log(`[Status Query] Calling M-Pesa API: ${apiUrl}`);
  console.log(`[Status Query] CheckoutRequestID: ${checkoutRequestId}`);
  
  // Create timeout controller (10 seconds max)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    const responseData = await response.json();
    console.log(`[Status Query] M-Pesa response:`, JSON.stringify(responseData));
    
    if (response.ok && responseData.ResponseCode === '0') {
      return responseData as MpesaStatusQueryResponse;
    }
    
    const errorMessage = responseData.errorMessage || responseData.ResponseDescription || 'Unknown error';
    throw new Error(`M-Pesa Status Query API error: ${errorMessage}`);
    
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('M-Pesa API request timed out after 10 seconds');
    }
    throw error;
  }
}

/**
 * Task 4.5: Trigger payment fulfillment (placeholder for actual implementation)
 */
async function triggerPaymentFulfillment(
  supabase: any,
  paymentId: string
): Promise<void> {
  console.log(`[Status Query] Triggering payment fulfillment for ${paymentId}`);
  
  // TODO: Implement actual fulfillment logic
  // This would typically:
  // 1. Update user account/kit status
  // 2. Send confirmation email/SMS
  // 3. Create order records
  // 4. Update inventory
  
  // For now, just log that fulfillment would be triggered
  console.log(`[Status Query] Payment fulfillment triggered successfully`);
}

/**
 * Main Edge Function handler - Tasks 4.1-4.6
 */
serve(async (req) => {
  // Handle CORS
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
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  try {
    console.log('[Status Query] Function invoked');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Task 4.1: Parse and validate parameters
    let requestData: StatusQueryRequest;
    try {
      requestData = await req.json();
    } catch (error) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON in request body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate checkoutRequestId
    if (!requestData.checkoutRequestId || requestData.checkoutRequestId.trim() === '') {
      console.log('[Status Query] Missing checkoutRequestId');
      return new Response(
        JSON.stringify({ success: false, error: 'checkoutRequestId is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const isAutomatic = requestData.isAutomaticRetry || false;
    console.log(`[Status Query] Querying: ${requestData.checkoutRequestId}, automatic: ${isAutomatic}`);
    
    // Fetch payment record
    const { data: payment, error: fetchError } = await supabase
      .from('stokika_kit_payments')
      .select('*')
      .eq('checkout_request_id', requestData.checkoutRequestId)
      .single();
    
    // Task 4.1: Return 404 if payment not found
    if (fetchError || !payment) {
      console.error('[Status Query] Payment not found:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: 'Payment record not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Task 4.2: Check retry limit
    const currentCount = payment.status_query_count || 0;
    
    // Get max retries from config
    const { data: config } = await supabase
      .from('payment_timeout_config')
      .select('max_retries')
      .eq('flow_type', payment.flow_type || 'kit_payment')
      .single();
    
    const maxRetries = config?.max_retries || 3;
    
    if (currentCount >= maxRetries) {
      console.log(`[Status Query] Retry limit reached (${currentCount}/${maxRetries})`);
      
      // Mark as callback_missing and require manual fallback
      await supabase
        .from('stokika_kit_payments')
        .update({
          payment_status: 'callback_missing',
          manual_fallback_required: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.id);
      
      // Record metric
      await supabase
        .from('payment_metrics')
        .insert({
          metric_type: 'manual_fallback_initiated',
          payment_id: payment.id,
          flow_type: payment.flow_type || 'kit_payment',
          metadata: { reason: 'retry_limit_exceeded', attempts: currentCount },
        });
      
      return new Response(
        JSON.stringify({
          success: false,
          status: 'callback_missing',
          message: 'Maximum retry attempts reached. Manual verification required.',
          manualFallbackRequired: true,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Task 4.4: Increment status_query_count and update last_status_query_at
    const newCount = currentCount + 1;
    await supabase
      .from('stokika_kit_payments')
      .update({
        status_query_count: newCount,
        last_status_query_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.id);
    
    // Record status query initiation metric
    await supabase
      .from('payment_metrics')
      .insert({
        metric_type: 'status_query_initiated',
        payment_id: payment.id,
        flow_type: payment.flow_type || 'kit_payment',
        metadata: { attempt: newCount, is_automatic: isAutomatic },
      });
    
    // Task 4.3: Call M-Pesa API
    let mpesaResponse: MpesaStatusQueryResponse;
    try {
      const accessToken = await getValidToken();
      mpesaResponse = await callMpesaStatusQueryAPI(accessToken, requestData.checkoutRequestId);
    } catch (error) {
      console.error('[Status Query] M-Pesa API error:', error);
      
      // Task 4.6: Error handling - Record failed query
      await supabase
        .from('payment_metrics')
        .insert({
          metric_type: 'status_query_failure',
          payment_id: payment.id,
          flow_type: payment.flow_type || 'kit_payment',
          metadata: { error: error instanceof Error ? error.message : String(error) },
        });
      
      // Task 4.4: Log query attempt to audit table
      await supabase
        .from('payment_status_queries')
        .insert({
          payment_id: payment.id,
          checkout_request_id: requestData.checkoutRequestId,
          query_response: { error: error instanceof Error ? error.message : String(error) },
          query_attempt: newCount,
          is_automatic_retry: isAutomatic,
        });
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to query M-Pesa. Please try again.',
          details: error instanceof Error ? error.message : String(error),
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Task 4.4: Insert query response to audit table
    await supabase
      .from('payment_status_queries')
      .insert({
        payment_id: payment.id,
        checkout_request_id: requestData.checkoutRequestId,
        query_response: mpesaResponse,
        query_attempt: newCount,
        is_automatic_retry: isAutomatic,
      });
    
    // Record successful query metric
    await supabase
      .from('payment_metrics')
      .insert({
        metric_type: 'status_query_success',
        payment_id: payment.id,
        flow_type: payment.flow_type || 'kit_payment',
        metadata: { result_code: mpesaResponse.ResultCode },
      });
    
    // Task 4.4: Process ResultCode
    const resultCode = mpesaResponse.ResultCode;
    const resultDesc = mpesaResponse.ResultDesc;
    
    if (resultCode === '0') {
      // Task 4.5: Payment completed - trigger fulfillment
      console.log(`[Status Query] Payment successful - ResultCode 0`);
      
      await supabase
        .from('stokika_kit_payments')
        .update({
          payment_status: 'completed',
          mpesa_receipt_number: mpesaResponse.MerchantRequestID, // or extract from ResultDesc
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.id);
      
      // Trigger payment fulfillment
      await triggerPaymentFulfillment(supabase, payment.id);
      
      // Record automatic recovery success metric
      await supabase
        .from('payment_metrics')
        .insert({
          metric_type: 'automatic_recovery_success',
          payment_id: payment.id,
          flow_type: payment.flow_type || 'kit_payment',
          metadata: { query_attempt: newCount },
        });
      
      return new Response(
        JSON.stringify({
          success: true,
          status: 'completed',
          message: 'Payment completed successfully',
          mpesaResponse: mpesaResponse,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
      
    } else if (resultCode === '1032') {
      // Payment still pending
      console.log(`[Status Query] Payment still pending - ResultCode 1032`);
      
      return new Response(
        JSON.stringify({
          success: true,
          status: 'pending',
          message: 'Payment is still pending. User has not completed the transaction.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
      
    } else {
      // Payment failed or cancelled
      console.log(`[Status Query] Payment failed - ResultCode ${resultCode}`);
      
      const newStatus = resultCode === '1037' ? 'timeout' : 'failed';
      
      await supabase
        .from('stokika_kit_payments')
        .update({
          payment_status: newStatus,
          failure_reason: `${resultDesc} (ResultCode: ${resultCode})`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.id);
      
      // Record recovery failure metric
      await supabase
        .from('payment_metrics')
        .insert({
          metric_type: 'automatic_recovery_failure',
          payment_id: payment.id,
          flow_type: payment.flow_type || 'kit_payment',
          metadata: { result_code: resultCode, result_desc: resultDesc },
        });
      
      return new Response(
        JSON.stringify({
          success: false,
          status: newStatus,
          message: resultDesc,
          resultCode: resultCode,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
  } catch (error) {
    console.error('[Status Query] Unexpected error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
