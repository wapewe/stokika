/**
 * Client-Side Input Sanitization Library
 * 
 * Provides comprehensive input validation and sanitization for all forms.
 * This is the FIRST line of defense - server-side validation is still required.
 * 
 * Features:
 * - XSS prevention
 * - Input validation
 * - Real-time feedback
 * - Auto-sanitization on form submit
 * 
 * Usage:
 * InputSanitizer.initForm('#myForm');
 */

class InputSanitizer {
    /**
     * XSS dangerous patterns
     */
    static xssPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /<iframe/gi,
        /<object/gi,
        /<embed/gi,
        /vbscript:/gi,
        /<img[^>]+src[^>]*>/gi
    ];

    /**
     * SQL injection patterns
     */
    static sqlPatterns = [
        /(\bUNION\b.*\bSELECT\b)/i,
        /(\bSELECT\b.*\bFROM\b)/i,
        /(\bINSERT\b.*\bINTO\b)/i,
        /(\bDELETE\b.*\bFROM\b)/i,
        /(\bDROP\b.*\bTABLE\b)/i,
        /(--|\/\*|;\s*(?:DROP|SELECT|INSERT|DELETE|UPDATE|ALTER|CREATE|EXEC|UNION)\b)/i,
        /('|")\s*(?:OR|AND)\s+.*=/i
    ];

    /**
     * Sanitize string input (escape HTML)
     */
    static sanitizeString(input) {
        if (typeof input !== 'string') {
            return '';
        }

        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    }

    /**
     * Sanitize email
     */
    static sanitizeEmail(input) {
        if (typeof input !== 'string') {
            return '';
        }
        
        // Remove everything except valid email characters
        return input.toLowerCase()
            .replace(/[^a-z0-9@._+-]/g, '')
            .trim();
    }

    /**
     * Sanitize phone number (Kenyan format)
     * Accepts:
     *   - 07XXXXXXXX (10 digits starting with 07)
     *   - 01XXXXXXXX (10 digits starting with 01)
     *   - 254XXXXXXXXX (12 digits starting with 254)
     *   - +254XXXXXXXXX (with + prefix)
     * Converts all to: 254XXXXXXXXX (stored format)
     * Display format: +254XXXXXXXXX
     */
    static sanitizePhone(input) {
        if (typeof input !== 'string') {
            return '';
        }
        
        // Remove all non-numeric characters
        let clean = input.trim().replace(/\D/g, '');
        
        // Validate and convert to 254 format
        if (clean.startsWith('0') && clean.length === 10) {
            // Format: 0712345678 or 0112345678 (Kenyan mobile numbers)
            const secondDigit = clean.charAt(1);
            if (secondDigit === '7' || secondDigit === '1') {
                // Convert to 254 format: remove leading 0, prepend 254
                clean = '254' + clean.substring(1);
            } else {
                return ''; // Invalid: not a Kenyan mobile number (must be 07XX or 01XX)
            }
        } else if (clean.startsWith('254') && clean.length === 12) {
            // Format: 254712345678 (already correct)
            const fourthDigit = clean.charAt(3);
            if (fourthDigit !== '7' && fourthDigit !== '1') {
                return ''; // Invalid: not a Kenyan mobile number (must be 2547XX or 2541XX)
            }
            // Already in correct format
        } else {
            return ''; // Invalid format (wrong length or prefix)
        }
        
        return clean;
    }

    /**
     * Format phone number for display with +254 prefix
     */
    static formatPhoneDisplay(phone) {
        if (typeof phone !== 'string' || !phone.startsWith('254')) {
            return phone;
        }
        return '+' + phone;
    }

    /**
     * Sanitize integer
     */
    static sanitizeInt(input) {
        const num = parseInt(input, 10);
        return isNaN(num) ? 0 : num;
    }

    /**
     * Sanitize float
     */
    static sanitizeFloat(input) {
        const num = parseFloat(input);
        return isNaN(num) ? 0 : num;
    }

    /**
     * Sanitize alphanumeric
     */
    static sanitizeAlphanumeric(input) {
        if (typeof input !== 'string') {
            return '';
        }
        
        return input.replace(/[^a-zA-Z0-9]/g, '');
    }

    /**
     * Sanitize filename
     */
    static sanitizeFilename(input) {
        if (typeof input !== 'string') {
            return '';
        }
        
        // Remove path traversal and dangerous characters
        return input
            .replace(/\.\./g, '')
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .replace(/\.{2,}/g, '.')
            .substring(0, 255);
    }

    /**
     * Check for XSS attempts
     */
    static hasXSS(input) {
        if (typeof input !== 'string') {
            return false;
        }

        return this.xssPatterns.some(pattern => pattern.test(input));
    }

    /**
     * Check for SQL injection attempts
     */
    static hasSQLInjection(input) {
        if (typeof input !== 'string') {
            return false;
        }

        return this.sqlPatterns.some(pattern => pattern.test(input));
    }

    /**
     * Validate input based on type
     */
    static validate(input, type, constraints = {}) {
        const errors = [];
        let sanitized = input;

        // Type-specific sanitization
        switch (type) {
            case 'email':
                sanitized = this.sanitizeEmail(input);
                if (sanitized && !this.isValidEmail(sanitized)) {
                    errors.push('Invalid email format');
                }
                break;

            case 'phone':
                sanitized = this.sanitizePhone(input);
                if (input && !sanitized) {
                    errors.push('Invalid phone. Use 07XX/01XX (10 digits) or 254X (12 digits)');
                } else if (sanitized && !this.isValidPhone(sanitized)) {
                    errors.push('Invalid phone. Use 07XX/01XX (10 digits) or 254X (12 digits)');
                }
                break;

            case 'int':
            case 'integer':
                sanitized = this.sanitizeInt(input);
                break;

            case 'float':
            case 'decimal':
                sanitized = this.sanitizeFloat(input);
                break;

            case 'alphanumeric':
                sanitized = this.sanitizeAlphanumeric(input);
                break;

            case 'filename':
                sanitized = this.sanitizeFilename(input);
                break;

            case 'string':
            default:
                sanitized = this.sanitizeString(input);
                break;
        }

        // Security checks
        if (this.hasXSS(input)) {
            errors.push('Input contains potentially dangerous content');
            console.warn('XSS attempt detected:', input);
        }

        if (this.hasSQLInjection(input)) {
            errors.push('Input contains invalid patterns');
            console.warn('SQL injection attempt detected:', input);
        }

        // Constraint validation
        if (constraints.required && !sanitized) {
            errors.push('This field is required');
        }

        if (constraints.minLength && sanitized.length < constraints.minLength) {
            errors.push(`Minimum length is ${constraints.minLength} characters`);
        }

        if (constraints.maxLength && sanitized.length > constraints.maxLength) {
            errors.push(`Maximum length is ${constraints.maxLength} characters`);
        }

        if (constraints.min !== undefined && sanitized < constraints.min) {
            errors.push(`Minimum value is ${constraints.min}`);
        }

        if (constraints.max !== undefined && sanitized > constraints.max) {
            errors.push(`Maximum value is ${constraints.max}`);
        }

        if (constraints.pattern && !constraints.pattern.test(sanitized)) {
            errors.push(constraints.patternError || 'Invalid format');
        }

        return {
            valid: errors.length === 0,
            value: sanitized,
            errors: errors
        };
    }

    /**
     * Validate email format
     */
    static isValidEmail(email) {
        const pattern = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
        return pattern.test(email);
    }

    /**
     * Validate Kenyan phone number
     * Must be exactly 12 digits starting with 254, then 7 or 1 (Kenyan mobile), followed by 8 more digits
     */
    static isValidPhone(phone) {
        return /^254[17]\d{8}$/.test(phone);
    }

    /**
     * Sanitize all inputs in a form
     */
    static sanitizeForm(formElement) {
        const inputs = formElement.querySelectorAll('input, textarea, select');
        const sanitized = {};

        inputs.forEach(input => {
            const name = input.name;
            if (!name) return;

            // Skip file, submit, button, and reset inputs
            if (['file', 'submit', 'button', 'reset', 'image'].includes(input.type)) {
                return;
            }

            // For radio and checkbox, do not overwrite input.value; store value if checked
            if (input.type === 'radio' || input.type === 'checkbox') {
                if (input.checked) {
                    sanitized[name] = input.value;
                }
                return;
            }

            const type = input.dataset.sanitizeType || 'string';
            const value = input.value;

            const result = this.validate(value, type, this.getConstraints(input));

            if (result.valid) {
                sanitized[name] = result.value;
                input.value = result.value; // Update with sanitized value (safe for text-like inputs)
                this.clearError(input);
            } else {
                this.showError(input, result.errors[0]);
            }
        });

        return sanitized;
    }

    /**
     * Get constraints from input element
     */
    static getConstraints(input) {
        const constraints = {};

        if (input.required) {
            constraints.required = true;
        }

        if (input.minLength > 0) {
            constraints.minLength = input.minLength;
        }

        if (input.maxLength > 0) {
            constraints.maxLength = input.maxLength;
        }

        if (input.min) {
            constraints.min = parseFloat(input.min);
        }

        if (input.max) {
            constraints.max = parseFloat(input.max);
        }

        if (input.pattern) {
            constraints.pattern = new RegExp(input.pattern);
        }

        return constraints;
    }

    /**
     * Show error message for input
     */
    static showError(input, message) {
        this.clearError(input);

        input.classList.add('input-error');
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'input-error-message';
        errorDiv.textContent = message;
        errorDiv.dataset.errorFor = input.name;
        
        input.parentNode.insertBefore(errorDiv, input.nextSibling);
    }

    /**
     * Clear error message for input
     */
    static clearError(input) {
        input.classList.remove('input-error');
        
        const existingError = input.parentNode.querySelector(
            `.input-error-message[data-error-for="${input.name}"]`
        );
        
        if (existingError) {
            existingError.remove();
        }
    }

    /**
     * Initialize form with auto-sanitization
     */
    static initForm(formSelector) {
        const form = typeof formSelector === 'string' 
            ? document.querySelector(formSelector)
            : formSelector;

        if (!form) {
            console.error('Form not found:', formSelector);
            return;
        }

        // Real-time validation on blur (skip files, buttons, radio, checkbox)
        form.querySelectorAll('input, textarea, select').forEach(input => {
            if (['file', 'submit', 'button', 'reset', 'image', 'radio', 'checkbox'].includes(input.type)) {
                return;
            }

            input.addEventListener('blur', () => {
                const type = input.dataset.sanitizeType || 'string';
                const result = this.validate(input.value, type, this.getConstraints(input));

                if (!result.valid) {
                    this.showError(input, result.errors[0]);
                } else {
                    this.clearError(input);
                    // For phone inputs, display with +254 prefix
                    if (type === 'phone' && result.value) {
                        input.value = this.formatPhoneDisplay(result.value);
                        // Store the actual value (without +) in a data attribute for form submission
                        input.dataset.sanitizedValue = result.value;
                    } else {
                        input.value = result.value;
                    }
                }
            });

            input.addEventListener('input', () => {
                if (input.classList.contains('input-error')) {
                    this.clearError(input);
                }
            });
        });

        // Sanitize on submit
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Before sanitizing, restore phone numbers to format without + for validation
            form.querySelectorAll('input[data-sanitize-type="phone"]').forEach(phoneInput => {
                if (phoneInput.dataset.sanitizedValue) {
                    phoneInput.value = phoneInput.dataset.sanitizedValue;
                }
            });
            
            const sanitized = this.sanitizeForm(form);
            const hasErrors = form.querySelector('.input-error');

            if (!hasErrors) {
                // All inputs are valid, proceed with submission
                if (form.dataset.onValidSubmit) {
                    window[form.dataset.onValidSubmit](sanitized);
                } else {
                    form.submit();
                }
            } else {
                console.warn('Form has validation errors');
            }
        });
    }

    /**
     * Initialize all forms on page
     */
    static initAllForms() {
        document.querySelectorAll('form[data-sanitize="true"]').forEach(form => {
            this.initForm(form);
        });
    }
}

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        InputSanitizer.initAllForms();
    });
} else {
    InputSanitizer.initAllForms();
}

// Global helper
window.InputSanitizer = InputSanitizer;

// CommonJS / Node environment support
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { InputSanitizer, inputSanitizer: InputSanitizer };
}
