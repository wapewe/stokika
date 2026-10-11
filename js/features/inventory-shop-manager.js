// Inventory Shop Management Module
// Handles shop section functionality for inventory.html

let shopManager;

export function showShopSection() {
    // Hide dashboard sections
    document.querySelector('.stats-section')?.classList.add('hidden');
    document.querySelector('.quick-actions')?.classList.add('hidden');
    document.querySelector('.content-grid')?.classList.add('hidden');
    document.querySelector('.card:last-of-type:not(#shopSection)')?.classList.add('hidden');
    
    // Show shop section
    document.getElementById('shopSection')?.classList.remove('hidden');
    
    // Update header
    const headerH1 = document.querySelector('.dashboard-header h1');
    if (headerH1) headerH1.textContent = 'Shop Management';
    
    // Load shop data
    loadShopData();
}

export function hideDashboard() {
    // Show dashboard sections
    document.querySelector('.stats-section')?.classList.remove('hidden');
    document.querySelector('.quick-actions')?.classList.remove('hidden');
    document.querySelector('.content-grid')?.classList.remove('hidden');
    document.querySelector('.card:last-of-type:not(#shopSection)')?.classList.remove('hidden');
    
    // Hide shop section
    document.getElementById('shopSection')?.classList.add('hidden');
    
    // Reset header
    const headerH1 = document.querySelector('.dashboard-header h1');
    if (headerH1) headerH1.textContent = 'Dashboard';
}

export async function loadShopData() {
    if (!shopManager) shopManager = new VendorShopManager();
    
    // Load shop profile
    const profile = await shopManager.getShopProfile();
    const container = document.getElementById('shopStatusContainer');
    
    if (!container) return;
    
    if (profile) {
        container.innerHTML = `
            <div class="shop-status-display">
                <div class="shop-info">
                    <h3 class="shop-name">${escapeHtml(profile.shop_name)}</h3>
                    <p class="shop-detail"><strong>URL:</strong> <a href="vendor-shop.html?shop=${escapeHtml(profile.shop_slug)}" target="_blank" rel="noopener noreferrer" class="shop-link">stokika.com/shop/${escapeHtml(profile.shop_slug)}</a></p>
                    <p class="shop-detail"><strong>Status:</strong> ${profile.is_active ? '✅ Active' : '❌ Inactive'}</p>
                    <p class="shop-detail"><strong>Total Sales:</strong> KES ${parseFloat(profile.total_sales || 0).toLocaleString()}</p>
                </div>
                <button onclick="window.inventoryShop.toggleShopStatus()" class="btn-toggle-shop ${profile.is_active ? 'deactivate' : 'activate'}">
                    ${profile.is_active ? 'Deactivate' : 'Activate'} Shop
                </button>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="shop-no-profile">
                <p>No shop profile found. Create your shop to start selling!</p>
                <button onclick="openShopProfileModal()" class="btn-create-shop">
                    Create Shop Profile
                </button>
            </div>
        `;
    }
    
    // Load dropship products (if function exists)
    if (typeof loadDropshipProducts === 'function') {
        loadDropshipProducts();
    }
}

export async function toggleShopStatus() {
    if (!shopManager) return;
    const profile = await shopManager.getShopProfile();
    if (profile) {
        await shopManager.updateShopProfile({ is_active: !profile.is_active });
        loadShopData();
    }
}

export function viewShopOrders() {
    if (typeof showUserMessage === 'function') {
        showUserMessage('Shop orders management coming soon', 'info');
    } else {
        alert('Shop orders management coming soon');
    }
}

// Helper function to escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize dashboard data loading
export async function initDashboardData() {
    try {
        // Check if authMiddleware exists
        if (typeof authMiddleware !== 'undefined') {
            await authMiddleware.protectPage(['vendor']);
        }
    } catch (error) {
        window.location.href = 'signin.html';
        return;
    }
    
    // Display user name
    const vendorNameDisplay = document.getElementById('vendorNameDisplay');
    if (vendorNameDisplay && typeof authMiddleware !== 'undefined') {
        vendorNameDisplay.textContent = authMiddleware.getUserName();
    }
    
    // Load dashboard data
    if (typeof dashboardLoader !== 'undefined') {
        const data = await dashboardLoader.loadVendorDashboard();
        if (data) {
            // Update stats
            const stockValue = data.inventory.reduce((sum, item) => sum + (item.total_value || 0), 0);
            const greenStatValue = document.querySelector('.stat-card.green .stat-value');
            if (greenStatValue) {
                greenStatValue.textContent = `KES ${stockValue.toLocaleString()}`;
            }
            
            const blueStatValue = document.querySelector('.stat-card.blue .stat-value');
            if (blueStatValue) {
                blueStatValue.textContent = data.orders.filter(o => o.status === 'pending').length;
            }
            
            const pendingPayments = data.payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);
            const yellowStatValue = document.querySelector('.stat-card.yellow .stat-value');
            if (yellowStatValue) {
                yellowStatValue.textContent = `KES ${pendingPayments.toLocaleString()}`;
            }
            
            if (data.vendor) {
                const purpleStatValue = document.querySelector('.stat-card.purple .stat-value');
                if (purpleStatValue) {
                    purpleStatValue.textContent = `KES ${(data.vendor.credit_limit - data.vendor.current_balance).toLocaleString()}`;
                }
            }
            
            // Load recent orders
            const tbody = document.querySelector('.data-table tbody');
            if (tbody) {
                if (data.orders.length > 0) {
                    tbody.innerHTML = data.orders.slice(0, 5).map(order => `
                        <tr>
                            <td>${escapeHtml(order.order_number)}</td>
                            <td>${escapeHtml(order.suppliers?.name || 'N/A')}</td>
                            <td>KES ${order.total_amount.toLocaleString()}</td>
                            <td><span class="status-badge ${escapeHtml(order.status)}">${escapeHtml(order.status)}</span></td>
                            <td>${new Date(order.created_at).toLocaleDateString()}</td>
                        </tr>
                    `).join('');
                } else {
                    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No orders yet</td></tr>';
                }
            }
        }
    }
}
