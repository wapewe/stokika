let supabase;

document.addEventListener('DOMContentLoaded', async () => {
    await authMiddleware.protectPage(['vendor', 'admin']);
    supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    
    loadAnalytics();
    
    document.getElementById('periodFilter').addEventListener('change', loadAnalytics);
    document.getElementById('logoutBtn').addEventListener('click', () => authMiddleware.logout());
});

async function loadAnalytics() {
    const period = parseInt(document.getElementById('periodFilter').value);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);
    
    const { data: orders } = await supabase.from('orders').select('*').gte('created_at', startDate.toISOString());
    const { data: payments } = await supabase.from('payments').select('*').gte('created_at', startDate.toISOString());
    
    const totalRevenue = orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
    const totalOrders = orders?.length || 0;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    document.getElementById('totalRevenue').textContent = `KES ${totalRevenue.toLocaleString()}`;
    document.getElementById('totalOrders').textContent = totalOrders;
    document.getElementById('avgOrderValue').textContent = `KES ${avgOrderValue.toFixed(0)}`;
    document.getElementById('growthRate').textContent = '0%';
    
    createRevenueChart(orders || []);
    createStatusChart(orders || []);
    createPaymentChart(payments || []);
    loadTopProducts(orders || []);
}

function createRevenueChart(orders) {
    const ctx = document.getElementById('revenueChart');
    const dates = [...new Set(orders.map(o => new Date(o.created_at).toLocaleDateString()))];
    const revenue = dates.map(date => orders.filter(o => new Date(o.created_at).toLocaleDateString() === date).reduce((sum, o) => sum + o.total_amount, 0));
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Revenue',
                data: revenue,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4
            }]
        },
        options: { responsive: true, maintainAspectRatio: true }
    });
}

function createStatusChart(orders) {
    const ctx = document.getElementById('statusChart');
    const statuses = [...new Set(orders.map(o => o.status))];
    const counts = statuses.map(s => orders.filter(o => o.status === s).length);
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: statuses,
            datasets: [{
                data: counts,
                backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6']
            }]
        },
        options: { responsive: true, maintainAspectRatio: true }
    });
}

function createPaymentChart(payments) {
    const ctx = document.getElementById('paymentChart');
    const methods = [...new Set(payments.map(p => p.payment_method || 'Unknown'))];
    const counts = methods.map(m => payments.filter(p => (p.payment_method || 'Unknown') === m).length);
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: methods,
            datasets: [{
                label: 'Payments',
                data: counts,
                backgroundColor: '#667eea'
            }]
        },
        options: { responsive: true, maintainAspectRatio: true }
    });
}

function loadTopProducts(orders) {
    const products = {};
    orders.forEach(o => {
        if (o.product_name) {
            products[o.product_name] = (products[o.product_name] || 0) + 1;
        }
    });
    
    const sorted = Object.entries(products).sort((a, b) => b[1] - a[1]).slice(0, 5);
    
    if (sorted.length === 0) {
        document.getElementById('topProducts').innerHTML = XSSProtection.sanitize('<p>No product data available</p>');
        return;
    }
    
    const html = '<ul>' + sorted.map(([name, count]) => `<li>${XSSProtection.sanitize(name)}: ${count} orders</li>`).join('') + '</ul>';
    document.getElementById('topProducts').innerHTML = html;
}
