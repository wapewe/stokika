// Admin Authentication Guard
// Protects rembrandts.html from unauthorized access

(async function() {
    // Wait for config to load
    if (!window.ConfigLoader) {
        console.error('ConfigLoader not available');
        window.location.href = '/rembrandts-donji.html';
        return;
    }

    try {
        const config = await window.ConfigLoader.loadConfig();
        window.SUPABASE_URL = config.supabaseUrl;
        window.SUPABASE_ANON_KEY = config.supabaseAnonKey;

        // Initialize Supabase
        if (!window.supabase) {
            console.error('Supabase library not loaded');
            window.location.href = '/rembrandts-donji.html';
            return;
        }

        const supabaseClient = window.supabase.createClient(
            config.supabaseUrl,
            config.supabaseAnonKey
        );

        // Check authentication
        const { data: { session }, error } = await supabaseClient.auth.getSession();

        // TEMPORARY: Check whitelist first - before any other validation
        const ADMIN_EMAILS = ['krieta8@gmail.com'];
        if (session?.user?.email && ADMIN_EMAILS.includes(session.user.email)) {
            console.log('✅ Admin verified via whitelist');
            window.dispatchEvent(new Event('admin-authenticated'));
            return;
        }

        if (error || !session) {
            console.log('No active session, redirecting to login');
            window.location.href = '/rembrandts-donji.html';
            return;
        }

        // Try database check
        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('role_id, user_roles!inner(role_name)')
            .eq('id', session.user.id)
            .single();

        if (profileError) {
            console.error('Profile check error:', profileError);
            // Fallback to metadata check
            const userMetadata = session.user.user_metadata || {};
            const appMetadata = session.user.app_metadata || {};
            
            const isAdminFromMetadata = 
                userMetadata.user_type === 'admin' || 
                userMetadata.role === 'admin' ||
                appMetadata.user_type === 'admin' ||
                appMetadata.role === 'admin';

            if (!isAdminFromMetadata) {
                console.log('Not admin. Metadata:', { userMetadata, appMetadata });
                alert('Access denied. Admin privileges required.');
                await supabaseClient.auth.signOut();
                window.location.href = '/rembrandts-donji.html';
                return;
            }
        } else {
            // Check role from database
            const roleName = profile?.user_roles?.role_name;
            console.log('Profile role:', roleName);
            
            if (roleName !== 'admin' && roleName !== 'super_admin') {
                console.log('Not admin. Role:', roleName);
                alert('Access denied. Admin privileges required.');
                await supabaseClient.auth.signOut();
                window.location.href = '/rembrandts-donji.html';
                return;
            }
        }

        // User is authenticated and is admin
        window.dispatchEvent(new Event('admin-authenticated'));

    } catch (error) {
        console.error('Authentication check failed:', error);
        window.location.href = '/rembrandts-donji.html';
    }
})();
