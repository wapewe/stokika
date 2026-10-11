// Offline Form Handler for Vendor/Supplier Onboarding
class OfflineFormHandler {
    constructor() {
        this.setupFormInterceptors();
    }

    setupFormInterceptors() {
        // Intercept vendor registration form
        const vendorForm = document.getElementById('vendorRegistrationForm');
        if (vendorForm) {
            vendorForm.addEventListener('submit', (e) => this.handleVendorSubmit(e));
        }

        // Intercept supplier registration form
        const supplierForm = document.getElementById('supplierRegistrationForm');
        if (supplierForm) {
            supplierForm.addEventListener('submit', (e) => this.handleSupplierSubmit(e));
        }
    }

    async handleVendorSubmit(event) {
        if (!navigator.onLine) {
            event.preventDefault();
            
            try {
                const formData = new FormData(event.target);
                const vendorData = this.extractFormData(formData);
                vendorData.type = 'vendor';
                vendorData.agent_id = localStorage.getItem('vendor_id');
                
                // Validate data
                if (window.OfflineValidator) {
                    const validated = window.OfflineValidator.validateVendorData(vendorData);
                    await window.offlineManager.saveVendorOffline(validated);
                } else {
                    await window.offlineManager.saveVendorOffline(vendorData);
                }
                
                alert('✓ Vendor saved offline!\n\nData will sync automatically when you\'re back online.');
                event.target.reset();
                document.getElementById('vendorRegistrationModal')?.classList.remove('active');
            } catch (error) {
                alert('Validation Error:\n\n' + error.message);
            }
            
            return false;
        }
    }

    async handleSupplierSubmit(event) {
        if (!navigator.onLine) {
            event.preventDefault();
            
            try {
                const formData = new FormData(event.target);
                const supplierData = this.extractFormData(formData);
                supplierData.type = 'supplier';
                supplierData.agent_id = localStorage.getItem('vendor_id');
                
                // Validate data
                if (window.OfflineValidator) {
                    const validated = window.OfflineValidator.validateSupplierData(supplierData);
                    await window.offlineManager.saveSupplierOffline(validated);
                } else {
                    await window.offlineManager.saveSupplierOffline(supplierData);
                }
                
                alert('✓ Supplier saved offline!\n\nData will sync automatically when you\'re back online.');
                event.target.reset();
                document.getElementById('supplierRegistrationModal')?.classList.remove('active');
            } catch (error) {
                alert('Validation Error:\n\n' + error.message);
            }
            
            return false;
        }
    }

    extractFormData(formData) {
        const data = {};
        for (const [key, value] of formData.entries()) {
            if (value instanceof File) {
                // Handle file uploads offline
                this.handleFileOffline(key, value);
            } else {
                // Sanitize input
                data[key] = this.sanitizeInput(value);
            }
        }
        data.created_at = new Date().toISOString();
        data.status = 'pending';
        data.offline_created = true;
        return data;
    }
    
    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        return input
            .trim()
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .substring(0, 1000);
    }

    async handleFileOffline(fieldName, file) {
        // Validate file
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            throw new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF allowed.');
        }
        
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            throw new Error('File too large. Maximum size is 5MB.');
        }
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            await window.offlineManager.savePhoto({
                fieldName,
                fileName: file.name,
                fileType: file.type,
                fileData: e.target.result,
                timestamp: Date.now()
            });
        };
        reader.readAsDataURL(file);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new OfflineFormHandler();
    });
} else {
    new OfflineFormHandler();
}
