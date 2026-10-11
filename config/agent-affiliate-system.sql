-- Field Agent Affiliate System
-- Tracks vendor/supplier registrations linked to field agents

-- Referral Tracking Table
CREATE TABLE IF NOT EXISTS agent_referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES field_agents(id) ON DELETE CASCADE,
    agent_number VARCHAR(20) NOT NULL,
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('vendor', 'supplier')),
    entity_id UUID,
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    referral_code VARCHAR(100) UNIQUE NOT NULL,
    registration_date TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'active', 'inactive')),
    commission_earned DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add agent referral columns to vendors table
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS referred_by_agent UUID REFERENCES field_agents(id) ON DELETE SET NULL;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS agent_referral_code VARCHAR(100);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS referral_source VARCHAR(50) DEFAULT 'direct' CHECK (referral_source IN ('direct', 'agent_link', 'agent_code'));

-- Add agent referral columns to suppliers table
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS referred_by_agent UUID REFERENCES field_agents(id) ON DELETE SET NULL;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS agent_referral_code VARCHAR(100);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS referral_source VARCHAR(50) DEFAULT 'direct' CHECK (referral_source IN ('direct', 'agent_link', 'agent_code'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_referrals_agent_id ON agent_referrals(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_referrals_agent_number ON agent_referrals(agent_number);
CREATE INDEX IF NOT EXISTS idx_agent_referrals_referral_code ON agent_referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_agent_referrals_entity_type ON agent_referrals(entity_type);
CREATE INDEX IF NOT EXISTS idx_vendors_referred_by_agent ON vendors(referred_by_agent);
CREATE INDEX IF NOT EXISTS idx_suppliers_referred_by_agent ON suppliers(referred_by_agent);

-- Trigger
DROP TRIGGER IF EXISTS update_agent_referrals_updated_at ON agent_referrals;
CREATE TRIGGER update_agent_referrals_updated_at 
BEFORE UPDATE ON agent_referrals 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE agent_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access agent_referrals" 
ON agent_referrals FOR ALL TO authenticated 
USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Agent view own referrals" 
ON agent_referrals FOR SELECT TO authenticated 
USING (agent_id IN (SELECT id FROM field_agents WHERE user_id = auth.uid()));

CREATE POLICY "Public insert referrals" 
ON agent_referrals FOR INSERT TO anon 
WITH CHECK (true);

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code(
    p_agent_number VARCHAR(20),
    p_entity_type VARCHAR(50)
) RETURNS VARCHAR(100) AS $$
DECLARE
    v_code VARCHAR(100);
    v_exists BOOLEAN;
BEGIN
    LOOP
        v_code := p_agent_number || '_' || p_entity_type || '_' || FLOOR(RANDOM() * 100000)::TEXT;
        
        SELECT EXISTS(SELECT 1 FROM agent_referrals WHERE referral_code = v_code) INTO v_exists;
        
        EXIT WHEN NOT v_exists;
    END LOOP;
    
    RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- Function to link vendor to agent
CREATE OR REPLACE FUNCTION link_vendor_to_agent(
    p_vendor_id UUID,
    p_agent_number VARCHAR(20),
    p_referral_source VARCHAR(50)
) RETURNS BOOLEAN AS $$
DECLARE
    v_agent_id UUID;
    v_referral_code VARCHAR(100);
BEGIN
    -- Get agent ID
    SELECT id INTO v_agent_id 
    FROM field_agents 
    WHERE agent_number = p_agent_number AND approval_status = 'approved';
    
    IF v_agent_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Update vendor
    UPDATE vendors 
    SET referred_by_agent = v_agent_id,
        agent_referral_code = p_agent_number,
        referral_source = p_referral_source
    WHERE id = p_vendor_id;
    
    -- Generate referral code
    v_referral_code := generate_referral_code(p_agent_number, 'vendor');
    
    -- Create referral record
    INSERT INTO agent_referrals (
        agent_id, 
        agent_number, 
        entity_type, 
        vendor_id, 
        referral_code,
        status
    ) VALUES (
        v_agent_id, 
        p_agent_number, 
        'vendor', 
        p_vendor_id, 
        v_referral_code,
        'pending'
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to link supplier to agent
CREATE OR REPLACE FUNCTION link_supplier_to_agent(
    p_supplier_id UUID,
    p_agent_number VARCHAR(20),
    p_referral_source VARCHAR(50)
) RETURNS BOOLEAN AS $$
DECLARE
    v_agent_id UUID;
    v_referral_code VARCHAR(100);
BEGIN
    -- Get agent ID
    SELECT id INTO v_agent_id 
    FROM field_agents 
    WHERE agent_number = p_agent_number AND approval_status = 'approved';
    
    IF v_agent_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Update supplier
    UPDATE suppliers 
    SET referred_by_agent = v_agent_id,
        agent_referral_code = p_agent_number,
        referral_source = p_referral_source
    WHERE id = p_supplier_id;
    
    -- Generate referral code
    v_referral_code := generate_referral_code(p_agent_number, 'supplier');
    
    -- Create referral record
    INSERT INTO agent_referrals (
        agent_id, 
        agent_number, 
        entity_type, 
        supplier_id, 
        referral_code,
        status
    ) VALUES (
        v_agent_id, 
        p_agent_number, 
        'supplier', 
        p_supplier_id, 
        v_referral_code,
        'pending'
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify agent code
CREATE OR REPLACE FUNCTION verify_agent_code(
    p_agent_code VARCHAR(20)
) RETURNS TABLE(
    agent_id UUID,
    agent_number VARCHAR(20),
    full_name VARCHAR(255),
    is_valid BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fa.id,
        fa.agent_number,
        fa.full_name,
        (fa.approval_status = 'approved' AND fa.status = 'active')::BOOLEAN as is_valid
    FROM field_agents fa
    WHERE fa.agent_number = p_agent_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get agent referral stats
CREATE OR REPLACE FUNCTION get_agent_referral_stats(
    p_agent_id UUID
) RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'total_referrals', COUNT(*),
        'pending_referrals', COUNT(*) FILTER (WHERE status = 'pending'),
        'approved_referrals', COUNT(*) FILTER (WHERE status = 'approved'),
        'active_referrals', COUNT(*) FILTER (WHERE status = 'active'),
        'total_vendors', COUNT(*) FILTER (WHERE entity_type = 'vendor'),
        'total_suppliers', COUNT(*) FILTER (WHERE entity_type = 'supplier'),
        'total_commission', COALESCE(SUM(commission_earned), 0)
    ) INTO v_result
    FROM agent_referrals
    WHERE agent_id = p_agent_id;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Agent Affiliate System created successfully!';
    RAISE NOTICE '🔗 Referral tracking enabled for vendors and suppliers';
    RAISE NOTICE '📊 Agent commission tracking configured';
END $$;
