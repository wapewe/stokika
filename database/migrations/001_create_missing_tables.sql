-- ===============================================
-- Stokika Missing Tables Migration
-- Creates all tables expected by the admin dashboard
-- Generated based on code analysis
-- ===============================================

-- ===============================================
-- DELIVERIES TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS public.deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_code TEXT UNIQUE NOT NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES public.vendors(id),
    agent_id UUID REFERENCES public.field_agents(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled')),
    delivery_address TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    recipient_phone TEXT NOT NULL,
    pickup_location TEXT,
    gps_latitude DECIMAL(10, 8),
    gps_longitude DECIMAL(11, 8),
    estimated_delivery TIMESTAMP WITH TIME ZONE,
    actual_delivery TIMESTAMP WITH TIME ZONE,
    delivery_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON public.deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_agent ON public.deliveries(agent_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_tracking ON public.deliveries(tracking_code);

-- RLS Policies for deliveries
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view all deliveries" ON public.deliveries
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );

CREATE POLICY "Field agents can view assigned deliveries" ON public.deliveries
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.field_agents
            WHERE field_agents.user_id = auth.uid() AND field_agents.id = deliveries.agent_id
        )
    );

CREATE POLICY "Admin can insert deliveries" ON public.deliveries
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );

CREATE POLICY "Admin and agents can update deliveries" ON public.deliveries
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND (users.role = 'admin' OR 
                EXISTS (SELECT 1 FROM public.field_agents WHERE field_agents.user_id = auth.uid() AND field_agents.id = deliveries.agent_id))
        )
    );

-- ===============================================
-- SMS LOGS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS public.sms_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_phone TEXT NOT NULL,
    message_text TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'scheduled')),
    provider TEXT DEFAULT 'africas_talking',
    cost DECIMAL(10, 2) DEFAULT 2.00,
    scheduled_time TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON public.sms_logs(status);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created ON public.sms_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_logs_recipient ON public.sms_logs(recipient_phone);

-- RLS Policies
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view all SMS logs" ON public.sms_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );

CREATE POLICY "Admin can insert SMS logs" ON public.sms_logs
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );

-- ===============================================
-- SMS TEMPLATES TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS public.sms_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    template_text TEXT NOT NULL,
    variables TEXT[], -- Array of variable names like {{name}}, {{order_id}}
    category TEXT, -- e.g., 'order_confirmation', 'delivery_update', 'marketing'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage SMS templates" ON public.sms_templates
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );

-- ===============================================
-- CONVERSATIONS TABLE (In-App Messaging)
-- ===============================================
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    participant2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_message_preview TEXT,
    unread_count_p1 INTEGER DEFAULT 0,
    unread_count_p2 INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(participant1_id, participant2_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_p1 ON public.conversations(participant1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_p2 ON public.conversations(participant2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON public.conversations(last_message_at DESC);

-- RLS Policies
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their conversations" ON public.conversations
    FOR SELECT TO authenticated
    USING (
        auth.uid() = participant1_id OR auth.uid() = participant2_id OR
        EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
    );

CREATE POLICY "Users can create conversations" ON public.conversations
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = participant1_id OR auth.uid() = participant2_id);

-- ===============================================
-- MESSAGES TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    attachment_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at DESC);

-- RLS Policies
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their conversations" ON public.messages
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations
            WHERE conversations.id = messages.conversation_id
            AND (conversations.participant1_id = auth.uid() OR conversations.participant2_id = auth.uid())
        )
    );

CREATE POLICY "Users can send messages" ON public.messages
    FOR INSERT TO authenticated
    WITH CHECK (sender_id = auth.uid());

-- ===============================================
-- GEOFENCES TABLE (GPS Tracking)
-- ===============================================
CREATE TABLE IF NOT EXISTS public.geofences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    radius_meters INTEGER NOT NULL DEFAULT 100,
    geofence_type TEXT CHECK (geofence_type IN ('territory', 'vendor', 'warehouse', 'restricted')),
    assigned_agent_id UUID REFERENCES public.field_agents(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_geofences_agent ON public.geofences(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_geofences_type ON public.geofences(geofence_type);

-- RLS Policies
ALTER TABLE public.geofences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage geofences" ON public.geofences
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );

CREATE POLICY "Agents can view their geofences" ON public.geofences
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.field_agents
            WHERE field_agents.user_id = auth.uid() AND field_agents.id = geofences.assigned_agent_id
        )
    );

-- ===============================================
-- VENDOR VISITS TABLE (Field Agent Activity)
-- ===============================================
CREATE TABLE IF NOT EXISTS public.vendor_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.field_agents(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    visit_type TEXT CHECK (visit_type IN ('routine', 'order_delivery', 'problem_solving', 'onboarding', 'follow_up')),
    check_in_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    check_out_time TIMESTAMP WITH TIME ZONE,
    gps_latitude DECIMAL(10, 8),
    gps_longitude DECIMAL(11, 8),
    visit_notes TEXT,
    outcome TEXT,
    photos TEXT[], -- Array of photo URLs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vendor_visits_agent ON public.vendor_visits(agent_id);
CREATE INDEX IF NOT EXISTS idx_vendor_visits_vendor ON public.vendor_visits(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_visits_checkin ON public.vendor_visits(check_in_time DESC);

-- RLS Policies
ALTER TABLE public.vendor_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view all visits" ON public.vendor_visits
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );

CREATE POLICY "Agents can view their visits" ON public.vendor_visits
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.field_agents
            WHERE field_agents.user_id = auth.uid() AND field_agents.id = vendor_visits.agent_id
        )
    );

CREATE POLICY "Agents can insert their visits" ON public.vendor_visits
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.field_agents
            WHERE field_agents.user_id = auth.uid() AND field_agents.id = vendor_visits.agent_id
        )
    );

-- ===============================================
-- PRODUCT CATEGORIES TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS public.product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    parent_category_id UUID REFERENCES public.product_categories(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    icon_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_product_categories_parent ON public.product_categories(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_order ON public.product_categories(display_order);

-- RLS Policies
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active categories" ON public.product_categories
    FOR SELECT TO authenticated
    USING (is_active = true);

CREATE POLICY "Admin can manage categories" ON public.product_categories
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );

-- ===============================================
-- PRODUCTS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category_id UUID REFERENCES public.product_categories(id),
    supplier_id UUID REFERENCES public.suppliers(id),
    sku TEXT UNIQUE,
    barcode TEXT,
    unit_price DECIMAL(10, 2) NOT NULL,
    wholesale_price DECIMAL(10, 2),
    stock_quantity INTEGER DEFAULT 0,
    min_order_quantity INTEGER DEFAULT 1,
    unit_of_measure TEXT, -- 'kg', 'liters', 'pieces', etc.
    image_urls TEXT[],
    is_active BOOLEAN DEFAULT true,
    featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON public.products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(is_active);

-- RLS Policies
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active products" ON public.products
    FOR SELECT TO authenticated
    USING (is_active = true);

CREATE POLICY "Admin can manage products" ON public.products
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );

CREATE POLICY "Suppliers can manage their products" ON public.products
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.suppliers
            WHERE suppliers.user_id = auth.uid() AND suppliers.id = products.supplier_id
        )
    );

-- ===============================================
-- AUDIT LOGS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- RLS Policies
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view all audit logs" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );

CREATE POLICY "System can insert audit logs" ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- ===============================================
-- INVENTORY TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_value DECIMAL(10, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    last_restocked TIMESTAMP WITH TIME ZONE,
    low_stock_threshold INTEGER DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inventory_vendor ON public.inventory(vendor_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON public.inventory(product_id);

-- RLS Policies
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors can view their inventory" ON public.inventory
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.vendors
            WHERE vendors.user_id = auth.uid() AND vendors.id = inventory.vendor_id
        )
    );

CREATE POLICY "Vendors can manage their inventory" ON public.inventory
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.vendors
            WHERE vendors.user_id = auth.uid() AND vendors.id = inventory.vendor_id
        )
    );

CREATE POLICY "Admin can view all inventory" ON public.inventory
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );

-- ===============================================
-- Insert default SMS templates
-- ===============================================
INSERT INTO public.sms_templates (name, template_text, variables, category) VALUES
    ('Order Confirmation', 'Hi {{name}}, your order #{{order_id}} has been confirmed. Total: KES {{amount}}. Track at stokika.com', ARRAY['name', 'order_id', 'amount'], 'order_confirmation'),
    ('Delivery Update', 'Your order #{{order_id}} is {{status}}. Tracking: {{tracking_code}}', ARRAY['order_id', 'status', 'tracking_code'], 'delivery_update'),
    ('Welcome Message', 'Welcome to Stokika, {{name}}! Your account is now active. Visit stokika.com to get started.', ARRAY['name'], 'welcome'),
    ('Payment Reminder', 'Reminder: Payment of KES {{amount}} for order #{{order_id}} is due. Pay via M-Pesa Paybill {{paybill}}.', ARRAY['amount', 'order_id', 'paybill'], 'payment_reminder')
ON CONFLICT (name) DO NOTHING;

-- ===============================================
-- Insert default product categories
-- ===============================================
INSERT INTO public.product_categories (name, description, display_order) VALUES
    ('Groceries', 'Essential grocery items', 1),
    ('Beverages', 'Drinks and refreshments', 2),
    ('Personal Care', 'Personal hygiene products', 3),
    ('Household', 'Cleaning and household items', 4),
    ('Electronics', 'Electronic goods and accessories', 5)
ON CONFLICT (name) DO NOTHING;

-- ===============================================
-- COMPLETE
-- ===============================================
COMMENT ON TABLE public.deliveries IS 'Delivery tracking with GPS integration';
COMMENT ON TABLE public.sms_logs IS 'SMS notification history';
COMMENT ON TABLE public.sms_templates IS 'Reusable SMS message templates';
COMMENT ON TABLE public.conversations IS 'In-app messaging conversations';
COMMENT ON TABLE public.messages IS 'Individual messages within conversations';
COMMENT ON TABLE public.geofences IS 'GPS-based territory boundaries';
COMMENT ON TABLE public.vendor_visits IS 'Field agent visit logs';
COMMENT ON TABLE public.product_categories IS 'Product categorization hierarchy';
COMMENT ON TABLE public.products IS 'Product catalog';
COMMENT ON TABLE public.audit_logs IS 'System activity audit trail';
COMMENT ON TABLE public.inventory IS 'Vendor inventory management';
