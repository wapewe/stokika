# Stokika Database Schema

## Required Supabase Tables

### 1. users
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'user', -- 'user' or 'admin'
    user_type TEXT, -- 'vendor', 'supplier', 'supervisor', 'field_agent'
    permissions JSONB DEFAULT '{"can_create_users": false}',
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Permissions Field Structure:**
```json
{
    "can_create_users": false
}
```

### 2. vendors
```sql
CREATE TABLE vendors (
    id UUID PRIMARY KEY,
    name TEXT,
    email TEXT,
    phone TEXT,
    business_name TEXT,
    business_category TEXT,
    location TEXT,
    county TEXT,
    agent_id UUID REFERENCES users(id),
    status TEXT DEFAULT 'pending',
    email_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 3. suppliers
```sql
CREATE TABLE suppliers (
    id UUID PRIMARY KEY,
    company_name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    county TEXT,
    agent_id UUID REFERENCES users(id),
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 4. field_agents
```sql
CREATE TABLE field_agents (
    id UUID PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    county TEXT,
    agent_number TEXT UNIQUE,
    approval_status TEXT DEFAULT 'pending',
    interview_status TEXT DEFAULT 'not_interviewed',
    interview_notes TEXT,
    interview_date TIMESTAMP,
    rejection_reason TEXT,
    approved_at TIMESTAMP,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 5. supervisors
```sql
CREATE TABLE supervisors (
    id UUID PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    county TEXT,
    supervisor_number TEXT UNIQUE,
    approval_status TEXT DEFAULT 'pending',
    interview_status TEXT DEFAULT 'not_interviewed',
    interview_notes TEXT,
    interview_date TIMESTAMP,
    rejection_reason TEXT,
    approved_at TIMESTAMP,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 6. orders
```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number TEXT UNIQUE NOT NULL,
    vendor_id UUID REFERENCES vendors(id),
    supplier_id UUID REFERENCES suppliers(id),
    product_name TEXT,
    quantity INTEGER,
    total_amount DECIMAL(10,2),
    status TEXT DEFAULT 'pending_admin',
    order_type TEXT, -- 'stokika' or 'supplier'
    decline_reason TEXT,
    delivered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Order Status Flow:**
- `pending_admin` - Waiting for admin to assign supplier
- `pending_supplier` - Waiting for supplier to accept
- `accepted` - Supplier accepted
- `processing` - Supplier is processing
- `delivered` - Order delivered
- `declined` - Order declined

### 7. payments
```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID REFERENCES vendors(id),
    vendor_name TEXT,
    amount DECIMAL(10,2),
    mpesa_code TEXT,
    phone_number TEXT,
    payment_method TEXT, -- 'manual' or 'prompt'
    status TEXT DEFAULT 'pending',
    rejection_reason TEXT,
    payment_date TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 8. supplier_payments
```sql
CREATE TABLE supplier_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID REFERENCES suppliers(id),
    amount DECIMAL(10,2),
    reference TEXT,
    status TEXT DEFAULT 'pending',
    payment_date TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 9. supplier_inventory
```sql
CREATE TABLE supplier_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID REFERENCES suppliers(id),
    product_name TEXT NOT NULL,
    category TEXT,
    price DECIMAL(10,2),
    stock_quantity INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 10. contacts
```sql
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    user_type TEXT,
    business_type TEXT,
    message TEXT,
    status TEXT DEFAULT 'new',
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 11. website_settings
```sql
CREATE TABLE website_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Default Settings:**
```sql
INSERT INTO website_settings (setting_key, setting_value) VALUES
('site_status', 'online'),
('maintenance_message', 'We are currently performing maintenance'),
('feature_vendor_registration', 'true'),
('feature_supplier_registration', 'true'),
('feature_field_agent_application', 'true'),
('feature_contact_form', 'true');
```

---

## Row Level Security (RLS) Policies

### Enable RLS on all tables:
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisors ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_settings ENABLE ROW LEVEL SECURITY;
```

### Example Policies:

**Vendors can only see their own data:**
```sql
CREATE POLICY "Vendors can view own data" ON vendors
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Vendors can update own data" ON vendors
    FOR UPDATE USING (auth.uid() = id);
```

**Suppliers can only see their orders:**
```sql
CREATE POLICY "Suppliers can view own orders" ON orders
    FOR SELECT USING (supplier_id = auth.uid());

CREATE POLICY "Suppliers can update own orders" ON orders
    FOR UPDATE USING (supplier_id = auth.uid());
```

**Field Agents can see their vendors/suppliers:**
```sql
CREATE POLICY "Agents can view own vendors" ON vendors
    FOR SELECT USING (agent_id = auth.uid());

CREATE POLICY "Agents can view own suppliers" ON suppliers
    FOR SELECT USING (agent_id = auth.uid());
```

**Supervisors can see data in their region:**
```sql
CREATE POLICY "Supervisors can view regional agents" ON field_agents
    FOR SELECT USING (
        county IN (
            SELECT county FROM supervisors WHERE id = auth.uid()
        )
    );
```

**Admin has full access:**
```sql
CREATE POLICY "Admin full access" ON users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
```

---

## Indexes for Performance

```sql
CREATE INDEX idx_vendors_agent_id ON vendors(agent_id);
CREATE INDEX idx_suppliers_agent_id ON suppliers(agent_id);
CREATE INDEX idx_orders_vendor_id ON orders(vendor_id);
CREATE INDEX idx_orders_supplier_id ON orders(supplier_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_payments_vendor_id ON payments(vendor_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_supplier_payments_supplier_id ON supplier_payments(supplier_id);
CREATE INDEX idx_supplier_inventory_supplier_id ON supplier_inventory(supplier_id);
CREATE INDEX idx_field_agents_county ON field_agents(county);
CREATE INDEX idx_supervisors_county ON supervisors(county);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_user_type ON users(user_type);
```

---

## Database Functions

### Generate Order Number
```sql
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
BEGIN
    new_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('order_seq')::TEXT, 4, '0');
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE order_seq START 1;
```

### Generate Agent Number
```sql
CREATE OR REPLACE FUNCTION generate_agent_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
BEGIN
    new_number := 'AGT-' || LPAD(NEXTVAL('agent_seq')::TEXT, 6, '0');
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE agent_seq START 1;
```

### Generate Supervisor Number
```sql
CREATE OR REPLACE FUNCTION generate_supervisor_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
BEGIN
    new_number := 'SUP-' || LPAD(NEXTVAL('supervisor_seq')::TEXT, 6, '0');
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE supervisor_seq START 1;
```

---

## Triggers

### Auto-generate order number
```sql
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL THEN
        NEW.order_number := generate_order_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_order_number
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION set_order_number();
```

### Auto-update timestamps
```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_vendors_timestamp
    BEFORE UPDATE ON vendors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_update_suppliers_timestamp
    BEFORE UPDATE ON suppliers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_update_orders_timestamp
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
```

---

## Data Relationships

```
users (field_agent)
    └── vendors (agent_id)
        └── orders (vendor_id)
            └── payments (vendor_id)
    └── suppliers (agent_id)
        └── orders (supplier_id)
        └── supplier_inventory (supplier_id)
        └── supplier_payments (supplier_id)

supervisors
    └── field_agents (by county)
        └── vendors (via agent_id)
```

---

## Permission System Implementation

### Admin Dashboard Integration:
1. Admin views Users tab
2. Sees field agents with permission status
3. Clicks "Grant" or "Revoke" button
4. Updates `users.permissions` JSONB field
5. Field agent dashboard reads permissions on load
6. Enables/disables create buttons based on permission

### Field Agent Dashboard Integration:
1. Agent logs in
2. Dashboard queries `users.permissions` for agent's ID
3. Parses JSON to check `can_create_users` flag
4. Shows permission badge
5. Enables/disables create vendor/supplier buttons
6. When creating user, links via `agent_id`

---

## Testing Queries

### Check user permissions:
```sql
SELECT id, name, email, user_type, permissions 
FROM users 
WHERE user_type = 'field_agent';
```

### View agent's vendors:
```sql
SELECT v.*, u.name as agent_name
FROM vendors v
LEFT JOIN users u ON v.agent_id = u.id
WHERE v.agent_id = 'agent-uuid-here';
```

### View regional data for supervisor:
```sql
SELECT 
    s.full_name as supervisor,
    fa.full_name as agent,
    v.business_name as vendor,
    fa.county
FROM supervisors s
JOIN field_agents fa ON fa.county = s.county
LEFT JOIN vendors v ON v.agent_id = fa.id
WHERE s.id = 'supervisor-uuid-here';
```

### Order flow tracking:
```sql
SELECT 
    o.order_number,
    v.business_name as vendor,
    s.company_name as supplier,
    o.status,
    o.total_amount,
    o.created_at
FROM orders o
LEFT JOIN vendors v ON o.vendor_id = v.id
LEFT JOIN suppliers s ON o.supplier_id = s.id
ORDER BY o.created_at DESC;
```

---

## Backup & Maintenance

### Daily Backup:
```bash
pg_dump -h your-supabase-host -U postgres -d postgres > backup_$(date +%Y%m%d).sql
```

### Clean old data:
```sql
-- Archive old orders (older than 1 year)
CREATE TABLE orders_archive AS 
SELECT * FROM orders 
WHERE created_at < NOW() - INTERVAL '1 year';

DELETE FROM orders 
WHERE created_at < NOW() - INTERVAL '1 year';
```

---

**Last Updated:** 2024
**Status:** Production Ready
