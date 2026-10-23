/**
 * Safe DOM Manipulation Utilities
 * Provides null-safe DOM operations with graceful error handling
 */

class SafeDOM {
    /**
     * Safely update an element's property with null check
     * @param {string} elementId - The element ID
     * @param {string} property - The property to update (textContent, innerHTML, value, etc.)
     * @param {any} value - The value to set
     * @returns {boolean} - True if successful, false otherwise
     */
    static updateElement(elementId, property, value) {
        try {
            const element = document.getElementById(elementId);
            if (element) {
                element[property] = value;
                return true;
            }
            console.warn(`[SafeDOM] Element not found: ${elementId}`);
            return false;
        } catch (error) {
            console.error(`[SafeDOM] Error updating element ${elementId}:`, error);
            return false;
        }
    }

    /**
     * Safely get an element with null check
     * @param {string} elementId - The element ID
     * @returns {HTMLElement|null} - The element or null
     */
    static getElement(elementId) {
        const element = document.getElementById(elementId);
        if (!element) {
            console.warn(`[SafeDOM] Element not found: ${elementId}`);
        }
        return element;
    }

    /**
     * Safely query selector with null check
     * @param {string} selector - CSS selector
     * @param {HTMLElement} parent - Optional parent element
     * @returns {HTMLElement|null} - The element or null
     */
    static querySelector(selector, parent = document) {
        try {
            const element = parent.querySelector(selector);
            if (!element) {
                console.warn(`[SafeDOM] Element not found with selector: ${selector}`);
            }
            return element;
        } catch (error) {
            console.error(`[SafeDOM] Error querying selector ${selector}:`, error);
            return null;
        }
    }

    /**
     * Safely update text content
     * @param {string} elementId - The element ID
     * @param {string} text - The text to set
     * @returns {boolean} - True if successful
     */
    static setText(elementId, text) {
        return this.updateElement(elementId, 'textContent', text);
    }

    /**
     * Safely update HTML content
     * @param {string} elementId - The element ID
     * @param {string} html - The HTML to set
     * @returns {boolean} - True if successful
     */
    static setHTML(elementId, html) {
        return this.updateElement(elementId, 'innerHTML', html);
    }

    /**
     * Safely update input value
     * @param {string} elementId - The element ID
     * @param {any} value - The value to set
     * @returns {boolean} - True if successful
     */
    static setValue(elementId, value) {
        return this.updateElement(elementId, 'value', value);
    }

    /**
     * Show placeholder message in a container
     * @param {string} elementId - The container element ID
     * @param {string} message - The message to display
     * @param {string} icon - Optional emoji icon
     */
    static showPlaceholder(elementId, message, icon = '📋') {
        const element = this.getElement(elementId);
        if (element) {
            element.innerHTML = `
                <div class="placeholder-message" style="text-align: center; padding: 2rem; color: #64748b;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">${icon}</div>
                    <p style="font-size: 1.1rem;">${message}</p>
                </div>
            `;
        }
    }

    /**
     * Show error message in a container
     * @param {string} elementId - The container element ID
     * @param {string} message - The error message
     */
    static showError(elementId, message) {
        this.showPlaceholder(elementId, message, '⚠️');
    }

    /**
     * Show loading state in a container
     * @param {string} elementId - The container element ID
     * @param {string} message - Optional loading message
     */
    static showLoading(elementId, message = 'Loading...') {
        const element = this.getElement(elementId);
        if (element) {
            element.innerHTML = `
                <div class="loading-message" style="text-align: center; padding: 2rem;">
                    <div class="spinner" style="font-size: 2rem;">⏳</div>
                    <p>${message}</p>
                </div>
            `;
        }
    }
}

/**
 * Safe Supabase Query Wrapper
 * Handles common database errors gracefully
 */
class SafeSupabase {
    /**
     * Execute a Supabase query with error handling
     * @param {Function} queryFn - The query function to execute
     * @param {Object} options - Options for error handling
     * @returns {Promise<{data: any, error: any, handled: boolean}>}
     */
    static async query(queryFn, options = {}) {
        const {
            onMissingTable = 'warn', // 'warn', 'silent', 'error'
            onRLSError = 'warn',
            defaultValue = null,
            fallbackMessage = 'Feature coming soon'
        } = options;

        try {
            const result = await queryFn();
            
            if (result.error) {
                return this.handleError(result.error, {
                    onMissingTable,
                    onRLSError,
                    defaultValue,
                    fallbackMessage
                });
            }

            return { data: result.data, error: null, handled: false };
        } catch (error) {
            console.error('[SafeSupabase] Unexpected error:', error);
            return { data: defaultValue, error, handled: true };
        }
    }

    /**
     * Handle Supabase errors gracefully
     * @param {Object} error - The error object
     * @param {Object} options - Options for handling
     * @returns {Object} - Handled result
     */
    static handleError(error, options) {
        const { onMissingTable, onRLSError, defaultValue, fallbackMessage } = options;

        // Check for missing table (404 or PGRST204)
        if (this.isMissingTableError(error)) {
            if (onMissingTable === 'warn') {
                console.warn(`[SafeSupabase] Table not found: ${error.message}`);
            } else if (onMissingTable === 'error') {
                console.error(`[SafeSupabase] Table not found: ${error.message}`);
            }
            return {
                data: defaultValue,
                error,
                handled: true,
                reason: 'missing_table',
                message: fallbackMessage
            };
        }

        // Check for RLS policy error (403)
        if (this.isRLSError(error)) {
            if (onRLSError === 'warn') {
                console.warn(`[SafeSupabase] RLS policy blocked: ${error.message}`);
            } else if (onRLSError === 'error') {
                console.error(`[SafeSupabase] RLS policy blocked: ${error.message}`);
            }
            return {
                data: defaultValue,
                error,
                handled: true,
                reason: 'rls_blocked',
                message: 'Access denied'
            };
        }

        // Other errors
        console.error('[SafeSupabase] Database error:', error);
        return {
            data: defaultValue,
            error,
            handled: true,
            reason: 'unknown',
            message: 'Unable to load data'
        };
    }

    /**
     * Check if error is due to missing table
     * @param {Object} error - The error object
     * @returns {boolean}
     */
    static isMissingTableError(error) {
        if (!error) return false;
        
        const code = error.code;
        const message = error.message?.toLowerCase() || '';
        
        return (
            code === 'PGRST204' || // PostgREST not found
            code === '42P01' || // PostgreSQL undefined table
            message.includes('not found') ||
            message.includes('does not exist') ||
            message.includes('relation') && message.includes('does not exist')
        );
    }

    /**
     * Check if error is due to RLS policy
     * @param {Object} error - The error object
     * @returns {boolean}
     */
    static isRLSError(error) {
        if (!error) return false;
        
        const code = error.code;
        const message = error.message?.toLowerCase() || '';
        
        return (
            code === 'PGRST301' || // PostgREST permission denied
            code === '42501' || // PostgreSQL insufficient privilege
            message.includes('permission denied') ||
            message.includes('policy') ||
            message.includes('rls')
        );
    }
}

// Make globally available
window.SafeDOM = SafeDOM;
window.SafeSupabase = SafeSupabase;
