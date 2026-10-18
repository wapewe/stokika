/**
 * Verify Application Code Edge Function
 * 
 * Validates application codes and returns user type and details
 * - SFS codes are for Supervisors
 * - SFA codes are for Field Agents
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { application_code } = await req.json();

    if (!application_code) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'APPLICATION_CODE_REQUIRED',
          message: 'Application code is required'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    const normalizedCode = application_code.trim().toUpperCase();

    // Determine user type from code prefix
    let userType: 'supervisor' | 'field_agent' | null = null;
    
    if (normalizedCode.startsWith('SFS')) {
      userType = 'supervisor';
    } else if (normalizedCode.startsWith('SFA')) {
      userType = 'field_agent';
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'INVALID_CODE_FORMAT',
          message: 'Invalid application code format. Supervisor codes start with SFS, Field Agent codes start with SFA.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Query the appropriate table based on user type
    if (userType === 'supervisor') {
      const { data, error } = await supabase
        .from('supervisors')
        .select('application_code, first_name, last_name, phone, status, approval_status, created_at')
        .eq('application_code', normalizedCode)
        .maybeSingle();

      if (error) {
        console.error('[verify-application-code] Supervisor query error:', error);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'DATABASE_ERROR',
            message: 'Failed to verify application code'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        );
      }

      if (!data) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'CODE_NOT_FOUND',
            message: 'Application code not found. Please check your code or contact support.',
            userType: 'supervisor'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404,
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            ...data,
            user_type: 'supervisor'
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } else {
      // Field Agent
      const { data, error } = await supabase
        .from('field_agents')
        .select('application_code, first_name, last_name, phone, status, approval_status, created_at')
        .eq('application_code', normalizedCode)
        .maybeSingle();

      if (error) {
        console.error('[verify-application-code] Field agent query error:', error);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'DATABASE_ERROR',
            message: 'Failed to verify application code'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        );
      }

      if (!data) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'CODE_NOT_FOUND',
            message: 'Application code not found. Please check your code or contact support.',
            userType: 'field_agent'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404,
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            ...data,
            user_type: 'field_agent'
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

  } catch (error) {
    console.error('[verify-application-code] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'An error occurred while verifying the application code'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
