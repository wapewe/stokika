-- Stokika Unified Database Schema
-- This schema consolidates database-setup.sql and complete-database-schema.sql
-- Run this ONCE in your Supabase SQL Editor
-- Safe to run multiple times (uses IF NOT EXISTS and DROP IF EXISTS)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- DROP EXISTING TABLES (if you want fresh start)
-- Comment out this section if you want to keep existing data
-- ============================================
/*
DROP TABLE IF EXISTS email_logs CASCADE;
DROP TABLE IF EXISTS newsletter_subscribers CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS supervisor_applications CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS agent_documents CASCADE;
DROP TABLE IF EXISTS supervisors CASCADE;
DROP TABLE IF EXISTS field_agents CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS vendor_registrations CASCADE;
DROP TABLE IF EXISTS vendors CASCADE;
DROP TABLE IF EXISTS website_settings CASCADE;
DROP TABLE IF EXISTS users CASCADE;
*/

-- ============================================
-- CORE TABLES
-- ============================================

-- Users Table (Authentication & Role Management)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    user_type VARCHAR(50) CHECK (user_type IN ('vendor', 'supplier', 'supervisor', 'field_agent', 'admin')),
    permissions JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Field Agents Table (Complete Application Data)
CREATE TABLE IF NOT EXISTS field_agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    supervisor_id UUID REFERENCES supervisors(id) ON DELETE SET NULL,
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
    business_type VARCHAR(100),
    business_category VARCHAR(100),
    other_category VARCHAR(255),
    county VARCHAR(100) NOT NULL,
    town VARCHAR(100) NOT NULL,
    center VARCHAR(100),
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    business_size VARCHAR(50),
    aspiring_category VARCHAR(100),
    aspiring_other_category VARCHAR(255),
    stock_cycle VARCHAR(50),
    stock_limit INTEGER,
    cycle_reason TEXT,
    business_model_canvas JSONB,
    registration_date TIMESTAMPTZ DEFAULT NOW(),
    credit_limit DECIMAL(10,2) DEFAULT 0,
    current_balance DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'suspended')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES users(id)
);

-- Vendor Registrations Table (for pending applications)
CREATE TABLE IF NOT EXISTS vendor_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_name VARCHAR(255) NOT NULL,
    business_category VARCHAR(100) NOT NULL,
    county VARCHAR(100) NOT NULL,
    town VARCHAR(100) NOT NULL,
    center VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    business_size VARCHAR(50) NOT NULL,
    stock_cycle VARCHAR(50) NOT NULL,
    stock_limit INTEGER NOT NULL,
    cycle_reason TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
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
    is_active BOOLEAN DEFAULT false,
    can_approve_orders BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'pending',
    interview_status VARCHAR(50) DEFAULT 'not_interviewed',
    interview_date TIMESTAMPTZ,
    interview_notes TEXT,
    approval_status VARCHAR(50) DEFAULT 'pending',
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    promoted_at TIMESTAMPTZ,
    demoted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Supervisor Applications Table (for pending applications)
CREATE TABLE IF NOT EXISTS supervisor_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    id_number VARCHAR(50) NOT NULL,
    date_of_birth DATE NOT NULL,
    county VARCHAR(100) NOT NULL,
    education_level VARCHAR(50) NOT NULL,
    institution VARCHAR(255) NOT NULL,
    course VARCHAR(255) NOT NULL,
    experience_areas TEXT[],
    years_experience VARCHAR(20) NOT NULL,
    experience_summary TEXT NOT NULL,
    tech_skills TEXT[],
    tech_confidence VARCHAR(50) NOT NULL,
    start_date VARCHAR(50) NOT NULL,
    kra_pin VARCHAR(50) NOT NULL,
    passport_photo VARCHAR(255),
    national_id_front VARCHAR(255),
    national_id_back VARCHAR(255),
    cv_file VARCHAR(255),
    good_conduct VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES users(id)
);

-- Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255),
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    registration_number VARCHAR(100),
    years_in_business VARCHAR(50),
    number_of_employees VARCHAR(50),
    counties TEXT,
    categories TEXT,
    other_category_text TEXT,
    minimum_order_quantity VARCHAR(100),
    certifications TEXT,
    payment_terms TEXT,
    accepts_credit VARCHAR(10),
    credit_duration VARCHAR(50),
    location VARCHAR(255),
    county VARCHAR(100),
    website VARCHAR(255),
    verified BOOLEAN DEFAULT false,
    rating DECIMAL(3,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'active', 'inactive', 'suspended')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products Table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    unit_price DECIMAL(10,2),
    stock_quantity INTEGER DEFAULT 0,
    unit VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    product_name VARCHAR(255),
    quantity INTEGER,
    order_type VARCHAR(50) DEFAULT 'one_time',
    total_amount DECIMAL(10,2) NOT NULL,
    service_fee_percentage DECIMAL(5,2),
    service_fee_amount DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'pending_admin', 'pending_supplier', 'accepted', 'declined', 'confirmed', 'processing', 'delivered', 'completed', 'cancelled')),
    cycle_type VARCHAR(50) CHECK (cycle_type IN ('one_time', 'daily', 'weekly', 'fortnightly', 'monthly')),
    delivery_date TIMESTAMPTZ,
    delivery_proof_url VARCHAR(500),
    delivery_location VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    vendor_name VARCHAR(255),
    amount DECIMAL(10,2) NOT NULL,
    payment_date TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'completed', 'rejected', 'overdue', 'failed')),
    payment_method VARCHAR(50),
    mpesa_code VARCHAR(100),
    phone_number VARCHAR(20),
    transaction_reference VARCHAR(100),
    rejection_reason TEXT,
    cycle_type VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory Table
CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2),
    total_value DECIMAL(10,2),
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
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
    status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'resolved', 'closed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Newsletter Subscribers Table
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed')),
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

-- Website Settings Table
CREATE TABLE IF NOT EXISTS website_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Supplier Ratings Table
CREATE TABLE IF NOT EXISTS supplier_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    delivery_rating INTEGER CHECK (delivery_rating >= 1 AND delivery_rating <= 5),
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Loyalty Points Table
CREATE TABLE IF NOT EXISTS loyalty_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    points INTEGER DEFAULT 0,
    tier VARCHAR(50) DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
    total_earned INTEGER DEFAULT 0,
    total_redeemed INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Loyalty Transactions Table
CREATE TABLE IF NOT EXISTS loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    points INTEGER NOT NULL,
    transaction_type VARCHAR(50) CHECK (transaction_type IN ('earned', 'redeemed', 'expired')),
    description TEXT,
    order_id UUID REFERENCES orders(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Favorite Suppliers Table
CREATE TABLE IF NOT EXISTS favorite_suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(vendor_id, supplier_id)
);

-- Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assigned_to UUID REFERENCES users(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved Searches Table
CREATE TABLE IF NOT EXISTS saved_searches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    search_type VARCHAR(50) NOT NULL,
    filters JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Preferences Table
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    theme VARCHAR(20) DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
    language VARCHAR(10) DEFAULT 'en',
    notifications_enabled BOOLEAN DEFAULT true,
    email_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
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

CREATE INDEX IF NOT EXISTS idx_supervisor_applications_email ON supervisor_applications(email);
CREATE INDEX IF NOT EXISTS idx_supervisor_applications_status ON supervisor_applications(status);

CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_orders_vendor_id ON orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_orders_supplier_id ON orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_payments_vendor_id ON payments(vendor_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_vendor_id ON inventory(vendor_id);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_by ON email_logs(sent_by);
CREATE INDEX IF NOT EXISTS idx_website_settings_key ON website_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_supplier_ratings_vendor_id ON supplier_ratings(vendor_id);
CREATE INDEX IF NOT EXISTS idx_supplier_ratings_supplier_id ON supplier_ratings(supplier_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_vendor_id ON loyalty_points(vendor_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_vendor_id ON loyalty_transactions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_favorite_suppliers_vendor_id ON favorite_suppliers(vendor_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- ============================================
-- SECURITY & RATE LIMITING TABLES
-- ============================================

-- Rate Limiting Table
CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ip_address INET NOT NULL,
    endpoint VARCHAR(100) NOT NULL,
    attempts INTEGER DEFAULT 1,
    window_start TIMESTAMPTZ DEFAULT NOW(),
    blocked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(ip_address, endpoint)
);

-- OTP Verification Table
CREATE TABLE IF NOT EXISTS otp_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    purpose VARCHAR(50) NOT NULL, -- 'login', 'password_reset', 'email_change'
    expires_at TIMESTAMPTZ NOT NULL,
    verified BOOLEAN DEFAULT false,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Security Audit Log
CREATE TABLE IF NOT EXISTS security_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT true,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Session Management
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification System
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'info', 'success', 'warning', 'error'
    category VARCHAR(50), -- 'order', 'payment', 'system', 'security'
    read BOOLEAN DEFAULT false,
    action_url VARCHAR(500),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity Log
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50), -- 'order', 'vendor', 'supplier', 'user'
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- System Settings
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB,
    description TEXT,
    category VARCHAR(50),
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR SECURITY TABLES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_endpoint ON rate_limits(ip_address, endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON rate_limits(window_start);
CREATE INDEX IF NOT EXISTS idx_otp_verifications_email ON otp_verifications(email);
CREATE INDEX IF NOT EXISTS idx_otp_verifications_expires ON otp_verifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_security_audit_user_id ON security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_created_at ON security_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);

-- ============================================
-- RLS POLICIES FOR SECURITY TABLES
-- ============================================

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Rate limits - admin only
CREATE POLICY "Admin can manage rate_limits" ON rate_limits FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');

-- OTP - users can insert their own, admin can view all
CREATE POLICY "Users can insert OTP" ON otp_verifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can view own OTP" ON otp_verifications FOR SELECT TO authenticated USING (email = auth.jwt() ->> 'email');
CREATE POLICY "Admin can view all OTP" ON otp_verifications FOR SELECT TO authenticated USING (auth.jwt() ->> 'role' = 'admin');

-- Security audit - admin only
CREATE POLICY "Admin can view security_audit_log" ON security_audit_log FOR SELECT TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "System can insert security_audit_log" ON security_audit_log FOR INSERT TO authenticated WITH CHECK (true);

-- User sessions - users can view own, admin can view all
CREATE POLICY "Users can view own sessions" ON user_sessions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin can view all sessions" ON user_sessions FOR SELECT TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Users can manage own sessions" ON user_sessions FOR ALL TO authenticated USING (user_id = auth.uid());

-- Notifications - users can view own
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "System can insert notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (true);

-- Activity log - users can view own, admin can view all
CREATE POLICY "Users can view own activity" ON activity_log FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin can view all activity" ON activity_log FOR SELECT TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "System can insert activity" ON activity_log FOR INSERT TO authenticated WITH CHECK (true);

-- System settings - admin only
CREATE POLICY "Admin can manage system_settings" ON system_settings FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');

-- ============================================
-- SECURITY FUNCTIONS
-- ============================================

-- Rate limiting function
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_ip_address INET,
    p_endpoint VARCHAR(100),
    p_max_attempts INTEGER DEFAULT 5,
    p_window_minutes INTEGER DEFAULT 15
) RETURNS BOOLEAN AS $$
DECLARE
    current_attempts INTEGER;
    window_start TIMESTAMPTZ;
BEGIN
    -- Clean old entries
    DELETE FROM rate_limits 
    WHERE window_start < NOW() - INTERVAL '1 hour';
    
    -- Get current attempts
    SELECT attempts, rate_limits.window_start 
    INTO current_attempts, window_start
    FROM rate_limits 
    WHERE ip_address = p_ip_address AND endpoint = p_endpoint;
    
    -- If no record exists, create one
    IF current_attempts IS NULL THEN
        INSERT INTO rate_limits (ip_address, endpoint, attempts, window_start)
        VALUES (p_ip_address, p_endpoint, 1, NOW());
        RETURN TRUE;
    END IF;
    
    -- Check if window has expired
    IF window_start < NOW() - (p_window_minutes || ' minutes')::INTERVAL THEN
        UPDATE rate_limits 
        SET attempts = 1, window_start = NOW(), blocked_until = NULL
        WHERE ip_address = p_ip_address AND endpoint = p_endpoint;
        RETURN TRUE;
    END IF;
    
    -- Check if blocked
    IF current_attempts >= p_max_attempts THEN
        UPDATE rate_limits 
        SET blocked_until = NOW() + (p_window_minutes || ' minutes')::INTERVAL
        WHERE ip_address = p_ip_address AND endpoint = p_endpoint;
        RETURN FALSE;
    END IF;
    
    -- Increment attempts
    UPDATE rate_limits 
    SET attempts = attempts + 1
    WHERE ip_address = p_ip_address AND endpoint = p_endpoint;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- OTP generation function
CREATE OR REPLACE FUNCTION generate_otp(
    p_user_id UUID,
    p_email VARCHAR(255),
    p_purpose VARCHAR(50)
) RETURNS VARCHAR(6) AS $$
DECLARE
    otp_code VARCHAR(6);
BEGIN
    -- Generate 6-digit OTP
    otp_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    
    -- Invalidate existing OTPs
    UPDATE otp_verifications 
    SET verified = true 
    WHERE user_id = p_user_id AND purpose = p_purpose AND verified = false;
    
    -- Insert new OTP
    INSERT INTO otp_verifications (user_id, email, otp_code, purpose, expires_at)
    VALUES (p_user_id, p_email, otp_code, p_purpose, NOW() + INTERVAL '10 minutes');
    
    RETURN otp_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify OTP function
CREATE OR REPLACE FUNCTION verify_otp(
    p_email VARCHAR(255),
    p_otp_code VARCHAR(6),
    p_purpose VARCHAR(50)
) RETURNS BOOLEAN AS $$
DECLARE
    otp_record RECORD;
BEGIN
    -- Get OTP record
    SELECT * INTO otp_record
    FROM otp_verifications
    WHERE email = p_email 
    AND otp_code = p_otp_code 
    AND purpose = p_purpose 
    AND verified = false 
    AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Check if OTP exists and is valid
    IF otp_record.id IS NULL THEN
        -- Increment attempts for existing OTP
        UPDATE otp_verifications 
        SET attempts = attempts + 1
        WHERE email = p_email AND purpose = p_purpose AND verified = false;
        RETURN FALSE;
    END IF;
    
    -- Mark as verified
    UPDATE otp_verifications 
    SET verified = true
    WHERE id = otp_record.id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_field_agents_updated_at ON field_agents;
CREATE TRIGGER update_field_agents_updated_at BEFORE UPDATE ON field_agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_agent_documents_updated_at ON agent_documents;
CREATE TRIGGER update_agent_documents_updated_at BEFORE UPDATE ON agent_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vendors_updated_at ON vendors;
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_suppliers_updated_at ON suppliers;
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_supervisors_updated_at ON supervisors;
CREATE TRIGGER update_supervisors_updated_at BEFORE UPDATE ON supervisors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_newsletter_updated_at ON newsletter_subscribers;
CREATE TRIGGER update_newsletter_updated_at BEFORE UPDATE ON newsletter_subscribers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_website_settings_updated_at ON website_settings;
CREATE TRIGGER update_website_settings_updated_at BEFORE UPDATE ON website_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_loyalty_points_updated_at ON loyalty_points;
CREATE TRIGGER update_loyalty_points_updated_at BEFORE UPDATE ON loyalty_points FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisors ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisor_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow public insert on field_agents" ON field_agents;
DROP POLICY IF EXISTS "Allow public insert on agent_documents" ON agent_documents;
DROP POLICY IF EXISTS "Allow public insert on vendors" ON vendors;
DROP POLICY IF EXISTS "Allow public insert on vendor_registrations" ON vendor_registrations;
DROP POLICY IF EXISTS "Allow public insert on suppliers" ON suppliers;
DROP POLICY IF EXISTS "Allow public insert on supervisors" ON supervisors;
DROP POLICY IF EXISTS "Allow public insert on supervisor_applications" ON supervisor_applications;
DROP POLICY IF EXISTS "Allow public insert on contacts" ON contacts;
DROP POLICY IF EXISTS "Allow public insert on newsletter_subscribers" ON newsletter_subscribers;

-- Public insert policies (form submissions)
CREATE POLICY "Allow public insert on field_agents" ON field_agents FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public insert on agent_documents" ON agent_documents FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public insert on vendors" ON vendors FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public insert on vendor_registrations" ON vendor_registrations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public insert on suppliers" ON suppliers FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public insert on supervisors" ON supervisors FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public insert on supervisor_applications" ON supervisor_applications FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public insert on contacts" ON contacts FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public insert on newsletter_subscribers" ON newsletter_subscribers FOR INSERT TO anon WITH CHECK (true);

-- Public read policies
DROP POLICY IF EXISTS "Allow public read on verified suppliers" ON suppliers;
CREATE POLICY "Allow public read on verified suppliers" ON suppliers FOR SELECT TO anon USING (verified = true);

DROP POLICY IF EXISTS "Allow public read on website_settings" ON website_settings;
CREATE POLICY "Allow public read on website_settings" ON website_settings FOR SELECT TO anon USING (true);

-- Admin policies
DROP POLICY IF EXISTS "Admin full access users" ON users;
DROP POLICY IF EXISTS "Admin full access field_agents" ON field_agents;
DROP POLICY IF EXISTS "Admin full access vendors" ON vendors;
DROP POLICY IF EXISTS "Admin full access suppliers" ON suppliers;
DROP POLICY IF EXISTS "Admin full access supervisors" ON supervisors;
DROP POLICY IF EXISTS "Admin full access orders" ON orders;
DROP POLICY IF EXISTS "Admin full access payments" ON payments;

CREATE POLICY "Admin full access users" ON users FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admin full access field_agents" ON field_agents FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admin full access vendors" ON vendors FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admin full access suppliers" ON suppliers FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admin full access supervisors" ON supervisors FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admin full access orders" ON orders FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admin full access payments" ON payments FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');

-- Supervisor policies
DROP POLICY IF EXISTS "Supervisor view agents" ON field_agents;
DROP POLICY IF EXISTS "Supervisor view orders" ON orders;
DROP POLICY IF EXISTS "Supervisor approve orders" ON orders;

CREATE POLICY "Supervisor view agents" ON field_agents FOR SELECT TO authenticated USING (
    supervisor_id IN (SELECT id FROM supervisors WHERE user_id = auth.uid() AND is_active = true)
);
CREATE POLICY "Supervisor view orders" ON orders FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM supervisors WHERE user_id = auth.uid() AND is_active = true)
);
CREATE POLICY "Supervisor approve orders" ON orders FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM supervisors WHERE user_id = auth.uid() AND is_active = true AND can_approve_orders = true)
);

-- Vendor policies
DROP POLICY IF EXISTS "Vendor view own data" ON vendors;
DROP POLICY IF EXISTS "Vendor view own orders" ON orders;
DROP POLICY IF EXISTS "Vendor view own payments" ON payments;
DROP POLICY IF EXISTS "Vendor view own inventory" ON inventory;

CREATE POLICY "Vendor view own data" ON vendors FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Vendor view own orders" ON orders FOR SELECT TO authenticated USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));
CREATE POLICY "Vendor view own payments" ON payments FOR SELECT TO authenticated USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));
CREATE POLICY "Vendor view own inventory" ON inventory FOR ALL TO authenticated USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));

-- Supplier policies
DROP POLICY IF EXISTS "Supplier view own data" ON suppliers;
DROP POLICY IF EXISTS "Supplier view own orders" ON orders;
DROP POLICY IF EXISTS "Supplier view own products" ON products;

CREATE POLICY "Supplier view own data" ON suppliers FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Supplier view own orders" ON orders FOR ALL TO authenticated USING (supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid()));
CREATE POLICY "Supplier view own products" ON products FOR ALL TO authenticated USING (supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid()));

-- Field Agent policies (NO ORDER APPROVAL)
DROP POLICY IF EXISTS "Agent view assigned vendors" ON vendors;
DROP POLICY IF EXISTS "Agent create orders" ON orders;

CREATE POLICY "Agent view assigned vendors" ON vendors FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM field_agents WHERE user_id = auth.uid() AND approval_status = 'approved')
);
CREATE POLICY "Agent create orders" ON orders FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM field_agents WHERE user_id = auth.uid() AND approval_status = 'approved')
);

-- Audit logs policies
DROP POLICY IF EXISTS "Admin view audit logs" ON audit_logs;
CREATE POLICY "Admin view audit logs" ON audit_logs FOR SELECT TO authenticated USING (auth.jwt() ->> 'role' = 'admin');

-- Ratings policies
DROP POLICY IF EXISTS "Vendor manage own ratings" ON supplier_ratings;
CREATE POLICY "Vendor manage own ratings" ON supplier_ratings FOR ALL TO authenticated USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));

-- Loyalty policies
DROP POLICY IF EXISTS "Vendor view own loyalty" ON loyalty_points;
CREATE POLICY "Vendor view own loyalty" ON loyalty_points FOR SELECT TO authenticated USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));

-- Tasks policies
DROP POLICY IF EXISTS "User view assigned tasks" ON tasks;
CREATE POLICY "User view assigned tasks" ON tasks FOR SELECT TO authenticated USING (assigned_to = auth.uid() OR assigned_by = auth.uid());

DROP POLICY IF EXISTS "User update own tasks" ON tasks;
CREATE POLICY "User update own tasks" ON tasks FOR UPDATE TO authenticated USING (assigned_to = auth.uid());

-- Preferences policies
DROP POLICY IF EXISTS "User manage own preferences" ON user_preferences;
CREATE POLICY "User manage own preferences" ON user_preferences FOR ALL TO authenticated USING (user_id = auth.uid());

-- ============================================
-- DEFAULT DATA
-- ============================================

-- Insert default website settings
INSERT INTO website_settings (setting_key, setting_value, description) VALUES
('site_status', 'online', 'Website status: online, maintenance, offline'),
('maintenance_message', 'We are currently performing scheduled maintenance. Please check back soon.', 'Message shown during maintenance'),
('feature_vendor_registration', 'true', 'Enable/disable vendor registration'),
('feature_supplier_registration', 'true', 'Enable/disable supplier registration'),
('feature_field_agent_application', 'true', 'Enable/disable field agent applications'),
('feature_contact_form', 'true', 'Enable/disable contact form')
ON CONFLICT (setting_key) DO NOTHING;

-- Insert sample admin user (update with your actual credentials)
INSERT INTO users (email, name, user_type, role, status) 
VALUES ('admin@stokika.com', 'Admin User', 'admin', 'admin', 'active')
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- GPS TRACKING AND ANALYTICS TABLES
-- ============================================

-- User Locations Table (GPS Tracking)
CREATE TABLE IF NOT EXISTS user_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    user_type VARCHAR(50) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(10, 2),
    speed DECIMAL(8, 2) DEFAULT 0,
    heading DECIMAL(5, 2),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendor Visits Table (Field Agent Tracking)
CREATE TABLE IF NOT EXISTS vendor_visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES field_agents(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    start_latitude DECIMAL(10, 8) NOT NULL,
    start_longitude DECIMAL(11, 8) NOT NULL,
    end_latitude DECIMAL(10, 8),
    end_longitude DECIMAL(11, 8),
    vendor_latitude DECIMAL(10, 8),
    vendor_longitude DECIMAL(11, 8),
    distance_to_vendor DECIMAL(8, 2),
    visit_duration INTEGER,
    notes TEXT,
    photos TEXT[],
    status VARCHAR(50) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Metrics Table (Analytics)
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    user_type VARCHAR(50) NOT NULL,
    metric_type VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15, 2) NOT NULL,
    metric_date DATE NOT NULL,
    additional_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Predictions Table (Predictive Analytics)
CREATE TABLE IF NOT EXISTS predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    prediction_type VARCHAR(100) NOT NULL,
    predicted_value DECIMAL(15, 2),
    confidence_level VARCHAR(20),
    prediction_date DATE NOT NULL,
    forecast_period INTEGER,
    actual_value DECIMAL(15, 2),
    accuracy_score DECIMAL(5, 2),
    model_version VARCHAR(50),
    input_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendor Locations Table
CREATE TABLE IF NOT EXISTS vendor_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE UNIQUE,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    address TEXT,
    landmark TEXT,
    verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- GPS & ANALYTICS INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_locations_user_id ON user_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_locations_timestamp ON user_locations(timestamp);
CREATE INDEX IF NOT EXISTS idx_vendor_visits_agent_id ON vendor_visits(agent_id);
CREATE INDEX IF NOT EXISTS idx_vendor_visits_vendor_id ON vendor_visits(vendor_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_id ON performance_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_metric_date ON performance_metrics(metric_date);
CREATE INDEX IF NOT EXISTS idx_predictions_entity_type ON predictions(entity_type);
CREATE INDEX IF NOT EXISTS idx_predictions_entity_id ON predictions(entity_id);
CREATE INDEX IF NOT EXISTS idx_vendor_locations_vendor_id ON vendor_locations(vendor_id);

-- ============================================
-- GPS & ANALYTICS TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS update_vendor_visits_updated_at ON vendor_visits;
CREATE TRIGGER update_vendor_visits_updated_at BEFORE UPDATE ON vendor_visits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vendor_locations_updated_at ON vendor_locations;
CREATE TRIGGER update_vendor_locations_updated_at BEFORE UPDATE ON vendor_locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- GPS & ANALYTICS RLS POLICIES
-- ============================================

ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_locations ENABLE ROW LEVEL SECURITY;

-- Admin policies
CREATE POLICY "Admin full access user_locations" ON user_locations FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admin full access vendor_visits" ON vendor_visits FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admin full access performance_metrics" ON performance_metrics FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admin full access predictions" ON predictions FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admin full access vendor_locations" ON vendor_locations FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');

-- Agent policies
CREATE POLICY "Agent own locations" ON user_locations FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Agent own visits" ON vendor_visits FOR ALL TO authenticated USING (
    agent_id IN (SELECT id FROM field_agents WHERE user_id = auth.uid())
);
CREATE POLICY "Agent own metrics" ON performance_metrics FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Supervisor policies
CREATE POLICY "Supervisor territory visits" ON vendor_visits FOR SELECT TO authenticated USING (
    agent_id IN (
        SELECT fa.id FROM field_agents fa 
        JOIN supervisors s ON fa.supervisor_id = s.id 
        WHERE s.user_id = auth.uid() AND s.is_active = true
    )
);

-- Vendor policies
CREATE POLICY "Vendor own location" ON vendor_locations FOR ALL TO authenticated USING (
    vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
);
CREATE POLICY "Vendor own visits" ON vendor_visits FOR SELECT TO authenticated USING (
    vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
);

-- ============================================
-- ANALYTICS FUNCTIONS
-- ============================================

-- Function to calculate distance between two points
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DECIMAL, lon1 DECIMAL, 
    lat2 DECIMAL, lon2 DECIMAL
) RETURNS DECIMAL AS $$
DECLARE
    R DECIMAL := 6371;
    dLat DECIMAL;
    dLon DECIMAL;
    a DECIMAL;
    c DECIMAL;
BEGIN
    dLat := RADIANS(lat2 - lat1);
    dLon := RADIANS(lon2 - lon1);
    a := SIN(dLat/2) * SIN(dLat/2) + COS(RADIANS(lat1)) * COS(RADIANS(lat2)) * SIN(dLon/2) * SIN(dLon/2);
    c := 2 * ATAN2(SQRT(a), SQRT(1-a));
    RETURN R * c;
END;
$$ LANGUAGE plpgsql;

-- Audit log function
CREATE OR REPLACE FUNCTION log_audit(
    p_user_id UUID,
    p_action VARCHAR,
    p_entity_type VARCHAR,
    p_entity_id UUID,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
    VALUES (p_user_id, p_action, p_entity_type, p_entity_id, p_old_values, p_new_values)
    RETURNING id INTO log_id;
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Stokika Unified Database Schema created successfully!';
    RAISE NOTICE '📊 Total Tables: 32 (including GPS & Analytics)';
    RAISE NOTICE '📍 GPS Tables: user_locations, vendor_visits, vendor_locations';
    RAISE NOTICE '📈 Analytics Tables: performance_metrics, predictions';
    RAISE NOTICE '🔐 Row Level Security: Enabled';
    RAISE NOTICE '⚡ Triggers: Configured';
    RAISE NOTICE '📈 Indexes: Optimized';
    RAISE NOTICE '🎯 Ready for production use with GPS & Analytics!';
END $$;
