/**
 * Payment Method Selector
 * Handles switching between STK Push and Manual Paybill payment methods
 * Updates UI and manages payment interfaces
 */

(function() {
    'use strict';
    
    console.log('🔧 Loading Payment Method Selector...');
    
    // Initialize when DOM is ready
    function initPaymentMethodSelector() {
        console.log('🚀 Initializing Payment Method Selector');
        
        // Get payment method radio buttons
        const paymentMethodRadios = document.querySelectorAll('.payment-method input[type="radio"]');
        
        if (paymentMethodRadios.length === 0) {
            console.warn('⚠️ Payment method radios not found');
            return;
        }
        
        // Add event listeners to payment method radios
        paymentMethodRadios.forEach(radio => {
            radio.addEventListener('change', handlePaymentMethodChange);
        });
        
        // Setup copy buttons
        setupCopyButtons();
        
        // Add listener to ID number field to update account displays when it changes
        const idNumberInput = document.getElementById('idNumber');
        if (idNumberInput) {
            idNumberInput.addEventListener('input', () => {
                // Only update if manual payment is currently selected
                const selectedMethod = getSelectedPaymentMethod();
                if (selectedMethod === 'manual') {
                    updateAccountNumberDisplays();
                }
            });
            console.log('✅ ID number input listener added');
        }
        
        // Initialize default payment method state
        const selectedMethod = getSelectedPaymentMethod();
        console.log(`📍 Default payment method: ${selectedMethod}`);
        
        // Ensure interfaces are in correct state
        const stkInterface = document.getElementById('stkPushInterface');
        const manualInterface = document.getElementById('manualPaymentInterface');
        const mpesaPhone = document.getElementById('mpesaPhone');
        
        if (selectedMethod === 'stkpush') {
            if (stkInterface) {
                stkInterface.classList.remove('hidden');
                stkInterface.classList.add('active');
            }
            if (manualInterface) {
                manualInterface.classList.add('hidden');
                manualInterface.classList.remove('active');
            }
            if (mpesaPhone) {
                mpesaPhone.required = true;
            }
        } else if (selectedMethod === 'manual') {
            if (stkInterface) {
                stkInterface.classList.add('hidden');
                stkInterface.classList.remove('active');
            }
            if (manualInterface) {
                manualInterface.classList.remove('hidden');
                manualInterface.classList.add('active');
            }
            if (mpesaPhone) {
                mpesaPhone.required = false;
            }
            updateAccountNumberDisplays();
        }
        
        console.log('✅ Payment Method Selector initialized');
    }
    
    /**
     * Handle payment method change
     */
    function handlePaymentMethodChange(event) {
        const selectedMethod = event.target.value;
        console.log(`📋 Payment method changed to: ${selectedMethod}`);
        
        // Update visual selection
        document.querySelectorAll('.payment-method').forEach(method => {
            method.classList.remove('active');
        });
        event.target.closest('.payment-method').classList.add('active');
        
        // Show/hide payment interfaces
        const stkInterface = document.getElementById('stkPushInterface');
        const manualInterface = document.getElementById('manualPaymentInterface');
        
        if (selectedMethod === 'stkpush') {
            stkInterface.classList.remove('hidden');
            stkInterface.classList.add('active');
            manualInterface.classList.add('hidden');
            manualInterface.classList.remove('active');
            
            // Make M-Pesa phone required
            const mpesaPhone = document.getElementById('mpesaPhone');
            if (mpesaPhone) {
                mpesaPhone.required = true;
            }
        } else if (selectedMethod === 'manual') {
            stkInterface.classList.add('hidden');
            stkInterface.classList.remove('active');
            manualInterface.classList.remove('hidden');
            manualInterface.classList.add('active');
            
            // Make M-Pesa phone optional
            const mpesaPhone = document.getElementById('mpesaPhone');
            if (mpesaPhone) {
                mpesaPhone.required = false;
            }
            
            // Update account number displays with ID number
            updateAccountNumberDisplays();
        }
    }
    
    /**
     * Update account number displays with vendor's ID number
     */
    function updateAccountNumberDisplays() {
        const idNumberInput = document.getElementById('idNumber');
        
        if (!idNumberInput) {
            console.warn('⚠️ ID Number input field not found');
            return;
        }
        
        const idNumber = idNumberInput.value ? idNumberInput.value.trim() : '';
        
        // Update both display elements
        const accountNumberDisplay = document.getElementById('accountNumberDisplay');
        const accountNumberStep = document.getElementById('accountNumberStep');
        
        if (accountNumberDisplay) {
            // Display ID number or placeholder
            accountNumberDisplay.textContent = idNumber || '[Your ID Number]';
            
            // Update copy button data attribute
            const copyBtn = accountNumberDisplay.nextElementSibling;
            if (copyBtn && copyBtn.classList.contains('btn-copy')) {
                if (idNumber) {
                    copyBtn.setAttribute('data-copy', idNumber);
                    copyBtn.disabled = false;
                } else {
                    copyBtn.removeAttribute('data-copy');
                    copyBtn.disabled = true;
                }
            }
        }
        
        if (accountNumberStep) {
            // Display ID number or placeholder in step-by-step instructions
            accountNumberStep.textContent = idNumber || '[Your ID Number]';
        }
        
        if (idNumber) {
            console.log(`📝 Account number displays updated with ID: ${idNumber}`);
        } else {
            console.warn('⚠️ ID Number is empty - displaying placeholder');
        }
    }
    
    /**
     * Setup copy to clipboard buttons
     */
    function setupCopyButtons() {
        const copyButtons = document.querySelectorAll('.btn-copy');
        
        copyButtons.forEach(btn => {
            btn.addEventListener('click', handleCopyClick);
        });
        
        console.log(`✅ Setup ${copyButtons.length} copy buttons`);
    }
    
    /**
     * Handle copy button click
     */
    function handleCopyClick(event) {
        event.preventDefault();
        event.stopPropagation();
        
        const button = event.currentTarget;
        
        // Get value to copy
        let valueToCopy = button.getAttribute('data-copy');
        
        if (!valueToCopy) {
            // Try to get from data-copy-id attribute
            const copyId = button.getAttribute('data-copy-id');
            if (copyId) {
                const targetElement = document.getElementById(copyId);
                if (targetElement) {
                    valueToCopy = targetElement.textContent.trim();
                }
            }
        }
        
        if (!valueToCopy) {
            console.error('❌ No value to copy');
            return;
        }
        
        // Copy to clipboard
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(valueToCopy)
                .then(() => {
                    showCopyFeedback(button);
                    console.log(`📋 Copied to clipboard: ${valueToCopy}`);
                })
                .catch(err => {
                    console.error('❌ Failed to copy:', err);
                    fallbackCopy(valueToCopy, button);
                });
        } else {
            // Fallback for older browsers
            fallbackCopy(valueToCopy, button);
        }
    }
    
    /**
     * Fallback copy method for older browsers
     */
    function fallbackCopy(text, button) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                showCopyFeedback(button);
                console.log(`📋 Copied (fallback): ${text}`);
            }
        } catch (err) {
            console.error('❌ Fallback copy failed:', err);
        }
        
        document.body.removeChild(textarea);
    }
    
    /**
     * Show visual feedback when text is copied
     */
    function showCopyFeedback(button) {
        const originalContent = button.innerHTML;
        button.innerHTML = '✓';
        button.style.background = '#00A651';
        button.style.color = 'white';
        
        setTimeout(() => {
            button.innerHTML = originalContent;
            button.style.background = '';
            button.style.color = '';
        }, 2000);
    }
    
    /**
     * Get selected payment method
     */
    function getSelectedPaymentMethod() {
        const selectedRadio = document.querySelector('.payment-method input[type="radio"]:checked');
        return selectedRadio ? selectedRadio.value : 'stkpush';
    }
    
    // Export functions to window for external access
    window.PaymentMethodSelector = {
        init: initPaymentMethodSelector,
        getSelectedMethod: getSelectedPaymentMethod,
        updateAccountNumbers: updateAccountNumberDisplays
    };
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPaymentMethodSelector);
    } else {
        initPaymentMethodSelector();
    }
    
    console.log('✅ Payment Method Selector script loaded');
    
})();
