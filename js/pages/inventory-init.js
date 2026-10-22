/**
 * Inventory Page Initialization
 * Exports inventory shop functions to global scope and sets up event listeners
 */

import { 
    showShopSection, 
    hideDashboard, 
    loadShopData, 
    toggleShopStatus, 
    viewShopOrders, 
    initDashboardData 
} from '../features/inventory-shop-manager.js';

// Make functions available globally for the page
window.inventoryShop = {
    showShopSection,
    hideDashboard,
    loadShopData,
    toggleShopStatus,
    viewShopOrders
};

// Setup event listeners on page load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('✅ Inventory Page Initialized');
    
    // Initialize dashboard data
    await initDashboardData();
    
    // Setup shop section navigation
    const shopNavItem = document.getElementById('shopNavItem');
    if (shopNavItem) {
        shopNavItem.addEventListener('click', (e) => {
            e.preventDefault();
            showShopSection();
        });
    }
    
    // Setup manage shop button
    const manageShopBtn = document.getElementById('manageShopBtn');
    if (manageShopBtn) {
        manageShopBtn.addEventListener('click', showShopSection);
    }
    
    // Setup back to dashboard button
    const backToDashboardBtn = document.getElementById('backToDashboardBtn');
    if (backToDashboardBtn) {
        backToDashboardBtn.addEventListener('click', hideDashboard);
    }
    
    // Setup shop action buttons
    const shopProfileBtn = document.getElementById('shopProfileBtn');
    if (shopProfileBtn && typeof openShopProfileModal === 'function') {
        shopProfileBtn.addEventListener('click', openShopProfileModal);
    }
    
    const shopBrandingBtn = document.getElementById('shopBrandingBtn');
    if (shopBrandingBtn && typeof openShopBrandingModal === 'function') {
        shopBrandingBtn.addEventListener('click', openShopBrandingModal);
    }
    
    const addDropshipProductBtn = document.getElementById('addDropshipProductBtn');
    if (addDropshipProductBtn && typeof openDropshipProductModal === 'function') {
        addDropshipProductBtn.addEventListener('click', openDropshipProductModal);
    }
    
    const viewShopOrdersBtn = document.getElementById('viewShopOrdersBtn');
    if (viewShopOrdersBtn) {
        viewShopOrdersBtn.addEventListener('click', viewShopOrders);
    }
    
    // Setup settings button
    const settingsNavItem = document.getElementById('settingsNavItem');
    if (settingsNavItem && typeof openSettingsModal === 'function') {
        settingsNavItem.addEventListener('click', (e) => {
            e.preventDefault();
            openSettingsModal();
        });
    }
});
