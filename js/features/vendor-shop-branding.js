// Vendor Shop Branding & Dropshipping Manager
class VendorShopManager {
    constructor() {
        this.supabase = window.supabase;
    }

    // Shop Profile Management
    async createShopProfile(profileData) {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            const slug = await this.generateSlug(profileData.shop_name);
            
            const { data, error } = await this.supabase
                .from('vendor_shop_profiles')
                .insert([{
                    vendor_id: user.id,
                    shop_slug: slug,
                    ...profileData
                }])
                .select()
                .single();

            if (error) throw error;
            showUserMessage('Shop profile created', 'success');
            return data;
        } catch (error) {
            console.error('Error creating shop profile:', error);
            showUserMessage('Failed to create shop profile', 'error');
            throw error;
        }
    }

    async updateShopProfile(updates) {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            
            if (updates.shop_name) {
                updates.shop_slug = await this.generateSlug(updates.shop_name);
            }
            
            const { data, error } = await this.supabase
                .from('vendor_shop_profiles')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('vendor_id', user.id)
                .select()
                .single();

            if (error) throw error;
            showUserMessage('Shop profile updated', 'success');
            return data;
        } catch (error) {
            console.error('Error updating shop profile:', error);
            showUserMessage('Failed to update shop profile', 'error');
            throw error;
        }
    }

    async getShopProfile() {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            const { data, error } = await this.supabase
                .from('vendor_shop_profiles')
                .select('*')
                .eq('vendor_id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return data;
        } catch (error) {
            console.error('Error fetching shop profile:', error);
            return null;
        }
    }

    async generateSlug(shopName) {
        const baseSlug = shopName.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
        
        let slug = baseSlug;
        let counter = 1;
        
        while (await this.slugExists(slug)) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }
        
        return slug;
    }

    async slugExists(slug) {
        const { data } = await this.supabase
            .from('vendor_shop_profiles')
            .select('id')
            .eq('shop_slug', slug)
            .single();
        
        return !!data;
    }

    // Theme Customization
    async updateTheme(themeData) {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            
            const { data, error } = await this.supabase
                .from('vendor_shop_themes')
                .upsert({
                    vendor_id: user.id,
                    ...themeData,
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;
            showUserMessage('Theme updated', 'success');
            return data;
        } catch (error) {
            console.error('Error updating theme:', error);
            showUserMessage('Failed to update theme', 'error');
            throw error;
        }
    }

    async getTheme() {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            const { data, error } = await this.supabase
                .from('vendor_shop_themes')
                .select('*')
                .eq('vendor_id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return data;
        } catch (error) {
            console.error('Error fetching theme:', error);
            return null;
        }
    }

    // Dropshipping Management
    async getAvailableSupplierProducts() {
        try {
            const { data, error } = await this.supabase
                .from('supplier_inventory')
                .select('*, suppliers(business_name)')
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching supplier products:', error);
            return [];
        }
    }

    async addDropshipProduct(productData) {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            
            const { data, error } = await this.supabase
                .from('vendor_inventory')
                .insert([{
                    vendor_id: user.id,
                    fulfillment_type: 'dropship',
                    dropship_supplier_id: productData.supplier_id,
                    dropship_product_id: productData.supplier_product_id,
                    auto_fulfill: productData.auto_fulfill || false,
                    ...productData
                }])
                .select()
                .single();

            if (error) throw error;
            showUserMessage('Dropship product added', 'success');
            return data;
        } catch (error) {
            console.error('Error adding dropship product:', error);
            showUserMessage('Failed to add dropship product', 'error');
            throw error;
        }
    }

    async removeDropshipProduct(productId) {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            
            const { error } = await this.supabase
                .from('vendor_inventory')
                .delete()
                .eq('id', productId)
                .eq('vendor_id', user.id)
                .eq('fulfillment_type', 'dropship');

            if (error) throw error;
            showUserMessage('Dropship product removed', 'success');
        } catch (error) {
            console.error('Error removing dropship product:', error);
            showUserMessage('Failed to remove product', 'error');
            throw error;
        }
    }

    async updateDropshipPricing(productId, newPricing) {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            
            const { data, error } = await this.supabase
                .from('vendor_inventory')
                .update({
                    selling_price: newPricing.selling_price,
                    updated_at: new Date().toISOString()
                })
                .eq('id', productId)
                .eq('vendor_id', user.id)
                .select()
                .single();

            if (error) throw error;
            showUserMessage('Pricing updated', 'success');
            return data;
        } catch (error) {
            console.error('Error updating pricing:', error);
            showUserMessage('Failed to update pricing', 'error');
            throw error;
        }
    }

    async getDropshipOrders(filters = {}) {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            let query = this.supabase
                .from('dropship_orders')
                .select('*, dropship_order_items(*)')
                .eq('vendor_id', user.id)
                .order('created_at', { ascending: false });

            if (filters.status) query = query.eq('status', filters.status);

            const { data, error } = await query;
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching dropship orders:', error);
            return [];
        }
    }

    // Shop Analytics
    async getShopAnalytics(startDate, endDate) {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            const { data, error } = await this.supabase
                .from('vendor_shop_analytics')
                .select('*')
                .eq('vendor_id', user.id)
                .gte('date', startDate)
                .lte('date', endDate)
                .order('date', { ascending: false });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching shop analytics:', error);
            return [];
        }
    }
}

// UI Functions
async function openShopProfileModal() {
    const manager = new VendorShopManager();
    const profile = await manager.getShopProfile();
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px; max-height: 90vh; overflow-y: auto;">
            <h2>${profile ? 'Edit Shop Profile' : 'Create Shop Profile'}</h2>
            <form id="shopProfileForm">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                        <label>Shop Name *</label>
                        <input type="text" name="shop_name" value="${XSSProtection.escapeHtml(profile?.shop_name || '')}" required>
                    </div>
                    <div>
                        <label>Tagline</label>
                        <input type="text" name="tagline" value="${XSSProtection.escapeHtml(profile?.tagline || '')}" placeholder="Your shop's motto">
                    </div>
                    <div>
                        <label>Business Email</label>
                        <input type="email" name="business_email" value="${XSSProtection.escapeHtml(profile?.business_email || '')}">
                    </div>
                    <div>
                        <label>Business Phone</label>
                        <input type="tel" name="business_phone" value="${XSSProtection.escapeHtml(profile?.business_phone || '')}">
                    </div>
                    <div>
                        <label>WhatsApp Number</label>
                        <input type="tel" name="whatsapp_number" value="${XSSProtection.escapeHtml(profile?.whatsapp_number || '')}">
                    </div>
                    <div>
                        <label>Min Order Amount (KES)</label>
                        <input type="number" name="min_order_amount" value="${XSSProtection.escapeHtml(String(profile?.min_order_amount || 0))}" step="0.01">
                    </div>
                </div>
                <div style="margin-top: 15px;">
                    <label>Description</label>
                    <textarea name="description" rows="3">${XSSProtection.escapeHtml(profile?.description || '')}</textarea>
                </div>
                <div style="margin-top: 15px;">
                    <label>Physical Address</label>
                    <textarea name="physical_address" rows="2">${XSSProtection.escapeHtml(profile?.physical_address || '')}</textarea>
                </div>
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button type="submit" class="btn-primary">Save Profile</button>
                    <button type="button" onclick="this.closest('.modal-overlay').remove()" class="btn-secondary">Cancel</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('shopProfileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const profileData = {
            shop_name: formData.get('shop_name'),
            tagline: formData.get('tagline'),
            description: formData.get('description'),
            business_email: formData.get('business_email'),
            business_phone: formData.get('business_phone'),
            whatsapp_number: formData.get('whatsapp_number'),
            physical_address: formData.get('physical_address'),
            min_order_amount: parseFloat(formData.get('min_order_amount')) || 0
        };

        try {
            if (profile) {
                await manager.updateShopProfile(profileData);
            } else {
                await manager.createShopProfile(profileData);
            }
            modal.remove();
            if (typeof loadShopProfile === 'function') loadShopProfile();
        } catch (error) {
            console.error('Error saving profile:', error);
        }
    });
}

async function openShopBrandingModal() {
    const manager = new VendorShopManager();
    const profile = await manager.getShopProfile();
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <h2>Shop Branding</h2>
            <form id="brandingForm">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                        <label>Primary Color</label>
                        <input type="color" name="primary_color" value="${XSSProtection.escapeHtml(profile?.primary_color || '#3b82f6')}">
                    </div>
                    <div>
                        <label>Secondary Color</label>
                        <input type="color" name="secondary_color" value="${XSSProtection.escapeHtml(profile?.secondary_color || '#10b981')}">
                    </div>
                    <div>
                        <label>Accent Color</label>
                        <input type="color" name="accent_color" value="${XSSProtection.escapeHtml(profile?.accent_color || '#f59e0b')}">
                    </div>
                    <div>
                        <label>Font Family</label>
                        <select name="font_family">
                            <option value="Inter" ${profile?.font_family === 'Inter' ? 'selected' : ''}>Inter</option>
                            <option value="Roboto" ${profile?.font_family === 'Roboto' ? 'selected' : ''}>Roboto</option>
                            <option value="Poppins" ${profile?.font_family === 'Poppins' ? 'selected' : ''}>Poppins</option>
                            <option value="Montserrat" ${profile?.font_family === 'Montserrat' ? 'selected' : ''}>Montserrat</option>
                        </select>
                    </div>
                </div>
                <div style="margin-top: 15px;">
                    <label>Logo URL</label>
                    <input type="url" name="logo_url" value="${XSSProtection.escapeHtml(profile?.logo_url || '')}" placeholder="https://...">
                </div>
                <div style="margin-top: 15px;">
                    <label>Banner URL</label>
                    <input type="url" name="banner_url" value="${XSSProtection.escapeHtml(profile?.banner_url || '')}" placeholder="https://...">
                </div>
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button type="submit" class="btn-primary">Save Branding</button>
                    <button type="button" onclick="this.closest('.modal-overlay').remove()" class="btn-secondary">Cancel</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('brandingForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const brandingData = {
            primary_color: formData.get('primary_color'),
            secondary_color: formData.get('secondary_color'),
            accent_color: formData.get('accent_color'),
            font_family: formData.get('font_family'),
            logo_url: formData.get('logo_url'),
            banner_url: formData.get('banner_url')
        };

        try {
            await manager.updateShopProfile(brandingData);
            modal.remove();
            if (typeof loadShopProfile === 'function') loadShopProfile();
        } catch (error) {
            console.error('Error saving branding:', error);
        }
    });
}

async function openDropshipBrowserModal() {
    const manager = new VendorShopManager();
    const supplierProducts = await manager.getAvailableSupplierProducts();
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 900px; max-height: 90vh; overflow-y: auto;">
            <h2>Browse Supplier Products for Dropshipping</h2>
            <div style="margin-bottom: 20px;">
                <input type="text" id="supplierProductSearch" placeholder="Search products..." style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
            </div>
            <div id="supplierProductsList" style="max-height: 400px; overflow-y: auto;">
                ${supplierProducts.map(product => `
                    <div class="supplier-product-item" style="border: 1px solid #e5e7eb; padding: 15px; margin-bottom: 10px; border-radius: 8px;">
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                            <div style="flex: 1;">
                                <h4 style="margin: 0 0 5px 0;">${XSSProtection.escapeHtml(product.product_name)}</h4>
                                <p style="margin: 0 0 5px 0; color: #6b7280;">Supplier: ${XSSProtection.escapeHtml(product.suppliers?.business_name || 'Unknown')}</p>
                                <p style="margin: 0 0 5px 0; color: #6b7280;">Category: ${XSSProtection.escapeHtml(product.category || 'N/A')}</p>
                                <p style="margin: 0 0 10px 0; font-weight: 600; color: #059669;">Supplier Price: KES ${XSSProtection.escapeHtml(parseFloat(product.price || 0).toLocaleString())}</p>
                                ${product.description ? `<p style="margin: 0; font-size: 14px; color: #374151;">${XSSProtection.escapeHtml(product.description.substring(0, 150))}...</p>` : ''}
                            </div>
                            <button onclick="addSupplierProductToDropship('${XSSProtection.escapeHtml(product.id)}', '${XSSProtection.escapeHtml(product.supplier_id)}')" class="btn-primary" style="margin-left: 15px;">
                                Add to My Shop
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button type="button" onclick="this.closest('.modal-overlay').remove()" class="btn-secondary">Close</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Search functionality
    document.getElementById('supplierProductSearch').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const items = document.querySelectorAll('.supplier-product-item');
        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(searchTerm) ? 'block' : 'none';
        });
    });
}

async function addSupplierProductToDropship(supplierProductId, supplierId) {
    const manager = new VendorShopManager();
    
    // Get supplier product details
    const { data: supplierProduct } = await manager.supabase
        .from('supplier_inventory')
        .select('*')
        .eq('id', supplierProductId)
        .single();

    if (!supplierProduct) {
        showUserMessage('Product not found', 'error');
        return;
    }

    // Show pricing modal
    const pricingModal = document.createElement('div');
    pricingModal.className = 'modal-overlay';
    pricingModal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <h2>Set Your Pricing</h2>
            <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <h4 style="margin: 0 0 10px 0;">${XSSProtection.escapeHtml(supplierProduct.product_name)}</h4>
                <p style="margin: 0 0 5px 0;">Supplier Price: <strong>KES ${XSSProtection.escapeHtml(parseFloat(supplierProduct.price).toLocaleString())}</strong></p>
            </div>
            <form id="dropshipPricingForm">
                <div style="margin-bottom: 15px;">
                    <label>Your Selling Price (KES) *</label>
                    <input type="number" name="selling_price" step="0.01" min="${XSSProtection.escapeHtml(String(supplierProduct.price))}" required 
                           placeholder="Must be higher than supplier price">
                </div>
                <div style="margin-bottom: 15px;">
                    <label><input type="checkbox" name="auto_fulfill" checked> Auto-forward orders to supplier</label>
                </div>
                <div id="profitCalculation" style="background: #ecfdf5; padding: 10px; border-radius: 6px; margin-bottom: 15px;"></div>
                <div style="display: flex; gap: 10px;">
                    <button type="submit" class="btn-primary">Add to My Shop</button>
                    <button type="button" onclick="this.closest('.modal-overlay').remove()" class="btn-secondary">Cancel</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(pricingModal);

    // Calculate profit on price change
    const priceInput = pricingModal.querySelector('input[name="selling_price"]');
    const profitDiv = pricingModal.querySelector('#profitCalculation');
    
    priceInput.addEventListener('input', (e) => {
        const sellingPrice = parseFloat(e.target.value) || 0;
        const supplierPrice = parseFloat(supplierProduct.price);
        const profit = sellingPrice - supplierPrice;
        const margin = supplierPrice > 0 ? ((profit / supplierPrice) * 100).toFixed(1) : 0;
        
        profitDiv.innerHTML = `<strong>Profit per sale:</strong> KES ${XSSProtection.escapeHtml(profit.toLocaleString())} (${XSSProtection.escapeHtml(String(margin))}% margin)`;
    });

    // Handle form submission
    pricingModal.querySelector('#dropshipPricingForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        const productData = {
            product_name: supplierProduct.product_name,
            category: supplierProduct.category,
            subcategory: supplierProduct.subcategory,
            brand: supplierProduct.brand,
            description: supplierProduct.description,
            images: supplierProduct.images,
            specifications: supplierProduct.specifications,
            cost_price: supplierProduct.price,
            selling_price: parseFloat(formData.get('selling_price')),
            supplier_id: supplierId,
            supplier_product_id: supplierProductId,
            auto_fulfill: formData.get('auto_fulfill') === 'on',
            quantity: 999, // Virtual stock for dropship
            weight: supplierProduct.weight,
            dimensions: supplierProduct.dimensions
        };

        try {
            await manager.addDropshipProduct(productData);
            pricingModal.remove();
            document.querySelector('.modal-overlay').remove(); // Close browser modal
            if (typeof loadVendorProducts === 'function') loadVendorProducts();
        } catch (error) {
            console.error('Error adding dropship product:', error);
        }
    });
}

async function openDropshipProductModal() {
    const manager = new VendorShopManager();
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <h2>Add Dropship Product</h2>
            <div style="margin-bottom: 20px; text-align: center;">
                <button onclick="openDropshipBrowserModal(); this.closest('.modal-overlay').remove();" class="btn-primary" style="margin-right: 10px;">Browse Supplier Products</button>
                <span style="color: #6b7280;">or</span>
            </div>
            <form id="dropshipProductForm">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div><label>Product Name *</label><input type="text" name="product_name" required></div>
                    <div><label>Category *</label><input type="text" name="category" required></div>
                    <div><label>Supplier Cost (KES) *</label><input type="number" name="cost_price" step="0.01" required></div>
                    <div><label>Your Selling Price (KES) *</label><input type="number" name="selling_price" step="0.01" required></div>
                </div>
                <div style="margin-top: 15px;"><label>Description</label><textarea name="description" rows="3"></textarea></div>
                <div style="margin-top: 15px;"><label><input type="checkbox" name="auto_fulfill"> Auto-forward orders to supplier</label></div>
                <p style="margin-top: 10px; color: #6b7280; font-size: 14px;">Note: Supplier will fulfill orders directly. You earn the price difference.</p>
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button type="submit" class="btn-primary">Add Product</button>
                    <button type="button" onclick="this.closest('.modal-overlay').remove()" class="btn-secondary">Cancel</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('dropshipProductForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const productData = {
            product_name: formData.get('product_name'),
            category: formData.get('category'),
            cost_price: parseFloat(formData.get('cost_price')),
            selling_price: parseFloat(formData.get('selling_price')),
            description: formData.get('description'),
            auto_fulfill: formData.get('auto_fulfill') === 'on',
            quantity: 999 // Virtual stock for dropship
        };

        try {
            await manager.addDropshipProduct(productData);
            modal.remove();
            if (typeof loadVendorProducts === 'function') loadVendorProducts();
        } catch (error) {
            console.error('Error adding dropship product:', error);
        }
    });
}

async function loadShopProfile() {
    const manager = new VendorShopManager();
    const profile = await manager.getShopProfile();
    
    const container = document.getElementById('shopProfileContainer');
    if (!container) return;

    if (!profile) {
        container.innerHTML = '<p>No shop profile. <button onclick="openShopProfileModal()" class="btn-primary">Create Shop</button></p>';
        return;
    }

    container.innerHTML = `
        <div style="border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
            <h3>${XSSProtection.escapeHtml(profile.shop_name)}</h3>
            <p><strong>URL:</strong> stokika.com/shop/${XSSProtection.escapeHtml(profile.shop_slug)}</p>
            <p><strong>Tagline:</strong> ${XSSProtection.escapeHtml(profile.tagline || 'N/A')}</p>
            <p><strong>Status:</strong> ${profile.is_active ? '✅ Active' : '❌ Inactive'}</p>
            <p><strong>Total Sales:</strong> KES ${XSSProtection.escapeHtml(parseFloat(profile.total_sales || 0).toLocaleString())}</p>
            <p><strong>Total Orders:</strong> ${XSSProtection.escapeHtml(String(profile.total_orders || 0))}</p>
            <div style="display: flex; gap: 10px; margin-top: 15px;">
                <button onclick="openShopProfileModal()" class="btn-secondary">Edit Profile</button>
                <button onclick="openShopBrandingModal()" class="btn-secondary">Customize Branding</button>
            </div>
        </div>
    `;
}

async function loadDropshipProducts() {
    const manager = new VendorShopManager();
    const { data: { user } } = await manager.supabase.auth.getUser();
    
    const { data: products } = await manager.supabase
        .from('vendor_inventory')
        .select('*')
        .eq('vendor_id', user.id)
        .eq('fulfillment_type', 'dropship')
        .order('created_at', { ascending: false });

    const container = document.getElementById('dropshipProductsList');
    if (!container) return;

    if (!products || products.length === 0) {
        container.innerHTML = '<p>No dropship products. <button onclick="openDropshipProductModal()" class="btn-primary">Add Products</button></p>';
        return;
    }

    container.innerHTML = `
        <div style="display: grid; gap: 15px;">
            ${products.map(product => `
                <div style="border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div style="flex: 1;">
                            <h4 style="margin: 0 0 5px 0;">${XSSProtection.escapeHtml(product.product_name)}</h4>
                            <p style="margin: 0 0 5px 0; color: #6b7280;">Category: ${XSSProtection.escapeHtml(product.category)}</p>
                            <p style="margin: 0 0 5px 0;">Cost: KES ${XSSProtection.escapeHtml(parseFloat(product.cost_price).toLocaleString())}</p>
                            <p style="margin: 0 0 5px 0;">Selling: KES ${XSSProtection.escapeHtml(parseFloat(product.selling_price).toLocaleString())}</p>
                            <p style="margin: 0 0 10px 0; font-weight: 600; color: #059669;">Profit: KES ${XSSProtection.escapeHtml((parseFloat(product.selling_price) - parseFloat(product.cost_price)).toLocaleString())}</p>
                            <p style="margin: 0; font-size: 14px; color: ${product.auto_fulfill ? '#059669' : '#6b7280'};">Auto-fulfill: ${product.auto_fulfill ? 'Yes' : 'No'}</p>
                        </div>
                        <div style="display: flex; gap: 10px;">
                            <button onclick="editDropshipPricing('${XSSProtection.escapeHtml(product.id)}')" class="btn-secondary" style="padding: 8px 12px; font-size: 14px;">Edit Price</button>
                            <button onclick="removeDropshipProduct('${XSSProtection.escapeHtml(product.id)}')" class="btn-danger" style="padding: 8px 12px; font-size: 14px; background: #ef4444;">Remove</button>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

async function editDropshipPricing(productId) {
    const manager = new VendorShopManager();
    const { data: product } = await manager.supabase
        .from('vendor_inventory')
        .select('*')
        .eq('id', productId)
        .single();

    if (!product) return;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML =XSSProtection.sanitize( XSSProtection.sanitize(`
        <div class="modal-content" style="max-width: 400px;">
            <h2>Edit Pricing</h2>
            <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <h4 style="margin: 0 0 10px 0;">${sanitize(product.product_name)}</h4>
                <p style="margin: 0;">Current Cost: KES ${sanitize(parseFloat(product.cost_price).toLocaleString())}</p>
            </div>
            <form id="editPricingForm">
                <div style="margin-bottom: 15px;">
                    <label>Your Selling Price (KES) *</label>
                    <input type="number" name="selling_price" step="0.01" value="${sanitize(product.selling_price)}" required>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button type="submit" class="btn-primary">Update Price</button>
                    <button type="button" onclick="this.closest('.modal-overlay').remove()" class="btn-secondary">Cancel</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#editPricingForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        try {
            await manager.updateDropshipPricing(productId, {
                selling_price: parseFloat(formData.get('selling_price'))
            });
            modal.remove();
            loadDropshipProducts();
        } catch (error) {
            console.error('Error updating pricing:', error);
        }
    });
}

async function removeDropshipProduct(productId) {
    if (!confirm('Are you sure you want to remove this product from your shop?')) return;
    
    const manager = new VendorShopManager();
    try {
        await manager.removeDropshipProduct(productId);
        loadDropshipProducts();
    } catch (error) {
        console.error('Error removing product:', error);
    }
}

if (typeof window !== 'undefined') {
    window.VendorShopManager = VendorShopManager;
    window.openShopProfileModal = openShopProfileModal;
    window.openShopBrandingModal = openShopBrandingModal;
    window.openDropshipProductModal = openDropshipProductModal;
    window.openDropshipBrowserModal = openDropshipBrowserModal;
    window.addSupplierProductToDropship = addSupplierProductToDropship;
    window.loadShopProfile = loadShopProfile;
    window.loadDropshipProducts = loadDropshipProducts;
    window.editDropshipPricing = editDropshipPricing;
    window.removeDropshipProduct = removeDropshipProduct;
}
