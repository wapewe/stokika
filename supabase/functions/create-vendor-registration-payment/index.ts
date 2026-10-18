import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  sanitizeAndValidateIdNumber
} from '../shared/id-number-security.ts'
import {
  checkPaymentCreationRateLimit,
  createRateLimitResponse,
  logRateLimitViolation
} from '../shared/enhanced-rate-limiter.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PaymentRequest {
  validationToken: string
  phoneNumber: string
  paymentMethod: 'stkpush' | 'manual'
}

// NOTE: Rate limiting now handled by enhanced-rate-limiter module
// See checkPaymentCreationRateLimit() usage below

// Verify and decode validation token
function verifyValidationToken(token: string): any {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) throw new Error('Invalid token format')

    const payload = JSON.parse(atob(parts[1]))
    
    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expired')
    }

    return payload.data
  } catch (error) {
    console.error('[Create Payment] Token verification failed:', error)
    return null
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get auth header (optional — registration supports anonymous access)
    const authHeader = req.headers.get('Authorization')

    // Parse request with default for backwards compatibility with cached JS
    const payload: PaymentRequest = await req.json()
    const validationToken = payload.validationToken
    const phoneNumber = payload.phoneNumber
    const paymentMethod = payload.paymentMethod || 'stkpush'

    // Verify validation token
    const registrationData = verifyValidationToken(validationToken)
    if (!registrationData) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired validation token. Please resubmit the form.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract and validate ID number using security utilities (Task 15.1)
    const idValidation = sanitizeAndValidateIdNumber(registrationData.idNumber)
    
    if (!idValidation.valid || !idValidation.sanitized) {
      console.error('[Create Payment] Invalid ID number in validation token:', registrationData.idNumber)
      return new Response(
        JSON.stringify({ error: `Invalid ID number: ${idValidation.error || 'Unknown error'}. Please resubmit the form.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const idNumber = idValidation.sanitized
    console.log(`[Create Payment] ID number validated: ${idNumber}`)

    // Check optional authenticated user
    let profileId: string | null = null
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
      if (token && token !== anonKey) {
        try {
          const { data: { user } } = await supabase.auth.getUser(token)
          if (user) {
            profileId = user.id
            console.log(`[Create Payment] Using authenticated user: ${profileId}`)
          }
        } catch (_) {
          // Token verification failed; fall back to registration profile resolution
        }
      }
    }

    // If not authenticated, we proceed without profileId. The user will be created AFTER payment completes
    // by the create-vendor-from-payment function called from the mpesa webhook.
    if (!profileId) {
      console.log('[Create Payment] Unauthenticated registration, proceeding to create payment intent without profile_id')
    }

    // Check rate limit using enhanced rate limiter (Task 15.3: 3 requests per hour per user/IP)
    const rateLimitKey = profileId || req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || 'unknown'
    const rateLimit = await checkPaymentCreationRateLimit(rateLimitKey)
    
    if (!rateLimit.allowed) {
      console.log(`[Create Payment] Rate limit exceeded for key: ${rateLimitKey}`)
      
      const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                        req.headers.get('x-real-ip') || 
                        'unknown'
      const userAgent = req.headers.get('user-agent') || 'unknown'
      
      await logRateLimitViolation(
        supabase,
        rateLimitKey,
        'vendor-payment-creation',
        rateLimit.currentCount,
        rateLimit.limit,
        ipAddress,
        userAgent
      )
      
      return createRateLimitResponse(rateLimit, corsHeaders)
    }

    // Registration fee - hardcoded with database override attempt
    let registrationFee = 1050.00
    try {
      const { data: feeData, error: feeError } = await supabase.rpc('get_registration_fee')
      if (!feeError && feeData) {
        registrationFee = parseFloat(feeData)
      } else {
        console.warn('[Create Payment] RPC get_registration_fee failed, using default 1050:', feeError?.message)
      }
    } catch (e) {
      console.warn('[Create Payment] RPC get_registration_fee exception, using default 1050:', e)
    }
    console.log(`[Create Payment] Registration fee: KES ${registrationFee}`)

    // Generate payment reference - try RPC first, fallback to inline generation
    let paymentReference: string | null = null
    try {
      const { data: refData, error: refError } = await supabase.rpc('generate_payment_reference', { purpose: 'REGISTRATION' })
      if (!refError && refData) {
        paymentReference = refData
      } else {
        console.warn('[Create Payment] RPC generate_payment_reference failed:', refError?.message, refError?.details, refError?.hint)
      }
    } catch (e) {
      console.warn('[Create Payment] RPC generate_payment_reference exception:', e)
    }

    // Fallback: generate reference inline if RPC failed
    if (!paymentReference) {
      console.log('[Create Payment] Using inline reference generator fallback')
      const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(4)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase()
        .substring(0, 5)
      paymentReference = `STK-REG-${randomHex}`
      
      // Verify uniqueness against payment_intents table
      const { data: existing } = await supabase
        .from('payment_intents')
        .select('id')
        .eq('payment_reference', paymentReference)
        .maybeSingle()
      
      if (existing) {
        // Extremely unlikely collision - add timestamp suffix
        paymentReference = `STK-REG-${randomHex}-${Date.now().toString(36).toUpperCase()}`
      }
    }
    console.log(`[Create Payment] Generated reference: ${paymentReference}`)

    // Create payment intent
    // Ensure account_reference strictly maps to the user-inputted ID number for both STK and manual
    const accountReference = idNumber
    
    const { data: intent, error: intentError } = await supabase
      .from('payment_intents')
      .insert({
        profile_id: profileId,
        payment_purpose: 'REGISTRATION',
        expected_amount: registrationFee,
        currency: 'KES',
        payment_reference: paymentReference,
        status: 'PENDING',
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
        metadata: {
          ...registrationData,
          id_number: idNumber,
          payment_method: paymentMethod,
          account_reference: accountReference
        }
      })
      .select()
      .single()

    if (intentError || !intent) {
      console.error('[Create Payment] Failed to create payment intent:', intentError)
      return new Response(
        JSON.stringify({ 
          error: `Failed to create payment intent: ${intentError?.message || 'Unknown error'}`,
          code: intentError?.code,
          details: intentError?.details,
          hint: intentError?.hint
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[Create Payment] Payment intent created: ${intent.id}, Method: ${paymentMethod}`)

    // Handle payment method
    if (paymentMethod === 'stkpush') {
      // Normalize phone number for STK Push
      const rawPhone = phoneNumber || registrationData.phone || ''
      let cleanPushPhone = rawPhone.replace(/[\s\-\(\)\+]/g, '')
      if (cleanPushPhone.startsWith('0')) {
        cleanPushPhone = '254' + cleanPushPhone.substring(1)
      } else if ((cleanPushPhone.startsWith('7') || cleanPushPhone.startsWith('1')) && cleanPushPhone.length === 9) {
        cleanPushPhone = '254' + cleanPushPhone
      }

      // STK Push flow - initiate M-Pesa push
      const stkPushResponse = await fetch(`${supabaseUrl}/functions/v1/mpesa-stk-push`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phoneNumber: cleanPushPhone,
          amount: registrationFee,
          accountReference: idNumber,
          transactionDesc: 'Vendor Registration Fee',
          userType: 'vendor',
          applicationCode: paymentReference,
          paymentIntentId: intent.id,
          flowType: 'vendor_registration'  // Section 9: Timeout tracking
        })
      })

      if (!stkPushResponse.ok) {
        const errorData = await stkPushResponse.json()
        console.error('[Create Payment] STK Push failed:', errorData)
        
        // Update intent to failed
        await supabase
          .from('payment_intents')
          .update({ status: 'FAILED', failure_reason: 'STK Push initiation failed' })
          .eq('id', intent.id)

        return new Response(
          JSON.stringify({ error: errorData.error || 'Failed to initiate M-Pesa payment' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const stkPushData = await stkPushResponse.json()
      console.log(`[Create Payment] STK Push initiated:`, stkPushData)

      // Update payment intent with checkout request ID and status
      if (stkPushData.checkoutRequestId) {
        await supabase
          .from('payment_intents')
          .update({ 
            status: 'PROCESSING'
          })
          .eq('id', intent.id)
      }

      return new Response(
        JSON.stringify({
          success: true,
          paymentIntentId: intent.id,
          paymentMethod: 'stkpush',
          checkoutRequestId: stkPushData.checkoutRequestId,
          paymentReference: paymentReference
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } else if (paymentMethod === 'manual') {
      // Manual payment flow - just return payment details
      // No M-Pesa API call needed, user will pay manually
      console.log(`[Create Payment] Manual payment instructions prepared for ID: ${idNumber}`)

      return new Response(
        JSON.stringify({
          success: true,
          paymentIntentId: intent.id,
          paymentMethod: 'manual',
          paymentReference: paymentReference,
          accountNumber: idNumber,
          paybillNumber: '1140839',
          amount: registrationFee
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid payment method. Must be "stkpush" or "manual".' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('[Create Payment] Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error), details: error }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
