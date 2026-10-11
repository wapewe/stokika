/**
 * M-Pesa C2B Confirmation Edge Function
 * 
 * Endpoint: https://eidsqrnwfndruuufyacc.supabase.co/functions/v1/mpesa-c2b-confirmation
 * 
 * This function is called by Safaricom AFTER a C2B transaction is confirmed.
 * This is where the payment enters the Stokika payment ledger.
 * 
 * Process:
 * 1. Receive C2B confirmation from Safaricom
 * 2. Validate payload
 * 3. Check transaction uniqueness (idempotency)
 * 4. Create payment_transaction record
 * 5. Match to payment_intent using account reference
 * 6. Verify amount matches expected amount
 * 7. Create payment_allocation
 * 8. Update business obligation (stock cycle, kit payment, etc.)
 * 9. Create audit events
 * 10. Return acknowledgment to Safaricom
 * 
 * Requirements: #9 - C2B Confirmation Function
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

/**
 * C2B Confirmation Request from Safaricom
 */
interface C2BConfirmationRequest {
  TransactionType: string;
  TransID: string; // M-Pesa receipt number
  TransTime: string; // Format: YYYYMMDDHHmmss
  TransAmount: string;
  BusinessShortCode: string;
  BillRefNumber: string; // Account reference
  InvoiceNumber?: string;
  OrgAccountBalance?: string;
  ThirdPartyTransID?: string;
  MSISDN: string; // Phone number
  FirstName?: string;
  MiddleName?: string;
  LastName?: string;
}

/**
 * C2B Confirmation Response to Safaricom
 */
interface C2BConfirmationResponse {
  ResultCode: number; // Always 0 for acknowledgment
  ResultDesc: string;
}

/**
 * Parse M-Pesa transaction time to ISO timestamp
 */
function parseTransactionTime(transTime: string): string {
  try {
    if (transTime.length !== 14) {
      console.error('[C2B Confirmation] Invalid TransTime format:', transTime);
      return new Date().toISOString();
    }
    
    const year = transTime.substring(0, 4);
    const month = transTime.substring(4, 6);
    const day = transTime.substring(6, 8);
    const hour = transTime.substring(8, 10);
    const minute = transTime.substring(10, 12);
    const second = transTime.substring(12, 14);
    
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`).toISOString();
  } catch (error) {
    console.error('[C2B Confirmation] Error parsing TransTime:', error);
    return new Date().toISOString();
  }
}

/**
 * Extract payer name from C2B request
 */
function extractPayerName(request: C2BConfirmationRequest): string | null {
  const parts = [
    request.FirstName,
    request.MiddleName,
    request.LastName
  ].filter(Boolean);
  
  return parts.length > 0 ? parts.join(' ') : null;
}

/**
 * Extract IP address from request headers
 */
function extractIpAddress(req: Request): string | null {
  // Try multiple headers in order of preference
  const xForwardedFor = req.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return xForwardedFor.split(',')[0].trim();
  }
  
  const xRealIp = req.headers.get('x-real-ip');
  if (xRealIp) {
    return xRealIp.trim();
  }
  
  // Fallback to connection info (may not be available in all environments)
  return null;
}

/**
 * Extract user agent from request headers
 */
function extractUserAgent(req: Request): string | null {
  return req.headers.get('user-agent');
}

/**
 * Main Edge Function handler
 */
serve(async (req) => {
  const startTime = Date.now();
  
  // Extract IP address and user agent at the start for all events
  const ipAddress = extractIpAddress(req);
  const userAgent = extractUserAgent(req);
  
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
    console.error('[C2B Confirmation] Invalid method:', req.method);
    return new Response(
      JSON.stringify({
        ResultCode: 0, // Always acknowledge
        ResultDesc: 'Success'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  // Initialize Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    console.log('[C2B Confirmation] Function invoked');
    
    // Parse request body
    let c2bRequest: C2BConfirmationRequest;
    try {
      c2bRequest = await req.json();
    } catch (error) {
      console.error('[C2B Confirmation] Invalid JSON:', error);
      // Always acknowledge to prevent retries
      return new Response(
        JSON.stringify({
          ResultCode: 0,
          ResultDesc: 'Success'
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Log request (sanitize sensitive data)
    console.log('[C2B Confirmation] Request received:', {
      TransID: c2bRequest.TransID,
      TransAmount: c2bRequest.TransAmount,
      BillRefNumber: c2bRequest.BillRefNumber,
      MSISDN: c2bRequest.MSISDN?.replace(/(\d{3})(\d{6})(\d{3})/, '$1XXX$3'),
      TransTime: c2bRequest.TransTime
    });
    
    // Validate required fields
    if (!c2bRequest.TransID || !c2bRequest.TransAmount || !c2bRequest.BillRefNumber || !c2bRequest.MSISDN) {
      console.error('[C2B Confirmation] Missing required fields');
      return new Response(
        JSON.stringify({
          ResultCode: 0,
          ResultDesc: 'Success'
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Parse transaction data
    const transactionId = c2bRequest.TransID;
    const amount = parseFloat(c2bRequest.TransAmount);
    const accountReference = c2bRequest.BillRefNumber.trim();
    const phoneNumber = c2bRequest.MSISDN;
    const transactionTime = parseTransactionTime(c2bRequest.TransTime);
    const payerName = extractPayerName(c2bRequest);
    
    // ========================================================================
    // STEP 1: Check for duplicate transaction (IDEMPOTENCY)
    // ========================================================================
    const { data: existingTransaction, error: duplicateCheckError } = await supabase
      .from('payment_transactions')
      .select('id, status, created_at')
      .eq('provider', 'MPESA')
      .eq('provider_transaction_id', transactionId)
      .single();
    
    if (existingTransaction) {
      console.log('[C2B Confirmation] Duplicate transaction detected:', {
        TransID: transactionId,
        ExistingId: existingTransaction.id,
        OriginalTime: existingTransaction.created_at
      });
      
      // Log duplicate event
      await supabase.from('payment_events').insert({
        payment_transaction_id: existingTransaction.id,
        event_type: 'DUPLICATE_DETECTED',
        provider: 'MPESA',
        provider_transaction_id: transactionId,
        ip_address: ipAddress,
        user_agent: userAgent,
        event_data: {
          duplicate_attempt_time: new Date().toISOString(),
          original_time: existingTransaction.created_at
        }
      });
      
      // Return success - already processed
      return new Response(
        JSON.stringify({
          ResultCode: 0,
          ResultDesc: 'Success'
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // ========================================================================
    // STEP 2: Find matching payment intent - ENHANCED FOR ID NUMBER MATCHING
    // ========================================================================
    // First, try to match by payment reference (STK Push flow)
    let { data: paymentIntent, error: intentError } = await supabase
      .from('payment_intents')
      .select('*')
      .eq('payment_reference', accountReference)
      .in('status', ['PENDING', 'PROCESSING'])
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    let matchType: 'PAYMENT_REFERENCE' | 'ID_NUMBER' | 'UNMATCHED' = 'UNMATCHED';
    
    if (!paymentIntent) {
      // Second, try to match by account_reference directly (Manual payment flow sets account_reference = ID number)
      console.log(`[C2B Confirmation] Trying direct account reference match: ${accountReference}`);
      const { data: intentByAccountRef } = await supabase
        .from('payment_intents')
        .select('*')
        .eq('account_reference', accountReference)
        .eq('payment_purpose', 'REGISTRATION')
        .in('status', ['PENDING', 'PROCESSING'])
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (intentByAccountRef) {
        paymentIntent = intentByAccountRef;
        matchType = 'ID_NUMBER';
        console.log(`[C2B Confirmation] Matched by account reference: ${paymentIntent.id}`);
      } else {
        // Third, try clean numeric ID (support 6 to 10 digit Kenyan IDs with spaces or punctuation stripped)
        const cleanDigits = accountReference.replace(/\D/g, '');
        if (cleanDigits.length >= 6 && cleanDigits.length <= 10) {
          console.log(`[C2B Confirmation] Trying clean numeric ID match: ${cleanDigits}`);
          
          const { data: intentByCleanId } = await supabase
            .from('payment_intents')
            .select('*')
            .eq('account_reference', cleanDigits)
            .eq('payment_purpose', 'REGISTRATION')
            .in('status', ['PENDING', 'PROCESSING'])
            .gte('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (intentByCleanId) {
            paymentIntent = intentByCleanId;
            matchType = 'ID_NUMBER';
            console.log(`[C2B Confirmation] Matched by clean ID number: ${paymentIntent.id}`);
          }
        }
      }
    } else {
      matchType = 'PAYMENT_REFERENCE';
      console.log(`[C2B Confirmation] Matched by payment reference: ${paymentIntent.id}`);
    }
    
    let matchedIntent = paymentIntent;
    let matchStatus: 'MATCHED' | 'UNMATCHED' | 'AMOUNT_MISMATCH' = 'MATCHED';
    let reconciliationNeeded = false;
    let amountMismatchType: 'OVERPAYMENT' | 'UNDERPAYMENT' | null = null;
    
    if (!matchedIntent) {
      console.warn('[C2B Confirmation] No matching payment intent found:', {
        AccountReference: accountReference,
        CheckedIdNumber: /^[0-9]{8}$/.test(accountReference)
      });
      matchStatus = 'UNMATCHED';
      reconciliationNeeded = true;
    } else if (Math.abs(matchedIntent.expected_amount - amount) > 0.01) {
      // Amount mismatch - EXACTLY 0.01 tolerance for floating point comparison (Requirement 5.6)
      const difference = amount - matchedIntent.expected_amount;
      amountMismatchType = difference > 0 ? 'OVERPAYMENT' : 'UNDERPAYMENT';
      
      console.warn('[C2B Confirmation] ⚠️  AMOUNT MISMATCH:', {
        Type: amountMismatchType,
        Expected: matchedIntent.expected_amount,
        Received: amount,
        Difference: difference,
        AccountReference: accountReference
      });
      matchStatus = 'AMOUNT_MISMATCH';
      reconciliationNeeded = true;
    }
    
    // ========================================================================
    // STEP 3: Create payment transaction record
    // ========================================================================
    const { data: transaction, error: transactionError } = await supabase
      .from('payment_transactions')
      .insert({
        payment_intent_id: matchedIntent?.id,
        user_id: matchedIntent?.user_id,
        vendor_id: matchedIntent?.vendor_id,
        field_agent_id: matchedIntent?.field_agent_id,
        supervisor_id: matchedIntent?.supervisor_id,
        provider: 'MPESA',
        provider_transaction_id: transactionId,
        transaction_type: 'C2B',
        payment_channel: 'C2B',
        amount: amount,
        currency: 'KES',
        payer_phone: phoneNumber,
        payer_name: payerName,
        account_reference: accountReference,
        receipt_number: transactionId,
        status: matchStatus === 'MATCHED' ? 'CONFIRMED' : 'UNMATCHED',
        confirmed_at: transactionTime,
        raw_provider_response: c2bRequest,
        metadata: {
          transaction_time: transactionTime,
          business_shortcode: c2bRequest.BusinessShortCode,
          match_type: matchType // Record how the payment was matched
        }
      })
      .select('id')
      .single();
    
    if (transactionError) {
      console.error('[C2B Confirmation] Failed to create transaction:', transactionError);
      // Still acknowledge to Safaricom
      return new Response(
        JSON.stringify({
          ResultCode: 0,
          ResultDesc: 'Success'
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log('[C2B Confirmation] Transaction created:', transaction.id);
    
    // ========================================================================
    // STEP 4: Log C2B confirmation event (Requirement 11.2)
    // ========================================================================
    await supabase.from('payment_events').insert({
      payment_intent_id: matchedIntent?.id,
      payment_transaction_id: transaction.id,
      event_type: 'C2B_CONFIRMATION_RECEIVED',
      provider: 'MPESA',
      provider_transaction_id: transactionId,
      ip_address: ipAddress,
      user_agent: userAgent,
      event_data: {
        amount: amount,
        account_reference: accountReference,
        phone_number: phoneNumber,
        payer_name: payerName,
        transaction_time: transactionTime,
        match_status: matchStatus,
        match_type: matchType,
        amount_mismatch_type: amountMismatchType,
        business_shortcode: c2bRequest.BusinessShortCode,
        transaction_type: c2bRequest.TransactionType
      }
    });
    
    // ========================================================================
    // STEP 5: Handle matched payment (exact match or overpayment for REGISTRATION)
    // IMPORTANT: Underpayment for REGISTRATION will skip this block (vendor NOT created)
    // ========================================================================
    if ((matchStatus === 'MATCHED' || (matchStatus === 'AMOUNT_MISMATCH' && amountMismatchType === 'OVERPAYMENT' && matchedIntent?.payment_purpose === 'REGISTRATION')) && matchedIntent) {
      try {
        // For overpayment on registration, still proceed but flag it
        const isOverpayment = matchStatus === 'AMOUNT_MISMATCH' && amountMismatchType === 'OVERPAYMENT';
        const allocationAmount = isOverpayment ? matchedIntent.expected_amount : amount;
        
        // Create payment allocation
        const { data: allocation, error: allocationError } = await supabase
          .from('payment_allocations')
          .insert({
            payment_transaction_id: transaction.id,
            payment_intent_id: matchedIntent.id,
            allocated_amount: allocationAmount,
            currency: 'KES',
            stock_cycle_id: matchedIntent.stock_cycle_id,
            stock_request_id: matchedIntent.stock_request_id,
            status: 'ALLOCATED',
            notes: isOverpayment 
              ? `Automatic allocation from C2B payment - OVERPAYMENT: Expected ${matchedIntent.expected_amount}, Received ${amount}, Excess ${amount - matchedIntent.expected_amount}`
              : 'Automatic allocation from C2B payment'
          })
          .select('id')
          .single();
        
        if (!allocationError && allocation) {
          console.log('[C2B Confirmation] Payment allocated:', allocation.id);
          
          // Log allocation event
          await supabase.from('payment_events').insert({
            payment_intent_id: matchedIntent.id,
            payment_transaction_id: transaction.id,
            payment_allocation_id: allocation.id,
            event_type: 'PAYMENT_ALLOCATED',
            provider: 'MPESA',
            provider_transaction_id: transactionId,
            ip_address: ipAddress,
            user_agent: userAgent,
            event_data: {
              allocated_amount: allocationAmount,
              stock_cycle_id: matchedIntent.stock_cycle_id,
              is_overpayment: isOverpayment,
              excess_amount: isOverpayment ? (amount - matchedIntent.expected_amount) : 0
            }
          });
          
          // Update payment intent status
          await supabase
            .from('payment_intents')
            .update({
              status: 'CONFIRMED',
              confirmed_at: new Date().toISOString()
            })
            .eq('id', matchedIntent.id);
          
          // Update business obligation based on payment purpose
          if (matchedIntent.payment_purpose === 'STOCK_CYCLE' && matchedIntent.stock_cycle_id) {
            // Update stock cycle payment status
            await supabase
              .from('stock_cycles')
              .update({
                payment_status: 'paid',
                payment_date: transactionTime,
                payment_reference: transactionId
              })
              .eq('id', matchedIntent.stock_cycle_id);
            
            console.log('[C2B Confirmation] Stock cycle payment updated');
          } else if (matchedIntent.payment_purpose === 'FIELD_AGENT_KIT' && matchedIntent.field_agent_id) {
            // Update field agent kit payment
            await supabase
              .from('field_agents')
              .update({
                kit_paid: true,
                kit_payment_date: transactionTime
              })
              .eq('id', matchedIntent.field_agent_id);
            
            console.log('[C2B Confirmation] Field agent kit payment updated');
          } else if (matchedIntent.payment_purpose === 'SUPERVISOR_KIT' && matchedIntent.supervisor_id) {
            // Update supervisor kit payment
            await supabase
              .from('supervisors')
              .update({
                kit_paid: true,
                kit_payment_date: transactionTime
              })
              .eq('id', matchedIntent.supervisor_id);
            
            console.log('[C2B Confirmation] Supervisor kit payment updated');
          } else if (matchedIntent.payment_purpose === 'REGISTRATION') {
            const vendorProfileId = matchedIntent.profile_id || matchedIntent.user_id;
            if (vendorProfileId) {
              await supabase
                .from('vendors')
                .update({
                  registration_paid: true,
                  registration_payment_date: transactionTime
                })
                .eq('profile_id', vendorProfileId);
            }
            
            // Trigger vendor account and profile creation
            console.log('[C2B Confirmation] Registration payment confirmed - triggering vendor creation');
            try {
              const createVendorResponse = await fetch(
                `${Deno.env.get('SUPABASE_URL')}/functions/v1/create-vendor-from-payment`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ paymentIntentId: matchedIntent.id })
                }
              );
              
              if (createVendorResponse.ok) {
                const vendorData = await createVendorResponse.json();
                console.log('[C2B Confirmation] Vendor created successfully:', vendorData);
              } else {
                const errorData = await createVendorResponse.json();
                console.error('[C2B Confirmation] Failed to create vendor:', errorData);
              }
            } catch (err) {
              console.error('[C2B Confirmation] Error invoking create-vendor-from-payment:', err);
            }
            
            // If overpayment, log admin notification
            if (isOverpayment) {
              const excessAmount = amount - matchedIntent.expected_amount;
              console.warn('[C2B Confirmation] ⚠️  OVERPAYMENT: Vendor registration overpaid by KES', excessAmount);
              
              await supabase.from('payment_events').insert({
                payment_intent_id: matchedIntent.id,
                payment_transaction_id: transaction.id,
                event_type: 'ADMIN_NOTIFICATION_REQUIRED',
                provider: 'MPESA',
                provider_transaction_id: transactionId,
                ip_address: ipAddress,
                user_agent: userAgent,
                event_data: {
                  notification_type: 'PAYMENT_OVERPAID',
                  priority: 'MEDIUM',
                  title: 'Vendor Registration Overpayment',
                  message: `Vendor paid KES ${amount} instead of ${matchedIntent.expected_amount}. Excess: KES ${excessAmount}. Transaction ID: ${transactionId}. Vendor creation will proceed, but excess amount requires handling.`,
                  action_required: true,
                  transaction_details: {
                    mpesa_receipt: transactionId,
                    expected_amount: matchedIntent.expected_amount,
                    received_amount: amount,
                    excess_amount: excessAmount,
                    account_reference: accountReference,
                    payer_phone: phoneNumber,
                    payer_name: payerName
                  }
                }
              });
            }
          }
          
          // Log payment matched event (Requirement 11.3)
          await supabase.from('payment_events').insert({
            payment_intent_id: matchedIntent.id,
            payment_transaction_id: transaction.id,
            event_type: 'PAYMENT_MATCHED',
            provider: 'MPESA',
            provider_transaction_id: transactionId,
            ip_address: ipAddress,
            user_agent: userAgent,
            event_data: {
              payment_purpose: matchedIntent.payment_purpose,
              success: true,
              amount_status: isOverpayment ? 'OVERPAID' : 'EXACT_MATCH',
              match_status: matchStatus,
              match_type: matchType,
              account_reference: accountReference,
              expected_amount: matchedIntent.expected_amount,
              received_amount: amount
            }
          });
        }
      } catch (error) {
        console.error('[C2B Confirmation] Error processing matched payment:', error);
        reconciliationNeeded = true;
      }
    }
    
    // ========================================================================
    // STEP 6: Handle unmatched or mismatched payments
    // Create reconciliation records for ALL amount mismatches (Requirement 5.6)
    // ========================================================================
    if (reconciliationNeeded) {
      let issueType: string;
      let adminNotificationType: string;
      let adminMessage: string;
      let adminPriority: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
      
      if (matchStatus === 'UNMATCHED') {
        issueType = 'UNMATCHED_REFERENCE';
        adminNotificationType = 'UNMATCHED_PAYMENT';
        adminPriority = 'HIGH';
        adminMessage = `Payment of KES ${amount} received with account reference "${accountReference}" could not be matched to any vendor. Transaction ID: ${transactionId}. Manual review and action required.`;
      } else if (matchStatus === 'AMOUNT_MISMATCH') {
        if (amountMismatchType === 'OVERPAYMENT') {
          issueType = 'AMOUNT_MISMATCH_OVERPAYMENT';
          adminNotificationType = 'PAYMENT_OVERPAID';
          const excessAmount = amount - (matchedIntent?.expected_amount || 0);
          
          if (matchedIntent?.payment_purpose === 'REGISTRATION') {
            // Registration overpayment - vendor creation proceeded in STEP 5
            adminPriority = 'MEDIUM';
            adminMessage = `Vendor registration overpaid by KES ${excessAmount}. Expected: ${matchedIntent.expected_amount}, Received: ${amount}. Transaction ID: ${transactionId}. Vendor creation proceeded. Determine refund action.`;
            console.warn('[C2B Confirmation] ⚠️  OVERPAYMENT: Vendor creation proceeded despite overpayment');
          } else {
            // Other payment purpose overpayment
            adminPriority = 'MEDIUM';
            adminMessage = `Payment overpaid by KES ${excessAmount}. Expected: ${matchedIntent?.expected_amount}, Received: ${amount}. Transaction ID: ${transactionId}. Review and determine refund or credit action.`;
          }
        } else {
          // UNDERPAYMENT - vendor NOT created (STEP 5 skipped)
          issueType = 'AMOUNT_MISMATCH_UNDERPAYMENT';
          adminNotificationType = 'PAYMENT_UNDERPAID';
          adminPriority = 'HIGH';
          const shortfall = (matchedIntent?.expected_amount || 0) - amount;
          adminMessage = `Payment underpaid by KES ${shortfall}. Expected: ${matchedIntent?.expected_amount}, Received: ${amount}. Transaction ID: ${transactionId}. Vendor creation SKIPPED. Manual review required to determine action (request additional payment or refund).`;
          
          console.warn('[C2B Confirmation] ⚠️  UNDERPAYMENT DETECTED - Vendor creation SKIPPED');
          console.warn('[C2B Confirmation] Underpayment details:', {
            Expected: matchedIntent?.expected_amount,
            Received: amount,
            Shortfall: shortfall,
            AccountReference: accountReference,
            TransactionID: transactionId,
            VendorCreated: false
          });
        }
      } else {
        issueType = 'UNKNOWN';
        adminNotificationType = 'RECONCILIATION_REQUIRED';
        adminPriority = 'HIGH';
        adminMessage = `Payment requires reconciliation. Transaction ID: ${transactionId}. Manual review required.`;
      }
      
      // Create reconciliation record
      const { data: reconciliation, error: reconciliationError } = await supabase
        .from('payment_reconciliation')
        .insert({
          payment_transaction_id: transaction.id,
          reconciliation_status: 'PENDING',
          issue_type: issueType,
          expected_amount: matchedIntent?.expected_amount,
          received_amount: amount,
          difference_amount: matchedIntent ? (amount - matchedIntent.expected_amount) : null,
          priority: adminPriority
        })
        .select('id')
        .single();
      
      if (reconciliationError) {
        console.error('[C2B Confirmation] Failed to create reconciliation record:', reconciliationError);
      } else {
        console.log('[C2B Confirmation] Payment flagged for reconciliation:', {
          ReconciliationId: reconciliation.id,
          TransactionId: transaction.id,
          IssueType: issueType,
          AccountReference: accountReference,
          Amount: amount,
          Priority: adminPriority
        });
      }
      
      // Log payment event based on issue type (Requirement 11.4)
      const eventType = matchStatus === 'UNMATCHED' 
        ? 'PAYMENT_UNMATCHED' 
        : (amountMismatchType === 'OVERPAYMENT' ? 'PAYMENT_OVERPAID' : 'PAYMENT_UNDERPAID');
      
      await supabase.from('payment_events').insert({
        payment_transaction_id: transaction.id,
        payment_intent_id: matchedIntent?.id,
        event_type: eventType,
        provider: 'MPESA',
        provider_transaction_id: transactionId,
        ip_address: ipAddress,
        user_agent: userAgent,
        event_data: {
          reason: issueType,
          account_reference: accountReference,
          amount: amount,
          expected_amount: matchedIntent?.expected_amount,
          difference_amount: matchedIntent ? (amount - matchedIntent.expected_amount) : null,
          payer_phone: phoneNumber,
          payer_name: payerName,
          transaction_time: transactionTime,
          match_attempts: matchStatus === 'UNMATCHED' ? {
            payment_reference_checked: true,
            id_number_checked: /^[0-9]{8}$/.test(accountReference),
            id_number_format_valid: /^[0-9]{8}$/.test(accountReference)
          } : undefined,
          requires_admin_review: true,
          admin_action_required: matchStatus === 'UNMATCHED' 
            ? 'Identify correct vendor or refund payment'
            : (amountMismatchType === 'UNDERPAYMENT' 
              ? 'Request additional payment or process refund'
              : 'Determine refund or credit action for excess amount')
        }
      });
      
      // Log admin notification event
      console.warn(`[C2B Confirmation] ⚠️  ADMIN NOTIFICATION: ${adminNotificationType} requires manual review`);
      console.warn('[C2B Confirmation] Payment Details:', {
        TransactionID: transactionId,
        Amount: `KES ${amount}`,
        Expected: matchedIntent?.expected_amount ? `KES ${matchedIntent.expected_amount}` : 'N/A',
        Difference: matchedIntent ? `KES ${amount - matchedIntent.expected_amount}` : 'N/A',
        AccountReference: accountReference,
        PayerPhone: phoneNumber,
        PayerName: payerName,
        ReconciliationID: reconciliation?.id,
        Priority: adminPriority,
        Action: matchStatus === 'UNMATCHED' 
          ? 'Manual review required - check for matching vendor or process refund'
          : (amountMismatchType === 'UNDERPAYMENT'
            ? 'Contact customer for additional payment or process refund'
            : 'Determine refund or credit action for overpayment')
      });
      
      await supabase.from('payment_events').insert({
        payment_transaction_id: transaction.id,
        payment_intent_id: matchedIntent?.id,
        event_type: 'ADMIN_NOTIFICATION_REQUIRED',
        provider: 'MPESA',
        provider_transaction_id: transactionId,
        ip_address: ipAddress,
        user_agent: userAgent,
        event_data: {
          notification_type: adminNotificationType,
          priority: adminPriority,
          title: matchStatus === 'UNMATCHED' 
            ? 'Unmatched C2B Payment Received' 
            : (amountMismatchType === 'UNDERPAYMENT' 
              ? 'Vendor Registration Underpayment' 
              : 'Payment Amount Mismatch'),
          message: adminMessage,
          action_required: true,
          reconciliation_id: reconciliation?.id,
          transaction_details: {
            mpesa_receipt: transactionId,
            amount: amount,
            expected_amount: matchedIntent?.expected_amount,
            difference_amount: matchedIntent ? (amount - matchedIntent.expected_amount) : null,
            account_reference: accountReference,
            payer_phone: phoneNumber,
            payer_name: payerName,
            transaction_time: transactionTime,
            payment_purpose: matchedIntent?.payment_purpose,
            mismatch_type: amountMismatchType
          }
        }
      });
    }
    
    // ========================================================================
    // STEP 7: Return acknowledgment to Safaricom
    // ========================================================================
    const responseTime = Date.now() - startTime;
    console.log('[C2B Confirmation] Processing complete:', {
      TransID: transactionId,
      Status: matchStatus,
      ReconciliationNeeded: reconciliationNeeded,
      ResponseTimeMs: responseTime
    });
    
    return new Response(
      JSON.stringify({
        ResultCode: 0,
        ResultDesc: 'Success'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error) {
    console.error('[C2B Confirmation] Unexpected error:', error);
    
    // Always acknowledge to prevent retries
    return new Response(
      JSON.stringify({
        ResultCode: 0,
        ResultDesc: 'Success'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});
