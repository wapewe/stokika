/**
 * Supabase Client Module
 * Provides singleton access to Supabase client with secure initialization
 * ES6 Module - Use with type="module"
 */

let supabaseClient = null;
let initializationPromise = null;

/**
 * Initialize Supabase client
 * Creates a singleton instance of Supabase client
 * @returns {Promise<Object>} Supabase client instance
 */
export async function initSupabase() {
  // Return existing client if already initialized
  if (supabaseClient) {
    return supabaseClient;
  }

  // Return existing initialization promise if in progress
  if (initializationPromise) {
    return initializationPromise;
  }

  // Start new initialization
  initializationPromise = (async () => {
    try {
      // Wait for config to be loaded
      if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
        // Wait for config-loaded event
        await new Promise((resolve, reject) => {
          if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
            resolve();
            return;
          }

          const timeout = setTimeout(() => {
            reject(new Error('Config loading timeout - credentials not available'));
          }, 10000);

          window.addEventListener('supabase-config-loaded', () => {
            clearTimeout(timeout);
            resolve();
          }, { once: true });
        });
      }

      // Check if Supabase library is loaded
      if (typeof window.supabase === 'undefined') {
        throw new Error('Supabase library not loaded. Include Supabase CDN script before this module.');
      }

      // Validate credentials
      if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
        throw new Error('Supabase configuration not loaded properly');
      }

      // Extract project ref from URL for storage key (dynamic, no hardcoding)
      const projectRef = new URL(window.SUPABASE_URL).hostname.split('.')[0];

      // Create Supabase client with secure configuration
      supabaseClient = window.supabase.createClient(
        window.SUPABASE_URL, 
        window.SUPABASE_ANON_KEY,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storageKey: `sb-${projectRef}-auth-token`
          }
        }
      );

      console.log('✅ Supabase client initialized successfully');
      return supabaseClient;

    } catch (error) {
      console.error('❌ Failed to initialize Supabase:', error);
      initializationPromise = null; // Reset to allow retry
      throw error;
    }
  })();

  return initializationPromise;
}

/**
 * Get initialized Supabase client
 * @returns {Object} Supabase client instance
 * @throws {Error} If client not initialized
 */
export function getSupabaseClient() {
  if (!supabaseClient) {
    throw new Error('Supabase not initialized. Call initSupabase() first.');
  }
  return supabaseClient;
}

/**
 * Check if Supabase is initialized
 * @returns {boolean} True if client is initialized
 */
export function isInitialized() {
  return supabaseClient !== null;
}

/**
 * Reset Supabase client (for testing or reinitialization)
 * @private
 */
export function _resetClient() {
  supabaseClient = null;
  initializationPromise = null;
}

// Auto-initialize when config is loaded (backward compatibility)
if (typeof window !== 'undefined') {
  window.addEventListener('supabase-config-loaded', () => {
    if (!supabaseClient) {
      initSupabase().catch(err => {
        console.error('Auto-initialization failed:', err);
      });
    }
  });
}
