// Vendor Shops Directory Page Module
// Displays all active vendor shops with their stats and branding

import { initSupabase, getSupabaseClient } from '../core/supabase-client.js';

/**
 * Sanitizes HTML content to prevent XSS attacks
 * @param {string} str - String to sanitize
 * @returns {string} - Sanitized string
 */
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Loads and displays all active vendor shops from the database
 */
async function loadVendorShops() {
    try {
        const supabase = getSupabaseClient();

        const { data: shops, error } = await supabase
            .from('vendor_shop_profiles')
            .select('*')
            .eq('is_active', true)
            .order('total_sales', { ascending: false })
            .limit(12);

        if (error) throw error;

        const grid = document.getElementById('shopsGrid');

        if (!shops || shops.length === 0) {
            grid.innerHTML = `
                <div class="grid-full-span">
                    <i class="fas fa-store loading-spinner-icon" style="opacity:0.7;"></i>
                    <h3>No Active Shops Yet</h3>
                    <p>Be the first vendor to create your shop!</p>
                    <a href="vendor-dashboard.html" class="cta-btn" style="margin-top:20px;">Create Your Shop</a>
                </div>`);
            return;
        }

        grid.innerHTML = shops.map(shop => {
            // Sanitize all user-provided content
            const shopName = escapeHtml(shop.shop_name);
            const tagline = shop.tagline ? escapeHtml(shop.tagline) : '';
            const shopSlug = encodeURIComponent(shop.shop_slug || '');
            const logoUrl = shop.logo_url ? escapeHtml(shop.logo_url) : '';
            const avgRating = parseFloat(shop.avg_rating || 0).toFixed(1);
            const totalOrders = parseInt(shop.total_orders || 0);
            const totalSales = parseFloat(shop.total_sales || 0).toLocaleString();

            return `
                <div class="shop-card">
                    <div class="shop-logo">
                        ${logoUrl
                            ? `<img src="${logoUrl}" alt="${shopName}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`
                            : `<i class="fas fa-store"></i>`}
                    </div>
                    <div class="shop-name">${shopName}</div>
                    ${tagline ? `<div class="shop-tagline">${tagline}</div>` : ''}
                    <div class="shop-stats">
                        <div class="stat">
                            <div class="stat-value">⭐ ${avgRating}</div>
                            <div class="stat-label">Rating</div>
                        </div>
                        <div class="stat">
                            <div class="stat-value">${totalOrders}</div>
                            <div class="stat-label">Orders</div>
                        </div>
                        <div class="stat">
                            <div class="stat-value">KES ${totalSales}</div>
                            <div class="stat-label">Sales</div>
                        </div>
                    </div>
                    <a href="vendor-shop.html?shop=${shopSlug}" class="visit-shop-btn">
                        <i class="fas fa-shopping-bag"></i> Visit Shop
                    </a>
                </div>`;
        }).join('');

    } catch (error) {
        console.error('Error loading shops:', error);
        document.getElementById('shopsGrid').innerHTML = `
            <div class="grid-full-span">
                <i class="fas fa-exclamation-triangle loading-spinner-icon"></i>
                <p>Error loading shops. Please try again later.</p>
            </div>`;
    }
}

/**
 * Initializes the vendor shops directory page
 */
async function initPage() {
    try {
        // Initialize Supabase
        await initSupabase();
        
        // Load vendor shops
        await loadVendorShops();
        
    } catch (error) {
        console.error('Page initialization failed:', error);
        const grid = document.getElementById('shopsGrid');
        if (grid) {
            grid.innerHTML = `
                <div class="grid-full-span">
                    <i class="fas fa-exclamation-triangle loading-spinner-icon"></i>
                    <p>Failed to load page. Please refresh.</p>
                </div>`;
        }
    }
}

// Auto-initialize on DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPage);
} else {
    initPage();
}

