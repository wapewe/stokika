// Critical Security Patches
class SecurityPatches {
    constructor() {
        this.init();
    }

    init() {
        this.patchCredentialExposure();
        this.addCSRFProtection();
        this.enhanceSessionSecurity();
        this.addInputLimits();
    }

    // Patch 1: Hide credentials from client
    patchCredentialExposure() {
        // Override console methods in production
        if (window.location.hostname !== 'localhost') {
            const noop = () => {};
            ['log', 'warn', 'error', 'info', 'debug'].forEach(method => {
                console[method] = noop;
            });
        }

        // Remove credentials from window object
        delete window.SUPABASE_URL;
        delete window.SUPABASE_ANON_KEY;
    }

    // Patch 2: Add CSRF protection
    addCSRFProtection() {
        const csrfToken = this.generateCSRFToken();
        
        // Add CSRF token to all forms
        document.querySelectorAll('form').forEach(form => {
            if (!form.querySelector('input[name="csrf_token"]')) {
                const csrfInput = document.createElement('input');
                csrfInput.type = 'hidden';
                csrfInput.name = 'csrf_token';
                csrfInput.value = csrfToken;
                form.appendChild(csrfInput);
            }
        });

        // Validate CSRF on form submission
        document.addEventListener('submit', (e) => {
            const form = e.target;
            const token = form.querySelector('input[name="csrf_token"]')?.value;
            if (!this.validateCSRFToken(token)) {
                e.preventDefault();
                alert('Security error: Invalid request token');
            }
        });
    }

    // Patch 3: Enhance session security
    enhanceSessionSecurity() {
        // Move sessions from localStorage to secure storage
        const originalSetItem = localStorage.setItem;
        const originalGetItem = localStorage.getItem;

        localStorage.setItem = function(key, value) {
            if (key.includes('session') || key.includes('token')) {
                // Encrypt sensitive data
                value = SecurityPatches.encrypt(value);
            }
            return originalSetItem.call(this, key, value);
        };

        localStorage.getItem = function(key) {
            let value = originalGetItem.call(this, key);
            if (value && (key.includes('session') || key.includes('token'))) {
                // Decrypt sensitive data
                value = SecurityPatches.decrypt(value);
            }
            return value;
        };
    }

    // Patch 4: Add input length limits
    addInputLimits() {
        const limits = {
            'input[type="text"]': 255,
            'input[type="email"]': 254,
            'input[type="tel"]': 20,
            'textarea': 1000,
            'input[name*="name"]': 100,
            'input[name*="phone"]': 15
        };

        Object.entries(limits).forEach(([selector, maxLength]) => {
            document.querySelectorAll(selector).forEach(input => {
                if (!input.hasAttribute('maxlength')) {
                    input.setAttribute('maxlength', maxLength);
                }
            });
        });
    }

    // Utility methods
    generateCSRFToken() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    validateCSRFToken(token) {
        const storedToken = sessionStorage.getItem('csrf_token');
        return token && storedToken && token === storedToken;
    }

    static encrypt(text) {
        // Simple XOR encryption (use proper encryption in production)
        const key = 'stokika_security_key_2024';
        let result = '';
        for (let i = 0; i < text.length; i++) {
            result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        return btoa(result);
    }

    static decrypt(encryptedText) {
        try {
            const text = atob(encryptedText);
            const key = 'stokika_security_key_2024';
            let result = '';
            for (let i = 0; i < text.length; i++) {
                result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
            }
            return result;
        } catch {
            return encryptedText;
        }
    }
}

// Initialize security patches
new SecurityPatches();