// Database Integration Module
// Handles all Supabase database operations

class DatabaseService {
    constructor() {
        this.supabase = null;
        this.init();
    }

    init() {
        if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
            this.supabase = window.supabase.createClient(
                window.SUPABASE_URL,
                window.SUPABASE_ANON_KEY
            );
        }
    }

    // Authentication
    async signIn(email, password) {
        const { data, error } = await this.supabase.auth.signInWithPassword({
            email,
            password
        });
        return { data, error };
    }

    async signOut() {
        const { error } = await this.supabase.auth.signOut();
        return { error };
    }

    async getCurrentUser() {
        const { data: { user } } = await this.supabase.auth.getUser();
        return user;
    }

    // User Management
    async getUserByEmail(email) {
        const { data, error } = await this.supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();
        return { data, error };
    }

    async updateLastLogin(email) {
        const { error } = await this.supabase
            .from('users')
            .update({ last_login: new Date().toISOString() })
            .eq('email', email);
        return { error };
    }

    // Vendor Operations
    async getVendorById(vendorId) {
        const { data, error } = await this.supabase
            .from('vendors')
            .select('*')
            .eq('id', vendorId)
            .single();
        return { data, error };
    }

    async getVendorOrders(vendorId) {
        const { data, error } = await this.supabase
            .from('orders')
            .select('*, suppliers(name)')
            .eq('vendor_id', vendorId)
            .order('created_at', { ascending: false });
        return { data, error };
    }

    async getVendorPayments(vendorId) {
        const { data, error } = await this.supabase
            .from('payments')
            .select('*, orders(order_number)')
            .eq('vendor_id', vendorId)
            .order('created_at', { ascending: false });
        return { data, error };
    }

    // Supplier Operations
    async getSuppliers() {
        const { data, error } = await this.supabase
            .from('suppliers')
            .select('*')
            .eq('verified', true)
            .order('name');
        return { data, error };
    }

    async getSupplierById(supplierId) {
        const { data, error } = await this.supabase
            .from('suppliers')
            .select('*')
            .eq('id', supplierId)
            .single();
        return { data, error };
    }

    async getSupplierOrders(supplierId) {
        const { data, error } = await this.supabase
            .from('orders')
            .select('*, vendors(name)')
            .eq('supplier_id', supplierId)
            .order('created_at', { ascending: false });
        return { data, error };
    }

    // Order Operations
    async createOrder(orderData) {
        const { data, error } = await this.supabase
            .from('orders')
            .insert([orderData])
            .select();
        return { data, error };
    }

    async updateOrderStatus(orderId, status) {
        const { data, error } = await this.supabase
            .from('orders')
            .update({ status })
            .eq('id', orderId)
            .select();
        return { data, error };
    }

    // Payment Operations
    async createPayment(paymentData) {
        const { data, error } = await this.supabase
            .from('payments')
            .insert([paymentData])
            .select();
        return { data, error };
    }

    async updatePaymentStatus(paymentId, status) {
        const { data, error } = await this.supabase
            .from('payments')
            .update({ status })
            .eq('id', paymentId)
            .select();
        return { data, error };
    }

    // Inventory Operations
    async getInventory(vendorId) {
        const { data, error } = await this.supabase
            .from('inventory')
            .select('*, products(name, category)')
            .eq('vendor_id', vendorId)
            .order('created_at', { ascending: false });
        return { data, error };
    }

    // Contact & Newsletter
    async submitContact(contactData) {
        const { data, error } = await this.supabase
            .from('contact_submissions')
            .insert([contactData])
            .select();
        return { data, error };
    }

    async subscribeNewsletter(email) {
        const { data, error } = await this.supabase
            .from('newsletter_subscriptions')
            .insert([{ email, status: 'active' }])
            .select();
        return { data, error };
    }

    // Vendor Registration
    async submitVendorRegistration(registrationData) {
        const { data, error } = await this.supabase
            .from('vendor_registrations')
            .insert([registrationData])
            .select();
        return { data, error };
    }
}

// Export singleton instance
const dbService = new DatabaseService();
