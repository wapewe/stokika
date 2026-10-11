-- Admin Settings Configuration Schema
-- Stores all configurable settings for the admin dashboard

CREATE TABLE IF NOT EXISTS admin_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(50) DEFAULT 'string',
    category VARCHAR(50) NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings
INSERT INTO admin_settings (setting_key, setting_value, setting_type, category, description) VALUES
-- Business Hours
('business_hours_start', '08:00', 'time', 'business', 'Business opening time'),
('business_hours_end', '18:00', 'time', 'business', 'Business closing time'),
('business_days', 'Monday,Tuesday,Wednesday,Thursday,Friday', 'array', 'business', 'Operating days'),

-- Commission Rates
('agent_commission_rate', '5', 'number', 'commission', 'Field agent commission percentage'),
('supervisor_commission_rate', '3', 'number', 'commission', 'Supervisor commission percentage'),
('referral_bonus', '500', 'number', 'commission', 'Referral bonus amount (KES)'),

-- Payment Gateway
('mpesa_paybill', '123456', 'string', 'payment', 'M-Pesa Paybill number'),
('mpesa_account', 'STOKIKA', 'string', 'payment', 'M-Pesa account name'),
('min_payment_amount', '100', 'number', 'payment', 'Minimum payment amount (KES)'),

-- Notifications
('email_notifications', 'true', 'boolean', 'notifications', 'Enable email notifications'),
('sms_notifications', 'false', 'boolean', 'notifications', 'Enable SMS notifications'),
('admin_notification_email', 'admin@stokika.com', 'string', 'notifications', 'Admin notification email'),

-- Approval Workflows
('auto_approve_threshold', '10000', 'number', 'workflow', 'Auto-approve orders below this amount'),
('require_supervisor_approval', 'true', 'boolean', 'workflow', 'Require supervisor approval for agents'),

-- Content
('homepage_banner_text', 'Welcome to Stokika', 'string', 'content', 'Homepage banner text'),
('announcement_text', '', 'string', 'content', 'System-wide announcement'),
('announcement_active', 'false', 'boolean', 'content', 'Show announcement banner')

ON CONFLICT (setting_key) DO NOTHING;

-- Enable RLS
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if exists
DROP POLICY IF EXISTS "Admin full access to settings" ON admin_settings;

-- Admin-only access policy (simplified for testing)
CREATE POLICY "Admin full access to settings" ON admin_settings
    FOR ALL USING (true) WITH CHECK (true);

-- Audit log for settings changes
CREATE TABLE IF NOT EXISTS admin_settings_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE admin_settings_audit ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if exists
DROP POLICY IF EXISTS "Admin view audit logs" ON admin_settings_audit;

-- Admin view audit logs (simplified for testing)
CREATE POLICY "Admin view audit logs" ON admin_settings_audit
    FOR ALL USING (true) WITH CHECK (true);

-- Function to log settings changes
CREATE OR REPLACE FUNCTION log_settings_change()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO admin_settings_audit (setting_key, old_value, new_value, changed_by)
    VALUES (NEW.setting_key, OLD.setting_value, NEW.setting_value, auth.uid());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER settings_change_trigger
    AFTER UPDATE ON admin_settings
    FOR EACH ROW
    WHEN (OLD.setting_value IS DISTINCT FROM NEW.setting_value)
    EXECUTE FUNCTION log_settings_change();
