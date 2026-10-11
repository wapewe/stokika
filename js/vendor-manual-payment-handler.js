/**
 * Vendor Manual Payment Handler
 * Integrates payment status polling with manual paybill payment flow
 * 
 * Requirements: 4.2, 4.7 (from tasks.md: "Integrate polling with manual payment flow")
 */

(function() {
    'use strict';
    
    console.log('🔧 Loading Vendor Manual Payment Handler...');
    
    // State management
    let paymentIntentId = null;
    let paymentPoller = null;
    let paymentService = null;
    
    /**
     * Initialize manual payment handler
     */
    function initManualPaymentHandler() {
        console.log('🚀 Initializing Manual Payment Handler');
        
        // Get the "I Have Paid" button
        const confirmButton = document.getElementById('confirmManualPayment');
        
        if (!confirmButton) {
            console.warn('⚠️ Manual payment confirmation button not found');
            return;
        }
        
        // Add click event listener
        confirmButton.addEventListener('click', handleManualPaymentConfirmation);
        
        console.log('✅ Manual Payment Handler initialized');
    }
    
    /**
     * Handle "I Have Paid" button click
     */
    async function handleManualPaymentConfirmation(event) {
        event.preventDefault();
        
        console.log('📝 User clicked "I Have Paid"');
        
        // Validate ID number is present
        const idNumberInput = document.getElementById('idNumber');
        if (!idNumberInput || !idNumberInput.value.trim()) {
            showError('ID Number is required. Please go back to Step 1 and enter your ID number.');
            return;
        }
        
        const idNumber = idNumberInput.value.trim();
        
        // Validate ID number format
        if (!/^[0-9]{8}$/.test(idNumber)) {
            showError('Invalid ID Number format. Please ensure you entered exactly 8 digits.');
            return;
        }
        
        try {
            // Disable the button to prevent double-clicks
            const confirmButton = document.getElementById('confirmManualPayment');
            confirmButton.disabled = true;
            confirmButton.textContent = 'Checking Payment...';
            
            // Show payment status UI
            showPaymentStatus();
            
            // Create payment intent for manual payment
            await createManualPaymentIntent(idNumber);
            
            // Start polling for payment confirmation
            startPaymentPolling();
            
        } catch (error) {
            console.error('❌ Error handling manual payment confirmation:', error);
            showError(error.message || 'Failed to start payment verification. Please try again.');
            
            // Re-enable button
            const confirmButton = document.getElementById('confirmManualPayment');
            confirmButton.disabled = false;
            confirmButton.textContent = 'I Have Paid';
            
            hidePaymentStatus();
        }
    }
    
    /**
     * Create payment intent for manual payment
     * Reuses the RegistrationPaymentService but with manual payment method
     */
    async function createManualPaymentIntent(idNumber) {
        console.log('💳 Creating manual payment intent...');
        
        // Initialize payment service if not already done
        if (!paymentService) {
            if (!window.RegistrationPaymentService) {
                throw new Error('Payment service not available. Please refresh the page.');
            }
            const supabaseUrl = window.SUPABASE_URL || window.SUPABASE_CONFIG?.url || 'https://eidsqrnwfndruuufyacc.supabase.co';
            const anonKey = window.SUPABASE_ANON_KEY || window.SUPABASE_CONFIG?.anonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpZHNxcm53Zm5kcnV1dWZ5YWNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3MzcxMTEsImV4cCI6MjEwMzMxMzExMX0.FTeFHJwnw1iT4AIknJUSNWyM221x4U-VkfTCdCsKOEY';
            const client = window._supabaseClient || (window.supabase?.createClient ? window.supabase.createClient(supabaseUrl, anonKey) : window.supabase);
            paymentService = new window.RegistrationPaymentService(client);
        }
        
        // Get form data from vendor registration form
        const formData = collectFormData();
        
        if (!formData) {
            throw new Error('Registration data not found. Please complete all previous steps.');
        }
        
        // Validate with server first
        console.log('🔍 Validating registration data...');
        updateStatusMessage('Validating registration data...');
        
        const validation = await paymentService.validateServerSide(formData);
        
        if (!validation.valid) {
            throw new Error(validation.errors?.[0]?.message || 'Validation failed');
        }
        
        console.log('✅ Validation successful');
        updateStatusMessage('Creating payment intent...');
        
        // Create payment intent with manual method
        // Note: We need to modify the create payment call to support manual payment
        // For now, we'll create the intent and assume the user has already paid
        const supabaseUrl = window.SUPABASE_URL || window.SUPABASE_CONFIG?.url || 'https://eidsqrnwfndruuufyacc.supabase.co';
        let token = null;
        try {
            if (window.supabase?.auth) {
                const session = await window.supabase.auth.getSession();
                token = session?.data?.session?.access_token;
            }
        } catch (_) {}
        
        if (!token) {
            token = window.SUPABASE_ANON_KEY || window.SUPABASE_CONFIG?.anonKey;
        }
        
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
                validationToken: paymentService.validationToken,
                phoneNumber: '', // Not required for manual payment
                paymentMethod: 'manual' // Specify manual payment method
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to create payment intent');
        }
        
        paymentIntentId = data.paymentIntentId;
        console.log(`✅ Payment intent created: ${paymentIntentId}`);
        
        return data;
    }
    
    /**
     * Start polling for payment status
     */
    function startPaymentPolling() {
        if (!paymentIntentId) {
            throw new Error('Payment intent ID not set');
        }
        
        console.log('🔄 Starting payment status polling...');
        updateStatusMessage('Waiting for payment confirmation...');
        updateStatusDetail('Checking M-Pesa for your payment...');
        
        // Create poller instance
        if (!window.PaymentStatusPoller) {
            throw new Error('Payment poller not available. Please refresh the page.');
        }
        
        const supabaseUrl = window.SUPABASE_URL || window.SUPABASE_CONFIG?.url || 'https://eidsqrnwfndruuufyacc.supabase.co';
        const anonKey = window.SUPABASE_ANON_KEY || window.SUPABASE_CONFIG?.anonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpZHNxcm53Zm5kcnV1dWZ5YWNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3MzcxMTEsImV4cCI6MjEwMzMxMzExMX0.FTeFHJwnw1iT4AIknJUSNWyM221x4U-VkfTCdCsKOEY';
        const client = window._supabaseClient || (window.supabase?.createClient ? window.supabase.createClient(supabaseUrl, anonKey) : window.supabase);
        paymentPoller = new window.PaymentStatusPoller(paymentIntentId, client);
        
        // Start polling with legacy callback API (single callback)
        paymentPoller.startPolling((statusData) => {
            console.log('📊 Payment status update:', statusData);
            
            // Update UI with status
            if (statusData.status) {
                updateStatusMessage(`Payment status: ${statusData.status}`);
            }
            
            // Handle terminal statuses
            if (statusData.status === 'CONFIRMED') {
                handlePaymentSuccess(statusData);
            } else if (statusData.status === 'FAILED' || statusData.status === 'EXPIRED') {
                handlePaymentError({
                    code: statusData.status,
                    message: statusData.message || `Payment ${statusData.status.toLowerCase()}`
                });
            } else if (statusData.status === 'TIMEOUT') {
                handlePaymentError({
                    code: 'TIMEOUT',
                    message: statusData.message || 'Payment confirmation timeout'
                });
            } else if (statusData.status === 'ERROR') {
                // Non-terminal error, just update UI
                updateStatusDetail(statusData.message || 'Checking payment status...');
            }
        });
    }
    
    /**
     * Handle successful payment confirmation
     */
    function handlePaymentSuccess(data) {
        console.log('🎉 Payment confirmed successfully');
        
        updateStatusMessage('Payment confirmed!');
        updateStatusDetail('Your account is being activated...');
        
        // Show success message
        showSuccess('Payment received! Your vendor account is being created...');
        
        // Redirect to success page after a short delay
        setTimeout(() => {
            window.location.href = 'registration-success.html';
        }, 2000);
    }
    
    /**
     * Handle payment error or timeout
     */
    function handlePaymentError(error) {
        console.error('❌ Payment confirmation failed:', error);
        
        if (error.code === 'TIMEOUT') {
            // Show extended wait message for timeout
            updateStatusMessage('Payment verification taking longer than expected');
            updateStatusDetail(
                'If you sent the payment, your account will be activated once we receive it. ' +
                'You will receive an SMS confirmation. You can safely close this page.'
            );
            
            showWarning(
                'Payment confirmation is taking longer than expected. ' +
                'If you completed the payment, your account will be activated shortly. ' +
                'Check your email for confirmation or contact support if needed.'
            );
            
            // Update button text
            const confirmButton = document.getElementById('confirmManualPayment');
            confirmButton.textContent = 'Continue Waiting';
            confirmButton.disabled = false;
            
        } else {
            // Show error message
            updateStatusMessage('Payment verification failed');
            updateStatusDetail(error.message || 'An error occurred while checking payment status');
            
            showError(
                error.message || 
                'Failed to verify payment. Please ensure you used the correct account number (your ID number) and try again.'
            );
            
            // Re-enable button
            const confirmButton = document.getElementById('confirmManualPayment');
            confirmButton.textContent = 'Try Again';
            confirmButton.disabled = false;
        }
    }
    
    /**
     * Collect form data from all registration steps
     */
    function collectFormData() {
        // This function should collect all form data from Steps 1-4
        // Reuse existing form data collection logic from vendor-registration-validation.js
        
        try {
            const formData = {
                // Step 1: Personal Information
                fullName: document.getElementById('fullName')?.value?.trim() || '',
                email: document.getElementById('email')?.value?.trim() || '',
                phone: document.getElementById('phone')?.value?.trim() || '',
                idNumber: document.getElementById('idNumber')?.value?.trim() || '',
                county: document.getElementById('county')?.value || '',
                
                // Step 2: Business Information
                businessName: document.getElementById('businessName')?.value?.trim() || '',
                businessCategory: document.getElementById('businessCategory')?.value || '',
                businessStatus: document.getElementById('businessStatus')?.value || '',
                businessSize: document.getElementById('businessSize')?.value || '',
                
                // Step 3: Business Operations
                businessModel: document.getElementById('businessModel')?.value || '',
                yearsInOperation: document.getElementById('yearsInOperation')?.value || '',
                monthlyRevenue: document.getElementById('monthlyRevenue')?.value || '',
                
                // Step 4: Stock Information
                stockCategories: Array.from(document.querySelectorAll('input[name="stockCategories"]:checked'))
                    .map(cb => cb.value).join(','),
                stockValue: document.getElementById('stockValue')?.value || '',
                repaymentPeriod: document.getElementById('repaymentPeriod')?.value || ''
            };
            
            return formData;
        } catch (error) {
            console.error('❌ Error collecting form data:', error);
            return null;
        }
    }
    
    /**
     * Show payment status UI
     */
    function showPaymentStatus() {
        const statusContainer = document.getElementById('manualPaymentStatus');
        if (statusContainer) {
            statusContainer.style.display = 'block';
        }
    }
    
    /**
     * Hide payment status UI
     */
    function hidePaymentStatus() {
        const statusContainer = document.getElementById('manualPaymentStatus');
        if (statusContainer) {
            statusContainer.style.display = 'none';
        }
    }
    
    /**
     * Update status message in UI
     */
    function updateStatusMessage(message) {
        const statusMessage = document.getElementById('manualPaymentMessage');
        if (statusMessage) {
            statusMessage.textContent = message;
        }
    }
    
    /**
     * Update status detail in UI
     */
    function updateStatusDetail(detail) {
        const statusDetail = document.getElementById('manualPaymentDetail');
        if (statusDetail) {
            statusDetail.textContent = detail;
        }
    }
    
    /**
     * Show error message
     */
    function showError(message) {
        // Use existing notification system if available
        if (window.showNotification) {
            window.showNotification(message, 'error');
        } else {
            alert(message);
        }
    }
    
    /**
     * Show success message
     */
    function showSuccess(message) {
        if (window.showNotification) {
            window.showNotification(message, 'success');
        } else {
            alert(message);
        }
    }
    
    /**
     * Show warning message
     */
    function showWarning(message) {
        if (window.showNotification) {
            window.showNotification(message, 'warning');
        } else {
            alert(message);
        }
    }
    
    /**
     * Stop polling and cleanup
     */
    function cleanup() {
        if (paymentPoller) {
            paymentPoller.stop();
            paymentPoller = null;
        }
    }
    
    // Export functions to window for external access
    window.ManualPaymentHandler = {
        init: initManualPaymentHandler,
        startPolling: startPaymentPolling,
        cleanup: cleanup
    };
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initManualPaymentHandler);
    } else {
        initManualPaymentHandler();
    }
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', cleanup);
    
    console.log('✅ Vendor Manual Payment Handler script loaded');
    
})();
