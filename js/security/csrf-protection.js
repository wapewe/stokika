/**
 * CSRF Protection Module - Supabase/JWT Version
 * 
 * NOTE: With Supabase Auth using JWT tokens in Authorization headers,
 * traditional CSRF protection is not needed. This module is maintained
 * for backward compatibility but does minimal work.
 * 
 * JWT tokens provide inherent CSRF protection because:
 * 1. Tokens are explicitly sent in headers (not auto-included like cookies)
 * 2. Attackers cannot read or send Authorization headers cross-origin
 * 3. Supabase validates JWT signatures server-side
 */

class CSRFProtection {
    constructor() {
        this.tokenKey = 'csrf_token';
        this.headerName = 'X-CSRF-Token';
        this.token = null;
        this.isInitialized = false;
    }

    /**
     * Initialize CSRF protection
     * With Supabase JWT auth, this is a no-op
     */
    async init() {
        if (this.isInitialized) {
            return this.token;
        }

        // For JWT-based auth, CSRF tokens are not needed
        // Generate a client-side token for legacy compatibility
        this.token = this.generateClientToken();
        this.isInitialized = true;
        
        console.log('✅ CSRF Protection initialized (JWT mode - minimal protection needed)');
        return this.token;
    }

    /**
     * Generate a client-side token for form compatibility
     */
    generateClientToken() {
        const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        return token;
    }

    /**
     * Get current CSRF token
     */
    async getToken() {
        if (!this.isInitialized) {
            await this.init();
        }
        return this.token;
    }

    /**
     * Add CSRF token to request headers
     * For Supabase, JWT token in Authorization header is primary protection
     */
    async getHeaders() {
        const token = await this.getToken();
        return {
            [this.headerName]: token || ''
        };
    }

    /**
     * Add CSRF token to form as hidden input
     * This is for legacy compatibility only
     */
    async addToForm(form) {
        if (!form) return;

        const token = await this.getToken();
        if (!token) return;

        // Remove existing CSRF input
        const existingInput = form.querySelector(`input[name="${this.tokenKey}"]`);
        if (existingInput) {
            existingInput.remove();
        }

        // Add new hidden input
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = this.tokenKey;
        input.value = token;
        form.appendChild(input);
    }

    /**
     * Protect a fetch request
     * With Supabase: JWT token in Authorization header is the primary protection
     */
    async protectFetch(url, options = {}) {
        const headers = await this.getHeaders();
        
        return {
            ...options,
            headers: {
                ...options.headers,
                ...headers
            },
            credentials: options.credentials || 'include'
        };
    }

    /**
     * Protect a form submission
     * Legacy compatibility - adds hidden CSRF field
     */
    async protectForm(form) {
        if (!form) return;
        
        await this.addToForm(form);
        
        // Add submit handler to ensure token is fresh
        form.addEventListener('submit', async (e) => {
            // Token refresh is handled by Supabase Auth
            // No additional CSRF validation needed
        }, { once: false });
    }

    /**
     * Protect all forms on the page
     * Auto-discovers and protects forms
     */
    async protectAllForms() {
        const forms = document.querySelectorAll('form');
        
        for (const form of forms) {
            // Skip forms that explicitly opt-out
            if (form.dataset.csrfProtect === 'false') {
                continue;
            }
            
            await this.protectForm(form);
        }
        
        console.log(`✅ Protected ${forms.length} forms with CSRF (legacy compatibility mode)`);
    }

    /**
     * Rotate token (refresh)
     * For JWT auth, tokens are rotated by Supabase Auth
     */
    async rotateToken() {
        this.token = this.generateClientToken();
        this.isInitialized = true;
        return this.token;
    }

    /**
     * Clear token
     */
    clear() {
        this.token = null;
        this.isInitialized = false;
    }
}

// Create global instance
window.CSRFProtection = new CSRFProtection();

// Auto-initialize on DOM load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await window.CSRFProtection.init();
        await window.CSRFProtection.protectAllForms();
    } catch (error) {
        console.error('CSRF Protection initialization error:', error);
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CSRFProtection;
}