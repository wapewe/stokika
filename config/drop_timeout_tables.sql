-- Drop tables created by mpesa_timeout_handling migration
DROP TABLE IF EXISTS admin_audit_log CASCADE;
DROP TABLE IF EXISTS payment_metrics CASCADE;
DROP TABLE IF EXISTS payment_status_queries CASCADE;
DROP TABLE IF EXISTS payment_attempts CASCADE;
DROP TABLE IF EXISTS payment_timeout_config CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS log_admin_action CASCADE;
DROP FUNCTION IF EXISTS get_admin_action_history CASCADE;
DROP FUNCTION IF EXISTS record_payment_metric CASCADE;
DROP FUNCTION IF EXISTS log_status_query CASCADE;
DROP FUNCTION IF EXISTS get_payment_status_query_history CASCADE;
DROP FUNCTION IF EXISTS cleanup_old_payment_attempts CASCADE;

-- Drop views
DROP VIEW IF EXISTS v_recent_admin_actions CASCADE;
DROP VIEW IF EXISTS v_admin_action_metrics CASCADE;
DROP VIEW IF EXISTS v_payment_metrics_summary CASCADE;
DROP VIEW IF EXISTS v_timeout_rate_metrics CASCADE;
DROP VIEW IF EXISTS v_recovery_rate_metrics CASCADE;
DROP VIEW IF EXISTS v_recent_status_queries CASCADE;
DROP VIEW IF EXISTS v_status_query_metrics CASCADE;
DROP VIEW IF EXISTS v_payment_timeout_monitoring CASCADE;
