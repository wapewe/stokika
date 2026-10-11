-- Unified Payment Architecture Migration
-- Fixed to use profiles table and support vendor registration fees

-- 1. CREATE PAYMENT INTENTS TABLE
CREATE TABLE IF NOT EXISTS payment_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_reference TEXT UNIQUE NOT NULL,
    profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    field_agent_id UUID REFERENCES field_agents(id) ON DELETE SET NULL,
    supervisor_id UUID REFERENCES supervisors(id) ON DELETE SET NULL,
    payment_purpose TEXT NOT NULL CHECK (payment_purpose IN ('STOCK_CYCLE', 'FIELD_AGENT_KIT', 'SUPERVISOR_KIT', 'REGISTRATION', 'OTHER')),
    stock_cycle_id UUID REFERENCES stock_cycles(id) ON DELETE SET NULL,
    stock_request_id UUID REFERENCES stock_requests(id) ON DELETE SET NULL,
    expected_amount DECIMAL(10,2) NOT NULL CHECK (expected_amount > 0),
    currency TEXT NOT NULL DEFAULT 'KES' CHECK (currency = 'KES'),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'CONFIRMED', 'FAILED', 'EXPIRED', 'CANCELLED')),
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    confirmed_at TIMESTAMPTZ,
    CONSTRAINT at_least_one_entity CHECK (profile_id IS NOT NULL OR vendor_id IS NOT NULL OR field_agent_id IS NOT NULL OR supervisor_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_payment_intents_reference ON payment_intents(payment_reference);
CREATE INDEX IF NOT EXISTS idx_payment_intents_profile ON payment_intents(profile_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_vendor ON payment_intents(vendor_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_field_agent ON payment_intents(field_agent_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_supervisor ON payment_intents(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_purpose ON payment_intents(payment_purpose);
CREATE INDEX IF NOT EXISTS idx_payment_intents_status ON payment_intents(status);
CREATE INDEX IF NOT EXISTS idx_payment_intents_stock_cycle ON payment_intents(stock_cycle_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_expires ON payment_intents(expires_at);

CREATE TRIGGER update_payment_intents_updated_at 
    BEFORE UPDATE ON payment_intents
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 2. CREATE PAYMENT TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_intent_id UUID REFERENCES payment_intents(id) ON DELETE SET NULL,
    profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    field_agent_id UUID REFERENCES field_agents(id) ON DELETE SET NULL,
    supervisor_id UUID REFERENCES supervisors(id) ON DELETE SET NULL,
    provider TEXT NOT NULL DEFAULT 'MPESA' CHECK (provider IN ('MPESA', 'BANK', 'CASH', 'OTHER')),
    provider_transaction_id TEXT,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('STK_PUSH', 'C2B', 'B2C', 'B2B', 'MANUAL')),
    payment_channel TEXT NOT NULL CHECK (payment_channel IN ('STK_PUSH', 'C2B', 'MANUAL')),
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'KES' CHECK (currency = 'KES'),
    payer_phone TEXT CHECK (payer_phone ~ '^254[0-9]{9}$'),
    payer_name TEXT,
    account_reference TEXT,
    receipt_number TEXT,
    merchant_request_id TEXT,
    checkout_request_id TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'FAILED', 'REVERSED', 'CANCELLED', 'UNMATCHED', 'REFUNDED')),
    initiated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    confirmed_at TIMESTAMPTZ,
    result_code INTEGER,
    result_description TEXT,
    failure_reason TEXT,
    raw_provider_response JSONB,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_provider_transaction UNIQUE (provider, provider_transaction_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_intent ON payment_transactions(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_profile ON payment_transactions(profile_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_vendor ON payment_transactions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_channel ON payment_transactions(payment_channel);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_phone ON payment_transactions(payer_phone);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_checkout_request ON payment_transactions(checkout_request_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_receipt ON payment_transactions(receipt_number);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_account_ref ON payment_transactions(account_reference);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created ON payment_transactions(created_at);

CREATE TRIGGER update_payment_transactions_updated_at 
    BEFORE UPDATE ON payment_transactions
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 3. CREATE PAYMENT ALLOCATIONS TABLE
CREATE TABLE IF NOT EXISTS payment_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_transaction_id UUID NOT NULL REFERENCES payment_transactions(id) ON DELETE CASCADE,
    payment_intent_id UUID NOT NULL REFERENCES payment_intents(id) ON DELETE CASCADE,
    allocated_amount DECIMAL(10,2) NOT NULL CHECK (allocated_amount > 0),
    currency TEXT NOT NULL DEFAULT 'KES',
    stock_cycle_id UUID REFERENCES stock_cycles(id) ON DELETE SET NULL,
    stock_request_id UUID REFERENCES stock_requests(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'ALLOCATED' CHECK (status IN ('ALLOCATED', 'REVERSED', 'ADJUSTED')),
    notes TEXT,
    allocated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    allocated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_allocations_transaction ON payment_allocations(payment_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_intent ON payment_allocations(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_stock_cycle ON payment_allocations(stock_cycle_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_status ON payment_allocations(status);

CREATE TRIGGER update_payment_allocations_updated_at 
    BEFORE UPDATE ON payment_allocations
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 4. CREATE PAYMENT EVENTS TABLE
CREATE TABLE IF NOT EXISTS payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_intent_id UUID REFERENCES payment_intents(id) ON DELETE SET NULL,
    payment_transaction_id UUID REFERENCES payment_transactions(id) ON DELETE SET NULL,
    payment_allocation_id UUID REFERENCES payment_allocations(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    provider TEXT,
    provider_transaction_id TEXT,
    event_data JSONB DEFAULT '{}'::jsonb,
    triggered_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    ip_address TEXT,
    user_agent TEXT,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_events_intent ON payment_events(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_transaction ON payment_events(payment_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_allocation ON payment_events(payment_allocation_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_type ON payment_events(event_type);
CREATE INDEX IF NOT EXISTS idx_payment_events_occurred ON payment_events(occurred_at);

-- 5. CREATE PAYMENT RECONCILIATION TABLE
CREATE TABLE IF NOT EXISTS payment_reconciliation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_transaction_id UUID NOT NULL REFERENCES payment_transactions(id) ON DELETE CASCADE,
    reconciliation_status TEXT NOT NULL DEFAULT 'PENDING',
    issue_type TEXT NOT NULL,
    expected_amount DECIMAL(10,2),
    received_amount DECIMAL(10,2),
    difference_amount DECIMAL(10,2),
    resolution_notes TEXT,
    resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
    priority TEXT NOT NULL DEFAULT 'MEDIUM',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_reconciliation_transaction ON payment_reconciliation(payment_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_reconciliation_status ON payment_reconciliation(reconciliation_status);
CREATE INDEX IF NOT EXISTS idx_payment_reconciliation_issue_type ON payment_reconciliation(issue_type);
CREATE INDEX IF NOT EXISTS idx_payment_reconciliation_assigned ON payment_reconciliation(assigned_to);
CREATE INDEX IF NOT EXISTS idx_payment_reconciliation_priority ON payment_reconciliation(priority);

CREATE TRIGGER update_payment_reconciliation_updated_at 
    BEFORE UPDATE ON payment_reconciliation
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 6. ADD VENDOR REGISTRATION FEE COLUMNS
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS registration_fee DECIMAL(10,2) DEFAULT 1050;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS registration_paid BOOLEAN DEFAULT FALSE;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS registration_payment_date TIMESTAMPTZ;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS registration_payment_id UUID REFERENCES payment_intents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vendors_registration_payment ON vendors(registration_payment_id);
CREATE INDEX IF NOT EXISTS idx_vendors_registration_paid ON vendors(registration_paid);

-- 7. CREATE HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION get_registration_fee()
RETURNS DECIMAL AS $$
BEGIN
    RETURN 1050.00;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION generate_payment_reference(purpose TEXT)
RETURNS TEXT AS $$
DECLARE
    prefix TEXT;
    random_code TEXT;
    reference TEXT;
    exists_count INTEGER;
BEGIN
    prefix := CASE purpose
        WHEN 'STOCK_CYCLE' THEN 'STK-SC'
        WHEN 'FIELD_AGENT_KIT' THEN 'STK-KT-FA'
        WHEN 'SUPERVISOR_KIT' THEN 'STK-KT-SU'
        WHEN 'REGISTRATION' THEN 'STK-REG'
        ELSE 'STK-PAY'
    END;
    
    LOOP
        random_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 5));
        reference := prefix || '-' || random_code;
        SELECT COUNT(*) INTO exists_count FROM payment_intents WHERE payment_reference = reference;
        EXIT WHEN exists_count = 0;
    END LOOP;
    
    RETURN reference;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION can_accept_payment(intent_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    intent_record RECORD;
BEGIN
    SELECT status, expires_at INTO intent_record FROM payment_intents WHERE id = intent_id;
    IF NOT FOUND THEN RETURN FALSE; END IF;
    IF intent_record.status NOT IN ('PENDING', 'PROCESSING') THEN RETURN FALSE; END IF;
    IF intent_record.expires_at < now() THEN RETURN FALSE; END IF;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 8. ENABLE RLS
ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_reconciliation ENABLE ROW LEVEL SECURITY;

-- 9. CREATE RLS POLICIES
CREATE POLICY payment_intents_vendor_select ON payment_intents FOR SELECT TO authenticated
    USING (vendor_id IN (SELECT id FROM vendors WHERE profile_id = auth.uid()));

CREATE POLICY payment_intents_field_agent_select ON payment_intents FOR SELECT TO authenticated
    USING (field_agent_id IN (SELECT id FROM field_agents WHERE profile_id = auth.uid()));

CREATE POLICY payment_intents_supervisor_select ON payment_intents FOR SELECT TO authenticated
    USING (supervisor_id IN (SELECT id FROM supervisors WHERE profile_id = auth.uid()));

CREATE POLICY payment_intents_admin_select ON payment_intents FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles p JOIN user_roles ur ON p.role_id = ur.id WHERE p.id = auth.uid() AND ur.role_name IN ('admin', 'finance', 'super_admin')));

CREATE POLICY payment_transactions_user_select ON payment_transactions FOR SELECT TO authenticated
    USING (vendor_id IN (SELECT id FROM vendors WHERE profile_id = auth.uid()) OR field_agent_id IN (SELECT id FROM field_agents WHERE profile_id = auth.uid()) OR supervisor_id IN (SELECT id FROM supervisors WHERE profile_id = auth.uid()));

CREATE POLICY payment_transactions_admin_select ON payment_transactions FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles p JOIN user_roles ur ON p.role_id = ur.id WHERE p.id = auth.uid() AND ur.role_name IN ('admin', 'finance', 'super_admin')));

CREATE POLICY payment_allocations_user_select ON payment_allocations FOR SELECT TO authenticated
    USING (payment_transaction_id IN (SELECT id FROM payment_transactions WHERE vendor_id IN (SELECT id FROM vendors WHERE profile_id = auth.uid()) OR field_agent_id IN (SELECT id FROM field_agents WHERE profile_id = auth.uid()) OR supervisor_id IN (SELECT id FROM supervisors WHERE profile_id = auth.uid())));

CREATE POLICY payment_allocations_admin_select ON payment_allocations FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles p JOIN user_roles ur ON p.role_id = ur.id WHERE p.id = auth.uid() AND ur.role_name IN ('admin', 'finance', 'super_admin')));

CREATE POLICY payment_events_admin_select ON payment_events FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles p JOIN user_roles ur ON p.role_id = ur.id WHERE p.id = auth.uid() AND ur.role_name IN ('admin', 'finance', 'super_admin')));

CREATE POLICY payment_reconciliation_admin_all ON payment_reconciliation FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles p JOIN user_roles ur ON p.role_id = ur.id WHERE p.id = auth.uid() AND ur.role_name IN ('admin', 'finance', 'super_admin')));

-- 10. ADD COMMENTS
COMMENT ON TABLE payment_intents IS 'Payment obligations - what Stokika expects to be paid';
COMMENT ON TABLE payment_transactions IS 'Actual M-Pesa transactions (STK Push and C2B)';
COMMENT ON TABLE payment_allocations IS 'Maps confirmed payments to specific business obligations';
COMMENT ON TABLE payment_events IS 'Immutable audit trail of all payment-related events';
COMMENT ON TABLE payment_reconciliation IS 'Tracks unmatched, suspicious, or problematic payments';
COMMENT ON FUNCTION get_registration_fee IS 'Returns KES 1050 registration fee - cannot be manipulated by frontend';
