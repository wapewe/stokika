// M-Pesa Payment Timeout Configuration Service
// Tasks 2.1 & 2.2: GET and POST endpoints for timeout configuration management

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import {
  validateFlowType,
  validateConfig,
  VALID_FLOW_TYPES,
} from './validation.ts';

// Default configuration values
const DEFAULT_CONFIG = {
  kit_payment: {
    timeout_duration: 90,
    max_retries: 3,
    retry_interval: 30,
  },
  vendor_order: {
    timeout_duration: 120,
    max_retries: 3,
    retry_interval: 30,
  },
  manual_payment: {
    timeout_duration: 300,
    max_retries: 5,
    retry_interval: 60,
  },
};

/**
 * Handle GET request - Retrieve timeout configuration for a flow type
 * Task 2.1: Implement GET /config-service endpoint
 */
async function handleGet(req: Request, supabase: any): Promise<Response> {
  const url = new URL(req.url);
  const flowType = url.searchParams.get('flowType');

  // Validate flowType parameter
  if (!flowType) {
    return new Response(
      JSON.stringify({
        error: 'Missing required parameter: flowType',
        validFlowTypes: VALID_FLOW_TYPES,
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const flowTypeValidation = validateFlowType(flowType);
  if (!flowTypeValidation.valid) {
    return new Response(
      JSON.stringify({
        error: flowTypeValidation.error,
        validFlowTypes: VALID_FLOW_TYPES,
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    // Query payment_timeout_config table
    const { data, error } = await supabase
      .from('payment_timeout_config')
      .select('*')
      .eq('flow_type', flowType)
      .single();

    if (error) {
      // If no config exists, return default values
      if (error.code === 'PGRST116') {
        return new Response(
          JSON.stringify({
            flow_type: flowType,
            ...DEFAULT_CONFIG[flowType as keyof typeof DEFAULT_CONFIG],
            isDefault: true,
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to retrieve configuration' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        ...data,
        isDefault: false,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Handle POST request - Update timeout configuration (admin only)
 * Task 2.2: Implement POST /config-service endpoint for updates
 */
async function handlePost(req: Request, supabase: any): Promise<Response> {
  try {
    // Parse request body
    const body = await req.json();
    const { flow_type, timeout_duration, max_retries, retry_interval } = body;

    // Validate all parameters
    const validation = validateConfig({
      flow_type,
      timeout_duration,
      max_retries,
      retry_interval,
    });

    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Authenticate admin user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role_id, user_roles(role_name)')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Failed to verify user role' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const roleName = profile.user_roles?.role_name;
    if (!['admin', 'super_admin'].includes(roleName)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions. Admin role required.' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Upsert configuration to payment_timeout_config table
    const { data: configData, error: configError } = await supabase
      .from('payment_timeout_config')
      .upsert({
        flow_type,
        timeout_duration,
        max_retries,
        retry_interval,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'flow_type',
      })
      .select()
      .single();

    if (configError) {
      console.error('Configuration update error:', configError);
      return new Response(
        JSON.stringify({ error: 'Failed to update configuration' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Log configuration change to admin_audit_log
    const { error: auditError } = await supabase
      .from('admin_audit_log')
      .insert({
        admin_id: user.id,
        action: 'timeout_config_updated',
        details: {
          flow_type,
          timeout_duration,
          max_retries,
          retry_interval,
          previous_values: body.previous_values || null,
        },
        timestamp: new Date().toISOString(),
      });

    if (auditError) {
      console.error('Audit log error:', auditError);
      // Don't fail the request if audit logging fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        config: configData,
        message: 'Configuration updated successfully',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// Main handler
serve(async (req: Request) => {
  // CORS handling
  const origin = req.headers.get('origin') || '*';
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Initialize Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let response: Response;

  try {
    // Route based on HTTP method
    if (req.method === 'GET') {
      response = await handleGet(req, supabase);
    } else if (req.method === 'POST') {
      response = await handlePost(req, supabase);
    } else {
      response = new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Add CORS headers to response
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    console.error('Server error:', error);
    const errorResponse = new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
    return errorResponse;
  }
});
