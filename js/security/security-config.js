// Security configuration for form submissions
const SecurityConfig = {
    // Input sanitization
    sanitizeInput: (input) => {
        if (typeof input !== 'string') return input;
        return input
            .trim()
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .substring(0, 1000); // Limit input length
    },

    // Email validation
    validateEmail: (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email) && email.length <= 254;
    },

    // Phone validation
    validatePhone: (phone) => {
        const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,15}$/;
        return phoneRegex.test(phone);
    },

    // Rate limiting
    rateLimiter: {
        attempts: new Map(),
        
        canAttempt: function(key, maxAttempts = 5, windowMs = 300000) {
            const now = Date.now();
            const userAttempts = this.attempts.get(key) || [];
            
            // Remove old attempts outside the window
            const validAttempts = userAttempts.filter(time => now - time < windowMs);
            
            if (validAttempts.length >= maxAttempts) {
                return false;
            }
            
            validAttempts.push(now);
            this.attempts.set(key, validAttempts);
            return true;
        }
    },

    // Generate unique agent number
    generateAgentNumber: () => {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `STA${timestamp}${random}`.substring(0, 15);
    },

    // Generate unique supervisor number
    generateSupervisorNumber: () => {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `STS${timestamp}${random}`.substring(0, 15);
    },

    // Prepare secure data for submission
    prepareSecureData: (formData, requiredFields = []) => {
        const data = {};
        
        // Sanitize all inputs
        for (const [key, value] of formData.entries()) {
            if (typeof value === 'string') {
                data[key] = SecurityConfig.sanitizeInput(value);
            } else {
                data[key] = value;
            }
        }

        // Validate required fields
        const missingFields = requiredFields.filter(field => !data[field] || data[field].trim() === '');
        if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }

        // Validate email if present
        if (data.email && !SecurityConfig.validateEmail(data.email)) {
            throw new Error('Invalid email format');
        }

        // Validate phone if present
        if (data.phone && !SecurityConfig.validatePhone(data.phone)) {
            throw new Error('Invalid phone format');
        }

        // Add security metadata
        data.created_at = new Date().toISOString();
        data.ip_address = null; // Will be handled server-side
        data.user_agent = navigator.userAgent.substring(0, 200);
        
        // Generate agent number for field agents
        if (!data.agent_number) {
            data.agent_number = SecurityConfig.generateAgentNumber();
        }

        return data;
    },

    // Validate agent number format
    validateAgentNumber: (agentNumber) => {
        return /^STA[A-Z0-9]{8,12}$/.test(agentNumber);
    },

    // Validate supervisor number format
    validateSupervisorNumber: (supervisorNumber) => {
        return /^STS[A-Z0-9]{8,12}$/.test(supervisorNumber);
    }
};

// Make SecurityConfig available globally
window.SecurityConfig = SecurityConfig;