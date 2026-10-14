-- Migration: Update Kit Payment Amounts and Dynamic Database Validation
-- Description: Sets Vendor: 1050, Supervisor: 3050 (was 3500), Field Agent: 1550 (was 2500)
-- Enforces server-side dynamic validation from stokika_kit_config table

-- ============================================================================
-- 1. Update stokika_kit_config User Type Constraint
-- ============================================================================

ALTER TABLE stokika_kit_config 
DROP CONSTRAINT IF EXISTS stokika_kit_config_user_type_check;

ALTER TABLE stokika_kit_config 
ADD CONSTRAINT stokika_kit_config_user_type_check 
CHECK (user_type IN ('field_agent', 'supervisor', 'vendor'));

-- ============================================================================
-- 2. Seed / Update stokika_kit_config with Authoritative Prices
-- ============================================================================

-- Field Agent: KES 1,550
INSERT INTO stokika_kit_config (user_type, kit_amount, kit_items, description, is_active)
VALUES (
    'field_agent', 
    1550.00, 
    ARRAY[
        'Stokika Branded T-Shirt',
        'ID Badge & Lanyard',
        'Product Catalog',
        'Order Forms (50 sheets)',
        'Branded Bag',
        'Training Manual',
        'Mobile App Access'
    ], 
    'Complete starter kit for field agents including branded materials and training resources',
    true
)
ON CONFLICT (user_type) DO UPDATE SET
    kit_amount = 1550.00,
    is_active = true,
    updated_at = now();

-- Supervisor: KES 3,050 (Fixed from 3,500)
INSERT INTO stokika_kit_config (user_type, kit_amount, kit_items, description, is_active)
VALUES (
    'supervisor', 
    3050.00, 
    ARRAY[
        'Stokika Branded Polo Shirt',
        'Supervisor ID Badge & Lanyard',
        'Product Catalog',
        'Order Forms (100 sheets)',
        'Branded Laptop Bag',
        'Training Manual',
        'Supervisor Handbook',
        'Mobile App Access',
        'Territory Management Tools'
    ], 
    'Complete starter kit for supervisors including management tools and branded materials',
    true
)
ON CONFLICT (user_type) DO UPDATE SET
    kit_amount = 3050.00,
    is_active = true,
    updated_at = now();

-- Vendor: KES 1,050
INSERT INTO stokika_kit_config (user_type, kit_amount, kit_items, description, is_active)
VALUES (
    'vendor', 
    1050.00, 
    ARRAY[
        'Stokika Merchant Access',
        'Vendor Starter Materials',
        'Product Placement Guide',
        'Digital Payment Setup',
        'Merchant Support'
    ], 
    'Vendor onboarding and platform activation fee',
    true
)
ON CONFLICT (user_type) DO UPDATE SET
    kit_amount = 1050.00,
    is_active = true,
    updated_at = now();

-- ============================================================================
-- 3. Update kit_configurations Table (If Present)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'kit_configurations') THEN
        UPDATE kit_configurations SET payment_amount = 1550.00 WHERE role_type = 'field_agent';
        UPDATE kit_configurations SET payment_amount = 3050.00 WHERE role_type = 'supervisor';
        
        INSERT INTO kit_configurations (role_type, payment_amount, kit_items, benefits, is_active)
        VALUES (
            'vendor',
            1050.00,
            '[{"item": "Stokika Merchant Access", "quantity": 1}, {"item": "Digital Payment Setup", "quantity": 1}]'::jsonb,
            '[{"benefit": "Platform Trading Access"}, {"benefit": "Merchant Support"}]'::jsonb,
            true
        )
        ON CONFLICT (role_type) DO UPDATE SET 
            payment_amount = 1050.00,
            is_active = true;
    END IF;
END $$;

-- ============================================================================
-- 4. Update stokika_kit_payments Constraints
-- ============================================================================

-- Drop old constraints
ALTER TABLE stokika_kit_payments DROP CONSTRAINT IF EXISTS stokika_kit_payments_kit_amount_check;
ALTER TABLE stokika_kit_payments DROP CONSTRAINT IF EXISTS valid_kit_amount;
ALTER TABLE stokika_kit_payments DROP CONSTRAINT IF EXISTS stokika_kit_payments_user_type_check;

-- New flexible amount check (positive amount required)
ALTER TABLE stokika_kit_payments ADD CONSTRAINT stokika_kit_payments_kit_amount_check 
    CHECK (kit_amount > 0);

-- Allow field_agent, supervisor, vendor
ALTER TABLE stokika_kit_payments ADD CONSTRAINT stokika_kit_payments_user_type_check 
    CHECK (user_type IN ('field_agent', 'supervisor', 'vendor'));

-- ============================================================================
-- 5. Dynamic Backend Validation Trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_kit_payment_amount()
RETURNS TRIGGER AS $$
DECLARE
    v_expected_amount DECIMAL(10,2);
BEGIN
    -- Query expected amount dynamically from database config
    SELECT kit_amount INTO v_expected_amount
    FROM stokika_kit_config
    WHERE user_type = NEW.user_type
    AND is_active = TRUE;
    
    -- If amount is in config and paid is less than required, reject
    IF v_expected_amount IS NOT NULL AND NEW.kit_amount < v_expected_amount THEN
        RAISE EXCEPTION 'Invalid kit amount. Expected at least % for %, received %',
            v_expected_amount, NEW.user_type, NEW.kit_amount
            USING ERRCODE = 'check_violation';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-apply trigger
DROP TRIGGER IF EXISTS enforce_kit_amount ON stokika_kit_payments;
CREATE TRIGGER enforce_kit_amount
    BEFORE INSERT OR UPDATE OF kit_amount ON stokika_kit_payments
    FOR EACH ROW
    EXECUTE FUNCTION validate_kit_payment_amount();

-- ============================================================================
-- 6. RPC Functions for Database-Driven Price Lookup
-- ============================================================================

CREATE OR REPLACE FUNCTION get_registration_fee()
RETURNS NUMERIC AS $$
BEGIN
    RETURN 1050.00;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION get_kit_price(p_user_type TEXT)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    v_amount DECIMAL(10,2);
BEGIN
    SELECT kit_amount INTO v_amount
    FROM stokika_kit_config
    WHERE user_type = p_user_type AND is_active = TRUE;
    
    IF v_amount IS NULL THEN
        CASE p_user_type
            WHEN 'vendor' THEN v_amount := 1050.00;
            WHEN 'field_agent' THEN v_amount := 1550.00;
            WHEN 'supervisor' THEN v_amount := 3050.00;
            ELSE v_amount := 1050.00;
        END CASE;
    END IF;
    
    RETURN v_amount;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execution to anon and authenticated
GRANT EXECUTE ON FUNCTION get_registration_fee() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_kit_price(TEXT) TO anon, authenticated, service_role;
