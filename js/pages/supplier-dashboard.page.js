let supabase, currentSupplierId = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Protect page first
    await authMiddleware.protectPage(['supplier']);
    
    supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

    const userId = authMiddleware.getUserId();
    document.getElementById('supplierName').textContent = authMiddleware.getUserName() || 'Supplier';

    const { data: supplier } = await supabase
        .from('suppliers').select('id').eq('user_id', userId).single();
    currentSupplierId = supplier ? supplier.id : userId;

    setupNav();
    setupEventHandlers();
    loadPageData('overview');

    document.getElementById('logoutBtn')?.addEventListener('click', () => authMiddleware.logout());
});

function setupEventHandlers() {
    // Settings button handler
    const settingsBtn = document.querySelector('[data-settings]');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openSettingsModal();
        });
    }
    
    // Add product button handler
    const addProductBtn = document.querySelector('[data-add-product]');
    if (addProductBtn) {
        addProductBtn.addEventListener('click', () => {
            addProduct();
        });
    }
}

function openSettingsModal() {
    // Check if the function exists in dashboard-features.js
    if (typeof window.openSettingsModal === 'function') {
        window.openSettingsModal();
    } else {
        console.warn('Settings modal functionality not yet implemented');
        alert('Settings feature coming soon!');
    }
}

function addProduct() {
    // Placeholder for add product functionality
    console.warn('Add product functionality not yet implemented');
    alert('Add product feature coming soon!');
}

function setupNav() {
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
        item.addEventListener('click', e => {
            e.preventDefault();
            const page = item.dataset.page;
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
            item.classList.add('active');
            const panel = document.getElementById(page + '-page');
            if (panel) panel.classList.add('active');
            const titleEl = document.getElementById('pageTitle');
            if (titleEl) titleEl.textContent = item.querySelector('span')?.textContent || page;
            loadPageData(page);
        });
    });
}

function loadPageData(page) {
    switch (page) {
        case 'overview':  loadOverview(); break;
        case 'orders':    loadOrders(); break;
        case 'products':  loadProducts(); break;
        case 'payments':  loadPayments(); break;
        case 'profile':   loadProfile(); break;
    }
}

function setHtml(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
}

function escape(v) {
    return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

async function loadOverview() {
    try {
        const { data: orders } = await supabase
            .from('orders').select('*, vendors(name)')
            .eq('supplier_id', currentSupplierId)
            .order('created_at', { ascending: false });

        const arr = orders || [];
        document.getElementById('totalOrders').textContent = arr.length;
        document.getElementById('pendingOrders').textContent = arr.filter(o => o.status === 'pending').length;
        document.getElementById('totalRevenue').textContent = 'KES ' + arr.reduce((s, o) => s + (o.total_amount || 0), 0).toLocaleString();

        const recentHtml = arr.length
            ? arr.slice(0, 5).map(o =>
                '<div class="order-item">' +
                    '<div><strong>' + escape(o.order_number) + '</strong>' +
                    '<div style="font-size:0.875rem;color:#64748b">' + escape(o.vendors?.name || 'Vendor') + ' — KES ' + escape(o.total_amount?.toLocaleString()) + '</div></div>' +
                    '<span class="status-badge ' + escape(o.status) + '">' + escape(o.status) + '</span>' +
                '</div>').join('')
            : '<div class="empty-state">No orders yet</div>';
        setHtml('recentOrdersList', recentHtml);
    } catch (e) { console.error(e); }
}

async function loadOrders() {
    setHtml('allOrdersList', '<div class="loading">Loading orders...</div>');
    try {
        const { data: orders } = await supabase
            .from('orders').select('*, vendors(name)')
            .eq('supplier_id', currentSupplierId)
            .order('created_at', { ascending: false });

        const arr = orders || [];
        setHtml('allOrdersList', arr.length
            ? arr.map(o =>
                '<div class="order-item">' +
                    '<div><strong>' + escape(o.order_number) + '</strong>' +
                    '<div style="font-size:0.875rem;color:#64748b">' + escape(o.vendors?.name || 'Vendor') + ' — ' + new Date(o.created_at).toLocaleDateString() + '</div>' +
                    '<div style="margin-top:0.5rem">KES ' + escape(o.total_amount?.toLocaleString()) + '</div></div>' +
                    '<span class="status-badge ' + escape(o.status) + '">' + escape(o.status) + '</span>' +
                '</div>').join('')
            : '<div class="empty-state">No orders found</div>');
    } catch (e) { setHtml('allOrdersList', '<div class="empty-state">Error loading orders</div>'); }
}

async function loadProducts() {
    setHtml('productsList', '<div class="loading">Loading products...</div>');
    try {
        const { data: products } = await supabase
            .from('products').select('*').eq('supplier_id', currentSupplierId);

        const arr = products || [];
        document.getElementById('totalProducts').textContent = arr.length;
        setHtml('productsList', arr.length
            ? arr.map(p =>
                '<div class="product-item">' +
                    '<div><strong>' + escape(p.name) + '</strong>' +
                    '<div style="font-size:0.875rem;color:#64748b">' + escape(p.category || 'Uncategorized') + ' — Stock: ' + escape(p.stock_quantity || 0) + '</div></div>' +
                    '<div style="font-weight:600">KES ' + escape(p.unit_price?.toLocaleString()) + '</div>' +
                '</div>').join('')
            : '<div class="empty-state">No products listed yet</div>');
    } catch (e) { setHtml('productsList', '<div class="empty-state">Error loading products</div>'); }
}

async function loadPayments() {
    setHtml('paymentsList', '<div class="loading">Loading payments...</div>');
    try {
        const { data: payments } = await supabase
            .from('payments').select('*, orders(order_number)')
            .eq('supplier_id', currentSupplierId);

        const arr = payments || [];
        setHtml('paymentsList', arr.length
            ? arr.map(p =>
                '<div class="payment-item">' +
                    '<div><strong>' + escape(p.orders?.order_number || 'N/A') + '</strong>' +
                    '<div style="font-size:0.875rem;color:#64748b">' + new Date(p.created_at).toLocaleDateString() + '</div></div>' +
                    '<div><div style="font-weight:600">KES ' + escape(p.amount?.toLocaleString()) + '</div>' +
                    '<span class="status-badge ' + escape(p.status) + '">' + escape(p.status) + '</span></div>' +
                '</div>').join('')
            : '<div class="empty-state">No payment history</div>');
    } catch (e) { setHtml('paymentsList', '<div class="empty-state">Error loading payments</div>'); }
}

async function loadProfile() {
    setHtml('profileContent', '<div class="loading">Loading profile...</div>');
    try {
        const { data: s } = await supabase
            .from('suppliers').select('*').eq('id', currentSupplierId).single();

        if (!s) { setHtml('profileContent', '<div class="empty-state">Profile not found</div>'); return; }

        setHtml('profileContent',
            '<div style="max-width:600px">' +
            field('Company Name', s.name) +
            field('Email', s.email || 'N/A') +
            field('Phone', s.phone) +
            field('Location', s.location || 'N/A') +
            '<div style="margin-bottom:1.5rem"><label style="display:block;font-weight:600;margin-bottom:0.5rem">Status</label>' +
            '<span class="status-badge ' + (s.verified ? 'confirmed' : 'pending') + '">' + (s.verified ? 'Verified' : 'Pending Verification') + '</span></div>' +
            '</div>');
    } catch (e) { setHtml('profileContent', '<div class="empty-state">Error loading profile</div>'); }
}

function field(label, value) {
    return '<div style="margin-bottom:1.5rem"><label style="display:block;font-weight:600;margin-bottom:0.5rem">' +
        label + '</label><div style="padding:0.75rem;background:#f8fafc;border-radius:8px">' + escape(value) + '</div></div>';
}
