-- Vendor Shop Branding & Dropshipping Schema (Minimal)

-- Vendor Shop Profile & Branding
CREATE TABLE IF NOT EXISTS vendor_shop_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES vendors(id) UNIQUE,
    
    -- Shop Identity
    shop_name VARCHAR(255) NOT NULL,
    shop_slug VARCHAR(255) UNIQUE NOT NULL,
    tagline VARCHAR(255),
    description TEXT,
    
    -- Branding
    logo_url TEXT,
    banner_url TEXT,
    primary_color VARCHAR(7) DEFAULT '#3b82f6',
    secondary_color VARCHAR(7) DEFAULT '#10b981',
    accent_color VARCHAR(7) DEFAULT '#f59e0b',
    font_family VARCHAR(100) DEFAULT 'Inter',
    
    -- Contact Info
    business_email VARCHAR(255),
    business_phone VARCHAR(20),
    whatsapp_number VARCHAR(20),
    physical_address TEXT,
    
    -- Social Media
    facebook_url TEXT,
    instagram_url TEXT,
    twitter_url TEXT,
    tiktok_url TEXT,
    
    -- Business Info
    business_type VARCHAR(50),
    business_registration_number VARCHAR(100),
    tax_pin VARCHAR(50),
    
    -- Shop Settings
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    accepts_orders BOOLEAN DEFAULT true,
    min_order_amount NUMERIC(10,2) DEFAULT 0,
    
    -- SEO
    meta_title VARCHAR(255),
    meta_description TEXT,
    meta_keywords TEXT[],
    
    -- Stats
    total_sales NUMERIC(12,2) DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    avg_rating NUMERIC(3,2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shop Customization
CREATE TABLE IF NOT EXISTS vendor_shop_themes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES vendors(id),
    
    -- Layout
    layout_type VARCHAR(50) DEFAULT 'grid',
    products_per_page INTEGER DEFAULT 12,
    show_filters BOOLEAN DEFAULT true,
    show_search BOOLEAN DEFAULT true,
    
    -- Homepage Sections
    show_banner BOOLEAN DEFAULT true,
    show_featured_products BOOLEAN DEFAULT true,
    show_categories BOOLEAN DEFAULT true,
    show_testimonials BOOLEAN DEFAULT false,
    
    -- Product Display
    show_stock_count BOOLEAN DEFAULT true,
    show_ratings BOOLEAN DEFAULT true,
    show_quick_view BOOLEAN DEFAULT true,
    
    -- Custom CSS
    custom_css TEXT,
    
    -- Custom Pages
    about_page TEXT,
    terms_page TEXT,
    privacy_page TEXT,
    return_policy TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dropship Orders
CREATE TABLE IF NOT EXISTS dropship_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES vendors(id),
    supplier_id UUID REFERENCES suppliers(id),
    
    order_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Delivery Info
    delivery_name VARCHAR(255) NOT NULL,
    delivery_phone VARCHAR(20) NOT NULL,
    delivery_address TEXT NOT NULL,
    delivery_county VARCHAR(100),
    delivery_notes TEXT,
    
    -- Order Details
    total_amount NUMERIC(10,2) NOT NULL,
    vendor_commission NUMERIC(10,2) NOT NULL,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending',
    payment_status VARCHAR(20) DEFAULT 'pending',
    
    -- Tracking
    supplier_notes TEXT,
    tracking_number VARCHAR(100),
    shipped_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dropship Order Items
CREATE TABLE IF NOT EXISTS dropship_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dropship_order_id UUID REFERENCES dropship_orders(id) ON DELETE CASCADE,
    
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    supplier_price NUMERIC(10,2) NOT NULL,
    vendor_price NUMERIC(10,2) NOT NULL,
    vendor_profit NUMERIC(10,2) NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shop Analytics
CREATE TABLE IF NOT EXISTS vendor_shop_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES vendors(id),
    date DATE NOT NULL,
    
    -- Traffic
    page_views INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    product_views INTEGER DEFAULT 0,
    
    -- Conversion
    add_to_cart INTEGER DEFAULT 0,
    checkout_started INTEGER DEFAULT 0,
    orders_completed INTEGER DEFAULT 0,
    conversion_rate NUMERIC(5,2) DEFAULT 0,
    
    -- Revenue
    total_revenue NUMERIC(12,2) DEFAULT 0,
    dropship_revenue NUMERIC(12,2) DEFAULT 0,
    stock_revenue NUMERIC(12,2) DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(vendor_id, date)
);

-- Enable RLS
ALTER TABLE vendor_shop_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_shop_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dropship_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE dropship_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_shop_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Vendors manage own shop profile" ON vendor_shop_profiles FOR ALL USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));
CREATE POLICY "Public can view active shops" ON vendor_shop_profiles FOR SELECT USING (is_active = true);

CREATE POLICY "Vendors manage own theme" ON vendor_shop_themes FOR ALL USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));

CREATE POLICY "Vendors view own dropship orders" ON dropship_orders FOR SELECT USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));
CREATE POLICY "Suppliers view dropship orders to them" ON dropship_orders FOR SELECT USING (supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid()));
CREATE POLICY "Suppliers update dropship orders" ON dropship_orders FOR UPDATE USING (supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid()));

CREATE POLICY "View dropship order items" ON dropship_order_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM dropship_orders WHERE dropship_orders.id = dropship_order_items.dropship_order_id 
        AND (dropship_orders.vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()) 
        OR dropship_orders.supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid())))
);

CREATE POLICY "Vendors view own shop analytics" ON vendor_shop_analytics FOR SELECT USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));

-- Indexes
CREATE INDEX idx_vendor_shop_profiles_vendor ON vendor_shop_profiles(vendor_id);
CREATE INDEX idx_vendor_shop_profiles_slug ON vendor_shop_profiles(shop_slug);
CREATE INDEX idx_vendor_shop_profiles_active ON vendor_shop_profiles(is_active);
CREATE INDEX idx_dropship_orders_vendor ON dropship_orders(vendor_id);
CREATE INDEX idx_dropship_orders_supplier ON dropship_orders(supplier_id);
CREATE INDEX idx_dropship_orders_status ON dropship_orders(status);
CREATE INDEX idx_vendor_shop_analytics_vendor_date ON vendor_shop_analytics(vendor_id, date);

-- Function: Generate shop slug
CREATE OR REPLACE FUNCTION generate_shop_slug(shop_name TEXT)
RETURNS TEXT AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER := 1;
BEGIN
    base_slug := LOWER(REGEXP_REPLACE(shop_name, '[^a-zA-Z0-9\s-]', '', 'g'));
    base_slug := REGEXP_REPLACE(base_slug, '\s+', '-', 'g');
    base_slug := REGEXP_REPLACE(base_slug, '-+', '-', 'g');
    base_slug := TRIM(BOTH '-' FROM base_slug);
    
    final_slug := base_slug;
    
    WHILE EXISTS (SELECT 1 FROM vendor_shop_profiles WHERE shop_slug = final_slug) LOOP
        final_slug := base_slug || '-' || counter;
        counter := counter + 1;
    END LOOP;
    
    RETURN final_slug;
END;
$$ LANGUAGE plpgsql;
