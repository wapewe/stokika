/**
 * Registration Payment Service
 * Orchestrates the vendor registration payment flow
 * - Server-side validation
 * - Payment intent creation
 * - M-Pesa STK Push
 * - Status polling
 */
class RegistrationPaymentService {
    constructor(supabaseClient) {
        this.supabaseClient = supabaseClient;
        this.validationToken = null;
        this.paymentIntentId = null;
        this.poller = null;
    }
    
    /**
     * Validate registration data with server
     * @param {Object} formData - Sanitized form data
     * @returns {Promise<Object>} {valid: boolean, token: string, errors?: Array}
     */
    async validateServerSide(formData) {
        try {
            // Use retry logic if available
            if (window.VendorErrorHandler?.callEdgeFunctionWithRetry) {
                console.log('[Payment Service] Using retry logic for validation');
                const result = await window.VendorErrorHandler.callEdgeFunctionWithRetry(
                    'validate-vendor-registration',
                    formData,
                    { maxRetries: 3 }
                );
                // Store the validation token for subsequent payment calls
                if (result.valid && result.token) {
                    this.validationToken = result.token;
                    console.log('[Payment Service] Validation token stored');
                }
                return result;
            }
            
            // Fallback to direct call
            const supabaseUrl = window.SUPABASE_URL || window.SUPABASE_CONFIG?.url || 'https://eidsqrnwfndruuufyacc.supabase.co';
            const anonKey = window.SUPABASE_ANON_KEY || window.SUPABASE_CONFIG?.anonKey;
            const headers = {
                'Content-Type': 'application/json'
            };
            if (anonKey) {
                headers['apikey'] = anonKey;
                headers['Authorization'] = `Bearer ${anonKey}`;
            }
            const response = await fetch(`${supabaseUrl}/functions/v1/validate-vendor-registration`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (response.status === 429) {
                throw new Error('Too many validation requests. Please try again in 15 minutes.');
            }
            
            if (!response.ok && response.status !== 400) {
                throw new Error(data.error || 'Validation failed');
            }
            
            console.log('[Payment Service] Validation result:', data);
            
            if (data.valid) {
                this.validationToken = data.token;
            }
            
            return data;
        } catch (error) {
            console.error('[Payment Service] Validation error:', error);
            
            // Show user-friendly error if handler available
            if (window.VendorErrorHandler?.showErrorMessage) {
                window.VendorErrorHandler.showErrorMessage(
                    error.message || 'Validation failed. Please try again.',
                    'validationErrorContainer',
                    true, // Show retry button
                    () => {
                        // Retry callback
                        console.log('[Payment Service] User requested retry');
                        // The form should be resubmitted by the UI
                    }
                );
            }
            
            throw error;
        }
    }
    
    /**
     * Create payment intent and initiate M-Pesa STK Push
     * @param {string} phoneNumber - M-Pesa phone number
     * @param {string} paymentMethod - Payment method ('stkpush' or 'manual')
     * @returns {Promise<Object>} {success: boolean, paymentIntentId, checkoutRequestId}
     */
    async createPaymentIntent(phoneNumber, paymentMethod = 'stkpush') {
        try {
            if (!this.validationToken) {
                throw new Error('Validation token missing. Please resubmit the form.');
            }
            
            const supabaseUrl = window.SUPABASE_URL || window.SUPABASE_CONFIG?.url || 'https://eidsqrnwfndruuufyacc.supabase.co';
            let token = null;
            try {
                if (this.supabaseClient?.auth) {
                    const session = await this.supabaseClient.auth.getSession();
                    token = session?.data?.session?.access_token;
                }
            } catch (_) {}
            
            if (!token) {
                token = window.SUPABASE_ANON_KEY || window.SUPABASE_CONFIG?.anonKey;
            }
            
            // Use retry logic if available
            if (window.VendorErrorHandler?.callEdgeFunctionWithRetry) {
                console.log('[Payment Service] Using retry logic for payment creation');
                return await window.VendorErrorHandler.callEdgeFunctionWithRetry(
                    'create-vendor-registration-payment',
                    {
                        validationToken: this.validationToken,
                        phoneNumber: phoneNumber,
                        paymentMethod: paymentMethod
                    },
                    { token, maxRetries: 2 } // Fewer retries for payment (to avoid duplicate charges)
                );
            }
            
            // Fallback to direct call
            const headers = {
                'Content-Type': 'application/json'
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
                headers['apikey'] = token;
            }
            
            const response = await fetch(`${supabaseUrl}/functions/v1/create-vendor-registration-payment`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    validationToken: this.validationToken,
                    phoneNumber: phoneNumber,
                    paymentMethod: paymentMethod
                })
            });
            
            const data = await response.json();
            
            if (response.status === 429) {
                const retryAfter = response.headers.get('Retry-After');
                throw new Error(`Too many payment attempts. Please try again in ${retryAfter ? Math.ceil(retryAfter / 60) + ' minutes' : '1 hour'}.`);
            }
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to create payment');
            }
            
            console.log('[Payment Service] Payment intent created:', data);
            
            this.paymentIntentId = data.paymentIntentId;
            
            return data;
        } catch (error) {
            console.error('[Payment Service] Payment creation error:', error);
            
            // Show user-friendly error if handler available
            if (window.VendorErrorHandler?.showErrorMessage) {
                window.VendorErrorHandler.showErrorMessage(
                    error.message || 'Failed to create payment. Please try again.',
                    'paymentErrorContainer',
                    true, // Show retry button
                    () => {
                        // Retry callback - handled by retry payment button
                        const retryBtn = document.getElementById('retryPayment');
                        if (retryBtn) {
                            retryBtn.style.display = 'inline-block';
                        }
                    }
                );
            }
            
            throw error;
        }
    }
    
    /**
     * Start polling for payment status
     * @param {Function} statusCallback - Called on each status update
     */
    startStatusPolling(statusCallback) {
        if (!this.paymentIntentId) {
            throw new Error('Payment intent ID not set');
        }
        
        this.poller = new window.PaymentStatusPoller(this.paymentIntentId, this.supabaseClient);
        this.poller.startPolling(statusCallback);
        
        console.log('[Payment Service] Status polling started');
    }
    
    /**
     * Stop polling
     */
    stopStatusPolling() {
        if (this.poller) {
            this.poller.stopPolling();
            this.poller = null;
        }
    }
    
    /**
     * Complete payment flow orchestration
     * @param {Object} formData - Sanitized form data
     * @param {string} phoneNumber - M-Pesa phone number
     * @param {Function} statusCallback - Status update callback
     * @returns {Promise<Object>}
     */
    async initiatePayment(formData, phoneNumber, statusCallback) {
        try {
            console.log('[Payment Service] Initiating payment flow...');
            
            // Step 1: Validate with server
            const validation = await this.validateServerSide(formData);
            
            if (!validation.valid) {
                return {
                    success: false,
                    step: 'validation',
                    errors: validation.errors
                };
            }
            
            // Step 2: Create payment intent & initiate STK Push
            const payment = await this.createPaymentIntent(phoneNumber);
            
            if (!payment.success) {
                return {
                    success: false,
                    step: 'payment',
                    error: 'Failed to initiate payment'
                };
            }
            
            // Step 3: Start status polling
            this.startStatusPolling(statusCallback);
            
            return {
                success: true,
                paymentIntentId: payment.paymentIntentId,
                checkoutRequestId: payment.checkoutRequestId,
                paymentReference: payment.paymentReference
            };
            
        } catch (error) {
            console.error('[Payment Service] Payment initiation error:', error);
            throw error;
        }
    }
    
    /**
     * Retry payment (reuse existing validation token if still valid)
     * @param {string} phoneNumber
     * @param {Function} statusCallback
     * @returns {Promise<Object>}
     */
    async retryPayment(phoneNumber, statusCallback) {
        try {
            console.log('[Payment Service] Retrying payment...');
            
            if (!this.validationToken) {
                throw new Error('Validation token expired. Please resubmit the form.');
            }
            
            // Stop any existing polling
            this.stopStatusPolling();
            
            // Create new payment intent
            const payment = await this.createPaymentIntent(phoneNumber);
            
            if (!payment.success) {
                return {
                    success: false,
                    error: 'Failed to retry payment'
                };
            }
            
            // Start polling
            this.startStatusPolling(statusCallback);
            
            return {
                success: true,
                paymentIntentId: payment.paymentIntentId,
                checkoutRequestId: payment.checkoutRequestId
            };
            
        } catch (error) {
            console.error('[Payment Service] Payment retry error:', error);
            throw error;
        }
    }
}

// Export for use in other files
window.RegistrationPaymentService = RegistrationPaymentService;

console.log('✅ RegistrationPaymentService class loaded');
