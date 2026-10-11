// Dashboard Data Loader
// Loads data for all dashboard pages

class DashboardLoader {
    constructor() {
        this.vendorId = authMiddleware.getUserId();
        this.userRole = authMiddleware.getUserRole();
        this.userName = authMiddleware.getUserName();
    }

    // Load vendor dashboard data
    async loadVendorDashboard() {
        try {
            const [vendor, orders, payments, inventory] = await Promise.all([
                dbService.getVendorById(this.vendorId),
                dbService.getVendorOrders(this.vendorId),
                dbService.getVendorPayments(this.vendorId),
                dbService.getInventory(this.vendorId)
            ]);

            return {
                vendor: vendor.data,
                orders: orders.data || [],
                payments: payments.data || [],
                inventory: inventory.data || []
            };
        } catch (error) {
            console.error('Error loading vendor dashboard:', error);
            return null;
        }
    }

    // Load supplier dashboard data
    async loadSupplierDashboard() {
        try {
            const [supplier, orders] = await Promise.all([
                dbService.getSupplierById(this.vendorId),
                dbService.getSupplierOrders(this.vendorId)
            ]);

            return {
                supplier: supplier.data,
                orders: orders.data || []
            };
        } catch (error) {
            console.error('Error loading supplier dashboard:', error);
            return null;
        }
    }

    // Display loading state
    showLoading(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML =XSSProtection.sanitize( XSSProtection.sanitize(<div class="loading">Loading...</div>';
        }
    }

    // Display error state
    showError(elementId, message) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = XSSProtection.sanitize(`<div class="error">${sanitize(message)}</div>`;
        }
    }
}

const dashboardLoader = new DashboardLoader();
