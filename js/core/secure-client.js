// Secure Client-Side API Handler
class SecureAPIClient {
    constructor() {
        this.baseURL = window.location.origin;
        this.sessionToken = localStorage.getItem('session_token');
        this.csrfToken = null;
        this.init();
    }

    async init() {
        await this.getCSRFToken();
    }

    async getCSRFToken() {
        try {
            const response = await fetch(`${this.baseURL}/api/csrf-token`);
            const data = await response.json();
            this.csrfToken = data.csrfToken;
        } catch (error) {
            console.error('Failed to get CSRF token:', error);
        }
    }

    generateRequestSignature(timestamp, body) {
        const message = timestamp + JSON.stringify(body);
        // In production, use a proper HMAC implementation
        return btoa(message).substring(0, 32);
    }

    async makeRequest(endpoint, options = {}) {
        const timestamp = Date.now().toString();
        const body = options.body ? JSON.parse(options.body) : {};
        
        const headers = {
            'Content-Type': 'application/json',
            'X-CSRF-Token': this.csrfToken,
            'X-Timestamp': timestamp,
            'X-Signature': this.generateRequestSignature(timestamp, body),
            ...options.headers
        };

        if (this.sessionToken) {
            headers['Authorization'] = `Bearer ${this.sessionToken}`;
        }

        const config = {
            ...options,
            headers,
            credentials: 'include'
        };

        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, config);
            
            if (response.status === 401) {
                this.handleUnauthorized();
                throw new Error('Session expired');
            }

            if (response.status === 429) {
                throw new Error('Too many requests. Please try again later.');
            }

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Request failed');
            }

            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    async login(email, password) {
        const response = await this.makeRequest('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        return response;
    }

    async verifyOTP(email, otp) {
        const response = await this.makeRequest('/api/auth/verify-otp', {
            method: 'POST',
            body: JSON.stringify({ email, otp })
        });
        
        if (response.success) {
            this.sessionToken = response.sessionToken;
            this.csrfToken = response.csrfToken;
            localStorage.setItem('session_token', response.sessionToken);
            localStorage.setItem('user_data', JSON.stringify(response.user));
        }
        
        return response;
    }

    async createUser(userData) {
        return await this.makeRequest('/api/auth/create-user', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    async uploadFiles(files) {
        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
            formData.append('files', files[i]);
        }

        const headers = {
            'Authorization': `Bearer ${this.sessionToken}`,
            'X-CSRF-Token': this.csrfToken
        };

        const response = await fetch(`${this.baseURL}/api/upload`, {
            method: 'POST',
            headers,
            body: formData,
            credentials: 'include'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Upload failed');
        }

        return await response.json();
    }

    async logout() {
        try {
            await this.makeRequest('/api/auth/logout', {
                method: 'POST',
                body: JSON.stringify({})
            });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.sessionToken = null;
            this.csrfToken = null;
            localStorage.removeItem('session_token');
            localStorage.removeItem('user_data');
            window.location.href = '/signin';
        }
    }

    handleUnauthorized() {
        this.sessionToken = null;
        localStorage.removeItem('session_token');
        localStorage.removeItem('user_data');
        window.location.href = '/signin';
    }

    isAuthenticated() {
        return !!this.sessionToken;
    }

    getCurrentUser() {
        const userData = localStorage.getItem('user_data');
        return userData ? JSON.parse(userData) : null;
    }
}

// Enhanced Security Manager (Client-side)
class ClientSecurityManager {
    constructor() {
        this.initSecurity();
    }

    initSecurity() {
        this.setupCSP();
        this.preventXSS();
        this.setupSessionTimeout();
    }

    setupCSP() {
        // CSP is handled by server, but add additional client-side protection
        this.sanitizeAllInputs();
    }

    sanitizeAllInputs() {
        document.addEventListener('input', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                e.target.value = this.sanitizeInput(e.target.value);
            }
        });
    }

    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        return input
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .replace(/[<>'"]/g, (match) => {
                const entities = { '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' };
                return entities[match] || match;
            });
    }

    preventXSS() {
        // Override dangerous functions
        const originalInnerHTML = Element.prototype.innerHTML;
        Element.prototype.innerHTML = XSSProtection.sanitize(function(value) {
            if (typeof value === 'string') {
                value = this.sanitizeInput(value);
            }
            return originalInnerHTML.call(this, value);
        }.bind(this);
    }

    setupSessionTimeout() {
        let lastActivity = Date.now();
        const timeout = 30 * 60 * 1000; // 30 minutes

        const updateActivity = () => {
            lastActivity = Date.now();
        };

        ['click', 'keypress', 'scroll', 'mousemove'].forEach(event => {
            document.addEventListener(event, updateActivity, true);
        });

        setInterval(() => {
            if (Date.now() - lastActivity > timeout) {
                if (window.apiClient && window.apiClient.isAuthenticated()) {
                    alert('Session expired due to inactivity');
                    window.apiClient.logout();
                }
            }
        }, 60000); // Check every minute
    }

    validateInput(input, type, options = {}) {
        const validators = {
            email: (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
            phone: (val) => /^(\+254|0)[17]\d{8}$/.test(val),
            password: (val) => val.length >= 12 && /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/.test(val),
            amount: (val) => !isNaN(val) && val > 0 && val <= (options.max || 1000000),
            text: (val) => val.length >= (options.min || 1) && val.length <= (options.max || 255),
            otp: (val) => /^\d{6}$/.test(val)
        };

        if (!validators[type]) return false;
        
        const sanitized = this.sanitizeInput(input);
        return validators[type](sanitized);
    }

    enforcePasswordPolicy(password) {
        const requirements = [];
        
        if (password.length < 12) {
            requirements.push('At least 12 characters');
        }
        if (!/[A-Z]/.test(password)) {
            requirements.push('One uppercase letter');
        }
        if (!/[a-z]/.test(password)) {
            requirements.push('One lowercase letter');
        }
        if (!/\d/.test(password)) {
            requirements.push('One number');
        }
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            requirements.push('One special character');
        }
        
        return {
            isValid: requirements.length === 0,
            requirements
        };
    }

    checkFileUpload(file) {
        const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'application/msword'];
        const maxSize = 5 * 1024 * 1024; // 5MB
        
        if (!allowedTypes.includes(file.type)) {
            throw new Error('Invalid file type. Only JPG, PNG, PDF, and DOC files are allowed.');
        }
        
        if (file.size > maxSize) {
            throw new Error('File size too large. Maximum size is 5MB.');
        }
        
        return true;
    }
}

// Initialize secure client
window.apiClient = new SecureAPIClient();
window.securityManager = new ClientSecurityManager();

// Enhanced form validation
class SecureFormValidator {
    constructor() {
        this.setupFormValidation();
    }

    setupFormValidation() {
        document.addEventListener('submit', (e) => {
            if (e.target.tagName === 'FORM') {
                this.validateForm(e);
            }
        });
    }

    validateForm(event) {
        const form = event.target;
        const errors = [];

        // Validate all inputs
        const inputs = form.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            const error = this.validateField(input);
            if (error) {
                errors.push(error);
                this.showFieldError(input, error);
            } else {
                this.clearFieldError(input);
            }
        });

        if (errors.length > 0) {
            event.preventDefault();
            this.showFormErrors(errors);
        }
    }

    validateField(field) {
        const value = field.value.trim();
        const type = field.dataset.validate;
        const required = field.hasAttribute('required');

        if (required && !value) {
            return `${field.name || field.id} is required`;
        }

        if (value && type) {
            if (!window.securityManager.validateInput(value, type)) {
                return `Invalid ${type} format`;
            }
        }

        // Check length limits
        const minLength = field.getAttribute('minlength');
        const maxLength = field.getAttribute('maxlength');

        if (minLength && value.length < parseInt(minLength)) {
            return `Minimum ${minLength} characters required`;
        }

        if (maxLength && value.length > parseInt(maxLength)) {
            return `Maximum ${maxLength} characters allowed`;
        }

        return null;
    }

    showFieldError(field, error) {
        field.classList.add('error');
        
        let errorElement = field.parentNode.querySelector('.error-message');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'error-message';
            field.parentNode.appendChild(errorElement);
        }
        
        errorElement.textContent = error;
    }

    clearFieldError(field) {
        field.classList.remove('error');
        const errorElement = field.parentNode.querySelector('.error-message');
        if (errorElement) {
            errorElement.remove();
        }
    }

    showFormErrors(errors) {
        const errorContainer = document.querySelector('.form-errors') || this.createErrorContainer();
        errorContainer.innerHTML =XSSProtection.sanitize( XSSProtection.sanitize(<h4>Please fix the following errors:</h4><ul>' + 
            sanitize(errors.map)(error => `<li>${error}</li>`).join('') + '</ul>';
        errorContainer.scrollIntoView({ behavior: 'smooth' });
    }

    createErrorContainer() {
        const container = document.createElement('div');
        container.className = 'form-errors alert alert-danger';
        document.body.insertBefore(container, document.body.firstChild);
        return container;
    }
}

// Initialize form validator
window.formValidator = new SecureFormValidator();