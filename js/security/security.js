// Security Utilities
const Security = {
    // Sanitize HTML to prevent XSS attacks
    sanitizeHTML(str) {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    },

    // Escape special characters
    escapeHTML(str) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '/': '&#x2F;'
        };
        return String(str).replace(/[&<>"'/]/g, (char) => map[char]);
    },

    // Validate email format
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(String(email).toLowerCase());
    },

    // Validate phone number (Kenyan format)
    validatePhone(phone) {
        const re = /^(\+254|0)[17]\d{8}$/;
        return re.test(String(phone).replace(/\s/g, ''));
    },

    // Sanitize input to prevent SQL injection
    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        // Remove dangerous characters
        return input
            .replace(/[<>]/g, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+=/gi, '')
            .trim()
            .slice(0, 500); // Limit length
    },

    // Validate form data
    validateFormData(data) {
        const errors = {};

        if (!data.name || data.name.length < 2) {
            errors.name = 'Name must be at least 2 characters';
        }

        if (!this.validateEmail(data.email)) {
            errors.email = 'Invalid email format';
        }

        if (!this.validatePhone(data.phone)) {
            errors.phone = 'Invalid phone number format';
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    },

    // Rate limiting (client-side)
    rateLimiter: {
        attempts: {},
        
        canAttempt(key, maxAttempts = 5, timeWindow = 60000) {
            const now = Date.now();
            
            if (!this.attempts[key]) {
                this.attempts[key] = [];
            }

            // Remove old attempts
            this.attempts[key] = this.attempts[key].filter(
                time => now - time < timeWindow
            );

            if (this.attempts[key].length >= maxAttempts) {
                return false;
            }

            this.attempts[key].push(now);
            return true;
        }
    },

    // Generate CSRF token
    generateCSRFToken() {
        return Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    },

    // Store CSRF token
    setCSRFToken() {
        const token = this.generateCSRFToken();
        sessionStorage.setItem('csrf_token', token);
        return token;
    },

    // Get CSRF token
    getCSRFToken() {
        let token = sessionStorage.getItem('csrf_token');
        if (!token) {
            token = this.setCSRFToken();
        }
        return token;
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Security;
}
