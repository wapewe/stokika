// VENDOR MODAL FIX - Standalone version without dependencies
(function() {
    'use strict';
    
    console.log('🔧 Loading vendor modal fix...');
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initVendorModal);
    } else {
        initVendorModal();
    }
