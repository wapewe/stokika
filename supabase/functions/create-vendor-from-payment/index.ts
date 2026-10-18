import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  sanitizeAndValidateIdNumber,
  hashIdNumber,
  sanitizeIdNumberForDatabase
} from '../shared/id-number-security.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// NOTE: hashIdNumber and validateIdNumber now imported from id-number-security module

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { paymentIntentId } = await req.json()

    if (!paymentIntentId) {
      return new Response(
        JSON.stringify({ error: 'Payment intent ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[Create Vendor] Processing payment intent: ${paymentIntentId}`)
    
    // Extract IP address and user agent for audit logging
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    // Initialize Supabase with Service Role Key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get payment intent
    const { data: intent, error: intentError } = await supabase
      .from('payment_intents')
      .select('*')
      .eq('id', paymentIntentId)
      .eq('payment_purpose', 'REGISTRATION')
      .eq('status', 'CONFIRMED')
      .single()

    if (intentError || !intent) {
      console.error('[Create Vendor] Payment intent not found or not confirmed:', intentError)
      return new Response(
        JSON.stringify({ error: 'Payment intent not found or not confirmed' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if vendor already created for this payment
    const { data: existingVendor } = await supabase
      .from('vendors')
      .select('id')
      .eq('registration_payment_id', paymentIntentId)
      .single()

    if (existingVendor) {
      console.log(`[Create Vendor] Vendor already exists for this payment: ${existingVendor.id}`)
      return new Response(
        JSON.stringify({ success: true, vendorId: existingVendor.id, alreadyExists: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract registration data from metadata
    const metadata = intent.metadata
    const email = metadata.email
    const phone = metadata.phone.replace(/[\s\-\(\)]/g, '')
    const fullName = metadata.fullName
    const businessName = metadata.businessName
    
    // Subtask 11.1: Extract and validate ID number from payment intent metadata
    // Using security utilities (Task 15.1)
    const rawIdNumber = metadata.idNumber || metadata.id_number
    
    if (!rawIdNumber) {
      console.error('[Create Vendor] ID number missing from payment intent metadata')
      await supabase.from('payment_reconciliation').insert({
        payment_intent_id: paymentIntentId,
        issue_type: 'VENDOR_CREATION_FAILED',
        details: { error: 'ID number missing from metadata', step: 'id_number_extraction' }
      })
      return new Response(
        JSON.stringify({ error: 'ID number missing from payment intent metadata' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const idValidation = sanitizeAndValidateIdNumber(rawIdNumber)
    
    if (!idValidation.valid || !idValidation.sanitized) {
      console.error('[Create Vendor] Invalid ID number format in metadata:', idValidation.error)
      await supabase.from('payment_reconciliation').insert({
        payment_intent_id: paymentIntentId,
        issue_type: 'VENDOR_CREATION_FAILED',
        details: { error: `Invalid ID number format: ${idValidation.error}`, step: 'id_number_validation' }
      })
      return new Response(
        JSON.stringify({ error: `Invalid ID number format: ${idValidation.error}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const idNumber = idValidation.sanitized

    console.log(`[Create Vendor] Creating account for: ${email} with ID number validation passed`)

    // Create auth user or get existing
    let userId = intent.profile_id
    let authUserExists = false

    try {
      // Subtask 11.5: Set initial password to ID number
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        phone: phone.startsWith('254') ? `+${phone}` : phone,
        password: idNumber, // Use ID number as initial password (8 characters - meets Supabase minimum)
        email_confirm: true,
        phone_confirm: true,
        user_metadata: {
          full_name: fullName,
          role: 'vendor'
        }
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          console.log(`[Create Vendor] User already exists: ${email}`)
          authUserExists = true
          userId = intent.profile_id
        } else {
          throw authError
        }
      } else {
        userId = authUser.user.id
        console.log(`[Create Vendor] Auth user created: ${userId}`)
        
        // Subtask 11.5: Send password reset email immediately after account creation
        try {
          const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${Deno.env.get('PUBLIC_SITE_URL') || 'https://stokika.com'}/reset-password`
          })
          
          if (resetError) {
            console.error('[Create Vendor] Password reset email failed:', resetError)
            // Don't fail the whole process if reset email fails
          } else {
            console.log(`[Create Vendor] Password reset email sent to: ${email}`)
          }
        } catch (resetError) {
          console.error('[Create Vendor] Password reset email exception:', resetError)
          // Don't fail the whole process
        }
      }
    } catch (authError) {
      console.error('[Create Vendor] Auth creation error:', authError)
      
      // Log to payment_reconciliation
      await supabase.from('payment_reconciliation').insert({
        payment_intent_id: paymentIntentId,
        issue_type: 'VENDOR_CREATION_FAILED',
        details: { error: String(authError), step: 'auth_user_creation' }
      })

      throw authError
    }

    // Create or update profile
    // Subtask 11.2: Store ID number in profile creation
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: email,
        phone: phone,
        full_name: fullName,
        role: 'vendor',
        id_number: idNumber, // Store ID number in profile
        created_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })

    if (profileError) {
      console.error('[Create Vendor] Profile creation error:', profileError)
      
      // Handle unique constraint violations gracefully
      if (profileError.code === '23505' && profileError.message.includes('id_number')) {
        await supabase.from('payment_reconciliation').insert({
          payment_intent_id: paymentIntentId,
          issue_type: 'VENDOR_CREATION_FAILED',
          details: { 
            error: 'ID number already exists', 
            step: 'profile_creation',
            id_number_hash: await hashIdNumber(idNumber)
          }
        })
        
        return new Response(
          JSON.stringify({ error: 'This ID Number is already registered. Please contact support if you believe this is an error.' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      await supabase.from('payment_reconciliation').insert({
        payment_intent_id: paymentIntentId,
        issue_type: 'VENDOR_CREATION_FAILED',
        details: { error: String(profileError), step: 'profile_creation' }
      })

      throw profileError
    }

    console.log(`[Create Vendor] Profile created/updated for: ${userId}`)

    // Create vendor record
    // Subtask 11.3: Store ID number in vendor creation
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .insert({
        profile_id: userId,
        business_name: businessName,
        email: email,
        phone: phone,
        id_number: idNumber, // Store ID number in vendor (denormalized for performance)
        county: metadata.county,
        business_category: metadata.businessCategory,
        business_status: metadata.businessStatus,
        business_size: metadata.businessSize,
        business_model: metadata.businessModel,
        approval_status: 'pending_approval',
        registration_paid: true,
        registration_payment_date: new Date().toISOString(),
        registration_payment_id: paymentIntentId,
        registration_fee: intent.expected_amount
      })
      .select()
      .single()

    if (vendorError) {
      console.error('[Create Vendor] Vendor record creation error:', vendorError)
      
      // Handle unique constraint violations gracefully
      if (vendorError.code === '23505' && vendorError.message.includes('id_number')) {
        await supabase.from('payment_reconciliation').insert({
          payment_intent_id: paymentIntentId,
          issue_type: 'VENDOR_CREATION_FAILED',
          details: { 
            error: 'ID number already exists in vendors table', 
            step: 'vendor_record_creation',
            id_number_hash: await hashIdNumber(idNumber)
          }
        })
        
        return new Response(
          JSON.stringify({ error: 'This ID Number is already registered as a vendor. Please contact support.' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      await supabase.from('payment_reconciliation').insert({
        payment_intent_id: paymentIntentId,
        issue_type: 'VENDOR_CREATION_FAILED',
        details: { error: String(vendorError), step: 'vendor_record_creation' }
      })

      return new Response(
        JSON.stringify({ error: 'Failed to create vendor record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[Create Vendor] Vendor record created: ${vendor.id}`)

    // Log to audit_logs
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action_type: 'VENDOR_CREATED',
      details: {
        vendor_id: vendor.id,
        business_name: businessName,
        payment_intent_id: paymentIntentId,
        payment_reference: intent.payment_reference
      }
    })
    
    // Subtask 11.4: Create audit event for vendor registration
    try {
      const idNumberHash = await hashIdNumber(idNumber)
      await supabase.from('payment_events').insert({
        payment_intent_id: paymentIntentId,
        event_type: 'VENDOR_REGISTERED',
        provider: intent.payment_method === 'stkpush' ? 'MPESA_STK' : 'MPESA_C2B',
        event_data: {
          vendor_id: vendor.id,
          profile_id: userId,
          business_name: businessName,
          id_number_hash: idNumberHash, // Hash ID number for security
          payment_method: intent.payment_method,
          registration_fee: intent.expected_amount
        },
        triggered_by: userId,
        ip_address: ipAddress,
        user_agent: userAgent,
        occurred_at: new Date().toISOString()
      })
      console.log(`[Create Vendor] Payment event VENDOR_REGISTERED logged`)
    } catch (eventError) {
      console.error('[Create Vendor] Failed to create payment event:', eventError)
      // Don't fail the whole process if event logging fails
    }

    // Send welcome SMS (optional - implement if SMS service available)
    try {
      console.log(`[Create Vendor] Would send welcome SMS to: ${phone}`)
      // TODO: Integrate SMS service
      // await sendSMS(phone, `Welcome to Stokika! Your registration is under review. We'll notify you once approved.`)
    } catch (smsError) {
      console.error('[Create Vendor] SMS send failed:', smsError)
      // Don't fail the whole process if SMS fails
    }

    console.log(`[Create Vendor] Successfully created vendor: ${vendor.id}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        vendorId: vendor.id,
        userId: userId,
        message: 'Vendor account created successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[Create Vendor] Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
