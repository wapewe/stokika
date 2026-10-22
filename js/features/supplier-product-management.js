// Supplier Product Management System
class SupplierProductManager {
    constructor() {
        this.supabase = window.supabase;
        this.currentProduct = null;
    }

    // Product CRUD Operations
    async addProduct(productData) {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await this.supabase
                .from('supplier_inventory')
                .insert([{
                    supplier_id: user.id,
                    ...productData,
                    sku: productData.sku || `SKU-${Date.now()}`,
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) throw error;
            showUserMessage('Product added successfully', 'success');
            return data;
        } catch (error) {
            console.error('Error adding product:', error);
            showUserMessage('Failed to add product', 'error');
            throw error;
        }
    }

    async updateProduct(productId, updates) {
        try {
            const { data, error } = await this.supabase
                .from('supplier_inventory')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', productId)
                .select()
                .single();

            if (error) throw error;
            showUserMessage('Product updated successfully', 'success');
            return data;
        } catch (error) {
            console.error('Error updating product:', error);
            showUserMessage('Failed to update product', 'error');
            throw error;
        }
    }

    async deleteProduct(productId) {
        try {
            const { error } = await this.supabase
                .from('supplier_inventory')
                .update({ is_active: false })
                .eq('id', productId);

            if (error) throw error;
            showUserMessage('Product deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting product:', error);
            showUserMessage('Failed to delete product', 'error');
            throw error;
        }
    }

    async getProducts(filters = {}) {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            let query = this.supabase
                .from('supplier_inventory')
                .select('*')
                .eq('supplier_id', user.id)
                .order('created_at', { ascending: false });

            if (filters.category) query = query.eq('category', filters.category);
            if (filters.is_active !== undefined) query = query.eq('is_active', filters.is_active);

            const { data, error } = await query;
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching products:', error);
            return [];
        }
    }

    // Product Variants
    async addVariant(productId, variantData) {
        try {
            const { data, error } = await this.supabase
                .from('product_variants')
                .insert([{ product_id: productId, ...variantData }])
                .select()
                .single();

            if (error) throw error;
            showUserMessage('Variant added successfully', 'success');
            return data;
        } catch (error) {
            console.error('Error adding variant:', error);
            showUserMessage('Failed to add variant', 'error');
            throw error;
        }
    }

    async getVariants(productId) {
        try {
            const { data, error } = await this.supabase
                .from('product_variants')
                .select('*')
                .eq('product_id', productId)
                .eq('is_active', true);

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching variants:', error);
            return [];
        }
    }

    // Categories
    async getCategories() {
        try {
            const { data, error } = await this.supabase
                .from('product_categories')
                .select('*')
                .eq('is_active', true)
                .order('display_order');

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching categories:', error);
            return [];
        }
    }

    // Analytics
    async getAnalytics(startDate, endDate) {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            const { data, error } = await this.supabase
                .from('supplier_analytics')
                .select('*')
                .eq('supplier_id', user.id)
                .gte('date', startDate)
                .lte('date', endDate)
                .order('date', { ascending: false });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching analytics:', error);
            return [];
        }
    }

    async getSalesReport(period = 'month') {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            const endDate = new Date();
            const startDate = new Date();
            
            if (period === 'week') startDate.setDate(endDate.getDate() - 7);
            else if (period === 'month') startDate.setMonth(endDate.getMonth() - 1);
            else if (period === 'year') startDate.setFullYear(endDate.getFullYear() - 1);

            const analytics = await this.getAnalytics(
                startDate.toISOString().split('T')[0],
                endDate.toISOString().split('T')[0]
            );

            const summary = {
                totalSales: analytics.reduce((sum, a) => sum + parseFloat(a.total_sales || 0), 0),
                totalRevenue: analytics.reduce((sum, a) => sum + parseFloat(a.total_revenue || 0), 0),
                totalOrders: analytics.reduce((sum, a) => sum + (a.total_orders || 0), 0),
                totalViews: analytics.reduce((sum, a) => sum + (a.total_views || 0), 0),
                avgRating: analytics.length > 0 
                    ? analytics.reduce((sum, a) => sum + parseFloat(a.avg_rating || 0), 0) / analytics.length 
                    : 0
            };

            return { summary, details: analytics };
        } catch (error) {
            console.error('Error generating sales report:', error);
            return null;
        }
    }

    // Shipping Management
    async addShippingZone(zoneData) {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            const { data, error } = await this.supabase
                .from('shipping_zones')
                .insert([{ supplier_id: user.id, ...zoneData }])
                .select()
                .single();

            if (error) throw error;
            showUserMessage('Shipping zone added', 'success');
            return data;
        } catch (error) {
            console.error('Error adding shipping zone:', error);
            showUserMessage('Failed to add shipping zone', 'error');
            throw error;
        }
    }

    async getShippingZones() {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            const { data, error } = await this.supabase
                .from('shipping_zones')
                .select('*')
                .eq('supplier_id', user.id)
                .eq('is_active', true);

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching shipping zones:', error);
            return [];
        }
    }

    // Promotions/Discounts
    async createPromotion(promoData) {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            const { data, error } = await this.supabase
                .from('promotions')
                .insert([{ supplier_id: user.id, ...promoData }])
                .select()
                .single();

            if (error) throw error;
            showUserMessage('Promotion created successfully', 'success');
            return data;
        } catch (error) {
            console.error('Error creating promotion:', error);
            showUserMessage('Failed to create promotion', 'error');
            throw error;
        }
    }

    async getPromotions() {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            const { data, error } = await this.supabase
                .from('promotions')
                .select('*')
                .eq('supplier_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching promotions:', error);
            return [];
        }
    }

    // Product Search & Filter
    async searchProducts(searchTerm, filters = {}) {
        try {
            let query = this.supabase
                .from('supplier_inventory')
                .select('*')
                .eq('is_active', true);

            if (searchTerm) {
                query = query.or(`product_name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
            }

            if (filters.category) query = query.eq('category', filters.category);
            if (filters.minPrice) query = query.gte('price', filters.minPrice);
            if (filters.maxPrice) query = query.lte('price', filters.maxPrice);
            if (filters.supplierId) query = query.eq('supplier_id', filters.supplierId);
            if (filters.listingType) query = query.eq('listing_type', filters.listingType);

            const { data, error } = await query.order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error searching products:', error);
            return [];
        }
    }
}

// UI Functions
async function openProductModal(productId = null) {
    const manager = new SupplierProductManager();
    const categories = await manager.getCategories();
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = XSSProtection.sanitize(`
        <div class="modal-content" style="max-width: 800px; max-height: 90vh; overflow-y: auto;">
            <h2>${sanitize(productId ? 'Edit Product' : 'Add New Product')}</h2>
            <form id="productForm">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                        <label>Product Name *</label>
                        <input type="text" name="product_name" required>
                    </div>
                    <div>
                        <label>SKU</label>
                        <input type="text" name="sku" placeholder="Auto-generated">
                    </div>
                    <div>
                        <label>Category *</label>
                        <select name="category" required>
                            <option value="">Select Category</option>
                            ${sanitize(categories.map(c => `<option value="${c.name)}">${sanitize(c.name)}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label>Brand</label>
                        <input type="text" name="brand">
                    </div>
                    <div>
                        <label>Price (KES) *</label>
                        <input type="number" name="price" step="0.01" required>
                    </div>
                    <div>
                        <label>Quantity *</label>
                        <input type="number" name="quantity" required>
                    </div>
                    <div>
                        <label>Min Order Quantity</label>
                        <input type="number" name="min_order_quantity" value="1">
                    </div>
                    <div>
                        <label>Listing Type *</label>
                        <select name="listing_type" required>
                            <option value="marketplace">Marketplace (Contact-based)</option>
                            <option value="integrated">Integrated Shop (Direct Purchase)</option>
                        </select>
                    </div>
                </div>
                <div style="margin-top: 15px;">
                    <label>Description</label>
                    <textarea name="description" rows="4"></textarea>
                </div>
                <div style="margin-top: 15px;">
                    <label><input type="checkbox" name="is_featured"> Featured Product</label>
                </div>
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button type="submit" class="btn-primary">Save Product</button>
                    <button type="button" onclick="this.closest('.modal-overlay').remove()" class="btn-secondary">Cancel</button>
                </div>
            </form>
        </div>
    `);

    document.body.appendChild(modal);

    document.getElementById('productForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const productData = {
            product_name: formData.get('product_name'),
            sku: formData.get('sku'),
            category: formData.get('category'),
            brand: formData.get('brand'),
            price: parseFloat(formData.get('price')),
            quantity: parseInt(formData.get('quantity')),
            min_order_quantity: parseInt(formData.get('min_order_quantity')) || 1,
            listing_type: formData.get('listing_type'),
            description: formData.get('description'),
            is_featured: formData.get('is_featured') === 'on'
        };

        try {
            if (productId) {
                await manager.updateProduct(productId, productData);
            } else {
                await manager.addProduct(productData);
            }
            modal.remove();
            if (typeof loadProducts === 'function') loadProducts();
        } catch (error) {
            console.error('Error saving product:', error);
        }
    });
}

async function loadProducts() {
    const manager = new SupplierProductManager();
    const products = await manager.getProducts();
    
    const container = document.getElementById('productsContainer');
    if (!container) return;

    if (products.length === 0) {
        container.innerHTML =XSSProtection.sanitize( XSSProtection.sanitize('<p>No products found. Add your first product!</p>');
        return;
    }

    container.innerHTML = XSSProtection.sanitize(products.map(p => `
        <div class="product-card" style="border: 1px solid #ddd; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <h3>${p.product_name}</h3>
            <p><strong>SKU:</strong> ${p.sku || 'N/A'}</p>
            <p><strong>Category:</strong> ${p.category}</p>
            <p><strong>Price:</strong> KES ${parseFloat(p.price).toLocaleString()}</p>
            <p><strong>Stock:</strong> ${p.quantity} (${p.stock_status})</p>
            <p><strong>Type:</strong> ${p.listing_type === 'marketplace' ? 'Marketplace' : 'Integrated Shop'}</p>
            <div style="display: flex; gap: 10px; margin-top: 10px;">
                <button onclick="openProductModal('${p.id}')" class="btn-secondary">Edit</button>
                <button onclick="deleteProduct('${p.id}')" class="btn-danger">Delete</button>
            </div>
        </div>
    `).join('');
}

async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    const manager = new SupplierProductManager();
    await manager.deleteProduct(productId);
    loadProducts();
}

async function loadSalesReport(period = 'month') {
    const manager = new SupplierProductManager();
    const report = await manager.getSalesReport(period);
    
    const container = document.getElementById('salesReportContainer');
    if (!container || !report) return;

    container.innerHTML = XSSProtection.sanitize(`
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
            <div class="stat-card">
                <h4>Total Sales</h4>
                <p style="font-size: 24px; font-weight: bold;">KES ${sanitize(report.summary.totalSales.toLocaleString())}</p>
            </div>
            <div class="stat-card">
                <h4>Total Orders</h4>
                <p style="font-size: 24px; font-weight: bold;">${sanitize(report.summary.totalOrders)}</p>
            </div>
            <div class="stat-card">
                <h4>Total Views</h4>
                <p style="font-size: 24px; font-weight: bold;">${sanitize(report.summary.totalViews)}</p>
            </div>
            <div class="stat-card">
                <h4>Avg Rating</h4>
                <p style="font-size: 24px; font-weight: bold;">${sanitize(report.summary.avgRating.toFixed(1))} ⭐</p>
            </div>
        </div>
    `;
}

// Initialize on page load
if (typeof window !== 'undefined') {
    window.SupplierProductManager = SupplierProductManager;
    window.openProductModal = openProductModal;
    window.loadProducts = loadProducts;
    window.deleteProduct = deleteProduct;
    window.loadSalesReport = loadSalesReport;
}

