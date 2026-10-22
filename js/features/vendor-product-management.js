// Vendor Product Management System
class VendorProductManager {
    constructor() {
        this.supabase = window.supabase;
    }

    // Product CRUD
    async addProduct(productData) {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            const { data, error } = await this.supabase
                .from('vendor_inventory')
                .insert([{
                    vendor_id: user.id,
                    sku: productData.sku || `VND-${Date.now()}`,
                    ...productData
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
                .from('vendor_inventory')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', productId)
                .select()
                .single();

            if (error) throw error;
            showUserMessage('Product updated', 'success');
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
                .from('vendor_inventory')
                .update({ is_active: false })
                .eq('id', productId);

            if (error) throw error;
            showUserMessage('Product deleted', 'success');
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
                .from('vendor_inventory')
                .select('*')
                .eq('vendor_id', user.id)
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

    // Customer Orders
    async createOrder(orderData) {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            const orderNumber = `ORD-${Date.now()}`;
            
            const { data, error } = await this.supabase
                .from('customer_orders')
                .insert([{
                    vendor_id: user.id,
                    order_number: orderNumber,
                    ...orderData
                }])
                .select()
                .single();

            if (error) throw error;
            showUserMessage('Order created successfully', 'success');
            return data;
        } catch (error) {
            console.error('Error creating order:', error);
            showUserMessage('Failed to create order', 'error');
            throw error;
        }
    }

    async getOrders(filters = {}) {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            let query = this.supabase
                .from('customer_orders')
                .select('*, customer_order_items(*)')
                .eq('vendor_id', user.id)
                .order('created_at', { ascending: false });

            if (filters.status) query = query.eq('order_status', filters.status);
            if (filters.payment_status) query = query.eq('payment_status', filters.payment_status);

            const { data, error } = await query;
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching orders:', error);
            return [];
        }
    }

    async updateOrderStatus(orderId, status, notes = null) {
        try {
            const updates = { order_status: status, updated_at: new Date().toISOString() };
            if (notes) updates.vendor_notes = notes;
            if (status === 'delivered') updates.delivered_at = new Date().toISOString();

            const { error } = await this.supabase
                .from('customer_orders')
                .update(updates)
                .eq('id', orderId);

            if (error) throw error;
            showUserMessage('Order status updated', 'success');
        } catch (error) {
            console.error('Error updating order:', error);
            showUserMessage('Failed to update order', 'error');
            throw error;
        }
    }

    // Analytics
    async getAnalytics(startDate, endDate) {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            const { data, error } = await this.supabase
                .from('vendor_analytics')
                .select('*')
                .eq('vendor_id', user.id)
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
            const endDate = new Date();
            const startDate = new Date();
            
            if (period === 'week') startDate.setDate(endDate.getDate() - 7);
            else if (period === 'month') startDate.setMonth(endDate.getMonth() - 1);
            else if (period === 'year') startDate.setFullYear(endDate.getFullYear() - 1);

            const analytics = await this.getAnalytics(
                startDate.toISOString().split('T')[0],
                endDate.toISOString().split('T')[0]
            );

            return {
                totalRevenue: analytics.reduce((sum, a) => sum + parseFloat(a.total_revenue || 0), 0),
                totalProfit: analytics.reduce((sum, a) => sum + parseFloat(a.total_profit || 0), 0),
                totalOrders: analytics.reduce((sum, a) => sum + (a.total_orders || 0), 0),
                avgOrderValue: analytics.length > 0 
                    ? analytics.reduce((sum, a) => sum + parseFloat(a.avg_order_value || 0), 0) / analytics.length 
                    : 0,
                details: analytics
            };
        } catch (error) {
            console.error('Error generating report:', error);
            return null;
        }
    }

    // Restock from Suppliers
    async createRestockRequest(supplierId, items, notes = null) {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            const requestNumber = `RST-${Date.now()}`;
            const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

            const { data: request, error: requestError } = await this.supabase
                .from('restock_requests')
                .insert([{
                    vendor_id: user.id,
                    supplier_id: supplierId,
                    request_number: requestNumber,
                    total_amount: totalAmount,
                    notes: notes
                }])
                .select()
                .single();

            if (requestError) throw requestError;

            const requestItems = items.map(item => ({
                request_id: request.id,
                supplier_product_id: item.product_id,
                product_name: item.product_name,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total_price: item.quantity * item.unit_price
            }));

            const { error: itemsError } = await this.supabase
                .from('restock_request_items')
                .insert(requestItems);

            if (itemsError) throw itemsError;

            showUserMessage('Restock request created', 'success');
            return request;
        } catch (error) {
            console.error('Error creating restock request:', error);
            showUserMessage('Failed to create restock request', 'error');
            throw error;
        }
    }

    async getRestockRequests() {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            const { data, error } = await this.supabase
                .from('restock_requests')
                .select('*, restock_request_items(*)')
                .eq('vendor_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching restock requests:', error);
            return [];
        }
    }

    // Shipping Zones
    async addShippingZone(zoneData) {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            const { data, error } = await this.supabase
                .from('vendor_shipping_zones')
                .insert([{ vendor_id: user.id, ...zoneData }])
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

    // Promotions
    async createPromotion(promoData) {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            const { data, error } = await this.supabase
                .from('vendor_promotions')
                .insert([{ vendor_id: user.id, ...promoData }])
                .select()
                .single();

            if (error) throw error;
            showUserMessage('Promotion created', 'success');
            return data;
        } catch (error) {
            console.error('Error creating promotion:', error);
            showUserMessage('Failed to create promotion', 'error');
            throw error;
        }
    }

    // Search supplier products for restocking
    async searchSupplierProducts(searchTerm, filters = {}) {
        try {
            let query = this.supabase
                .from('supplier_inventory')
                .select('*')
                .eq('is_active', true);

            if (searchTerm) {
                query = query.or(`product_name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
            }

            if (filters.category) query = query.eq('category', filters.category);
            if (filters.supplierId) query = query.eq('supplier_id', filters.supplierId);

            const { data, error } = await query.order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error searching supplier products:', error);
            return [];
        }
    }
}

// UI Functions
async function openVendorProductModal(productId = null) {
    const manager = new VendorProductManager();
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = XSSProtection.sanitize(`
        <div class="modal-content" style="max-width: 700px; max-height: 90vh; overflow-y: auto;">
            <h2>${sanitize(productId ? 'Edit Product' : 'Add Product')}</h2>
            <form id="vendorProductForm">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                        <label>Product Name *</label>
                        <input type="text" name="product_name" required>
                    </div>
                    <div>
                        <label>Category *</label>
                        <input type="text" name="category" required>
                    </div>
                    <div>
                        <label>Cost Price (KES) *</label>
                        <input type="number" name="cost_price" step="0.01" required>
                    </div>
                    <div>
                        <label>Selling Price (KES) *</label>
                        <input type="number" name="selling_price" step="0.01" required>
                    </div>
                    <div>
                        <label>Quantity *</label>
                        <input type="number" name="quantity" required>
                    </div>
                    <div>
                        <label>Min Stock Level</label>
                        <input type="number" name="min_stock_level" value="5">
                    </div>
                </div>
                <div style="margin-top: 15px;">
                    <label>Description</label>
                    <textarea name="description" rows="3"></textarea>
                </div>
                <div style="margin-top: 15px;">
                    <label><input type="checkbox" name="is_featured"> Featured Product</label>
                </div>
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button type="submit" class="btn-primary">Save</button>
                    <button type="button" onclick="this.closest('.modal-overlay').remove()" class="btn-secondary">Cancel</button>
                </div>
            </form>
        </div>
    `);

    document.body.appendChild(modal);

    document.getElementById('vendorProductForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const productData = {
            product_name: formData.get('product_name'),
            category: formData.get('category'),
            cost_price: parseFloat(formData.get('cost_price')),
            selling_price: parseFloat(formData.get('selling_price')),
            quantity: parseInt(formData.get('quantity')),
            min_stock_level: parseInt(formData.get('min_stock_level')) || 5,
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
            if (typeof loadVendorProducts === 'function') loadVendorProducts();
        } catch (error) {
            console.error('Error saving product:', error);
        }
    });
}

async function loadVendorProducts() {
    const manager = new VendorProductManager();
    const products = await manager.getProducts();
    
    const container = document.getElementById('vendorProductsContainer');
    if (!container) return;

    if (products.length === 0) {
        container.innerHTML =XSSProtection.sanitize( XSSProtection.sanitize('<p>No products. Add your first product!</p>');
        return;
    }

    container.innerHTML = XSSProtection.sanitize(products.map(p => `
        <div class="product-card" style="border: 1px solid #ddd; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <h3>${p.product_name}</h3>
            <p><strong>Category:</strong> ${p.category}</p>
            <p><strong>Cost:</strong> KES ${parseFloat(p.cost_price).toLocaleString()} | 
               <strong>Selling:</strong> KES ${parseFloat(p.selling_price).toLocaleString()} | 
               <strong>Profit:</strong> ${p.profit_margin ? p.profit_margin.toFixed(1) : 0}%</p>
            <p><strong>Stock:</strong> ${p.quantity} (${p.stock_status})</p>
            <div style="display: flex; gap: 10px; margin-top: 10px;">
                <button onclick="openVendorProductModal('${p.id}')" class="btn-secondary">Edit</button>
                <button onclick="deleteVendorProduct('${p.id}')" class="btn-danger">Delete</button>
            </div>
        </div>
    `).join('');
}

async function deleteVendorProduct(productId) {
    if (!confirm('Delete this product?')) return;
    const manager = new VendorProductManager();
    await manager.deleteProduct(productId);
    loadVendorProducts();
}

async function loadVendorOrders() {
    const manager = new VendorProductManager();
    const orders = await manager.getOrders();
    
    const container = document.getElementById('vendorOrdersContainer');
    if (!container) return;

    if (orders.length === 0) {
        container.innerHTML =XSSProtection.sanitize( XSSProtection.sanitize('<p>No orders yet.</p>');
        return;
    }

    container.innerHTML = XSSProtection.sanitize(orders.map(o => `
        <div class="order-card" style="border: 1px solid #ddd; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <h3>${o.order_number}</h3>
            <p><strong>Customer:</strong> ${o.customer_name} (${o.customer_phone})</p>
            <p><strong>Total:</strong> KES ${parseFloat(o.total_amount).toLocaleString()}</p>
            <p><strong>Status:</strong> ${o.order_status} | <strong>Payment:</strong> ${o.payment_status}</p>
            <p><strong>Address:</strong> ${o.delivery_address}</p>
            <div style="display: flex; gap: 10px; margin-top: 10px;">
                <button onclick="updateVendorOrderStatus('${o.id}', 'processing')" class="btn-secondary">Process</button>
                <button onclick="updateVendorOrderStatus('${o.id}', 'shipped')" class="btn-secondary">Ship</button>
                <button onclick="updateVendorOrderStatus('${o.id}', 'delivered')" class="btn-primary">Deliver</button>
            </div>
        </div>
    `).join('');
}

async function updateVendorOrderStatus(orderId, status) {
    const manager = new VendorProductManager();
    await manager.updateOrderStatus(orderId, status);
    loadVendorOrders();
}

async function loadVendorSalesReport(period = 'month') {
    const manager = new VendorProductManager();
    const report = await manager.getSalesReport(period);
    
    const container = document.getElementById('vendorSalesReportContainer');
    if (!container || !report) return;

    container.innerHTML = XSSProtection.sanitize(`
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
            <div class="stat-card">
                <h4>Total Revenue</h4>
                <p style="font-size: 24px; font-weight: bold;">KES ${sanitize(report.totalRevenue.toLocaleString())}</p>
            </div>
            <div class="stat-card">
                <h4>Total Profit</h4>
                <p style="font-size: 24px; font-weight: bold;">KES ${sanitize(report.totalProfit.toLocaleString())}</p>
            </div>
            <div class="stat-card">
                <h4>Total Orders</h4>
                <p style="font-size: 24px; font-weight: bold;">${sanitize(report.totalOrders)}</p>
            </div>
            <div class="stat-card">
                <h4>Avg Order Value</h4>
                <p style="font-size: 24px; font-weight: bold;">KES ${sanitize(report.avgOrderValue.toFixed(0))}</p>
            </div>
        </div>
    `;
}

if (typeof window !== 'undefined') {
    window.VendorProductManager = VendorProductManager;
    window.openVendorProductModal = openVendorProductModal;
    window.loadVendorProducts = loadVendorProducts;
    window.deleteVendorProduct = deleteVendorProduct;
    window.loadVendorOrders = loadVendorOrders;
    window.updateVendorOrderStatus = updateVendorOrderStatus;
    window.loadVendorSalesReport = loadVendorSalesReport;
}

