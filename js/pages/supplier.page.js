let supabase;
let supplierId = localStorage.getItem('vendor_id');

if (!supplierId || localStorage.getItem('user_role') !== 'supplier') {
    window.location.href = 'signin.html';
}

if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
    supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
}

function switchTab(tab) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    if (tab === 'orders') {
        document.getElementById('orders-tab').classList.add('active');
        loadOrders();
    } else if (tab === 'inventory') {
        document.getElementById('inventory-tab').classList.add('active');
        loadInventory();
    } else if (tab === 'payments') {
        document.getElementById('payments-tab').classList.add('active');
        loadPayments();
    }
}

async function loadSupplierData() {
    if (!supabase || !supplierId) return;
    
    try {
        const { data, error } = await supabase
            .from('suppliers')
            .select('company_name')
            .eq('id', supplierId)
            .single();
        
        if (error) throw error;
        
        if (data) {
            document.getElementById('supplierName').textContent = data.company_name || 'Supplier';
        }
    } catch (err) {
        console.error('Error loading supplier data:', err);
    }
}

async function loadStats() {
    if (!supabase || !supplierId) return;
    
    try {
        const { data: orders } = await supabase
            .from('orders')
            .select('status, total_amount')
            .eq('supplier_id', supplierId);
        
        const pending = orders?.filter(o => o.status === 'pending_supplier').length || 0;
        const completed = orders?.filter(o => o.status === 'delivered').length || 0;
        const revenue = orders?.filter(o => o.status === 'delivered').reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
        
        document.getElementById('pendingOrders').textContent = pending;
        document.getElementById('completedOrders').textContent = completed;
        document.getElementById('totalRevenue').textContent = 'KES ' + revenue.toLocaleString();
        
        const { data: payments } = await supabase
            .from('supplier_payments')
            .select('amount')
            .eq('supplier_id', supplierId)
            .eq('status', 'pending');
        
        const pendingPayments = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
        document.getElementById('pendingPayments').textContent = 'KES ' + pendingPayments.toLocaleString();
        
        loadRecentOrders();
    } catch (err) {
        console.error('Error loading stats:', err);
    }
}

async function loadRecentOrders() {
    if (!supabase || !supplierId) return;
    
    try {
        const { data, error } = await supabase
            .from('orders')
            .select('*, vendors(business_name)')
            .eq('supplier_id', supplierId)
            .order('created_at', { ascending: false })
            .limit(5);
        
        if (error) throw error;
        
        const html = data && data.length > 0 ? `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Order #</th>
                        <th>Vendor</th>
                        <th>Product</th>
                        <th>Quantity</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(o => `
                        <tr>
                            <td>${o.order_number}</td>
                            <td>${o.vendors?.business_name || 'N/A'}</td>
                            <td>${o.product_name || 'N/A'}</td>
                            <td>${o.quantity || 0}</td>
                            <td>KES ${o.total_amount || 0}</td>
                            <td><span class="status-badge status-${o.status}">${o.status.replace('_', ' ')}</span></td>
                            <td>
                                ${o.status === 'pending_supplier' ? `
                                    <button class="btn-action btn-approve" onclick="acceptOrder('${o.id}')">Accept</button>
                                    <button class="btn-action btn-delete" onclick="declineOrder('${o.id}')">Decline</button>
                                ` : ''}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : '<p class="no-data">No recent orders</p>';
        
        document.getElementById('recentOrders').innerHTML = XSSProtection.sanitize(html;
    } catch (err) {
        console.error('Error loading recent orders:', err);
    }
}

async function loadOrders() {
    if (!supabase || !supplierId) return;
    
    document.getElementById('ordersLoading').style.display = 'block';
    const statusFilter = document.getElementById('orderStatusFilter').value;
    
    try {
        let query = supabase
            .from('orders')
            .select('*, vendors(business_name)')
            .eq('supplier_id', supplierId);
        
        if (statusFilter) query = query.eq('status', statusFilter);
        
        const { data, error } = await query.order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const html = data && data.length > 0 ? `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Order #</th>
                        <th>Vendor</th>
                        <th>Product</th>
                        <th>Quantity</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(o => `
                        <tr>
                            <td>${o.order_number}</td>
                            <td>${o.vendors?.business_name || 'N/A'}</td>
                            <td>${o.product_name || 'N/A'}</td>
                            <td>${o.quantity || 0}</td>
                            <td>KES ${o.total_amount || 0}</td>
                            <td><span class="status-badge status-${o.status}">${o.status.replace('_', ' ')}</span></td>
                            <td>${new Date(o.created_at).toLocaleDateString()}</td>
                            <td>
                                ${o.status === 'pending_supplier' ? `
                                    <button class="btn-action btn-approve" onclick="acceptOrder('${o.id}')">Accept</button>
                                    <button class="btn-action btn-delete" onclick="declineOrder('${o.id}')">Decline</button>
                                ` : o.status === 'accepted' ? `
                                    <button class="btn-action btn-edit" onclick="markProcessing('${o.id}')">Processing</button>
                                ` : o.status === 'processing' ? `
                                    <button class="btn-action btn-approve" onclick="markDelivered('${o.id}')">Delivered</button>
                                ` : ''}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : '<p class="no-data">No orders found</p>';
        
        document.getElementById('ordersTable').innerHTML = XSSProtection.sanitize(html;
    } catch (err) {
        console.error('Error loading orders:', err);
        document.getElementById('ordersTable').innerHTML =XSSProtection.sanitize( XSSProtection.sanitize(<p class="no-data">Error loading orders</p>';
    }
    
    document.getElementById('ordersLoading').style.display = 'none';
}

async function acceptOrder(orderId) {
    if (!confirm('Accept this order?')) return;
    
    try {
        const { error } = await supabase
            .from('orders')
            .update({ status: 'accepted', updated_at: new Date().toISOString() })
            .eq('id', orderId);
        
        if (error) throw error;
        
        alert('Order accepted successfully');
        loadStats();
        loadOrders();
    } catch (err) {
        console.error('Error accepting order:', err);
        alert('Error: ' + err.message);
    }
}

async function declineOrder(orderId) {
    const reason = prompt('Reason for declining:');
    if (!reason) return;
    
    try {
        const { error } = await supabase
            .from('orders')
            .update({ 
                status: 'declined', 
                decline_reason: reason,
                updated_at: new Date().toISOString() 
            })
            .eq('id', orderId);
        
        if (error) throw error;
        
        alert('Order declined');
        loadStats();
        loadOrders();
    } catch (err) {
        console.error('Error declining order:', err);
        alert('Error: ' + err.message);
    }
}

async function markProcessing(orderId) {
    try {
        const { error } = await supabase
            .from('orders')
            .update({ status: 'processing', updated_at: new Date().toISOString() })
            .eq('id', orderId);
        
        if (error) throw error;
        
        alert('Order marked as processing');
        loadOrders();
    } catch (err) {
        console.error('Error:', err);
        alert('Error: ' + err.message);
    }
}

async function markDelivered(orderId) {
    if (!confirm('Mark this order as delivered?')) return;
    
    try {
        const { error } = await supabase
            .from('orders')
            .update({ 
                status: 'delivered', 
                delivered_at: new Date().toISOString(),
                updated_at: new Date().toISOString() 
            })
            .eq('id', orderId);
        
        if (error) throw error;
        
        alert('Order marked as delivered');
        loadStats();
        loadOrders();
    } catch (err) {
        console.error('Error:', err);
        alert('Error: ' + err.message);
    }
}

async function loadInventory() {
    if (!supabase || !supplierId) return;
    
    document.getElementById('inventoryLoading').style.display = 'block';
    
    try {
        const { data, error } = await supabase
            .from('supplier_inventory')
            .select('*')
            .eq('supplier_id', supplierId)
            .order('product_name');
        
        if (error) throw error;
        
        const html = data && data.length > 0 ? `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Stock</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(p => `
                        <tr>
                            <td>${p.product_name}</td>
                            <td>${p.category || 'N/A'}</td>
                            <td>KES ${p.price || 0}</td>
                            <td>${p.stock_quantity || 0}</td>
                            <td><span class="status-badge status-${p.stock_quantity > 10 ? 'approved' : 'pending'}">${p.stock_quantity > 10 ? 'In Stock' : 'Low Stock'}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : '<p class="no-data">No products in inventory</p>';
        
        document.getElementById('inventoryTable').innerHTML = XSSProtection.sanitize(html;
    } catch (err) {
        console.error('Error loading inventory:', err);
        document.getElementById('inventoryTable').innerHTML =XSSProtection.sanitize( XSSProtection.sanitize(<p class="no-data">Error loading inventory</p>';
    }
    
    document.getElementById('inventoryLoading').style.display = 'none';
}

async function loadPayments() {
    if (!supabase || !supplierId) return;
    
    document.getElementById('paymentsLoading').style.display = 'block';
    
    try {
        const { data, error } = await supabase
            .from('supplier_payments')
            .select('*')
            .eq('supplier_id', supplierId)
            .order('payment_date', { ascending: false });
        
        if (error) throw error;
        
        const html = data && data.length > 0 ? `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Payment Date</th>
                        <th>Amount</th>
                        <th>Reference</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(p => `
                        <tr>
                            <td>${new Date(p.payment_date).toLocaleDateString()}</td>
                            <td>KES ${p.amount || 0}</td>
                            <td>${p.reference || 'N/A'}</td>
                            <td><span class="status-badge status-${p.status}">${p.status}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : '<p class="no-data">No payment history</p>';
        
        document.getElementById('paymentsTable').innerHTML = XSSProtection.sanitize(html;
    } catch (err) {
        console.error('Error loading payments:', err);
        document.getElementById('paymentsTable').innerHTML =XSSProtection.sanitize( XSSProtection.sanitize(<p class="no-data">Error loading payments</p>';
    }
    
    document.getElementById('paymentsLoading').style.display = 'none';
}

function openAddProductModal() {
    document.getElementById('addProductModal').classList.add('show');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

document.getElementById('addProductForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('productName').value;
    const category = document.getElementById('productCategory').value;
    const price = document.getElementById('productPrice').value;
    const stock = document.getElementById('productStock').value;
    
    try {
        const { error } = await supabase
            .from('supplier_inventory')
            .insert([{
                supplier_id: supplierId,
                product_name: name,
                category: category,
                price: parseFloat(price),
                stock_quantity: parseInt(stock),
                created_at: new Date().toISOString()
            }]);
        
        if (error) throw error;
        
        alert('Product added successfully');
        closeModal('addProductModal');
        document.getElementById('addProductForm').reset();
        loadInventory();
    } catch (err) {
        console.error('Error adding product:', err);
        alert('Error: ' + err.message);
    }
});

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.clear();
        window.location.href = 'signin.html';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadSupplierData();
    loadStats();
});
