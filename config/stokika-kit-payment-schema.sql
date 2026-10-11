-- Stokika Kit Payment Schema
-- Run this in Supabase SQL Editor

-- 1. Stokika Kit Configuration Table
CREATE TABLE IF NOT EXISTS stokika_kit_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_type VARCHAR(50) NOT NULL UNIQUE CHECK (user_type IN ('field_agent', 'supervisor')),
    kit_amount DECIMAL(10,2) NOT NULL,
    kit_items TEXT[] NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Stokika Kit Payments Table
CREATE TABLE IF NOT EXISTS stokika_kit_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    user_type VARCHAR(50) NOT NULL,
    kit_amount DECIMAL(10,2) NOT NULL,
    kit_items TEXT[] NOT NULL,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('mpesa', 'bank_transfer', 'cash', 'card')),
    payment_reference VARCHAR(100),
    mpesa_code VARCHAR(50),
    phone_number VARCHAR(20),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'verified', 'rejected', 'refunded')),
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_stokika_kit_payments_user ON stokika_kit_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_stokika_kit_payments_status ON stokika_kit_payments(payment_status);

-- Enable RLS
ALTER TABLE stokika_kit_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE stokika_kit_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stokika_kit_config
CREATE POLICY "Everyone can view kit config" ON stokika_kit_config FOR SELECT USING (true);
CREATE POLICY "Admins can manage kit config" ON stokika_kit_config FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for stokika_kit_payments
CREATE POLICY "Users can view own kit payments" ON stokika_kit_payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own kit payments" ON stokika_kit_payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all kit payments" ON stokika_kit_payments FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can manage all kit payments" ON stokika_kit_payments FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Insert default kit configurations
INSERT INTO stokika_kit_config (user_type, kit_amount, kit_items, description) VALUES
('field_agent', 2500.00, ARRAY[
    'Stokika Branded T-Shirt',
    'ID Badge & Lanyard',
    'Product Catalog',
    'Order Forms (50 sheets)',
    'Branded Bag',
    'Training Manual',
    'Mobile App Access'
], 'Complete starter kit for field agents including branded materials and training resources'),
('supervisor', 3500.00, ARRAY[
    'Stokika Branded Polo Shirt',
    'Supervisor ID Badge & Lanyard',
    'Product Catalog',
    'Order Forms (100 sheets)',
    'Branded Laptop Bag',
    'Training Manual',
    'Supervisor Handbook',
    'Mobile App Access',
    'Territory Management Tools'
], 'Complete starter kit for supervisors including management tools and branded materials');

-- Function to check if kit payment is verified
CREATE OR REPLACE FUNCTION check_kit_payment_verified(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_payment_verified BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM stokika_kit_payments
        WHERE user_id = p_user_id AND payment_status = 'verified'
    ) INTO v_payment_verified;
    
    RETURN v_payment_verified;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update onboarding step when kit payment is verified
CREATE OR REPLACE FUNCTION update_kit_payment_step()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.payment_status = 'verified' AND OLD.payment_status != 'verified' THEN
        -- Update onboarding step
        UPDATE onboarding_steps
        SET status = 'completed', completed_at = NOW()
        WHERE user_id = NEW.user_id AND step_name = 'kit_payment';
        
        -- Send notification
        INSERT INTO onboarding_notifications (user_id, notification_type, title, message)
        VALUES (NEW.user_id, 'payment_verified', 'Kit Payment Verified', 
                'Your Stokika Kit payment has been verified. Your kit will be delivered soon.');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER kit_payment_verification_trigger
AFTER UPDATE ON stokika_kit_payments
FOR EACH ROW
WHEN (NEW.payment_status = 'verified' AND OLD.payment_status != 'verified')
EXECUTE FUNCTION update_kit_payment_step();

-- Update initialize_onboarding function to include kit payment step
CREATE OR REPLACE FUNCTION initialize_onboarding(p_user_id UUID, p_user_type VARCHAR)
RETURNS VOID AS $$
BEGIN
    -- Create onboarding steps
    INSERT INTO onboarding_steps (user_id, user_type, step_name, step_order, status) VALUES
    (p_user_id, p_user_type, 'account_created', 1, 'completed'),
    (p_user_id, p_user_type, 'kit_payment', 2, 'pending'),
    (p_user_id, p_user_type, 'email_verification', 3, 'pending'),
    (p_user_id, p_user_type, 'profile_setup', 4, 'pending'),
    (p_user_id, p_user_type, 'document_upload', 5, 'pending'),
    (p_user_id, p_user_type, 'training_completion', 6, 'pending'),
    (p_user_id, p_user_type, 'first_assignment', 7, 'pending')
    ON CONFLICT (user_id, step_name) DO NOTHING;
    
    -- Create training progress records for mandatory modules
    INSERT INTO training_progress (user_id, module_id, status)
    SELECT p_user_id, id, 'not_started'
    FROM training_modules
    WHERE user_type = p_user_type AND is_mandatory = true
    ON CONFLICT (user_id, module_id) DO NOTHING;
    
    -- Send welcome notification
    INSERT INTO onboarding_notifications (user_id, notification_type, title, message)
    VALUES (p_user_id, 'welcome', 'Welcome to Stokika!', 'Complete your onboarding steps to get started. First step: Pay for your Stokika Kit.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify tables created
SELECT 'Stokika Kit Payment tables created successfully' as status;
