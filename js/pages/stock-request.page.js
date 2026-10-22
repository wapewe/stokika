/**
 * Stock Request Page
 * Handles vendor stock requests with authentication
 */

class StockRequestPage {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.vendorData = null;
        this.items = [];
        this.itemCounter = 0;
    }

    async init() {
        try {
            // Check authentication first
            await this.checkAuth();
            
            // Initialize Supabase
            await this.initSupabase();
            
            // Load vendor data
            await this.loadVendorData();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Add first item by default
            this.addItem();
            
            console.log('✅ Stock Request page initialized');
        } catch (error) {
            console.error('❌ Stock Request init error:', error);
            window.showToast?.('Failed to initialize page: ' + error.message, 'error');
        }
    }

    async checkAuth() {
        // Check if user is authenticated
        const isAuthenticated = await window.SecureSession?.init();
        
        if (!isAuthenticated) {
            console.log('❌ Not authenticated, redirecting to signin');
            window.location.href = 'signin.html';
            throw new Error('Authentication required');
        }

        const sessionData = window.SecureSession?.sessionData;
        
        // Check if user is a vendor
        if (sessionData?.userRole !== 'vendor') {
            console.log('❌ Not a vendor, access denied');
            window.showToast?.('Access denied. Vendor privileges required.', 'error');
            setTimeout(() => {
                window.location.href = 'signin.html';
            }, 2000);
            throw new Error('Vendor role required');
        }

        this.currentUser = sessionData;
        console.log('✅ Authentication verified - Vendor:', sessionData.userId);
    }

    async initSupabase() {
        if (!window.ConfigLoader) {
            throw new Error('ConfigLoader not available');
        }

        const config = await window.ConfigLoader.loadConfig();
        
        if (!window.supabase) {
            throw new Error('Supabase library not loaded');
        }

        this.supabase = window.supabase.createClient(
            config.supabaseUrl,
            config.supabaseAnonKey
        );
    }

    async loadVendorData() {
        try {
            // Load vendor eligibility info
            const { data, error } = await this.supabase
                .from('vendors')
                .select('*')
                .eq('id', this.currentUser.userId)
                .single();

            if (error) throw error;

            this.vendorData = data;
            this.displayEligibility();
        } catch (error) {
            console.error('Error loading vendor data:', error);
            window.showToast?.('Failed to load vendor information', 'warning');
        }
    }

    displayEligibility() {
        const eligibilityDiv = document.getElementById('eligibilityInfo');
        if (!eligibilityDiv || !this.vendorData) return;

        const creditLimit = this.vendorData.credit_limit || 0;
        const outstandingBalance = this.vendorData.outstanding_balance || 0;
        const availableCredit = creditLimit - outstandingBalance;
        const isEligible = availableCredit > 0;

        const eligibilityClass = isEligible ? 'eligibility-eligible' : 'eligibility-not-eligible';
        const iconClass = isEligible ? 'eligibility-icon-eligible' : 'eligibility-icon-not-eligible';
        const titleClass = isEligible ? 'eligibility-title-eligible' : 'eligibility-title-not-eligible';
        const icon = isEligible ? 'fa-check-circle' : 'fa-exclamation-circle';
        const title = isEligible ? 'Eligible for Stock Request' : 'Not Eligible for Stock Request';

        eligibilityDiv.innerHTML = `
            <div class="${eligibilityClass}">
                <div class="eligibility-header">
                    <i class="fas ${icon} ${iconClass}"></i>
                    <div>
                        <div class="${titleClass}">${title}</div>
                        ${!isEligible ? '<div class="eligibility-reason">Credit limit reached or exceeded</div>' : ''}
                    </div>
                </div>
                <div class="eligibility-grid">
                    <div>
                        <div class="eligibility-stat-label">Credit Limit</div>
                        <div class="eligibility-stat-value eligibility-stat-credit">
                            KES ${creditLimit.toLocaleString()}
                        </div>
                    </div>
                    <div>
                        <div class="eligibility-stat-label">Outstanding Balance</div>
                        <div class="eligibility-stat-value eligibility-stat-outstanding">
                            KES ${outstandingBalance.toLocaleString()}
                        </div>
                    </div>
                    <div>
                        <div class="eligibility-stat-label">Available Credit</div>
                        <div class="eligibility-stat-value eligibility-stat-available">
                            KES ${availableCredit.toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Disable form if not eligible
        if (!isEligible) {
            document.getElementById('stockRequestForm').style.opacity = '0.6';
            document.getElementById('stockRequestForm').style.pointerEvents = 'none';
        }
    }

    setupEventListeners() {
        // Back button
        const backBtn = document.getElementById('backBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                window.location.href = 'vendor-dashboard.html';
            });
        }

        // Cancel button
        const cancelBtn = document.getElementById('cancelBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                window.location.href = 'vendor-dashboard.html';
            });
        }

        // Add item button
        const addItemBtn = document.getElementById('addItemBtn');
        if (addItemBtn) {
            addItemBtn.addEventListener('click', () => this.addItem());
        }

        // Form submission
        const form = document.getElementById('stockRequestForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        }
    }

    addItem() {
        const itemsContainer = document.getElementById('requestItems');
        if (!itemsContainer) return;

        this.itemCounter++;
        const itemId = `item-${this.itemCounter}`;

        const itemRow = document.createElement('div');
        itemRow.className = 'item-row';
        itemRow.dataset.itemId = itemId;
        itemRow.innerHTML = `
            <div class="form-group">
                <label for="${itemId}-name">Product Name *</label>
                <input type="text" 
                       id="${itemId}-name" 
                       name="${itemId}-name" 
                       placeholder="Enter product name" 
                       required>
            </div>
            <div class="form-group">
                <label for="${itemId}-quantity">Quantity *</label>
                <input type="number" 
                       id="${itemId}-quantity" 
                       name="${itemId}-quantity" 
                       min="1" 
                       placeholder="0" 
                       required>
            </div>
            <div class="form-group">
                <label for="${itemId}-price">Unit Price (KES) *</label>
                <input type="number" 
                       id="${itemId}-price" 
                       name="${itemId}-price" 
                       min="0" 
                       step="0.01" 
                       placeholder="0.00" 
                       required>
            </div>
            <button type="button" class="remove-item-btn" data-item-id="${itemId}">
                <i class="fas fa-trash"></i>
            </button>
        `;

        itemsContainer.appendChild(itemRow);

        // Add event listeners
        const removeBtn = itemRow.querySelector('.remove-item-btn');
        removeBtn.addEventListener('click', () => this.removeItem(itemId));

        const quantityInput = itemRow.querySelector(`#${itemId}-quantity`);
        const priceInput = itemRow.querySelector(`#${itemId}-price`);
        
        quantityInput.addEventListener('input', () => this.calculateTotal());
        priceInput.addEventListener('input', () => this.calculateTotal());

        this.items.push(itemId);
    }

    removeItem(itemId) {
        const itemRow = document.querySelector(`[data-item-id="${itemId}"]`);
        if (itemRow) {
            itemRow.remove();
            this.items = this.items.filter(id => id !== itemId);
            this.calculateTotal();
        }
    }

    calculateTotal() {
        let total = 0;
        
        this.items.forEach(itemId => {
            const quantityInput = document.getElementById(`${itemId}-quantity`);
            const priceInput = document.getElementById(`${itemId}-price`);
            
            if (quantityInput && priceInput) {
                const quantity = parseFloat(quantityInput.value) || 0;
                const price = parseFloat(priceInput.value) || 0;
                total += quantity * price;
            }
        });

        const totalElement = document.getElementById('totalAmount');
        if (totalElement) {
            totalElement.textContent = `KES ${total.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            })}`;
        }

        // Check credit warning
        this.checkCreditWarning(total);
        
        return total;
    }

    checkCreditWarning(total) {
        const warningDiv = document.getElementById('remainingCreditWarning');
        if (!warningDiv || !this.vendorData) return;

        const creditLimit = this.vendorData.credit_limit || 0;
        const outstandingBalance = this.vendorData.outstanding_balance || 0;
        const availableCredit = creditLimit - outstandingBalance;

        if (total > availableCredit) {
            warningDiv.style.display = 'block';
            warningDiv.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <strong>Warning:</strong> Order total (KES ${total.toLocaleString()}) exceeds available credit 
                (KES ${availableCredit.toLocaleString()}). Please adjust your order.
            `;
        } else {
            warningDiv.style.display = 'none';
        }
    }

    async handleSubmit(e) {
        e.preventDefault();

        const total = this.calculateTotal();
        const creditLimit = this.vendorData?.credit_limit || 0;
        const outstandingBalance = this.vendorData?.outstanding_balance || 0;
        const availableCredit = creditLimit - outstandingBalance;

        // Validate credit
        if (total > availableCredit) {
            window.showToast?.('Order total exceeds available credit', 'error');
            return;
        }

        // Collect form data
        const supplierId = document.getElementById('supplier_id').value.trim();
        const deliveryDate = document.getElementById('delivery_date').value;
        const notes = document.getElementById('notes').value.trim();

        if (!supplierId) {
            window.showToast?.('Please enter a supplier ID', 'error');
            return;
        }

        // Collect items
        const orderItems = [];
        for (const itemId of this.items) {
            const name = document.getElementById(`${itemId}-name`)?.value;
            const quantity = parseFloat(document.getElementById(`${itemId}-quantity`)?.value);
            const price = parseFloat(document.getElementById(`${itemId}-price`)?.value);

            if (name && quantity && price) {
                orderItems.push({
                    product_name: name,
                    quantity: quantity,
                    unit_price: price,
                    total_price: quantity * price
                });
            }
        }

        if (orderItems.length === 0) {
            window.showToast?.('Please add at least one item', 'error');
            return;
        }

        // Submit to database
        try {
            const { data, error } = await this.supabase
                .from('stock_requests')
                .insert([{
                    vendor_id: this.currentUser.userId,
                    supplier_id: supplierId,
                    items: orderItems,
                    total_amount: total,
                    delivery_date: deliveryDate || null,
                    notes: notes || null,
                    status: 'pending',
                    created_at: new Date().toISOString()
                }])
                .select();

            if (error) throw error;

            window.showToast?.('Stock request submitted successfully!', 'success');
            
            setTimeout(() => {
                window.location.href = 'vendor-dashboard.html';
            }, 1500);

        } catch (error) {
            console.error('Error submitting stock request:', error);
            window.showToast?.('Failed to submit request: ' + error.message, 'error');
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const page = new StockRequestPage();
    page.init();
});
