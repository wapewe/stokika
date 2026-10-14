// Supabase Edge Function: verify-application-code
// Securely verifies application code and returns minimal data needed for kit payment

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApplicationCodeRequest {
  application_code?: string;
}

interface ApplicationData {
  application_code: string;
  full_name: string;
  phone: string;
  user_type: 'field_agent' | 'supervisor' | 'vendor';
  approval_status: string;
  created_at: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
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
        const body = await req.json() as ApplicationCodeRequest;
        application_code = body?.application_code;
      } catch (_) {
        // Fallback to URL search params
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
          error: 'Invalid application code format' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Sanitize and normalize application code
    const normalizedCode = application_code.trim().toUpperCase();

    const clientIP = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     'unknown';

    console.log(`[verify-application-code] Lookup attempt from IP: ${clientIP}, Code: ${normalizedCode}`);

    // Check field_agents table first
    const { data: fieldAgent, error: fieldAgentError } = await supabase
      .from('field_agents')
      .select('application_code, first_name, last_name, phone, status, approval_status, created_at')
      .eq('application_code', normalizedCode)
      .maybeSingle();

    if (fieldAgentError) {
      console.error('[verify-application-code] Field agent query error:', fieldAgentError);
    }

    if (fieldAgent) {
      const fullName = [fieldAgent.first_name, fieldAgent.last_name].filter(Boolean).join(' ') || 'Field Agent';
      const response: ApplicationData = {
        application_code: fieldAgent.application_code,
        full_name: fullName,
        phone: fieldAgent.phone,
        user_type: 'field_agent',
        approval_status: fieldAgent.approval_status || fieldAgent.status || 'pending',
        created_at: fieldAgent.created_at,
      };

      console.log(`[verify-application-code] Found field agent: ${fullName}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: response 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check supervisors table
    const { data: supervisor, error: supervisorError } = await supabase
      .from('supervisors')
      .select('application_code, first_name, last_name, phone, status, approval_status, created_at')
      .eq('application_code', normalizedCode)
      .maybeSingle();

    if (supervisorError) {
      console.error('[verify-application-code] Supervisor query error:', supervisorError);
    }

    if (supervisor) {
      const fullName = [supervisor.first_name, supervisor.last_name].filter(Boolean).join(' ') || 'Supervisor';
      const response: ApplicationData = {
        application_code: supervisor.application_code,
        full_name: fullName,
        phone: supervisor.phone,
        user_type: 'supervisor',
        approval_status: supervisor.approval_status || supervisor.status || 'pending',
        created_at: supervisor.created_at,
      };

      console.log(`[verify-application-code] Found supervisor: ${fullName}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: response 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check vendors table
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .select('id, business_name, location, registration_number, tax_pin, is_verified, created_at')
      .or(`registration_number.eq.${normalizedCode},tax_pin.eq.${normalizedCode}`)
      .maybeSingle();

    if (vendorError) {
      console.error('[verify-application-code] Vendor query error:', vendorError);
    }

    if (vendor) {
      const response: ApplicationData = {
        application_code: normalizedCode,
        full_name: vendor.business_name || 'Vendor',
        phone: '',
        user_type: 'vendor',
        approval_status: vendor.is_verified ? 'approved' : 'pending',
        created_at: vendor.created_at,
      };

      console.log(`[verify-application-code] Found vendor: ${vendor.business_name}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: response 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Application code not found
    console.log(`[verify-application-code] Application code not found: ${normalizedCode}`);

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Invalid application code. Please check and try again.' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[verify-application-code] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error. Please try again later.' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
