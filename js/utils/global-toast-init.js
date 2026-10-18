/**
 * Global Toast Initialization
 * Automatically replaces window.alert with toast notifications
 * and provides global toast utility
 */

(function() {
    'use strict';
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initGlobalToast);
    } else {
        initGlobalToast();
    }
    
    function initGlobalToast() {
        // Initialize toast if not already initialized
        if (!window.toast) {
            console.warn('[Global Toast] Toast not initialized. Loading toast.js...');
            return;
        }
        
        // Store original alert for emergency fallback
        window._originalAlert = window.alert;
        
        // Replace alert with toast (with option to use original)
        window.alert = function(message) {
            // Check if message contains critical keywords that need full attention
            const criticalKeywords = ['critical', 'fatal', 'system error', 'database', 'authentication failed'];
            const isCritical = criticalKeywords.some(keyword => 
                message.toLowerCase().includes(keyword)
            );
            
            if (isCritical) {
                // Use original alert for critical messages
                window._originalAlert(message);
            } else {
                // Use toast for regular alerts
                // Detect message type from content
                const lowerMsg = message.toLowerCase();
                
                if (lowerMsg.includes('success') || lowerMsg.includes('🎉') || lowerMsg.includes('✓')) {
                    toast.success(message);
                } else if (lowerMsg.includes('warning') || lowerMsg.includes('⚠') || lowerMsg.includes('caution')) {
                    toast.warning(message);
                } else if (lowerMsg.includes('error') || lowerMsg.includes('❌') || lowerMsg.includes('failed') || lowerMsg.includes('invalid')) {
                    toast.error(message);
                } else {
                    toast.info(message);
                }
            }
        };
        
        // Add convenience method to show original alert if needed
        window.showCriticalAlert = function(message) {
            window._originalAlert(message);
        };
        
        console.log('[Global Toast] ✅ Alert replacement active. Use showCriticalAlert() for native alerts.');
    }
})();
