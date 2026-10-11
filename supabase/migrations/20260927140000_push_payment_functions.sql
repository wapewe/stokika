-- Push missing payment helper functions to remote database
-- These are required by the create-vendor-registration-payment edge function

-- 1. get_registration_fee: returns the vendor registration fee
CREATE OR REPLACE FUNCTION get_registration_fee()
RETURNS DECIMAL AS $$
BEGIN
    RETURN 1050.00;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. generate_payment_reference: creates a unique payment reference code
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

-- 3. can_accept_payment: validates a payment intent can still receive payments
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
