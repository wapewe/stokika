// Dashboard Features: Order Tracking, Ratings, Inventory, Visits, Approvals

// ORDER TRACKING
async function trackOrder(orderId) {
    const supabase = initSupabase();
    const { data, error } = await supabase
        .from('orders')
        .select('*, vendors(business_name), suppliers(company_name)')
        .eq('id', orderId)
        .single();
    
    if (error) {
        alert('Error loading order');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal show';
    const updatedAtHtml = data.updated_at ? `<p><strong>Last Updated:</strong> ${sanitize(new Date(data.updated_at).toLocaleString())}</p>` : '';
    modal.innerHTML = XSSProtection.sanitize(`
        <div class="modal-content">
            <div class="modal-header">
          ...   <h2>Order Tracking</h2>
                <button class="close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="detail-section">
                <h3>Order #${sanitize(data.order_number)}</h3>
                <p><strong>Vendor:</strong> ${sanitize(data.vendors?.business_name || 'N/A')}</p>
                <p><strong>Supplier:</strong> ${sanitize(data.suppliers?.company_name || 'Stokika')}</p>
                <p><strong>Product:</strong> ${sanitize(data.product_name)}</p>
                <p><strong>Quantity:</strong> ${sanitize(data.quantity)}</p>
                <p><strong>Amount:</strong> KES ${sanitize(data.total_amount)}</p>
                <p><strong>Status:</strong> <span class="status-badge status-${sanitize(data.status)}">${sanitize(data.status.replace('_', ' '))}</span></p>
                <p><strong>Created:</strong> ${sanitize(new Date(data.created_at).toLocaleString())}</p>
                ${updatedAtHtml}
            </div>
        </div>
    `);
    document.body.appendChild(modal);
}

// RATE SUPPLIER
async function rateSupplier(orderId, supplierId) {
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = XSSProtection.sanitize(`
        <div class="modal-content">
            <div class="modal-header">
          ...   <h2>Rate Supplier</h2>
                <button class="close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="detail-section">
                <h3>How was your experience?</h3>
                <div style="text-align:center;margin:2rem 0;">
                    <span class="star" data-rating="1" style="font-size:3rem;cursor:pointer;color:#d1d5db;">★</span>
                    <span class="star" data-rating="2" style="font-size:3rem;cursor:pointer;color:#d1d5db;">★</span>
                    <span class="star" data-rating="3" style="font-size:3rem;cursor:pointer;color:#d1d5db;">★</span>
                    <span class="star" data-rating="4" style="font-size:3rem;cursor:pointer;color:#d1d5db;">★</span>
                    <span class="star" data-rating="5" style="font-size:3rem;cursor:pointer;color:#d1d5db;">★</span>
                </div>
                <input type="hidden" id="rating" value="0">
                <div class="form-group">
                    <label>Review (Optional)</label>
                    <textarea id="review" rows="3" placeholder="Share your experience..."></textarea>
                </div>
                <button class="btn-submit" onclick="submitRating('${sanitize(orderId)}', '${sanitize(supplierId)}')">Submit Rating</button>
            </div>
        </div>
    `);
    document.body.appendChild(modal);
    
    modal.querySelectorAll('.star').forEach(star => {
        star.addEventListener('click', function() {
            const rating = this.dataset.rating;
            document.getElementById('rating').value = rating;
            modal.querySelectorAll('.star').forEach((s, i) => {
                s.style.color = i < rating ? '#fbbf24' : '#d1d5db';
            });
        });
    });
}

async function submitRating(orderId, supplierId) {
    const rating = parseInt(document.getElementById('rating').value);
    const review = document.getElementById('review').value.trim();
    
    if (rating === 0) {
        alert('Please select a rating');
        return;
    }
    
    const supabase = initSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase.from('supplier_ratings').insert([{
        order_id: orderId,
        supplier_id: supplierId,
        vendor_id: user.id,
        rating: rating,
        review: review || null
    }]);
    
    if (error) {
        alert('Error submitting rating');
        return;
    }
    
    alert('Thank you for your feedback!');
    document.querySelector('.modal.show').remove();
}

// SUPPLIER INVENTORY MANAGEMENT
async function updateInventory(productId, newQuantity) {
    const supabase = initSupabase();
    const { error } = await supabase
        .from('supplier_inventory')
        .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
        .eq('id', productId);
    
    if (error) {
        alert('Error updating inventory');
        return false;
    }
    
    alert('Inventory updated successfully');
    return true;
}

async function addProduct() {
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = XSSProtection.sanitize(`
        <div class="modal-content">
            <div class="modal-header">
          ...   <h2>Add New Product</h2>
                <button class="close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <form onsubmit="event.preventDefault(); submitNewProduct();">
                <div class="detail-section">
                    <div class="form-group">
                        <label>Product Name</label>
                        <input type="text" id="productName" required>
                    </div>
                    <div class="form-group">
                        <label>Category</label>
                        <input type="text" id="productCategory" required>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Price (KES)</label>
                            <input type="number" id="productPrice" required min="0" step="0.01">
                        </div>
                        <div class="form-group">
                            <label>Quantity</label>
                            <input type="number" id="productQuantity" required min="0">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <textarea id="productDescription" rows="3"></textarea>
                    </div>
                    <button type="submit" class="btn-submit">Add Product</button>
                </div>
            </form>
        </div>
    `);
    document.body.appendChild(modal);
}

async function submitNewProduct() {
    const supabase = initSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    
    const product = {
        supplier_id: user.id,
        product_name: document.getElementById('productName').value,
        category: document.getElementById('productCategory').value,
        price: parseFloat(document.getElementById('productPrice').value),
        quantity: parseInt(document.getElementById('productQuantity').value),
        description: document.getElementById('productDescription').value || null
    };
    
    const { error } = await supabase.from('supplier_inventory').insert([product]);
    
    if (error) {
        alert('Error adding product');
        return;
    }
    
    alert('Product added successfully');
    document.querySelector('.modal.show').remove();
    if (typeof loadInventory === 'function') loadInventory();
}

// FIELD AGENT VISIT LOGGING
async function logVisit() {
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = XSSProtection.sanitize(`
        <div class="modal-content">
            <div class="modal-header">
          ...   <h2>Log Vendor Visit</h2>
                <button class="close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <form onsubmit="event.preventDefault(); submitVisit();">
                <div class="detail-section">
                    <div class="form-group">
                        <label>Vendor</label>
                        <select id="visitVendor" required>
                            <option value="">Select Vendor</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Visit Type</label>
                        <select id="visitType" required>
                            <option value="routine">Routine Check</option>
                            <option value="order_follow_up">Order Follow-up</option>
                            <option value="complaint">Complaint Resolution</option>
                            <option value="training">Training</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Notes</label>
                        <textarea id="visitNotes" rows="4" required></textarea>
                    </div>
                    <div class="form-group">
                        <label>Photo (Optional)</label>
                        <input type="file" id="visitPhoto" accept="image/*">
                    </div>
                    <button type="submit" class="btn-submit">Log Visit</button>
                </div>
            </form>
        </div>
    `);
    document.body.appendChild(modal);
    
    // Load vendors
    const supabase = initSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: vendors } = await supabase
        .from('vendors')
        .select('id, business_name')
        .eq('assigned_agent_id', user.id);
    
    const select = document.getElementById('visitVendor');
    vendors?.forEach(v => {
        const option = document.createElement('option');
        option.value = v.id;
        option.textContent = v.business_name;
        select.appendChild(option);
    });
}

async function submitVisit() {
    const supabase = initSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    
    const visit = {
        agent_id: user.id,
        vendor_id: document.getElementById('visitVendor').value,
        visit_type: document.getElementById('visitType').value,
        notes: document.getElementById('visitNotes').value,
        visit_date: new Date().toISOString()
    };
    
    const { error } = await supabase.from('agent_visits').insert([visit]);
    
    if (error) {
        alert('Error logging visit');
        return;
    }
    
    alert('Visit logged successfully');
    document.querySelector('.modal.show').remove();
    if (typeof loadVisits === 'function') loadVisits();
}

// SUPERVISOR ORDER APPROVAL
async function approveOrder(orderId) {
    if (!confirm('Approve this order?')) return;
    
    const supabase = initSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    
    // Check if supervisor has approval permission
    const { data: supervisor } = await supabase
        .from('supervisors')
        .select('can_approve_orders')
        .eq('user_id', user.id)
        .single();
    
    if (!supervisor?.can_approve_orders) {
        alert('You do not have order approval permission. Contact admin.');
        return;
    }
    
    const { error } = await supabase
        .from('orders')
        .update({ 
            status: 'pending_supplier',
            approved_by: user.id,
            approved_at: new Date().toISOString()
        })
        .eq('id', orderId);
    
    if (error) {
        alert('Error approving order');
        return;
    }
    
    alert('Order approved successfully');
    if (typeof loadOrders === 'function') loadOrders();
}

async function rejectOrder(orderId) {
    const reason = prompt('Reason for rejection:');
    if (!reason) return;
    
    const supabase = initSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
        .from('orders')
        .update({ 
            status: 'rejected',
            rejection_reason: reason,
            rejected_by: user.id,
            rejected_at: new Date().toISOString()
        })
        .eq('id', orderId);
    
    if (error) {
        alert('Error rejecting order');
        return;
    }
    
    alert('Order rejected');
    if (typeof loadOrders === 'function') loadOrders();
}
