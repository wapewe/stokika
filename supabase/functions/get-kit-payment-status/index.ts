// Supabase Edge Function: get-kit-payment-status
// Retrieves kit payment status by application code

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentStatusRequest {
  application_code?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Parse request body or URL search params safely
    let application_code: string | undefined;

    if (req.method === 'POST') {
      try {
        const body = await req.json() as PaymentStatusRequest;
        application_code = body?.application_code;
      } catch (_) {
        // Body might be empty, try URL search params next
      }
    }

    if (!application_code) {
      const url = new URL(req.url);
      application_code = url.searchParams.get('application_code') || undefined;
    }

    // Validate input
    if (!application_code || typeof application_code !== 'string') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Application code is required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Sanitize and normalize application code
    const normalizedCode = application_code.trim().toUpperCase();

    console.log(`[get-kit-payment-status] Checking payment for: ${normalizedCode}`);

    // Get the most recent kit payment from stokika_kit_payments
    let { data: payment, error } = await supabase
      .from('stokika_kit_payments')
      .select('*')
      .eq('application_code', normalizedCode)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[get-kit-payment-status] Database error on stokika_kit_payments:', error);
    }

    // If no record in stokika_kit_payments or pending, check payment_transactions for matching confirmed payment
    if (!payment || payment.payment_status === 'pending') {
      const { data: tx } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('account_reference', normalizedCode)
        .in('status', ['CONFIRMED', 'COMPLETED'])
        .order('confirmed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (tx) {
        console.log(`[get-kit-payment-status] Found confirmed payment transaction for ${normalizedCode}`);
        // If payment record exists, update to verified/completed
        if (payment) {
          const { data: updated } = await supabase
            .from('stokika_kit_payments')
            .update({
              payment_status: 'verified',
              mpesa_receipt_number: tx.receipt_number || tx.provider_transaction_id,
              verified_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', payment.id)
            .select()
            .single();
          if (updated) payment = updated;
        } else {
          // Return synthesized payment info
          payment = {
            application_code: normalizedCode,
            payment_status: 'verified',
            kit_amount: tx.amount,
            mpesa_receipt_number: tx.receipt_number || tx.provider_transaction_id,
            verified_at: tx.confirmed_at || new Date().toISOString()
          };
        }
      }
    }

    if (!payment) {
      console.log(`[get-kit-payment-status] No payment found for: ${normalizedCode}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: null,
          message: 'No payment record found' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`[get-kit-payment-status] Payment found: ${payment.payment_status}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: payment 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[get-kit-payment-status] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error.' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
