class VendorPublicShop {
    constructor(shopSlug) {
        this.shopSlug = shopSlug;
        this.supabase = window.supabase;
        this.cart = JSON.parse(localStorage.getItem('cart_' + shopSlug) || '[]');
        this.shopProfile = null;
        this.theme = null;
    }

    async init() {
        try {
            await this.loadShopData();
            this.renderShop();
            await this.loadAndRenderProducts();
            this.setupEventListeners();
        } catch (error) {
            console.error('Error initializing shop:', error);
            this.renderError('Shop not found or unavailable');
        }
    }

    async loadShopData() {
        const { data: profile, error } = await this.supabase
            .from('vendor_shop_profiles')
            .select('*')
            .eq('shop_slug', this.shopSlug)
            .eq('is_active', true)
            .single();

        if (error) throw error;
        this.shopProfile = profile;

        const { data: theme } = await this.supabase
            .from('vendor_shop_themes')
            .select('*')
            .eq('vendor_id', profile.vendor_id)
            .single();

        this.theme = theme || {};
    }

    async loadProducts(filters = {}) {
        let query = this.supabase
            .from('vendor_inventory')
            .select('*')
            .eq('vendor_id', this.shopProfile.vendor_id)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (filters.category) query = query.eq('category', filters.category);
        if (filters.search) query = query.ilike('product_name', '%' + filters.search + '%');

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    renderShop() {
        const container = document.getElementById('shopContainer');
        if (!container) return;

        const profile = this.shopProfile;
        const bannerHtml = profile.banner_url
            ? '<img src="' + profile.banner_url + '" alt="Shop Banner" class="shop-banner">'
            : '';
        const logoHtml = profile.logo_url
            ? '<img src="' + profile.logo_url + '" alt="Logo" class="shop-logo">'
            : '';
        const taglineHtml = profile.tagline
            ? '<p class="tagline">' + profile.tagline + '</p>'
            : '';

        container.innerHTML =
            '<div class="shop-header">' +
                bannerHtml +
                '<div class="shop-info">' +
                    logoHtml +
                    '<h1>' + profile.shop_name + '</h1>' +
                    taglineHtml +
                    '<div class="shop-stats">' +
                        '<span>⭐ ' + (profile.avg_rating || 0) + '/5</span>' +
                        '<span>📦 ' + (profile.total_orders || 0) + ' orders</span>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="shop-nav">' +
                '<div class="nav-left">' +
                    '<input type="text" id="searchInput" placeholder="Search products..." class="search-input">' +
                    '<select id="categoryFilter" class="category-filter"><option value="">All Categories</option></select>' +
                '</div>' +
                '<div class="nav-right">' +
                    '<button id="cartBtn" class="cart-btn">🛒 Cart (<span id="cartCount">' + this.cart.length + '</span>)</button>' +
                '</div>' +
            '</div>' +
            '<div id="productsGrid" class="products-grid">' +
                '<div class="loading"><p>Loading products...</p></div>' +
            '</div>' +
            '<div id="cartModal" class="modal-overlay hidden">' +
                '<div class="modal-content">' +
                    '<h2>Shopping Cart</h2>' +
                    '<div id="cartItems"></div>' +
                    '<div id="cartTotal"></div>' +
                    '<div class="cart-actions">' +
                        '<button id="checkoutBtn" class="btn-primary">Checkout</button>' +
                        '<button id="closeCartBtn" class="btn-secondary">Continue Shopping</button>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div id="checkoutModal" class="modal-overlay hidden">' +
                '<div class="modal-content">' +
                    '<h2>Checkout</h2>' +
                    '<form id="checkoutForm">' +
                        '<div class="form-grid">' +
                            '<div><label>Full Name *</label><input type="text" name="customer_name" required></div>' +
                            '<div><label>Phone Number *</label><input type="tel" name="customer_phone" required></div>' +
                            '<div><label>Email</label><input type="email" name="customer_email"></div>' +
                            '<div><label>County *</label>' +
                                '<select name="delivery_county" required>' +
                                    '<option value="">Select County</option>' +
                                    '<option value="Nairobi">Nairobi</option>' +
                                    '<option value="Mombasa">Mombasa</option>' +
                                    '<option value="Kisumu">Kisumu</option>' +
                                '</select>' +
                            '</div>' +
                        '</div>' +
                        '<div><label>Delivery Address *</label><textarea name="delivery_address" required rows="3"></textarea></div>' +
                        '<div><label>Delivery Notes</label><textarea name="delivery_notes" rows="2"></textarea></div>' +
                        '<div class="order-summary"><div id="checkoutSummary"></div></div>' +
                        '<div class="checkout-actions">' +
                            '<button type="submit" class="btn-primary">Place Order</button>' +
                            '<button type="button" id="closeCheckoutBtn" class="btn-secondary">Cancel</button>' +
                        '</div>' +
                    '</form>' +
                '</div>' +
            '</div>';
    }

    async loadAndRenderProducts(filters) {
        try {
            const products = await this.loadProducts(filters || {});
            this.renderProducts(products);
            if (!filters) await this.loadCategories();
        } catch (error) {
            console.error('Error loading products:', error);
            const grid = document.getElementById('productsGrid');
            if (grid) grid.innerHTML = '<p class="error">Error loading products. Please try again.</p>';
        }
    }

    renderProducts(products) {
        const grid = document.getElementById('productsGrid');
        if (!grid) return;

        if (!products.length) {
            grid.innerHTML = '<div class="empty-state"><i class="fas fa-box-open"></i><p>No products available</p></div>';
            return;
        }

        grid.innerHTML = products.map(product => {
            const imgHtml = product.images && product.images[0]
                ? '<img src="' + product.images[0] + '" alt="' + product.product_name + '" class="product-image">'
                : '<div class="product-image product-image-placeholder"><i class="fas fa-image"></i></div>';
            const descHtml = product.description
                ? '<p class="product-description">' + product.description.substring(0, 100) + '...</p>'
                : '';
            return '<div class="product-card">' +
                imgHtml +
                '<div class="product-info">' +
                    '<div class="product-name">' + product.product_name + '</div>' +
                    '<div class="product-price">KES ' + parseFloat(product.selling_price).toLocaleString() + '</div>' +
                    descHtml +
                    '<button class="add-to-cart" data-product-id="' + product.id + '">Add to Cart</button>' +
                '</div>' +
            '</div>';
        }).join('');

        grid.querySelectorAll('.add-to-cart').forEach(btn => {
            btn.addEventListener('click', () => this.addToCart(btn.dataset.productId));
        });
    }

    async loadCategories() {
        const { data } = await this.supabase
            .from('vendor_inventory')
            .select('category')
            .eq('vendor_id', this.shopProfile.vendor_id)
            .eq('is_active', true);

        const categories = [...new Set((data || []).map(i => i.category).filter(Boolean))];
        const select = document.getElementById('categoryFilter');
        if (!select) return;
        categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            select.appendChild(opt);
        });
    }

    setupEventListeners() {
        const search = document.getElementById('searchInput');
        const catFilter = document.getElementById('categoryFilter');
        const cartBtn = document.getElementById('cartBtn');
        const checkoutBtn = document.getElementById('checkoutBtn');
        const closeCartBtn = document.getElementById('closeCartBtn');
        const closeCheckoutBtn = document.getElementById('closeCheckoutBtn');
        const checkoutForm = document.getElementById('checkoutForm');

        if (search) search.addEventListener('input', e => this.loadAndRenderProducts({ search: e.target.value }));
        if (catFilter) catFilter.addEventListener('change', e => this.loadAndRenderProducts({ category: e.target.value }));
        if (cartBtn) cartBtn.addEventListener('click', () => this.showCart());
        if (checkoutBtn) checkoutBtn.addEventListener('click', () => this.showCheckout());
        if (closeCartBtn) closeCartBtn.addEventListener('click', () => this.closeModal('cartModal'));
        if (closeCheckoutBtn) closeCheckoutBtn.addEventListener('click', () => this.closeModal('checkoutModal'));
        if (checkoutForm) checkoutForm.addEventListener('submit', e => this.processOrder(e));
    }

    closeModal(id) {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    }

    openModal(id) {
        const el = document.getElementById(id);
        if (el) el.classList.remove('hidden');
    }

    async addToCart(productId) {
        try {
            const { data: product, error } = await this.supabase
                .from('vendor_inventory')
                .select('*')
                .eq('id', productId)
                .single();

            if (error) throw error;

            const existing = this.cart.find(i => i.id === productId);
            if (existing) {
                existing.quantity += 1;
            } else {
                this.cart.push({ id: productId, name: product.product_name, price: product.selling_price, quantity: 1 });
            }

            this.saveCart();
            this.updateCartCount();
        } catch (error) {
            console.error('Error adding to cart:', error);
        }
    }

    showCart() {
        const itemsEl = document.getElementById('cartItems');
        const totalEl = document.getElementById('cartTotal');
        if (!itemsEl || !totalEl) return;

        if (!this.cart.length) {
            itemsEl.innerHTML = '<p>Your cart is empty</p>';
            totalEl.innerHTML = '';
            this.openModal('cartModal');
            return;
        }

        const total = this.cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

        itemsEl.innerHTML = this.cart.map(item =>
            '<div class="cart-item">' +
                '<div class="cart-item-info">' +
                    '<div class="cart-item-name">' + item.name + '</div>' +
                    '<div class="cart-item-price">KES ' + parseFloat(item.price).toLocaleString() + ' x ' + item.quantity + '</div>' +
                '</div>' +
                '<div class="cart-item-controls">' +
                    '<button class="quantity-btn decrease" data-id="' + item.id + '" data-qty="' + (item.quantity - 1) + '">−</button>' +
                    '<button class="quantity-btn increase" data-id="' + item.id + '" data-qty="' + (item.quantity + 1) + '">+</button>' +
                '</div>' +
            '</div>'
        ).join('');

        totalEl.innerHTML = '<div class="summary-total" style="text-align:right;margin-top:15px;">Total: KES ' + total.toLocaleString() + '</div>';

        itemsEl.querySelectorAll('.quantity-btn').forEach(btn => {
            btn.addEventListener('click', () => this.updateCartQuantity(btn.dataset.id, parseInt(btn.dataset.qty)));
        });

        this.openModal('cartModal');
    }

    updateCartQuantity(productId, newQty) {
        if (newQty <= 0) {
            this.cart = this.cart.filter(i => i.id !== productId);
        } else {
            const item = this.cart.find(i => i.id === productId);
            if (item) item.quantity = newQty;
        }
        this.saveCart();
        this.updateCartCount();
        this.showCart();
    }

    showCheckout() {
        this.closeModal('cartModal');
        const summary = document.getElementById('checkoutSummary');
        if (!summary) return;

        const total = this.cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
        summary.innerHTML =
            '<h3>Order Summary</h3>' +
            this.cart.map(i =>
                '<div class="summary-item"><span>' + i.name + ' x ' + i.quantity + '</span><span>KES ' + (i.price * i.quantity).toLocaleString() + '</span></div>'
            ).join('') +
            '<div class="summary-total"><div class="summary-item"><span>Total:</span><span>KES ' + total.toLocaleString() + '</span></div></div>';

        this.openModal('checkoutModal');
    }

    async processOrder(event) {
        event.preventDefault();
        try {
            const formData = new FormData(event.target);
            const total = this.cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
            const orderNumber = 'ORD-' + Date.now();

            const { data: order, error: orderError } = await this.supabase
                .from('customer_orders')
                .insert([{
                    order_number: orderNumber,
                    vendor_id: this.shopProfile.vendor_id,
                    customer_name: formData.get('customer_name'),
                    customer_email: formData.get('customer_email'),
                    customer_phone: formData.get('customer_phone'),
                    delivery_address: formData.get('delivery_address'),
                    delivery_county: formData.get('delivery_county'),
                    delivery_notes: formData.get('delivery_notes'),
                    subtotal: total,
                    total_amount: total,
                    order_status: 'pending',
                    payment_status: 'pending'
                }])
                .select()
                .single();

            if (orderError) throw orderError;

            const { error: itemsError } = await this.supabase
                .from('customer_order_items')
                .insert(this.cart.map(i => ({
                    order_id: order.id,
                    product_id: i.id,
                    product_name: i.name,
                    quantity: i.quantity,
                    unit_price: i.price,
                    total_price: i.price * i.quantity
                })));

            if (itemsError) throw itemsError;

            this.cart = [];
            this.saveCart();
            this.updateCartCount();
            this.closeModal('checkoutModal');
            alert('Order ' + orderNumber + ' placed successfully! The vendor will contact you soon.');
        } catch (error) {
            console.error('Error processing order:', error);
            alert('Failed to place order. Please try again.');
        }
    }

    saveCart() {
        localStorage.setItem('cart_' + this.shopSlug, JSON.stringify(this.cart));
    }

    updateCartCount() {
        const el = document.getElementById('cartCount');
        if (el) el.textContent = this.cart.length;
    }

    renderError(message) {
        const container = document.getElementById('shopContainer');
        if (container) {
            container.innerHTML =
                '<div class="error">' +
                    '<i class="fas fa-exclamation-triangle" style="font-size:3rem;margin-bottom:20px;color:#10b981;"></i>' +
                    '<h2>Shop Not Available</h2>' +
                    '<p>' + message + '</p>' +
                    '<a href="vendor-shops-directory.html" class="btn-primary">Browse All Shops</a>' +
                '</div>';
        }
    }
}

function initVendorShop() {
    const params = new URLSearchParams(window.location.search);
    const shopSlug = params.get('shop') || window.location.pathname.split('/').pop();
    if (shopSlug && shopSlug !== 'vendor-shop.html') {
        window.vendorShop = new VendorPublicShop(shopSlug);
        window.vendorShop.init();
    } else {
        const container = document.getElementById('shopContainer');
        if (container) {
            container.innerHTML = '<div class="error"><h2>No shop specified</h2><p>Please visit a specific vendor shop.</p><a href="vendor-shops-directory.html" class="btn-primary">Browse Shops</a></div>';
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVendorShop);
} else {
    initVendorShop();
}
