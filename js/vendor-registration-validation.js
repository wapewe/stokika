/**
 * Input Sanitizer - XSS Prevention
 * Sanitizes user input to prevent XSS attacks
 */
class InputSanitizer {
    /**
     * Sanitize a single string value
     * @param {string} value - Input to sanitize
     * @returns {string} Sanitized value
     */
    sanitize(value) {
        if (typeof value !== 'string') return value;
        
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }
    
    /**
     * Sanitize all fields in form data
     * @param {Object} formData - Form data object
     * @returns {Object} Sanitized form data
     */
    sanitizeFormData(formData) {
        const sanitized = {};
        
        for (const [key, value] of Object.entries(formData)) {
            if (typeof value === 'string') {
                sanitized[key] = this.sanitize(value);
            } else if (typeof value === 'object' && value !== null) {
                sanitized[key] = this.sanitizeFormData(value);
            } else {
                sanitized[key] = value;
            }
        }
        
        return sanitized;
    }
}

/**
 * Registration Validator - Client-Side Validation
 * Validates vendor registration form fields
 */
class RegistrationValidator {
    constructor() {
        this.errors = {};
    }
    
    /**
     * Validate business name
     * @param {string} businessName
     * @returns {boolean}
     */
    validateBusinessName(businessName) {
        if (!businessName || businessName.trim().length < 2 || businessName.length > 100) {
            this.errors.businessName = 'Business name must be between 2 and 100 characters';
            return false;
        }
        delete this.errors.businessName;
        return true;
    }
    
    /**
     * Validate phone number (Kenyan format)
     * @param {string} phone
     * @returns {boolean}
     */
    validatePhone(phone) {
        const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
        const phoneRegex = /^(\+254[017]\d{8,9}|254[017]\d{8,9}|0\d{9})$/;
        
        if (!cleanPhone || !phoneRegex.test(cleanPhone)) {
            this.errors.phone = 'Please enter a valid Kenyan phone number (e.g., 254712345678, 0712345678, or 0123456789)';
            return false;
        }
        delete this.errors.phone;
        return true;
    }
    
    /**
     * Validate email address
     * @param {string} email
     * @returns {boolean}
     */
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!email || !emailRegex.test(email)) {
            this.errors.email = 'Please enter a valid email address';
            return false;
        }
        delete this.errors.email;
        return true;
    }
    
    /**
     * Validate required field
     * @param {string} fieldName
     * @param {any} value
     * @param {string} label
     * @returns {boolean}
     */
    validateRequired(fieldName, value, label) {
        if (!value || (typeof value === 'string' && value.trim() === '')) {
            this.errors[fieldName] = `${label} is required`;
            return false;
        }
        delete this.errors[fieldName];
        return true;
    }
    
    /**
     * Validate full name
     * @param {string} fullName
     * @returns {boolean}
     */
    validateFullName(fullName) {
        if (!fullName || fullName.trim().length < 2 || fullName.length > 100) {
            this.errors.fullName = 'Full name must be between 2 and 100 characters';
            return false;
        }
        delete this.errors.fullName;
        return true;
    }
    
    /**
     * Validate ID Number (8 digits only)
     * @param {string} idNumber
     * @returns {{valid: boolean, error?: string}}
     */
    validateIdNumber(idNumber) {
        // Remove any whitespace
        const cleaned = idNumber ? idNumber.trim() : '';
        
        // Check if empty
        if (!cleaned) {
            this.errors.idNumber = 'ID Number is required';
            return {
                valid: false,
                error: 'ID Number is required'
            };
        }
        
        // Check length
        if (cleaned.length !== 8) {
            this.errors.idNumber = 'ID Number must be exactly 8 digits';
            return {
                valid: false,
                error: 'ID Number must be exactly 8 digits'
            };
        }
        
        // Check numeric only
        if (!/^[0-9]{8}$/.test(cleaned)) {
            this.errors.idNumber = 'ID Number must contain only numbers';
            return {
                valid: false,
                error: 'ID Number must contain only numbers'
            };
        }
        
        delete this.errors.idNumber;
        return { valid: true };
    }
    
    /**
     * Validate all form fields
     * @param {Object} formData
     * @returns {{valid: boolean, errors: Object}}
     */
    validateAll(formData) {
        this.errors = {};
        
        // Step 1 validations
        this.validateFullName(formData.fullName);
        this.validateBusinessName(formData.businessName);
        this.validateEmail(formData.email);
        this.validatePhone(formData.phone);
        this.validateIdNumber(formData.idNumber); // NEW: ID Number validation
        this.validateRequired('county', formData.county, 'County');
        this.validateRequired('businessCategory', formData.businessCategory, 'Business Category');
        
        // Step 2 validations
        this.validateRequired('businessStatus', formData.businessStatus, 'Business Status');
        this.validateRequired('businessSize', formData.businessSize, 'Business Size');
        this.validateRequired('businessModel', formData.businessModel, 'Business Model');
        
        // Step 4 validations
        this.validateRequired('stockCategories', formData.stockCategories, 'Stock Categories');
        this.validateRequired('stockValue', formData.stockValue, 'Stock Value');
        this.validateRequired('repaymentPeriod', formData.repaymentPeriod, 'Repayment Period');
        
        return {
            valid: Object.keys(this.errors).length === 0,
            errors: this.errors
        };
    }
    
    /**
     * Display inline error message
     * @param {string} fieldId
     * @param {string} message
     */
    showError(fieldId, message) {
        const field = document.getElementById(fieldId);
        if (!field) return;
        
        // Remove existing error
        const existingError = field.parentElement.querySelector('.field-error');
        if (existingError) existingError.remove();
        
        // Add error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.style.cssText = 'color: #dc2626; font-size: 0.875rem; margin-top: 0.25rem;';
        errorDiv.textContent = message;
        field.parentElement.appendChild(errorDiv);
        
        // Highlight field
        field.style.borderColor = '#dc2626';
    }
    
    /**
     * Clear error for a field
     * @param {string} fieldId
     */
    clearError(fieldId) {
        const field = document.getElementById(fieldId);
        if (!field) return;
        
        const errorDiv = field.parentElement.querySelector('.field-error');
        if (errorDiv) errorDiv.remove();
        
        field.style.borderColor = '';
    }
}

/**
 * Standalone ID Number Validation Function
 * Can be used independently without instantiating RegistrationValidator
 * @param {string} idNumber - The ID number to validate
 * @returns {{valid: boolean, error?: string}} Validation result
 */
function validateIdNumber(idNumber) {
    // Remove any whitespace
    const cleaned = idNumber ? idNumber.trim() : '';
    
    // Check if empty
    if (!cleaned) {
        return {
            valid: false,
            error: 'ID Number is required'
        };
    }
    
    // Check length
    if (cleaned.length !== 8) {
        return {
            valid: false,
            error: 'ID Number must be exactly 8 digits'
        };
    }
    
    // Check numeric only
    if (!/^[0-9]{8}$/.test(cleaned)) {
        return {
            valid: false,
            error: 'ID Number must contain only numbers'
        };
    }
    
    return { valid: true };
}

// Export for use in other files
window.InputSanitizer = InputSanitizer;
window.RegistrationValidator = RegistrationValidator;
window.validateIdNumber = validateIdNumber;

console.log('✅ Validation & Sanitization classes loaded');

/**
 * Initialize real-time ID Number validation
 * This runs when the DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
    const idNumberInput = document.getElementById('idNumber');
    const idNumberError = document.getElementById('idNumberError');
    
    if (idNumberInput && idNumberError) {
        // Add input event listener for real-time validation
        idNumberInput.addEventListener('input', (e) => {
            const result = validateIdNumber(e.target.value);
            
            if (!result.valid) {
                // Display error message
                idNumberError.textContent = result.error;
                idNumberError.style.display = 'block';
                
                // Add invalid class to input field
                idNumberInput.classList.add('invalid');
                
                // Update aria-invalid attribute for accessibility
                idNumberInput.setAttribute('aria-invalid', 'true');
            } else {
                // Clear error message
                idNumberError.textContent = '';
                idNumberError.style.display = 'none';
                
                // Remove invalid class
                idNumberInput.classList.remove('invalid');
                
                // Update aria-invalid attribute
                idNumberInput.setAttribute('aria-invalid', 'false');
            }
        });
        
        console.log('✅ Real-time ID Number validation initialized');
    }
});
