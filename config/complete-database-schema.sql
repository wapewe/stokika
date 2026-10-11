-- Stokika Complete Database Schema
-- Run this ONCE in your Supabase SQL Editor
-- This consolidates all tables with no duplicates

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Row Level Security
ALTER DATABASE postgres SET row_security = on;

-- ============================================
-- CORE TABLES
-- ============================================

-- Users Table (Admin Authentication & Management)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    user_type VARCHAR(50), -- 'admin', 'field_agent', 'supervisor', 'vendor', 'supplier'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

-- Field Agents Table (Complete Application Data)
CREATE TABLE IF NOT EXISTS field_agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    agent_number VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    id_number VARCHAR(50) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(50),
    gender_other VARCHAR(100),
    county VARCHAR(100) NOT NULL,
    sub_county VARCHAR(100) NOT NULL,
    town VARCHAR(100) NOT NULL,
    ward VARCHAR(100) NOT NULL,
    kin_name VARCHAR(255) NOT NULL,
    kin_relationship VARCHAR(100) NOT NULL,
    kin_phone VARCHAR(20) NOT NULL,
    kin_address TEXT,
    currently_employed VARCHAR(10),
    current_employer VARCHAR(255),
    has_previous_experience VARCHAR(10),
    experience TEXT,
    experience_other VARCHAR(255),
    years_experience VARCHAR(50),
    sme_experience TEXT NOT NULL,
    languages TEXT,
    local_languages TEXT,
    local_market_familiar VARCHAR(10),
    market_areas TEXT,
    owns_smartphone VARCHAR(10),
    phone_brand VARCHAR(100),
    android_version VARCHAR(50),
    can_use_smartphone VARCHAR(10),
    internet_access TEXT,
    start_date VARCHAR(50),
    start_date_other VARCHAR(255),
    weekday_availability VARCHAR(10),
    unavailable_day VARCHAR(50),
    unavailability_reason TEXT,
    working_hours VARCHAR(50),
    expected_income VARCHAR(50),
    income_explanation TEXT,
    has_transport VARCHAR(10),
    transport_type VARCHAR(255),
    referee1_name VARCHAR(255) NOT NULL,
    referee1_phone VARCHAR(20) NOT NULL,
    referee1_relationship VARCHAR(100) NOT NULL,
    referee2_name VARCHAR(255) NOT NULL,
    referee2_phone VARCHAR(20) NOT NULL,
    referee2_relationship VARCHAR(100) NOT NULL,
    criminal_history VARCHAR(10),
    criminal_explanation TEXT,
    code_of_conduct VARCHAR(10),
    training_willingness VARCHAR(10),
    kra_pin VARCHAR(50),
    agreement TEXT,
    application_date TIMESTAMPTZ,
    timezone VARCHAR(50) DEFAULT 'Africa/Nairobi',
    status VARCHAR(50) DEFAULT 'pending',
    interview_status VARCHAR(50) DEFAULT 'not_interviewed',
    interview_date TIMESTAMPTZ,
    interview_notes TEXT,
    approval_status VARCHAR(50) DEFAULT 'pending',
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent Documents Table
CREATE TABLE IF NOT EXISTS agent_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES field_agents(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'uploaded',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendors Table
CREATE TABLE IF NOT EXISTS vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    business_name VARCHAR(255) NOT NULL,
    business_category VARCHAR(100) NOT NULL,
    other_category VARCHAR(255),
    county VARCHAR(100) NOT NULL,
    town VARCHAR(100) NOT NULL,
    center VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    business_size VARCHAR(50) NOT NULL,
    aspiring_category VARCHAR(100),
    aspiring_other_category VARCHAR(255),
    stock_cycle VARCHAR(50) NOT NULL,
    stock_limit INTEGER NOT NULL,
    cycle_reason TEXT NOT NULL,
    business_model_canvas JSONB,
    registration_date TIMESTAMPTZ DEFAULT NOW(),
    credit_limit DECIMAL(10,2) DEFAULT 0,
    current_balance DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES users(id)
);

-- Supervisors Table
CREATE TABLE IF NOT EXISTS supervisors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    supervisor_number VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    id_number VARCHAR(50) NOT NULL,
    county VARCHAR(100) NOT NULL,
    assigned_region TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    interview_status VARCHAR(50) DEFAULT 'not_interviewed',
    interview_date TIMESTAMPTZ,
    interview_notes TEXT,
    approval_status VARCHAR(50) DEFAULT 'pending',
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    registration_number VARCHAR(100),
    years_in_business VARCHAR(50) NOT NULL,
    number_of_employees VARCHAR(50) NOT NULL,
    counties TEXT NOT NULL,
    categories TEXT NOT NULL,
    other_category_text TEXT,
    minimum_order_quantity VARCHAR(100) NOT NULL,
    certifications TEXT,
    payment_terms TEXT NOT NULL,
    accepts_credit VARCHAR(10),
    credit_duration VARCHAR(50),
    location VARCHAR(255),
    website VARCHAR(255),
    verified BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products Table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    unit_price DECIMAL(10,2),
    stock_quantity INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    order_number VARCHAR(50) UNIQUE,
    total_amount DECIMAL(10,2),
    service_fee_percentage DECIMAL(5,2),
    service_fee_amount DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'pending',
    cycle_type VARCHAR(50),
    delivery_date TIMESTAMPTZ,
    delivery_proof_url VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    amount DECIMAL(10,2),
    payment_date TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'pending',
    payment_method VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contacts Table
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    business_type VARCHAR(100),
    other_business_type VARCHAR(255),
    message TEXT NOT NULL,
    user_type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'new',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Newsletter Subscribers Table
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    subscribed_at TIMESTAMPTZ DEFAULT NOW(),
    unsubscribed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email Logs Table
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sent_by UUID REFERENCES users(id),
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    subject VARCHAR(500) NOT NULL,
    message TEXT NOT NULL,
    email_type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'sent',
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);

CREATE INDEX IF NOT EXISTS idx_field_agents_agent_number ON field_agents(agent_number);
CREATE INDEX IF NOT EXISTS idx_field_agents_email ON field_agents(email);
CREATE INDEX IF NOT EXISTS idx_field_agents_phone ON field_agents(phone);
CREATE INDEX IF NOT EXISTS idx_field_agents_status ON field_agents(status);
CREATE INDEX IF NOT EXISTS idx_field_agents_interview_status ON field_agents(interview_status);
CREATE INDEX IF NOT EXISTS idx_field_agents_approval_status ON field_agents(approval_status);
CREATE INDEX IF NOT EXISTS idx_field_agents_county ON field_agents(county);
CREATE INDEX IF NOT EXISTS idx_field_agents_user_id ON field_agents(user_id);

CREATE INDEX IF NOT EXISTS idx_agent_documents_agent_id ON agent_documents(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_documents_type ON agent_documents(document_type);

CREATE INDEX IF NOT EXISTS idx_vendors_email ON vendors(email);
CREATE INDEX IF NOT EXISTS idx_vendors_phone ON vendors(phone);
CREATE INDEX IF NOT EXISTS idx_vendors_status ON vendors(status);
CREATE INDEX IF NOT EXISTS idx_vendors_user_id ON vendors(user_id);

CREATE INDEX IF NOT EXISTS idx_suppliers_email ON suppliers(email);
CREATE INDEX IF NOT EXISTS idx_suppliers_phone ON suppliers(phone);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);
CREATE INDEX IF NOT EXISTS idx_suppliers_user_id ON suppliers(user_id);

CREATE INDEX IF NOT EXISTS idx_supervisors_supervisor_number ON supervisors(supervisor_number);
CREATE INDEX IF NOT EXISTS idx_supervisors_email ON supervisors(email);
CREATE INDEX IF NOT EXISTS idx_supervisors_status ON supervisors(status);
CREATE INDEX IF NOT EXISTS idx_supervisors_interview_status ON supervisors(interview_status);
CREATE INDEX IF NOT EXISTS idx_supervisors_approval_status ON supervisors(approval_status);
CREATE INDEX IF NOT EXISTS idx_supervisors_user_id ON supervisors(user_id);

CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_orders_vendor_id ON orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_payments_vendor_id ON payments(vendor_id);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_by ON email_logs(sent_by);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisors ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Public insert policies (form submissions)
CREATE POLICY "Allow public insert on field_agents" ON field_agents FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public insert on agent_documents" ON agent_documents FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public insert on vendors" ON vendors FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public insert on suppliers" ON suppliers FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public insert on supervisors" ON supervisors FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public insert on contacts" ON contacts FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public insert on newsletter_subscribers" ON newsletter_subscribers FOR INSERT TO anon WITH CHECK (true);

-- Admin policies
CREATE POLICY "Admin can view all users" ON users FOR SELECT TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admin can update users" ON users FOR UPDATE TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admin can delete users" ON users FOR DELETE TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admin can view all field_agents" ON field_agents FOR SELECT TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admin can update field_agents" ON field_agents FOR UPDATE TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admin can view all vendors" ON vendors FOR SELECT TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admin can update vendors" ON vendors FOR UPDATE TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admin can view all suppliers" ON suppliers FOR SELECT TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admin can update suppliers" ON suppliers FOR UPDATE TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admin can view all supervisors" ON supervisors FOR SELECT TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admin can update supervisors" ON supervisors FOR UPDATE TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admin can view all contacts" ON contacts FOR SELECT TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admin can update contacts" ON contacts FOR UPDATE TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admin can insert email_logs" ON email_logs FOR INSERT TO authenticated WITH CHECK (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admin can view email_logs" ON email_logs FOR SELECT TO authenticated USING (auth.jwt() ->> 'role' = 'admin');

-- Public read policies
CREATE POLICY "Allow public read on verified suppliers" ON suppliers FOR SELECT TO anon USING (verified = true);

-- ============================================
-- WEBSITE SETTINGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS website_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO website_settings (setting_key, setting_value, description) VALUES
('site_status', 'online', 'Website status: online, maintenance, offline'),
('maintenance_message', 'We are currently performing scheduled maintenance. Please check back soon.', 'Message shown during maintenance'),
('feature_vendor_registration', 'true', 'Enable/disable vendor registration'),
('feature_supplier_registration', 'true', 'Enable/disable supplier registration'),
('feature_field_agent_application', 'true', 'Enable/disable field agent applications'),
('feature_contact_form', 'true', 'Enable/disable contact form')
ON CONFLICT (setting_key) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_website_settings_key ON website_settings(setting_key);

ALTER TABLE website_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on website_settings" ON website_settings FOR SELECT TO anon USING (true);
CREATE POLICY "Admin can update website_settings" ON website_settings FOR UPDATE TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admin can view website_settings" ON website_settings FOR SELECT TO authenticated USING (auth.jwt() ->> 'role' = 'admin');

CREATE TRIGGER update_website_settings_updated_at BEFORE UPDATE ON website_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_field_agents_updated_at BEFORE UPDATE ON field_agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agent_documents_updated_at BEFORE UPDATE ON agent_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_supervisors_updated_at BEFORE UPDATE ON supervisors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_newsletter_updated_at BEFORE UPDATE ON newsletter_subscribers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
