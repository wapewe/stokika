/**
 * Get Started Modal Handler
 * Connects Get Started modal to Vendor Registration
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Get Started Modal: Initializing...');
    
    const getStartedModal = document.getElementById('getStartedModal');
    const vendorRegistrationModal = document.getElementById('vendorRegistrationModal');
    const modalClose = document.getElementById('modalClose');
    
    // Open Get Started Modal
    function openGetStartedModal() {
        if (getStartedModal) {
            getStartedModal.classList.add('active');
            document.body.style.overflow = 'hidden';
            console.log('✅ Get Started Modal opened');
        }
    }
    
    // Close Get Started Modal
    function closeGetStartedModal() {
        if (getStartedModal) {
            getStartedModal.classList.remove('active');
            document.body.style.overflow = '';
            console.log('✅ Get Started Modal closed');
        }
    }
    
    // Attach to all Get Started buttons
    const getStartedButtons = document.querySelectorAll('.get-started-btn, a[href*="get-started"], button[data-action="get-started"]');
    console.log(`🔍 Found ${getStartedButtons.length} Get Started buttons`);
    
    getStartedButtons.forEach((button, index) => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log(`✨ Get Started button ${index + 1} clicked`);
            openGetStartedModal();
        }, true);
    });
    
    // Handle "Register as Vendor" button click
    const registerVendorBtn = document.querySelector('.btn-modal.vendor .register-btn');
    if (registerVendorBtn) {
        registerVendorBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🏪 Register as Vendor clicked');
            
            // Close Get Started modal
            closeGetStartedModal();
            
            // Open Vendor Registration modal
            setTimeout(() => {
                if (window.vendorModalDebug && window.vendorModalDebug.open) {
                    window.vendorModalDebug.open();
                } else {
                    console.warn('⚠️ Vendor modal debug not available');
                }
            }, 300);
        });
        console.log('✅ Register as Vendor button handler attached');
    }
    
    // Handle "Register as Supplier" button click
    const registerSupplierBtn = document.querySelector('.btn-modal.supplier .register-btn');
    if (registerSupplierBtn) {
        registerSupplierBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🚚 Register as Supplier clicked');
            alert('Supplier registration coming soon!');
        });
        console.log('✅ Register as Supplier button handler attached');
    }
    
    // Close modal button
    if (modalClose) {
        modalClose.addEventListener('click', (e) => {
            e.preventDefault();
            closeGetStartedModal();
        });
        console.log('✅ Modal close button handler attached');
    }
    
    // Close on overlay click
    if (getStartedModal) {
        getStartedModal.addEventListener('click', (e) => {
            if (e.target === getStartedModal) {
                closeGetStartedModal();
            }
        });
        console.log('✅ Overlay click handler attached');
    }
    
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (getStartedModal && getStartedModal.classList.contains('active')) {
                closeGetStartedModal();
            }
        }
    });
    
    // Make functions globally available for debugging
    window.getStartedModalDebug = {
        open: openGetStartedModal,
        close: closeGetStartedModal
    };
    
    console.log('✅ Get Started Modal: Initialized successfully');
});