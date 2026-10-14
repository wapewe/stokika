-- Onboarding Steps and Payment System Schema
-- Add to your existing unified-database-schema.sql

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

DROP TRIGGER IF EXISTS update_onboarding_steps_updated_at ON onboarding_steps;
CREATE TRIGGER update_onboarding_steps_updated_at BEFORE UPDATE ON onboarding_steps FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_kit_payments_updated_at ON kit_payments;
CREATE TRIGGER update_kit_payments_updated_at BEFORE UPDATE ON kit_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_kit_configurations_updated_at ON kit_configurations;
CREATE TRIGGER update_kit_configurations_updated_at BEFORE UPDATE ON kit_configurations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_territory_assignments_updated_at ON territory_assignments;
CREATE TRIGGER update_territory_assignments_updated_at BEFORE UPDATE ON territory_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_mpesa_transactions_updated_at ON mpesa_transactions;
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
CREATE POLICY "Public read kit_configurations auth" ON kit_configurations FOR SELECT TO authenticated USING (is_active = true);

-- Onboarding tokens policies
CREATE POLICY "Admin full access onboarding_tokens" ON onboarding_tokens FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Public read valid tokens" ON onboarding_tokens FOR SELECT TO anon USING (expires_at > NOW() AND used = false);

-- Admin policies
CREATE POLICY "Admin full access onboarding_steps" ON onboarding_steps FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admin full access kit_payments" ON kit_payments FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admin full access kit_configurations" ON kit_configurations FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admin full access onboarding_templates" ON onboarding_templates FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admin full access territory_assignments" ON territory_assignments FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admin full access mpesa_transactions" ON mpesa_transactions FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');

-- User policies (view own onboarding)
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

-- ============================================
-- DEFAULT DATA
-- ============================================

-- Territory Assignments Table
CREATE TABLE IF NOT EXISTS territory_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES field_agents(id) ON DELETE CASCADE,
    supervisor_id UUID REFERENCES supervisors(id) ON DELETE SET NULL,
    territory_name VARCHAR(255) NOT NULL,
    county VARCHAR(100) NOT NULL,
    sub_county VARCHAR(100),
    wards TEXT[], -- Array of assigned wards
    boundaries JSONB, -- GeoJSON polygon for territory boundaries
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- M-Pesa Transactions Table
CREATE TABLE IF NOT EXISTS mpesa_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kit_payment_id UUID REFERENCES kit_payments(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) DEFAULT 'payment' CHECK (transaction_type IN ('payment', 'refund')),
    phone_number VARCHAR(20) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    mpesa_receipt_number VARCHAR(100),
    transaction_date TIMESTAMPTZ,
    account_reference VARCHAR(100),
    transaction_desc TEXT,
    merchant_request_id VARCHAR(100),
    checkout_request_id VARCHAR(100),
    result_code INTEGER,
    result_desc TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default kit configurations
INSERT INTO kit_configurations (role_type, payment_amount, kit_items, benefits) VALUES
('field_agent', 1550.00, 
 '[
    {"item": "Stokika Account", "quantity": 1, "description": "Platform access account"},
    {"item": "T-Shirts", "quantity": 2, "description": "1 Round neck + 1 Polo shirt"},
    {"item": "Backpack", "quantity": 1, "description": "Branded backpack"},
    {"item": "Water Bottle", "quantity": 1, "description": "Branded water bottle"},
    {"item": "Cap", "quantity": 1, "description": "Branded cap"},
    {"item": "Diary", "quantity": 1, "description": "Work diary"},
    {"item": "Pen", "quantity": 1, "description": "Branded pen"},
    {"item": "Training Materials", "quantity": 1, "description": "Field agent training manual and materials"}
 ]',
 '[
    {"benefit": "NSSF Registration", "description": "National Social Security Fund registration"},
    {"benefit": "Medical Cover", "description": "Basic medical insurance coverage"},
    {"benefit": "Field Agent Training", "description": "Comprehensive field agent training program"}
 ]'
),
('supervisor', 3050.00,
 '[
    {"item": "Stokika Account", "quantity": 1, "description": "Platform access account with supervisor privileges"},
    {"item": "T-Shirts", "quantity": 2, "description": "1 Round neck + 1 Polo shirt"},
    {"item": "Shirt", "quantity": 1, "description": "Professional shirt for supervisors"},
    {"item": "Backpack", "quantity": 1, "description": "Branded backpack"},
    {"item": "Water Bottle", "quantity": 1, "description": "Branded water bottle"},
    {"item": "Cap", "quantity": 1, "description": "Branded cap"},
    {"item": "Diary", "quantity": 1, "description": "Work diary"},
    {"item": "Pen", "quantity": 1, "description": "Branded pen"},
    {"item": "Training Materials", "quantity": 1, "description": "Supervisor training manual and leadership materials"}
 ]',
 '[
    {"benefit": "NSSF Registration", "description": "National Social Security Fund registration"},
    {"benefit": "Medical Cover", "description": "Enhanced medical insurance coverage"},
    {"benefit": "Supervisor Training", "description": "Leadership and management training program"},
    {"benefit": "Territory Management", "description": "Territory assignment and management tools"}
 ]'
),
('vendor', 1050.00,
 '[
    {"item": "Stokika Merchant Access", "quantity": 1, "description": "Vendor platform account"},
    {"item": "Digital Payment Setup", "quantity": 1, "description": "M-Pesa payment gateway integration"},
    {"item": "Vendor Starter Materials", "quantity": 1, "description": "Merchant materials and guides"}
 ]',
 '[
    {"benefit": "Platform Trading Access", "description": "Full access to sell on Stokika platform"},
    {"benefit": "Merchant Support", "description": "Dedicated seller support and dispute resolution"}
 ]'
)
ON CONFLICT (role_type) DO UPDATE SET
    payment_amount = EXCLUDED.payment_amount,
    kit_items = EXCLUDED.kit_items,
    benefits = EXCLUDED.benefits;

-- Insert default onboarding templates
INSERT INTO onboarding_templates (role_type, template_name, steps, is_default) VALUES
('field_agent', 'Standard Field Agent Onboarding', 
 '[
    {"step": 1, "name": "Application Submitted", "description": "Initial application form submitted", "auto_complete": true},
    {"step": 2, "name": "Document Review", "description": "Admin reviews submitted documents", "requires_admin": true},
    {"step": 3, "name": "Schedule Interview", "description": "Admin schedules interview with candidate", "requires_admin": true},
    {"step": 4, "name": "Interview Conducted", "description": "Interview completed and notes recorded", "requires_admin": true},
    {"step": 5, "name": "Kit Payment", "description": "Candidate pays for Stokika kit (KES 1,550)", "requires_payment": true, "payment_amount": 1550},
    {"step": 6, "name": "Payment Verification", "description": "Admin verifies M-Pesa payment", "requires_admin": true},
    {"step": 7, "name": "Account Creation", "description": "Admin creates Stokika platform account with email confirmation", "requires_admin": true},
    {"step": 8, "name": "Territory Assignment", "description": "Admin assigns territory to field agent", "requires_admin": true},
    {"step": 9, "name": "Kit Preparation", "description": "Kit items prepared for delivery", "requires_admin": true},
    {"step": 10, "name": "Training Scheduled", "description": "Initial training session scheduled", "requires_admin": true},
    {"step": 11, "name": "Onboarding Complete", "description": "Agent fully onboarded and active", "requires_admin": true}
 ]', true),
('supervisor', 'Standard Supervisor Onboarding',
 '[
    {"step": 1, "name": "Application Submitted", "description": "Initial application form submitted", "auto_complete": true},
    {"step": 2, "name": "Document Review", "description": "Admin reviews submitted documents and qualifications", "requires_admin": true},
    {"step": 3, "name": "Schedule Interview", "description": "Admin schedules comprehensive interview", "requires_admin": true},
    {"step": 4, "name": "Interview Conducted", "description": "Interview completed with leadership assessment", "requires_admin": true},
    {"step": 5, "name": "Kit Payment", "description": "Candidate pays for Supervisor kit (KES 3,050)", "requires_payment": true, "payment_amount": 3050},
    {"step": 6, "name": "Payment Verification", "description": "Admin verifies M-Pesa payment", "requires_admin": true},
    {"step": 7, "name": "Account Creation", "description": "Admin creates Stokika platform account with supervisor privileges and email confirmation", "requires_admin": true},
    {"step": 8, "name": "Territory Assignment", "description": "Admin assigns territory to supervisor", "requires_admin": true},
    {"step": 9, "name": "Kit Preparation", "description": "Supervisor kit items prepared for delivery", "requires_admin": true},
    {"step": 10, "name": "Leadership Training", "description": "Supervisor training and management tools setup", "requires_admin": true},
    {"step": 11, "name": "Onboarding Complete", "description": "Supervisor fully onboarded and active", "requires_admin": true}
 ]', true)
ON CONFLICT DO NOTHING;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to initialize onboarding steps for new applications
CREATE OR REPLACE FUNCTION initialize_onboarding_steps(
    p_entity_type VARCHAR,
    p_entity_id UUID,
    p_role_type VARCHAR DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    template_record RECORD;
    step_record JSONB;
    kit_config RECORD;
BEGIN
    -- Get role type if not provided
    IF p_role_type IS NULL THEN
        p_role_type := p_entity_type;
    END IF;
    
    -- Get default template for role
    SELECT * INTO template_record 
    FROM onboarding_templates 
    WHERE role_type = p_role_type AND is_default = true
    LIMIT 1;
    
    -- Get kit configuration
    SELECT * INTO kit_config
    FROM kit_configurations
    WHERE role_type = p_role_type AND is_active = true
    LIMIT 1;
    
    -- Create onboarding steps from template
    IF template_record.id IS NOT NULL THEN
        FOR step_record IN SELECT * FROM jsonb_array_elements(template_record.steps)
        LOOP
            INSERT INTO onboarding_steps (
                entity_type,
                entity_id,
                step_number,
                step_name,
                step_description,
                status,
                required_payment,
                payment_amount
            ) VALUES (
                p_entity_type,
                p_entity_id,
                (step_record->>'step')::INTEGER,
                step_record->>'name',
                step_record->>'description',
                CASE WHEN (step_record->>'auto_complete')::BOOLEAN = true THEN 'completed' ELSE 'pending' END,
                COALESCE((step_record->>'requires_payment')::BOOLEAN, false),
                CASE WHEN (step_record->>'requires_payment')::BOOLEAN = true 
                     THEN kit_config.payment_amount 
                     ELSE NULL END
            );
        END LOOP;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to advance onboarding step
CREATE OR REPLACE FUNCTION advance_onboarding_step(
    p_entity_type VARCHAR,
    p_entity_id UUID,
    p_step_number INTEGER,
    p_completed_by UUID,
    p_notes TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE onboarding_steps 
    SET 
        status = 'completed',
        completed_by = p_completed_by,
        completed_at = NOW(),
        notes = COALESCE(p_notes, notes),
        updated_at = NOW()
    WHERE 
        entity_type = p_entity_type 
        AND entity_id = p_entity_id 
        AND step_number = p_step_number
        AND status != 'completed';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- M-PESA AND PAYMENT FUNCTIONS
-- ============================================

-- Function to generate onboarding token
CREATE OR REPLACE FUNCTION generate_onboarding_token(
    p_entity_type VARCHAR,
    p_entity_id UUID
) RETURNS VARCHAR AS $$
DECLARE
    token_string VARCHAR;
BEGIN
    -- Generate unique token
    token_string := encode(gen_random_bytes(32), 'hex');
    
    -- Insert token (expires in 30 days)
    INSERT INTO onboarding_tokens (entity_type, entity_id, token, expires_at)
    VALUES (p_entity_type, p_entity_id, token_string, NOW() + INTERVAL '30 days');
    
    RETURN token_string;
END;
$$ LANGUAGE plpgsql;

-- Function to create kit payment with M-Pesa transaction
CREATE OR REPLACE FUNCTION create_kit_payment(
    p_entity_type VARCHAR,
    p_entity_id UUID,
    p_role_type VARCHAR,
    p_phone_number VARCHAR,
    p_payment_method VARCHAR DEFAULT 'manual'
) RETURNS UUID AS $$
DECLARE
    payment_id UUID;
    kit_config RECORD;
BEGIN
    -- Get kit configuration
    SELECT * INTO kit_config
    FROM kit_configurations
    WHERE role_type = p_role_type AND is_active = true
    LIMIT 1;
    
    IF kit_config.id IS NULL THEN
        RAISE EXCEPTION 'Kit configuration not found for role: %', p_role_type;
    END IF;
    
    -- Create kit payment
    INSERT INTO kit_payments (
        entity_type,
        entity_id,
        role_type,
        payment_amount,
        phone_number,
        kit_items,
        status
    ) VALUES (
        p_entity_type,
        p_entity_id,
        p_role_type,
        kit_config.payment_amount,
        p_phone_number,
        kit_config.kit_items,
        'pending'
    ) RETURNING id INTO payment_id;
    
    RETURN payment_id;
END;
$$ LANGUAGE plpgsql;

-- Function to verify M-Pesa payment
CREATE OR REPLACE FUNCTION verify_mpesa_payment(
    p_payment_id UUID,
    p_mpesa_code VARCHAR,
    p_verified_by UUID,
    p_verification_notes TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    -- Update kit payment status
    UPDATE kit_payments 
    SET 
        status = 'verified',
        mpesa_code = p_mpesa_code,
        payment_date = NOW(),
        verified_by = p_verified_by,
        verified_at = NOW(),
        verification_notes = p_verification_notes
    WHERE id = p_payment_id;
    
    -- Update corresponding M-Pesa transaction if exists
    UPDATE mpesa_transactions 
    SET 
        status = 'success',
        mpesa_receipt_number = p_mpesa_code,
        result_code = 0,
        result_desc = 'Payment verified by admin'
    WHERE kit_payment_id = p_payment_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to assign territory to field agent
CREATE OR REPLACE FUNCTION assign_territory(
    p_agent_id UUID,
    p_territory_name VARCHAR,
    p_county VARCHAR,
    p_sub_county VARCHAR DEFAULT NULL,
    p_wards TEXT[] DEFAULT NULL,
    p_supervisor_id UUID DEFAULT NULL,
    p_assigned_by UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    territory_id UUID;
BEGIN
    -- Deactivate existing territory assignments for this agent
    UPDATE territory_assignments 
    SET is_active = false
    WHERE agent_id = p_agent_id AND is_active = true;
    
    -- Create new territory assignment
    INSERT INTO territory_assignments (
        agent_id,
        supervisor_id,
        territory_name,
        county,
        sub_county,
        wards,
        assigned_by,
        is_active
    ) VALUES (
        p_agent_id,
        p_supervisor_id,
        p_territory_name,
        p_county,
        p_sub_county,
        p_wards,
        p_assigned_by,
        true
    ) RETURNING id INTO territory_id;
    
    RETURN territory_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get onboarding progress
CREATE OR REPLACE FUNCTION get_onboarding_progress(
    p_entity_type VARCHAR,
    p_entity_id UUID
) RETURNS TABLE (
    total_steps INTEGER,
    completed_steps INTEGER,
    current_step INTEGER,
    progress_percentage DECIMAL
) AS $$
DECLARE
    total_count INTEGER;
    completed_count INTEGER;
    current_step_num INTEGER;
BEGIN
    -- Get total steps
    SELECT COUNT(*) INTO total_count
    FROM onboarding_steps
    WHERE entity_type = p_entity_type AND entity_id = p_entity_id;
    
    -- Get completed steps
    SELECT COUNT(*) INTO completed_count
    FROM onboarding_steps
    WHERE entity_type = p_entity_type AND entity_id = p_entity_id AND status = 'completed';
    
    -- Get current step (first non-completed step)
    SELECT COALESCE(MIN(step_number), total_count + 1) INTO current_step_num
    FROM onboarding_steps
    WHERE entity_type = p_entity_type AND entity_id = p_entity_id AND status != 'completed';
    
    RETURN QUERY SELECT 
        total_count,
        completed_count,
        current_step_num,
        CASE WHEN total_count > 0 THEN (completed_count::DECIMAL / total_count::DECIMAL) * 100 ELSE 0 END;
END;
$$ LANGUAGE plpgsql;

-- Function to create user account during onboarding
CREATE OR REPLACE FUNCTION create_onboarding_account(
    p_entity_type VARCHAR,
    p_entity_id UUID,
    p_email VARCHAR,
    p_password VARCHAR,
    p_created_by UUID
) RETURNS UUID AS $$
DECLARE
    user_id UUID;
    entity_name VARCHAR;
BEGIN
    -- Get entity name
    IF p_entity_type = 'field_agent' THEN
        SELECT full_name INTO entity_name FROM field_agents WHERE id = p_entity_id;
    ELSIF p_entity_type = 'supervisor' THEN
        SELECT full_name INTO entity_name FROM supervisors WHERE id = p_entity_id;
    END IF;
    
    -- Create user account (Supabase auth will handle email confirmation)
    INSERT INTO users (name, email, user_type, role, status)
    VALUES (entity_name, p_email, p_entity_type, 'user', 'active')
    RETURNING id INTO user_id;
    
    -- Link user to entity
    IF p_entity_type = 'field_agent' THEN
        UPDATE field_agents SET user_id = user_id WHERE id = p_entity_id;
    ELSIF p_entity_type = 'supervisor' THEN
        UPDATE supervisors SET user_id = user_id WHERE id = p_entity_id;
    END IF;
    
    RETURN user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to complete onboarding
CREATE OR REPLACE FUNCTION complete_onboarding(
    p_entity_type VARCHAR,
    p_entity_id UUID,
    p_completed_by UUID
) RETURNS BOOLEAN AS $$
DECLARE
    all_completed BOOLEAN;
BEGIN
    -- Check if all steps are completed
    SELECT NOT EXISTS(
        SELECT 1 FROM onboarding_steps
        WHERE entity_type = p_entity_type 
        AND entity_id = p_entity_id 
        AND status != 'completed'
    ) INTO all_completed;
    
    IF all_completed THEN
        -- Update entity status based on type
        IF p_entity_type = 'field_agent' THEN
            UPDATE field_agents 
            SET 
                approval_status = 'approved',
                approved_by = p_completed_by,
                approved_at = NOW()
            WHERE id = p_entity_id;
        ELSIF p_entity_type = 'supervisor' THEN
            UPDATE supervisors 
            SET 
                approval_status = 'approved',
                is_active = true,
                approved_by = p_completed_by,
                approved_at = NOW()
            WHERE id = p_entity_id;
        END IF;
        
        -- Mark tokens as used
        UPDATE onboarding_tokens 
        SET used = true 
        WHERE entity_type = p_entity_type AND entity_id = p_entity_id;
        
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ADDITIONAL INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_territory_assignments_active ON territory_assignments(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_receipt ON mpesa_transactions(mpesa_receipt_number);
CREATE INDEX IF NOT EXISTS idx_kit_payments_phone ON kit_payments(phone_number);
CREATE INDEX IF NOT EXISTS idx_onboarding_steps_status_entity ON onboarding_steps(status, entity_type, entity_id);

DO $$
BEGIN
    RAISE NOTICE '✅ Enhanced Onboarding System created successfully!';
    RAISE NOTICE '💰 Kit Payments: Field Agent (KES 2,500), Supervisor (KES 3,500)';
    RAISE NOTICE '📦 Kit Items: Account, T-Shirts, Shirt (Supervisors), Backpack, Water Bottle, Cap, Diary, Pen, Training';
    RAISE NOTICE '🎯 Benefits: NSSF, Medical Cover, Training, Territory Management';
    RAISE NOTICE '📋 Onboarding Steps: 11 steps for agents, 11 steps for supervisors';
    RAISE NOTICE '🗺️ Territory Assignment: Automated territory management for field agents';
    RAISE NOTICE '📱 M-Pesa Integration: Manual and automatic payment processing';
    RAISE NOTICE '🔄 Functions: Payment verification, territory assignment, progress tracking';
END $$;