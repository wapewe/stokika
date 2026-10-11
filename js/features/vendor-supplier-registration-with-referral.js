// Enhanced Vendor/Supplier Registration with Agent Referral Tracking
(function() {
    const affiliateSystem = new AgentAffiliateSystem();
    let currentReferralInfo = null;

    // Initialize referral tracking on page load
    async function initializeReferralTracking() {
        currentReferralInfo = await affiliateSystem.initializeReferralTracking();
        
        // Add hidden field to forms for agent code
        addReferralFieldsToForms();
    }

    // Add hidden fields to registration forms
    function addReferralFieldsToForms() {
        const vendorForm = document.getElementById('vendorRegistrationForm');
        const supplierForm = document.getElementById('supplierRegistrationForm');

        if (vendorForm && !vendorForm.querySelector('[name="agentReferralCode"]')) {
            const referralInput = document.createElement('input');
            referralInput.type = 'hidden';
            referralInput.name = 'agentReferralCode';
            referralInput.value = currentReferralInfo?.agentCode || '';
            vendorForm.appendChild(referralInput);

            const sourceInput = document.createElement('input');
            sourceInput.type = 'hidden';
            sourceInput.name = 'referralSource';
            sourceInput.value = currentReferralInfo ? 'agent_link' : 'direct';
            vendorForm.appendChild(sourceInput);
        }

        if (supplierForm && !supplierForm.querySelector('[name="agentReferralCode"]')) {
            const referralInput = document.createElement('input');
            referralInput.type = 'hidden';
            referralInput.name = 'agentReferralCode';
            referralInput.value = currentReferralInfo?.agentCode || '';
            supplierForm.appendChild(referralInput);

            const sourceInput = document.createElement('input');
            sourceInput.type = 'hidden';
            sourceInput.name = 'referralSource';
            sourceInput.value = currentReferralInfo ? 'agent_link' : 'direct';
            supplierForm.appendChild(sourceInput);
        }
    }

    // Add agent code input field to forms
    function addAgentCodeInputToForms() {
        const vendorForm = document.getElementById('vendorRegistrationForm');
        const supplierForm = document.getElementById('supplierRegistrationForm');

        const agentCodeHTML = `
            <div class="form-group agent-code-section" style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                <label>Field Agent Referral Code (Optional)</label>
                <input type="text" name="manualAgentCode" placeholder="Enter agent code if referred by a field agent" style="margin-bottom: 10px;">
                <p class="form-hint" style="font-size: 12px; color: #6c757d;">If a field agent referred you, enter their employee number here</p>
            </div>
        `;

        // Add to vendor form (after email field)
        if (vendorForm) {
            const emailGroup = vendorForm.querySelector('[name="email"]')?.closest('.form-group');
            if (emailGroup && !vendorForm.querySelector('.agent-code-section')) {
                emailGroup.insertAdjacentHTML('afterend', XSSProtection.sanitize(agentCodeHTML));
            }
        }

        // Add to supplier form (after email field)
        if (supplierForm) {
            const emailGroup = supplierForm.querySelector('[name="email"]')?.closest('.form-group');
            if (emailGroup && !supplierForm.querySelector('.agent-code-section')) {
                emailGroup.insertAdjacentHTML('afterend', XSSProtection.sanitize(agentCodeHTML));
            }
        }
    }

    // Handle vendor registration with referral
    async function handleVendorRegistration(formData, vendorId) {
        const agentCode = formData.get('agentReferralCode') || formData.get('manualAgentCode');
        const referralSource = formData.get('manualAgentCode') ? 'agent_code' : formData.get('referralSource');

        if (agentCode && vendorId) {
            const linked = await affiliateSystem.linkVendorToAgent(vendorId, agentCode, referralSource);
            if (linked) {
                console.log('Vendor successfully linked to agent:', agentCode);
            }
        }
    }

    // Handle supplier registration with referral
    async function handleSupplierRegistration(formData, supplierId) {
        const agentCode = formData.get('agentReferralCode') || formData.get('manualAgentCode');
        const referralSource = formData.get('manualAgentCode') ? 'agent_code' : formData.get('referralSource');

        if (agentCode && supplierId) {
            const linked = await affiliateSystem.linkSupplierToAgent(supplierId, agentCode, referralSource);
            if (linked) {
                console.log('Supplier successfully linked to agent:', agentCode);
            }
        }
    }

    // Intercept form submissions
    function interceptFormSubmissions() {
        const vendorForm = document.getElementById('vendorRegistrationForm');
        const supplierForm = document.getElementById('supplierRegistrationForm');

        if (vendorForm) {
            vendorForm.addEventListener('submit', async function(e) {
                const formData = new FormData(vendorForm);
                
                // Store for later use after vendor is created
                window.pendingVendorReferral = {
                    agentCode: formData.get('agentReferralCode') || formData.get('manualAgentCode'),
                    referralSource: formData.get('manualAgentCode') ? 'agent_code' : formData.get('referralSource')
                };
            });
        }

        if (supplierForm) {
            supplierForm.addEventListener('submit', async function(e) {
                const formData = new FormData(supplierForm);
                
                // Store for later use after supplier is created
                window.pendingSupplierReferral = {
                    agentCode: formData.get('agentReferralCode') || formData.get('manualAgentCode'),
                    referralSource: formData.get('manualAgentCode') ? 'agent_code' : formData.get('referralSource')
                };
            });
        }
    }

    // Initialize on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            initializeReferralTracking();
            addAgentCodeInputToForms();
            interceptFormSubmissions();
        });
    } else {
        initializeReferralTracking();
        addAgentCodeInputToForms();
        interceptFormSubmissions();
    }

    // Export functions for use in other scripts
    window.handleVendorReferral = handleVendorRegistration;
    window.handleSupplierReferral = handleSupplierRegistration;
})();
