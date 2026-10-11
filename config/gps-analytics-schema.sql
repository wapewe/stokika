-- GPS Tracking and Analytics Schema Extension
-- Add these tables to your existing unified-database-schema.sql

-- User Locations Table (GPS Tracking)
CREATE TABLE IF NOT EXISTS user_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    user_type VARCHAR(50) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(10, 2),
    speed DECIMAL(8, 2) DEFAULT 0,
    heading DECIMAL(5, 2),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendor Visits Table (Field Agent Tracking)
CREATE TABLE IF NOT EXISTS vendor_visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES field_agents(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    start_latitude DECIMAL(10, 8) NOT NULL,
    start_longitude DECIMAL(11, 8) NOT NULL,
    end_latitude DECIMAL(10, 8),
    end_longitude DECIMAL(11, 8),
    vendor_latitude DECIMAL(10, 8),
    vendor_longitude DECIMAL(11, 8),
    distance_to_vendor DECIMAL(8, 2),
    visit_duration INTEGER, -- minutes
    notes TEXT,
    photos TEXT[], -- array of photo URLs
    status VARCHAR(50) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Geofences Table (Territory Management)
CREATE TABLE IF NOT EXISTS geofences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    supervisor_id UUID REFERENCES supervisors(id) ON DELETE CASCADE,
    center_latitude DECIMAL(10, 8) NOT NULL,
    center_longitude DECIMAL(11, 8) NOT NULL,
    radius_km DECIMAL(8, 2) NOT NULL,
    county VARCHAR(100),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Route Plans Table (Route Optimization)
CREATE TABLE IF NOT EXISTS route_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES field_agents(id) ON DELETE CASCADE,
    supervisor_id UUID REFERENCES supervisors(id) ON DELETE SET NULL,
    plan_date DATE NOT NULL,
    start_latitude DECIMAL(10, 8),
    start_longitude DECIMAL(11, 8),
    planned_vendors JSONB, -- array of vendor IDs with order
    actual_route JSONB, -- actual visited vendors with timestamps
    estimated_duration INTEGER, -- minutes
    actual_duration INTEGER, -- minutes
    status VARCHAR(50) DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Metrics Table (Analytics)
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    user_type VARCHAR(50) NOT NULL,
    metric_type VARCHAR(100) NOT NULL, -- 'daily_visits', 'weekly_orders', 'monthly_revenue', etc.
    metric_value DECIMAL(15, 2) NOT NULL,
    metric_date DATE NOT NULL,
    additional_data JSONB, -- flexible field for extra metrics
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Predictions Table (Predictive Analytics)
CREATE TABLE IF NOT EXISTS predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL, -- 'vendor', 'supplier', 'agent', 'market'
    entity_id UUID,
    prediction_type VARCHAR(100) NOT NULL, -- 'order_volume', 'inventory_demand', 'performance_score'
    predicted_value DECIMAL(15, 2),
    confidence_level VARCHAR(20), -- 'low', 'medium', 'high'
    prediction_date DATE NOT NULL,
    forecast_period INTEGER, -- days into future
    actual_value DECIMAL(15, 2), -- filled when actual data becomes available
    accuracy_score DECIMAL(5, 2), -- calculated accuracy percentage
    model_version VARCHAR(50),
    input_data JSONB, -- data used for prediction
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Market Trends Table (Market Analysis)
CREATE TABLE IF NOT EXISTS market_trends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    county VARCHAR(100),
    trend_date DATE NOT NULL,
    total_orders INTEGER DEFAULT 0,
    total_revenue DECIMAL(15, 2) DEFAULT 0,
    avg_order_value DECIMAL(10, 2) DEFAULT 0,
    active_vendors INTEGER DEFAULT 0,
    active_agents INTEGER DEFAULT 0,
    growth_rate DECIMAL(5, 2), -- percentage
    market_health VARCHAR(20), -- 'excellent', 'good', 'fair', 'concerning', 'poor'
    top_products JSONB, -- array of popular products
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent Territories Table (Territory Assignment)
CREATE TABLE IF NOT EXISTS agent_territories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES field_agents(id) ON DELETE CASCADE,
    supervisor_id UUID REFERENCES supervisors(id) ON DELETE CASCADE,
    county VARCHAR(100) NOT NULL,
    sub_county VARCHAR(100),
    assigned_vendors UUID[], -- array of vendor IDs
    territory_bounds JSONB, -- polygon coordinates for territory
    is_active BOOLEAN DEFAULT true,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendor Locations Table (Vendor GPS Coordinates)
CREATE TABLE IF NOT EXISTS vendor_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE UNIQUE,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    address TEXT,
    landmark TEXT,
    verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics Dashboard Widgets Table
CREATE TABLE IF NOT EXISTS dashboard_widgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    widget_type VARCHAR(100) NOT NULL, -- 'performance_chart', 'map_view', 'predictions'
    widget_config JSONB NOT NULL, -- widget configuration and data
    position_x INTEGER DEFAULT 0,
    position_y INTEGER DEFAULT 0,
    width INTEGER DEFAULT 4,
    height INTEGER DEFAULT 3,
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_locations_user_id ON user_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_locations_timestamp ON user_locations(timestamp);
CREATE INDEX IF NOT EXISTS idx_user_locations_user_type ON user_locations(user_type);

CREATE INDEX IF NOT EXISTS idx_vendor_visits_agent_id ON vendor_visits(agent_id);
CREATE INDEX IF NOT EXISTS idx_vendor_visits_vendor_id ON vendor_visits(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_visits_start_time ON vendor_visits(start_time);
CREATE INDEX IF NOT EXISTS idx_vendor_visits_status ON vendor_visits(status);

CREATE INDEX IF NOT EXISTS idx_geofences_supervisor_id ON geofences(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_geofences_county ON geofences(county);

CREATE INDEX IF NOT EXISTS idx_route_plans_agent_id ON route_plans(agent_id);
CREATE INDEX IF NOT EXISTS idx_route_plans_plan_date ON route_plans(plan_date);
CREATE INDEX IF NOT EXISTS idx_route_plans_status ON route_plans(status);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_id ON performance_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_metric_date ON performance_metrics(metric_date);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_metric_type ON performance_metrics(metric_type);

CREATE INDEX IF NOT EXISTS idx_predictions_entity_type ON predictions(entity_type);
CREATE INDEX IF NOT EXISTS idx_predictions_entity_id ON predictions(entity_id);
CREATE INDEX IF NOT EXISTS idx_predictions_prediction_date ON predictions(prediction_date);

CREATE INDEX IF NOT EXISTS idx_market_trends_county ON market_trends(county);
CREATE INDEX IF NOT EXISTS idx_market_trends_trend_date ON market_trends(trend_date);

CREATE INDEX IF NOT EXISTS idx_agent_territories_agent_id ON agent_territories(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_territories_supervisor_id ON agent_territories(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_agent_territories_county ON agent_territories(county);

CREATE INDEX IF NOT EXISTS idx_vendor_locations_vendor_id ON vendor_locations(vendor_id);

CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_user_id ON dashboard_widgets(user_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Update triggers for updated_at columns
DROP TRIGGER IF EXISTS update_vendor_visits_updated_at ON vendor_visits;
CREATE TRIGGER update_vendor_visits_updated_at BEFORE UPDATE ON vendor_visits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_geofences_updated_at ON geofences;
CREATE TRIGGER update_geofences_updated_at BEFORE UPDATE ON geofences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_route_plans_updated_at ON route_plans;
CREATE TRIGGER update_route_plans_updated_at BEFORE UPDATE ON route_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_agent_territories_updated_at ON agent_territories;
CREATE TRIGGER update_agent_territories_updated_at BEFORE UPDATE ON agent_territories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vendor_locations_updated_at ON vendor_locations;
CREATE TRIGGER update_vendor_locations_updated_at BEFORE UPDATE ON vendor_locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_dashboard_widgets_updated_at ON dashboard_widgets;
CREATE TRIGGER update_dashboard_widgets_updated_at BEFORE UPDATE ON dashboard_widgets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_widgets ENABLE ROW LEVEL SECURITY;

-- Admin policies
CREATE POLICY "Admin full access user_locations" ON user_locations FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admin full access vendor_visits" ON vendor_visits FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admin full access geofences" ON geofences FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admin full access route_plans" ON route_plans FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admin full access performance_metrics" ON performance_metrics FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admin full access predictions" ON predictions FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admin full access market_trends" ON market_trends FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admin full access agent_territories" ON agent_territories FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admin full access vendor_locations" ON vendor_locations FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admin full access dashboard_widgets" ON dashboard_widgets FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');

-- Agent policies
CREATE POLICY "Agent own locations" ON user_locations FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Agent own visits" ON vendor_visits FOR ALL TO authenticated USING (
    agent_id IN (SELECT id FROM field_agents WHERE user_id = auth.uid())
);
CREATE POLICY "Agent own routes" ON route_plans FOR ALL TO authenticated USING (
    agent_id IN (SELECT id FROM field_agents WHERE user_id = auth.uid())
);
CREATE POLICY "Agent own metrics" ON performance_metrics FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Agent own widgets" ON dashboard_widgets FOR ALL TO authenticated USING (user_id = auth.uid());

-- Supervisor policies
CREATE POLICY "Supervisor territory locations" ON user_locations FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM supervisors WHERE user_id = auth.uid() AND is_active = true)
);
CREATE POLICY "Supervisor territory visits" ON vendor_visits FOR SELECT TO authenticated USING (
    agent_id IN (
        SELECT fa.id FROM field_agents fa 
        JOIN supervisors s ON fa.supervisor_id = s.id 
        WHERE s.user_id = auth.uid() AND s.is_active = true
    )
);
CREATE POLICY "Supervisor own geofences" ON geofences FOR ALL TO authenticated USING (
    supervisor_id IN (SELECT id FROM supervisors WHERE user_id = auth.uid())
);
CREATE POLICY "Supervisor territory routes" ON route_plans FOR ALL TO authenticated USING (
    supervisor_id IN (SELECT id FROM supervisors WHERE user_id = auth.uid())
);

-- Vendor policies
CREATE POLICY "Vendor own location" ON vendor_locations FOR ALL TO authenticated USING (
    vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
);
CREATE POLICY "Vendor own visits" ON vendor_visits FOR SELECT TO authenticated USING (
    vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
);

-- ============================================
-- FUNCTIONS FOR ANALYTICS
-- ============================================

-- Function to calculate distance between two points
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DECIMAL, lon1 DECIMAL, 
    lat2 DECIMAL, lon2 DECIMAL
) RETURNS DECIMAL AS $$
DECLARE
    R DECIMAL := 6371; -- Earth's radius in km
    dLat DECIMAL;
    dLon DECIMAL;
    a DECIMAL;
    c DECIMAL;
BEGIN
    dLat := RADIANS(lat2 - lat1);
    dLon := RADIANS(lon2 - lon1);
    a := SIN(dLat/2) * SIN(dLat/2) + COS(RADIANS(lat1)) * COS(RADIANS(lat2)) * SIN(dLon/2) * SIN(dLon/2);
    c := 2 * ATAN2(SQRT(a), SQRT(1-a));
    RETURN R * c;
END;
$$ LANGUAGE plpgsql;

-- Function to update visit duration
CREATE OR REPLACE FUNCTION update_visit_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.end_time IS NOT NULL AND OLD.end_time IS NULL THEN
        NEW.visit_duration := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60;
        
        -- Calculate distance to vendor if vendor location is provided
        IF NEW.vendor_latitude IS NOT NULL AND NEW.vendor_longitude IS NOT NULL THEN
            NEW.distance_to_vendor := calculate_distance(
                NEW.start_latitude, NEW.start_longitude,
                NEW.vendor_latitude, NEW.vendor_longitude
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for visit duration calculation
DROP TRIGGER IF EXISTS calculate_visit_duration ON vendor_visits;
CREATE TRIGGER calculate_visit_duration 
    BEFORE UPDATE ON vendor_visits 
    FOR EACH ROW EXECUTE FUNCTION update_visit_duration();

-- Function to generate daily performance metrics
CREATE OR REPLACE FUNCTION generate_daily_metrics(target_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
BEGIN
    -- Agent visit metrics
    INSERT INTO performance_metrics (user_id, user_type, metric_type, metric_value, metric_date, additional_data)
    SELECT 
        fa.user_id,
        'field_agent',
        'daily_visits',
        COUNT(vv.id),
        target_date,
        jsonb_build_object(
            'completed_visits', COUNT(CASE WHEN vv.status = 'completed' THEN 1 END),
            'avg_visit_duration', AVG(vv.visit_duration),
            'total_distance', SUM(vv.distance_to_vendor)
        )
    FROM field_agents fa
    LEFT JOIN vendor_visits vv ON fa.id = vv.agent_id 
        AND DATE(vv.start_time) = target_date
    WHERE fa.approval_status = 'approved'
    GROUP BY fa.user_id
    ON CONFLICT (user_id, metric_type, metric_date) DO UPDATE SET
        metric_value = EXCLUDED.metric_value,
        additional_data = EXCLUDED.additional_data;

    -- Vendor order metrics
    INSERT INTO performance_metrics (user_id, user_type, metric_type, metric_value, metric_date, additional_data)
    SELECT 
        v.user_id,
        'vendor',
        'daily_orders',
        COUNT(o.id),
        target_date,
        jsonb_build_object(
            'total_amount', SUM(o.total_amount),
            'avg_order_value', AVG(o.total_amount)
        )
    FROM vendors v
    LEFT JOIN orders o ON v.id = o.vendor_id 
        AND DATE(o.created_at) = target_date
    WHERE v.status = 'active'
    GROUP BY v.user_id
    ON CONFLICT (user_id, metric_type, metric_date) DO UPDATE SET
        metric_value = EXCLUDED.metric_value,
        additional_data = EXCLUDED.additional_data;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ GPS Tracking and Analytics Schema created successfully!';
    RAISE NOTICE '📍 GPS Tables: user_locations, vendor_visits, geofences, route_plans';
    RAISE NOTICE '📊 Analytics Tables: performance_metrics, predictions, market_trends';
    RAISE NOTICE '🗺️ Territory Tables: agent_territories, vendor_locations';
    RAISE NOTICE '📈 Dashboard Tables: dashboard_widgets';
    RAISE NOTICE '🔧 Functions: calculate_distance, generate_daily_metrics';
    RAISE NOTICE '🎯 Ready for GPS tracking and predictive analytics!';
END $$;