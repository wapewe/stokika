// Product Catalog with Shopping Cart
class ProductCatalog {
    constructor() {
        this.supabase = null;
        this.cart = [];
        this.currentVendorId = null;
    }

    async init() {
        this.supabase = initSupabase();
        if (!this.supabase) throw new Error('Database connection failed');
        this.currentVendorId = await this.getCurrentVendorId();
        await this.loadProductCatalog();
        this.loadCart();
    }

    async getCurrentVendorId() {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) return null;

            const { data: vendor } = await this.supabase
                .from('vendors')
                .select('id')
                .eq('user_id', user.id)
                .single();

            return vendor?.id || null;
        } catch (error) {
            console.error('Error getting vendor ID:', error);
            return null;
        }
    }

    async loadProductCatalog() {
        try {
            const container = document.getElementById('productCatalogContent') || document.createElement('div');
            container.innerHTML = XSSProtection.sanitize(`
                <div class="product-catalog">
                    <div class="catalog...ader">
                        <h2>Product Catalog</h2>
                        <div class="catalog-controls">
                            <select id="categoryFilter">
                                <option value="">All Categories</option>
                            </select>
                            <input type="text" id="productSearch" placeholder="Search products...">
                            <button class="btn-primary" id="btnAddProduct">➕ Add Product</button>
                        </div>
                    </div>
                    
                    <div class="catalog-layout">
                        <div class="products-grid" id="productsGrid">
                            <div class="loading">Loading products...</div>
                        </div>
                        
                        <div class="shopping-cart" id="shoppingCart">
                            <h3>🛒 Shopping Cart</h3>
                            <div id="cartItems"></div>
                            <div class="cart-total">
                                <strong>Total: KES <span id="cartTotal">0</span></strong>
                            </div>
                            <button class="btn-primary btn-checkout" id="btnCheckout" disabled>
                                Checkout
                            </button>
                        </div>
                    </div>
                </div>
            `;

            this.attachEventListeners();
            await this.loadCategories();
            await this.loadProducts();
        } catch (error) {
            console.error('Error loading product catalog:', error);
            showUserMessage('Error loading product catalog', 'error');
        }
    }

    attachEventListeners() {
        const categoryFilter = document.getElementById('categoryFilter');
        const productSearch = document.getElementById('productSearch');
        const addProductBtn = document.getElementById('btnAddProduct');
        const checkoutBtn = document.getElementById('btnCheckout');

        if (categoryFilter) categoryFilter.addEventListener('change', () => this.loadProducts());
        if (productSearch) productSearch.addEventListener('input', () => this.loadProducts());
        if (addProductBtn) addProductBtn.addEventListener('click', () => this.showAddProductModal());
        if (checkoutBtn) checkoutBtn.addEventListener('click', () => this.checkout());
    }

    async loadCategories() {
        try {
            const { data: categories } = await this.supabase
                .from('product_categories')
                .select('*')
                .eq('is_active', true)
                .order('name');

            const categorySelect = document.getElementById('categoryFilter');
            if (categorySelect && categories) {
                categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = category.name;
                    categorySelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    async loadProducts() {
        try {
            const categoryFilter = document.getElementById('categoryFilter')?.value || '';
            const searchTerm = document.getElementById('productSearch')?.value || '';

            let query = this.supabase
                .from('products')
                .select(`
                    *,
                    product_categories (name),
                    suppliers (business_name)
                `)
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (categoryFilter) {
                query = query.eq('category_id', categoryFilter);
            }

            if (searchTerm) {
                query = query.ilike('name', `%${searchTerm}%`);
            }

            const { data: products } = await query;

            this.renderProducts(products || []);
        } catch (error) {
            console.error('Error loading products:', error);
        }
    }

    renderProducts(products) {
        const grid = document.getElementById('productsGrid');
        if (!grid) return;

        if (products.length === 0) {
            grid.innerHTML =XSSProtection.sanitize( XSSProtection.sanitize(<div class="no-products">No products found</div>';
            return;
        }

        grid.innerHTML = XSSProtection.sanitize(products.map(product => `
            <div class="product-card" data-product-id="${product.id}">
                <div class="product-image">
                    ${product.images && product.images[0] 
                        ? `<img src="${product.images[0]}" alt="${product.name}">`
                        : '<div class="placeholder-image">📦</div>'
                    }
                </div>
                <div class="product-info">
                    <h4>${product.name}</h4>
                    <p class="product-category">${product.product_categories?.name || 'Uncategorized'}</p>
                    <p class="product-supplier">by ${product.suppliers?.business_name || 'Unknown'}</p>
                    <p class="product-description">${product.description || ''}</p>
                    <div class="product-price">
                        <span class="price">KES ${product.price.toLocaleString()}</span>
                        <span class="stock">Stock: ${product.stock_quantity}</span>
                    </div>
                    <div class="product-actions">
                        <button class="btn-add-cart" onclick="window.productCatalog.addToCart('${product.id}')">
                            Add to Cart
                        </button>
                        <button class="btn-view" onclick="window.productCatalog.viewProduct('${product.id}')">
                            View Details
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async addToCart(productId) {
        try {
            const { data: product } = await this.supabase
                .from('products')
                .select('*')
                .eq('id', productId)
                .single();

            if (!product) {
                showUserMessage('Product not found', 'error');
                return;
            }

            if (product.stock_quantity <= 0) {
                showUserMessage('Product out of stock', 'error');
                return;
            }

            const existingItem = this.cart.find(item => item.product_id === productId);
            
            if (existingItem) {
                if (existingItem.quantity >= product.stock_quantity) {
                    showUserMessage('Cannot add more items - stock limit reached', 'error');
                    return;
                }
                existingItem.quantity += 1;
            } else {
                this.cart.push({
                    product_id: productId,
                    name: product.name,
                    price: product.price,
                    quantity: 1,
                    max_stock: product.stock_quantity
                });
            }

            this.saveCart();
            this.renderCart();
            showUserMessage('Product added to cart', 'success');
        } catch (error) {
            console.error('Error adding to cart:', error);
            showUserMessage('Error adding product to cart', 'error');
        }
    }

    removeFromCart(productId) {
        this.cart = this.cart.filter(item => item.product_id !== productId);
        this.saveCart();
        this.renderCart();
        showUserMessage('Product removed from cart', 'info');
    }

    updateCartQuantity(productId, quantity) {
        const item = this.cart.find(item => item.product_id === productId);
        if (item) {
            if (quantity <= 0) {
                this.removeFromCart(productId);
            } else if (quantity <= item.max_stock) {
                item.quantity = quantity;
                this.saveCart();
                this.renderCart();
            } else {
                showUserMessage('Quantity exceeds available stock', 'error');
            }
        }
    }

    renderCart() {
        const cartContainer = document.getElementById('cartItems');
        const cartTotal = document.getElementById('cartTotal');
        const checkoutBtn = document.getElementById('btnCheckout');

        if (!cartContainer) return;

        if (this.cart.length === 0) {
            cartContainer.innerHTML =XSSProtection.sanitize( XSSProtection.sanitize(<p class="empty-cart">Your cart is empty</p>';
            if (cartTotal) cartTotal.textContent = '0';
            if (checkoutBtn) checkoutBtn.disabled = true;
            return;
        }

        const total = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        cartContainer.innerHTML = XSSProtection.sanitize(this.cart.map(item => `
            <div class="cart-item">
                <div class="item-info">
                    <h5>${item.name}</h5>
                    <p>KES ${item.price.toLocaleString()} each</p>
                </div>
                <div class="item-controls">
                    <button onclick="window.productCatalog.updateCartQuantity('${item.product_id}', ${item.quantity - sanitize(1)})">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="window.productCatalog.updateCartQuantity('${item.product_id}', ${item.quantity + 1})">+</button>
                    <button class="btn-remove" onclick="window.productCatalog.removeFromCart('${item.product_id}')">×</button>
                </div>
                <div class="item-total">
                    KES ${(item.price * item.quantity).toLocaleString()}
                </div>
            </div>
        `).join('');

        if (cartTotal) cartTotal.textContent = total.toLocaleString();
        if (checkoutBtn) checkoutBtn.disabled = false;
    }

    saveCart() {
        localStorage.setItem('stokika_cart', JSON.stringify(this.cart));
    }

    loadCart() {
        const savedCart = localStorage.getItem('stokika_cart');
        if (savedCart) {
            this.cart = JSON.parse(savedCart);
            this.renderCart();
        }
    }

    async checkout() {
        if (this.cart.length === 0) {
            showUserMessage('Cart is empty', 'error');
            return;
        }

        if (!this.currentVendorId) {
            showUserMessage('Please login as a vendor to place orders', 'error');
            return;
        }

        try {
            const total = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

            // Create order
            const { data: order, error: orderError } = await this.supabase
                .from('orders')
                .insert([{
                    vendor_id: this.currentVendorId,
                    total_amount: total,
                    status: 'pending_admin',
                    order_items: this.cart
                }])
                .select()
                .single();

            if (orderError) throw orderError;

            // Clear cart
            this.cart = [];
            this.saveCart();
            this.renderCart();

            showUserMessage('Order placed successfully!', 'success');
            
            // Redirect to orders page or show order confirmation
            setTimeout(() => {
                window.location.href = 'orders.html';
            }, 2000);

        } catch (error) {
            console.error('Checkout error:', error);
            showUserMessage('Error placing order', 'error');
        }
    }

    showAddProductModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = XSSProtection.sanitize(`
            <div class="modal-content">
                <div class="modal-header">
  ...               <h2>Add New Product</h2>
                    <button type="button" class="close">&times;</button>
                </div>
                <form onsubmit="event.preventDefault(); window.productCatalog.addProduct();">
                    <div class="form-group">
                        <label>Product Name</label>
                        <input type="text" id="productName" required>
                    </div>
                    <div class="form-group">
                        <label>Category</label>
                        <select id="productCategory" required>
                            <option value="">Select Category</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <textarea id="productDescription"></textarea>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Price (KES)</label>
                            <input type="number" id="productPrice" min="0" step="0.01" required>
                        </div>
                        <div class="form-group">
                            <label>Stock Quantity</label>
                            <input type="number" id="productStock" min="0" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>SKU (Optional)</label>
                        <input type="text" id="productSKU">
                    </div>
                    <button type="submit" class="btn-submit">Add Product</button>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'block';
        
        // Load categories in modal
        this.loadCategoriesInModal();
        
        modal.querySelector('.close').onclick = () => modal.remove();
    }

    async loadCategoriesInModal() {
        try {
            const { data: categories } = await this.supabase
                .from('product_categories')
                .select('*')
                .eq('is_active', true);

            const select = document.getElementById('productCategory');
            if (select && categories) {
                categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = category.name;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    async addProduct() {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            const { data: supplier } = await this.supabase
                .from('suppliers')
                .select('id')
                .eq('user_id', user.id)
                .single();

            if (!supplier) {
                showUserMessage('Only suppliers can add products', 'error');
                return;
            }

            const productData = {
                supplier_id: supplier.id,
                category_id: document.getElementById('productCategory').value,
                name: document.getElementById('productName').value,
                description: document.getElementById('productDescription').value,
                price: parseFloat(document.getElementById('productPrice').value),
                stock_quantity: parseInt(document.getElementById('productStock').value),
                sku: document.getElementById('productSKU').value || null
            };

            const { error } = await this.supabase
                .from('products')
                .insert([productData]);

            if (error) throw error;

            showUserMessage('Product added successfully', 'success');
            document.querySelector('.modal').remove();
            await this.loadProducts();
        } catch (error) {
            console.error('Error adding product:', error);
            showUserMessage('Error adding product', 'error');
        }
    }

    async viewProduct(productId) {
        showUserMessage('Opening product details...', 'info');
        // Implementation for product details modal
    }
}

// Initialize product catalog
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('productCatalogContent')) {
        window.productCatalog = new ProductCatalog();
        window.productCatalog.init();
    }
});