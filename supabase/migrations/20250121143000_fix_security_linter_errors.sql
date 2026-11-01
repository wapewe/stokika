-- Migration: Fix security linter errors
-- Fix: Remove SECURITY DEFINER from views and enable RLS on tables

-- ============================================================================
-- PART 1: Drop and recreate views WITHOUT SECURITY DEFINER
-- ============================================================================

-- Drop existing views
DROP VIEW IF EXISTS public.timeout_rate_by_period;
DROP VIEW IF EXISTS public.recovery_success_rate;
DROP VIEW IF EXISTS public.manual_approval_rate;
DROP VIEW IF EXISTS public.status_query_count_by_period;
DROP VIEW IF EXISTS public.payment_metrics_summary;
DROP VIEW IF EXISTS public.v_timeout_monitor_logs;
DROP VIEW IF EXISTS public.v_active_payment_alerts;
DROP VIEW IF EXISTS public.v_notification_delivery_metrics;

-- Recreate: timeout_rate_by_period
CREATE VIEW public.timeout_rate_by_period AS
WITH payment_counts AS (
  SELECT
    date_trunc('hour', created_at) AS period_hour,
    date_trunc('day', created_at) AS period_day,
    date_trunc('week', created_at) AS period_week,
    date_trunc('month', created_at) AS period_month,
    flow_type,
    COUNT(*) AS total_payments,
    COUNT(*) FILTER (WHERE payment_status IN ('timeout', 'awaiting_verification') AND manual_fallback_required = true) AS timeout_count
  FROM stokika_kit_payments
  WHERE created_at >= NOW() - INTERVAL '90 days'
  GROUP BY period_hour, period_day, period_week, period_month, flow_type
)
SELECT
  'hourly' AS period_type,
  period_hour AS period_start,
  flow_type,
  total_payments,
  timeout_count,
  CASE 
    WHEN total_payments > 0 THEN ROUND((timeout_count::DECIMAL / total_payments::DECIMAL) * 100, 2)
    ELSE 0
  END AS timeout_rate_percentage
FROM payment_counts
WHERE period_hour IS NOT NULL

UNION ALL

SELECT
  'daily' AS period_type,
  period_day AS period_start,
  flow_type,
  SUM(total_payments) AS total_payments,
  SUM(timeout_count) AS timeout_count,
  CASE 
    WHEN SUM(total_payments) > 0 THEN ROUND((SUM(timeout_count)::DECIMAL / SUM(total_payments)::DECIMAL) * 100, 2)
    ELSE 0
  END AS timeout_rate_percentage
FROM payment_counts
WHERE period_day IS NOT NULL
GROUP BY period_day, flow_type

UNION ALL

SELECT
  'weekly' AS period_type,
  period_week AS period_start,
  flow_type,
  SUM(total_payments) AS total_payments,
  SUM(timeout_count) AS timeout_count,
  CASE 
    WHEN SUM(total_payments) > 0 THEN ROUND((SUM(timeout_count)::DECIMAL / SUM(total_payments)::DECIMAL) * 100, 2)
    ELSE 0
  END AS timeout_rate_percentage
FROM payment_counts
WHERE period_week IS NOT NULL
GROUP BY period_week, flow_type

UNION ALL

SELECT
  'monthly' AS period_type,
  period_month AS period_start,
  flow_type,
  SUM(total_payments) AS total_payments,
  SUM(timeout_count) AS timeout_count,
  CASE 
    WHEN SUM(total_payments) > 0 THEN ROUND((SUM(timeout_count)::DECIMAL / SUM(total_payments)::DECIMAL) * 100, 2)
    ELSE 0
  END AS timeout_rate_percentage
FROM payment_counts
WHERE period_month IS NOT NULL
GROUP BY period_month, flow_type;

-- Recreate: recovery_success_rate
CREATE VIEW public.recovery_success_rate AS
WITH recovery_metrics AS (
  SELECT
    date_trunc('hour', timestamp) AS period_hour,
    date_trunc('day', timestamp) AS period_day,
    flow_type,
    COUNT(*) FILTER (WHERE metric_type = 'timeout_detected') AS timeout_count,
    COUNT(*) FILTER (WHERE metric_type = 'automatic_recovery_success') AS recovery_success_count
  FROM payment_metrics
  WHERE timestamp >= NOW() - INTERVAL '90 days'
  GROUP BY period_hour, period_day, flow_type
)
SELECT
  'hourly' AS period_type,
  period_hour AS period_start,
  flow_type,
  timeout_count,
  recovery_success_count,
  CASE 
    WHEN timeout_count > 0 THEN ROUND((recovery_success_count::DECIMAL / timeout_count::DECIMAL) * 100, 2)
    ELSE 0
  END AS recovery_success_rate_percentage
FROM recovery_metrics
WHERE period_hour IS NOT NULL

UNION ALL

SELECT
  'daily' AS period_type,
  period_day AS period_start,
  flow_type,
  SUM(timeout_count) AS timeout_count,
  SUM(recovery_success_count) AS recovery_success_count,
  CASE 
    WHEN SUM(timeout_count) > 0 THEN ROUND((SUM(recovery_success_count)::DECIMAL / SUM(timeout_count)::DECIMAL) * 100, 2)
    ELSE 0
  END AS recovery_success_rate_percentage
FROM recovery_metrics
WHERE period_day IS NOT NULL
GROUP BY period_day, flow_type;

-- Recreate: manual_approval_rate
CREATE VIEW public.manual_approval_rate AS
WITH approval_counts AS (
  SELECT
    date_trunc('day', timestamp) AS period_day,
    date_trunc('week', timestamp) AS period_week,
    COUNT(*) FILTER (WHERE action = 'manual_payment_verified') AS approved_count,
    COUNT(*) FILTER (WHERE action = 'manual_payment_rejected') AS rejected_count,
    COUNT(*) AS total_verifications
  FROM admin_audit_log
  WHERE action IN ('manual_payment_verified', 'manual_payment_rejected')
    AND timestamp >= NOW() - INTERVAL '90 days'
  GROUP BY period_day, period_week
)
SELECT
  'daily' AS period_type,
  period_day AS period_start,
  approved_count,
  rejected_count,
  total_verifications,
  CASE 
    WHEN total_verifications > 0 THEN ROUND((approved_count::DECIMAL / total_verifications::DECIMAL) * 100, 2)
    ELSE 0
  END AS approval_rate_percentage
FROM approval_counts
WHERE period_day IS NOT NULL

UNION ALL

SELECT
  'weekly' AS period_type,
  period_week AS period_start,
  SUM(approved_count) AS approved_count,
  SUM(rejected_count) AS rejected_count,
  SUM(total_verifications) AS total_verifications,
  CASE 
    WHEN SUM(total_verifications) > 0 THEN ROUND((SUM(approved_count)::DECIMAL / SUM(total_verifications)::DECIMAL) * 100, 2)
    ELSE 0
  END AS approval_rate_percentage
FROM approval_counts
WHERE period_week IS NOT NULL
GROUP BY period_week;

-- Recreate: status_query_count_by_period
CREATE VIEW public.status_query_count_by_period AS
SELECT
  date_trunc('hour', queried_at) AS period_hour,
  date_trunc('day', queried_at) AS period_day,
  COUNT(*) AS query_count,
  COUNT(*) FILTER (WHERE is_automatic_retry = true) AS automatic_retry_count,
  COUNT(*) FILTER (WHERE is_automatic_retry = false) AS manual_query_count
FROM payment_status_queries
WHERE queried_at >= NOW() - INTERVAL '90 days'
GROUP BY period_hour, period_day;

-- Recreate: payment_metrics_summary
CREATE VIEW public.payment_metrics_summary AS
SELECT
  date_trunc('hour', timestamp) AS period_hour,
  flow_type,
  metric_type,
  COUNT(*) AS metric_count,
  MIN(timestamp) AS first_occurrence,
  MAX(timestamp) AS last_occurrence
FROM payment_metrics
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY period_hour, flow_type, metric_type
ORDER BY period_hour DESC, flow_type, metric_type;

-- Recreate: v_timeout_monitor_logs
CREATE VIEW public.v_timeout_monitor_logs AS
SELECT 
    jrd.jobid,
    j.jobname,
    jrd.runid,
    jrd.status,
    jrd.return_message,
    jrd.start_time,
    jrd.end_time,
    EXTRACT(EPOCH FROM (jrd.end_time - jrd.start_time)) as duration_seconds
FROM cron.job_run_details jrd
JOIN cron.job j ON j.jobid = jrd.jobid
WHERE j.jobname = 'mpesa-timeout-monitor'
ORDER BY jrd.start_time DESC
LIMIT 100;

-- Recreate: v_active_payment_alerts
CREATE VIEW public.v_active_payment_alerts AS
SELECT 
    'high_timeout_rate' as alert_type,
    (SELECT alert_triggered FROM check_timeout_rate_alert()) as is_active,
    (SELECT current_rate FROM check_timeout_rate_alert()) as current_value,
    (SELECT threshold FROM check_timeout_rate_alert()) as threshold_value,
    (SELECT last_triggered_at FROM payment_alert_thresholds WHERE alert_type = 'high_timeout_rate') as last_triggered;

-- Recreate: v_notification_delivery_metrics
CREATE VIEW public.v_notification_delivery_metrics AS
SELECT 
    notification_type,
    COUNT(*) as total_sent,
    COUNT(*) FILTER (WHERE delivery_status = 'delivered') as delivered_count,
    COUNT(*) FILTER (WHERE delivery_status = 'failed') as failed_count,
    COUNT(*) FILTER (WHERE email_sent = true) as email_count,
    COUNT(*) FILTER (WHERE sms_sent = true) as sms_count,
    ROUND(AVG(retry_count), 2) as avg_retry_count,
    MAX(sent_at) as last_sent_at
FROM payment_notifications
WHERE sent_at >= now() - interval '7 days'
GROUP BY notification_type;

-- Grant permissions on recreated views
GRANT SELECT ON public.timeout_rate_by_period TO authenticated, service_role;
GRANT SELECT ON public.recovery_success_rate TO authenticated, service_role;
GRANT SELECT ON public.manual_approval_rate TO authenticated, service_role;
GRANT SELECT ON public.status_query_count_by_period TO authenticated, service_role;
GRANT SELECT ON public.payment_metrics_summary TO authenticated, service_role;
GRANT SELECT ON public.v_timeout_monitor_logs TO authenticated;
GRANT SELECT ON public.v_active_payment_alerts TO authenticated;
GRANT SELECT ON public.v_notification_delivery_metrics TO authenticated;

-- ============================================================================
-- PART 2: Enable RLS on tables
-- ============================================================================

ALTER TABLE public.payment_timeout_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_alert_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_feature_flags ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 3: Create RLS policies
-- ============================================================================

-- RLS Policies for payment_timeout_events
-- Allow service_role full access for automated logging
CREATE POLICY payment_timeout_events_service_role_all 
ON public.payment_timeout_events
FOR ALL 
TO service_role
USING (true) 
WITH CHECK (true);

-- Allow admin users full access for monitoring
CREATE POLICY payment_timeout_events_admin_all 
ON public.payment_timeout_events
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles ur ON p.role_id = ur.id
    WHERE p.id = auth.uid()
    AND ur.role_name IN ('admin', 'super_admin', 'finance')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles ur ON p.role_id = ur.id
    WHERE p.id = auth.uid()
    AND ur.role_name IN ('admin', 'super_admin', 'finance')
  )
);

-- RLS Policies for payment_alert_thresholds
-- Allow service_role full access
CREATE POLICY payment_alert_thresholds_service_role_all 
ON public.payment_alert_thresholds
FOR ALL 
TO service_role
USING (true) 
WITH CHECK (true);

-- Allow authenticated users to read alert thresholds
CREATE POLICY payment_alert_thresholds_authenticated_read 
ON public.payment_alert_thresholds
FOR SELECT 
TO authenticated
USING (true);

-- Allow only admins to modify alert thresholds
CREATE POLICY payment_alert_thresholds_admin_write 
ON public.payment_alert_thresholds
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles ur ON p.role_id = ur.id
    WHERE p.id = auth.uid()
    AND ur.role_name IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles ur ON p.role_id = ur.id
    WHERE p.id = auth.uid()
    AND ur.role_name IN ('admin', 'super_admin')
  )
);

-- RLS Policies for system_feature_flags
-- Allow service_role full access
CREATE POLICY system_feature_flags_service_role_all 
ON public.system_feature_flags
FOR ALL 
TO service_role
USING (true) 
WITH CHECK (true);

-- Allow all authenticated and anonymous users to read feature flags
CREATE POLICY system_feature_flags_public_read 
ON public.system_feature_flags
FOR SELECT 
TO authenticated, anon
USING (true);

-- Allow only admins to modify feature flags
CREATE POLICY system_feature_flags_admin_write 
ON public.system_feature_flags
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles ur ON p.role_id = ur.id
    WHERE p.id = auth.uid()
    AND ur.role_name IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles ur ON p.role_id = ur.id
    WHERE p.id = auth.uid()
    AND ur.role_name IN ('admin', 'super_admin')
  )
);

-- Add comments for documentation
COMMENT ON POLICY payment_timeout_events_service_role_all ON public.payment_timeout_events IS 'Allow service_role full access for automated timeout event logging';
COMMENT ON POLICY payment_timeout_events_admin_all ON public.payment_timeout_events IS 'Allow admin users full access for monitoring and manual event logging';
COMMENT ON POLICY payment_alert_thresholds_service_role_all ON public.payment_alert_thresholds IS 'Allow service_role full access for automated threshold management';
COMMENT ON POLICY payment_alert_thresholds_authenticated_read ON public.payment_alert_thresholds IS 'Allow authenticated users to view alert thresholds';
COMMENT ON POLICY payment_alert_thresholds_admin_write ON public.payment_alert_thresholds IS 'Allow only admins to modify alert thresholds';
COMMENT ON POLICY system_feature_flags_service_role_all ON public.system_feature_flags IS 'Allow service_role full access for feature flag management';
COMMENT ON POLICY system_feature_flags_public_read ON public.system_feature_flags IS 'Allow all users to read feature flags for runtime behavior';
COMMENT ON POLICY system_feature_flags_admin_write ON public.system_feature_flags IS 'Allow only admins to modify feature flags';
