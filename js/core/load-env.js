// ⚠️ DEPRECATED - DO NOT USE THIS FILE IN PRODUCTION
// Use config-loader.js instead for secure configuration loading
// This file is kept only for legacy compatibility - it will be removed

console.warn('⚠️ WARNING: load-env.js is deprecated. Please migrate to config-loader.js');

// Redirect to secure config loader
if (typeof window.ConfigLoader !== 'undefined') {
    // ConfigLoader is already loaded
    window.ConfigLoader.loadConfig().then(config => {
        window.SUPABASE_URL = config.supabaseUrl;
        window.SUPABASE_ANON_KEY = config.supabaseAnonKey;
    }).catch(err => {
        console.error('Failed to load secure configuration:', err);
        throw new Error('Configuration loading failed. Please ensure config.php is accessible.');
    });
} else {
    // Load config-loader.js dynamically if not loaded
    const script = document.createElement('script');
    script.src = 'js/config-loader.js';
    script.onload = () => {
        window.ConfigLoader.loadConfig().then(config => {
            window.SUPABASE_URL = config.supabaseUrl;
            window.SUPABASE_ANON_KEY = config.supabaseAnonKey;
        }).catch(err => {
            console.error('Failed to load secure configuration:', err);
            throw new Error('Configuration loading failed. Please ensure config.php is accessible.');
        });
    };
    document.head.appendChild(script);
}
