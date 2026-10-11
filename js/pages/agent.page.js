let supabase;
let agentId = localStorage.getItem('vendor_id');
let agentPermissions = { can_create_users: false };

if (!agentId || localStorage.getItem('user_role') !== 'field_agent') {
    window.location.href = 'signin.html';
}

if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
    supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
}

function switchTab(tab) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    if (tab === 'vendors') {
        document.getElementById('vendors-tab').classList.add('active');
        loadMyVendors();
    } else if (tab === 'suppliers') {
        document.getElementById('suppliers-tab').classList.add('active');
        loadMySuppliers();
    }
}

async function loadAgentData() {
    if (!supabase || !agentId) return;
    
    try {
        const { data, error } = await supabase
            .from('users')
            .select('name, permissions')
            .eq('id', agentId)
            .single();
        
        if (error) throw error;
        
        if (data) {
            document.getElementById('agentName').textContent = data.name || 'Agent';
            
            if (typeof data.permissions === 'string') {
                try {
                    agentPermissions = JSON.parse(data.permissions);
                } catch (e) {
                    agentPermissions = { can_create_users: false };
                }
            } else {
                agentPermissions = data.permissions || { can_create_users: false };
            }
            
            const badge = document.getElementById('permissionBadge');
            const canCreate = agentPermissions.can_create_users === true;
            
            if (canCreate) {
                badge.textContent = '✓ Can Create Users';
                badge.className = 'status-badge status-approved';
                document.getElementById('createVendorBtn').disabled = false;
                document.getElementById('createSupplierBtn').disabled = false;
            } else {
                badge.textContent = '✗ No Create Permission';
                badge.className = 'status-badge status-pending';
                document.getElementById('createVendorBtn').disabled = true;
                document.getElementById('createSupplierBtn').disabled = true;
            }
        }
    } catch (err) {
        console.error('Error loading agent data:', err);
        agentPermissions = { can_create_users: false };
        document.getElementById('createVendorBtn').disabled = true;
        document.getElementById('createSupplierBtn').disabled = true;
    }
}

async function loadStats() {
    if (!supabase || !agentId) return;
    
    try {
        const { data: vendors } = await supabase
            .from('vendors')
            .select('id')
            .eq('agent_id', agentId);
        
        const { data: suppliers } = await supabase
            .from('suppliers')
            .select('id')
            .eq('agent_id', agentId);
        
        const { data: orders } = await supabase
            .from('orders')
            .select('id')
            .in('vendor_id', vendors?.map(v => v.id) || []);
        
        document.getElementById('myVendorsCount').textContent = vendors?.length || 0;
        document.getElementById('mySuppliersCount').textContent = suppliers?.length || 0;
        document.getElementById('totalOrders').textContent = orders?.length || 0;
    } catch (err) {
        console.error('Error loading stats:', err);
    }
}

async function loadMyVendors() {
    if (!supabase || !agentId) return;
    
    document.getElementById('vendorsLoading').style.display = 'block';
    
    try {
        const { data, error } = await supabase
            .from('vendors')
            .select('*')
            .eq('agent_id', agentId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const table = data && data.length > 0 ? `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Business Name</th>
                        <th>Contact</th>
                        <th>Phone</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Joined</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(v => `
                        <tr>
                            <td>${v.business_name || 'N/A'}</td>
                            <td>${v.name || 'N/A'}</td>
                            <td>${v.phone || 'N/A'}</td>
                            <td>${v.email || 'N/A'}</td>
                            <td><span class="status-badge status-${v.status}">${v.status}</span></td>
                            <td>${new Date(v.created_at).toLocaleDateString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : '<p class="no-data">No vendors yet</p>';
        
        document.getElementById('vendorsTable').innerHTML = XSSProtection.sanitize(table;
    } catch (err) {
        console.error('Error loading vendors:', err);
        document.getElementById('vendorsTable').innerHTML =XSSProtection.sanitize( XSSProtection.sanitize(<p class="no-data">Error loading vendors</p>';
    }
    
    document.getElementById('vendorsLoading').style.display = 'none';
}

async function loadMySuppliers() {
    if (!supabase || !agentId) return;
    
    document.getElementById('suppliersLoading').style.display = 'block';
    
    try {
        const { data, error } = await supabase
            .from('suppliers')
            .select('*')
            .eq('agent_id', agentId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const table = data && data.length > 0 ? `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Company Name</th>
                        <th>Contact Person</th>
                        <th>Phone</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Joined</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(s => `
                        <tr>
                            <td>${s.company_name || 'N/A'}</td>
                            <td>${s.contact_person || 'N/A'}</td>
                            <td>${s.phone || 'N/A'}</td>
                            <td>${s.email || 'N/A'}</td>
                            <td><span class="status-badge status-${s.status}">${s.status}</span></td>
                            <td>${new Date(s.created_at).toLocaleDateString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : '<p class="no-data">No suppliers yet</p>';
        
        document.getElementById('suppliersTable').innerHTML = XSSProtection.sanitize(table;
    } catch (err) {
        console.error('Error loading suppliers:', err);
        document.getElementById('suppliersTable').innerHTML =XSSProtection.sanitize( XSSProtection.sanitize(<p class="no-data">Error loading suppliers</p>';
    }
    
    document.getElementById('suppliersLoading').style.display = 'none';
}

function openCreateUserModal(type) {
    if (!agentPermissions.can_create_users) {
        alert('You do not have permission to create users. Contact admin.');
        return;
    }
    
    document.getElementById('modalTitle').textContent = `Create ${type === 'vendor' ? 'Vendor' : 'Supplier'}`;
    document.getElementById('userType').value = type;
    document.getElementById('createUserModal').classList.add('show');
}

function closeModal() {
    document.getElementById('createUserModal').classList.remove('show');
    document.getElementById('createUserForm').reset();
}

document.getElementById('createUserForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('userName').value;
    const email = document.getElementById('userEmail').value;
    const phone = document.getElementById('userPhone').value;
    const password = document.getElementById('userPassword').value;
    const userType = document.getElementById('userType').value;
    
    if (!supabase) {
        alert('Unable to connect to database');
        return;
    }
    
    try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password
        });
        
        if (authError) throw authError;
        
        const table = userType === 'vendor' ? 'vendors' : 'suppliers';
        const insertData = {
            id: authData.user.id,
            name: name,
            email: email,
            phone: phone,
            agent_id: agentId,
            status: 'pending',
            created_at: new Date().toISOString()
        };
        
        if (userType === 'vendor') {
            insertData.business_name = name;
        } else {
            insertData.company_name = name;
            insertData.contact_person = name;
        }
        
        const { error: dbError } = await supabase.from(table).insert([insertData]);
        
        if (dbError) throw dbError;
        
        const { error: userError } = await supabase.from('users').insert([{
            id: authData.user.id,
            name: name,
            email: email,
            role: 'user',
            user_type: userType,
            created_at: new Date().toISOString()
        }]);
        
        if (userError) throw userError;
        
        alert(`${userType === 'vendor' ? 'Vendor' : 'Supplier'} created successfully!`);
        closeModal();
        loadStats();
        if (userType === 'vendor') loadMyVendors();
        else loadMySuppliers();
    } catch (err) {
        console.error('Error creating user:', err);
        alert('Error: ' + err.message);
    }
});

function viewMyReferralLink() {
    const link = `${window.location.origin}/signup?ref=${agentId}`;
    alert(`Your Referral Link:\n\n${link}\n\nShare this link with vendors and suppliers to sign them up under your account.`);
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.clear();
        window.location.href = 'signin.html';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadAgentData();
    loadStats();
});
