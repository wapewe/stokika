// XSS Protection: Using sanitize() helper from xss-protection.js
// Make sure xss-protection.js is loaded in your HTML file

if (!localStorage.getItem('vendor_id') || !localStorage.getItem('user_role')) {
    window.location.href = 'signin.html';
}
const userRole = localStorage.getItem('user_role');
if (userRole !== 'vendor') {
    alert('Access denied. This dashboard is for vendors only.');
    window.location.href = 'signin.html';
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.clear();
        window.location.href = 'signin.html';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.onclick = logout;
    }

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.onkeyup = handleSearch;
    }

    let supabase;
    if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
        supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    }
    
    loadDashboardData();
    
    async function loadDashboardData() {
        try {
            const vendorName = localStorage.getItem('vendor_name') || 'Vendor';
            const welcomeText = document.getElementById('vendorNameDisplay');
            if (welcomeText) welcomeText.textContent = vendorName;
            
            const { data: orders } = await supabase.from('orders').select('total_amount, status').eq('status', 'processing');
            const { data: payments } = await supabase.from('payments').select('amount').eq('status', 'pending');
            
            const activeOrders = orders ? orders.length : 0;
            const stockValue = orders ? orders.reduce(function(sum, o) { return sum + (o.total_amount || 0); }, 0) : 0;
            const pendingPayments = payments ? payments.reduce(function(sum, p) { return sum + (p.amount || 0); }, 0) : 0;
            
            document.querySelector('.stat-card.green .stat-value').textContent = 'KES ' + stockValue.toLocaleString();
            document.querySelector('.stat-card.blue .stat-value').textContent = activeOrders;
            document.querySelector('.stat-card.yellow .stat-value').textContent = 'KES ' + pendingPayments.toLocaleString();
            
            loadRecentOrders();
            loadUpcomingPayments();
            loadLowStockAlerts();
        } catch (err) {
            console.error('Error loading dashboard:', err);
        }
    }
    
    async function loadRecentOrders() {
        try {
            const { data: orders } = await supabase.from('orders').select('*, suppliers(company_name)').order('created_at', { ascending: false }).limit(3);
            const tbody = document.querySelector('.data-table tbody');
            if (!tbody) return;
            
            if (!orders || orders.length === 0) {
                tbody.innerHTML =XSSProtection.sanitize( XSSProtection.sanitize('<tr><td colspan="5" style="text-align:center;padding:2rem;color:#64748b">No recent orders</td></tr>');
                return;
            }
            
            const orderRows = orders.map(function(o) {
                const statusClass = o.status === 'delivered' ? 'success' : o.status === 'processing' ? 'info' : 'warning';
                return '<tr><td>' + XSSProtection.escapeHtml(o.order_number || 'N/A') + '</td><td>' + XSSProtection.escapeHtml(o.suppliers?.company_name || 'Stokika') + '</td><td>KES ' + XSSProtection.escapeHtml((o.total_amount || 0).toString()) + '</td><td><span class="badge ' + XSSProtection.escapeHtml(statusClass) + '">' + XSSProtection.escapeHtml(o.status) + '</span></td><td>' + XSSProtection.escapeHtml(new Date(o.created_at).toLocaleDateString()) + '</td></tr>';
            }).join('');
            tbody.innerHTML =XSSProtection.sanitize( XSSProtection.sanitize(orderRows);
        } catch (err) {
            console.error('Error loading orders:', err);
        }
    }
    
    async function loadUpcomingPayments() {
        try {
            const { data: payments } = await supabase.from('payments').select('*').eq('status', 'pending').order('due_date', { ascending: true }).limit(3);
            const timeline = document.querySelector('.payment-timeline');
            if (!timeline) return;
            
            if (!payments || payments.length === 0) {
                timeline.innerHTML =XSSProtection.sanitize( XSSProtection.sanitize('<p style="text-align:center;padding:2rem;color:#64748b">No upcoming payments</p>');
                return;
            }
            
            const paymentItems = payments.map(function(p) {
                const dueDate = new Date(p.due_date || p.payment_date);
                const today = new Date();
                const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
                const dueText = diffDays === 0 ? 'Due Today' : diffDays === 1 ? 'Due Tomorrow' : 'Due in ' + diffDays + ' days';
                return '<div class="timeline-item"><div class="timeline-dot"></div><div class="timeline-content"><div class="timeline-header"><h4>' + XSSProtection.escapeHtml(p.cycle_type || 'Payment') + '</h4><span class="timeline-amount">KES ' + XSSProtection.escapeHtml((p.amount || 0).toString()) + '</span></div><p>' + XSSProtection.escapeHtml(dueText) + '</p></div></div>';
            }).join('');
            timeline.innerHTML =XSSProtection.sanitize( XSSProtection.sanitize(paymentItems);
        } catch (err) {
            console.error('Error loading payments:', err);
        }
    }
    
    async function loadLowStockAlerts() {
        const alertList = document.querySelector('.alert-list');
        if (!alertList) return;
        alertList.innerHTML =XSSProtection.sanitize( XSSProtection.sanitize('<p style="text-align:center;padding:2rem;color:#64748b">No low stock alerts</p>');
    }

    const requestStock = document.getElementById('requestStock');
    if (requestStock) {
        requestStock.onclick = function() {
            showOrderModal();
        };
    }
    
    const kenyaCounties = ['Baringo','Bomet','Bungoma','Busia','Elgeyo-Marakwet','Embu','Garissa','Homa Bay','Isiolo','Kajiado','Kakamega','Kericho','Kiambu','Kilifi','Kirinyaga','Kisii','Kisumu','Kitui','Kwale','Laikipia','Lamu','Machakos','Makueni','Mandera','Marsabit','Meru','Migori','Mombasa','Murang\'a','Nairobi','Nakuru','Nandi','Narok','Nyamira','Nyandarua','Nyeri','Samburu','Siaya','Taita-Taveta','Tana River','Tharaka-Nithi','Trans Nzoia','Turkana','Uasin Gishu','Vihiga','Wajir','West Pokot'];
    
    function showOrderModal() {
        const modal = document.createElement('div');
        modal.id = 'orderModal';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:10000;padding:1rem;backdrop-filter:blur(5px)';
        
        modal.innerHTML =XSSProtection.sanitize( XSSProtection.sanitize(`
            <div style="background:#fff;border-radius:20px;max-width:500px;width:100%;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);overflow:hidden;animation:slideUp 0.3s ease">
                <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:2rem;color:#fff">
                    <h2 style="margin:0;font-size:1.75rem;font-weight:700">Request Stock</h2>
                    <p style="margin:0.5rem 0 0;opacity:0.9">Fill in the details below</p>
                </div>
                <div style="padding:2rem">
                    <div style="margin-bottom:1.5rem">
                        <label style="display:block;margin-bottom:0.5rem;color:#374151;font-weight:600;font-size:0.875rem">Your County</label>
                        <select id="orderCounty" onchange="handleCountyChange()" style="width:100%;padding:0.875rem;border:2px solid #e5e7eb;border-radius:12px;font-size:1rem;transition:all 0.2s" onfocus="this.style.borderColor='#667eea'" onblur="this.style.borderColor='#e5e7eb'">
                            <option value="">Select your county</option>
                        </select>
                    </div>
                    <div style="margin-bottom:1.5rem">
                        <label style="display:block;margin-bottom:0.5rem;color:#374151;font-weight:600;font-size:0.875rem">Order From</label>
                        <select id="orderSupplierType" onchange="handleSupplierTypeChange()" style="width:100%;padding:0.875rem;border:2px solid #e5e7eb;border-radius:12px;font-size:1rem;transition:all 0.2s" onfocus="this.style.borderColor='#667eea'" onblur="this.style.borderColor='#e5e7eb'">
                            <option value="">Select option</option>
                            <option value="stokika">Stokika (Admin will process)</option>
                            <option value="supplier">Direct from Supplier</option>
                        </select>
                    </div>
                    <div id="supplierSelectDiv" style="margin-bottom:1.5rem;display:none">
                        <label style="display:block;margin-bottom:0.5rem;color:#374151;font-weight:600;font-size:0.875rem">Select Supplier</label>
                        <select id="orderSupplier" style="width:100%;padding:0.875rem;border:2px solid #e5e7eb;border-radius:12px;font-size:1rem;transition:all 0.2s" onfocus="this.style.borderColor='#667eea'" onblur="this.style.borderColor='#e5e7eb'">
                            <option value="">Select a supplier</option>
                        </select>
                    </div>
                    <div style="margin-bottom:1.5rem">
                        <label style="display:block;margin-bottom:0.5rem;color:#374151;font-weight:600;font-size:0.875rem">Product Name</label>
                        <input type="text" id="orderProduct" placeholder="Enter product name" style="width:100%;padding:0.875rem;border:2px solid #e5e7eb;border-radius:12px;font-size:1rem;transition:all 0.2s" onfocus="this.style.borderColor='#667eea'" onblur="this.style.borderColor='#e5e7eb'">
                    </div>
                    <div style="margin-bottom:1.5rem">
                        <label style="display:block;margin-bottom:0.5rem;color:#374151;font-weight:600;font-size:0.875rem">Quantity</label>
                        <input type="number" id="orderQuantity" placeholder="Enter quantity" min="1" style="width:100%;padding:0.875rem;border:2px solid #e5e7eb;border-radius:12px;font-size:1rem;transition:all 0.2s" onfocus="this.style.borderColor='#667eea'" onblur="this.style.borderColor='#e5e7eb'">
                    </div>
                    <div style="display:flex;gap:1rem;margin-top:2rem">
                        <button onclick="submitOrder()" style="flex:1;padding:1rem;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;border:none;border-radius:12px;font-weight:600;font-size:1rem;cursor:pointer;transition:transform 0.2s" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">Submit Order</button>
                        <button onclick="closeOrderModal()" style="flex:1;padding:1rem;background:#f3f4f6;color:#374151;border:none;border-radius:12px;font-weight:600;font-size:1rem;cursor:pointer;transition:all 0.2s" onmouseover="this.style.background='#e5e7eb'" onmouseout="this.style.background='#f3f4f6'">Cancel</button>
                    </div>
                </div>
            </div>
        `);
        
        document.body.appendChild(modal);
        loadCounties();
        modal.onclick = function(e) { if (e.target === modal) closeOrderModal(); };
    }
    
    function loadCounties() {
        const select = document.getElementById('orderCounty');
        if (!select) return;
        kenyaCounties.forEach(function(county) {
            const option = document.createElement('option');
            option.value = county;
            option.textContent = county;
            select.appendChild(option);
        });
    }
    
    window.handleCountyChange = function() {
        const county = document.getElementById('orderCounty').value;
        const supplierType = document.getElementById('orderSupplierType').value;
        if (county && supplierType === 'supplier') {
            loadSuppliersForOrder(county);
        }
    }
    
    window.handleSupplierTypeChange = function() {
        const type = document.getElementById('orderSupplierType').value;
        const supplierDiv = document.getElementById('supplierSelectDiv');
        const county = document.getElementById('orderCounty').value;
        
        if (type === 'supplier') {
            supplierDiv.style.display = 'block';
            if (county) {
                loadSuppliersForOrder(county);
            } else {
                alert('Please select your county first');
                document.getElementById('orderSupplierType').value = '';
            }
        } else {
            supplierDiv.style.display = 'none';
        }
    }
    
    async function loadSuppliersForOrder(county) {
        try {
            const { data: suppliers, error } = await supabase
                .from('suppliers')
                .select('id, company_name, counties')
                .eq('status', 'approved');
            
            if (error) throw error;
            
            const select = document.getElementById('orderSupplier');
            if (!select) return;
            
            select.innerHTML =XSSProtection.sanitize( XSSProtection.sanitize('<option value="">Select a supplier</option>');
            
            if (suppliers && suppliers.length > 0) {
                const filteredSuppliers = suppliers.filter(function(s) {
                    if (!s.counties) return false;
                    const supplierCounties = s.counties.toLowerCase();
                    return supplierCounties.includes(county.toLowerCase());
                });
                
                if (filteredSuppliers.length === 0) {
                    select.innerHTML =XSSProtection.sanitize( XSSProtection.sanitize('<option value="">No suppliers in your county</option>');
                    return;
                }
                
                filteredSuppliers.forEach(function(s) {
                    const option = document.createElement('option');
                    option.value = s.id;
                    option.textContent = s.company_name;
                    select.appendChild(option);
                });
            } else {
                select.innerHTML =XSSProtection.sanitize( XSSProtection.sanitize('<option value="">No suppliers available</option>');
            }
        } catch (err) {
            console.error('Error loading suppliers:', err);
            const select = document.getElementById('orderSupplier');
            if (select) select.innerHTML =XSSProtection.sanitize( XSSProtection.sanitize('<option value="">Error loading suppliers</option>');
        }
    }
    
    window.submitOrder = async function() {
        const county = document.getElementById('orderCounty').value;
        const supplierType = document.getElementById('orderSupplierType').value;
        const product = document.getElementById('orderProduct').value;
        const quantity = document.getElementById('orderQuantity').value;
        
        if (!county || !supplierType || !product || !quantity) {
            alert('Please fill in all fields');
            return;
        }
        
        let supplierId = null;
        let status = 'pending_admin';
        
        if (supplierType === 'supplier') {
            supplierId = document.getElementById('orderSupplier').value;
            if (!supplierId) {
                alert('Please select a supplier');
                return;
            }
            status = 'pending_supplier';
        }
        
        try {
            const orderData = {
                supplier_id: supplierId,
                order_number: 'ORD-' + Date.now(),
                total_amount: 0,
                status: status,
                cycle_type: 'one_time'
            };
            
            const { error } = await supabase.from('orders').insert([orderData]);
            if (error) throw error;
            
            closeOrderModal();
            alert('Order submitted successfully! ' + (supplierType === 'stokika' ? 'Admin will process your order.' : 'Supplier will review your order.'));
        } catch (err) {
            console.error('Error:', err);
            alert('Error: ' + err.message);
        }
    }
    
    window.closeOrderModal = function() {
        const modal = document.getElementById('orderModal');
        if (modal) modal.remove();
    }

    const makePayment = document.getElementById('makePayment');
    if (makePayment) {
        makePayment.onclick = function() {
            showPaymentModal();
        };
    }
    
    function showPaymentModal() {
        const modal = document.createElement('div');
        modal.id = 'paymentModal';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:10000;padding:1rem;backdrop-filter:blur(5px)';
        
        modal.innerHTML =XSSProtection.sanitize( XSSProtection.sanitize(`
            <div style="background:#fff;border-radius:20px;max-width:500px;width:100%;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);overflow:hidden">
                <div style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);padding:2rem;color:#fff">
                    <h2 style="margin:0;font-size:1.75rem;font-weight:700">Make Payment</h2>
                    <p style="margin:0.5rem 0 0;opacity:0.9">Pay to Stokika Platform</p>
                </div>
                <div style="padding:2rem">
                    <div style="margin-bottom:1.5rem">
                        <label style="display:block;margin-bottom:0.5rem;color:#374151;font-weight:600;font-size:0.875rem">Payment Method</label>
                        <select id="paymentMethod" onchange="handlePaymentMethodChange()" style="width:100%;padding:0.875rem;border:2px solid #e5e7eb;border-radius:12px;font-size:1rem;transition:all 0.2s" onfocus="this.style.borderColor='#10b981'" onblur="this.style.borderColor='#e5e7eb'">
                            <option value="">Select method</option>
                            <option value="manual">Manual Payment (Enter Code)</option>
                            <option value="prompt">M-Pesa Prompt (STK Push)</option>
                        </select>
                    </div>
                    <div id="paybillInfo" style="background:#f0fdf4;border:2px solid #86efac;border-radius:12px;padding:1.5rem;margin-bottom:1.5rem;display:none">
                        <div style="text-align:center">
                            <p style="margin:0;color:#166534;font-weight:600;font-size:0.875rem">PAYBILL NUMBER</p>
                            <p style="margin:0.5rem 0 0;color:#15803d;font-size:2rem;font-weight:700;letter-spacing:2px">123456</p>
                            <p style="margin:0.75rem 0 0;color:#166534;font-size:0.875rem">Account: STOKIKA</p>
                        </div>
                    </div>
                    <div style="margin-bottom:1.5rem">
                        <label style="display:block;margin-bottom:0.5rem;color:#374151;font-weight:600;font-size:0.875rem">Amount (KES)</label>
                        <input type="number" id="paymentAmount" placeholder="Enter amount" min="1" style="width:100%;padding:0.875rem;border:2px solid #e5e7eb;border-radius:12px;font-size:1rem;transition:all 0.2s" onfocus="this.style.borderColor='#10b981'" onblur="this.style.borderColor='#e5e7eb'">
                    </div>
                    <div style="margin-bottom:1.5rem">
                        <label style="display:block;margin-bottom:0.5rem;color:#374151;font-weight:600;font-size:0.875rem">Phone Number</label>
                        <input type="tel" id="paymentPhone" placeholder="07XX XXX XXX" style="width:100%;padding:0.875rem;border:2px solid #e5e7eb;border-radius:12px;font-size:1rem;transition:all 0.2s" onfocus="this.style.borderColor='#10b981'" onblur="this.style.borderColor='#e5e7eb'">
                    </div>
                    <div id="codeField" style="margin-bottom:1.5rem;display:none">
                        <label style="display:block;margin-bottom:0.5rem;color:#374151;font-weight:600;font-size:0.875rem">M-Pesa Transaction Code</label>
                        <input type="text" id="paymentCode" placeholder="e.g., QA12BC3DE4" style="width:100%;padding:0.875rem;border:2px solid #e5e7eb;border-radius:12px;font-size:1rem;text-transform:uppercase;transition:all 0.2s" onfocus="this.style.borderColor='#10b981'" onblur="this.style.borderColor='#e5e7eb'">
                    </div>
                    <div style="display:flex;gap:1rem;margin-top:2rem">
                        <button onclick="submitPayment()" style="flex:1;padding:1rem;background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:#fff;border:none;border-radius:12px;font-weight:600;font-size:1rem;cursor:pointer;transition:transform 0.2s" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">Submit Payment</button>
                        <button onclick="closePaymentModal()" style="flex:1;padding:1rem;background:#f3f4f6;color:#374151;border:none;border-radius:12px;font-weight:600;font-size:1rem;cursor:pointer;transition:all 0.2s" onmouseover="this.style.background='#e5e7eb'" onmouseout="this.style.background='#f3f4f6'">Cancel</button>
                    </div>
                </div>
            </div>
        `);
        
        document.body.appendChild(modal);
        modal.onclick = function(e) { if (e.target === modal) closePaymentModal(); };
    }
    
    window.handlePaymentMethodChange = function() {
        const method = document.getElementById('paymentMethod').value;
        const paybillInfo = document.getElementById('paybillInfo');
        const codeField = document.getElementById('codeField');
        
        if (method === 'manual') {
            paybillInfo.style.display = 'block';
            codeField.style.display = 'block';
        } else if (method === 'prompt') {
            paybillInfo.style.display = 'none';
            codeField.style.display = 'none';
        } else {
            paybillInfo.style.display = 'none';
            codeField.style.display = 'none';
        }
    }
    
    window.submitPayment = async function() {
        const method = document.getElementById('paymentMethod').value;
        const amount = document.getElementById('paymentAmount').value;
        const phone = document.getElementById('paymentPhone').value;
        
        if (!method || !amount || !phone) {
            alert('Please fill in all required fields');
            return;
        }
        
        try {
            const vendorName = localStorage.getItem('vendor_name') || 'Unknown Vendor';
            
            if (method === 'manual') {
                const code = document.getElementById('paymentCode').value;
                if (!code) {
                    alert('Please enter M-Pesa transaction code');
                    return;
                }
                
                const paymentData = {
                    amount: parseFloat(amount),
                    payment_method: 'mpesa_manual',
                    payment_date: new Date().toISOString(),
                    status: 'pending',
                    mpesa_code: code.toUpperCase(),
                    phone_number: phone,
                    vendor_name: vendorName
                };
                
                const { error } = await supabase.from('payments').insert([paymentData]);
                if (error) throw error;
                
                closePaymentModal();
                alert('Payment submitted successfully! Admin will verify and confirm.');
            } else if (method === 'prompt') {
                alert('Sending M-Pesa prompt to ' + phone + ' for KES ' + amount + '...\n\nPlease check your phone and enter your M-Pesa PIN.');
                
                const paymentData = {
                    amount: parseFloat(amount),
                    payment_method: 'mpesa_prompt',
                    payment_date: new Date().toISOString(),
                    status: 'pending',
                    phone_number: phone,
                    vendor_name: vendorName
                };
                
                const { error } = await supabase.from('payments').insert([paymentData]);
                if (error) throw error;
                
                closePaymentModal();
                alert('Payment request sent! Please complete on your phone.');
            }
        } catch (err) {
            console.error('Error:', err);
            alert('Error: ' + err.message);
        }
    }
    
    window.closePaymentModal = function() {
        const modal = document.getElementById('paymentModal');
        if (modal) modal.remove();
    }

    const browseSuppliers = document.getElementById('browseSuppliers');
    if (browseSuppliers) {
        browseSuppliers.onclick = function() {
            window.location.href = 'suppliers.html';
        };
    }

    const viewReports = document.getElementById('viewReports');
    if (viewReports) {
        viewReports.onclick = function() {
            window.location.href = 'analytics.html';
        };
    }

    const viewAllOrders = document.getElementById('viewAllOrders');
    if (viewAllOrders) {
        viewAllOrders.onclick = function(e) {
            e.preventDefault();
            window.location.href = 'orders.html';
        };
    }

    const restockAll = document.getElementById('restockAll');
    if (restockAll) {
        restockAll.onclick = function(e) {
            e.preventDefault();
            if (confirm('Restock all low stock items?\n\n• Milk (500ml): 5 units\n• Bread (Loaf): 8 units\n• Smokies (Pack): 3 units')) {
                alert('Restock orders placed successfully!');
            }
        };
    }

    const viewSchedule = document.getElementById('viewSchedule');
    if (viewSchedule) {
        viewSchedule.onclick = function(e) {
            e.preventDefault();
            window.location.href = 'payments.html';
        };
    }

    const orderBtns = document.querySelectorAll('.order-btn');
    orderBtns.forEach(function(btn) {
        btn.onclick = function() {
            const item = btn.closest('.alert-item').querySelector('h4').textContent;
            const quantity = prompt('How many units of ' + item + ' to order?');
            if (quantity) alert('Order placed: ' + quantity + ' units of ' + item);
        };
    });

    function toggleTheme() {
        document.body.classList.toggle('dark-mode');
        document.querySelector('.dashboard-container').classList.toggle('dark-mode');
        document.querySelector('.sidebar').classList.toggle('dark-mode');
        document.querySelector('.main-content').classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        const logo = document.getElementById('dashboardLogo');
        if (logo) {
            logo.src = isDark ? '../assets/logos/logo.png.png' : '../assets/logos/logo-dark.png';
        }
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }
    
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            toggleTheme();
        };
    }
    
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        document.querySelector('.dashboard-container')?.classList.add('dark-mode');
        document.querySelector('.sidebar')?.classList.add('dark-mode');
        document.querySelector('.main-content')?.classList.add('dark-mode');
        const logo = document.getElementById('dashboardLogo');
        if (logo) logo.src = '../assets/logos/logo.png.png';
    }
    
    window.handleSearch = async function(event) {
        const query = event.target.value.toLowerCase().trim();
        if (query.length < 2) {
            loadRecentOrders();
            return;
        }
        
        try {
            const { data: orders } = await supabase
                .from('orders')
                .select('*, suppliers(company_name)')
                .or('order_number.ilike.%' + query + '%,status.ilike.%' + query + '%')
                .order('created_at', { ascending: false })
                .limit(10);
            
            const tbody = document.querySelector('.data-table tbody');
            if (!tbody) return;
            
            if (!orders || orders.length === 0) {
                tbody.innerHTML =XSSProtection.sanitize( XSSProtection.sanitize('<tr><td colspan="5" style="text-align:center;padding:2rem;color:#64748b">No results found for "' + XSSProtection.escapeHtml(query) + '"</td></tr>');
                return;
            }
            
            const searchRows = orders.map(function(o) {
                const statusClass = o.status === 'delivered' ? 'success' : o.status === 'processing' ? 'info' : 'warning';
                return '<tr><td>' + XSSProtection.escapeHtml(o.order_number || 'N/A') + '</td><td>' + XSSProtection.escapeHtml(o.suppliers?.company_name || 'Stokika') + '</td><td>KES ' + XSSProtection.escapeHtml((o.total_amount || 0).toString()) + '</td><td><span class="badge ' + XSSProtection.escapeHtml(statusClass) + '">' + XSSProtection.escapeHtml(o.status) + '</span></td><td>' + XSSProtection.escapeHtml(new Date(o.created_at).toLocaleDateString()) + '</td></tr>';
            }).join('');
            tbody.innerHTML =XSSProtection.sanitize( XSSProtection.sanitize(searchRows);
        } catch (err) {
            console.error('Search error:', err);
        }
    }
    
    const notificationBtn = document.getElementById('notificationBtn');
    if (notificationBtn) {
        notificationBtn.onclick = async function() {
            try {
                const { data: orders } = await supabase.from('orders').select('status').in('status', ['pending_admin', 'pending_supplier', 'declined']);
                const { data: payments } = await supabase.from('payments').select('status').eq('status', 'pending');
                const count = (orders ? orders.length : 0) + (payments ? payments.length : 0);
                alert('Notifications:\n\n' + (orders ? orders.length : 0) + ' pending orders\n' + (payments ? payments.length : 0) + ' pending payments');
            } catch (err) {
                alert('No new notifications');
            }
        };
    }
    
    async function updateNotificationCount() {
        try {
            const { data: orders } = await supabase.from('orders').select('id').in('status', ['pending_admin', 'pending_supplier', 'declined']);
            const { data: payments } = await supabase.from('payments').select('id').eq('status', 'pending');
            const count = (orders ? orders.length : 0) + (payments ? payments.length : 0);
            const badge = document.getElementById('notificationCount');
            if (badge) badge.textContent = count;
        } catch (err) {
            console.error('Error updating notifications:', err);
        }
    }
    
    updateNotificationCount();
    setInterval(updateNotificationCount, 30000);

    const requestStockBtn = document.getElementById('requestStockBtn');
    if (requestStockBtn) {
        requestStockBtn.onclick = function() {
            showOrderModal();
        };
    }

    if (window.innerWidth <= 768 && !document.querySelector('.mobile-toggle')) {
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'mobile-toggle';
        toggleBtn.textContent = '☰';
        toggleBtn.style.cssText = 'position:fixed;top:1rem;left:1rem;z-index:1000;background:#fff;border:1px solid #e2e8f0;width:40px;height:40px;border-radius:8px;font-size:1.5rem;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,0.1)';
        toggleBtn.onclick = function() {
            document.querySelector('.sidebar').classList.toggle('active');
        };
        document.body.appendChild(toggleBtn);
    }
});
