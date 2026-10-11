-- Performance Metrics Schema
-- Stores system performance and health metrics

CREATE TABLE IF NOT EXISTS system_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_type VARCHAR(50) NOT NULL,
    metric_value NUMERIC,
    metric_unit VARCHAR(20),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;

-- Admin access policy
DROP POLICY IF EXISTS "Admin access metrics" ON system_metrics;
CREATE POLICY "Admin access metrics" ON system_metrics
    FOR ALL USING (true) WITH CHECK (true);

-- Function to get current system metrics
CREATE OR REPLACE FUNCTION get_system_metrics()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'database_size', (
            SELECT pg_size_pretty(pg_database_size(current_database()))
        ),
        'active_sessions', (
            SELECT count(*) FROM pg_stat_activity WHERE state = 'active'
        ),
        'total_users', (
            SELECT count(*) FROM users
        ),
        'total_agents', (
            SELECT count(*) FROM field_agents WHERE approval_status = 'approved'
        ),
        'total_vendors', (
            SELECT count(*) FROM vendors WHERE status = 'active'
        ),
        'total_suppliers', (
            SELECT count(*) FROM suppliers WHERE status = 'active'
        ),
        'api_calls_24h', (
            SELECT count(*) FROM system_metrics 
            WHERE metric_type = 'api_call' 
            AND recorded_at > NOW() - INTERVAL '24 hours'
        ),
        'avg_response_time', (
            SELECT COALESCE(AVG(metric_value), 0)::numeric(10,2)
            FROM system_metrics 
            WHERE metric_type = 'response_time' 
            AND recorded_at > NOW() - INTERVAL '1 hour'
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log API calls
CREATE OR REPLACE FUNCTION log_api_call()
RETURNS void AS $$
BEGIN
    INSERT INTO system_metrics (metric_type, metric_value, metric_unit)
    VALUES ('api_call', 1, 'count');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert sample metrics for testing
INSERT INTO system_metrics (metric_type, metric_value, metric_unit, recorded_at) VALUES
('api_call', 1, 'count', NOW() - INTERVAL '1 hour'),
('api_call', 1, 'count', NOW() - INTERVAL '2 hours'),
('api_call', 1, 'count', NOW() - INTERVAL '3 hours'),
('response_time', 45, 'ms', NOW() - INTERVAL '30 minutes'),
('response_time', 52, 'ms', NOW() - INTERVAL '20 minutes'),
('response_time', 38, 'ms', NOW() - INTERVAL '10 minutes');
