-- Migration: Create Field Agents and Supervisors Tables
-- Description: Creates tables for field agent and supervisor management
-- Requirements: Agent/supervisor onboarding, territory management, performance tracking
-- Note: These are platform staff who onboard vendors and manage operations

-- ============================================================================
-- Supervisors Table (Create first due to foreign key dependency)
-- ============================================================================

CREATE TABLE IF NOT EXISTS supervisors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    application_code TEXT UNIQUE NOT NULL,
    supervisor_number TEXT UNIQUE,
    id_number TEXT NOT NULL,
    date_of_birth DATE,
    gender TEXT,
    county TEXT NOT NULL,
    sub_county TEXT,
    assigned_region TEXT,
    
    -- Kit payment tracking
    kit_paid BOOLEAN DEFAULT FALSE,
    kit_payment_date TIMESTAMPTZ,
    kit_payment_id UUID REFERENCES stokika_kit_payments(id) ON DELETE SET NULL,
    
    -- Status and approval
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'suspended')),
    interview_status TEXT DEFAULT 'not_interviewed' CHECK (interview_status IN ('not_interviewed', 'scheduled', 'interviewed', 'passed', 'failed')),
    interview_date TIMESTAMPTZ,
    interview_notes TEXT,
    approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    approved_by UUID REFERENCES profiles(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    -- Permissions
    is_active BOOLEAN DEFAULT FALSE,
    can_approve_orders BOOLEAN DEFAULT FALSE,
    
    -- Lifecycle tracking
    promoted_at TIMESTAMPTZ,
    demoted_at TIMESTAMPTZ,
    deactivated_at TIMESTAMPTZ,
    deactivation_reason TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for supervisors
CREATE INDEX IF NOT EXISTS idx_supervisors_profile ON supervisors(profile_id);
CREATE INDEX IF NOT EXISTS idx_supervisors_application_code ON supervisors(application_code);
CREATE INDEX IF NOT EXISTS idx_supervisors_supervisor_number ON supervisors(supervisor_number);
CREATE INDEX IF NOT EXISTS idx_supervisors_status ON supervisors(status);
CREATE INDEX IF NOT EXISTS idx_supervisors_kit_payment ON supervisors(kit_payment_id);
CREATE INDEX IF NOT EXISTS idx_supervisors_county ON supervisors(county);
CREATE INDEX IF NOT EXISTS idx_supervisors_is_active ON supervisors(is_active);

-- Apply updated_at trigger
CREATE TRIGGER update_supervisors_updated_at 
    BEFORE UPDATE ON supervisors
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Field Agents Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS field_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    supervisor_id UUID REFERENCES supervisors(id) ON DELETE SET NULL,
    application_code TEXT UNIQUE NOT NULL,
    agent_number TEXT UNIQUE,
    
    -- Personal information
    id_number TEXT NOT NULL,
    date_of_birth DATE,
    gender TEXT,
    county TEXT NOT NULL,
    sub_county TEXT,
    town TEXT,
    ward TEXT,
    
    -- Next of kin
    kin_name TEXT NOT NULL,
    kin_relationship TEXT NOT NULL,
    kin_phone TEXT NOT NULL CHECK (kin_phone ~ '^254[0-9]{9}$'),
    kin_address TEXT,
    
    -- Employment history
    currently_employed TEXT,
    current_employer TEXT,
    has_previous_experience TEXT,
    experience TEXT,
    years_experience TEXT,
    sme_experience TEXT NOT NULL,
    
    -- Languages and market knowledge
    languages TEXT,
    local_languages TEXT,
    local_market_familiar TEXT,
    market_areas TEXT,
    
    -- Technology access
    owns_smartphone TEXT,
    phone_brand TEXT,
    android_version TEXT,
    can_use_smartphone TEXT,
    internet_access TEXT,
    
    -- Availability
    start_date TEXT,
    weekday_availability TEXT,
    unavailable_day TEXT,
    unavailability_reason TEXT,
    working_hours TEXT,
    
    -- Compensation
    expected_income TEXT,
    income_explanation TEXT,
    has_transport TEXT,
    transport_type TEXT,
    
    -- References
    referee1_name TEXT NOT NULL,
    referee1_phone TEXT NOT NULL CHECK (referee1_phone ~ '^254[0-9]{9}$'),
    referee1_relationship TEXT NOT NULL,
    referee2_name TEXT NOT NULL,
    referee2_phone TEXT NOT NULL CHECK (referee2_phone ~ '^254[0-9]{9}$'),
    referee2_relationship TEXT NOT NULL,
    
    -- Compliance
    criminal_history TEXT,
    criminal_explanation TEXT,
    code_of_conduct TEXT,
    training_willingness TEXT,
    kra_pin TEXT,
    agreement TEXT,
    
    -- Kit payment tracking
    kit_paid BOOLEAN DEFAULT FALSE,
    kit_payment_date TIMESTAMPTZ,
    kit_payment_id UUID REFERENCES stokika_kit_payments(id) ON DELETE SET NULL,
    
    -- Status and approval
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'suspended')),
    interview_status TEXT DEFAULT 'not_interviewed' CHECK (interview_status IN ('not_interviewed', 'scheduled', 'interviewed', 'passed', 'failed')),
    interview_date TIMESTAMPTZ,
    interview_notes TEXT,
    approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    approved_by UUID REFERENCES profiles(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    -- Lifecycle tracking
    deactivated_at TIMESTAMPTZ,
    deactivation_reason TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for field_agents
CREATE INDEX IF NOT EXISTS idx_field_agents_profile ON field_agents(profile_id);
CREATE INDEX IF NOT EXISTS idx_field_agents_supervisor ON field_agents(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_field_agents_application_code ON field_agents(application_code);
CREATE INDEX IF NOT EXISTS idx_field_agents_agent_number ON field_agents(agent_number);
CREATE INDEX IF NOT EXISTS idx_field_agents_status ON field_agents(status);
CREATE INDEX IF NOT EXISTS idx_field_agents_kit_payment ON field_agents(kit_payment_id);
CREATE INDEX IF NOT EXISTS idx_field_agents_county ON field_agents(county);

-- Apply updated_at trigger
CREATE TRIGGER update_field_agents_updated_at 
    BEFORE UPDATE ON field_agents
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Agent Documents Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES field_agents(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL CHECK (document_type IN (
        'national_id', 'kra_pin', 'cv', 'certificate', 
        'reference_letter', 'passport_photo', 'other'
    )),
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT now(),
    status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'verified', 'rejected')),
    verified_by UUID REFERENCES profiles(id),
    verified_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for agent_documents
CREATE INDEX IF NOT EXISTS idx_agent_documents_agent ON agent_documents(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_documents_type ON agent_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_agent_documents_status ON agent_documents(status);

-- Apply updated_at trigger
CREATE TRIGGER update_agent_documents_updated_at 
    BEFORE UPDATE ON agent_documents
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Enable RLS
-- ============================================================================

ALTER TABLE supervisors ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_documents ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies for Supervisors
-- ============================================================================

-- Supervisors can view their own profile
CREATE POLICY "Supervisors can view own profile"
ON supervisors FOR SELECT
USING (profile_id = auth.uid());

-- Supervisors can update their own profile (limited fields)
CREATE POLICY "Supervisors can update own profile"
ON supervisors FOR UPDATE
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

-- Operations and admin can view all supervisors
CREATE POLICY "Staff can view all supervisors"
ON supervisors FOR SELECT
USING (has_role(ARRAY['operations', 'finance', 'admin', 'super_admin']));

-- Admin can manage supervisors
CREATE POLICY "Admin can manage supervisors"
ON supervisors FOR ALL
USING (has_role(ARRAY['admin', 'super_admin']))
WITH CHECK (has_role(ARRAY['admin', 'super_admin']));

-- ============================================================================
-- RLS Policies for Field Agents
-- ============================================================================

-- Field agents can view their own profile
CREATE POLICY "Agents can view own profile"
ON field_agents FOR SELECT
USING (profile_id = auth.uid());

-- Field agents can update their own profile (limited fields)
CREATE POLICY "Agents can update own profile"
ON field_agents FOR UPDATE
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

-- Supervisors can view their assigned agents
CREATE POLICY "Supervisors can view assigned agents"
ON field_agents FOR SELECT
USING (
    supervisor_id IN (
        SELECT id FROM supervisors WHERE profile_id = auth.uid()
    )
    OR has_role(ARRAY['supervisor'])
);

-- Operations and admin can view all agents
CREATE POLICY "Staff can view all agents"
ON field_agents FOR SELECT
USING (has_role(ARRAY['operations', 'finance', 'admin', 'super_admin']));

-- Admin can manage agents
CREATE POLICY "Admin can manage agents"
ON field_agents FOR ALL
USING (has_role(ARRAY['admin', 'super_admin']))
WITH CHECK (has_role(ARRAY['admin', 'super_admin']));

-- ============================================================================
-- RLS Policies for Agent Documents
-- ============================================================================

-- Agents can view and upload their own documents
CREATE POLICY "Agents can manage own documents"
ON agent_documents FOR ALL
USING (
    agent_id IN (
        SELECT id FROM field_agents WHERE profile_id = auth.uid()
    )
)
WITH CHECK (
    agent_id IN (
        SELECT id FROM field_agents WHERE profile_id = auth.uid()
    )
);

-- Supervisors can view documents of their assigned agents
CREATE POLICY "Supervisors can view assigned agent documents"
ON agent_documents FOR SELECT
USING (
    agent_id IN (
        SELECT fa.id FROM field_agents fa
        JOIN supervisors s ON fa.supervisor_id = s.id
        WHERE s.profile_id = auth.uid()
    )
);

-- Staff can view all documents
CREATE POLICY "Staff can view all agent documents"
ON agent_documents FOR SELECT
USING (has_role(ARRAY['operations', 'finance', 'admin', 'super_admin']));

-- Staff can verify documents
CREATE POLICY "Staff can verify documents"
ON agent_documents FOR UPDATE
USING (has_role(ARRAY['operations', 'admin', 'super_admin']))
WITH CHECK (has_role(ARRAY['operations', 'admin', 'super_admin']));

-- ============================================================================
-- Update kit payment policies to support agents/supervisors
-- ============================================================================

-- Drop and recreate the kit payments view policy with proper references
DROP POLICY IF EXISTS "Users can view own kit payments" ON stokika_kit_payments;

CREATE POLICY "Users can view own kit payments"
ON stokika_kit_payments FOR SELECT
USING (
    user_id = auth.uid() 
    OR application_code IN (
        SELECT application_code FROM field_agents WHERE profile_id = auth.uid()
        UNION
        SELECT application_code FROM supervisors WHERE profile_id = auth.uid()
    )
);

-- ============================================================================
-- Triggers for Kit Payment Activation
-- ============================================================================

-- Function to activate field agent when kit is paid
CREATE OR REPLACE FUNCTION activate_field_agent_kit()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.payment_status = 'completed' AND OLD.payment_status != 'completed' 
       AND NEW.user_type = 'field_agent' THEN
        
        UPDATE field_agents
        SET 
            kit_paid = TRUE,
            kit_payment_date = NEW.transaction_date,
            kit_payment_id = NEW.id,
            updated_at = NOW()
        WHERE application_code = NEW.application_code;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to activate supervisor when kit is paid
CREATE OR REPLACE FUNCTION activate_supervisor_kit()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.payment_status = 'completed' AND OLD.payment_status != 'completed' 
       AND NEW.user_type = 'supervisor' THEN
        
        UPDATE supervisors
        SET 
            kit_paid = TRUE,
            kit_payment_date = NEW.transaction_date,
            kit_payment_id = NEW.id,
            updated_at = NOW()
        WHERE application_code = NEW.application_code;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_activate_field_agent_kit ON stokika_kit_payments;
CREATE TRIGGER trigger_activate_field_agent_kit
    AFTER UPDATE ON stokika_kit_payments
    FOR EACH ROW
    WHEN (NEW.user_type = 'field_agent' AND NEW.payment_status = 'completed')
    EXECUTE FUNCTION activate_field_agent_kit();

DROP TRIGGER IF EXISTS trigger_activate_supervisor_kit ON stokika_kit_payments;
CREATE TRIGGER trigger_activate_supervisor_kit
    AFTER UPDATE ON stokika_kit_payments
    FOR EACH ROW
    WHEN (NEW.user_type = 'supervisor' AND NEW.payment_status = 'completed')
    EXECUTE FUNCTION activate_supervisor_kit();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE supervisors IS 'Platform supervisors who manage field agents and oversee vendor onboarding';
COMMENT ON TABLE field_agents IS 'Platform field agents who onboard vendors and manage relationships';
COMMENT ON TABLE agent_documents IS 'Document storage for field agent verification and onboarding';
COMMENT ON COLUMN field_agents.kit_paid IS 'Whether agent has paid for registration kit (triggers account activation)';
COMMENT ON COLUMN supervisors.kit_paid IS 'Whether supervisor has paid for registration kit (triggers account activation)';
COMMENT ON FUNCTION activate_field_agent_kit IS 'Automatically updates field_agents when kit payment is completed';
COMMENT ON FUNCTION activate_supervisor_kit IS 'Automatically updates supervisors when kit payment is completed';