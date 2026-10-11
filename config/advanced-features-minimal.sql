-- Advanced Features Schema - Minimal Version
-- Only creates tables that don't exist

-- Product Catalog Tables
CREATE TABLE IF NOT EXISTS product_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Delivery Tracking Tables
CREATE TABLE IF NOT EXISTS deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES field_agents(id) ON DELETE SET NULL,
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    delivery_address TEXT NOT NULL,
    delivery_latitude DECIMAL(10, 8),
    delivery_longitude DECIMAL(11, 8),
    pickup_latitude DECIMAL(10, 8),
    pickup_longitude DECIMAL(11, 8),
    estimated_delivery TIMESTAMPTZ,
    actual_delivery TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'pending',
    tracking_code VARCHAR(20) UNIQUE,
    delivery_notes TEXT,
    recipient_name VARCHAR(255),
    recipient_phone VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shopping Cart Tables
CREATE TABLE IF NOT EXISTS shopping_carts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cart_id UUID REFERENCES shopping_carts(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Loyalty Program Tables
CREATE TABLE IF NOT EXISTS loyalty_programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    points_per_ksh DECIMAL(5, 2) DEFAULT 1.0,
    min_redemption_points INTEGER DEFAULT 100,
    redemption_rate DECIMAL(5, 2) DEFAULT 0.01,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SMS Notifications Tables
CREATE TABLE IF NOT EXISTS sms_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    template_text TEXT NOT NULL,
    variables TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sms_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_phone VARCHAR(20) NOT NULL,
    message_text TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    provider_response JSONB,
    cost DECIMAL(8, 4),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- In-App Messaging Tables
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_1 UUID REFERENCES users(id) ON DELETE CASCADE,
    participant_2 UUID REFERENCES users(id) ON DELETE CASCADE,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text',
    attachment_url TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Financial Dashboard Tables
CREATE TABLE IF NOT EXISTS financial_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    summary_date DATE NOT NULL,
    total_revenue DECIMAL(15, 2) DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    total_commissions DECIMAL(15, 2) DEFAULT 0,
    total_expenses DECIMAL(15, 2) DEFAULT 0,
    net_profit DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bulk Operations Tables
CREATE TABLE IF NOT EXISTS bulk_operations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operation_type VARCHAR(50) NOT NULL,
    file_name VARCHAR(255),
    total_records INTEGER DEFAULT 0,
    processed_records INTEGER DEFAULT 0,
    failed_records INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',
    error_log TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_deliveries_order_id ON deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);

-- Enable RLS
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

-- Simple RLS Policies
DROP POLICY IF EXISTS "Admin access deliveries" ON deliveries;
CREATE POLICY "Admin access deliveries" ON deliveries FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');

DROP POLICY IF EXISTS "Admin access shopping_carts" ON shopping_carts;
CREATE POLICY "Admin access shopping_carts" ON shopping_carts FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');

DROP POLICY IF EXISTS "Admin access messages" ON messages;
CREATE POLICY "Admin access messages" ON messages FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');

DROP POLICY IF EXISTS "Public view categories" ON product_categories;
CREATE POLICY "Public view categories" ON product_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin manage categories" ON product_categories;
CREATE POLICY "Admin manage categories" ON product_categories FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');

-- Insert default data
INSERT INTO product_categories (name, description) VALUES 
('Electronics', 'Electronic devices and accessories'),
('Clothing', 'Apparel and fashion items'),
('Food & Beverages', 'Food products and drinks'),
('Home & Garden', 'Home improvement and garden supplies'),
('Health & Beauty', 'Health and beauty products')
ON CONFLICT DO NOTHING;

INSERT INTO loyalty_programs (name, description, points_per_ksh, min_redemption_points) VALUES 
('Stokika Rewards', 'Earn points on every purchase', 0.01, 100)
ON CONFLICT DO NOTHING;

INSERT INTO sms_templates (name, template_text, variables) VALUES 
('Order Confirmation', 'Your order #{order_id} confirmed. Total: KES {amount}', ARRAY['order_id', 'amount']),
('Delivery Update', 'Order #{order_id} is {status}', ARRAY['order_id', 'status']),
('Welcome Message', 'Welcome to Stokika, {name}!', ARRAY['name'])
ON CONFLICT DO NOTHING;

SELECT 'Advanced features tables created successfully' as status;
