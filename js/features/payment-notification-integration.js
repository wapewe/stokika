/**
 * Payment Notification Integration
 * Integrates notification handler with existing payment flows
 * Connects to timeout-monitor, status-query, and manual-payment-verify functions
 */

(function() {
    'use strict';

    // Wait for DOM and dependencies to load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeNotifications);
    } else {
        initializeNotifications();
    }

    function initializeNotifications() {
        // Ensure Supabase is available
        if (typeof supabase === 'undefined' && typeof window.supabase === 'undefined') {
            console.warn('[Notifications] Supabase not loaded, retrying...');
            setTimeout(initializeNotifications, 500);
            return;
        }

        const supabaseClient = window.supabase || supabase;
        
        // Initialize global notification handler
        window.paymentNotificationHandler = new PaymentNotificationHandler(supabaseClient);

        console.log('[Notifications] Payment notification system initialized');

        // Hook into existing payment status updates
        setupPaymentStatusListeners();
        
        // Hook into payment completion events
        setupPaymentCompletionListeners();
    }

    /**
     * Listen for payment status changes and trigger appropriate notifications
     */
    function setupPaymentStatusListeners() {
        // Listen for timeout detection
        document.addEventListener('paymentTimeout', async (event) => {
            const { paymentId, transactionId } = event.detail;
            console.log('[Notifications] Timeout detected for payment:', paymentId);
            
            if (window.paymentNotificationHandler && paymentId) {
                await window.paymentNotificationHandler.sendNotification('timeout_detected', {
                    transaction_id: transactionId
                });
            }
        });

        // Listen for status query retries
        document.addEventListener('statusQueryRetry', async (event) => {
            const { paymentId, attempt, maxAttempts } = event.detail;
            console.log(`[Notifications] Status query retry ${attempt}/${maxAttempts}`);
            
            // Show UI message for retry
            if (typeof showToast === 'function') {
                showToast(`Checking payment status... (Attempt ${attempt}/${maxAttempts})`, 'info');
            }
        });

        // Listen for manual fallback
        document.addEventListener('manualPaymentFallback', async (event) => {
            const { paymentId, amount, accountNumber, transactionId } = event.detail;
            console.log('[Notifications] Manual payment fallback triggered');
            
            if (window.paymentNotificationHandler && paymentId) {
                await window.paymentNotificationHandler.sendNotification('manual_payment_instructions', {
                    transaction_id: transactionId,
                    amount: amount,
                    account_number: accountNumber
                });
            }
        });
    }

    /**
     * Listen for payment completion and approval events
     */
    function setupPaymentCompletionListeners() {
        // Listen for successful payment
        document.addEventListener('paymentCompleted', async (event) => {
            const { paymentId, transactionId, amount } = event.detail;
            console.log('[Notifications] Payment completed:', paymentId);
            
            if (window.paymentNotificationHandler && paymentId) {
                await window.paymentNotificationHandler.sendNotification('payment_completed', {
                    transaction_id: transactionId,
                    amount: amount
                });
            }
        });

        // Listen for manual payment approval
        document.addEventListener('manualPaymentApproved', async (event) => {
            const { paymentId, transactionId, amount } = event.detail;
            console.log('[Notifications] Manual payment approved:', paymentId);
            
            if (window.paymentNotificationHandler && paymentId) {
                await window.paymentNotificationHandler.sendNotification('manual_payment_approved', {
                    transaction_id: transactionId,
                    amount: amount
                });
            }
        });

        // Listen for manual payment rejection
        document.addEventListener('manualPaymentRejected', async (event) => {
            const { paymentId, transactionId, rejectionReason } = event.detail;
            console.log('[Notifications] Manual payment rejected:', paymentId);
            
            if (window.paymentNotificationHandler && paymentId) {
                await window.paymentNotificationHandler.sendNotification('manual_payment_rejected', {
                    transaction_id: transactionId,
                    rejection_reason: rejectionReason
                });
            }
        });
    }

    /**
     * Helper: Initialize notifications for a specific payment
     */
    window.initializePaymentNotifications = function(paymentId) {
        if (!window.paymentNotificationHandler) {
            console.warn('[Notifications] Handler not initialized yet');
            return;
        }

        window.paymentNotificationHandler.initialize(paymentId);
        console.log('[Notifications] Initialized for payment:', paymentId);
    };

    /**
     * Helper: Send custom notification
     */
    window.sendPaymentNotification = async function(paymentId, notificationType, data = {}) {
        if (!window.paymentNotificationHandler) {
            console.error('[Notifications] Handler not available');
            return { success: false, error: 'Handler not initialized' };
        }

        // Temporarily set payment ID
        const originalPaymentId = window.paymentNotificationHandler.paymentId;
        window.paymentNotificationHandler.paymentId = paymentId;
        
        const result = await window.paymentNotificationHandler.sendNotification(notificationType, data);
        
        // Restore original payment ID
        window.paymentNotificationHandler.paymentId = originalPaymentId;
        
        return result;
    };

})();
