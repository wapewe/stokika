/**
 * Manual Payment Verification Edge Function
 * Tasks 5.1-5.5: Admin endpoint for manual payment verification
 * 
 * This function allows admins to manually approve or reject payments that
 * require manual verification (e.g., after callback_missing or timeout).
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

interface VerificationRequest {
  paymentId: string;
  action: 'approve' | 'reject';
  notes?: string;
}

/**
 * Task 5.1: Authenticate admin user
 */
async function authenticateAdmin(
  supabase: any,
  authHeader: string | null
): Promise<{ success: boolean; userId?: string; error?: string }> {
  if (!authHeader) {
    return { success: false, error: 'Missing Authorization header' };
  }

  // Extract token
  const token = authHeader.replace('Bearer ', '');

  // Verify JWT token
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    console.error('[Manual Verify] Auth error:', authError);
    return { success: false, error: 'Invalid or expired token' };
  }

  // Verify admin role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role_id, user_roles(role_name)')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    console.error('[Manual Verify] Profile error:', profileError);
    return { success: false, error: 'Failed to verify user role' };
  }

  const roleName = profile.user_roles?.role_name;
  if (!['admin', 'super_admin'].includes(roleName)) {
    return { success: false, error: 'Insufficient permissions. Admin role required.' };
  }

  return { success: true, userId: user.id };
}

/**
 * Task 5.2: Validate verification request
 */
async function validateVerificationRequest(
  supabase: any,
  request: VerificationRequest
): Promise<{ 
  success: boolean; 
  payment?: any; 
  error?: string;
  statusCode?: number;
}> {
  // Validate paymentId
  if (!request.paymentId || request.paymentId.trim() === '') {
    return { 
      success: false, 
      error: 'paymentId is required',
      statusCode: 400 
    };
  }

  // Validate action
  if (!request.action || !['approve', 'reject'].includes(request.action)) {
    return { 
      success: false, 
      error: 'action must be either "approve" or "reject"',
      statusCode: 400 
    };
  }

  // Fetch payment record
  const { data: payment, error: fetchError } = await supabase
    .from('stokika_kit_payments')
    .select('*')
    .eq('id', request.paymentId)
    .single();

  if (fetchError || !payment) {
    console.error('[Manual Verify] Payment not found:', fetchError);
    return { 
      success: false, 
      error: 'Payment record not found',
      statusCode: 404 
    };
  }

  // Verify payment status is verifiable
  const verifiableStatuses = [
    'awaiting_verification',
    'callback_missing',
    'manual_verification_pending',
    'timeout'
  ];

  if (!verifiableStatuses.includes(payment.payment_status)) {
    return {
      success: false,
      error: `Payment status "${payment.payment_status}" cannot be manually verified. Status must be one of: ${verifiableStatuses.join(', ')}`,
      statusCode: 400
    };
  }

  return { success: true, payment };
}

/**
 * Task 5.3: Check for duplicate payments (on approval)
 */
async function checkDuplicatePayment(
  supabase: any,
  payment: any
): Promise<{ isDuplicate: boolean; duplicatePaymentId?: string }> {
  // Only check for duplicates if payment has application_code
  if (!payment.application_code) {
    return { isDuplicate: false };
  }

  const { data: duplicates, error } = await supabase
    .from('stokika_kit_payments')
    .select('id, payment_status, created_at')
    .eq('application_code', payment.application_code)
    .in('payment_status', ['completed', 'verified'])
    .neq('id', payment.id);

  if (error) {
    console.error('[Manual Verify] Error checking duplicates:', error);
    return { isDuplicate: false };
  }

  if (duplicates && duplicates.length > 0) {
    console.log(`[Manual Verify] Found ${duplicates.length} duplicate payment(s)`);
    return { 
      isDuplicate: true, 
      duplicatePaymentId: duplicates[0].id 
    };
  }

  return { isDuplicate: false };
}

/**
 * Task 5.4: Update payment status for verification
 */
async function updatePaymentStatus(
  supabase: any,
  paymentId: string,
  action: 'approve' | 'reject',
  adminId: string,
  notes?: string
): Promise<{ success: boolean; payment?: any; error?: string }> {
  const now = new Date().toISOString();
  
  const updates: any = {
    verified_by: adminId,
    verified_at: now,
    verification_notes: notes || null,
    updated_at: now,
  };

  if (action === 'approve') {
    updates.payment_status = 'completed';
    updates.manual_payment_confirmed_at = now;
  } else {
    updates.payment_status = 'rejected';
    updates.rejection_reason = notes || 'Payment rejected by admin';
  }

  const { data: updatedPayment, error } = await supabase
    .from('stokika_kit_payments')
    .update(updates)
    .eq('id', paymentId)
    .select()
    .single();

  if (error) {
    console.error('[Manual Verify] Update error:', error);
    return { 
      success: false, 
      error: 'Failed to update payment status' 
    };
  }

  return { success: true, payment: updatedPayment };
}

/**
 * Task 5.5: Post-verification actions
 */
async function performPostVerificationActions(
  supabase: any,
  payment: any,
  action: 'approve' | 'reject',
  adminId: string,
  notes?: string
): Promise<void> {
  // Log admin action to audit log
  const { error: auditError } = await supabase
    .from('admin_audit_log')
    .insert({
      admin_id: adminId,
      action: action === 'approve' ? 'manual_payment_verified' : 'manual_payment_rejected',
      details: {
        payment_id: payment.id,
        checkout_request_id: payment.checkout_request_id,
        application_code: payment.application_code,
        amount: payment.kit_amount,
        notes: notes,
        previous_status: payment.payment_status,
      },
      timestamp: new Date().toISOString(),
    });

  if (auditError) {
    console.error('[Manual Verify] Audit log error:', auditError);
    // Don't fail the whole operation
  }

  // Record metric
  const metricType = action === 'approve' 
    ? 'manual_verification_approved' 
    : 'manual_verification_rejected';

  const { error: metricError } = await supabase
    .from('payment_metrics')
    .insert({
      metric_type: metricType,
      payment_id: payment.id,
      flow_type: payment.flow_type || 'kit_payment',
      timestamp: new Date().toISOString(),
      metadata: {
        admin_id: adminId,
        had_notes: !!notes,
      },
    });

  if (metricError) {
    console.error('[Manual Verify] Metric error:', metricError);
    // Don't fail the whole operation
  }

  // For approvals, trigger fulfillment
  if (action === 'approve') {
    try {
      // Call payment fulfillment (placeholder - implement actual logic)
      await triggerPaymentFulfillment(supabase, payment);
      
      // TODO: Send confirmation notification
      console.log(`[Manual Verify] Confirmation notification would be sent to ${payment.phone_number}`);
    } catch (error) {
      console.error('[Manual Verify] Fulfillment error:', error);
      // Log but don't fail - payment is already approved
    }
  } else {
    // For rejections, send rejection notification
    // TODO: Implement notification system
    console.log(`[Manual Verify] Rejection notification would be sent to ${payment.phone_number}`);
  }
}

/**
 * Trigger payment fulfillment (placeholder)
 */
async function triggerPaymentFulfillment(
  supabase: any,
  payment: any
): Promise<void> {
  console.log(`[Manual Verify] Triggering fulfillment for payment ${payment.id}`);
  
  // TODO: Implement actual fulfillment logic:
  // 1. Update field_agents or supervisors table (kit_paid = true)
  // 2. Create order records if applicable
  // 3. Update inventory
  // 4. Send confirmation email/SMS
  
  // For now, just log
  console.log(`[Manual Verify] Fulfillment completed for ${payment.application_code}`);
}

/**
 * Main Edge Function handler
 */
serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        } 
      }
    );
  }

  try {
    console.log('[Manual Verify] Function invoked');

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Task 5.1: Authenticate admin
    const authHeader = req.headers.get('Authorization');
    const authResult = await authenticateAdmin(supabase, authHeader);

    if (!authResult.success) {
      const statusCode = authHeader ? 403 : 401;
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: authResult.error 
        }),
        { 
          status: statusCode, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          } 
        }
      );
    }

    const adminId = authResult.userId!;
    console.log(`[Manual Verify] Admin authenticated: ${adminId}`);

    // Parse request body
    let requestData: VerificationRequest;
    try {
      requestData = await req.json();
    } catch (error) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid JSON in request body' 
        }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          } 
        }
      );
    }

    // Task 5.2: Validate request
    const validationResult = await validateVerificationRequest(supabase, requestData);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: validationResult.error 
        }),
        { 
          status: validationResult.statusCode || 400, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          } 
        }
      );
    }

    const payment = validationResult.payment!;
    console.log(`[Manual Verify] Verifying payment ${payment.id}, action: ${requestData.action}`);

    // Task 5.3: Check for duplicates (only on approval)
    if (requestData.action === 'approve') {
      const duplicateCheck = await checkDuplicatePayment(supabase, payment);
      if (duplicateCheck.isDuplicate) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Duplicate payment detected. This application code already has a completed payment.',
            duplicatePaymentId: duplicateCheck.duplicatePaymentId,
          }),
          { 
            status: 409, 
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            } 
          }
        );
      }
    }

    // Task 5.4: Update payment status
    const updateResult = await updatePaymentStatus(
      supabase,
      requestData.paymentId,
      requestData.action,
      adminId,
      requestData.notes
    );

    if (!updateResult.success) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: updateResult.error 
        }),
        { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          } 
        }
      );
    }

    // Task 5.5: Post-verification actions
    await performPostVerificationActions(
      supabase,
      updateResult.payment,
      requestData.action,
      adminId,
      requestData.notes
    );

    console.log(`[Manual Verify] Payment ${requestData.action}d successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Payment ${requestData.action}d successfully`,
        payment: {
          id: updateResult.payment.id,
          payment_status: updateResult.payment.payment_status,
          verified_by: updateResult.payment.verified_by,
          verified_at: updateResult.payment.verified_at,
          application_code: updateResult.payment.application_code,
        },
      }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        } 
      }
    );

  } catch (error) {
    console.error('[Manual Verify] Unexpected error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        } 
      }
    );
  }
});
