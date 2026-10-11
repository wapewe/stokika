// XSS Protection: Using sanitize() helper from xss-protection.js
// Make sure xss-protection.js is loaded in your HTML file

let supabase, supervisorData;

document.addEventListener('DOMContentLoaded', async () => {
    await authMiddleware.protectPage(['supervisor']);
    supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    
    const user = authMiddleware.getCurrentUser();
    document.getElementById('supervisorName').textContent = user.name;
    
    await loadSupervisorData();
    loadOverview();
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            switchPage(page);
        });
    });
    
    document.getElementById('logoutBtn').addEventListener('click', () => authMiddleware.logout());
});

async function loadSupervisorData() {
    const user = authMiddleware.getCurrentUser();
    const { data } = await supabase.from('supervisors').select('*').eq('user_id', user.id).single();
    supervisorData = data;
}

function switchPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(`${page}-page`).classList.add('active');
    document.querySelector(`[data-page="${page}"]`).classList.add('active');
    document.getElementById('pageTitle').textContent = page.charAt(0).toUpperCase() + page.slice(1);
    
    if (page === 'agents') loadAgents();
    else if (page === 'vendors') loadVendors();
    else if (page === 'reports') loadReports();
    else if (page === 'territory') loadTerritory();
    else if (page === 'orders') loadPendingOrders();
}

async function loadOverview() {
    const { data: agents } = await supabase.from('field_agents').select('*').eq('approval_status', 'approved');
    const activeAgents = agents?.filter(a => a.status === 'active') || [];
    
    document.getElementById('totalAgents').textContent = agents?.length || 0;
    document.getElementById('activeAgents').textContent = activeAgents.length;
    document.getElementById('totalVendors').textContent = '0';
    document.getElementById('pendingTasks').textContent = '0';
    
    document.getElementById('recentActivity').textContent = 'No recent activity';
}

async function loadAgents() {
    const { data: agents } = await supabase.from('field_agents').select('*').eq('approval_status', 'approved');
    
    if (!agents || agents.length === 0) {
        document.getElementById('agentsList').textContent = 'No agents assigned';
        return;
    }
    
    const html = `<table class="table"><thead><tr><th>Agent #</th><th>Name</th><th>Phone</th><th>County</th><th>Status</th></tr></thead><tbody>${agents.map(a => `<tr><td>${XSSProtection.escapeHtml(a.agent_number)}</td><td>${XSSProtection.escapeHtml(a.full_name)}</td><td>${XSSProtection.escapeHtml(a.phone)}</td><td>${XSSProtection.escapeHtml(a.county)}</td><td><span class="badge ${a.status}">${XSSProtection.escapeHtml(a.status)}</span></td></tr>`).join('')}</tbody></table>`;
    document.getElementById('agentsList').innerHTML = html;
}

async function loadVendors() {
    const { data: vendors } = await supabase.from('vendors').select('*').eq('status', 'active');
    
    if (!vendors || vendors.length === 0) {
        document.getElementById('vendorsList').textContent = 'No vendors found';
        return;
    }
    
    const html = `<table class="table"><thead><tr><th>Business</th><th>County</th><th>Phone</th><th>Status</th></tr></thead><tbody>${vendors.map(v => `<tr><td>${XSSProtection.escapeHtml(v.business_name)}</td><td>${XSSProtection.escapeHtml(v.county)}</td><td>${XSSProtection.escapeHtml(v.phone)}</td><td><span class="badge active">${XSSProtection.escapeHtml(v.status)}</span></td></tr>`).join('')}</tbody></table>`;
    document.getElementById('vendorsList').innerHTML = html;
}

async function loadReports() {
    document.getElementById('reportsList').textContent = 'No reports submitted yet';
}

async function loadTerritory() {
    document.getElementById('territoryName').textContent = supervisorData?.assigned_region || supervisorData?.county || 'Not assigned';
}

async function loadPendingOrders() {
    const alertDiv = document.getElementById('pendingOrdersAlert');
    const listDiv = document.getElementById('pendingOrdersList');
    
    if (!supervisorData?.is_active || !supervisorData?.can_approve_orders) {
        alertDiv.style.display = 'block';
        alertDiv.textContent = supervisorData?.is_active ? 'You need order approval permission from admin' : 'Your supervisor account is not activated by admin';
        listDiv.innerHTML = '<p>Contact admin to activate your account and grant order approval permissions.</p>';
        return;
    }
    
    alertDiv.style.display = 'none';
    
    const { data: orders } = await supabase.from('orders').select('*, vendors(business_name), suppliers(company_name)').eq('status', 'pending_admin').order('created_at', { ascending: false });
    
    if (!orders || orders.length === 0) {
        listDiv.textContent = 'No pending orders for approval';
        return;
    }
    
    const html = `<table class="table"><thead><tr><th>Order #</th><th>Vendor</th><th>Supplier</th><th>Product</th><th>Amount</th><th>Actions</th></tr></thead><tbody>${orders.map(o => `<tr><td>${XSSProtection.escapeHtml(o.order_number)}</td><td>${XSSProtection.escapeHtml(o.vendors?.business_name || 'N/A')}</td><td>${XSSProtection.escapeHtml(o.suppliers?.company_name || 'Stokika')}</td><td>${XSSProtection.escapeHtml(o.product_name || 'N/A')}</td><td>KES ${XSSProtection.escapeHtml(o.total_amount)}</td><td><button class="btn-action btn-approve" onclick="approveOrder('${o.id}')">Approve</button><button class="btn-action btn-reject" onclick="rejectOrder('${o.id}')">Reject</button></td></tr>`).join('')}</tbody></table>`;
    listDiv.innerHTML = html;
}

window.approveOrder = async function(orderId) {
    if (!confirm('Approve this order?')) return;
    
    const { error } = await supabase.from('orders').update({ status: 'pending_supplier', updated_at: new Date().toISOString() }).eq('id', orderId);
    
    if (error) {
        alert('Error: ' + error.message);
    } else {
        alert('Order approved and sent to supplier');
        loadPendingOrders();
    }
};

window.rejectOrder = async function(orderId) {
    const reason = prompt('Reason for rejection:');
    if (!reason) return;
    
    const { error } = await supabase.from('orders').update({ status: 'declined', notes: reason, updated_at: new Date().toISOString() }).eq('id', orderId);
    
    if (error) {
        alert('Error: ' + error.message);
    } else {
        alert('Order rejected');
        loadPendingOrders();
    }
}
