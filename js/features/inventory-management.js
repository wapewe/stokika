let supabase, vendorId, allInventory = [];

document.addEventListener('DOMContentLoaded', async () => {
    await authMiddleware.protectPage(['vendor']);
    supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    
    const user = authMiddleware.getCurrentUser();
    const { data: vendor } = await supabase.from('vendors').select('id').eq('user_id', user.id).single();
    vendorId = vendor?.id;
    
    await loadInventory();
    
    document.getElementById('searchInput').addEventListener('input', filterInventory);
    document.getElementById('categoryFilter').addEventListener('change', filterInventory);
    document.getElementById('stockFilter').addEventListener('change', filterInventory);
    document.getElementById('addItemBtn').addEventListener('click', showAddItemModal);
    document.getElementById('logoutBtn').addEventListener('click', () => authMiddleware.logout());
});

async function loadInventory() {
    const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('product_name');
    
    if (error) {
        console.error('Error loading inventory:', error);
        return;
    }
    
    allInventory = data || [];
    displayInventory(allInventory);
    updateStats(allInventory);
}

function displayInventory(items) {
    const tbody = document.getElementById('inventoryBody');
    
    if (items.length === 0) {
        tbody.innerHTML =XSSProtection.sanitize( XSSProtection.sanitize(<tr><td colspan="6" style="text-align:center;padding:2rem;color:#64748b">No inventory items found</td></tr>';
        return;
    }
    
    tbody.innerHTML = XSSProtection.sanitize(items.map(item => {
        const status = item.quantity === 0 ? 'out-of-stock' : item.quantity < 10 ? 'low-stock' : 'in-stock';
        const statusText = item.quantity === 0 ? 'Out of Stock' : item.quantity < 10 ? 'Low Stock' : 'In Stock';
        
        return `
            <tr>
                <td>${item.product_name}</td>
                <td>${item.quantity}</td>
                <td>KES ${(item.unit_price || 0).toLocaleString()}</td>
                <td>KES ${(item.total_value || 0).toLocaleString()}</td>
                <td><span class="badge ${status}">${statusText}</span></td>
                <td>
                    <button class="btn-action btn-edit" onclick="editItem('${item.id}')">Edit</button>
                    <button class="btn-action btn-delete" onclick="deleteItem('${item.id}')">Delete</button>
                </td>
            </tr>
        `;
    }).join('');
}

function updateStats(items) {
    const totalItems = items.length;
    const totalValue = items.reduce((sum, item) => sum + (item.total_value || 0), 0);
    const lowStockItems = items.filter(item => item.quantity < 10 && item.quantity > 0).length;
    
    document.getElementById('totalItems').textContent = totalItems;
    document.getElementById('totalValue').textContent = `KES ${totalValue.toLocaleString()}`;
    document.getElementById('lowStockItems').textContent = lowStockItems;
}

function filterInventory() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const category = document.getElementById('categoryFilter').value;
    const stock = document.getElementById('stockFilter').value;
    
    let filtered = allInventory;
    
    if (search) {
        filtered = filtered.filter(item => item.product_name.toLowerCase().includes(search));
    }
    
    if (stock === 'low') {
        filtered = filtered.filter(item => item.quantity < 10 && item.quantity > 0);
    } else if (stock === 'out') {
        filtered = filtered.filter(item => item.quantity === 0);
    }
    
    displayInventory(filtered);
}

function showAddItemModal() {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000';
    
    modal.innerHTML = XSSProtection.sanitize(`
        <div style="background:#fff;border-radius:12px;padding:2rem;max-width:500px;width:90%">
            <h2 style="margin-bottom:1.5rem">Add Inventory Item</h2>
            <form id="addItemForm">
                <input type="text" id="productName" placeholder="Product Name" required style="width:100%;padding:0.75rem;margin-bottom:1rem;border:1px solid #e2e8f0;border-radius:8px">
                <input type="number" id="quantity" placeholder="Quantity" required style="width:100%;padding:0.75rem;margin-bottom:1rem;border:1px solid #e2e8f0;border-radius:8px">
                <input type="number" id="unitPrice" placeholder="Unit Price" required style="width:100%;padding:0.75rem;margin-bottom:1rem;border:1px solid #e2e8f0;border-radius:8px">
                <div style="display:flex;gap:1rem">
                    <button type="submit" class="btn-primary" style="flex:1">Add Item</button>
                    <button type="button" onclick="this.closest('div').parentElement.parentElement.remove()" style="flex:1;padding:0.75rem;background:#f3f4f6;border:none;border-radius:8px;cursor:pointer">Cancel</button>
                </div>
            </form>
        </div>
    `);
    
    document.body.appendChild(modal);
    
    document.getElementById('addItemForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const productName = document.getElementById('productName').value;
        const quantity = parseInt(document.getElementById('quantity').value);
        const unitPrice = parseFloat(document.getElementById('unitPrice').value);
        
        const { error } = await supabase.from('inventory').insert([{
            vendor_id: vendorId,
            product_name: productName,
            quantity: quantity,
            unit_price: unitPrice,
            total_value: quantity * unitPrice
        }]);
        
        if (error) {
            alert('Error: ' + error.message);
        } else {
            modal.remove();
            await loadInventory();
        }
    });
}

window.editItem = async function(itemId) {
    const item = allInventory.find(i => i.id === itemId);
    if (!item) return;
    
    const newQuantity = prompt('Enter new quantity:', item.quantity);
    if (newQuantity === null) return;
    
    const quantity = parseInt(newQuantity);
    const { error } = await supabase.from('inventory').update({
        quantity: quantity,
        total_value: quantity * item.unit_price,
        last_updated: new Date().toISOString()
    }).eq('id', itemId);
    
    if (error) {
        alert('Error: ' + error.message);
    } else {
        await loadInventory();
    }
};

window.deleteItem = async function(itemId) {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    const { error } = await supabase.from('inventory').delete().eq('id', itemId);
    
    if (error) {
        alert('Error: ' + error.message);
    } else {
        await loadInventory();
    }
};

