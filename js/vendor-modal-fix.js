/**
 * Vendor Registration Modal - Complete Fix v3
 * - Fixed phone validation (supports multiple formats)
 * - BMC step-by-step navigation (all 9 sections)
 * - Form validation
 * - Step 2 dropdowns
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('🔧 Vendor Modal Fix v3: Initializing...');
    
    // Kenya Counties Data
    const kenyaCounties = [
        'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo-Marakwet',
        'Embu', 'Garissa', 'Homa Bay', 'Isiolo', 'Kajiado',
        'Kakamega', 'Kericho', 'Kiambu', 'Kilifi', 'Kirinyaga',
        'Kisii', 'Kisumu', 'Kitui', 'Kwale', 'Laikipia',
        'Lamu', 'Machakos', 'Makueni', 'Mandera', 'Marsabit',
        'Meru', 'Migori', 'Mombasa', 'Muranga', 'Nairobi',
        'Nakuru', 'Nandi', 'Narok', 'Nyamira', 'Nyandarua',
        'Nyeri', 'Samburu', 'Siaya', 'Taita-Taveta', 'Tana River',
        'Tharaka-Nithi', 'Trans Nzoia', 'Turkana', 'Uasin Gishu', 'Vihiga',
        'Wajir', 'West Pokot'
    ];
    
    const businessCategories = [
        'Agriculture & Farming', 'Food & Beverages', 'Fashion & Apparel',
        'Electronics & Technology', 'Home & Furniture', 'Beauty & Personal Care',
        'Health & Wellness', 'Automotive', 'Construction & Hardware',
        'Office Supplies & Stationery', 'Sports & Recreation', 'Books & Education',
        'Toys & Baby Products', 'Crafts & Handmade', 'Services', 'Other (Please specify)'
    ];
    
    const businessStatuses = [
        'Aspiring (Idea stage)', 'Start-up (0-2 years)',
        'Growing (3-5 years)', 'Established (5+ years)'
    ];
    
    const businessSizes = [
        'Solo (Just me)', 'Small (2-10 employees)',
        'Medium (11-50 employees)', 'Large (50+ employees)'
    ];
    
    const businessModels = [
        'Retailer (Sell to end customers)', 'Wholesaler (Sell to other businesses)',
        'Both (Retail & Wholesale)', 'Service Provider', 'Manufacturer', 'Distributor'
    ];
    
    // BMC Sections Data
    const bmcSections = [
        {
            id: 'value-proposition',
            title: 'Value Proposition',
            question: 'What unique value does your business provide to customers?',
            example: 'Example: "Fresh, organic vegetables delivered within 2 hours of harvest"'
        },
        {
            id: 'customer-segments',
            title: 'Customer Segments',
            question: 'Who are your target customers?',
            example: 'Example: "Urban families, restaurants, and health-conscious individuals"'
        },
        {
            id: 'channels',
            title: 'Channels',
            question: 'How do you reach and deliver value to your customers?',
            example: 'Example: "WhatsApp orders, social media marketing, local delivery network"'
        },
        {
            id: 'customer-relationships',
            title: 'Customer Relationships',
            question: 'How do you interact with and retain your customers?',
            example: 'Example: "Personal assistance, loyalty program, regular follow-ups"'
        },
        {
            id: 'revenue-streams',
            title: 'Revenue Streams',
            question: 'How does your business make money?',
            example: 'Example: "Direct sales, subscription boxes, bulk orders"'
        },
        {
            id: 'key-resources',
            title: 'Key Resources',
            question: 'What essential resources does your business need?',
            example: 'Example: "Farm land, delivery vehicles, cold storage, mobile app"'
        },
        {
            id: 'key-activities',
            title: 'Key Activities',
            question: 'What key activities does your business perform?',
            example: 'Example: "Farming, quality control, packaging, delivery, customer service"'
        },
        {
            id: 'key-partnerships',
            title: 'Key Partnerships',
            question: 'Who are your key partners and suppliers?',
            example: 'Example: "Local farmers, logistics companies, packaging suppliers"'
        },
        {
            id: 'cost-structure',
            title: 'Cost Structure',
            question: 'What are your main costs?',
            example: 'Example: "Seeds & fertilizer, labor, fuel, packaging, marketing"'
        }
    ];
    
    let currentBmcSection = 0;
    window.bmcAnswers = {};
    
    // Populate dropdowns
    function populateSelect(id, options, placeholder = 'Select...') {
        const select = document.getElementById(id);
        if (!select) return;
        
        select.innerHTML = `<option value="">${placeholder}</option>`;
        options.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option;
            opt.textContent = option;
            select.appendChild(opt);
        });
    }
    
    function populateCounties() {
        populateSelect('county', kenyaCounties, 'Select county...');
        console.log(`✅ Populated ${kenyaCounties.length} counties`);
    }
    
    function populateBusinessCategories() {
        populateSelect('businessCategory', businessCategories, 'Select category...');
        console.log(`✅ Populated ${businessCategories.length} business categories`);
        
        document.getElementById('businessCategory')?.addEventListener('change', function() {
            const otherField = document.getElementById('otherCategoryField');
            if (this.value === 'Other (Please specify)') {
                otherField?.classList.remove('hidden');
            } else {
                otherField?.classList.add('hidden');
            }
        });
    }
    
    function populateStep2Dropdowns() {
        populateSelect('businessStatus', businessStatuses, 'Select status...');
        populateSelect('businessSize', businessSizes, 'Select size...');
        populateSelect('businessModel', businessModels, 'Select model...');
        console.log('✅ Populated Step 2 dropdowns');
    }
    
    // Phone validation - accept multiple formats
    function setupPhoneValidation() {
        const phoneInput = document.getElementById('phone');
        if (!phoneInput) return;
        
        phoneInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\s/g, '');
            
            // Auto-format
            if (value.startsWith('254') && !value.startsWith('+')) {
                value = '+' + value;
            } else if (value.match(/^[017]/)) {
                // Starts with 0, 1, or 7 - keep as is
            }
            
            e.target.value = value;
        });
        
        phoneInput.addEventListener('blur', function(e) {
            const value = e.target.value.replace(/\s/g, '');
            
            // Accept multiple formats:
            // +254712345678, +2547123456789 (10 or 11 digits after +254)
            // 0712345678, 07123456789 (10 or 11 digits starting with 0)
            // 0112345678, 01123456789 (Airtel)
            const kenyanPhoneRegex = /^(\+254[017]\d{8,9}|0\d{9})$/;
            
            if (value && !kenyanPhoneRegex.test(value)) {
                phoneInput.setCustomValidity('Please enter a valid Kenyan phone number (e.g., +254712345678, 0712345678, or 0123456789)');
                phoneInput.reportValidity();
            } else {
                phoneInput.setCustomValidity('');
            }
        });
        
        console.log('✅ Phone validation configured (flexible format)');
    }
    
    // Email Validation
    function setupEmailValidation() {
        const emailInput = document.getElementById('email');
        if (!emailInput) return;
        
        emailInput.addEventListener('blur', function(e) {
            const value = e.target.value.trim();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            
            if (value && !emailRegex.test(value)) {
                emailInput.setCustomValidity('Please enter a valid email address');
                emailInput.reportValidity();
            } else {
                emailInput.setCustomValidity('');
            }
        });
        
        emailInput.addEventListener('keydown', function(e) {
            if (e.key === ' ') e.preventDefault();
        });
        
        console.log('✅ Email validation configured');
    }
    
    // BMC Section Navigation
    function loadBmcSection(sectionIndex) {
        if (sectionIndex < 0 || sectionIndex >= bmcSections.length) return;
        
        const section = bmcSections[sectionIndex];
        currentBmcSection = sectionIndex;
        
        // Update UI
        document.getElementById('bmcCurrentSection').textContent = sectionIndex + 1;
        document.getElementById('bmcSectionTitle').textContent = section.title;
        document.getElementById('bmcQuestion').textContent = section.question;
        document.getElementById('bmcExample').textContent = section.example;
        
        // Load saved answer
        const textarea = document.getElementById('bmcTextarea');
        textarea.value = window.bmcAnswers[section.id] || '';
        updateCharCounter();
        
        // Update progress bar
        const progress = ((sectionIndex + 1) / bmcSections.length) * 100;
        document.getElementById('bmcProgressBar').style.width = `${progress}%`;
        
        // Update visual cards
        document.querySelectorAll('.bmc-card').forEach((card, idx) => {
            if (idx < sectionIndex) {
                card.classList.add('completed');
                card.classList.remove('active');
            } else if (idx === sectionIndex) {
                card.classList.add('active');
                card.classList.remove('completed');
            } else {
                card.classList.remove('active', 'completed');
            }
        });
        
        // Update button text
        const nextBtn = document.querySelector('.form-step[data-step="3"] .btn-next');
        if (nextBtn) {
            nextBtn.textContent = sectionIndex === bmcSections.length - 1 ? 'Complete BMC' : 'Next Section';
        }
        
        console.log(`📋 BMC: Loaded section ${sectionIndex + 1}/${bmcSections.length} - ${section.title}`);
    }
    
    function saveBmcSection() {
        const section = bmcSections[currentBmcSection];
        const textarea = document.getElementById('bmcTextarea');
        window.bmcAnswers[section.id] = textarea.value;
        console.log(`💾 BMC: Saved "${section.title}"`);
    }
    
    function updateCharCounter() {
        const textarea = document.getElementById('bmcTextarea');
        const counter = document.querySelector('#bmcCharCounter .char-count');
        if (textarea && counter) {
            counter.textContent = textarea.value.length;
        }
    }
    
    // BMC Navigation Handlers
    document.addEventListener('click', (e) => {
        // BMC Next button
        if (e.target.closest('.form-step[data-step="3"] .btn-next')) {
            e.preventDefault();
            
            const textarea = document.getElementById('bmcTextarea');
            if (textarea.value.length < 30) {
                textarea.setCustomValidity('Please enter at least 30 characters');
                textarea.reportValidity();
                return;
            }
            textarea.setCustomValidity('');
            
            saveBmcSection();
            
            if (currentBmcSection < bmcSections.length - 1) {
                // Move to next BMC section
                loadBmcSection(currentBmcSection + 1);
            } else {
                // All BMC sections complete, move to step 4
                console.log('✅ BMC: All sections completed');
                showStep(4);
            }
        }
        
        // BMC Previous button
        if (e.target.closest('.form-step[data-step="3"] .btn-previous')) {
            e.preventDefault();
            
            saveBmcSection();
            
            if (currentBmcSection > 0) {
                // Go to previous BMC section
                loadBmcSection(currentBmcSection - 1);
            } else {
                // Go back to Step 2
                showStep(2);
            }
        }
    });
    
    // Character counter
    document.getElementById('bmcTextarea')?.addEventListener('input', updateCharCounter);
    
    // Validate step
    window.validateStep = function validateStep(stepNumber) {
        const currentStepEl = document.querySelector(`.form-step[data-step="${stepNumber}"]`);
        if (!currentStepEl) return false;
        
        const requiredInputs = currentStepEl.querySelectorAll('[required]');
        let allValid = true;
        
        requiredInputs.forEach(input => {
            if (!input.checkValidity()) {
                allValid = false;
                input.reportValidity();
                return;
            }
        });
        
        if (!allValid) {
            console.warn(`⚠️ Step ${stepNumber} validation failed`);
            return false;
        }
        
        console.log(`✅ Step ${stepNumber} validation passed`);
        return true;
    }
    
    // Show step
    window.showStep = function showStep(stepNumber) {
        console.log(`📝 Showing step ${stepNumber}`);
        
        const allSteps = document.querySelectorAll('.form-step');
        allSteps.forEach(step => {
            step.classList.remove('active');
        });
        
        const targetStep = document.querySelector(`.form-step[data-step="${stepNumber}"]`);
        if (targetStep) {
            targetStep.classList.add('active');
            
            // Initialize BMC when entering step 3
            if (stepNumber === 3) {
                loadBmcSection(0);
            }
            
            console.log(`✅ Step ${stepNumber} is now visible`);
        }
        
        const progressSteps = document.querySelectorAll('.progress-step');
        progressSteps.forEach((step, index) => {
            const stepNum = index + 1;
            if (stepNum === stepNumber) {
                step.classList.add('active');
                step.classList.remove('completed');
            } else if (stepNum < stepNumber) {
                step.classList.add('completed');
                step.classList.remove('active');
            } else {
                step.classList.remove('active', 'completed');
            }
        });
    }
    
    // Open modal
    function openVendorModal() {
        console.log('🔧 Opening vendor registration modal...');
        
        const modal = document.getElementById('vendorRegistrationModal');
        if (!modal) {
            console.error('❌ Modal element not found!');
            return;
        }
        
        modal.classList.add('active');
        document.body.classList.add('modal-open');
        
        populateCounties();
        populateBusinessCategories();
        populateStep2Dropdowns();
        
        setTimeout(() => showStep(1), 100);
        
        console.log('✅ Modal opened and step 1 displayed');
    }
    
    // Close modal
    function closeVendorModal() {
        const modal = document.getElementById('vendorRegistrationModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.classList.remove('modal-open');
            
            document.querySelectorAll('.form-step').forEach(step => {
                step.classList.remove('active');
            });
            
            console.log('✅ Modal closed');
        }
    }
    
    setupPhoneValidation();
    setupEmailValidation();
    
    // Attach to pricing buttons
    const pricingButtons = document.querySelectorAll('.btn-pricing, .get-started-btn, .btn-cta.vendor');
    console.log(`🔍 Found ${pricingButtons.length} pricing buttons`);
    
    pricingButtons.forEach((button, index) => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log(`💰 Pricing button ${index + 1} clicked`);
            openVendorModal();
        }, true);
    });
    
    // Close button
    document.getElementById('vendorModalClose')?.addEventListener('click', (e) => {
        e.preventDefault();
        closeVendorModal();
    });
    console.log('✅ Close button handler attached');
    
    // Close on overlay
    const modal = document.getElementById('vendorRegistrationModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeVendorModal();
        });
        console.log('✅ Overlay click handler attached');
    }
    
    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.getElementById('vendorRegistrationModal');
            if (modal && modal.classList.contains('active')) {
                closeVendorModal();
            }
        }
    });
    
    // Step navigation (non-BMC steps)
    document.addEventListener('click', (e) => {
        // Continue to Payment button (Step 4 -> Step 5)
        if (e.target.id === 'continueToPayment' || e.target.closest('#continueToPayment')) {
            e.preventDefault();
            
            console.log('[Navigation] Continue to Payment clicked');
            
            // Validate Step 4
            if (!validateStep(4)) {
                console.warn('⚠️ Step 4 validation failed - cannot proceed to payment');
                alert('⚠️ Please complete all required fields before proceeding to payment.');
                return;
            }
            
            // Collect form data for payment validation
            currentFormData = collectFormData();
            console.log('[Navigation] Form data collected for payment:', currentFormData);
            
            // Navigate to Step 5
            showStep(5);
            return;
        }
        
        // Next button (Steps 1 & 2)
        if ((e.target.classList.contains('btn-next') || e.target.closest('.btn-next')) && 
            !e.target.closest('.form-step[data-step="3"]') &&
            e.target.id !== 'continueToPayment') {
            e.preventDefault();
            const currentStep = document.querySelector('.form-step.active');
            if (currentStep) {
                const currentStepNum = parseInt(currentStep.dataset.step);
                if (validateStep(currentStepNum)) {
                    showStep(currentStepNum + 1);
                } else {
                    console.warn('⚠️ Please complete all required fields');
                }
            }
        }
        
        // Previous button (Steps 2 & 4)
        if ((e.target.classList.contains('btn-previous') || e.target.closest('.btn-previous')) &&
            !e.target.closest('.form-step[data-step="3"]')) {
            e.preventDefault();
            const currentStep = document.querySelector('.form-step.active');
            if (currentStep) {
                const currentStepNum = parseInt(currentStep.dataset.step);
                if (currentStepNum > 1) {
                    showStep(currentStepNum - 1);
                }
            }
        }
    });
    
    window.vendorModalDebug = {
        open: openVendorModal,
        close: closeVendorModal,
        showStep: showStep,
        validateStep: validateStep,
        bmcAnswers: window.bmcAnswers
    };
    // ========================================
    // PAYMENT GATE: PREVENT FORM SUBMISSION WITHOUT PAYMENT
    // ========================================
    
    // Track payment completion status
    window.vendorPaymentCompleted = false;
    window.vendorPaymentData = null;
    
    const form = document.getElementById('vendorRegistrationForm');
    
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault(); // CRITICAL: Prevent default form submission
            e.stopPropagation();
            
            console.log('📤 Form submission intercepted');
            
            // CRITICAL: Check if payment has been completed
            if (!window.vendorPaymentCompleted) {
                console.warn('🚫 Payment not completed - redirecting to payment step');
                alert('⚠️ Payment Required: Please complete the registration fee payment before submitting.');
                showStep(5); // Redirect to payment step
                return;
            }
            
            // Validate payment data exists
            if (!window.vendorPaymentData || !window.vendorPaymentData.paymentIntentId) {
                console.error('❌ Payment data missing');
                alert('❌ Payment verification failed. Please try again or contact support.');
                showStep(5);
                return;
            }
            
            console.log('✅ Payment verified, proceeding with submission');
            
            const submitBtn = document.getElementById('finalSubmitBtn');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Submitting...';
            }
            
            try {
                // Collect form data
                const formData = new FormData(form);
                const data = {
                    // Step 1: Basic Information
                    full_name: formData.get('fullName'),
                    business_name: formData.get('businessName'),
                    business_category: formData.get('businessCategory'),
                    other_category: formData.get('otherCategory') || null,
                    email: formData.get('email'),
                    phone: formData.get('phone'),
                    id_number: formData.get('idNumber'),
                    county: formData.get('county'),
                    town: formData.get('town'),
                    center: formData.get('center'),
                    referral_code: formData.get('referralCode') || null,
                    
                    // Step 2: Business Profile
                    business_status: formData.get('businessStatus'),
                    business_size: formData.get('businessSize'),
                    business_model: formData.get('businessModel'),
                    
                    // Step 3: Business Model Canvas
                    bmc_answers: window.bmcAnswers,
                    bmc_completed: Object.keys(window.bmcAnswers || {}).length === 9,
                    
                    // Step 4: Stock Needs
                    stock_cycle: formData.get('stockCycle'),
                    stock_requirement: formData.get('stockRequirement'),
                    stock_justification: formData.get('stockJustification'),
                    
                    // Payment Information
                    payment_intent_id: window.vendorPaymentData.paymentIntentId,
                    payment_reference: window.vendorPaymentData.paymentReference,
                    payment_status: 'verified',
                    
                    // Metadata
                    registration_type: 'vendor',
                    status: 'pending_review',
                    created_at: new Date().toISOString()
                };
                
                console.log('📊 Form data collected:', data);
                
                // Initialize Supabase client
                let supabaseClient;
                if (window._supabaseClient) {
                    supabaseClient = window._supabaseClient;
                } else if (typeof window.supabase !== 'undefined') {
                    const url = window.SUPABASE_URL || window.SUPABASE_CONFIG?.url || 'https://eidsqrnwfndruuufyacc.supabase.co';
                    const key = window.SUPABASE_ANON_KEY || window.SUPABASE_CONFIG?.anonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpZHNxcm53Zm5kcnV1dWZ5YWNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3MzcxMTEsImV4cCI6MjEwMzMxMzExMX0.FTeFHJwnw1iT4AIknJUSNWyM221x4U-VkfTCdCsKOEY';
                    supabaseClient = window.supabase.createClient(url, key);
                } else {
                    console.error('❌ Supabase client not initialized');
                    alert('Connection error. Please refresh the page and try again.');
                    return;
                }
                
                // Submit to Supabase
                console.log('🚀 Submitting to Supabase...');
                const { data: result, error } = await supabaseClient
                    .from('vendor_registrations')
                    .insert([data])
                    .select();
                
                if (error) {
                    console.error('❌ Supabase error:', error);
                    alert('Submission failed: ' + error.message);
                    return;
                }
                
                console.log('✅ Successfully submitted to Supabase:', result);
                
                // Success message
                alert('🎉 Registration submitted successfully! We will review your application and get back to you soon.');
                
                // Reset form and close modal
                form.reset();
                currentBmcSection = 0;
                window.vendorPaymentCompleted = false;
                window.vendorPaymentData = null;
                Object.keys(window.bmcAnswers).forEach(key => delete window.bmcAnswers[key]);
                closeVendorModal();
                
                // Redirect to success page
                setTimeout(() => {
                    window.location.href = 'registration-success.html';
                }, 1500);
                
            } catch (err) {
                console.error('❌ Submission error:', err);
                alert('An error occurred. Please try again.');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Complete Registration';
                }
            }
        });
        
        console.log('✅ Form submission handler attached with payment gate');
    }

    
    console.log('✅ Vendor Modal Fix v3: Initialized successfully');
    console.log('💡 Debug: Use window.vendorModalDebug.open() to test');
});

// ========================================
// PAYMENT INTEGRATION - COMPLETE FLOW
// ========================================

// Initialize payment components
const validator = new window.RegistrationValidator();
const sanitizer = new window.InputSanitizer();
let paymentService = null;
let currentFormData = null;

// Initialize Supabase client for payment
let paymentSupabaseClient = null;
if (window._supabaseClient) {
    paymentSupabaseClient = window._supabaseClient;
} else if (typeof window.supabase !== 'undefined') {
    const url = window.SUPABASE_URL || window.SUPABASE_CONFIG?.url || 'https://eidsqrnwfndruuufyacc.supabase.co';
    const key = window.SUPABASE_ANON_KEY || window.SUPABASE_CONFIG?.anonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpZHNxcm53Zm5kcnV1dWZ5YWNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3MzcxMTEsImV4cCI6MjEwMzMxMzExMX0.FTeFHJwnw1iT4AIknJUSNWyM221x4U-VkfTCdCsKOEY';
    paymentSupabaseClient = window.supabase.createClient(url, key);
}

/**
 * Collect all form data
 */
function collectFormData() {
    const form = document.getElementById('vendorRegistrationForm');
    const formData = new FormData(form);
    
    const data = {
        // Step 1
        fullName: formData.get('fullName'),
        businessName: formData.get('businessName'),
        businessCategory: formData.get('businessCategory'),
        otherCategory: formData.get('otherCategory') || null,
        email: formData.get('email'),
        phone: formData.get('phone'),
        idNumber: formData.get('idNumber'),
        county: formData.get('county'),
        
        // Step 2
        businessStatus: formData.get('businessStatus'),
        businessSize: formData.get('businessSize'),
        businessModel: formData.get('businessModel'),
        yearsInOperation: formData.get('yearsInOperation'),
        monthlyRevenue: formData.get('monthlyRevenue'),
        
        // Step 3: BMC
        bmcAnswers: window.bmcAnswers,
        
        // Step 4
        stockCategories: formData.get('stockCategories') || formData.get('stockCycle'),
        stockValue: formData.get('stockValue') || formData.get('stockRequirement'),
        repaymentPeriod: formData.get('repaymentPeriod') || formData.get('stockCycle'),
        additionalInfo: formData.get('additionalInfo') || formData.get('stockJustification')
    };
    
    return data;
}

/**
 * Handle payment status updates
 */
function handlePaymentStatus(statusData) {
    const statusDiv = document.getElementById('paymentStatus');
    const messageEl = document.getElementById('paymentStatusMessage');
    const detailEl = document.getElementById('paymentStatusDetail');
    const retryBtn = document.getElementById('retryPayment');
    const payBtn = document.getElementById('payWithMpesa');
    
    if (!statusDiv || !messageEl) return;
    
    statusDiv.classList.remove('hidden');
    
    console.log('[Payment] Status update:', statusData);
    
    switch (statusData.status) {
        case 'PENDING':
        case 'PROCESSING':
            statusDiv.className = 'payment-status warning';
            messageEl.textContent = 'Processing payment...';
            if (detailEl) detailEl.textContent = 'Please complete the M-Pesa prompt on your phone';
            if (retryBtn) retryBtn.classList.add('hidden');
            if (payBtn) payBtn.classList.add('hidden');
            break;
            
        case 'CONFIRMED':
            statusDiv.className = 'payment-status success';
            messageEl.textContent = '✓ Payment Confirmed!';
            if (detailEl) detailEl.textContent = 'Creating your vendor account...';
            if (retryBtn) retryBtn.classList.add('hidden');
            if (payBtn) payBtn.classList.add('hidden');
            
            // Redirect to success page after 2 seconds
            setTimeout(() => {
                window.location.href = 'registration-success.html';
            }, 2000);
            break;
            
        case 'FAILED':
            statusDiv.className = 'payment-status error';
            messageEl.textContent = '✗ Payment Failed';
            if (detailEl) detailEl.textContent = statusData.message || 'Payment could not be completed. Please try again.';
            if (retryBtn) retryBtn.classList.remove('hidden');
            if (payBtn) payBtn.classList.add('hidden');
            break;
            
        case 'EXPIRED':
        case 'TIMEOUT':
            statusDiv.className = 'payment-status error';
            messageEl.textContent = '⏱ Payment Timeout';
            if (detailEl) detailEl.textContent = 'Payment request expired. Please try again.';
            if (retryBtn) retryBtn.classList.remove('hidden');
            if (payBtn) payBtn.classList.add('hidden');
            break;
            
        case 'ERROR':
            statusDiv.className = 'payment-status error';
            messageEl.textContent = '⚠ Connection Error';
            if (detailEl) detailEl.textContent = statusData.message || 'Error checking payment status. Retrying...';
            break;
            
        default:
            statusDiv.className = 'payment-status';
            messageEl.textContent = 'Waiting for payment confirmation...';
            if (detailEl) detailEl.textContent = 'This may take a few moments';
    }
}

/**
 * Initiate payment process
 */
async function initiatePayment() {
    try {
        const mpesaPhone = document.getElementById('mpesaPhone');
        if (!mpesaPhone || !mpesaPhone.value) {
            alert('Please enter M-Pesa phone number');
            return;
        }
        
        const phoneValue = mpesaPhone.value;
        
        // Validate phone
        if (!validator.validatePhone(phoneValue)) {
            alert(validator.errors.phone || 'Invalid phone number');
            return;
        }
        
        const payBtn = document.getElementById('payWithMpesa');
        const retryBtn = document.getElementById('retryPayment');
        const statusDiv = document.getElementById('paymentStatus');
        
        if (payBtn) {
            payBtn.disabled = true;
            payBtn.textContent = 'Processing...';
        }
        if (retryBtn) retryBtn.classList.add('hidden');
        if (statusDiv) statusDiv.classList.remove('hidden');
        
        console.log('[Payment] Initiating STK Push payment...');
        
        // Initialize payment service
        if (!paymentSupabaseClient) {
            if (window._supabaseClient) {
                paymentSupabaseClient = window._supabaseClient;
            } else if (typeof window.supabase !== 'undefined' && (window.SUPABASE_URL || window.SUPABASE_CONFIG?.url)) {
                const url = window.SUPABASE_URL || window.SUPABASE_CONFIG?.url;
                const key = window.SUPABASE_ANON_KEY || window.SUPABASE_CONFIG?.anonKey;
                paymentSupabaseClient = window.supabase.createClient(url, key);
            }
        }
        if (!paymentService) {
            paymentService = new window.RegistrationPaymentService(paymentSupabaseClient);
        }
        
        // Validate registration data first
        const validation = await paymentService.validateServerSide(currentFormData);
        
        if (!validation.valid) {
            // Display validation errors
            validation.errors.forEach(error => {
                validator.showError(error.field, error.message);
            });
            alert('Please fix the validation errors and try again.');
            if (payBtn) {
                payBtn.disabled = false;
                payBtn.textContent = 'Pay with M-Pesa';
            }
            if (statusDiv) statusDiv.classList.add('hidden');
            return;
        }
        
        // Create payment intent and initiate STK Push
        const result = await paymentService.createPaymentIntent(phoneValue);
        
        if (!result.success) {
            throw new Error(result.error || 'Payment initiation failed');
        }
        
        console.log('[Payment] STK Push initiated successfully:', result);
        
        // Update UI
        const messageEl = document.getElementById('paymentStatusMessage');
        const detailEl = document.getElementById('paymentStatusDetail');
        if (messageEl) messageEl.textContent = 'Check your phone for M-Pesa prompt';
        if (detailEl) detailEl.textContent = `Reference: ${result.paymentReference}`;
        
        // Start PaymentStatusPoller after STK Push is initiated
        console.log('[Payment] Starting payment status polling...');
        const poller = new window.PaymentStatusPoller(result.paymentIntentId, paymentSupabaseClient);
        
        poller.startPolling(
            // onSuccess callback
            (data) => {
                console.log('[Payment] Payment confirmed!', data);
                
                // ✅ SET PAYMENT COMPLETION FLAGS
                window.vendorPaymentCompleted = true;
                window.vendorPaymentData = {
                    paymentIntentId: result.paymentIntentId,
                    paymentReference: result.paymentReference,
                    confirmedAt: new Date().toISOString()
                };
                
                if (messageEl) messageEl.textContent = '✓ Payment confirmed!';
                if (detailEl) detailEl.textContent = 'Creating your vendor account...';
                
                // ✅ AUTO-SUBMIT FORM AFTER PAYMENT SUCCESS
                console.log('[Payment] Auto-submitting registration form...');
                const form = document.getElementById('vendorRegistrationForm');
                if (form) {
                    // Trigger form submission which now has payment verification
                    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                } else {
                    console.error('[Payment] Form element not found for auto-submission');
                }
            },
            // onError callback
            (error) => {
                console.error('[Payment] Payment error:', error);
                
                if (error.code === 'TIMEOUT') {
                    if (messageEl) messageEl.textContent = '⏱️ Payment confirmation timeout';
                    if (detailEl) detailEl.textContent = 'Please contact support if you sent the payment.';
                } else {
                    if (messageEl) messageEl.textContent = '❌ Payment failed';
                    if (detailEl) detailEl.textContent = error.message || 'Please try again.';
                }
                
                // Show retry button
                if (payBtn) {
                    payBtn.disabled = false;
                    payBtn.textContent = 'Pay with M-Pesa';
                }
                if (retryBtn) retryBtn.style.display = 'inline-block';
            }
        );
        
    } catch (error) {
        console.error('[Payment] Error:', error);
        alert(error.message || 'Payment failed. Please try again.');
        
        const payBtn = document.getElementById('payWithMpesa');
        const retryBtn = document.getElementById('retryPayment');
        
        if (payBtn) {
            payBtn.disabled = false;
            payBtn.textContent = 'Pay with M-Pesa';
        }
        if (retryBtn) retryBtn.style.display = 'inline-block';
    }
}

/**
 * Retry payment
 */
async function retryPaymentFlow() {
    try {
        const mpesaPhone = document.getElementById('mpesaPhone');
        if (!mpesaPhone) return;
        
        const retryBtn = document.getElementById('retryPayment');
        const statusDiv = document.getElementById('paymentStatus');
        
        if (retryBtn) {
            retryBtn.disabled = true;
            retryBtn.textContent = 'Retrying...';
        }
        if (statusDiv) {
            statusDiv.classList.remove('hidden');
            statusDiv.className = 'payment-status';
        }
        
        console.log('[Payment] Retrying payment...');
        
        const result = await paymentService.retryPayment(mpesaPhone.value, handlePaymentStatus);
        
        if (!result.success) {
            throw new Error(result.error || 'Retry failed');
        }
        
        const messageEl = document.getElementById('paymentStatusMessage');
        const detailEl = document.getElementById('paymentStatusDetail');
        if (messageEl) messageEl.textContent = 'Check your phone for M-Pesa prompt';
        if (detailEl) detailEl.textContent = 'Payment retry initiated';
        
    } catch (error) {
        console.error('[Payment] Retry error:', error);
        alert(error.message || 'Retry failed. Please try again.');
        
        const retryBtn = document.getElementById('retryPayment');
        if (retryBtn) {
            retryBtn.disabled = false;
            retryBtn.textContent = 'Retry Payment';
        }
    }
}

// Handle payment flow buttons
document.addEventListener('click', (e) => {
    // "Continue to Payment" button (Step 4) -> Go to Step 5 (Payment)
    if (e.target.id === 'continueToPayment' || e.target.closest('#continueToPayment')) {
        e.preventDefault();
        
        console.log('[Form] Continue to Payment button clicked');
        
        // Validate Step 4
        if (!window.validateStep(4)) {
            alert('Please complete all required fields in this step');
            return;
        }
        
        // Collect and sanitize form data
        currentFormData = collectFormData();
        currentFormData = sanitizer.sanitizeFormData(currentFormData);
        
        // Validate all fields
        const validation = validator.validateAll(currentFormData);
        if (!validation.valid) {
            alert('Please fix all validation errors before proceeding to payment');
            console.error('Validation errors:', validation.errors);
            return;
        }
        
        console.log('[Form] All validations passed, moving to payment step');
        
        // Show Step 5 (Payment)
        window.showStep(5);
    }
    
    // "Pay with M-Pesa" button
    if (e.target.id === 'payWithMpesa' || e.target.closest('#payWithMpesa')) {
        e.preventDefault();
        console.log('[Payment] Pay button clicked');
        initiatePayment();
    }
    
    // "Retry Payment" button
    if (e.target.id === 'retryPayment' || e.target.closest('#retryPayment')) {
        e.preventDefault();
        console.log('[Payment] Retry button clicked');
        retryPaymentFlow();
    }
}, true); // Use capture phase

console.log('✅ Payment integration completed');
