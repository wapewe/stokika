-- Advanced Features Schema Extension
-- Run this after gps-analytics-schema.sql
-- PREREQUISITES: unified-database-schema.sql and gps-analytics-schema.sql must be run first

-- Check if required tables exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
        RAISE EXCEPTION 'ERROR: users table does not exist. Please run unified-database-schema.sql first.';
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'vendors') THEN
        RAISE EXCEPTION 'ERROR: vendors table does not exist. Please run unified-database-schema.sql first.';
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'suppliers') THEN
        RAISE EXCEPTION 'ERROR: suppliers table does not exist. Please run unified-database-schema.sql first.';
    END IF;
END $$;

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
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'failed')),
    tracking_code VARCHAR(20) UNIQUE,
    delivery_notes TEXT,
    recipient_name VARCHAR(255),
    recipient_phone VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product Catalog Tables
CREATE TABLE IF NOT EXISTS product_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    cost_price DECIMAL(10, 2),
    stock_quantity INTEGER DEFAULT 0,
    min_stock_level INTEGER DEFAULT 10,
    sku VARCHAR(100) UNIQUE,
    images TEXT[],
    specifications JSONB,
    is_active BOOLEAN DEFAULT true,
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

CREATE TABLE IF NOT EXISTS loyalty_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    program_id UUID REFERENCES loyalty_programs(id) ON DELETE CASCADE,
    points_balance INTEGER DEFAULT 0,
    total_earned INTEGER DEFAULT 0,
    total_redeemed INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    transaction_type VARCHAR(20) CHECK (transaction_type IN ('earned', 'redeemed', 'expired')),
    points INTEGER NOT NULL,
    description TEXT,
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
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
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
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
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
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_log TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_deliveries_order_id ON deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_tracking_code ON deliveries(tracking_code);

CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);

CREATE INDEX IF NOT EXISTS idx_loyalty_points_vendor_id ON loyalty_points(vendor_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_vendor_id ON loyalty_transactions(vendor_id);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);

-- Triggers
DROP TRIGGER IF EXISTS update_deliveries_updated_at ON deliveries;
CREATE TRIGGER update_deliveries_updated_at BEFORE UPDATE ON deliveries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_shopping_carts_updated_at ON shopping_carts;
CREATE TRIGGER update_shopping_carts_updated_at BEFORE UPDATE ON shopping_carts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_loyalty_points_updated_at ON loyalty_points;
CREATE TRIGGER update_loyalty_points_updated_at BEFORE UPDATE ON loyalty_points FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Admin policies
DROP POLICY IF EXISTS "Admin full access deliveries" ON deliveries;
CREATE POLICY "Admin full access deliveries" ON deliveries FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');

DROP POLICY IF EXISTS "Admin full access products" ON products;
CREATE POLICY "Admin full access products" ON products FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');

DROP POLICY IF EXISTS "Admin full access carts" ON shopping_carts;
CREATE POLICY "Admin full access carts" ON shopping_carts FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');

DROP POLICY IF EXISTS "Admin full access messages" ON messages;
CREATE POLICY "Admin full access messages" ON messages FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');

-- Vendor policies
DROP POLICY IF EXISTS "Vendor own deliveries" ON deliveries;
CREATE POLICY "Vendor own deliveries" ON deliveries FOR SELECT TO authenticated USING (
    vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Vendor own cart" ON shopping_carts;
CREATE POLICY "Vendor own cart" ON shopping_carts FOR ALL TO authenticated USING (
    vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Vendor own loyalty" ON loyalty_points;
CREATE POLICY "Vendor own loyalty" ON loyalty_points FOR ALL TO authenticated USING (
    vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
);

-- Functions
CREATE OR REPLACE FUNCTION generate_tracking_code() RETURNS TEXT AS $$
BEGIN
    RETURN 'STK' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_loyalty_points(order_amount DECIMAL) RETURNS INTEGER AS $$
BEGIN
    RETURN FLOOR(order_amount * 0.01); -- 1 point per KES 100
END;
$$ LANGUAGE plpgsql;

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
('Order Confirmation', 'Your order #{order_id} has been confirmed. Total: KES {amount}. Track: {tracking_code}', ARRAY['order_id', 'amount', 'tracking_code']),
('Delivery Update', 'Your order #{order_id} is {status}. Estimated delivery: {delivery_time}', ARRAY['order_id', 'status', 'delivery_time']),
('Welcome Message', 'Welcome to Stokika, {name}! Your account is now active.', ARRAY['name'])
ON CONFLICT DO NOTHING;

DO $$
BEGIN
    RAISE NOTICE '✅ Advanced Features Schema created successfully!';
    RAISE NOTICE '📦 Delivery Tracking, Product Catalog, Shopping Cart';
    RAISE NOTICE '🎁 Loyalty Program, SMS Notifications, In-App Messaging';
    RAISE NOTICE '💰 Financial Dashboard, Bulk Operations';
END $$;