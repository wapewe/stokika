// Supabase Configuration
// Credentials loaded securely from config-loader.js

// Global singleton Supabase client
function initSupabase() {
    // Return existing global client if already initialized
    if (window._supabaseClient) {
        return window._supabaseClient;
    }
    
    if (typeof window.supabase === 'undefined') {
        console.error('Supabase library not loaded');
        return null;
    }
    
    // Read globals fresh on each call (they are set asynchronously by config-loader.js)
    const url = window.SUPABASE_URL;
    const anonKey = window.SUPABASE_ANON_KEY;
    
    if (!url || !anonKey) {
        console.warn('⚠️ Supabase configuration not available yet - config may still be loading');
        return null;
    }
    
    // Create new client only once and store globally
    // Extract project ref from URL for storage key
    const projectRef = new URL(url).hostname.split('.')[0];
    
    window._supabaseClient = window.supabase.createClient(url, anonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storageKey: `sb-${projectRef}-auth-token`
        }
    });
    
    console.log('✅ Supabase client initialized successfully');
    return window._supabaseClient;
}

// Initialize immediately when config is loaded
window.addEventListener('supabase-config-loaded', () => {
    if (!window._supabaseClient) {
        initSupabase();
    }
});

// Database Schema Reference
/*
-- Vendors Table
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    business_type VARCHAR(100),
    registration_date TIMESTAMP DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'active',
    credit_limit DECIMAL(10,2) DEFAULT 0,
    current_balance DECIMAL(10,2) DEFAULT 0
);

-- Suppliers Table
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    location VARCHAR(255),
    website VARCHAR(255),
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Products Table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID REFERENCES suppliers(id),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    unit_price DECIMAL(10,2),
    stock_quantity INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Orders Table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID REFERENCES vendors(id),
    supplier_id UUID REFERENCES suppliers(id),
    order_number VARCHAR(50) UNIQUE,
    total_amount DECIMAL(10,2),
    service_fee_percentage DECIMAL(5,2),
    service_fee_amount DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'pending',
    cycle_type VARCHAR(50),
    delivery_date TIMESTAMP,
    delivery_proof_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Payments Table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id),
    vendor_id UUID REFERENCES vendors(id),
    amount DECIMAL(10,2),
    payment_date TIMESTAMP,
    due_date TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending',
    payment_method VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Contact Submissions Table
CREATE TABLE contact_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    business_type VARCHAR(100),
    message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Newsletter Subscriptions Table
CREATE TABLE newsletter_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    subscribed_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'active'
);

-- Vendor Registrations Table
CREATE TABLE vendor_registrations (
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
    status VARCHAR(50) DEFAULT 'pending_review',
    created_at TIMESTAMP DEFAULT NOW(),
    reviewed_at TIMESTAMP,
    reviewed_by UUID
);
*/

// API Functions
const StokikaAPI = {
    // Contact Form Submission
    async submitContact(data) {
        try {
            const client = initSupabase();
            if (!client) throw new Error('Supabase not initialized');
            
            const { data: result, error } = await client
                .from('contact_submissions')
                .insert([{
                    name: data.name,
                    phone: data.phone,
                    email: data.email,
                    business_type: data.businessType,
                    message: data.message,
                    created_at: new Date().toISOString()
                }]);
            
            if (error) throw error;
            return { success: true, data: result };
        } catch (error) {
            console.error('Error submitting contact:', error);
            return { success: false, error: error.message };
        }
    },

    // Newsletter Subscription
    async subscribeNewsletter(email) {
        try {
            const client = initSupabase();
            if (!client) throw new Error('Supabase not initialized');
            
            const { data: result, error } = await client
                .from('newsletter_subscriptions')
                .insert([{
                    email: email,
                    subscribed_at: new Date().toISOString(),
                    status: 'active'
                }]);
            
            if (error) throw error;
            return { success: true, data: result };
        } catch (error) {
            console.error('Error subscribing to newsletter:', error);
            return { success: false, error: error.message };
        }
    },

    // Vendor Registration Submission
    async submitVendorRegistration(data) {
        try {
            const client = initSupabase();
            if (!client) throw new Error('Supabase not initialized');
            
            const { data: result, error } = await client
                .from('vendor_registrations')
                .insert([{
                    business_name: data.businessName,
                    business_category: data.businessCategory,
                    county: data.county,
                    town: data.town,
                    center: data.center,
                    phone: data.phone,
                    email: data.email,
                    business_size: data.businessSize,
                    stock_cycle: data.stockCycle,
                    stock_limit: data.stockLimit,
                    cycle_reason: data.cycleReason,
                    status: 'pending_review',
                    created_at: new Date().toISOString()
                }]);
            
            if (error) throw error;
            return { success: true, data: result };
        } catch (error) {
            console.error('Error submitting vendor registration:', error);
            return { success: false, error: error.message };
        }
    },

    // Get Vendor Dashboard Data
    async getVendorDashboard(vendorId) {
        try {
            const client = initSupabase();
            if (!client) throw new Error('Supabase not initialized');
            
            const { data: vendor, error: vendorError } = await client
                .from('vendors')
                .select('*')
                .eq('id', vendorId)
                .single();
            
            if (vendorError) throw vendorError;
            
            const { data: orders, error: ordersError } = await client
                .from('orders')
                .select('*')
                .eq('vendor_id', vendorId)
                .order('created_at', { ascending: false })
                .limit(10);
            
            if (ordersError) throw ordersError;
            
            return {
                success: true,
                data: { vendor, orders }
            };
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            return { success: false, error: error.message };
        }
    },

    // Create Order
    async createOrder(orderData) {
        try {
            const client = initSupabase();
            if (!client) throw new Error('Supabase not initialized');
            
            const { data: result, error } = await client
                .from('orders')
                .insert([orderData]);
            
            if (error) throw error;
            return { success: true, data: result };
        } catch (error) {
            console.error('Error creating order:', error);
            return { success: false, error: error.message };
        }
    },

    // Get Suppliers
    async getSuppliers() {
        try {
            const client = initSupabase();
            if (!client) throw new Error('Supabase not initialized');
            
            const { data: suppliers, error } = await client
                .from('suppliers')
                .select('*')
                .eq('verified', true);
            
            if (error) throw error;
            return { success: true, data: suppliers };
        } catch (error) {
            console.error('Error fetching suppliers:', error);
            return { success: false, error: error.message };
        }
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StokikaAPI;
}
