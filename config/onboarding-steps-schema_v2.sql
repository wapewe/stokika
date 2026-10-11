-- Onboarding Steps and Payment System Schema v2
-- Add to your existing unified-database-schema.sql

-- Territory Assignments Table (Create first - referenced by indexes)
CREATE TABLE IF NOT EXISTS territory_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES field_agents(id) ON DELETE CASCADE,
    supervisor_id UUID REFERENCES supervisors(id) ON DELETE SET NULL,
    county VARCHAR(100) NOT NULL,
    sub_county VARCHAR(100),
    town VARCHAR(100),
    ward VARCHAR(100),
    assigned_date TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- M-Pesa Transactions Table (Create before kit_payments references it)
CREATE TABLE IF NOT EXISTS mpesa_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kit_payment_id UUID,
    transaction_id VARCHAR(100) UNIQUE,
    phone_number VARCHAR(20) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    mpesa_receipt_number VARCHAR(100),
    transaction_date TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    callback_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Onboarding Steps Table
CREATE TABLE IF NOT EXISTS onboarding_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL, -- 'field_agent' or 'supervisor'
    entity_id UUID NOT NULL,
    step_number INTEGER NOT NULL,
    step_name VARCHAR(100) NOT NULL,
    step_description TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
    required_payment BOOLEAN DEFAULT false,
    payment_amount DECIMAL(10,2),
    payment_status VARCHAR(50) DEFAULT 'not_required' CHECK (payment_status IN ('not_required', 'pending', 'paid', 'failed')),
    completed_by UUID REFERENCES users(id),
    completed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Onboarding Tokens Table (for pre-account access)
CREATE TABLE IF NOT EXISTS onboarding_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kit Payments Table
CREATE TABLE IF NOT EXISTS kit_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    role_type VARCHAR(50) NOT NULL, -- 'field_agent' or 'supervisor'
    payment_amount DECIMAL(10,2) NOT NULL,
    mpesa_code VARCHAR(100),
    phone_number VARCHAR(20) NOT NULL,
    payment_date TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'failed', 'refunded')),
    verification_notes TEXT,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMPTZ,
    kit_items JSONB, -- JSON array of kit items
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kit Items Configuration Table
CREATE TABLE IF NOT EXISTS kit_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_type VARCHAR(50) NOT NULL UNIQUE, -- 'field_agent' or 'supervisor'
    payment_amount DECIMAL(10,2) NOT NULL,
    kit_items JSONB NOT NULL, -- JSON array of kit items
    benefits JSONB, -- JSON array of benefits (NSSF, medical cover, etc.)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Onboarding Templates Table
CREATE TABLE IF NOT EXISTS onboarding_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_type VARCHAR(50) NOT NULL,
    template_name VARCHAR(100) NOT NULL,
    steps JSONB NOT NULL, -- Array of step definitions
    is_default BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraint after kit_payments table is created
ALTER TABLE mpesa_transactions ADD CONSTRAINT fk_mpesa_kit_payment 
FOREIGN KEY (kit_payment_id) REFERENCES kit_payments(id) ON DELETE SET NULL;

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_onboarding_steps_entity ON onboarding_steps(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_steps_status ON onboarding_steps(status);
CREATE INDEX IF NOT EXISTS idx_kit_payments_entity ON kit_payments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_kit_payments_status ON kit_payments(status);
CREATE INDEX IF NOT EXISTS idx_kit_configurations_role ON kit_configurations(role_type);
CREATE INDEX IF NOT EXISTS idx_territory_assignments_agent ON territory_assignments(agent_id);
CREATE INDEX IF NOT EXISTS idx_territory_assignments_supervisor ON territory_assignments(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_payment ON mpesa_transactions(kit_payment_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_status ON mpesa_transactions(status);
CREATE INDEX IF NOT EXISTS idx_onboarding_templates_role ON onboarding_templates(role_type, is_default);
CREATE INDEX IF NOT EXISTS idx_onboarding_tokens_token ON onboarding_tokens(token);
CREATE INDEX IF NOT EXISTS idx_onboarding_tokens_entity ON onboarding_tokens(entity_type, entity_id);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_onboarding_steps_updated_at BEFORE UPDATE ON onboarding_steps FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_kit_payments_updated_at BEFORE UPDATE ON kit_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_kit_configurations_updated_at BEFORE UPDATE ON kit_configurations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_territory_assignments_updated_at BEFORE UPDATE ON territory_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mpesa_transactions_updated_at BEFORE UPDATE ON mpesa_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE onboarding_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE kit_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE kit_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE territory_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mpesa_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_tokens ENABLE ROW LEVEL SECURITY;

-- Public read access to kit configurations
CREATE POLICY "Public read kit_configurations" ON kit_configurations FOR SELECT TO anon USING (is_active = true);

-- Admin policies
CREATE POLICY "Admin full access onboarding_steps" ON onboarding_steps FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admin full access kit_payments" ON kit_payments FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admin full access kit_configurations" ON kit_configurations FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admin full access onboarding_templates" ON onboarding_templates FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admin full access territory_assignments" ON territory_assignments FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admin full access mpesa_transactions" ON mpesa_transactions FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admin full access onboarding_tokens" ON onboarding_tokens FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');

-- User policies
CREATE POLICY "User view own onboarding" ON onboarding_steps FOR SELECT TO authenticated USING (
    (entity_type = 'field_agent' AND entity_id IN (SELECT id FROM field_agents WHERE user_id = auth.uid())) OR
    (entity_type = 'supervisor' AND entity_id IN (SELECT id FROM supervisors WHERE user_id = auth.uid()))
);

CREATE POLICY "User view own payments" ON kit_payments FOR SELECT TO authenticated USING (
    (entity_type = 'field_agent' AND entity_id IN (SELECT id FROM field_agents WHERE user_id = auth.uid())) OR
    (entity_type = 'supervisor' AND entity_id IN (SELECT id FROM supervisors WHERE user_id = auth.uid()))
);

-- Territory policies
CREATE POLICY "Agent view own territory" ON territory_assignments FOR SELECT TO authenticated USING (
    agent_id IN (SELECT id FROM field_agents WHERE user_id = auth.uid())
);

CREATE POLICY "Supervisor view managed territories" ON territory_assignments FOR SELECT TO authenticated USING (
    supervisor_id IN (SELECT id FROM supervisors WHERE user_id = auth.uid())
);

-- M-Pesa transaction policies
CREATE POLICY "User view own mpesa transactions" ON mpesa_transactions FOR SELECT TO authenticated USING (
    kit_payment_id IN (
        SELECT kp.id FROM kit_payments kp 
        WHERE (kp.entity_type = 'field_agent' AND kp.entity_id IN (SELECT id FROM field_agents WHERE user_id = auth.uid()))
           OR (kp.entity_type = 'supervisor' AND kp.entity_id IN (SELECT id FROM supervisors WHERE user_id = auth.uid()))
    )
);

-- Onboarding tokens policies
CREATE POLICY "Public read valid tokens" ON onboarding_tokens FOR SELECT TO anon USING (expires_at > NOW() AND used = false);

-- ============================================
-- DEFAULT DATA
-- ============================================

-- Insert default kit configurations
INSERT INTO kit_configurations (role_type, payment_amount, kit_items, benefits) VALUES
('field_agent', 2500.00, 
 '["Stokika T-shirt", "Stokika Cap", "ID Badge", "Training Materials", "Mobile App Access"]',
 '["NSSF Registration", "Medical Cover", "Training Certification", "Performance Bonuses"]'
),
('supervisor', 5000.00,
 '["Stokika Polo Shirt", "Stokika Jacket", "Supervisor Badge", "Management Materials", "Admin App Access", "Laptop Bag"]',
 '["NSSF Registration", "Enhanced Medical Cover", "Leadership Training", "Management Bonuses", "Team Performance Incentives"]'
)
ON CONFLICT (role_type) DO NOTHING;

-- Insert default onboarding templates
INSERT INTO onboarding_templates (role_type, template_name, steps, is_default, created_by) VALUES
('field_agent', 'Standard Field Agent Onboarding', 
 '[
   {"step": 1, "name": "Application Review", "description": "Review and verify application details", "required_payment": false},
   {"step": 2, "name": "Interview", "description": "Conduct interview and assessment", "required_payment": false},
   {"step": 3, "name": "Kit Payment", "description": "Pay for starter kit and registration", "required_payment": true, "amount": 2500},
   {"step": 4, "name": "Training", "description": "Complete mandatory training program", "required_payment": false},
   {"step": 5, "name": "Territory Assignment", "description": "Assign working territory", "required_payment": false},
   {"step": 6, "name": "Account Activation", "description": "Activate agent account and access", "required_payment": false}
 ]', 
 true, NULL
),
('supervisor', 'Standard Supervisor Onboarding',
 '[
   {"step": 1, "name": "Application Review", "description": "Review supervisor application and qualifications", "required_payment": false},
   {"step": 2, "name": "Interview", "description": "Conduct management interview and assessment", "required_payment": false},
   {"step": 3, "name": "Kit Payment", "description": "Pay for supervisor kit and registration", "required_payment": true, "amount": 5000},
   {"step": 4, "name": "Management Training", "description": "Complete supervisor training program", "required_payment": false},
   {"step": 5, "name": "Team Assignment", "description": "Assign team and territory", "required_payment": false},
   {"step": 6, "name": "Account Activation", "description": "Activate supervisor account and permissions", "required_payment": false}
 ]',
 true, NULL
)
ON CONFLICT DO NOTHING;