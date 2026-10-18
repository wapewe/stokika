/**
 * Metrics Export Edge Function
 * 
 * Exposes M-Pesa timeout handling metrics in Prometheus format
 * for integration with monitoring systems like Grafana, Prometheus, etc.
 * 
 * Section 10.2: Metrics export endpoint with Prometheus-compatible format
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Format metric in Prometheus exposition format
 * 
 * Format: metric_name{label="value"} value timestamp
 */
function formatPrometheusMetric(
  metricName: string,
  value: number,
  labels: Record<string, string> = {},
  helpText?: string,
  metricType: 'counter' | 'gauge' | 'histogram' | 'summary' = 'gauge'
): string {
  let output = '';
  
  // Add HELP and TYPE lines (only once per metric name)
  if (helpText) {
    output += `# HELP ${metricName} ${helpText}\n`;
    output += `# TYPE ${metricName} ${metricType}\n`;
  }
  
  // Format labels
  const labelStr = Object.entries(labels)
    .map(([key, val]) => `${key}="${val}"`)
    .join(',');
  
  // Add metric line
  const metricLine = labelStr 
    ? `${metricName}{${labelStr}} ${value}\n`
    : `${metricName} ${value}\n`;
  
  output += metricLine;
  
  return output;
}

/**
 * Get timeout metrics from database
 */
async function getTimeoutMetrics(supabase: any, hoursAgo: number = 24) {
  const since = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
  
  try {
    // Query payment metrics
    const { data: metrics, error } = await supabase
      .from('payment_metrics')
      .select('metric_type, flow_type, created_at')
      .gte('created_at', since);
    
    if (error) throw error;
    
    // Count by metric type and flow type
    const counts: Record<string, Record<string, number>> = {};
    
    metrics?.forEach((m: any) => {
      const metricType = m.metric_type || 'unknown';
      const flowType = m.flow_type || 'unknown';
      
      if (!counts[metricType]) counts[metricType] = {};
      if (!counts[flowType]) counts[metricType][flowType] = 0;
      
      counts[metricType][flowType]++;
    });
    
    return counts;
  } catch (error) {
    console.error('[Metrics Export] Error fetching metrics:', error);
    return {};
  }
}

/**
 * Get timeout rate from view
 */
async function getTimeoutRates(supabase: any) {
  try {
    const { data, error } = await supabase
      .from('timeout_rate_by_period')
      .select('*')
      .eq('period_type', 'hourly')
      .gte('period_start', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('period_start', { ascending: false })
      .limit(24);
    
    if (error) throw error;
    
    // Get latest rate per flow type
    const rates: Record<string, number> = {};
    data?.forEach((row: any) => {
      const flowType = row.flow_type || 'unknown';
      if (!rates[flowType]) {
        rates[flowType] = row.timeout_rate_percentage || 0;
      }
    });
    
    return rates;
  } catch (error) {
    console.error('[Metrics Export] Error fetching timeout rates:', error);
    return {};
  }
}

/**
 * Get recovery success rate from view
 */
async function getRecoveryRates(supabase: any) {
  try {
    const { data, error } = await supabase
      .from('recovery_success_rate')
      .select('*')
      .eq('period_type', 'hourly')
      .gte('period_start', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('period_start', { ascending: false })
      .limit(24);
    
    if (error) throw error;
    
    // Get latest rate per flow type
    const rates: Record<string, number> = {};
    data?.forEach((row: any) => {
      const flowType = row.flow_type || 'unknown';
      if (!rates[flowType]) {
        rates[flowType] = row.recovery_success_rate_percentage || 0;
      }
    });
    
    return rates;
  } catch (error) {
    console.error('[Metrics Export] Error fetching recovery rates:', error);
    return {};
  }
}

/**
 * Get manual approval rate from view
 */
async function getApprovalRates(supabase: any) {
  try {
    const { data, error } = await supabase
      .from('manual_approval_rate')
      .select('*')
      .eq('period_type', 'daily')
      .gte('period_start', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('period_start', { ascending: false })
      .limit(1);
    
    if (error) throw error;
    
    const latest = data?.[0];
    return {
      approved: latest?.approved_count || 0,
      rejected: latest?.rejected_count || 0,
      rate: latest?.approval_rate_percentage || 0
    };
  } catch (error) {
    console.error('[Metrics Export] Error fetching approval rates:', error);
    return { approved: 0, rejected: 0, rate: 0 };
  }
}

/**
 * Get response time metrics from view
 */
async function getResponseTimes(supabase: any) {
  try {
    const { data, error } = await supabase
      .from('status_query_response_time')
      .select('*')
      .eq('period_type', 'hourly')
      .gte('period_start', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('period_start', { ascending: false })
      .limit(24);
    
    if (error) throw error;
    
    // Get latest times per flow type
    const times: Record<string, any> = {};
    data?.forEach((row: any) => {
      const flowType = row.flow_type || 'unknown';
      if (!times[flowType]) {
        times[flowType] = {
          avg: row.avg_response_time_seconds || 0,
          median: row.median_response_time_seconds || 0,
          p95: row.p95_response_time_seconds || 0
        };
      }
    });
    
    return times;
  } catch (error) {
    console.error('[Metrics Export] Error fetching response times:', error);
    return {};
  }
}

/**
 * Get payment counts
 */
async function getPaymentCounts(supabase: any, hoursAgo: number = 24) {
  const since = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
  
  try {
    const { data, error } = await supabase
      .from('stokika_kit_payments')
      .select('payment_status, flow_type')
      .gte('created_at', since);
    
    if (error) throw error;
    
    // Count by status and flow type
    const counts: Record<string, Record<string, number>> = {};
    
    data?.forEach((p: any) => {
      const status = p.payment_status || 'unknown';
      const flowType = p.flow_type || 'unknown';
      
      if (!counts[status]) counts[status] = {};
      if (!counts[status][flowType]) counts[status][flowType] = 0;
      
      counts[status][flowType]++;
    });
    
    return counts;
  } catch (error) {
    console.error('[Metrics Export] Error fetching payment counts:', error);
    return {};
  }
}

/**
 * Main handler
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  
  try {
    console.log('[Metrics Export] Request received');
    
    // Initialize Supabase with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get query parameters
    const url = new URL(req.url);
    const hours = parseInt(url.searchParams.get('hours') || '24');
    const format = url.searchParams.get('format') || 'prometheus'; // prometheus or json
    
    // Fetch all metrics
    const [
      metricCounts,
      timeoutRates,
      recoveryRates,
      approvalRates,
      responseTimes,
      paymentCounts
    ] = await Promise.all([
      getTimeoutMetrics(supabase, hours),
      getTimeoutRates(supabase),
      getRecoveryRates(supabase),
      getApprovalRates(supabase),
      getResponseTimes(supabase),
      getPaymentCounts(supabase, hours)
    ]);
    
    if (format === 'json') {
      // Return JSON format
      return new Response(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          period_hours: hours,
          metrics: {
            counts: metricCounts,
            timeout_rates: timeoutRates,
            recovery_rates: recoveryRates,
            approval_rates: approvalRates,
            response_times: responseTimes,
            payment_counts: paymentCounts
          }
        }, null, 2),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }
    
    // Build Prometheus exposition format
    let output = '';
    
    // Add timestamp comment
    output += `# M-Pesa Timeout Handling Metrics\n`;
    output += `# Generated: ${new Date().toISOString()}\n`;
    output += `# Period: Last ${hours} hours\n\n`;
    
    // Payment counts by status and flow type
    output += formatPrometheusMetric(
      'mpesa_payments_total',
      0,
      {},
      'Total M-Pesa payments by status and flow type',
      'counter'
    );
    
    for (const [status, flowTypes] of Object.entries(paymentCounts)) {
      for (const [flowType, count] of Object.entries(flowTypes)) {
        output += formatPrometheusMetric(
          'mpesa_payments_total',
          count,
          { status, flow_type: flowType }
        );
      }
    }
    output += '\n';
    
    // Timeout metrics by type and flow
    output += formatPrometheusMetric(
      'mpesa_timeout_events_total',
      0,
      {},
      'Timeout-related events by type and flow',
      'counter'
    );
    
    for (const [metricType, flowTypes] of Object.entries(metricCounts)) {
      for (const [flowType, count] of Object.entries(flowTypes)) {
        output += formatPrometheusMetric(
          'mpesa_timeout_events_total',
          count,
          { metric_type: metricType, flow_type: flowType }
        );
      }
    }
    output += '\n';
    
    // Timeout rate percentage
    output += formatPrometheusMetric(
      'mpesa_timeout_rate_percentage',
      0,
      {},
      'Percentage of payments that timeout by flow type',
      'gauge'
    );
    
    for (const [flowType, rate] of Object.entries(timeoutRates)) {
      output += formatPrometheusMetric(
        'mpesa_timeout_rate_percentage',
        rate,
        { flow_type: flowType }
      );
    }
    output += '\n';
    
    // Recovery success rate
    output += formatPrometheusMetric(
      'mpesa_recovery_success_rate_percentage',
      0,
      {},
      'Percentage of timeouts that auto-recover by flow type',
      'gauge'
    );
    
    for (const [flowType, rate] of Object.entries(recoveryRates)) {
      output += formatPrometheusMetric(
        'mpesa_recovery_success_rate_percentage',
        rate,
        { flow_type: flowType }
      );
    }
    output += '\n';
    
    // Manual approval metrics
    output += formatPrometheusMetric(
      'mpesa_manual_verifications_total',
      approvalRates.approved + approvalRates.rejected,
      {},
      'Total manual payment verifications',
      'counter'
    );
    
    output += formatPrometheusMetric(
      'mpesa_manual_approved_total',
      approvalRates.approved,
      {},
      'Total approved manual payments',
      'counter'
    );
    
    output += formatPrometheusMetric(
      'mpesa_manual_rejected_total',
      approvalRates.rejected,
      {},
      'Total rejected manual payments',
      'counter'
    );
    
    output += formatPrometheusMetric(
      'mpesa_manual_approval_rate_percentage',
      approvalRates.rate,
      {},
      'Manual payment approval rate percentage',
      'gauge'
    );
    output += '\n';
    
    // Response time metrics
    output += formatPrometheusMetric(
      'mpesa_status_query_response_seconds',
      0,
      {},
      'Status query response time by flow type and quantile',
      'summary'
    );
    
    for (const [flowType, times] of Object.entries(responseTimes)) {
      output += formatPrometheusMetric(
        'mpesa_status_query_response_seconds',
        times.avg,
        { flow_type: flowType, quantile: '0.50' }
      );
      output += formatPrometheusMetric(
        'mpesa_status_query_response_seconds',
        times.median,
        { flow_type: flowType, quantile: '0.50' }
      );
      output += formatPrometheusMetric(
        'mpesa_status_query_response_seconds',
        times.p95,
        { flow_type: flowType, quantile: '0.95' }
      );
    }
    output += '\n';
    
    // System health indicator (1 = healthy, 0 = unhealthy)
    const isHealthy = Object.values(timeoutRates).every((rate: number) => rate < 30);
    output += formatPrometheusMetric(
      'mpesa_system_healthy',
      isHealthy ? 1 : 0,
      {},
      'System health indicator (1=healthy, 0=unhealthy)',
      'gauge'
    );
    
    console.log('[Metrics Export] Metrics generated successfully');
    
    return new Response(output, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain; version=0.0.4'
      }
    });
    
  } catch (error) {
    console.error('[Metrics Export] Error:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Failed to generate metrics',
        message: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});
