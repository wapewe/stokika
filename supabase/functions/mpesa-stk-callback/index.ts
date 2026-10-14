/**
 * M-Pesa STK Push Callback Edge Function
 * 
 * This function receives callbacks from M-Pesa after an STK Push is processed.
 * It updates the unified payment architecture (payment_transactions, payment_intents,
 * payment_allocations, payment_events).
 * 
 * This replaces the old mpesa-callback function and uses the new payment architecture.
 * 
 * Requirements: Unified STK Push + C2B architecture
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * M-Pesa STK Callback payload
 */
interface MpesaSTKCallback {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: Array<{
          Name: string;
          Value: string | number;
        }>;
      };
    };
  };
}

/**
 * Parse M-Pesa transaction date (YYYYMMDDHHmmss) to ISO timestamp
 */
function parseTransactionDate(dateValue: string | number): string {
  const dateStr = String(dateValue);
  if (dateStr.length !== 14) {
    console.error('[STK Callback] Invalid transaction date format:', dateStr);
    return new Date().toISOString();
  }
  
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  const hour = dateStr.substring(8, 10);
  const minute = dateStr.substring(10, 12);
  const second = dateStr.substring(12, 14);
  
  return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`).toISOString();
}

/**
 * Map M-Pesa result codes to user-friendly messages
 */
function mapResultCodeToMessage(resultCode: number, resultDesc: string): string {
  const messageMap: Record<number, string> = {
    0: 'Payment successful',
    1: 'Insufficient balance in M-Pesa account. Please top up and try again.',
    1032: 'You cancelled the payment. Please try again when ready.',
    1037: 'Payment request timed out. Please try again.',
    2001: 'Invalid phone number. Please check and try again.',
    17: 'M-Pesa service temporarily unavailable. Please try again later.',
    26: 'System busy. Please try again in a few minutes.',
  };
  
  return messageMap[resultCode] || resultDesc || 'Payment could not be processed.';
}

/**
 * Main Edge Function handler
 */
serve(async (req) => {
  const startTime = Date.now();
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get M-Pesa callback data
    const callbackData: MpesaSTKCallback = await req.json();
    
    const stkCallback = callbackData?.Body?.stkCallback;
    const resultCode = stkCallback?.ResultCode;
    const resultDesc = stkCallback?.ResultDesc;
    const merchantRequestID = stkCallback?.MerchantRequestID;
    const checkoutRequestID = stkCallback?.CheckoutRequestID;
    
    console.log('[STK Callback] Received:', {
      CheckoutRequestID: checkoutRequestID,
      ResultCode: resultCode,
      ResultDesc: resultDesc
    });
    
    // Validate required fields
    if (resultCode === undefined || !merchantRequestID || !checkoutRequestID) {
      console.error('[STK Callback] Invalid payload - missing required fields');
      return new Response(
        JSON.stringify({ ResultCode: 0, ResultDesc: 'Success' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }
    
    // Find existing payment transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('payment_transactions')
      .select('id, payment_intent_id, amount, status')
      .eq('checkout_request_id', checkoutRequestID)
      .eq('payment_channel', 'STK_PUSH')
      .single();
    
    if (transactionError || !transaction) {
      console.error('[STK Callback] Transaction not found:', checkoutRequestID);
      return new Response(
        JSON.stringify({ ResultCode: 0, ResultDesc: 'Success' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }
    
    // Check for duplicate callback
    if (transaction.status === 'CONFIRMED' || transaction.status === 'FAILED') {
      console.log('[STK Callback] Duplicate callback ignored:', checkoutRequestID);
      
      // Log duplicate event
      await supabase.from('payment_events').insert({
        payment_intent_id: transaction.payment_intent_id,
        payment_transaction_id: transaction.id,
        event_type: 'DUPLICATE_DETECTED',
        provider: 'MPESA',
        provider_transaction_id: checkoutRequestID,
        event_data: {
          duplicate_callback_time: new Date().toISOString(),
          original_status: transaction.status
        }
      });
      
      return new Response(
        JSON.stringify({ ResultCode: 0, ResultDesc: 'Success' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }
    
    // Extract transaction details if successful
    let extractedAmount: number | null = null;
    let mpesaReceiptNumber: string | null = null;
    let transactionDateISO: string | null = null;
    let _phoneNumber: string | null = null;
    
    if (resultCode === 0 && stkCallback.CallbackMetadata) {
      const callbackMetadata = stkCallback.CallbackMetadata.Item || [];
      
      const amountItem = callbackMetadata.find((item) => item.Name === 'Amount');
      const receiptItem = callbackMetadata.find((item) => item.Name === 'MpesaReceiptNumber');
      const dateItem = callbackMetadata.find((item) => item.Name === 'TransactionDate');
      const phoneItem = callbackMetadata.find((item) => item.Name === 'PhoneNumber');
      
      extractedAmount = amountItem ? Number(amountItem.Value) : null;
      mpesaReceiptNumber = receiptItem ? String(receiptItem.Value) : null;
      transactionDateISO = dateItem ? parseTransactionDate(dateItem.Value) : null;
      _phoneNumber = phoneItem ? String(phoneItem.Value) : null;
    }
    
    // Process based on result code
    if (resultCode === 0) {
      // ======================================================================
      // SUCCESSFUL PAYMENT
      // ======================================================================
      
      // Verify amount matches expected
      const amountMatch = extractedAmount && Math.abs(transaction.amount - extractedAmount) < 0.01;
      
      if (!amountMatch) {
        console.error('[STK Callback] Amount mismatch:', {
          Expected: transaction.amount,
          Received: extractedAmount
        });
        
        // Update transaction as suspicious
        await supabase
          .from('payment_transactions')
          .update({
            status: 'UNMATCHED',
            result_code: resultCode,
            result_description: 'Amount mismatch',
            failure_reason: `Expected ${transaction.amount}, received ${extractedAmount}`,
            confirmed_at: transactionDateISO,
            updated_at: new Date().toISOString()
          })
          .eq('id', transaction.id);
        
        // Create reconciliation record
        await supabase.from('payment_reconciliation').insert({
          payment_transaction_id: transaction.id,
          reconciliation_status: 'PENDING',
          issue_type: 'AMOUNT_MISMATCH',
          expected_amount: transaction.amount,
          received_amount: extractedAmount,
          difference_amount: extractedAmount ? (extractedAmount - transaction.amount) : null,
          priority: 'HIGH'
        });
        
        // Log amount mismatch event
        await supabase.from('payment_events').insert({
          payment_intent_id: transaction.payment_intent_id,
          payment_transaction_id: transaction.id,
          event_type: 'AMOUNT_MISMATCH',
          provider: 'MPESA',
          provider_transaction_id: mpesaReceiptNumber,
          event_data: {
            expected: transaction.amount,
            received: extractedAmount
          }
        });
        
      } else {
        // Amount matches - process payment
        
        // Update transaction as confirmed
        await supabase
          .from('payment_transactions')
          .update({
            status: 'CONFIRMED',
            provider_transaction_id: mpesaReceiptNumber,
            receipt_number: mpesaReceiptNumber,
            result_code: resultCode,
            result_description: resultDesc,
            confirmed_at: transactionDateISO || new Date().toISOString(),
            raw_provider_response: callbackData,
            updated_at: new Date().toISOString()
          })
          .eq('id', transaction.id);
        
        // Get payment intent details
        const { data: intent } = await supabase
          .from('payment_intents')
          .select('*')
          .eq('id', transaction.payment_intent_id)
          .single();
        
        if (intent) {
          // Create payment allocation
          const { data: allocation } = await supabase
            .from('payment_allocations')
            .insert({
              payment_transaction_id: transaction.id,
              payment_intent_id: intent.id,
              allocated_amount: transaction.amount,
              currency: 'KES',
              stock_cycle_id: intent.stock_cycle_id,
              stock_request_id: intent.stock_request_id,
              status: 'ALLOCATED',
              notes: 'Automatic allocation from STK Push payment'
            })
            .select('id')
            .single();
          
          // Update payment intent
          await supabase
            .from('payment_intents')
            .update({
              status: 'CONFIRMED',
              confirmed_at: transactionDateISO || new Date().toISOString()
            })
            .eq('id', intent.id);
          
          // Update business obligation based on payment purpose
          if (intent.payment_purpose === 'FIELD_AGENT_KIT' && intent.field_agent_id) {
            await supabase
              .from('field_agents')
              .update({
                kit_paid: true,
                kit_payment_date: transactionDateISO || new Date().toISOString()
              })
              .eq('id', intent.field_agent_id);
            
            console.log('[STK Callback] Field agent kit payment completed');
          } else if (intent.payment_purpose === 'SUPERVISOR_KIT' && intent.supervisor_id) {
            await supabase
              .from('supervisors')
              .update({
                kit_paid: true,
                kit_payment_date: transactionDateISO || new Date().toISOString()
              })
              .eq('id', intent.supervisor_id);
            
            console.log('[STK Callback] Supervisor kit payment completed');
          } else if (intent.payment_purpose === 'STOCK_CYCLE' && intent.stock_cycle_id) {
            await supabase
              .from('stock_cycles')
              .update({
                payment_status: 'paid',
                payment_date: transactionDateISO || new Date().toISOString(),
                payment_reference: mpesaReceiptNumber
              })
              .eq('id', intent.stock_cycle_id);
            
            console.log('[STK Callback] Stock cycle payment completed');
          } else if (intent.payment_purpose === 'REGISTRATION') {
            // Trigger vendor account creation
            console.log('[STK Callback] Registration payment confirmed - triggering vendor creation');
            
            try {
              const createVendorResponse = await fetch(
                `${Deno.env.get('SUPABASE_URL')}/functions/v1/create-vendor-from-payment`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ paymentIntentId: intent.id })
                }
              );
              
              if (createVendorResponse.ok) {
                const vendorData = await createVendorResponse.json();
                console.log('[STK Callback] Vendor created successfully:', vendorData);
              } else {
                const errorData = await createVendorResponse.json();
                console.error('[STK Callback] Failed to create vendor:', errorData);
                
                // Log to reconciliation but don't fail the callback
                await supabase.from('payment_reconciliation').insert({
                  payment_intent_id: intent.id,
                  issue_type: 'VENDOR_CREATION_FAILED',
                  details: { error: errorData, mpesa_receipt: mpesaReceiptNumber }
                });
              }
            } catch (vendorError) {
              console.error('[STK Callback] Error calling create-vendor function:', vendorError);
              
              // Log error but don't fail the callback
              await supabase.from('payment_reconciliation').insert({
                payment_intent_id: intent.id,
                issue_type: 'VENDOR_CREATION_FAILED',
                details: { error: String(vendorError), mpesa_receipt: mpesaReceiptNumber }
              });
            }
          }
          
          // Update stokika_kit_payments status if this was a kit payment
          try {
            await supabase
              .from('stokika_kit_payments')
              .update({
                payment_status: 'completed',
                mpesa_receipt_number: mpesaReceiptNumber,
                transaction_date: transactionDateISO || new Date().toISOString(),
                verified_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('checkout_request_id', checkoutRequestID);
            console.log('[STK Callback] Updated stokika_kit_payments to completed for checkoutRequestID:', checkoutRequestID);
          } catch (kitUpdateErr) {
            console.warn('[STK Callback] Notice updating stokika_kit_payments:', kitUpdateErr);
          }

          // Log payment confirmed event
          await supabase.from('payment_events').insert({
            payment_intent_id: intent.id,
            payment_transaction_id: transaction.id,
            payment_allocation_id: allocation?.id,
            event_type: 'STK_CONFIRMED',
            provider: 'MPESA',
            provider_transaction_id: mpesaReceiptNumber,
            event_data: {
              amount: transaction.amount,
              receipt_number: mpesaReceiptNumber,
              transaction_date: transactionDateISO
            }
          });
          
          console.log('[STK Callback] Payment successfully processed');
        }
      }
      
    } else {
      // ======================================================================
      // FAILED PAYMENT
      // ======================================================================
      
      const userFriendlyMessage = mapResultCodeToMessage(resultCode, resultDesc);
      
      // Update transaction as failed
      await supabase
        .from('payment_transactions')
        .update({
          status: 'FAILED',
          result_code: resultCode,
          result_description: resultDesc,
          failure_reason: userFriendlyMessage,
          raw_provider_response: callbackData,
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction.id);
      
      // Update intent as failed
      await supabase
        .from('payment_intents')
        .update({
          status: 'FAILED',
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction.payment_intent_id);
      
      // Update stokika_kit_payments as failed
      try {
        await supabase
          .from('stokika_kit_payments')
          .update({
            payment_status: 'failed',
            failure_reason: userFriendlyMessage,
            updated_at: new Date().toISOString()
          })
          .eq('checkout_request_id', checkoutRequestID);
        console.log('[STK Callback] Updated stokika_kit_payments to failed for checkoutRequestID:', checkoutRequestID);
      } catch (kitUpdateErr) {
        console.warn('[STK Callback] Notice updating stokika_kit_payments failed status:', kitUpdateErr);
      }
      
      // Log failed event
      await supabase.from('payment_events').insert({
        payment_intent_id: transaction.payment_intent_id,
        payment_transaction_id: transaction.id,
        event_type: 'STK_FAILED',
        provider: 'MPESA',
        event_data: {
          result_code: resultCode,
          result_description: resultDesc,
          user_message: userFriendlyMessage
        }
      });
      
      console.log('[STK Callback] Payment failed:', {
        ResultCode: resultCode,
        Message: userFriendlyMessage
      });
    }
    
    // Return acknowledgment
    const responseTime = Date.now() - startTime;
    console.log('[STK Callback] Processing complete:', {
      CheckoutRequestID: checkoutRequestID,
      ResultCode: resultCode,
      ResponseTimeMs: responseTime
    });
    
    return new Response(
      JSON.stringify({ ResultCode: 0, ResultDesc: 'Success' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
    
  } catch (error) {
    console.error('[STK Callback] Error:', error);
    
    // Always return success to prevent M-Pesa retries
    return new Response(
      JSON.stringify({ ResultCode: 0, ResultDesc: 'Success' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  }
});
