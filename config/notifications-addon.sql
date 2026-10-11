-- Notifications System Add-on
-- Run this after unified-database-schema.sql

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
    category VARCHAR(50) CHECK (category IN ('order', 'payment', 'system', 'agent', 'vendor', 'supplier')),
    is_read BOOLEAN DEFAULT false,
    action_url VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

-- Visit Logs Table (for field agents)
CREATE TABLE IF NOT EXISTS visit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES field_agents(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    visit_date TIMESTAMPTZ DEFAULT NOW(),
    visit_type VARCHAR(50) CHECK (visit_type IN ('routine', 'order', 'payment', 'training', 'complaint')),
    notes TEXT,
    photo_url VARCHAR(500),
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent Performance Table
CREATE TABLE IF NOT EXISTS agent_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES field_agents(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    visits_count INTEGER DEFAULT 0,
    orders_created INTEGER DEFAULT 0,
    payments_collected DECIMAL(10,2) DEFAULT 0,
    commission_earned DECIMAL(10,2) DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_visit_logs_agent_id ON visit_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_visit_logs_vendor_id ON visit_logs(vendor_id);
CREATE INDEX IF NOT EXISTS idx_visit_logs_visit_date ON visit_logs(visit_date);
CREATE INDEX IF NOT EXISTS idx_agent_performance_agent_id ON agent_performance(agent_id);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_performance ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Agents can view own visit logs" ON visit_logs FOR SELECT USING (agent_id IN (SELECT id FROM field_agents WHERE user_id = auth.uid()));
CREATE POLICY "Agents can insert visit logs" ON visit_logs FOR INSERT WITH CHECK (agent_id IN (SELECT id FROM field_agents WHERE user_id = auth.uid()));

-- Triggers
CREATE TRIGGER update_agent_performance_updated_at BEFORE UPDATE ON agent_performance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_title VARCHAR,
    p_message TEXT,
    p_type VARCHAR DEFAULT 'info',
    p_category VARCHAR DEFAULT NULL,
    p_action_url VARCHAR DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO notifications (user_id, title, message, type, category, action_url)
    VALUES (p_user_id, p_title, p_message, p_type, p_category, p_action_url)
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID) RETURNS VOID AS $$
BEGIN
    UPDATE notifications 
    SET is_read = true, read_at = NOW() 
    WHERE id = p_notification_id;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    RAISE NOTICE '✅ Notifications system installed successfully!';
END $$;
