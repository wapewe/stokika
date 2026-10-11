let supabase;
let supervisorId = localStorage.getItem('vendor_id');
let supervisorRegion = '';

if (!supervisorId || localStorage.getItem('user_role') !== 'supervisor') {
    window.location.href = 'signin.html';
}

if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
    supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
}

function switchTab(tab) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    if (tab === 'agents') {
        document.getElementById('agents-tab').classList.add('active');
        loadAgents();
    } else if (tab === 'vendors') {
        document.getElementById('vendors-tab').classList.add('active');
        loadVendors();
    }
}

async function loadSupervisorData() {
    if (!supabase || !supervisorId) return;
    
    try {
        const { data, error } = await supabase
            .from('supervisors')
            .select('full_name, county')
            .eq('id', supervisorId)
            .single();
        
        if (error) throw error;
        
        if (data) {
            document.getElementById('supervisorName').textContent = data.full_name || 'Supervisor';
            supervisorRegion = data.county || '';
            
            const badge = document.getElementById('regionBadge');
            badge.textContent = supervisorRegion || 'No Region';
            badge.className = 'status-badge status-approved';
        }
    } catch (err) {
        console.error('Error loading supervisor data:', err);
    }
}

async function loadStats() {
    if (!supabase || !supervisorId) return;
    
    try {
        const { data: agents } = await supabase
            .from('field_agents')
            .select('id')
            .eq('county', supervisorRegion);
        
        const agentIds = agents?.map(a => a.id) || [];
        
        const { data: vendors } = await supabase
            .from('vendors')
            .select('id')
            .in('agent_id', agentIds);
        
        const vendorIds = vendors?.map(v => v.id) || [];
        
        const { data: orders } = await supabase
            .from('orders')
            .select('total_amount')
            .in('vendor_id', vendorIds);
        
        const revenue = orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
        
        document.getElementById('totalAgents').textContent = agents?.length || 0;
        document.getElementById('totalVendors').textContent = vendors?.length || 0;
        document.getElementById('totalOrders').textContent = orders?.length || 0;
        document.getElementById('totalRevenue').textContent = 'KES ' + revenue.toLocaleString();
        
        loadRecentActivity();
    } catch (err) {
        console.error('Error loading stats:', err);
    }
}

async function loadRecentActivity() {
    if (!supabase || !supervisorId) return;
    
    try {
        const { data: agents } = await supabase
            .from('field_agents')
            .select('id')
            .eq('county', supervisorRegion);
        
        const agentIds = agents?.map(a => a.id) || [];
        
        const { data: vendors } = await supabase
            .from('vendors')
            .select('business_name, created_at, agent_id')
            .in('agent_id', agentIds)
            .order('created_at', { ascending: false })
            .limit(10);
        
        const html = vendors && vendors.length > 0 ? `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Activity</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${vendors.map(v => `
                        <tr>
                            <td>New vendor registered: ${v.business_name}</td>
                            <td>${new Date(v.created_at).toLocaleString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : '<p class="no-data">No recent activity</p>';
        
        document.getElementById('recentActivity').innerHTML = XSSProtection.sanitize(html);
    } catch (err) {
        console.error('Error loading recent activity:', err);
    }
}

async function loadAgents() {
    if (!supabase || !supervisorId) return;
    
    document.getElementById('agentsLoading').style.display = 'block';
    
    try {
        const { data, error } = await supabase
            .from('field_agents')
            .select('*')
            .eq('county', supervisorRegion)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const html = data && data.length > 0 ? `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Status</th>
                        <th>Vendors</th>
                        <th>Joined</th>
                    </tr>
                </thead>
                <tbody>
                    ${await Promise.all(data.map(async a => {
                        const { data: vendors } = await supabase
                            .from('vendors')
                            .select('id')
                            .eq('agent_id', a.id);
                        
                        return `
                            <tr>
                                <td>${a.full_name}</td>
                                <td>${a.email}</td>
                                <td>${a.phone}</td>
                                <td><span class="status-badge status-${a.approval_status || a.status}">${a.approval_status || a.status}</span></td>
                                <td>${vendors?.length || 0}</td>
                                <td>${new Date(a.created_at).toLocaleDateString()}</td>
                            </tr>
                        `;
                    }))}
                </tbody>
            </table>
        ` : '<p class="no-data">No field agents in your region</p>';
        
        document.getElementById('agentsTable').innerHTML = XSSProtection.sanitize(html);
    } catch (err) {
        console.error('Error loading agents:', err);
        document.getElementById('agentsTable').innerHTML = XSSProtection.sanitize('<p class="no-data">Error loading agents</p>');
    }
    
    document.getElementById('agentsLoading').style.display = 'none';
}

async function loadVendors() {
    if (!supabase || !supervisorId) return;
    
    document.getElementById('vendorsLoading').style.display = 'block';
    const searchQuery = document.getElementById('vendorSearch').value;
    
    try {
        const { data: agents } = await supabase
            .from('field_agents')
            .select('id')
            .eq('county', supervisorRegion);
        
        const agentIds = agents?.map(a => a.id) || [];
        
        let query = supabase
            .from('vendors')
            .select('*, field_agents(full_name)')
            .in('agent_id', agentIds);
        
        if (searchQuery) {
            query = query.ilike('business_name', `%${searchQuery}%`);
        }
        
        const { data, error } = await query.order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const html = data && data.length > 0 ? `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Business Name</th>
                        <th>Contact</th>
                        <th>Phone</th>
                        <th>Email</th>
                        <th>Field Agent</th>
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
                            <td>${v.field_agents?.full_name || 'Direct'}</td>
                            <td><span class="status-badge status-${v.status}">${v.status}</span></td>
                            <td>${new Date(v.created_at).toLocaleDateString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : '<p class="no-data">No vendors found</p>';
        
        document.getElementById('vendorsTable').innerHTML = XSSProtection.sanitize(html);
    } catch (err) {
        console.error('Error loading vendors:', err);
        document.getElementById('vendorsTable').innerHTML = XSSProtection.sanitize('<p class="no-data">Error loading vendors</p>');
    }
    
    document.getElementById('vendorsLoading').style.display = 'none';
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.clear();
        window.location.href = 'signin.html';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadSupervisorData();
    loadStats();
    
    // Settings button handler
    document.getElementById('settingsBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        openSettingsModal();
    });
});
