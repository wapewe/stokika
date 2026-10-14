// Supabase Edge Function: verify-kit-manual-payment
// Verifies manual M-Pesa Paybill payment against actual database records (C2B transactions)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyManualRequest {
  application_code: string;
  mpesa_code: string;
  phone_number: string;
  amount: number;
  user_type?: 'field_agent' | 'supervisor' | 'vendor';
  payment_reference?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let payload: VerifyManualRequest;
    try {
      payload = await req.json();
    } catch (_) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { application_code, mpesa_code, phone_number, amount, user_type } = payload;

    if (!application_code || !mpesa_code || !phone_number) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Application code, M-Pesa transaction code, and phone number are required.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedCode = application_code.trim().toUpperCase();
    const cleanReceipt = mpesa_code.trim().toUpperCase();
    const cleanPhone = phone_number.replace(/\D/g, '');

    // Validate receipt format (10 alphanumeric characters)
    if (!/^[A-Z0-9]{10}$/.test(cleanReceipt)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid M-Pesa receipt code format. Must be 10 characters (e.g. QA12BC3456).'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine user type if not provided
    let actualUserType = user_type;
    if (!actualUserType) {
      const { data: agent } = await supabase
        .from('field_agents')
        .select('id')
        .eq('application_code', normalizedCode)
        .maybeSingle();

      if (agent) {
        actualUserType = 'field_agent';
      } else {
        const { data: sup } = await supabase
          .from('supervisors')
          .select('id')
          .eq('application_code', normalizedCode)
          .maybeSingle();
        if (sup) {
          actualUserType = 'supervisor';
        } else {
          const { data: ven } = await supabase
            .from('vendors')
            .select('id')
            .or(`registration_number.eq.${normalizedCode},tax_pin.eq.${normalizedCode}`)
            .maybeSingle();
          if (ven) actualUserType = 'vendor';
        }
      }
    }

    if (!actualUserType) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Application not found. Please verify your application code.'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Expected kit amount - query dynamically from database (defaults: vendor 1050, supervisor 3050, field agent 1550)
    let expectedAmount = actualUserType === 'vendor' ? 1050 : (actualUserType === 'supervisor' ? 3050 : 1550);
    try {
      const { data: kitConfig } = await supabase
        .from('stokika_kit_config')
        .select('kit_amount')
        .eq('user_type', actualUserType)
        .eq('is_active', true)
        .maybeSingle();
      if (kitConfig?.kit_amount) {
        expectedAmount = parseFloat(kitConfig.kit_amount);
        console.log(`[verify-manual] Retrieved database kit amount for ${actualUserType}: KES ${expectedAmount}`);
      }
    } catch (e) {
      console.warn('[verify-kit-manual-payment] Error fetching kit config from DB:', e);
    }

    // Check 1: Check if already verified for ANOTHER application code in stokika_kit_payments
    const { data: existingKitPayment } = await supabase
      .from('stokika_kit_payments')
      .select('*')
      .eq('mpesa_receipt_number', cleanReceipt)
      .maybeSingle();

    if (existingKitPayment) {
      if (existingKitPayment.application_code !== normalizedCode) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'This M-Pesa transaction code has already been registered to another application.'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (existingKitPayment.payment_status === 'verified' || existingKitPayment.payment_status === 'completed') {
        return new Response(
          JSON.stringify({
            success: true,
            verified: true,
            message: 'Payment is already verified.',
            data: existingKitPayment
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check 2: Check payment_transactions for matching M-Pesa C2B / transaction record
    const { data: transaction } = await supabase
      .from('payment_transactions')
      .select('*')
      .or(`provider_transaction_id.eq.${cleanReceipt},receipt_number.eq.${cleanReceipt}`)
      .limit(1)
      .maybeSingle();

    if (!transaction) {
      console.warn(`[verify-manual] Transaction ${cleanReceipt} not found in database for code ${normalizedCode}`);
      return new Response(
        JSON.stringify({
          success: false,
          verified: false,
          error: `M-Pesa transaction "${cleanReceipt}" was not found in our payment records. Please verify that you have completed the M-Pesa Paybill payment (Paybill: 1140839, Account: ${normalizedCode}) and allow 1-2 minutes for M-Pesa confirmation.`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check 3: Validate amount
    const paidAmount = parseFloat(transaction.amount);
    if (paidAmount < expectedAmount) {
      return new Response(
        JSON.stringify({
          success: false,
          verified: false,
          error: `Underpayment detected: KES ${paidAmount} was received, but KES ${expectedAmount} is required for the ${actualUserType.replace('_', ' ')} kit.`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check 4: Success! Update or insert into stokika_kit_payments
    const now = new Date().toISOString();
    let paymentRecord;

    if (existingKitPayment) {
      const { data: updated, error: updateErr } = await supabase
        .from('stokika_kit_payments')
        .update({
          payment_status: 'verified',
          kit_amount: paidAmount,
          verified_at: now,
          updated_at: now,
          payment_method: 'manual_paybill',
          mpesa_receipt_number: cleanReceipt
        })
        .eq('id', existingKitPayment.id)
        .select()
        .single();

      if (updateErr) throw updateErr;
      paymentRecord = updated;
    } else {
      const { data: inserted, error: insertErr } = await supabase
        .from('stokika_kit_payments')
        .insert({
          application_code: normalizedCode,
          user_type: actualUserType,
          kit_amount: paidAmount,
          phone_number: cleanPhone.startsWith('254') ? cleanPhone : (cleanPhone.startsWith('0') ? '254' + cleanPhone.substring(1) : cleanPhone),
          payment_status: 'verified',
          mpesa_receipt_number: cleanReceipt,
          payment_method: 'manual_paybill',
          verified_at: now,
          created_at: now,
          updated_at: now
        })
        .select()
        .single();

      if (insertErr) throw insertErr;
      paymentRecord = inserted;
    }

    // Also update field_agents / supervisors table approval_status
    const targetTable = actualUserType === 'field_agent' ? 'field_agents' : 'supervisors';
    await supabase
      .from(targetTable)
      .update({
        approval_status: 'approved',
        status: 'active',
        updated_at: now
      })
      .eq('application_code', normalizedCode);

    return new Response(
      JSON.stringify({
        success: true,
        verified: true,
        message: 'Payment verified successfully! Your account is now active.',
        data: paymentRecord
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[verify-manual] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error verifying payment.'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
