let supabase, agentData, offlineQueue = [];

document.addEventListener('DOMContentLoaded', async () => {
    await authMiddleware.protectPage(['field_agent']);
    supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    
    const user = authMiddleware.getCurrentUser();
    document.getElementById('agentName').textContent = user.name;
    
    await loadAgentData();
    loadOverview();
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            switchPage(item.dataset.page);
        });
    });
    
    // Settings modal handler
    const settingsNavItem = document.getElementById('settingsNavItem');
    if (settingsNavItem) {
        settingsNavItem.addEventListener('click', (e) => {
            e.preventDefault();
            if (typeof openSettingsModal === 'function') {
                openSettingsModal();
            }
        });
    }
    
    // Log visit button handler
    const logVisitBtn = document.getElementById('logVisitBtn');
    if (logVisitBtn) {
        logVisitBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logVisit();
        });
    }
    
    // Copy affiliate link handlers
    document.querySelectorAll('.btn-copy').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const copyType = btn.dataset.copyType;
            if (copyType && typeof copyAffiliateLink === 'function') {
                copyAffiliateLink(copyType);
            }
        });
    });
    
    document.getElementById('orderForm').addEventListener('submit', createOrder);
    document.getElementById('logoutBtn').addEventListener('click', () => authMiddleware.logout());
    
    window.addEventListener('online', syncOfflineData);
});

async function loadAgentData() {
    const user = authMiddleware.getCurrentUser();
    const { data } = await supabase.from('field_agents').select('*').eq('user_id', user.id).single();
    agentData = data;
}

function switchPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(`${page}-page`).classList.add('active');
    document.querySelector(`[data-page="${page}"]`).classList.add('active');
    document.getElementById('pageTitle').textContent = page.charAt(0).toUpperCase() + page.slice(1);
    
    if (page === 'vendors') loadVendors();
    else if (page === 'visits') loadVisits();
    else if (page === 'orders') loadOrderForm();
    else if (page === 'performance') loadPerformance();
}

async function loadOverview() {
    document.getElementById('todayVisits').textContent = '0';
    document.getElementById('assignedVendors').textContent = '0';
    document.getElementById('ordersCreated').textContent = '0';
    document.getElementById('commission').textContent = 'KES 0';
}

async function loadVendors() {
    const { data: vendors } = await supabase.from('vendors').select('*').eq('status', 'active');
    
    if (!vendors || vendors.length === 0) {
        document.getElementById('vendorsList').innerHTML = XSSProtection.sanitize('<p>No vendors assigned</p>');
        return;
    }
    
    const html = `<table class="table"><thead><tr><th>Business</th><th>County</th><th>Phone</th><th>Action</th></tr></thead><tbody>${vendors.map(v => `<tr><td>${v.business_name}</td><td>${v.county}</td><td>${v.phone}</td><td><button class="btn-primary" onclick="visitVendor('${v.id}')">Visit</button></td></tr>`).join('')}</tbody></table>`;
    document.getElementById('vendorsList').innerHTML = XSSProtection.sanitize(html);
}

async function loadVisits() {
    document.getElementById('visitsList').innerHTML = XSSProtection.sanitize('<p>No visits logged yet</p>');
}

async function loadOrderForm() {
    const { data: vendors } = await supabase.from('vendors').select('*').eq('status', 'active');
    const { data: suppliers } = await supabase.from('suppliers').select('*').eq('status', 'approved');
    
    const vendorSelect = document.getElementById('vendorSelect');
    vendorSelect.innerHTML = XSSProtection.sanitize('<option value="">Select Vendor</option>' + (vendors?.map(v => `<option value="${v.id}">${v.business_name}</option>`).join('') || ''));
    
    const supplierSelect = document.getElementById('supplierSelect');
    supplierSelect.innerHTML = XSSProtection.sanitize('<option value="">Select Supplier</option>' + (suppliers?.map(s => `<option value="${s.id}">${s.company_name}</option>`).join('') || ''));
}

async function createOrder(e) {
    e.preventDefault();
    
    const orderData = {
        vendor_id: document.getElementById('vendorSelect').value,
        supplier_id: document.getElementById('supplierSelect').value,
        order_number: 'ORD-' + Date.now(),
        product_name: document.getElementById('productName').value,
        quantity: parseInt(document.getElementById('quantity').value),
        total_amount: parseFloat(document.getElementById('amount').value),
        status: 'pending_admin',
        order_type: 'agent_created',
        created_at: new Date().toISOString()
    };
    
    if (navigator.onLine) {
        const { error } = await supabase.from('orders').insert([orderData]);
        if (error) {
            alert('Error: ' + error.message);
        } else {
            alert('Order created successfully!\n\nNote: This order will be reviewed by Admin or Supervisor for approval.\nYou cannot approve orders directly.');
            document.getElementById('orderForm').reset();
        }
    } else {
        offlineQueue.push(orderData);
        localStorage.setItem('offlineQueue', JSON.stringify(offlineQueue));
        alert('Offline: Order saved locally and will sync when online');
        document.getElementById('orderForm').reset();
    }
}

async function syncOfflineData() {
    const queue = JSON.parse(localStorage.getItem('offlineQueue') || '[]');
    if (queue.length > 0) {
        for (const data of queue) {
            await supabase.from('orders').insert([data]);
        }
        localStorage.removeItem('offlineQueue');
        alert('Offline data synced successfully!');
    }
}

async function loadPerformance() {
    document.getElementById('performanceData').innerHTML = XSSProtection.sanitize('<p>Performance data coming soon</p>');
}

window.visitVendor = function(vendorId) {
    alert('Visit log feature coming soon for vendor: ' + vendorId);
};

// Placeholder function for logging visits
function logVisit() {
    alert('Visit log feature coming soon');
}
