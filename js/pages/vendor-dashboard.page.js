class VendorDashboard {
    constructor() {
        this.supabase = window.supabase;
        this.vendorId = null;
        this.shopProfile = null;
    }

    async init() {
        try {
            await this.checkAuth();
            await this.loadDashboardData();
            this.setupTabs();
            this.setupForms();
        } catch (err) {
            console.error('Dashboard init error:', err);
            this.showAlert('Failed to load dashboard. Please refresh.', 'error');
        }
    }

    async checkAuth() {
        const { data: { session } } = await this.supabase.auth.getSession();
        if (!session) {
            window.location.href = 'signin.html';
            return;
        }
        this.vendorId = session.user.id;
        document.getElementById('vendorEmail').textContent = session.user.email || '';
    }

    async loadDashboardData() {
        await Promise.all([
            this.loadShopProfile(),
            this.loadStats(),
            this.loadProducts(),
            this.loadOrders()
        ]);
    }

    async loadShopProfile() {
        const { data } = await this.supabase
            .from('vendor_shop_profiles')
            .select('*')
            .eq('vendor_id', this.vendorId)
            .single();

        this.shopProfile = data;

        if (data) {
            document.getElementById('shopStatus').textContent = data.is_active ? 'Active' : 'Inactive';
            document.getElementById('shopStatus').className = 'badge ' + (data.is_active ? 'badge-green' : 'badge-yellow');
            document.getElementById('viewShopBtn').href = 'vendor-shop.html?shop=' + data.shop_slug;
            this.populateShopForm(data);
        } else {
            document.getElementById('shopStatus').textContent = 'Not Set Up';
            document.getElementById('shopStatus').className = 'badge badge-yellow';
        }
    }

    populateShopForm(data) {
        const fields = ['shop_name', 'shop_slug', 'tagline', 'description', 'whatsapp_number', 'email', 'website_url'];
        fields.forEach(f => {
            const el = document.getElementById('field_' + f);
            if (el && data[f]) el.value = data[f];
        });
    }

    async loadStats() {
        const { data: orders } = await this.supabase
            .from('customer_orders')
            .select('total_amount, order_status')
            .eq('vendor_id', this.vendorId);

        const total = (orders || []).reduce((s, o) => s + parseFloat(o.total_amount || 0), 0);
        const pending = (orders || []).filter(o => o.order_status === 'pending').length;
        const completed = (orders || []).filter(o => o.order_status === 'delivered').length;

        const { count: productCount } = await this.supabase
            .from('vendor_inventory')
            .select('id', { count: 'exact', head: true })
            .eq('vendor_id', this.vendorId)
            .eq('is_active', true);

        this.setEl('statRevenue', 'KES ' + total.toLocaleString());
        this.setEl('statOrders', (orders || []).length);
        this.setEl('statPending', pending);
        this.setEl('statProducts', productCount || 0);
        this.setEl('statCompleted', completed);
    }

    async loadProducts() {
        const { data: products } = await this.supabase
            .from('vendor_inventory')
            .select('*')
            .eq('vendor_id', this.vendorId)
            .order('created_at', { ascending: false })
            .limit(20);

        const tbody = document.getElementById('productsTableBody');
        if (!tbody) return;

        if (!products || !products.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><i class="fas fa-box-open"></i><p>No products yet. Add your first product.</p></td></tr>';
            return;
        }

        tbody.innerHTML = products.map(p =>
            '<tr>' +
                '<td>' + p.product_name + '</td>' +
                '<td>KES ' + parseFloat(p.selling_price || 0).toLocaleString() + '</td>' +
                '<td>' + (p.stock_quantity || 0) + '</td>' +
                '<td>' + (p.category || '—') + '</td>' +
                '<td><span class="badge ' + (p.is_active ? 'badge-green' : 'badge-yellow') + '">' + (p.is_active ? 'Active' : 'Inactive') + '</span></td>' +
            '</tr>'
        ).join('');
    }

    async loadOrders() {
        const { data: orders } = await this.supabase
            .from('customer_orders')
            .select('*')
            .eq('vendor_id', this.vendorId)
            .order('created_at', { ascending: false })
            .limit(10);

        const container = document.getElementById('ordersContainer');
        if (!container) return;

        if (!orders || !orders.length) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-shopping-bag"></i><p>No orders yet.</p></div>';
            return;
        }

        const statusClass = { pending: 'badge-yellow', confirmed: 'badge-green', delivered: 'badge-green', cancelled: 'badge-red' };

        container.innerHTML = orders.map(o =>
            '<div class="order-card">' +
                '<div class="order-header">' +
                    '<span class="order-number">' + o.order_number + '</span>' +
                    '<span class="badge ' + (statusClass[o.order_status] || 'badge-yellow') + '">' + o.order_status + '</span>' +
                '</div>' +
                '<div class="order-meta">' +
                    o.customer_name + ' · ' + o.customer_phone +
                    ' · <strong>KES ' + parseFloat(o.total_amount || 0).toLocaleString() + '</strong>' +
                '</div>' +
            '</div>'
        ).join('');
    }

    setupTabs() {
        const switchTab = (tabName) => {
            document.querySelectorAll('.tab-btn, .nav-item[data-tab]').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            document.querySelectorAll('[data-tab="' + tabName + '"]').forEach(b => b.classList.add('active'));
            const panel = document.getElementById('tab-' + tabName);
            if (panel) panel.classList.add('active');
            const titles = { overview: 'Overview', products: 'Products', orders: 'Orders', shop: 'Shop Setup' };
            this.setEl('pageTitle', titles[tabName] || 'Dashboard');
        };

        document.querySelectorAll('[data-tab]').forEach(btn => {
            btn.addEventListener('click', e => {
                e.preventDefault();
                switchTab(btn.dataset.tab);
            });
        });

        document.querySelectorAll('[data-tab-link]').forEach(btn => {
            btn.addEventListener('click', () => switchTab(btn.dataset.tabLink));
        });
    }

    setupForms() {
        const shopForm = document.getElementById('shopSetupForm');
        if (shopForm) {
            shopForm.addEventListener('submit', async e => {
                e.preventDefault();
                await this.saveShopProfile(new FormData(shopForm));
            });
        }

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                await this.supabase.auth.signOut();
                window.location.href = 'signin.html';
            });
        }
    }

    async saveShopProfile(formData) {
        const payload = {
            vendor_id: this.vendorId,
            shop_name: formData.get('shop_name'),
            shop_slug: formData.get('shop_slug'),
            tagline: formData.get('tagline'),
            description: formData.get('description'),
            whatsapp_number: formData.get('whatsapp_number'),
            email: formData.get('email'),
            website_url: formData.get('website_url'),
            is_active: true
        };

        const { error } = this.shopProfile
            ? await this.supabase.from('vendor_shop_profiles').update(payload).eq('vendor_id', this.vendorId)
            : await this.supabase.from('vendor_shop_profiles').insert([payload]);

        if (error) {
            this.showAlert('Failed to save shop profile: ' + error.message, 'error');
        } else {
            this.showAlert('Shop profile saved successfully!', 'success');
            await this.loadShopProfile();
        }
    }

    setEl(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    showAlert(message, type) {
        const el = document.getElementById('dashboardAlert');
        if (!el) return;
        el.textContent = message;
        el.className = 'alert alert-' + type;
        el.style.display = 'block';
        setTimeout(() => { el.style.display = 'none'; }, 4000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const dashboard = new VendorDashboard();
    dashboard.init();
});
