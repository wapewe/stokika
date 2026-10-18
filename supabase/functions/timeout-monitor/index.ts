// M-Pesa Payment Timeout Monitor Service
// Tasks 3.1, 3.2, 3.3: Scheduled timeout detection, marking, and recovery triggering

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

interface TimeoutPayment {
  id: string;
  checkout_request_id: string;
  application_code: string;
  phone_number: string;
  kit_amount: number;
  created_at: string;
  flow_type: string;
  timeout_duration: number;
  elapsed_seconds: number;
}

/**
 * Task 3.1: Detect payments that have exceeded their timeout duration
 */
async function detectTimeoutPayments(supabase: any): Promise<TimeoutPayment[]> {
  try {
    // Query pending payments with their timeout configuration
    const { data, error } = await supabase.rpc('detect_timeout_payments_query', {});
    
    if (error) {
      // Fallback to direct query if RPC doesn't exist
      const { data: payments, error: queryError } = await supabase
        .from('stokika_kit_payments')
        .select(`
          id,
          checkout_request_id,
          application_code,
          phone_number,
          kit_amount,
          created_at,
          flow_type
        `)
        .eq('payment_status', 'pending')
        .not('checkout_request_id', 'is', null);

      if (queryError) throw queryError;

      // Get timeout configurations
      const { data: configs, error: configError } = await supabase
        .from('payment_timeout_config')
        .select('flow_type, timeout_duration');

      if (configError) throw configError;

      const configMap = new Map(
        configs.map((c: any) => [c.flow_type, c.timeout_duration])
      );

      // Calculate elapsed time and filter timed-out payments
      const timedOutPayments = payments
        .map((p: any) => {
          const createdAt = new Date(p.created_at);
          const elapsedSeconds = (Date.now() - createdAt.getTime()) / 1000;
          const timeoutDuration = configMap.get(p.flow_type) || 90;

          return {
            ...p,
            timeout_duration: timeoutDuration,
            elapsed_seconds: elapsedSeconds,
          };
        })
        .filter((p: any) => p.elapsed_seconds > p.timeout_duration);

      return timedOutPayments;
    }

    return data || [];
  } catch (error) {
    console.error('Error detecting timeout payments:', error);
    throw error;
  }
}

/**
 * Task 3.2: Mark payments as timed out and record metrics
 */
async function markPaymentsAsTimedOut(
  supabase: any,
  payments: TimeoutPayment[]
): Promise<number> {
  let markedCount = 0;

  for (const payment of payments) {
    try {
      // Update payment status to 'timeout'
      const { error: updateError } = await supabase
        .from('stokika_kit_payments')
        .update({
          payment_status: 'timeout',
          timeout_detected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.id)
        .eq('payment_status', 'pending'); // Only update if still pending

      if (updateError) {
        console.error(`Failed to mark payment ${payment.id} as timeout:`, updateError);
        continue;
      }

      // Record timeout metric
      const { error: metricError } = await supabase
        .from('payment_metrics')
        .insert({
          metric_type: 'timeout_detected',
          payment_id: payment.id,
          flow_type: payment.flow_type,
          timestamp: new Date().toISOString(),
          metadata: {
            elapsed_seconds: payment.elapsed_seconds,
            timeout_duration: payment.timeout_duration,
            checkout_request_id: payment.checkout_request_id,
          },
        });

      if (metricError) {
        console.error(`Failed to record metric for payment ${payment.id}:`, metricError);
        // Don't fail the whole process if metric recording fails
      }

      markedCount++;
      console.log(`Marked payment ${payment.id} as timeout after ${Math.round(payment.elapsed_seconds)}s`);
    } catch (error) {
      console.error(`Error processing payment ${payment.id}:`, error);
    }
  }

  return markedCount;
}

/**
 * Task 3.3: Trigger automatic status queries for timed-out payments
 */
async function triggerAutomaticStatusQueries(
  supabase: any,
  payments: TimeoutPayment[]
): Promise<number> {
  let triggeredCount = 0;

  for (const payment of payments) {
    try {
      // Call mpesa-status-query function
      const statusQueryUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/mpesa-status-query`;
      const serviceKey = Deno.env.get('SERVICE_ROLE_KEY');

      const response = await fetch(statusQueryUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          checkoutRequestId: payment.checkout_request_id,
          isAutomaticRetry: true,
        }),
      });

      if (response.ok) {
        triggeredCount++;
        console.log(`Triggered status query for payment ${payment.id}`);
      } else {
        const errorText = await response.text();
        console.error(`Failed to trigger status query for ${payment.id}: ${errorText}`);
      }
    } catch (error) {
      console.error(`Error triggering status query for ${payment.id}:`, error);
      // Continue with other payments
    }
  }

  return triggeredCount;
}

/**
 * Main handler - scheduled service that runs every 2 minutes
 */
serve(async (req: Request) => {
  // Only allow POST requests for scheduled execution
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Initialize Supabase client with service role
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const startTime = Date.now();

  try {
    console.log('Starting timeout detection cycle...');

    // Task 3.1: Detect timeout payments
    const timedOutPayments = await detectTimeoutPayments(supabase);
    console.log(`Found ${timedOutPayments.length} timed-out payments`);

    if (timedOutPayments.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          timeouts_detected: 0,
          message: 'No timed-out payments found',
          execution_time_ms: Date.now() - startTime,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Task 3.2: Mark payments as timeout and record metrics
    const markedCount = await markPaymentsAsTimedOut(supabase, timedOutPayments);
    console.log(`Marked ${markedCount} payments as timeout`);

    // Task 3.3: Trigger automatic status queries
    const triggeredCount = await triggerAutomaticStatusQueries(supabase, timedOutPayments);
    console.log(`Triggered ${triggeredCount} automatic status queries`);

    const executionTime = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        success: true,
        timeouts_detected: timedOutPayments.length,
        payments_marked: markedCount,
        status_queries_triggered: triggeredCount,
        execution_time_ms: executionTime,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Timeout monitor error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        execution_time_ms: Date.now() - startTime,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
