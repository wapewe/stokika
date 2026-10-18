import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Subtask 6.1: Safaricom IP whitelist for callback validation
const SAFARICOM_IPS = [
  '196.201.214.200',
  '196.201.214.206',
  '196.201.213.114',
  '196.201.214.207',
  '196.201.214.208',
  '196.201.213.44',
  '196.201.212.127',
  '196.201.212.128',
  '196.201.212.129',
  '196.201.212.136'
]

// Subtask 6.2: M-Pesa callback payload interface
interface MpesaCallback {
  Body: {
    stkCallback: {
      MerchantRequestID: string
      CheckoutRequestID: string
      ResultCode: number
      ResultDesc: string
      CallbackMetadata?: {
        Item: Array<{
          Name: string
          Value: string | number
        }>
      }
    }
  }
}

// Subtask 6.8: Map M-Pesa result codes to user-friendly messages
function mapResultCodeToMessage(resultCode: number, resultDesc: string): string {
  const messageMap: Record<number, string> = {
    0: 'Payment successful',
    1: 'Insufficient balance in M-Pesa account. Please top up and try again.',
    1032: 'You cancelled the payment. Please try again when ready.',
    1037: 'Payment request timed out. Please try again.',
    2001: 'Invalid phone number. Please check and try again.',
    17: 'M-Pesa service temporarily unavailable. Please try again later.',
    26: 'System busy. Please try again in a few minutes.',
  }
  
  return messageMap[resultCode] || resultDesc || 'Payment could not be processed. Please try again or contact support.'
}

// Subtask 6.5: Parse M-Pesa transaction date (YYYYMMDDHHmmss) to ISO timestamp
function parseTransactionDate(dateValue: string | number): string {
  const dateStr = String(dateValue)
  if (dateStr.length !== 14) {
    console.error('Invalid transaction date format:', dateStr)
    return new Date().toISOString()
  }
  
  const year = dateStr.substring(0, 4)
  const month = dateStr.substring(4, 6)
  const day = dateStr.substring(6, 8)
  const hour = dateStr.substring(8, 10)
  const minute = dateStr.substring(10, 12)
  const second = dateStr.substring(12, 14)
  
  return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`).toISOString()
}

serve(async (req) => {
  const startTime = Date.now()
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Subtask 6.1: Validate IP whitelist (if enabled)
    const ipWhitelistEnabled = Deno.env.get('IP_WHITELIST_ENABLED') === 'true'
    if (ipWhitelistEnabled) {
      const forwardedFor = req.headers.get('x-forwarded-for')
      const clientIP = forwardedFor?.split(',')[0].trim()
      
      if (!clientIP || !SAFARICOM_IPS.includes(clientIP)) {
        console.error('Suspicious callback attempt from invalid IP:', {
          clientIP,
          forwardedFor,
          timestamp: new Date().toISOString(),
          headers: Object.fromEntries(req.headers.entries())
        })
        
        return new Response(
          JSON.stringify({ 
            ResultCode: 1,
            ResultDesc: 'Failed'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 403,
          },
        )
      }
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get M-Pesa callback data
    const callbackData = await req.json()
    
    console.log('M-Pesa Callback Received:', {
      timestamp: new Date().toISOString(),
      checkoutRequestId: callbackData?.Body?.stkCallback?.CheckoutRequestID
    })

    // Subtask 6.2: Validate callback payload structure
    const stkCallback = callbackData?.Body?.stkCallback
    const resultCode = stkCallback?.ResultCode
    const resultDesc = stkCallback?.ResultDesc
    const merchantRequestID = stkCallback?.MerchantRequestID
    const checkoutRequestID = stkCallback?.CheckoutRequestID

    if (resultCode === undefined || !merchantRequestID || !checkoutRequestID) {
      console.error('Invalid callback payload - missing required fields:', {
        hasResultCode: resultCode !== undefined,
        hasMerchantRequestID: !!merchantRequestID,
        hasCheckoutRequestID: !!checkoutRequestID,
        payload: callbackData
      })
      
      return new Response(
        JSON.stringify({ 
          ResultCode: 1,
          ResultDesc: 'Failed'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // Subtask 6.3: Check for duplicate callback (idempotency)
    const { data: existingTransaction } = await supabase
      .from('mpesa_transactions')
      .select('id, created_at')
      .eq('checkout_request_id', checkoutRequestID)
      .single()

    if (existingTransaction) {
      console.log('Duplicate callback ignored:', {
        checkoutRequestId: checkoutRequestID,
        originalTimestamp: existingTransaction.created_at,
        duplicateTimestamp: new Date().toISOString()
      })
      
      return new Response(
        JSON.stringify({ 
          ResultCode: 0,
          ResultDesc: 'Success'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    // Subtask 6.5: Extract transaction details if successful
    let transactionDetails = null
    let extractedAmount: number | null = null
    let mpesaReceiptNumber: string | null = null
    let transactionDateISO: string | null = null
    let phoneNumber: string | null = null

    if (resultCode === 0) {
      const callbackMetadata = stkCallback.CallbackMetadata?.Item || []
      
      const amountItem = callbackMetadata.find((item: any) => item.Name === 'Amount')
      const receiptItem = callbackMetadata.find((item: any) => item.Name === 'MpesaReceiptNumber')
      const dateItem = callbackMetadata.find((item: any) => item.Name === 'TransactionDate')
      const phoneItem = callbackMetadata.find((item: any) => item.Name === 'PhoneNumber')
      
      extractedAmount = amountItem ? Number(amountItem.Value) : null
      mpesaReceiptNumber = receiptItem ? String(receiptItem.Value) : null
      transactionDateISO = dateItem ? parseTransactionDate(dateItem.Value) : null
      phoneNumber = phoneItem ? String(phoneItem.Value) : null
      
      transactionDetails = {
        amount: extractedAmount,
        mpesaReceiptNumber,
        transactionDate: transactionDateISO,
        phoneNumber
      }
      
      // Validate all required fields present
      if (!extractedAmount || !mpesaReceiptNumber || !transactionDateISO || !phoneNumber) {
        console.error('Missing required transaction details in successful callback:', {
          hasAmount: !!extractedAmount,
          hasReceipt: !!mpesaReceiptNumber,
          hasDate: !!transactionDateISO,
          hasPhone: !!phoneNumber,
          metadata: callbackMetadata
        })
      }
    }

    // Subtask 6.4: Log complete callback to mpesa_transactions
    try {
      const { error: logError } = await supabase
        .from('mpesa_transactions')
        .insert({
          merchant_request_id: merchantRequestID,
          checkout_request_id: checkoutRequestID,
          result_code: resultCode,
          result_description: resultDesc,
          transaction_details: transactionDetails,
          raw_callback: callbackData,
          created_at: new Date().toISOString()
        })

      if (logError) {
        console.error('Error logging transaction to mpesa_transactions:', logError)
        // Continue processing - don't block acknowledgment
      }
    } catch (logException) {
      console.error('Exception logging transaction:', logException)
      // Continue processing - don't block acknowledgment
    }

    // Subtask 6.6 & 6.7: Update payment record based on result
    if (resultCode === 0) {
      // Query existing payment record for amount reconciliation
      const { data: existingPayment } = await supabase
        .from('stokika_kit_payments')
        .select('amount, application_code, user_type')
        .eq('checkout_request_id', checkoutRequestID)
        .single()

      if (existingPayment) {
        // Subtask 6.6: Amount reconciliation
        if (extractedAmount && existingPayment.amount !== extractedAmount) {
          console.error('Amount mismatch detected:', {
            checkoutRequestId: checkoutRequestID,
            expectedAmount: existingPayment.amount,
            receivedAmount: extractedAmount,
            applicationCode: existingPayment.application_code
          })
          
          // Mark as suspicious for admin review
          const { error: updateError } = await supabase
            .from('stokika_kit_payments')
            .update({
              payment_status: 'suspicious',
              failure_reason: `Amount mismatch: Expected ${existingPayment.amount}, Received ${extractedAmount}`,
              updated_at: new Date().toISOString()
            })
            .eq('checkout_request_id', checkoutRequestID)

          if (updateError) {
            console.error('Error marking payment as suspicious:', updateError)
          }
        } else {
          // Subtask 6.7: Update payment record for successful callback
          const { error: updateError } = await supabase
            .from('stokika_kit_payments')
            .update({
              payment_status: 'completed',
              mpesa_receipt_number: mpesaReceiptNumber,
              transaction_date: transactionDateISO,
              verified_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('checkout_request_id', checkoutRequestID)

          if (updateError) {
            console.error('Error updating payment status to completed:', updateError)
            // Continue - don't block acknowledgment
          } else {
            console.log('Payment completed successfully:', {
              checkoutRequestId: checkoutRequestID,
              applicationCode: existingPayment.application_code,
              mpesaReceipt: mpesaReceiptNumber
            })
            
            // Trigger kit payment activation workflow
            const userTable = existingPayment.user_type === 'field_agent' ? 'field_agents' : 'supervisors'
            const { error: activationError } = await supabase
              .from(userTable)
              .update({
                kit_paid: true,
                kit_payment_date: new Date().toISOString()
              })
              .eq('application_code', existingPayment.application_code)

            if (activationError) {
              console.error('Error activating kit payment:', activationError)
            } else {
              console.log('Kit payment activated for user:', existingPayment.application_code)
            }
          }
        }
      } else {
        console.error('Payment record not found for checkoutRequestId:', checkoutRequestID)
      }
    } else {
      // Subtask 6.8: Update payment record for failed callback
      const userFriendlyMessage = mapResultCodeToMessage(resultCode, resultDesc)
      
      const { error: updateError } = await supabase
        .from('stokika_kit_payments')
        .update({
          payment_status: 'failed',
          failure_reason: userFriendlyMessage,
          updated_at: new Date().toISOString()
        })
        .eq('checkout_request_id', checkoutRequestID)

      if (updateError) {
        console.error('Error updating payment status to failed:', updateError)
        // Continue - don't block acknowledgment
      } else {
        console.log('Payment failed:', {
          checkoutRequestId: checkoutRequestID,
          resultCode,
          message: userFriendlyMessage
        })
      }
    }

    // Subtask 6.9: Return acknowledgment response to M-Pesa
    const responseTime = Date.now() - startTime
    console.log('Callback processed successfully:', {
      checkoutRequestId: checkoutRequestID,
      resultCode,
      responseTimeMs: responseTime
    })

    return new Response(
      JSON.stringify({ 
        ResultCode: 0,
        ResultDesc: 'Success'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Callback processing error:', error)
    
    // Subtask 6.9: Always return 200 OK even on error (prevents M-Pesa retries)
    const responseTime = Date.now() - startTime
    console.log('Error response time:', responseTime, 'ms')
    
    return new Response(
      JSON.stringify({ 
        ResultCode: 0,
        ResultDesc: 'Success'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  }
})
