// Dashboard Authentication and Access Control
// Protects dashboards from unauthorized access

(async function() {
    const currentPage = window.location.pathname.split('/').pop();
    
    // Skip rembrandts.html - it has its own authentication via rembrandts-donji.html
    if (currentPage === 'rembrandts.html') {
        return;
    }
    
    // Define dashboard access rules for non-admin dashboards
    const dashboardRoles = {
        'inventory.html': ['vendor'],
        'supplier.html': ['supplier'],
        'supervisor.html': ['supervisor'],
        'agent.html': ['field_agent']
    };
    
    // Check if current page requires authentication
    const requiredRoles = dashboardRoles[currentPage];
    
    if (!requiredRoles) {
        return; // Public page, no auth needed
    }
    
    // Initialize Supabase
    const supabase = initSupabase();
    if (!supabase) {
        window.location.href = 'signin.html';
        return;
    }
    
    try {
        // Check if user is logged in
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
            // Not logged in, redirect to signin
            window.location.href = 'signin.html';
            return;
        }
        
        // Get user data from users table
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('user_type, role')
            .eq('id', session.user.id)
            .single();
        
        if (userError || !userData) {
            // User not found in database
            window.location.href = 'signin.html';
            return;
        }
        
        // Check if user has required role
        const userRole = userData.user_type || userData.role;
        
        if (!requiredRoles.includes(userRole)) {
            // User doesn't have permission for this dashboard
            alert(`Access denied. This dashboard is for ${requiredRoles.join(' or ')} only.`);
            
            // Redirect to appropriate dashboard
            const redirectMap = {
                'admin': 'rembrandts.html',
                'vendor': 'inventory.html',
                'supplier': 'supplier.html',
                'supervisor': 'supervisor.html',
                'field_agent': 'agent.html'
            };
            
            window.location.href = redirectMap[userRole] || 'signin.html';
            return;
        }
        
        // User has access, continue loading page
        console.log('Access granted for', userRole);
        
    } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = 'signin.html';
    }
})();
