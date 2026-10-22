// Admin Authentication Guard
// Protects rembrandts.html from unauthorized access

(async function() {
    console.log('🔵 AUTH GUARD: Starting authentication check');
    
    // Check localStorage whitelist FIRST - bypass all Supabase timing issues
    const ADMIN_EMAILS = ['krieta8@gmail.com'];
    const storedWhitelisted = localStorage.getItem('admin_whitelisted');
    const storedEmail = localStorage.getItem('admin_email');
    
    if (storedWhitelisted === 'true' && storedEmail && ADMIN_EMAILS.includes(storedEmail)) {
        console.log('✅ AUTH GUARD: Admin whitelisted via localStorage - ALLOWING ACCESS');
        console.log('   - Stored email:', storedEmail);
        window.dispatchEvent(new Event('admin-authenticated'));
        return;
    }
    
    console.log('🔵 AUTH GUARD: No localStorage whitelist found, checking session...');
    
    // Wait for config to load
    if (!window.ConfigLoader) {
        console.error('❌ AUTH GUARD: ConfigLoader not available');
        window.location.href = 'rembrandts-donji.html';
        return;
    }

    try {
        const config = await window.ConfigLoader.loadConfig();
        window.SUPABASE_URL = config.supabaseUrl;
        window.SUPABASE_ANON_KEY = config.supabaseAnonKey;

        // Initialize Supabase
        if (!window.supabase) {
            console.error('❌ AUTH GUARD: Supabase library not loaded');
            window.location.href = 'rembrandts-donji.html';
            return;
        }

        // Use the global Supabase client instead of creating a new one
        const supabaseClient = window._supabaseClient || window.supabase.createClient(
            config.supabaseUrl,
            config.supabaseAnonKey
        );
        
        // Store globally if not already stored
        if (!window._supabaseClient) {
            window._supabaseClient = supabaseClient;
        }

        // Check authentication
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        
        // TEMPORARY: Check whitelist first - before any other validation
        const ADMIN_EMAILS = ['krieta8@gmail.com', 'sponyomjaka@gmail.com'];
        
        console.log('🔵 AUTH GUARD: Session check result:', {
            hasSession: !!session,
            userEmail: session?.user?.email,
            error: error
        });

        // Check whitelist and set localStorage flags
        if (session?.user?.email && ADMIN_EMAILS.includes(session.user.email)) {
            console.log('✅ AUTH GUARD: Admin verified via whitelist - ALLOWING ACCESS');
            console.log('   - Setting localStorage flags for future checks');
            localStorage.setItem('admin_whitelisted', 'true');
            localStorage.setItem('admin_email', session.user.email);
            window.dispatchEvent(new Event('admin-authenticated'));
            return;
        }

        if (error || !session) {
            console.log('❌ AUTH GUARD: No active session, redirecting to login');
            window.location.href = 'rembrandts-donji.html';
            return;
        }

        // Try database check
        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('role_id, user_roles!inner(role_name)')
            .eq('id', session.user.id)
            .single();

        if (profileError) {
            console.error('❌ AUTH GUARD: Profile check error:', profileError);
            // Fallback to metadata check
            const userMetadata = session.user.user_metadata || {};
            const appMetadata = session.user.app_metadata || {};
            
            const isAdminFromMetadata = 
                userMetadata.user_type === 'admin' || 
                userMetadata.role === 'admin' ||
                appMetadata.user_type === 'admin' ||
                appMetadata.role === 'admin';

            if (!isAdminFromMetadata) {
                console.log('❌ AUTH GUARD: Not admin. Metadata:', { userMetadata, appMetadata });
                alert('Access denied. Admin privileges required.');
                await supabaseClient.auth.signOut();
                localStorage.removeItem('admin_whitelisted');
                localStorage.removeItem('admin_email');
                window.location.href = 'rembrandts-donji.html';
                return;
            }
        } else {
            // Check role from database
            const roleName = profile?.user_roles?.role_name;
            console.log('🔵 AUTH GUARD: Profile role:', roleName);
            
            if (roleName !== 'admin' && roleName !== 'super_admin') {
                console.log('❌ AUTH GUARD: Not admin. Role:', roleName);
                alert('Access denied. Admin privileges required.');
                await supabaseClient.auth.signOut();
                localStorage.removeItem('admin_whitelisted');
                localStorage.removeItem('admin_email');
                window.location.href = 'rembrandts-donji.html';
                return;
            }
        }

        // User is authenticated and is admin
        console.log('✅ AUTH GUARD: User is authenticated and is admin');
        window.dispatchEvent(new Event('admin-authenticated'));

    } catch (error) {
        console.error('❌ AUTH GUARD: Authentication check failed:', error);
        window.location.href = 'rembrandts-donji.html';
    }
})();
