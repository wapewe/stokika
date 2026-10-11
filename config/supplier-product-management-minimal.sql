-- Supplier Product Management Schema (Minimal)

-- Supplier Inventory Table
CREATE TABLE IF NOT EXISTS supplier_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES suppliers(id),
    product_name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE,
    category VARCHAR(100),
    subcategory VARCHAR(100),
    brand VARCHAR(100),
    description TEXT,
    images TEXT[],
    specifications JSONB,
    
    -- Pricing
    unit_price NUMERIC(10,2) NOT NULL,
    discount_percentage NUMERIC(5,2) DEFAULT 0,
    discount_start_date TIMESTAMP WITH TIME ZONE,
    discount_end_date TIMESTAMP WITH TIME ZONE,
    
    -- Inventory
    quantity INTEGER DEFAULT 0,
    stock_status VARCHAR(20) DEFAULT 'in_stock',
    min_order_quantity INTEGER DEFAULT 1,
    max_order_quantity INTEGER,
    
    -- Product details
    weight NUMERIC(10,2),
    dimensions JSONB,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    listing_type VARCHAR(20) DEFAULT 'marketplace',
    contact_info JSONB,
    
    -- Tracking
    views_count INTEGER DEFAULT 0,
    sales_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product Variants
CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES supplier_inventory(id) ON DELETE CASCADE,
    variant_name VARCHAR(100) NOT NULL,
    variant_value VARCHAR(100) NOT NULL,
    price_adjustment NUMERIC(10,2) DEFAULT 0,
    quantity INTEGER DEFAULT 0,
    sku VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product Reviews
CREATE TABLE IF NOT EXISTS product_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES supplier_inventory(id) ON DELETE CASCADE,
    reviewer_name VARCHAR(255),
    reviewer_email VARCHAR(255),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_title VARCHAR(200),
    review_text TEXT,
    verified_purchase BOOLEAN DEFAULT false,
    helpful_count INTEGER DEFAULT 0,
    images TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Supplier Analytics
CREATE TABLE IF NOT EXISTS supplier_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES suppliers(id),
    date DATE NOT NULL,
    total_views INTEGER DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    total_sales NUMERIC(12,2) DEFAULT 0,
    total_revenue NUMERIC(12,2) DEFAULT 0,
    avg_rating NUMERIC(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(supplier_id, date)
);

-- Shipping Zones
CREATE TABLE IF NOT EXISTS shipping_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES suppliers(id),
    zone_name VARCHAR(100) NOT NULL,
    regions TEXT[],
    shipping_cost NUMERIC(10,2) NOT NULL,
    estimated_days INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Promotions
CREATE TABLE IF NOT EXISTS promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES suppliers(id),
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

-- Enable RLS
ALTER TABLE supplier_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active products" ON supplier_inventory FOR SELECT USING (is_active = true);
CREATE POLICY "Suppliers manage own products" ON supplier_inventory FOR ALL USING (supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid()));

CREATE POLICY "Anyone can view variants" ON product_variants FOR SELECT USING (is_active = true);
CREATE POLICY "Suppliers manage variants" ON product_variants FOR ALL USING (
    EXISTS (SELECT 1 FROM supplier_inventory WHERE supplier_inventory.id = product_variants.product_id 
        AND supplier_inventory.supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid()))
);

CREATE POLICY "Anyone can view reviews" ON product_reviews FOR SELECT USING (true);

CREATE POLICY "Suppliers view own analytics" ON supplier_analytics FOR SELECT USING (supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid()));

CREATE POLICY "Suppliers manage shipping zones" ON shipping_zones FOR ALL USING (supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid()));
CREATE POLICY "Anyone can view shipping zones" ON shipping_zones FOR SELECT USING (is_active = true);

CREATE POLICY "Suppliers manage promotions" ON promotions FOR ALL USING (supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid()));
CREATE POLICY "Anyone can view active promotions" ON promotions FOR SELECT USING (is_active = true);

-- Indexes
CREATE INDEX idx_supplier_inventory_supplier ON supplier_inventory(supplier_id);
CREATE INDEX idx_supplier_inventory_category ON supplier_inventory(category);
CREATE INDEX idx_supplier_inventory_active ON supplier_inventory(is_active);
CREATE INDEX idx_supplier_inventory_featured ON supplier_inventory(is_featured);
CREATE INDEX idx_product_variants_product ON product_variants(product_id);
CREATE INDEX idx_product_reviews_product ON product_reviews(product_id);
CREATE INDEX idx_supplier_analytics_supplier_date ON supplier_analytics(supplier_id, date);
CREATE INDEX idx_shipping_zones_supplier ON shipping_zones(supplier_id);
CREATE INDEX idx_promotions_supplier ON promotions(supplier_id);
CREATE INDEX idx_promotions_code ON promotions(code);
