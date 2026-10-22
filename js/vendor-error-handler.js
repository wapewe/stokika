/**
 * Vendor Registration Error Handler
 * Provides comprehensive error handling for vendor registration and payment flows
 * 
 * Requirements: Task 14 - Error Handling and Edge Cases
 * - 14.1: Frontend error handling for network failures
 * - 14.3: Payment timeout handling
 */

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
 * @param {number} initialDelay - Initial delay in milliseconds (default: 1000)
 * @param {number} maxDelay - Maximum delay in milliseconds (default: 10000)
 * @returns {Promise<any>} Result of function or throws error after max retries
 */
async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000, maxDelay = 10000) {
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            console.log(`[Retry] Attempt ${attempt + 1}/${maxRetries}`);
            return await fn();
        } catch (error) {
            lastError = error;
            
            // Don't retry on certain errors (client errors, validation failures)
            if (error.message?.includes('401') || 
                error.message?.includes('403') || 
                error.message?.includes('404') ||
                error.message?.includes('Duplicate') ||
                error.message?.includes('Please enter') ||
                error.message?.includes('is required') ||
                error.message?.includes('already registered') ||
                error.message?.includes('must be between')) {
                console.error('[Retry] Non-retryable error:', error);
                throw error;
            }
            
            // If this was the last attempt, throw the error
            if (attempt === maxRetries - 1) {
                console.error('[Retry] Max retries reached:', error);
                throw error;
            }
            
            // Calculate delay with exponential backoff: initialDelay * 2^attempt
            const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);
            console.log(`[Retry] Waiting ${delay}ms before retry...`);
            
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    throw lastError;
}

/**
 * Call an Edge Function with retry logic
 * @param {string} endpoint - Edge function endpoint (e.g., 'validate-vendor-registration')
 * @param {Object} data - Request body data
 * @param {Object} options - Additional options
 * @param {string} options.token - Authorization token (optional)
 * @param {number} options.maxRetries - Maximum retry attempts (default: 3)
 * @returns {Promise<Object>} Response data
 */
async function callEdgeFunctionWithRetry(endpoint, data, options = {}) {
    const { token, maxRetries = 3 } = options;
    
    return await retryWithBackoff(async () => {
        // Robust URL resolution with fallback chain
        const supabaseUrl = window.SUPABASE_URL || window.SUPABASE_CONFIG?.url || 'https://eidsqrnwfndruuufyacc.supabase.co';
        const anonKey = window.SUPABASE_ANON_KEY || window.SUPABASE_CONFIG?.anonKey;
        
        // Determine authorization token
        const authToken = token || anonKey;
        
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // Always include apikey header (required by Supabase Edge Functions)
        if (anonKey) {
            headers['apikey'] = anonKey;
        }
        
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }
        
        console.log(`[Edge Function] Calling ${endpoint} at ${supabaseUrl}...`);
        
        const response = await fetch(`${supabaseUrl}/functions/v1/${endpoint}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(data)
        });
        
        // Don't retry on rate limit errors
        if (response.status === 429) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Too many requests. Please try again later.');
        }
        
        // Don't retry on 4xx client errors (except 408 timeout)
        if (response.status >= 400 && response.status < 500 && response.status !== 408) {
            const errorData = await response.json();
            let errorMessage = errorData.error;
            if (!errorMessage && errorData.errors && Array.isArray(errorData.errors)) {
                errorMessage = errorData.errors.map(e => e.message).join(', ');
            }
            throw new Error(errorMessage || `Request failed: ${response.statusText}`);
        }
        
        // Retry on 5xx server errors and network errors
        if (!response.ok) {
            let serverError = `Server error: ${response.status} ${response.statusText}`;
            try {
                const errorData = await response.json();
                if (errorData.error) serverError += ` - ${errorData.error}`;
                else if (errorData.message) serverError += ` - ${errorData.message}`;
            } catch (e) {
                // Ignore parse errors for 500 responses
            }
            throw new Error(serverError);
        }
        
        const result = await response.json();
        console.log(`[Edge Function] ${endpoint} success:`, result);
        
        return result;
    }, maxRetries);
}

/**
 * Show error message in UI
 * @param {string} message - Error message to display
 * @param {string} elementId - Container element ID (optional)
 * @param {boolean} showRetryButton - Whether to show retry button (default: false)
 * @param {Function} onRetry - Retry callback function (optional)
 */
function showErrorMessage(message, elementId = null, showRetryButton = false, onRetry = null) {
    console.error('[Error]', message);
    
    const errorHtml = `
        <div class="error-message" role="alert" style="
            background-color: #fee; 
            color: #c33; 
            padding: 16px; 
            border-radius: 8px; 
            border-left: 4px solid #c33;
            margin: 16px 0;
            animation: slideIn 0.3s ease-out;">
            <div style="display: flex; align-items: flex-start; gap: 12px;">
                <span style="font-size: 20px;">⚠️</span>
                <div style="flex: 1;">
                    <strong style="display: block; margin-bottom: 4px;">Error</strong>
                    <p style="margin: 0;">${escapeHtml(message)}</p>
                    ${showRetryButton ? `
                        <button type="button" 
                                class="btn-retry-error" 
                                style="
                                    margin-top: 12px;
                                    padding: 8px 16px;
                                    background-color: #c33;
                                    color: white;
                                    border: none;
                                    border-radius: 4px;
                                    cursor: pointer;
                                    font-size: 14px;">
                            🔄 Retry
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
        <style>
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            .btn-retry-error:hover {
                background-color: #a22;
            }
        </style>
    `;
    
    if (elementId) {
        const container = document.getElementById(elementId);
        if (container) {
            container.innerHTML = errorHtml;
            
            if (showRetryButton && onRetry) {
                const retryBtn = container.querySelector('.btn-retry-error');
                if (retryBtn) {
                    retryBtn.addEventListener('click', onRetry);
                }
            }
        }
    } else {
        // If no container specified, show in modal or alert
        if (window.enhancedToast?.showToast) {
            window.enhancedToast.showToast(message, 'error');
        } else {
            alert(`Error: ${message}`);
        }
    }
}

/**
 * Show timeout message for payment
 * @param {string} paymentMethod - 'stkpush' or 'manual'
 * @param {Function} onContinueWaiting - Callback for continue waiting (manual only)
 * @param {Function} onContactSupport - Callback for contact support
 */
function showPaymentTimeoutMessage(paymentMethod, onContinueWaiting = null, onContactSupport = null) {
    const timeoutMessages = {
        stkpush: {
            title: '⏱️ Payment Timeout',
            message: 'The M-Pesa payment prompt has expired. This can happen if the prompt was not completed within 30 seconds.',
            actions: [
                { label: '🔄 Retry Payment', type: 'primary', handler: 'retry' },
                { label: '📞 Contact Support', type: 'secondary', handler: 'support' }
            ]
        },
        manual: {
            title: '⏱️ Waiting for Payment',
            message: 'Payment confirmation is taking longer than expected. If you have sent the payment, your account will be activated automatically once we receive it. You will receive an SMS confirmation.',
            note: '💡 This is normal for manual paybill payments and can take up to 5-10 minutes.',
            actions: [
                { label: '⏳ Continue Waiting', type: 'primary', handler: 'continue' },
                { label: '📞 Contact Support', type: 'secondary', handler: 'support' }
            ]
        }
    };
    
    const config = timeoutMessages[paymentMethod] || timeoutMessages.stkpush;
    
    // Create modal HTML
    const modalHtml = `
        <div class="timeout-modal-overlay" style="
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.3s ease-out;">
            <div class="timeout-modal" style="
                background: white;
                padding: 32px;
                border-radius: 12px;
                max-width: 500px;
                width: 90%;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
                animation: slideUp 0.3s ease-out;">
                <h3 style="
                    margin: 0 0 16px 0;
                    font-size: 24px;
                    color: #333;">
                    ${config.title}
                </h3>
                <p style="
                    margin: 0 0 16px 0;
                    color: #666;
                    line-height: 1.6;">
                    ${config.message}
                </p>
                ${config.note ? `
                    <div style="
                        background: #f0f9ff;
                        padding: 12px;
                        border-radius: 6px;
                        border-left: 4px solid #3b82f6;
                        margin-bottom: 16px;">
                        <p style="margin: 0; color: #1e40af; font-size: 14px;">
                            ${config.note}
                        </p>
                    </div>
                ` : ''}
                <div style="
                    display: flex;
                    gap: 12px;
                    margin-top: 24px;">
                    ${config.actions.map((action, index) => `
                        <button type="button" 
                                class="timeout-action-btn" 
                                data-action="${action.handler}"
                                style="
                                    flex: 1;
                                    padding: 12px 20px;
                                    background-color: ${action.type === 'primary' ? '#10b981' : '#6b7280'};
                                    color: white;
                                    border: none;
                                    border-radius: 6px;
                                    cursor: pointer;
                                    font-size: 16px;
                                    font-weight: 500;
                                    transition: all 0.2s;">
                            ${action.label}
                        </button>
                    `).join('')}
                </div>
            </div>
        </div>
        <style>
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            .timeout-action-btn:hover {
                filter: brightness(1.1);
                transform: translateY(-1px);
            }
        </style>
    `;
    
    // Remove any existing timeout modal
    const existingModal = document.querySelector('.timeout-modal-overlay');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to DOM
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Attach event listeners
    const modal = document.querySelector('.timeout-modal-overlay');
    const actionButtons = modal.querySelectorAll('.timeout-action-btn');
    
    actionButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            
            // Remove modal
            modal.remove();
            
            // Execute appropriate callback
            switch (action) {
                case 'retry':
                    // Handled by payment system retry button
                    const retryPaymentBtn = document.getElementById('retryPayment');
                    if (retryPaymentBtn) {
                        retryPaymentBtn.click();
                    }
                    break;
                    
                case 'continue':
                    if (onContinueWaiting) {
                        onContinueWaiting();
                    }
                    break;
                    
                case 'support':
                    if (onContactSupport) {
                        onContactSupport();
                    } else {
                        // Default: scroll to contact section
                        window.location.hash = 'contact';
                    }
                    break;
            }
        });
    });
}

/**
 * Escape HTML to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
    if (!str) return '';
    
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Show contact support information
 */
function showContactSupportInfo() {
    const supportHtml = `
        <div class="support-info-modal" style="
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
            animation: fadeIn 0.3s ease-out;">
            <div style="
                background: white;
                padding: 32px;
                border-radius: 12px;
                max-width: 500px;
                width: 90%;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);">
                <h3 style="margin: 0 0 20px 0; font-size: 24px; color: #333;">
                    📞 Contact Support
                </h3>
                <div style="display: flex; flex-direction: column; gap: 16px;">
                    <div style="padding: 16px; background: #f9fafb; border-radius: 8px;">
                        <div style="font-weight: 600; color: #333; margin-bottom: 8px;">
                            📱 Phone
                        </div>
                        <a href="tel:+254728011976" style="color: #10b981; text-decoration: none; font-size: 18px;">
                            +254 728 011 976
                        </a>
                        <div style="color: #6b7280; font-size: 14px; margin-top: 4px;">
                            Mon-Fri 8AM-6PM EAT
                        </div>
                    </div>
                    <div style="padding: 16px; background: #f9fafb; border-radius: 8px;">
                        <div style="font-weight: 600; color: #333; margin-bottom: 8px;">
                            📧 Email
                        </div>
                        <a href="mailto:info@stokika.com" style="color: #10b981; text-decoration: none; font-size: 18px;">
                            info@stokika.com
                        </a>
                        <div style="color: #6b7280; font-size: 14px; margin-top: 4px;">
                            We reply within 24 hours
                        </div>
                    </div>
                    <div style="padding: 16px; background: #f9fafb; border-radius: 8px;">
                        <div style="font-weight: 600; color: #333; margin-bottom: 8px;">
                            💬 WhatsApp
                        </div>
                        <a href="https://wa.me/254728011976" target="_blank" rel="noopener" style="color: #10b981; text-decoration: none; font-size: 18px;">
                            +254 728 011 976
                        </a>
                        <div style="color: #6b7280; font-size: 14px; margin-top: 4px;">
                            Quick support available
                        </div>
                    </div>
                </div>
                <button type="button" 
                        class="btn-close-support"
                        style="
                            width: 100%;
                            margin-top: 24px;
                            padding: 12px;
                            background-color: #10b981;
                            color: white;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 16px;
                            font-weight: 500;">
                    Close
                </button>
            </div>
        </div>
    `);
    
    document.body.insertAdjacentHTML('beforeend', supportHtml);
    
    const modal = document.querySelector('.support-info-modal');
    const closeBtn = modal.querySelector('.btn-close-support');
    
    closeBtn.addEventListener('click', () => {
        modal.remove();
    });
    
    // Close on overlay click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Export functions to global scope
window.VendorErrorHandler = {
    retryWithBackoff,
    callEdgeFunctionWithRetry,
    showErrorMessage,
    showPaymentTimeoutMessage,
    showContactSupportInfo,
    escapeHtml
};

console.log('✅ VendorErrorHandler module loaded');

