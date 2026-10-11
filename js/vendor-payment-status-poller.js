/**
 * Payment Status Poller
 * Polls payment-status Edge Function every 3-5 seconds with exponential backoff
 * Stops on terminal status (success, failure, or timeout after 5 minutes)
 * 
 * Requirements: 4.1, 4.3, 4.4, 4.5, 4.6
 */
class PaymentStatusPoller {
    constructor(paymentIntentId, supabaseClient) {
        this.paymentIntentId = paymentIntentId;
        this.supabaseClient = supabaseClient;
        this.intervalId = null;
        this.attempts = 0;
        this.maxAttempts = 60; // 5 minutes (5 second intervals)
        this.currentInterval = 3000; // Start at 3 seconds
        this.maxInterval = 5000; // Cap at 5 seconds
        this.onSuccess = null;
        this.onError = null;
        this.onStatusChange = null;
    }
    
    /**
     * Check if status is terminal (stop polling)
     * @param {string} status
     * @returns {boolean}
     */
    isTerminalStatus(status) {
        return ['CONFIRMED', 'FAILED', 'EXPIRED'].includes(status);
    }
    
    /**
     * Calculate next polling interval with exponential backoff
     * @returns {number} Interval in milliseconds
     */
    getNextInterval() {
        // Exponential backoff: 3s, 3.5s, 4s, 4.5s, 5s (capped)
        if (this.attempts < 5) {
            this.currentInterval = Math.min(
                3000 + (this.attempts * 500),
                this.maxInterval
            );
        }
        return this.currentInterval;
    }
    
    /**
     * Fetch payment status from API via payment-status Edge Function
     * @returns {Promise<Object>}
     */
    async checkPaymentStatus() {
        try {
            const supabaseUrl = this.supabaseClient?.supabaseUrl || window.SUPABASE_URL || window.SUPABASE_CONFIG?.url || 'https://eidsqrnwfndruuufyacc.supabase.co';
            const token = this.supabaseClient?.supabaseKey || window.SUPABASE_ANON_KEY || window.SUPABASE_CONFIG?.anonKey;
            
            const response = await fetch(
                `${supabaseUrl}/functions/v1/payment-status`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'apikey': token,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        paymentIntentId: this.paymentIntentId,
                        intent_id: this.paymentIntentId
                    })
                }
            );
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            
            const data = await response.json();
            console.log('[Payment Poller] Status check result:', data);
            
            return data;
        } catch (error) {
            console.error('[Payment Poller] Status check error:', error);
            throw error;
        }
    }
    
    /**
     * Start polling for payment status
     * Supports two callback modes:
     * 1. New API: startPolling(onSuccess, onError) - separate callbacks for success and error
     * 2. Legacy API: startPolling(statusCallback) - single callback for all status updates
     * 
     * @param {Function} onSuccessOrCallback - Success callback (new API) or status update callback (legacy API)
     * @param {Function} onError - Error callback (only for new API)
     */
    startPolling(onSuccessOrCallback, onError) {
        // Check if using new API (two callbacks) or legacy API (single callback)
        if (typeof onError === 'function') {
            // New API: separate success and error callbacks
            this.onSuccess = onSuccessOrCallback;
            this.onError = onError;
            console.log('[Payment Poller] Using new API (onSuccess, onError)');
        } else {
            // Legacy API: single callback for all status updates
            this.onStatusChange = onSuccessOrCallback;
            console.log('[Payment Poller] Using legacy API (statusCallback)');
        }
        
        console.log(`[Payment Poller] Starting polling for payment intent: ${this.paymentIntentId}`);
        console.log(`[Payment Poller] Will poll up to ${this.maxAttempts} times (5 minutes max)`);
        
        // Start polling immediately
        this.poll();
    }
    
    /**
     * Poll once and schedule next poll
     */
    async poll() {
        this.attempts++;
        
        // Check if timeout reached
        if (this.attempts > this.maxAttempts) {
            console.log('[Payment Poller] Timeout reached after 5 minutes');
            this.stop();
            
            // Use enhanced timeout message if available
            if (window.VendorErrorHandler?.showPaymentTimeoutMessage) {
                // Determine payment method from metadata (if available)
                const paymentMethod = 'manual'; // Default to manual for longer timeout
                window.VendorErrorHandler.showPaymentTimeoutMessage(
                    paymentMethod,
                    () => {
                        // Continue waiting - extend timeout
                        console.log('[Payment Poller] User chose to continue waiting');
                        this.attempts = 0; // Reset attempts
                        this.poll(); // Resume polling
                    },
                    () => {
                        // Contact support
                        window.VendorErrorHandler.showContactSupportInfo();
                    }
                );
            }
            
            // Handle timeout for both APIs
            if (this.onError) {
                // New API
                this.onError({
                    code: 'TIMEOUT',
                    message: 'Payment confirmation timeout. Please contact support if payment was sent.'
                });
            } else if (this.onStatusChange) {
                // Legacy API
                this.onStatusChange({
                    status: 'TIMEOUT',
                    message: 'Payment verification timed out. Please check your M-Pesa messages.',
                    paymentIntentId: this.paymentIntentId
                });
            }
            return;
        }
        
        try {
            const statusData = await this.checkPaymentStatus();
            
            // Legacy API: Notify status change callback
            if (this.onStatusChange) {
                this.onStatusChange(statusData);
            }
            
            // Handle terminal statuses
            if (statusData.status === 'CONFIRMED') {
                console.log('[Payment Poller] Payment confirmed!');
                this.stop();
                
                if (this.onSuccess) {
                    // New API
                    this.onSuccess(statusData);
                } else if (this.onStatusChange) {
                    // Legacy API already notified via onStatusChange above
                    // No additional action needed
                }
                return;
            } else if (statusData.status === 'FAILED' || statusData.status === 'EXPIRED') {
                console.log(`[Payment Poller] Payment ${statusData.status.toLowerCase()}`);
                this.stop();
                
                if (this.onError) {
                    // New API
                    this.onError({
                        code: statusData.status,
                        message: statusData.message || `Payment ${statusData.status.toLowerCase()}`
                    });
                } else if (this.onStatusChange) {
                    // Legacy API already notified via onStatusChange above
                    // No additional action needed
                }
                return;
            }
            
            // Schedule next poll with exponential backoff
            const nextInterval = this.getNextInterval();
            console.log(`[Payment Poller] Attempt ${this.attempts}/${this.maxAttempts}, status: ${statusData.status}, next check in ${nextInterval}ms`);
            
            this.intervalId = setTimeout(() => this.poll(), nextInterval);
            
        } catch (error) {
            console.error('[Payment Poller] Poll error:', error);
            
            // Notify error but continue polling
            if (this.onStatusChange) {
                // Legacy API
                this.onStatusChange({
                    status: 'ERROR',
                    message: 'Error checking payment status. Retrying...',
                    error: error.message
                });
            }
            
            // Schedule next poll
            const nextInterval = this.getNextInterval();
            this.intervalId = setTimeout(() => this.poll(), nextInterval);
        }
    }
    
    /**
     * Stop polling and clear timers
     */
    stop() {
        if (this.intervalId) {
            clearTimeout(this.intervalId);
            this.intervalId = null;
        }
        
        console.log('[Payment Poller] Polling stopped');
    }
    
    /**
     * Legacy API compatibility: alias for stop()
     */
    stopPolling() {
        this.stop();
    }
}

// Export for use in other files
window.PaymentStatusPoller = PaymentStatusPoller;

console.log('✅ PaymentStatusPoller class loaded');
