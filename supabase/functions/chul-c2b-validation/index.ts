/**
 * M-Pesa C2B Validation Edge Function
 * 
 * Endpoint: https://eidsqrnwfndruuufyacc.supabase.co/functions/v1/mpesa-c2b-validation
 * 
 * This function is called by Safaricom BEFORE a C2B transaction is processed.
 * It validates whether the transaction can be accepted.
 * 
 * IMPORTANT: This function does NOT mark anything as paid. It only validates.
 * Actual payment processing happens in mpesa-c2b-confirmation.
 * 
 * Requirements: #8 - C2B Validation Function
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

/**
 * C2B Validation Request from Safaricom
 */
interface C2BValidationRequest {
  TransactionType: string;
  TransID: string;
  TransTime: string;
  TransAmount: string;
  BusinessShortCode: string;
  BillRefNumber: string;
  InvoiceNumber?: string;
  OrgAccountBalance?: string;
  ThirdPartyTransID?: string;
  MSISDN: string;
  FirstName?: string;
  MiddleName?: string;
  LastName?: string;
}

/**
 * C2B Validation Response to Safaricom
 */
interface C2BValidationResponse {
  ResultCode: number; // 0 = Accept, other = Reject
  ResultDesc: string;
}

/**
 * Validate C2B request structure
 */
function validateC2BPayload(payload: any): { valid: boolean; error?: string } {
  // Check required fields
  if (!payload.TransID) {
    return { valid: false, error: 'Missing TransID' };
  }
  
  if (!payload.TransAmount) {
    return { valid: false, error: 'Missing TransAmount' };
  }
  
  if (!payload.BusinessShortCode) {
    return { valid: false, error: 'Missing BusinessShortCode' };
  }
  
  if (!payload.BillRefNumber) {
    return { valid: false, error: 'Missing BillRefNumber (Account Reference)' };
  }
  
  if (!payload.MSISDN) {
    return { valid: false, error: 'Missing MSISDN (phone number)' };
  }
  
  return { valid: true };
}

/**
 * Validate business shortcode
 */
function validateShortCode(shortCode: string): boolean {
  const expectedShortCode = Deno.env.get('MPESA_PAYBILL_NUMBER') || '1140839';
  return shortCode === expectedShortCode;
}

/**
 * Validate amount is reasonable
 */
function validateAmount(amount: string): { valid: boolean; error?: string } {
  const numAmount = parseFloat(amount);
  
  if (isNaN(numAmount)) {
    return { valid: false, error: 'Invalid amount format' };
  }
  
  if (numAmount <= 0) {
    return { valid: false, error: 'Amount must be greater than zero' };
  }
  
  // Set reasonable limits
  const minAmount = 1;
  const maxAmount = 150000; // KES 150,000
  
  if (numAmount < minAmount) {
    return { valid: false, error: `Amount below minimum (KES ${minAmount})` };
  }
  
  if (numAmount > maxAmount) {
    return { valid: false, error: `Amount exceeds maximum (KES ${maxAmount})` };
  }
  
  return { valid: true };
}

/**
 * Validate phone number format
 */
function validatePhoneNumber(msisdn: string): boolean {
  // Accept formats: 254XXXXXXXXX or 254XXXXXXXXX
  const phoneRegex = /^254[0-9]{9}$/;
  return phoneRegex.test(msisdn);
}

/**
 * Validate account reference format
 */
function validateAccountReference(reference: string): { valid: boolean; error?: string } {
  if (!reference || reference.trim() === '') {
    return { valid: false, error: 'Account reference is required' };
  }
  
  // Must be reasonable length
  if (reference.length < 3 || reference.length > 50) {
    return { valid: false, error: 'Account reference must be 3-50 characters' };
  }
  
  // Check if it looks like a Stokika reference (STK-*)
  // But don't reject if it doesn't - user might use custom reference
  
  return { valid: true };
}

/**
 * Main Edge Function handler
 */
serve(async (req) => {
  const startTime = Date.now();
  
  // Handle CORS preflight
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
  
  // Only accept POST requests
  if (req.method !== 'POST') {
    console.error('[C2B Validation] Invalid method:', req.method);
    return new Response(
      JSON.stringify({
        ResultCode: 1,
        ResultDesc: 'Method not allowed'
      }),
      {
        status: 200, // Always return 200 to M-Pesa
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  try {
    console.log('[C2B Validation] Function invoked');
    
    // Parse request body
    let c2bRequest: C2BValidationRequest;
    try {
      c2bRequest = await req.json();
    } catch (error) {
      console.error('[C2B Validation] Invalid JSON:', error);
      return new Response(
        JSON.stringify({
          ResultCode: 1,
          ResultDesc: 'Invalid request format'
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Log request (sanitize sensitive data)
    console.log('[C2B Validation] Request received:', {
      TransID: c2bRequest.TransID,
      TransAmount: c2bRequest.TransAmount,
      BillRefNumber: c2bRequest.BillRefNumber,
      MSISDN: c2bRequest.MSISDN?.replace(/(\d{3})(\d{6})(\d{3})/, '$1XXX$3'),
      TransTime: c2bRequest.TransTime
    });
    
    // 1. Validate payload structure
    const structureValidation = validateC2BPayload(c2bRequest);
    if (!structureValidation.valid) {
      console.error('[C2B Validation] Invalid payload structure:', structureValidation.error);
      return new Response(
        JSON.stringify({
          ResultCode: 1,
          ResultDesc: structureValidation.error
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // 2. Validate business shortcode
    if (!validateShortCode(c2bRequest.BusinessShortCode)) {
      console.error('[C2B Validation] Invalid shortcode:', c2bRequest.BusinessShortCode);
      return new Response(
        JSON.stringify({
          ResultCode: 1,
          ResultDesc: 'Invalid business shortcode'
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // 3. Validate amount
    const amountValidation = validateAmount(c2bRequest.TransAmount);
    if (!amountValidation.valid) {
      console.error('[C2B Validation] Invalid amount:', amountValidation.error);
      return new Response(
        JSON.stringify({
          ResultCode: 1,
          ResultDesc: amountValidation.error
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // 4. Validate phone number
    if (!validatePhoneNumber(c2bRequest.MSISDN)) {
      console.error('[C2B Validation] Invalid phone number format');
      return new Response(
        JSON.stringify({
          ResultCode: 1,
          ResultDesc: 'Invalid phone number format'
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // 5. Validate account reference
    const referenceValidation = validateAccountReference(c2bRequest.BillRefNumber);
    if (!referenceValidation.valid) {
      console.error('[C2B Validation] Invalid account reference:', referenceValidation.error);
      return new Response(
        JSON.stringify({
          ResultCode: 1,
          ResultDesc: referenceValidation.error
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // All validations passed
    const responseTime = Date.now() - startTime;
    console.log('[C2B Validation] Transaction accepted:', {
      TransID: c2bRequest.TransID,
      Amount: c2bRequest.TransAmount,
      Reference: c2bRequest.BillRefNumber,
      ResponseTimeMs: responseTime
    });
    
    // Return success response to Safaricom
    return new Response(
      JSON.stringify({
        ResultCode: 0,
        ResultDesc: 'Accepted'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error) {
    console.error('[C2B Validation] Unexpected error:', error);
    
    // On unexpected error, accept the transaction
    // Confirmation endpoint will handle any issues
    return new Response(
      JSON.stringify({
        ResultCode: 0,
        ResultDesc: 'Accepted'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});
