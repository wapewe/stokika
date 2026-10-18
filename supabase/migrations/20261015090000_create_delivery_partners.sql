-- Migration: Create delivery_partners table (v2 — aligned with 4-step registration form)
-- Description: Stores all Delivery Partner onboarding data submitted through the form.
-- Updated to match new form fields: partner type, vehicle access, goods list, operating
-- area, agreement, payment confirmation, etc.

CREATE TABLE IF NOT EXISTS delivery_partners (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id               UUID REFERENCES profiles(id) ON DELETE SET NULL,

    -- ── Application ──────────────────────────────────────────────────
    application_code         TEXT UNIQUE NOT NULL,
    status                   TEXT NOT NULL DEFAULT 'pending_review'
                             CHECK (status IN (
                                 'pending_review','approved','rejected',
                                 'active','inactive','suspended'
                             )),

    -- ── Step 1: Personal Details ──────────────────────────────────────
    full_name                TEXT NOT NULL,
    phone                    TEXT NOT NULL,
    email                    TEXT,
    id_number                TEXT NOT NULL,          -- National ID (required — used as Paybill account no.)
    gender                   TEXT,
    gender_other             TEXT,
    county                   TEXT NOT NULL,
    town                     TEXT NOT NULL,

    -- ── Partner Type (Individual | Business | Fleet) ──────────────────
    partner_type             TEXT NOT NULL
                             CHECK (partner_type IN ('individual','business','fleet')),

    -- Business / Fleet fields (null for individual)
    business_name            TEXT,
    business_type            TEXT,                   -- sole_proprietor|partnership|company|cooperative|other
    business_type_other      TEXT,
    business_reg_number      TEXT,
    active_drivers           TEXT,                   -- e.g. '1-5', '6-20', '21-50', '51+'

    -- ── Step 2: Delivery Profile ──────────────────────────────────────
    vehicle_type             TEXT NOT NULL,           -- motorcycle|bicycle|car|pickup|van|lorry|walking|other
    vehicle_type_other       TEXT,                   -- Specify when vehicle_type = 'other'
    vehicle_access           TEXT NOT NULL,           -- owned|rented|provided|access_when_needed|fleet_owner
    vehicle_make_model       TEXT,
    registration_number      TEXT,
    fleet_vehicles           TEXT,                   -- 2-5|6-15|16-30|31+  (fleet operators only)
    carrying_capacity        TEXT NOT NULL,           -- small_parcels|up_to_20kg|21_50kg|51_100kg|101_500kg|over_500kg
    goods_can_deliver        TEXT[] NOT NULL,         -- array of goods categories
    goods_other_specify      TEXT,                   -- Specify when goods contains 'other'
    availability             TEXT NOT NULL,           -- full_time|part_time|weekdays|weekends|flexible

    -- ── Step 3: Operating Area ────────────────────────────────────────
    delivery_coverage        TEXT NOT NULL,           -- local|county|inter_county|any
    route_preference         TEXT NOT NULL,           -- within_town|town_to_nearby|across_county|between_counties|any_route
    delivery_type            TEXT NOT NULL,           -- single|multiple_stops|bulk|any
    travel_outside           BOOLEAN NOT NULL DEFAULT FALSE,
    additional_areas         TEXT,

    -- ── Agreement ─────────────────────────────────────────────────────
    agreement_accepted       BOOLEAN NOT NULL DEFAULT TRUE,
    agreement_accepted_at    TIMESTAMPTZ DEFAULT now(),

    -- ── Registration Payment ──────────────────────────────────────────
    registration_fee         DECIMAL(10,2) DEFAULT 1050.00,
    registration_paid        BOOLEAN DEFAULT FALSE,
    registration_payment_id  UUID REFERENCES payment_intents(id) ON DELETE SET NULL,

    -- ── Verification (post-signup, progressive) ───────────────────────
    driving_license_number   TEXT,
    driving_license_class    TEXT,
    driving_license_expiry   DATE,
    national_id_verified     BOOLEAN DEFAULT FALSE,
    vehicle_verified         BOOLEAN DEFAULT FALSE,
    documents_submitted      BOOLEAN DEFAULT FALSE,
    verification_notes       TEXT,

    -- ── Metadata ─────────────────────────────────────────────────────
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_dp_id_number       ON delivery_partners(id_number);
CREATE INDEX IF NOT EXISTS idx_dp_app_code        ON delivery_partners(application_code);
CREATE INDEX IF NOT EXISTS idx_dp_phone           ON delivery_partners(phone);
CREATE INDEX IF NOT EXISTS idx_dp_status          ON delivery_partners(status);
CREATE INDEX IF NOT EXISTS idx_dp_county          ON delivery_partners(county);
CREATE INDEX IF NOT EXISTS idx_dp_partner_type    ON delivery_partners(partner_type);
CREATE INDEX IF NOT EXISTS idx_dp_vehicle_type    ON delivery_partners(vehicle_type);
CREATE INDEX IF NOT EXISTS idx_dp_reg_paid        ON delivery_partners(registration_paid);

-- ── Row Level Security ───────────────────────────────────────────────
ALTER TABLE delivery_partners ENABLE ROW LEVEL SECURITY;

-- Anyone (anon or authenticated) can insert a new application
DROP POLICY IF EXISTS "dp_allow_anon_insert" ON delivery_partners;
CREATE POLICY "dp_allow_anon_insert" ON delivery_partners
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

-- Allow reading own record by phone or application code
DROP POLICY IF EXISTS "dp_allow_read_own" ON delivery_partners;
CREATE POLICY "dp_allow_read_own" ON delivery_partners
    FOR SELECT TO anon, authenticated
    USING (true);   -- tighten post-launch: USING (phone = current_setting('app.current_phone', true))

-- Service role has full access
DROP POLICY IF EXISTS "dp_service_role_all" ON delivery_partners;
CREATE POLICY "dp_service_role_all" ON delivery_partners
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- ── Auto-update updated_at ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_delivery_partners_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dp_updated_at ON delivery_partners;
CREATE TRIGGER trg_dp_updated_at
    BEFORE UPDATE ON delivery_partners
    FOR EACH ROW EXECUTE FUNCTION update_delivery_partners_updated_at();

-- ── Application Code Generator (fallback RPC) ────────────────────────
-- Called from JS when generate_delivery_partner_code RPC doesn't exist yet.
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

-- Ensure columns exist if table was already created in prior run
ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS gender_other TEXT;
ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS business_type_other TEXT;
ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS agreement_accepted BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS agreement_accepted_at TIMESTAMPTZ DEFAULT now();
