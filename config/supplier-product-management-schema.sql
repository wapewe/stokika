-- Comprehensive Supplier Product Management Schema

-- Enhanced Supplier Inventory with full ecommerce features
ALTER TABLE supplier_inventory ADD COLUMN IF NOT EXISTS sku VARCHAR(100) UNIQUE;
ALTER TABLE supplier_inventory ADD COLUMN IF NOT EXISTS images TEXT[]; -- Array of image URLs
ALTER TABLE supplier_inventory ADD COLUMN IF NOT EXISTS specifications JSONB; -- Product specs
ALTER TABLE supplier_inventory ADD COLUMN IF NOT EXISTS subcategory VARCHAR(100);
ALTER TABLE supplier_inventory ADD COLUMN IF NOT EXISTS brand VARCHAR(100);
ALTER TABLE supplier_inventory ADD COLUMN IF NOT EXISTS weight NUMERIC(10,2); -- in kg
ALTER TABLE supplier_inventory ADD COLUMN IF NOT EXISTS dimensions JSONB; -- {length, width, height}
ALTER TABLE supplier_inventory ADD COLUMN IF NOT EXISTS stock_status VARCHAR(20) DEFAULT 'in_stock'; -- in_stock, low_stock, out_of_stock
ALTER TABLE supplier_inventory ADD COLUMN IF NOT EXISTS min_order_quantity INTEGER DEFAULT 1;
ALTER TABLE supplier_inventory ADD COLUMN IF NOT EXISTS max_order_quantity INTEGER;
ALTER TABLE supplier_inventory ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE supplier_inventory ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE supplier_inventory ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC(5,2) DEFAULT 0;
ALTER TABLE supplier_inventory ADD COLUMN IF NOT EXISTS discount_start_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE supplier_inventory ADD COLUMN IF NOT EXISTS discount_end_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE supplier_inventory ADD COLUMN IF NOT EXISTS listing_type VARCHAR(20) DEFAULT 'marketplace'; -- marketplace or integrated
ALTER TABLE supplier_inventory ADD COLUMN IF NOT EXISTS contact_info JSONB; -- For marketplace listings
ALTER TABLE supplier_inventory ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;
ALTER TABLE supplier_inventory ADD COLUMN IF NOT EXISTS sales_count INTEGER DEFAULT 0;

-- Product Variants Table (for size, color, etc.)
CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES supplier_inventory(id) ON DELETE CASCADE,
    variant_name VARCHAR(100) NOT NULL, -- e.g., "Size", "Color"
    variant_value VARCHAR(100) NOT NULL, -- e.g., "Large", "Red"
    price_adjustment NUMERIC(10,2) DEFAULT 0,
    quantity INTEGER DEFAULT 0,
    sku VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product Categories Table
CREATE TABLE IF NOT EXISTS product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    parent_category_id UUID REFERENCES product_categories(id),
    description TEXT,
    icon VARCHAR(50),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced Product Reviews (separate from supplier ratings)
CREATE TABLE IF NOT EXISTS product_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES supplier_inventory(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_title VARCHAR(200),
    review_text TEXT,
    verified_purchase BOOLEAN DEFAULT false,
    helpful_count INTEGER DEFAULT 0,
    images TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Supplier Analytics Table
CREATE TABLE IF NOT EXISTS supplier_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES suppliers(user_id),
    date DATE NOT NULL,
    total_views INTEGER DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    total_sales NUMERIC(12,2) DEFAULT 0,
    total_revenue NUMERIC(12,2) DEFAULT 0,
    avg_rating NUMERIC(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(supplier_id, date)
);

-- Order Items Table (for integrated shop orders)
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES supplier_inventory(id),
    variant_id UUID REFERENCES product_variants(id),
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL,
    discount_amount NUMERIC(10,2) DEFAULT 0,
    total_price NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shipping Management Table
CREATE TABLE IF NOT EXISTS shipping_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES suppliers(user_id),
    zone_name VARCHAR(100) NOT NULL,
    regions TEXT[], -- Array of regions/counties
    shipping_cost NUMERIC(10,2) NOT NULL,
    estimated_days INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Discount/Promotion Management
CREATE TABLE IF NOT EXISTS promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES suppliers(user_id),
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL, -- percentage or fixed
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

-- Customer Wishlist
CREATE TABLE IF NOT EXISTS wishlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    product_id UUID REFERENCES supplier_inventory(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- Enable RLS
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active products" ON supplier_inventory FOR SELECT USING (is_active = true);
CREATE POLICY "Suppliers manage own products" ON supplier_inventory FOR ALL USING (supplier_id = auth.uid());

CREATE POLICY "Anyone can view variants" ON product_variants FOR SELECT USING (true);
CREATE POLICY "Suppliers manage variants" ON product_variants FOR ALL USING (
    EXISTS (SELECT 1 FROM supplier_inventory WHERE supplier_inventory.id = product_variants.product_id AND supplier_inventory.supplier_id = auth.uid())
);

CREATE POLICY "Anyone can view categories" ON product_categories FOR SELECT USING (is_active = true);

CREATE POLICY "Anyone can view reviews" ON product_reviews FOR SELECT USING (true);
CREATE POLICY "Users can create reviews" ON product_reviews FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own reviews" ON product_reviews FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Suppliers view own analytics" ON supplier_analytics FOR SELECT USING (supplier_id = auth.uid());

CREATE POLICY "Users view own order items" ON order_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.vendor_id = auth.uid())
);

CREATE POLICY "Suppliers manage shipping zones" ON shipping_zones FOR ALL USING (supplier_id = auth.uid());
CREATE POLICY "Anyone can view shipping zones" ON shipping_zones FOR SELECT USING (is_active = true);

CREATE POLICY "Suppliers manage promotions" ON promotions FOR ALL USING (supplier_id = auth.uid());
CREATE POLICY "Anyone can view active promotions" ON promotions FOR SELECT USING (is_active = true);

CREATE POLICY "Users manage own wishlist" ON wishlists FOR ALL USING (user_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_supplier_inventory_category ON supplier_inventory(category);
CREATE INDEX IF NOT EXISTS idx_supplier_inventory_subcategory ON supplier_inventory(subcategory);
CREATE INDEX IF NOT EXISTS idx_supplier_inventory_active ON supplier_inventory(is_active);
CREATE INDEX IF NOT EXISTS idx_supplier_inventory_featured ON supplier_inventory(is_featured);
CREATE INDEX IF NOT EXISTS idx_supplier_inventory_listing_type ON supplier_inventory(listing_type);
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_product ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_supplier_analytics_supplier_date ON supplier_analytics(supplier_id, date);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_shipping_zones_supplier ON shipping_zones(supplier_id);
CREATE INDEX IF NOT EXISTS idx_promotions_code ON promotions(code);
CREATE INDEX IF NOT EXISTS idx_wishlists_user ON wishlists(user_id);

-- Insert default categories
INSERT INTO product_categories (name, description, icon, display_order) VALUES
('Electronics', 'Electronic devices and accessories', 'fa-laptop', 1),
('Clothing', 'Apparel and fashion items', 'fa-tshirt', 2),
('Food & Beverages', 'Food products and drinks', 'fa-utensils', 3),
('Home & Garden', 'Home improvement and garden supplies', 'fa-home', 4),
('Health & Beauty', 'Health and beauty products', 'fa-heart', 5),
('Sports & Outdoors', 'Sports equipment and outdoor gear', 'fa-football-ball', 6),
('Books & Media', 'Books, music, and media', 'fa-book', 7),
('Toys & Games', 'Toys and gaming products', 'fa-gamepad', 8),
('Automotive', 'Auto parts and accessories', 'fa-car', 9),
('Office Supplies', 'Office and stationery items', 'fa-briefcase', 10)
ON CONFLICT (name) DO NOTHING;

-- Function to update stock status automatically
CREATE OR REPLACE FUNCTION update_stock_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.quantity = 0 THEN
        NEW.stock_status := 'out_of_stock';
    ELSIF NEW.quantity <= 10 THEN
        NEW.stock_status := 'low_stock';
    ELSE
        NEW.stock_status := 'in_stock';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stock_status
BEFORE INSERT OR UPDATE OF quantity ON supplier_inventory
FOR EACH ROW
EXECUTE FUNCTION update_stock_status();

-- Function to calculate discounted price
CREATE OR REPLACE FUNCTION get_discounted_price(product_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    product_price NUMERIC;
    discount_pct NUMERIC;
    discount_start TIMESTAMP WITH TIME ZONE;
    discount_end TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT price, discount_percentage, discount_start_date, discount_end_date
    INTO product_price, discount_pct, discount_start, discount_end
    FROM supplier_inventory
    WHERE id = product_id;
    
    IF discount_pct > 0 AND NOW() BETWEEN discount_start AND discount_end THEN
        RETURN product_price * (1 - discount_pct / 100);
    ELSE
        RETURN product_price;
    END IF;
END;
$$ LANGUAGE plpgsql;
