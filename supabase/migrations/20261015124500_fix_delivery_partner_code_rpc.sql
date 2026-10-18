-- ── Fix generate_delivery_partner_code Permissions & Security ───────────
CREATE OR REPLACE FUNCTION generate_delivery_partner_code(p_phone TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_suffix TEXT;
    v_code   TEXT;
    v_exists BOOLEAN;
BEGIN
    -- Last 6 digits of phone
    v_suffix := RIGHT(REGEXP_REPLACE(COALESCE(p_phone, '000000'), '[^0-9]', '', 'g'), 6);
    IF LENGTH(v_suffix) < 6 THEN
        v_suffix := LPAD(v_suffix, 6, '0');
    END IF;
    
    LOOP
        v_code := 'SDP' || v_suffix || LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');
        SELECT EXISTS (
            SELECT 1 FROM delivery_partners WHERE application_code = v_code
        ) INTO v_exists;
        EXIT WHEN NOT v_exists;
    END LOOP;
    
    RETURN v_code;
END;
$$;

GRANT EXECUTE ON FUNCTION generate_delivery_partner_code(TEXT) TO anon, authenticated, service_role;

-- Grant permissions on delivery_partners
GRANT SELECT, INSERT, UPDATE ON delivery_partners TO anon, authenticated, service_role;

-- Ensure all new columns exist
ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS gender_other TEXT;
ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS business_type_other TEXT;
ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS agreement_accepted BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS agreement_accepted_at TIMESTAMPTZ DEFAULT now();
