// Offline Data Validator
class OfflineValidator {
    validateVendorData(data) {
        const errors = [];
        
        // Business name
        if (!data.business_name || data.business_name.trim().length < 2) {
            errors.push('Business name required (min 2 characters)');
        }
        
        // Phone
        if (!this.validatePhone(data.phone)) {
            errors.push('Invalid phone number (use +254... or 07...)');
        }
        
        // Email
        if (data.email && !this.validateEmail(data.email)) {
            errors.push('Invalid email address');
        }
        
        // County
        if (!data.county || data.county.trim().length < 2) {
            errors.push('County required');
        }
        
        if (errors.length > 0) {
            throw new Error(errors.join('\n'));
        }
        
        return this.sanitizeData(data);
    }
    
    validateSupplierData(data) {
        const errors = [];
        
        // Business name
        if (!data.business_name || data.business_name.trim().length < 2) {
            errors.push('Business name required (min 2 characters)');
        }
        
        // Phone
        if (!this.validatePhone(data.phone)) {
            errors.push('Invalid phone number');
        }
        
        // Email
        if (data.email && !this.validateEmail(data.email)) {
            errors.push('Invalid email address');
        }
        
        if (errors.length > 0) {
            throw new Error(errors.join('\n'));
        }
        
        return this.sanitizeData(data);
    }
    
    validatePhone(phone) {
        if (!phone) return false;
        // Kenyan phone format: +254... or 07... or 01...
        return /^(\+254|0)[17]\d{8}$/.test(phone.replace(/\s/g, ''));
    }
    
    validateEmail(email) {
        if (!email) return false;
        return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email) && email.length <= 254;
    }
    
    sanitizeData(data) {
        const sanitized = {};
        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'string') {
                sanitized[key] = this.sanitizeString(value);
            } else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }
    
    sanitizeString(input) {
        return input
            .trim()
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .substring(0, 1000); // Max 1000 chars
    }
}

window.OfflineValidator = new OfflineValidator();
