/**
 * M-Pesa Integration Client Library
 * 
 * Provides a clean JavaScript API for M-Pesa operations without exposing credentials.
 * All M-Pesa API calls are proxied through Supabase Edge Functions for security.
 * 
 * @class MpesaIntegrationClient
 * @version 1.0.0
 * @author Stokika Development Team
 * 
 * Requirements: 2.1, 2.2, 2.7, 6.3, 6.4, 7.1, 7.2, 7.5, 7.6
 */

class MpesaIntegrationClient {
    /**
     * Create an M-Pesa integration client
     * @param {Object} supabaseClient - Initialized Supabase client from initSupabase()
     */
    constructor(supabaseClient) {
        if (!supabaseClient) {
            throw new Error('Supabase client is required');
        }
        
        this.supabase = supabaseClient;
        this.baseUrl = `${supabaseClient.supabaseUrl}/functions/v1`;
        
        // Configuration
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 second base delay
        this.pollInterval = 3000; // 3 seconds
        this.defaultMaxAttempts = 20; // 60 seconds total polling time
    }

    /**
     * Initiate STK Push payment
     * 
     * Sends an M-Pesa payment prompt to the customer's phone. The user must
     * enter their M-Pesa PIN to complete the payment.
     * 
     * @param {Object} paymentData - Payment details
     * @param {string} paymentData.phoneNumber - Kenyan phone number (254XXXXXXXXX)
     * @param {number} paymentData.amount - Payment amount in KES (must be 2500 or 3500)
     * @param {string} paymentData.applicationCode - User application code
     * @param {string} paymentData.userType - 'field_agent' or 'supervisor'
     * @returns {Promise<Object>} { success, checkoutRequestId, merchantRequestId, message }
     * 
     * Requirements: 2.1, 2.2, 2.7
     */
    async initiateSTKPush(paymentData) {
        try {
            // Client-side validation
            const validation = this._validateSTKPushInput(paymentData);
            if (!validation.valid) {
                return {
                    success: false,
                    error: 'VALIDATION_ERROR',
                    message: validation.message
                };
            }

            // Call Edge Function with retry logic
            const response = await this._callEdgeFunctionWithRetry('mpesa-stk-push', {
                phoneNumber: paymentData.phoneNumber,
                amount: paymentData.amount,
                applicationCode: paymentData.applicationCode,
                userType: paymentData.userType
            });

            return response;

        } catch (error) {
            console.error('Error initiating STK Push:', error);
            return {
                success: false,
                error: 'NETWORK_ERROR',
                message: 'Unable to initiate payment. Please check your internet connection and try again.',
                details: error.message
            };
        }
    }

    /**
     * Check payment status
     * 
     * Queries the current status of a payment using its checkout request ID.
     * 
     * @param {string} checkoutRequestId - The checkout request ID from STK Push
     * @returns {Promise<Object>} { success, status, data }
     * 
     * Requirements: 7.1, 7.2
     */
    async checkPaymentStatus(checkoutRequestId) {
        try {
            if (!checkoutRequestId) {
                return {
                    success: false,
                    error: 'INVALID_INPUT',
                    message: 'Checkout request ID is required'
                };
            }

            // Query payment record from database
            const { data, error } = await this.supabase
                .from('stokika_kit_payments')
                .select('*')
                .eq('checkout_request_id', checkoutRequestId)
                .single();

            if (error) {
                console.error('Error checking payment status:', error);
                return {
                    success: false,
                    error: 'DATABASE_ERROR',
                    message: 'Unable to check payment status. Please try again.',
                    details: error.message
                };
            }

            if (!data) {
                return {
                    success: false,
                    error: 'NOT_FOUND',
                    message: 'Payment record not found'
                };
            }

            return {
                success: true,
                status: data.payment_status,
                data: {
                    checkoutRequestId: data.checkout_request_id,
                    merchantRequestId: data.merchant_request_id,
                    phoneNumber: data.phone_number,
                    amount: data.amount,
                    status: data.payment_status,
                    mpesaReceiptNumber: data.mpesa_receipt_number,
                    transactionDate: data.transaction_date,
                    failureReason: data.failure_reason,
                    createdAt: data.created_at,
                    updatedAt: data.updated_at
                }
            };

        } catch (error) {
            console.error('Error checking payment status:', error);
            return {
                success: false,
                error: 'UNKNOWN_ERROR',
                message: 'An unexpected error occurred while checking payment status',
                details: error.message
            };
        }
    }

    /**
     * Poll payment status until completion or timeout
     * 
     * Continuously checks payment status every 3 seconds until the payment
     * is completed, failed, or max attempts reached. After max attempts,
     * triggers status query fallback.
     * 
     * @param {string} checkoutRequestId - The checkout request ID from STK Push
     * @param {number} maxAttempts - Maximum polling attempts (default 20 = 60 seconds)
     * @returns {Promise<Object>} Final payment status
     * 
     * Requirements: 7.5, 7.6
     */
    async pollPaymentStatus(checkoutRequestId, maxAttempts = null) {
        maxAttempts = maxAttempts || this.defaultMaxAttempts;
        let attempts = 0;

        try {
            while (attempts < maxAttempts) {
                attempts++;

                // Check current status
                const statusResult = await this.checkPaymentStatus(checkoutRequestId);

                if (!statusResult.success) {
                    // If we can't check status, wait and retry
                    await this._sleep(this.pollInterval);
                    continue;
                }

                const status = statusResult.status;

                // Terminal states - return immediately
                if (status === 'completed' || status === 'verified') {
                    return {
                        success: true,
                        status: 'completed',
                        message: 'Payment completed successfully',
                        data: statusResult.data
                    };
                }

                if (status === 'failed' || status === 'rejected') {
                    return {
                        success: false,
                        status: status,
                        message: statusResult.data.failureReason || 'Payment failed',
                        data: statusResult.data
                    };
                }

                if (status === 'timeout') {
                    return {
                        success: false,
                        status: 'timeout',
                        message: 'Payment request timed out. Please try again.',
                        data: statusResult.data
                    };
                }

                // Still pending - wait before next poll
                await this._sleep(this.pollInterval);
            }

            // Max attempts reached - trigger status query fallback
            console.log('Max polling attempts reached, triggering status query fallback');
            const fallbackResult = await this._triggerStatusQueryFallback(checkoutRequestId);

            return fallbackResult;

        } catch (error) {
            console.error('Error polling payment status:', error);
            return {
                success: false,
                error: 'POLLING_ERROR',
                message: 'Unable to track payment status. Please check manually.',
                details: error.message
            };
        }
    }

    /**
     * Submit manual payment verification
     * 
     * Allows users to submit M-Pesa receipt codes for manual verification
     * when STK Push is unavailable or fails.
     * 
     * @param {Object} verificationData - Manual payment details
     * @param {string} verificationData.applicationCode - User application code
     * @param {string} verificationData.mpesaCode - M-Pesa receipt number
     * @param {string} verificationData.phoneNumber - Phone number used for payment
     * @param {number} verificationData.amount - Payment amount
     * @returns {Promise<Object>} { success, message }
     * 
     * Requirements: 6.3, 6.4
     */
    async submitManualPayment(verificationData) {
        try {
            // Validate inputs
            const validation = this._validateManualPaymentInput(verificationData);
            if (!validation.valid) {
                return {
                    success: false,
                    error: 'VALIDATION_ERROR',
                    message: validation.message
                };
            }

            // Create payment record with awaiting_verification status
            const { data, error } = await this.supabase
                .from('stokika_kit_payments')
                .insert([{
                    application_code: verificationData.applicationCode,
                    phone_number: verificationData.phoneNumber,
                    amount: verificationData.amount,
                    payment_status: 'awaiting_verification',
                    mpesa_receipt_number: verificationData.mpesaCode,
                    payment_method: 'manual_paybill',
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) {
                console.error('Error submitting manual payment:', error);
                
                // Check if this is a rate limit error (HTTP 429)
                if (error.code === 'PGRST301' || error.message?.includes('rate limit')) {
                    const retryMinutes = 5; // Default to 5 minutes
                    return {
                        success: false,
                        error: 'RATE_LIMIT_EXCEEDED',
                        code: 429,
                        message: `Too many payment attempts. Please try again in ${retryMinutes} minutes.`,
                        retryAfter: retryMinutes * 60
                    };
                }
                
                return {
                    success: false,
                    error: 'DATABASE_ERROR',
                    message: 'Unable to submit payment for verification. Please try again.',
                    details: error.message
                };
            }

            return {
                success: true,
                message: 'Payment submitted successfully. An administrator will verify your payment shortly.',
                data: {
                    paymentId: data.id,
                    status: data.payment_status,
                    receiptNumber: data.mpesa_receipt_number
                }
            };

        } catch (error) {
            console.error('Error submitting manual payment:', error);
            return {
                success: false,
                error: 'UNKNOWN_ERROR',
                message: 'An unexpected error occurred while submitting your payment',
                details: error.message
            };
        }
    }

    /**
     * Validate STK Push input data
     * @private
     */
    _validateSTKPushInput(paymentData) {
        if (!paymentData) {
            return { valid: false, message: 'Payment data is required' };
        }

        // Validate phone number format
        if (!paymentData.phoneNumber) {
            return { valid: false, message: 'Phone number is required' };
        }

        const phoneRegex = /^254[0-9]{9}$/;
        if (!phoneRegex.test(paymentData.phoneNumber)) {
            return {
                valid: false,
                message: 'Invalid phone number format. Please use format: 254XXXXXXXXX (e.g., 254712345678)'
            };
        }

        // Validate amount
        if (!paymentData.amount || typeof paymentData.amount !== 'number') {
            return { valid: false, message: 'Valid payment amount is required' };
        }

        // Validate amount matches kit price
        const validAmounts = { field_agent: 1550, supervisor: 3500 };
        const expectedAmount = validAmounts[paymentData.userType];

        if (paymentData.amount !== expectedAmount) {
            return {
                valid: false,
                message: `Invalid amount. ${paymentData.userType === 'field_agent' ? 'Field Agent' : 'Supervisor'} kit costs KES ${expectedAmount}`
            };
        }

        // Validate application code
        if (!paymentData.applicationCode) {
            return { valid: false, message: 'Application code is required' };
        }

        // Validate user type
        if (!['field_agent', 'supervisor'].includes(paymentData.userType)) {
            return { valid: false, message: 'User type must be either field_agent or supervisor' };
        }

        return { valid: true };
    }

    /**
     * Validate manual payment input data
     * @private
     */
    _validateManualPaymentInput(verificationData) {
        if (!verificationData) {
            return { valid: false, message: 'Verification data is required' };
        }

        // Validate application code
        if (!verificationData.applicationCode) {
            return { valid: false, message: 'Application code is required' };
        }

        // Validate M-Pesa receipt code format (10 alphanumeric characters)
        if (!verificationData.mpesaCode) {
            return { valid: false, message: 'M-Pesa receipt code is required' };
        }

        const receiptRegex = /^[A-Z0-9]{10}$/i;
        if (!receiptRegex.test(verificationData.mpesaCode)) {
            return {
                valid: false,
                message: 'Invalid M-Pesa receipt code format. Should be 10 alphanumeric characters (e.g., QA12BC3456)'
            };
        }

        // Validate phone number
        if (!verificationData.phoneNumber) {
            return { valid: false, message: 'Phone number is required' };
        }

        const phoneRegex = /^254[0-9]{9}$/;
        if (!phoneRegex.test(verificationData.phoneNumber)) {
            return {
                valid: false,
                message: 'Invalid phone number format. Please use format: 254XXXXXXXXX'
            };
        }

        // Validate amount
        if (!verificationData.amount || typeof verificationData.amount !== 'number') {
            return { valid: false, message: 'Valid payment amount is required' };
        }

        if (verificationData.amount < 100 || verificationData.amount > 100000) {
            return {
                valid: false,
                message: 'Payment amount must be between KES 100 and KES 100,000'
            };
        }

        return { valid: true };
    }

    /**
     * Call Edge Function with retry logic
     * Implements exponential backoff for network failures
     * @private
     */
    async _callEdgeFunctionWithRetry(functionName, payload, attempt = 1) {
        try {
            const response = await this.supabase.functions.invoke(functionName, {
                body: payload
            });

            if (response.error) {
                // Check if this is a rate limit error (HTTP 429)
                if (response.error.code === 'RATE_LIMIT_EXCEEDED' || response.error.status === 429) {
                    const retryAfter = response.error.retry_after || 300; // Default to 5 minutes
                    const retryMinutes = Math.ceil(retryAfter / 60);
                    
                    return {
                        success: false,
                        error: 'RATE_LIMIT_EXCEEDED',
                        code: 429,
                        message: `Too many payment attempts. Please try again in ${retryMinutes} minute${retryMinutes !== 1 ? 's' : ''}.`,
                        retryAfter: retryAfter,
                        details: 'Payment rate limit exceeded'
                    };
                }
                
                throw new Error(response.error.message || 'Edge function call failed');
            }

            return response.data;

        } catch (error) {
            console.error(`Edge function call attempt ${attempt} failed:`, error);

            // If we've exhausted retries, return error
            if (attempt >= this.maxRetries) {
                return {
                    success: false,
                    error: 'MAX_RETRIES_EXCEEDED',
                    message: 'Unable to process payment after multiple attempts. Please try again later.',
                    details: error.message
                };
            }

            // Calculate exponential backoff delay
            const delay = this.retryDelay * Math.pow(2, attempt - 1);
            console.log(`Retrying in ${delay}ms...`);
            await this._sleep(delay);

            // Retry
            return this._callEdgeFunctionWithRetry(functionName, payload, attempt + 1);
        }
    }

    /**
     * Trigger status query fallback
     * Called when callback is missing after max polling attempts
     * @private
     */
    async _triggerStatusQueryFallback(checkoutRequestId) {
        try {
            console.log('Triggering status query fallback for:', checkoutRequestId);

            const response = await this.supabase.functions.invoke('mpesa-status-query', {
                body: { checkoutRequestId }
            });

            if (response.error) {
                throw new Error(response.error.message || 'Status query failed');
            }

            // After triggering query, check status one more time
            await this._sleep(2000); // Wait 2 seconds for query to complete
            const finalStatus = await this.checkPaymentStatus(checkoutRequestId);

            if (finalStatus.success) {
                return {
                    success: finalStatus.status === 'completed',
                    status: finalStatus.status,
                    message: this._getStatusMessage(finalStatus.status, finalStatus.data),
                    data: finalStatus.data
                };
            }

            // If still can't determine status, return pending with callback missing flag
            return {
                success: false,
                status: 'callback_missing',
                message: 'Payment status could not be confirmed. Please check with support or try manual verification.',
                data: finalStatus.data
            };

        } catch (error) {
            console.error('Error in status query fallback:', error);
            return {
                success: false,
                status: 'unknown',
                message: 'Unable to confirm payment status. Please contact support with your transaction details.',
                details: error.message
            };
        }
    }

    /**
     * Get user-friendly status message
     * @private
     */
    _getStatusMessage(status, data) {
        const messages = {
            'completed': 'Payment completed successfully!',
            'verified': 'Payment verified successfully!',
            'pending': 'Payment is being processed. Please wait...',
            'failed': data?.failureReason || 'Payment failed. Please try again.',
            'timeout': 'Payment request timed out. Please try again.',
            'awaiting_verification': 'Payment submitted for verification. An administrator will review it shortly.',
            'rejected': 'Payment was rejected. Please contact support.',
            'callback_missing': 'Payment status could not be confirmed automatically. Please verify manually.'
        };

        return messages[status] || 'Unknown payment status';
    }

    /**
     * Sleep utility function
     * @private
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MpesaIntegrationClient;
}

// Make available globally
if (typeof window !== 'undefined') {
    window.MpesaIntegrationClient = MpesaIntegrationClient;
}
