// Secure Configuration Loader - Production Ready
// This file loads configuration from a secure PHP endpoint
// NEVER expose credentials in client-side code

class ConfigLoader {
    constructor() {
        this.config = null;
        this.isLoaded = false;
        this.loadPromise = null;
    }

    async loadConfig() {
        if (this.isLoaded) return this.config;
        if (this.loadPromise) return this.loadPromise;

        this.loadPromise = (async () => {
            try {
                const data = await this.fetchFromBackend();
                this.config = {
                    supabaseUrl: data.supabaseUrl,
                    supabaseAnonKey: data.supabaseAnonKey
                };
                
                // Set global variables for other scripts
                window.SUPABASE_URL = this.config.supabaseUrl;
                window.SUPABASE_ANON_KEY = this.config.supabaseAnonKey;
                
                this.isLoaded = true;
                
                // Dispatch event to notify config is loaded
                window.dispatchEvent(new Event('supabase-config-loaded'));
                
                return this.config;
            } catch (error) {
                console.error('Failed to load configuration:', error);
                throw new Error('Configuration error');
            }
        })();

        return this.loadPromise;
    }

    async fetchFromBackend() {
        // Bootstrap: Get the Supabase project URL from a minimal bootstrap config
        // This file ONLY contains the Supabase project URL (public, not sensitive)
        let supabaseProjectUrl;
        
        try {
            const bootstrapResponse = await fetch('/config.json', {
                method: 'GET',
                cache: 'no-cache'
            });
            
            if (bootstrapResponse.ok) {
                const bootstrap = await bootstrapResponse.json();
                supabaseProjectUrl = bootstrap.supabaseUrl;
            }
        } catch (error) {
            console.error('Failed to load bootstrap config:', error);
        }
        
        if (!supabaseProjectUrl) {
            throw new Error('Bootstrap configuration not found. Please create /config.json with {"supabaseUrl": "https://your-project.supabase.co"}');
        }
        
        // Fetch actual credentials from Supabase Edge Function
        console.log('Loading config from Supabase Edge Function...');
        const apiUrl = `${supabaseProjectUrl}/functions/v1/get-config`;
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            cache: 'no-cache'
        });
        
        if (!response.ok) {
            throw new Error('Failed to load config from Supabase Edge Function (Status: ' + response.status + ')');
        }
        
        const data = await response.json();
        
        if (!data.supabaseUrl || !data.supabaseAnonKey) {
            throw new Error('Invalid config data received from Supabase Edge Function');
        }
        
        return data;
    }

    getConfig() {
        if (!this.isLoaded) {
            throw new Error('Configuration not loaded. Call loadConfig() first.');
        }
        return this.config;
    }
}

// Export singleton instance
window.ConfigLoader = new ConfigLoader();

// Auto-load config when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.ConfigLoader.loadConfig().catch(err => {
            console.error('Failed to auto-load config:', err);
        });
    });
} else {
    // DOM already loaded
    window.ConfigLoader.loadConfig().catch(err => {
        console.error('Failed to auto-load config:', err);
    });
}
