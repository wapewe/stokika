// Mock Config for Local Development (No Backend)
// This prevents errors when backend isn't set up

// Create a fallback config loader if the real one fails
window.MockConfigLoader = {
    async loadConfig() {
        console.warn('⚠️ Using MOCK configuration - Backend not available');
        console.info('ℹ️ Phone validation and forms will work, but payments require real backend');
        
        return {
            supabaseUrl: 'https://your-project.supabase.co',
            supabaseAnonKey: 'your-anon-key-here',
            environment: 'local-mock'
        };
    }
};

// Initialize Supabase with fallback
async function initSupabaseWithFallback() {
    try {
        // Wait for ConfigLoader to be ready
        if (window.ConfigLoader && typeof window.ConfigLoader.loadConfig === 'function') {
            const config = await window.ConfigLoader.loadConfig();
            window.SUPABASE_URL = config.supabaseUrl;
            window.SUPABASE_ANON_KEY = config.supabaseAnonKey;
            return config;
        }
    } catch (error) {
        console.warn('ConfigLoader failed, using mock config:', error.message);
    }
    
    // Fallback to mock
    const mockConfig = await window.MockConfigLoader.loadConfig();
    window.SUPABASE_URL = mockConfig.supabaseUrl;
    window.SUPABASE_ANON_KEY = mockConfig.supabaseAnonKey;
    return mockConfig;
}

// Export for other scripts
window.initSupabaseWithFallback = initSupabaseWithFallback;
