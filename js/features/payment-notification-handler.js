/**
 * Payment Notification Handler
 * Handles real-time payment notifications in the UI
 * Integrates with timeout handling system
 */

class PaymentNotificationHandler {
    constructor(supabase) {
        this.supabase = supabase;
        this.activeNotifications = new Map();
        this.realtimeChannel = null;
    }

    /**
     * Initialize notification system for a payment
     */
    async initialize(paymentId) {
        if (!paymentId) {
            console.error('Payment ID required for notification handler');
            return;
        }

        this.paymentId = paymentId;
        
        // Subscribe to realtime notifications
        this.subscribeToNotifications(paymentId);
        
        // Check for any existing notifications
        await this.checkExistingNotifications(paymentId);
    }

    /**
     * Subscribe to realtime notification updates
     */
    subscribeToNotifications(paymentId) {
        this.realtimeChannel = this.supabase
            .channel(`payment-notifications-${paymentId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'payment_notifications',
                    filter: `payment_id=eq.${paymentId}`
                },
                (payload) => {
                    console.log('New notification received:', payload.new);
                    this.handleNotification(payload.new);
                }
            )
            .subscribe();
    }

    /**
     * Check for existing notifications
     */
    async checkExistingNotifications(paymentId) {
        try {
            const { data, error } = await this.supabase
                .from('payment_notifications')
                .select('*')
                .eq('payment_id', paymentId)
                .order('sent_at', { ascending: false })
                .limit(5);

            if (error) throw error;

            if (data && data.length > 0) {
                // Show most recent unshown notification
                const latestNotification = data[0];
                if (!this.activeNotifications.has(latestNotification.id)) {
                    this.handleNotification(latestNotification);
                }
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    }

    /**
     * Handle incoming notification
     */
    handleNotification(notification) {
        // Prevent duplicate notifications
        if (this.activeNotifications.has(notification.id)) {
            return;
        }

        this.activeNotifications.set(notification.id, notification);

        // Determine notification type and styling
        let type = 'info';
        let duration = 5000;

        switch (notification.notification_type) {
            case 'timeout_detected':
                type = 'warning';
                duration = 8000;
                break;
            case 'payment_completed':
                type = 'success';
                duration = 10000;
                break;
            case 'manual_payment_instructions':
                type = 'info';
                duration = 15000;
                break;
            case 'manual_payment_approved':
                type = 'success';
                duration = 10000;
                break;
            case 'manual_payment_rejected':
                type = 'error';
                duration = 12000;
                break;
            case 'status_query_retry':
                type = 'info';
                duration = 6000;
                break;
        }

        // Show notification using existing toast system
        this.showToast(notification.ui_message, type, duration);

        // Emit custom event for other components
        document.dispatchEvent(new CustomEvent('paymentNotification', {
            detail: {
                notification_type: notification.notification_type,
                message: notification.ui_message,
                payment_id: notification.payment_id,
                timestamp: notification.sent_at
            }
        }));

        // Clean up old notifications after showing
        setTimeout(() => {
            this.activeNotifications.delete(notification.id);
        }, duration + 1000);
    }

    /**
     * Show toast notification (uses existing toast system)
     */
    showToast(message, type = 'info', duration = 5000) {
        // Use existing toast system if available
        if (typeof showToast === 'function') {
            showToast(message, type);
            return;
        }

        // Fallback: create simple toast
        const toast = document.createElement('div');
        toast.className = `payment-notification payment-notification-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            max-width: 400px;
            padding: 16px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-size: 14px;
            line-height: 1.5;
            z-index: 10000;
            animation: slideInRight 0.3s ease-out;
            background: ${this.getToastColor(type)};
            color: white;
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    /**
     * Get toast background color based on type
     */
    getToastColor(type) {
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        return colors[type] || colors.info;
    }

    /**
     * Manually send notification
     */
    async sendNotification(notificationType, additionalData = {}) {
        try {
            const response = await fetch(
                `${this.supabase.supabaseUrl}/functions/v1/send-payment-notification`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.supabase.supabaseKey}`
                    },
                    body: JSON.stringify({
                        payment_id: this.paymentId,
                        notification_type: notificationType,
                        ...additionalData
                    })
                }
            );

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error sending notification:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Cleanup subscriptions
     */
    destroy() {
        if (this.realtimeChannel) {
            this.supabase.removeChannel(this.realtimeChannel);
            this.realtimeChannel = null;
        }
        this.activeNotifications.clear();
    }
}

// Add CSS for notification animations
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }

    .payment-notification {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .payment-notification strong {
        font-weight: 600;
        display: block;
        margin-bottom: 4px;
    }

    @media (max-width: 640px) {
        .payment-notification {
            top: 10px !important;
            right: 10px !important;
            left: 10px !important;
            max-width: none !important;
        }
    }
`;
document.head.appendChild(notificationStyles);

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PaymentNotificationHandler;
}