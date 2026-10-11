-- Migration: Create Identity and Access Tables
-- Description: Creates user_roles and profiles tables for user authentication and authorization
-- Requirements: 2.1, 2.9, 2.11, 24.1-24.4

-- ============================================================================
-- User Roles Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name TEXT UNIQUE NOT NULL CHECK (role_name IN (
        'vendor', 'supplier', 'field_agent', 'supervisor',
        'operations', 'finance', 'admin', 'super_admin'
    )),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for user_roles
CREATE INDEX IF NOT EXISTS idx_user_roles_role_name ON user_roles(role_name);

-- ============================================================================
-- User Profiles Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone_number TEXT NOT NULL CHECK (phone_number ~ '^254[0-9]{9}$'),
    role_id UUID NOT NULL REFERENCES user_roles(id),
    is_active BOOLEAN NOT NULL DEFAULT true,
    email_verified BOOLEAN NOT NULL DEFAULT false,
    phone_verified BOOLEAN NOT NULL DEFAULT false,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone_number);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);

-- ============================================================================
-- Triggers
-- ============================================================================

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $func$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

-- Apply trigger to profiles table
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Seed Default Roles
-- ============================================================================

INSERT INTO user_roles (role_name, description) VALUES
    ('vendor', 'Retail business requesting stock from suppliers'),
    ('supplier', 'Product provider fulfilling stock orders'),
    ('field_agent', 'Platform representative onboarding vendors'),
    ('supervisor', 'Platform representative managing field agents'),
    ('operations', 'Platform staff managing business operations'),
    ('finance', 'Platform staff handling financial operations'),
    ('admin', 'Platform administrator with elevated privileges'),
    ('super_admin', 'Platform super administrator with full system access')
ON CONFLICT (role_name) DO NOTHING;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE user_roles IS 'Defines available user roles in the system';
COMMENT ON TABLE profiles IS 'User profiles linked to authentication with role-based access';
COMMENT ON COLUMN profiles.phone_number IS 'Kenyan phone number in format 254XXXXXXXXX';
COMMENT ON COLUMN profiles.is_active IS 'Whether the user account is active';
COMMENT ON COLUMN profiles.email_verified IS 'Whether the email has been verified';
COMMENT ON COLUMN profiles.phone_verified IS 'Whether the phone number has been verified';