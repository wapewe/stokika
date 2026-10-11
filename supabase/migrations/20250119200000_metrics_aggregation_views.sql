-- Section 10: Monitoring and Alerting Infrastructure
-- Task 10.1: Metrics Aggregation SQL Views

-- ============================================================================
-- View: timeout_rate_by_period
-- Calculates timeout rate as percentage of total payments by time period
-- ============================================================================
CREATE OR REPLACE VIEW timeout_rate_by_period AS
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

-- ============================================================================
-- View: recovery_success_rate
-- Calculates automatic recovery success rate (timeouts that auto-recovered)
-- ============================================================================
CREATE OR REPLACE VIEW recovery_success_rate AS
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

-- ============================================================================
-- View: manual_approval_rate
-- Calculates manual payment approval vs rejection rate
-- ============================================================================
CREATE OR REPLACE VIEW manual_approval_rate AS
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

-- ============================================================================
-- View: status_query_count_by_period
-- Counts status queries by time period
-- ============================================================================
CREATE OR REPLACE VIEW status_query_count_by_period AS
SELECT
  date_trunc('hour', queried_at) AS period_hour,
  date_trunc('day', queried_at) AS period_day,
  COUNT(*) AS query_count,
  COUNT(*) FILTER (WHERE is_automatic_retry = true) AS automatic_retry_count,
  COUNT(*) FILTER (WHERE is_automatic_retry = false) AS manual_query_count
FROM payment_status_queries
WHERE queried_at >= NOW() - INTERVAL '90 days'
GROUP BY period_hour, period_day;

-- ============================================================================
-- View: payment_metrics_summary
-- Comprehensive metrics summary for monitoring dashboards
-- ============================================================================
CREATE OR REPLACE VIEW payment_metrics_summary AS
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

-- ============================================================================
-- Grant permissions
-- ============================================================================
GRANT SELECT ON timeout_rate_by_period TO authenticated, service_role;
GRANT SELECT ON recovery_success_rate TO authenticated, service_role;
GRANT SELECT ON manual_approval_rate TO authenticated, service_role;
GRANT SELECT ON status_query_count_by_period TO authenticated, service_role;
GRANT SELECT ON payment_metrics_summary TO authenticated, service_role;
