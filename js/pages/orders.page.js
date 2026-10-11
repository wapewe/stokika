let supabase;
let currentPage = 1;
let searchQuery = '';
const itemsPerPage = 10;

if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
    supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
}

async function loadOrders(page = 1) {
    const container = document.getElementById('ordersList');
    if (!supabase) {
        container.innerHTML = XSSProtection.sanitize('<p>Unable to connect to database.</p>');
        return;
    }
    
    currentPage = page;
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage - 1;

    try {
        let query = supabase.from('orders').select('*, suppliers(company_name)', { count: 'exact' });
        
        if (searchQuery) {
            query = query.or(`order_number.ilike.%${searchQuery}%,status.ilike.%${searchQuery}%`);
        }
        
        const { data, error, count } = await query.range(start, end).order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            container.innerHTML = XSSProtection.sanitize('<p class="empty-state">No orders found.</p>');
            document.getElementById('paginationContainer').innerHTML = '';
        } else {
            const statusMap = {
                delivered: 'status-delivered',
                pending: 'status-pending',
                processing: 'status-processing',
                pending_admin: 'status-pending-admin',
                pending_supplier: 'status-pending-supplier'
            };
            
            const sanitize = XSSProtection.sanitize;
            
            container.innerHTML = `<div class="orders-table-container">
                <table class="orders-table">
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Supplier</th>
                            <th>Status</th>
                            <th class="text-right">Amount</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(o => `
                            <tr>
                                <td>${sanitize(o.order_number || 'N/A')}</td>
                                <td>${sanitize(o.suppliers?.company_name || 'Stokika')}</td>
                                <td><span class="status-badge ${sanitize(statusMap[o.status] || 'status-pending')}">${sanitize(o.status || 'pending')}</span></td>
                                <td class="text-right">KES ${sanitize((o.total_amount || 0).toLocaleString())}</td>
                                <td>${sanitize(new Date(o.created_at).toLocaleDateString())}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>`;
            
            displayPagination(count, page);
        }
    } catch (err) {
        container.innerHTML = XSSProtection.sanitize('<p>Error loading orders.</p>');
    }
}

function displayPagination(totalCount, currentPage) {
    const container = document.getElementById('paginationContainer');
    const totalPages = Math.ceil(totalCount / itemsPerPage);
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '';
    
    if (currentPage > 1) {
        html += `<button class="pagination-btn" data-page="${currentPage - 1}">Previous</button>`;
    }
    
    html += `<span class="pagination-info">Page ${currentPage} of ${totalPages}</span>`;
    
    if (currentPage < totalPages) {
        html += `<button class="pagination-btn" data-page="${currentPage + 1}">Next</button>`;
    }
    
    container.innerHTML = html;
    
    container.querySelectorAll('.pagination-btn').forEach(btn => {
        btn.addEventListener('click', () => loadOrders(parseInt(btn.dataset.page)));
    });
}

// Initialize page on DOMContentLoaded
document.addEventListener('DOMContentLoaded', async () => {
    // Auth protection
    await authMiddleware.protectPage(['vendor']);
    
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.trim();
            loadOrders(1);
        });
        
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchQuery = e.target.value.trim();
                loadOrders(1);
            }
        });
    }
    
    // Load initial orders
    loadOrders(1);
});
