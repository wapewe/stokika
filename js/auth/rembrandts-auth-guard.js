// Admin Authentication Guard
// Protects rembrandts.html from unauthorized access

(async function() {
    // Wait for config to load
    if (!window.ConfigLoader) {
        console.error('ConfigLoader not available');
        window.location.href = '/rembrandts-donji';
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

        if (error || !session) {
            console.log('No active session, redirecting to login');
            window.location.href = '/rembrandts-donji.html';
            return;
        }

        // Check admin from session metadata (faster, no DB query needed)
        const userMetadata = session.user.user_metadata || {};
        const appMetadata = session.user.app_metadata || {};
        
        // Check if admin from metadata first
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

        // User is authenticated and is admin
        window.dispatchEvent(new Event('admin-authenticated'));

    } catch (error) {
        console.error('Authentication check failed:', error);
        window.location.href = '/rembrandts-donji.html';
    }
})();
