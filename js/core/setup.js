// Supabase Setup - Edge Function only
(async function() {
    try {
        if (!window.ConfigLoader) {
            console.error('ConfigLoader not initialized');
            return;
        }
        const config = await window.ConfigLoader.loadConfig();
        window.SUPABASE_URL = config.supabaseUrl;
        window.SUPABASE_ANON_KEY = config.supabaseAnonKey;
        
        // Initialize global client immediately
        if (typeof window.supabase !== 'undefined' && !window._supabaseClient) {
            window._supabaseClient = window.supabase.createClient(
                config.supabaseUrl,
                config.supabaseAnonKey,
                {
                    auth: {
                        persistSession: true,
                        autoRefreshToken: true,
                        detectSessionInUrl: true,
                        storageKey: 'sb-eidsqrnwfndruuufyacc-auth-token'
                    }
                }
            );
        }
        
        window.dispatchEvent(new Event('supabase-config-loaded'));
    } catch (error) {
        console.error('Failed to load Supabase config:', error);
    }
})();
