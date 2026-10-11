-- Migration: Create Product Catalog Tables
-- Description: Creates product categories, products, supplier products, and vendor product catalog tables
-- Requirements: 2.12-2.15, 24.11-24.14

-- ============================================================================
-- Product Categories Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_name TEXT UNIQUE NOT NULL,
    description TEXT,
    parent_category_id UUID REFERENCES product_categories(id),
    display_order INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for product_categories
CREATE INDEX IF NOT EXISTS idx_product_categories_name ON product_categories(category_name);
CREATE INDEX IF NOT EXISTS idx_product_categories_parent ON product_categories(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_display_order ON product_categories(display_order);

-- ============================================================================
-- Products Table (Master product catalog)
-- ============================================================================

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_name TEXT NOT NULL,
    product_category_id UUID REFERENCES product_categories(id),
    description TEXT,
    unit_of_measure TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for products
CREATE INDEX IF NOT EXISTS idx_products_name ON products(product_name);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(product_category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

-- Apply updated_at trigger
CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Supplier Products Table (Supplier-specific product offerings)
-- ============================================================================

CREATE TABLE IF NOT EXISTS supplier_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    supplier_sku TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    minimum_order_quantity INTEGER NOT NULL DEFAULT 1 CHECK (minimum_order_quantity > 0),
    is_available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(supplier_id, product_id)
);

-- Create indexes for supplier_products
CREATE INDEX IF NOT EXISTS idx_supplier_products_supplier ON supplier_products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_products_product ON supplier_products(product_id);
CREATE INDEX IF NOT EXISTS idx_supplier_products_is_available ON supplier_products(is_available);

-- Apply updated_at trigger
CREATE TRIGGER update_supplier_products_updated_at 
    BEFORE UPDATE ON supplier_products
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Vendor Product Catalog (Vendor-specific pricing and inventory)
-- ============================================================================

CREATE TABLE IF NOT EXISTS vendor_product_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    current_stock INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
    reorder_level INTEGER CHECK (reorder_level >= 0),
    selling_price DECIMAL(10,2) CHECK (selling_price >= 0),
    last_restocked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(vendor_id, product_id)
);

-- Create indexes for vendor_product_catalog
CREATE INDEX IF NOT EXISTS idx_vendor_catalog_vendor ON vendor_product_catalog(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_catalog_product ON vendor_product_catalog(product_id);
CREATE INDEX IF NOT EXISTS idx_vendor_catalog_stock ON vendor_product_catalog(current_stock);

-- Apply updated_at trigger
CREATE TRIGGER update_vendor_catalog_updated_at 
    BEFORE UPDATE ON vendor_product_catalog
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE product_categories IS 'Product category hierarchy';
COMMENT ON TABLE products IS 'Master product catalog';
COMMENT ON TABLE supplier_products IS 'Supplier-specific product offerings with pricing';
COMMENT ON TABLE vendor_product_catalog IS 'Vendor-specific product inventory and pricing';
COMMENT ON COLUMN supplier_products.minimum_order_quantity IS 'Minimum quantity that can be ordered from supplier';
COMMENT ON COLUMN vendor_product_catalog.current_stock IS 'Current inventory level for vendor';
COMMENT ON COLUMN vendor_product_catalog.reorder_level IS 'Stock level that triggers reorder notification';