-- Vendor Product Management Schema (Minimal)

-- Vendor Inventory
CREATE TABLE IF NOT EXISTS vendor_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES vendors(id),
    product_name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE,
    category VARCHAR(100),
    subcategory VARCHAR(100),
    brand VARCHAR(100),
    description TEXT,
    images TEXT[],
    specifications JSONB,
    
    -- Pricing
    cost_price NUMERIC(10,2) NOT NULL,
    selling_price NUMERIC(10,2) NOT NULL,
    profit_margin NUMERIC(5,2),
    
    -- Inventory
    quantity INTEGER DEFAULT 0,
    stock_status VARCHAR(20) DEFAULT 'in_stock',
    min_stock_level INTEGER DEFAULT 5,
    reorder_quantity INTEGER DEFAULT 10,
    
    -- Source tracking
    supplier_id UUID REFERENCES suppliers(id),
    
    -- Product details
    weight NUMERIC(10,2),
    dimensions JSONB,
    min_order_quantity INTEGER DEFAULT 1,
    max_order_quantity INTEGER,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    
    -- Discounts
    discount_percentage NUMERIC(5,2) DEFAULT 0,
    discount_start_date TIMESTAMP WITH TIME ZONE,
    discount_end_date TIMESTAMP WITH TIME ZONE,
    
    -- Tracking
    views_count INTEGER DEFAULT 0,
    sales_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vendor Product Variants
CREATE TABLE IF NOT EXISTS vendor_product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES vendor_inventory(id) ON DELETE CASCADE,
    variant_name VARCHAR(100) NOT NULL,
    variant_value VARCHAR(100) NOT NULL,
    cost_price NUMERIC(10,2),
    selling_price NUMERIC(10,2),
    quantity INTEGER DEFAULT 0,
    sku VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer Orders
CREATE TABLE IF NOT EXISTS customer_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    vendor_id UUID REFERENCES vendors(id),
    
    -- Customer info
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(20) NOT NULL,
    
    -- Delivery
    delivery_address TEXT NOT NULL,
    delivery_county VARCHAR(100),
    delivery_notes TEXT,
    
    -- Order details
    subtotal NUMERIC(10,2) NOT NULL,
    shipping_cost NUMERIC(10,2) DEFAULT 0,
    discount_amount NUMERIC(10,2) DEFAULT 0,
    total_amount NUMERIC(10,2) NOT NULL,
    
    -- Payment
    payment_method VARCHAR(50),
    payment_status VARCHAR(20) DEFAULT 'pending',
    payment_reference VARCHAR(100),
    paid_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    order_status VARCHAR(20) DEFAULT 'pending',
    fulfillment_status VARCHAR(20) DEFAULT 'unfulfilled',
    
    -- Tracking
    tracking_number VARCHAR(100),
    estimated_delivery DATE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    
    -- Notes
    vendor_notes TEXT,
    cancellation_reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer Order Items
CREATE TABLE IF NOT EXISTS customer_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES customer_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES vendor_inventory(id),
    variant_id UUID REFERENCES vendor_product_variants(id),
    
    product_name VARCHAR(255) NOT NULL,
    variant_details VARCHAR(255),
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL,
    discount_amount NUMERIC(10,2) DEFAULT 0,
    total_price NUMERIC(10,2) NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vendor Analytics
CREATE TABLE IF NOT EXISTS vendor_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES vendors(id),
    date DATE NOT NULL,
    
    total_orders INTEGER DEFAULT 0,
    total_revenue NUMERIC(12,2) DEFAULT 0,
    total_profit NUMERIC(12,2) DEFAULT 0,
    avg_order_value NUMERIC(10,2) DEFAULT 0,
    total_views INTEGER DEFAULT 0,
    products_sold INTEGER DEFAULT 0,
    new_customers INTEGER DEFAULT 0,
    returning_customers INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(vendor_id, date)
);

-- Vendor Shipping Zones
CREATE TABLE IF NOT EXISTS vendor_shipping_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES vendors(id),
    zone_name VARCHAR(100) NOT NULL,
    counties TEXT[],
    shipping_cost NUMERIC(10,2) NOT NULL,
    free_shipping_threshold NUMERIC(10,2),
    estimated_days INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vendor Promotions
CREATE TABLE IF NOT EXISTS vendor_promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES vendors(id),
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL,
    discount_value NUMERIC(10,2) NOT NULL,
    min_purchase_amount NUMERIC(10,2),
    max_discount_amount NUMERIC(10,2),
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer Reviews
CREATE TABLE IF NOT EXISTS vendor_product_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES vendor_inventory(id) ON DELETE CASCADE,
    order_id UUID REFERENCES customer_orders(id),
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_title VARCHAR(200),
    review_text TEXT,
    verified_purchase BOOLEAN DEFAULT false,
    helpful_count INTEGER DEFAULT 0,
    images TEXT[],
    vendor_response TEXT,
    responded_at TIMESTAMP WITH TIME ZONE,
    is_approved BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Restock Requests
CREATE TABLE IF NOT EXISTS restock_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES vendors(id),
    supplier_id UUID REFERENCES suppliers(id),
    request_number VARCHAR(50) UNIQUE NOT NULL,
    
    total_amount NUMERIC(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    payment_status VARCHAR(20) DEFAULT 'pending',
    payment_reference VARCHAR(100),
    
    notes TEXT,
    supplier_notes TEXT,
    
    approved_at TIMESTAMP WITH TIME ZONE,
    fulfilled_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Restock Request Items
CREATE TABLE IF NOT EXISTS restock_request_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES restock_requests(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL,
    total_price NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE vendor_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_shipping_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE restock_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE restock_request_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Vendors manage own inventory" ON vendor_inventory FOR ALL USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));
CREATE POLICY "Public can view active products" ON vendor_inventory FOR SELECT USING (is_active = true);

CREATE POLICY "Vendors manage variants" ON vendor_product_variants FOR ALL USING (
    EXISTS (SELECT 1 FROM vendor_inventory WHERE vendor_inventory.id = vendor_product_variants.product_id 
        AND vendor_inventory.vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()))
);
CREATE POLICY "Public can view variants" ON vendor_product_variants FOR SELECT USING (is_active = true);

CREATE POLICY "Vendors manage own orders" ON customer_orders FOR ALL USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));

CREATE POLICY "View order items" ON customer_order_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM customer_orders WHERE customer_orders.id = customer_order_items.order_id 
        AND customer_orders.vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()))
);

CREATE POLICY "Vendors view own analytics" ON vendor_analytics FOR SELECT USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));

CREATE POLICY "Vendors manage shipping zones" ON vendor_shipping_zones FOR ALL USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));

CREATE POLICY "Vendors manage promotions" ON vendor_promotions FOR ALL USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));

CREATE POLICY "Public can view approved reviews" ON vendor_product_reviews FOR SELECT USING (is_approved = true);
CREATE POLICY "Vendors respond to reviews" ON vendor_product_reviews FOR UPDATE USING (
    EXISTS (SELECT 1 FROM vendor_inventory WHERE vendor_inventory.id = vendor_product_reviews.product_id 
        AND vendor_inventory.vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()))
);

CREATE POLICY "Vendors manage restock requests" ON restock_requests FOR ALL USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));
CREATE POLICY "Suppliers view restock requests" ON restock_requests FOR SELECT USING (supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid()));

CREATE POLICY "View restock items" ON restock_request_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM restock_requests WHERE restock_requests.id = restock_request_items.request_id 
        AND (restock_requests.vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()) 
        OR restock_requests.supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid())))
);

-- Indexes
CREATE INDEX idx_vendor_inventory_vendor ON vendor_inventory(vendor_id);
CREATE INDEX idx_vendor_inventory_sku ON vendor_inventory(sku);
CREATE INDEX idx_vendor_inventory_active ON vendor_inventory(is_active);
CREATE INDEX idx_customer_orders_vendor ON customer_orders(vendor_id);
CREATE INDEX idx_customer_orders_status ON customer_orders(order_status);
CREATE INDEX idx_vendor_analytics_vendor_date ON vendor_analytics(vendor_id, date);
CREATE INDEX idx_restock_requests_vendor ON restock_requests(vendor_id);
CREATE INDEX idx_restock_requests_supplier ON restock_requests(supplier_id);
