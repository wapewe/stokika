let currentApplicationCode = null;
let currentApplicationData = null;
let mpesaClient = null;
let currentCheckoutRequestId = null;
let paymentAttempts = 0;
let pollInterval = null;
let selectedUserType = null; // Track selected user type

// Sanitize HTML to prevent XSS
function sanitizeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Mask phone number for display
function maskPhoneNumber(phone) {
    if (!phone || phone.length < 8) return phone || 'N/A';
    // Format: 254XXX***678
    if (phone.length === 12 && phone.startsWith('254')) {
        return `254${phone.substring(3, 6)}***${phone.substring(9)}`;
    }
    // Format: 07XX***678
    if (phone.length === 10 && phone.startsWith('0')) {
        return `${phone.substring(0, 4)}***${phone.substring(7)}`;
    }
    // Fallback: show first 4 and last 3
    if (phone.length > 7) {
        return `${phone.substring(0, 4)}***${phone.substring(phone.length - 3)}`;
    }
    return phone;
}

// Map M-Pesa error messages to user-friendly text
function getUserFriendlyPaymentError(errorMessage) {
    const message = (errorMessage || '').toLowerCase();
    
    // Map common error patterns to user-friendly messages
    if (message.includes('insufficient') || message.includes('balance')) {
        return '💰 Insufficient M-Pesa balance. Please top up your account and try again.';
    }
    if (message.includes('cancel')) {
        return '🚫 You cancelled the payment. Click "Retry Payment" when you\'re ready to try again.';
    }
    if (message.includes('timeout') || message.includes('timed out')) {
        return '⏱️ Payment request timed out. Please check your phone and try again.';
    }
    if (message.includes('invalid') && message.includes('phone')) {
        return '📱 Invalid phone number. Please check the number and try again.';
    }
    if (message.includes('unavailable') || message.includes('service')) {
        return '🔧 M-Pesa service temporarily unavailable. Please try again in a few minutes.';
    }
    if (message.includes('rate limit') || message.includes('too many')) {
        return '⏳ Too many payment requests. Please wait a few minutes and try again.';
    }
    if (message.includes('401') || message.includes('unauthorized') || message.includes('credentials')) {
        return '🔒 Payment service configuration error. Please contact support.';
    }
    if (message.includes('wrong pin') || message.includes('incorrect pin')) {
        return '🔢 Wrong M-Pesa PIN entered. Please try again with the correct PIN.';
    }
    if (message.includes('busy') || message.includes('system busy')) {
        return '⚡ M-Pesa system is busy. Please try again in a moment.';
    }
    
    // Return the original message if no mapping found
    return errorMessage || 'Payment could not be processed. Please try again or contact support.';
}

// Show user message
function showUserMessage(message, type = 'error', useToast = false) {
    // Use toast for non-critical messages
    if (useToast && window.toast) {
        if (type === 'error') {
            toast.error(message);
        } else if (type === 'success') {
            toast.success(message);
        } else if (type === 'warning') {
            toast.warning(message);
        } else {
            toast.info(message);
        }
        return;
    }
    
    // Full page message for critical errors
    const container = document.getElementById('payment-dashboard');
    if (!container) {
        console.error('Payment dashboard container not found');
        // Fallback to toast if available
        if (window.toast) {
            toast.error(message);
        }
        return;
    }
    
    const icons = { error: 'fas fa-exclamation-triangle', success: 'fas fa-check-circle', info: 'fas fa-info-circle' };
    const colors = { error: '#ef4444', success: '#10b981', info: '#3b82f6' };
    
    container.innerHTML = `
        <div class="error-container">
            <i class="${XSSProtection.escapeHtml(icons[type])}" style="color: ${XSSProtection.escapeHtml(colors[type])}"></i>
            <h3>${XSSProtection.escapeHtml(type === 'error' ? 'Payment Error' : 'Information')}</h3>
            <p>${XSSProtection.escapeHtml(sanitizeHTML(message))}</p>
            <a href="../dalana.html" class="btn btn-primary">Return to Home</a>
        </div>
    `;
}

// Get or initialize M-Pesa client
function getMpesaClient() {
    if (!mpesaClient) {
        const supabase = initSupabase();
        if (supabase) {
            mpesaClient = new MpesaIntegrationClient(supabase);
            console.log('M-Pesa integration client initialized');
        }
    }
    return mpesaClient;
}

window.addEventListener('supabase-config-loaded', () => {
    getMpesaClient();
});

// Initialize the page
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize M-Pesa client
        getMpesaClient();
        
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        
        if (code) {
            currentApplicationCode = code;
            await verifyAndLoadPayment(code);
        } else {
            // Show code entry section
            document.getElementById('code-entry-section').style.display = 'block';
            document.getElementById('payment-dashboard').style.display = 'none';
            
            // User Type Selection Handler
            const userTypeSelect = document.getElementById('userTypeSelect');
            const codeInputSection = document.getElementById('codeInputSection');
            const codeInput = document.getElementById('applicationCodeInput');
            const codeFormatHelp = document.getElementById('codeFormatHelp');
            
            if (userTypeSelect) {
                userTypeSelect.addEventListener('change', (e) => {
                    selectedUserType = e.target.value;
                    
                    if (selectedUserType) {
                        // Show application code input section
                        codeInputSection.style.display = 'block';
                        
                        // Update placeholder and help text based on selection
                        if (selectedUserType === 'supervisor') {
                            codeInput.placeholder = 'e.g., SFS29797339';
                            codeFormatHelp.innerHTML = '<i class="fas fa-info-circle"></i> Supervisor codes start with <strong>SFS</strong>';
                        } else if (selectedUserType === 'field_agent') {
                            codeInput.placeholder = 'e.g., SFA12345678';
                            codeFormatHelp.innerHTML = '<i class="fas fa-info-circle"></i> Field Agent codes start with <strong>SFA</strong>';
                        }
                        
                        // Clear any previous input
                        codeInput.value = '';
                        
                        // Focus on input after animation
                        setTimeout(() => {
                            codeInput.focus();
                        }, 300);
                    } else {
                        codeInputSection.style.display = 'none';
                    }
                });
            }
            
            // Attach verify button event listener
            const verifyBtn = document.getElementById('verifyCodeBtn');
            if (verifyBtn) {
                verifyBtn.addEventListener('click', verifyApplicationCode);
            }
        }
    } catch (error) {
        console.error('Page initialization error:', error);
        showUserMessage('Failed to initialize payment page. Please try again later.');
    }
});

// Verify application code from input
window.verifyApplicationCode = async function() {
    const userTypeSelect = document.getElementById('userTypeSelect');
    const codeInput = document.getElementById('applicationCodeInput');
    const code = codeInput.value.trim().toUpperCase();
    
    // Validate user type is selected
    if (!selectedUserType) {
        toast.error('Please select whether you are a Supervisor or Field Agent first');
        userTypeSelect.focus();
        return;
    }
    
    // Validate code is entered
    if (!code) {
        toast.error('Please enter your application code');
        codeInput.focus();
        return;
    }
    
    // Validate code format matches selected user type
    const isSupervisorCode = code.startsWith('SFS');
    const isFieldAgentCode = code.startsWith('SFA');
    
    if (selectedUserType === 'supervisor' && !isSupervisorCode) {
        toast.error('You selected "Supervisor" but entered a code that doesn\'t start with SFS. Supervisor codes must start with "SFS". Please check your code or change your role selection.', 6000);
        codeInput.focus();
        return;
    }
    
    if (selectedUserType === 'field_agent' && !isFieldAgentCode) {
        toast.error('You selected "Field Agent" but entered a code that doesn\'t start with SFA. Field Agent codes must start with "SFA". Please check your code or change your role selection.', 6000);
        codeInput.focus();
        return;
    }
    
    currentApplicationCode = code;
    await verifyAndLoadPayment(code);
};

async function verifyAndLoadPayment(code) {
    try {
        document.getElementById('code-entry-section').style.display = 'none';
        document.getElementById('payment-dashboard').style.display = 'block';
        document.getElementById('payment-dashboard').textContent = 'Verifying application code...';
        
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading-state';
        const spinner = document.createElement('div');
        spinner.className = 'spinner';
        const text = document.createElement('p');
        text.textContent = 'Verifying application code...';
        loadingDiv.appendChild(spinner);
        loadingDiv.appendChild(text);
        const dashboardElem = document.getElementById('payment-dashboard');
        dashboardElem.textContent = ''; // Clear existing content
        dashboardElem.appendChild(loadingDiv);
        
        const supabase = initSupabase();
        if (!supabase) throw new Error('Failed to initialize database connection');
        
        // Verify application code: try Edge Function first, fallback to direct Supabase query
        let application = null;
        const normalizedCode = code.trim().toUpperCase();

        try {
            const { data: verifyResult, error: verifyError } = await supabase.functions.invoke('verify-application-code', {
                body: { application_code: normalizedCode }
            });

            if (!verifyError && verifyResult?.success && verifyResult?.data) {
                application = verifyResult.data;
            }
        } catch (efErr) {
            console.warn('[kit-payment] Edge function invoke failed, falling back to direct query:', efErr);
        }

        // Direct database query fallback if edge function was unavailable or errored
        if (!application) {
            console.log('[kit-payment] Checking application code in database directly...');
            
            // Check supervisors table
            const { data: supervisorData, error: supErr } = await supabase
                .from('supervisors')
                .select('application_code, first_name, last_name, phone, status, approval_status, created_at')
                .eq('application_code', normalizedCode)
                .maybeSingle();

            if (supervisorData) {
                application = {
                    application_code: supervisorData.application_code,
                    full_name: [supervisorData.first_name, supervisorData.last_name].filter(Boolean).join(' ') || 'Supervisor',
                    phone: supervisorData.phone,
                    user_type: 'supervisor',
                    approval_status: supervisorData.approval_status || supervisorData.status || 'pending',
                    created_at: supervisorData.created_at
                };
            } else {
                // Check field_agents table
                const { data: agentData, error: agentErr } = await supabase
                    .from('field_agents')
                    .select('application_code, first_name, last_name, phone, status, approval_status, created_at')
                    .eq('application_code', normalizedCode)
                    .maybeSingle();

                if (agentData) {
                    application = {
                        application_code: agentData.application_code,
                        full_name: [agentData.first_name, agentData.last_name].filter(Boolean).join(' ') || 'Field Agent',
                        phone: agentData.phone,
                        user_type: 'field_agent',
                        approval_status: agentData.approval_status || agentData.status || 'pending',
                        created_at: agentData.created_at
                    };
                } else {
                    // Check vendors table
                    const { data: vendorData } = await supabase
                        .from('vendors')
                        .select('id, business_name, location, registration_number, tax_pin, is_verified, created_at')
                        .or(`registration_number.eq.${normalizedCode},tax_pin.eq.${normalizedCode}`)
                        .maybeSingle();

                    if (vendorData) {
                        application = {
                            application_code: normalizedCode,
                            full_name: vendorData.business_name || 'Vendor',
                            phone: '',
                            user_type: 'vendor',
                            approval_status: vendorData.is_verified ? 'approved' : 'pending',
                            created_at: vendorData.created_at
                        };
                    }
                }
            }
        }

        if (!application) {
            toast.error('Invalid application code. Please check and try again.');
            document.getElementById('code-entry-section').style.display = 'block';
            document.getElementById('payment-dashboard').style.display = 'none';
            return;
        }

        currentApplicationData = application;
        
        const onboarding = new ComprehensiveOnboarding();
        const kitConfig = await onboarding.getKitConfig(application.user_type);
        if (!kitConfig) throw new Error('Kit configuration not found for user type');
        
        // Get existing payment status: try Edge Function first, fallback to direct query
        let existingPayment = null;
        try {
            const { data: paymentResult } = await supabase.functions.invoke('get-kit-payment-status', {
                body: { application_code: normalizedCode }
            });
            if (paymentResult?.success && paymentResult?.data) {
                existingPayment = paymentResult.data;
            }
        } catch (_) {
            // Edge function error ignored for fallback
        }

        if (!existingPayment) {
            const { data: directPayment } = await supabase
                .from('stokika_kit_payments')
                .select('*')
                .eq('application_code', normalizedCode)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (directPayment) {
                existingPayment = directPayment;
            }
        }
        
        renderKitPaymentDashboard(currentApplicationData, kitConfig, existingPayment);
    } catch (error) {
        console.error('Code verification error:', error);
        document.getElementById('code-entry-section').style.display = 'block';
            document.getElementById('payment-dashboard').style.display = 'none';
            
            // Attach verify button event listener
            const verifyBtn = document.getElementById('verifyCodeBtn');
            if (verifyBtn) {
                verifyBtn.addEventListener('click', verifyApplicationCode);
            }
        alert(error.message || 'Failed to verify application code');
    }
}

function renderKitPaymentDashboard(application, kitConfig, existingPayment) {
    const container = document.getElementById('payment-dashboard');
    if (!container) {
        console.error('Payment dashboard container not found');
        return;
    }
    
    try {
        if (existingPayment?.payment_status === 'verified' || existingPayment?.payment_status === 'completed') {
            renderVerifiedPayment(container, existingPayment);
        } else if (existingPayment?.payment_status === 'pending') {
            renderPendingPayment(container, existingPayment);
        } else if (existingPayment?.payment_status === 'rejected') {
            renderRejectedPayment(container, existingPayment, application, kitConfig);
        } else {
            const formHTML = renderPaymentForm(application, kitConfig);
            container.innerHTML = formHTML;
            attachEventListeners();
        }
    } catch (error) {
        console.error('Error rendering dashboard:', error);
        showUserMessage('Failed to display payment form');
    }
}

function renderVerifiedPayment(container, payment) {
    const amount = parseFloat(payment.kit_amount) || 0;
    const method = sanitizeHTML(payment.payment_method || 'N/A').replace(/_/g, ' ');
    const receipt = payment.mpesa_receipt_number ? sanitizeHTML(payment.mpesa_receipt_number) : 'N/A';
    const verifiedDate = payment.verified_at ? new Date(payment.verified_at).toLocaleString() : 'N/A';
    
    container.innerHTML = `
        <div class="success-fullpage">
            <div class="success-confetti-banner">
                <div class="checkmark-ring"><i class="fas fa-check"></i></div>
                <h2>Payment Verified!</h2>
                <p>Your Stokika Kit payment has been confirmed and your account is now active.</p>
            </div>
            <div class="success-receipt">
                <h3><i class="fas fa-receipt"></i> Payment Receipt</h3>
                <div class="receipt-row"><span class="receipt-label">Amount Paid</span><span class="receipt-value green">KES ${XSSProtection.escapeHtml(amount.toLocaleString())}</span></div>
                <div class="receipt-row"><span class="receipt-label">M-Pesa Receipt</span><span class="receipt-value">${XSSProtection.escapeHtml(receipt)}</span></div>
                <div class="receipt-row"><span class="receipt-label">Payment Method</span><span class="receipt-value">${XSSProtection.escapeHtml(method.toUpperCase())}</span></div>
                <div class="receipt-row"><span class="receipt-label">Verified On</span><span class="receipt-value">${XSSProtection.escapeHtml(verifiedDate)}</span></div>
                <div class="receipt-row"><span class="receipt-label">Status</span><span class="receipt-value badge-pill">Verified</span></div>
            </div>
            <div class="success-nextsteps">
                <h3><i class="fas fa-list-check"></i> What Happens Next</h3>
                <ol>
                    <li>You will receive your <strong>login credentials via email</strong> within 24 hours.</li>
                    <li>Your <strong>Stokika Kit</strong> will be dispatched to you shortly.</li>
                    <li>You can start using the Stokika platform once you receive your credentials.</li>
                </ol>
            </div>
            <div class="success-actions">
                <a href="dalana.html" class="btn btn-primary"><i class="fas fa-home"></i> Return to Home</a>
            </div>
        </div>
    `;
}

function renderPendingPayment(container, payment) {
    const amount = parseFloat(payment.kit_amount) || 0;
    const method = sanitizeHTML(payment.payment_method || 'N/A').replace(/_/g, ' ');
    const mpesaCode = payment.mpesa_receipt_number ? sanitizeHTML(payment.mpesa_receipt_number) : null;
    const submittedDate = payment.created_at ? new Date(payment.created_at).toLocaleString() : 'N/A';
    
    container.innerHTML = `
        <div class="payment-pending-full">
            <div class="status-icon-ring amber"><i class="fas fa-clock"></i></div>
            <h2>Payment Pending Verification</h2>
            <p>Your payment has been submitted and is awaiting admin verification. You will be notified once confirmed.</p>
            <div class="pending-detail-box">
                <div class="receipt-row"><span class="receipt-label">Amount</span><span class="receipt-value">KES ${XSSProtection.escapeHtml(amount.toLocaleString())}</span></div>
                <div class="receipt-row"><span class="receipt-label">Method</span><span class="receipt-value">${XSSProtection.escapeHtml(method.toUpperCase())}</span></div>
                ${mpesaCode ? `<div class="receipt-row"><span class="receipt-label">M-Pesa Code</span><span class="receipt-value">${XSSProtection.escapeHtml(mpesaCode)}</span></div>` : ''}
                <div class="receipt-row" style="border-bottom:none;"><span class="receipt-label">Submitted On</span><span class="receipt-value">${XSSProtection.escapeHtml(submittedDate)}</span></div>
            </div>
            <p style="font-size:13px;color:#6b7280;">This usually takes a few hours during business hours.</p>
        </div>
    `;
}

function renderRejectedPayment(container, payment, application, kitConfig) {
    const reason = sanitizeHTML(payment.rejection_reason || 'Please contact support for details.');
    const formHTML = renderPaymentForm(application, kitConfig);
    container.innerHTML = `
        <div class="payment-pending-full">
            <div class="status-icon-ring red"><i class="fas fa-times"></i></div>
            <h2>Payment Rejected</h2>
            <p>Your previous payment submission was rejected by the admin.</p>
            <div class="failure-reason-box"><i class="fas fa-exclamation-circle"></i><p><strong>Reason:</strong> ${XSSProtection.escapeHtml(reason)}</p></div>
            <p style="margin-top:24px;font-size:14px;color:#4b5563;">Please submit a new payment below:</p>
        </div>
        ${formHTML}
    `;
    attachEventListeners();
}

function renderPaymentForm(application, kitConfig) {
    const userType = sanitizeHTML(application.user_type || 'user');
    const userTypeLabel = userType.replace(/_/g, ' ').toUpperCase();
    const amount = parseFloat(kitConfig.kit_amount) || 0;
    const description = sanitizeHTML(kitConfig.description || '');
    const phone = sanitizeHTML(application.phone || '');
    const applicantName = sanitizeHTML(application.full_name || 'Applicant');
    
    let kitItemsHTML = '';
    if (Array.isArray(kitConfig.kit_items)) {
        kitItemsHTML = kitConfig.kit_items
            .map(item => `<li><i class="fas fa-check"></i>${sanitizeHTML(item)}</li>`)
            .join('');
    }
    
    return `
        <div class="kit-details">
            <h3>Welcome, ${applicantName}!</h3>
            <p style="color:#6b7280;font-size:13px;margin:0 0 16px;">Application Code: <strong style="color:#007A3D;">${sanitizeHTML(currentApplicationCode)}</strong></p>
            <p style="display:inline-flex;align-items:center;gap:7px;background:#E8F8EF;color:#007A3D;font-size:12px;font-weight:700;padding:5px 14px;border-radius:999px;letter-spacing:.04em;text-transform:uppercase;margin-bottom:16px;">
                <i class="fas fa-box"></i> ${userTypeLabel} KIT
            </p>
            <div class="kit-amount">
                <span style="font-size:18px;font-weight:700;color:#007A3D;align-self:flex-start;margin-top:10px;">KES</span>
                <h2>${amount.toLocaleString()}</h2>
            </div>
            <div class="kit-items">
                <h4><i class="fas fa-gift" style="color:#00A651;margin-right:6px;"></i>What's Included</h4>
                <ul>${kitItemsHTML}</ul>
            </div>
            ${description ? `<p class="kit-description">${description}</p>` : ''}
        </div>
        
        <div class="payment-form">
            <h3>Choose Your Payment Method</h3>
            <div class="payment-method-selector">
                <div class="method-option" data-method="mpesa-stk" tabindex="0" role="button" aria-label="Pay with M-Pesa STK Push">
                    <div class="method-icon"><i class="fas fa-bolt"></i></div>
                    <h4>M-Pesa STK Push</h4>
                    <p>Get a payment prompt on your phone &mdash; instant &amp; secure</p>
                </div>
            </div>
            
            <form id="kitPaymentForm" style="display: none;">
                <input type="hidden" id="paymentMethod" value="">
                
                <div id="stkPushSection" style="display: none;">
                    <div class="payment-instructions">
                        <h4>M-Pesa STK Push Payment:</h4>
                        <p>Enter your M-Pesa registered phone number below. You will receive an STK push prompt on your phone to authorize the payment of <strong>KES ${amount.toLocaleString()}</strong>.</p>
                        <div class="alert-info">
                            <i class="fas fa-info-circle"></i>
                            <p>Make sure your phone is on and you have sufficient M-Pesa balance. You will receive a prompt to enter your M-Pesa PIN.</p>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="stkPhoneNumber">M-Pesa Phone Number *</label>
                        <input type="tel" 
                               id="stkPhoneNumber" 
                               name="stkPhoneNumber"
                               value="${phone}" 
                               placeholder="07XX, 01XX or 254X format"
                               maxlength="15" />
                        <small style="color: #6b7280;">Enter in format: 0712345678 or 254712345678</small>
                    </div>
                    
                    <div id="paymentStatusContainer" style="display: none; margin-top: 20px;">
                        <!-- Status updates will appear here -->
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="paymentReference">Payment Reference (Optional)</label>
                    <input type="text" 
                           id="paymentReference" 
                           name="paymentReference"
                           placeholder="Any additional reference" 
                           maxlength="100" 
                           data-sanitize-type="string" />
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" id="backButton">Back</button>
                    <button type="submit" class="btn btn-primary btn-submit" id="submitPaymentBtn">
                        <i class="fas fa-paper-plane"></i> <span id="submitBtnText">Submit Payment</span>
                    </button>
                </div>
            </form>
        </div>
    `;
}

function attachEventListeners() {
    document.querySelectorAll('.method-option').forEach(option => {
        // Mark as selectable on click
        option.addEventListener('click', () => {
            const method = option.dataset.method;
            if (method) {
                // Visually mark selected
                document.querySelectorAll('.method-option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
                selectPaymentMethod(method);
            }
        });
        // Keyboard accessibility
        option.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                option.click();
            }
        });
    });
    
    const backBtn = document.getElementById('backButton');
    if (backBtn) backBtn.addEventListener('click', resetPaymentMethod);
    
    const form = document.getElementById('kitPaymentForm');
    if (form) {
        form.addEventListener('submit', submitKitPayment);
    }

    const submitBtn = document.getElementById('submitPaymentBtn');
    if (submitBtn) {
        submitBtn.addEventListener('click', (e) => {
            e.preventDefault();
            submitKitPayment(e);
        });
    }
}

function selectPaymentMethod(method) {
    try {
        const paymentMethodInput = document.getElementById('paymentMethod');
        const selector = document.querySelector('.payment-method-selector');
        const form = document.getElementById('kitPaymentForm');
        const stkSection = document.getElementById('stkPushSection');
        
        if (!paymentMethodInput || !selector || !form) {
            console.error('Required form elements not found');
            return;
        }
        
        // Only support STK Push now (manual payment removed)
        if (method === 'mpesa-stk') {
            paymentMethodInput.value = method;
            selector.style.display = 'none';
            form.style.display = 'block';
            
            if (stkSection) {
                stkSection.style.display = 'block';
            }
            
            const stkPhoneInput = document.getElementById('stkPhoneNumber');
            if (stkPhoneInput) { 
                stkPhoneInput.required = true; 
                stkPhoneInput.disabled = false;
                stkPhoneInput.removeAttribute('disabled');
                
                setTimeout(() => {
                    stkPhoneInput.focus();
                }, 100);
            }
        } else {
            console.warn('Unsupported payment method:', method);
            toast.error('Only M-Pesa STK Push payment is supported');
        }
    } catch (error) {
        console.error('Error selecting payment method:', error);
        toast.error('Failed to select payment method');
    }
}

function resetPaymentMethod() {
    try {
        const selector = document.querySelector('.payment-method-selector');
        const form = document.getElementById('kitPaymentForm');
        const paymentMethodInput = document.getElementById('paymentMethod');
        
        if (selector && form && paymentMethodInput) {
            selector.style.display = 'grid';
            form.style.display = 'none';
            paymentMethodInput.value = '';
        }
    } catch (error) {
        console.error('Error resetting payment method:', error);
    }
}

async function submitKitPayment(event) {
    event.preventDefault();
    
    try {
        const paymentMethod = document.getElementById('paymentMethod').value;
        
        if (paymentMethod === 'mpesa-stk') {
            // Task 10.2: Implement STK Push initiation flow
            await initiateSTKPushPayment();
        } else {
            toast.error('Invalid payment method selected');
        }
    } catch (error) {
        console.error('Error submitting payment:', error);
        toast.error(error.message || 'Error submitting payment. Please try again or contact support.');
    }
}

// Task 10.2: Implement STK Push initiation flow
async function initiateSTKPushPayment() {
    try {
        // Disable submit button to prevent double submission
        const submitBtn = document.getElementById('submitPaymentBtn');
        const submitBtnText = document.getElementById('submitBtnText');
        const originalText = submitBtnText.textContent;
        submitBtn.disabled = true;
        submitBtnText.textContent = 'Processing...';
        
        // Get and validate phone number
        let phoneNumber = document.getElementById('stkPhoneNumber').value.trim();
        
        if (!phoneNumber) {
            throw new Error('Please enter your M-Pesa phone number');
        }
        
        // Normalize phone number format
        phoneNumber = normalizePhoneNumber(phoneNumber);
        
        if (!phoneNumber) {
            throw new Error('Invalid phone number format. Use format: 0712345678 or 254712345678');
        }
        
        // Check if M-Pesa client is initialized
        const client = getMpesaClient();
        if (!client) {
            throw new Error('Payment service is connecting, please try again in a few seconds.');
        }
        
        // Get kit configuration
        const onboarding = new ComprehensiveOnboarding();
        const kitConfig = await onboarding.getKitConfig(currentApplicationData.user_type);
        if (!kitConfig) throw new Error('Kit configuration not found');
        
        const amount = parseFloat(kitConfig.kit_amount);
        
        // Check rate limiting (client-side check)
        paymentAttempts++;
        if (paymentAttempts > 3) {
            throw new Error('Maximum payment attempts exceeded. Please wait 10 minutes and try again.');
        }
        
        // Show status container
        const statusContainer = document.getElementById('paymentStatusContainer');
        statusContainer.style.display = 'block';
        statusContainer.innerHTML = `
            <div class="payment-status-loading">
                <div class="spinner"></div>
                <p><strong>Initiating payment...</strong></p>
                <p style="color: #6b7280; font-size: 0.9rem;">Please wait while we send the payment request to M-Pesa</p>
            </div>
        `;
        
        // Initiate STK Push
        const result = await client.initiateSTKPush({
            phoneNumber: phoneNumber,
            amount: amount,
            applicationCode: currentApplicationCode,
            userType: currentApplicationData.user_type
        });
        
        if (!result.success) {
            // Handle STK Push initiation error
            submitBtn.disabled = false;
            submitBtnText.textContent = originalText;
            
            // Handle rate limit error (HTTP 429)
            if (result.error === 'RATE_LIMIT_EXCEEDED' || result.code === 429) {
                showRateLimitError(result.message, result.retryAfter || 300);
                return;
            }
            
            // Show error with retry option
            if (paymentAttempts >= 3) {
                showSTKPushError(result.message || result.error, false);
            } else {
                showSTKPushError(result.message || result.error, true);
            }
            return;
        }
        
        // Store checkout request ID for status tracking
        currentCheckoutRequestId = result.checkoutRequestId;
        
        // Show success message - check phone for prompt
        statusContainer.innerHTML = `
            <div class="payment-status-sent">
                <i class="fas fa-check-circle" style="color: #10b981; font-size: 48px;"></i>
                <p><strong>Payment request sent!</strong></p>
                <p style="color: #6b7280;">Check your phone (${XSSProtection.escapeHtml(maskPhoneNumber(phoneNumber))}) for the M-Pesa prompt</p>
                <p style="color: #6b7280; font-size: 0.9rem;">Enter your M-Pesa PIN to complete the payment</p>
            </div>
        `;
        
        // Hide submit button during polling
        submitBtn.style.display = 'none';
        
        // Task 10.3: Start payment status polling
        await startPaymentStatusPolling(result.checkoutRequestId);
        
    } catch (error) {
        console.error('Error initiating STK Push:', error);
        const submitBtn = document.getElementById('submitPaymentBtn');
        const submitBtnText = document.getElementById('submitBtnText');
        submitBtn.disabled = false;
        submitBtnText.textContent = 'Initiate Payment';
        
        // Show error with retry option if not exceeded
        if (paymentAttempts < 3) {
            showSTKPushError(error.message, true);
        } else {
            showSTKPushError(error.message, false);
        }
    }
}

// Task 10.3: Implement payment status polling UI
async function startPaymentStatusPolling(checkoutRequestId) {
    try {
        const statusContainer = document.getElementById('paymentStatusContainer');
        let pollCount = 0;
        const maxPolls = 20; // 60 seconds total
        
        // Show polling status
        statusContainer.innerHTML = `
            <div class="payment-status-polling">
                <div class="spinner"></div>
                <p><strong>Waiting for payment confirmation...</strong></p>
                <p style="color: #6b7280; font-size: 0.9rem;">This may take up to 60 seconds</p>
                <div style="margin-top: 15px;">
                    <div class="progress-bar" style="background: #e5e7eb; height: 4px; border-radius: 2px; overflow: hidden;">
                        <div id="pollProgressBar" style="background: #10b981; height: 100%; width: 0%; transition: width 3s linear;"></div>
                    </div>
                </div>
            </div>
        `;
        
        // Update progress bar
        const updateProgressBar = () => {
            const progressBar = document.getElementById('pollProgressBar');
            if (progressBar) {
                const progress = Math.min((pollCount / maxPolls) * 100, 100);
                progressBar.style.width = `${progress}%`;
            }
        };
        
        // Poll for status using mpesaClient
        pollInterval = setInterval(() => {
            pollCount++;
            updateProgressBar();
        }, 3000);
        
        const result = await mpesaClient.pollPaymentStatus(checkoutRequestId, maxPolls);
        
        // Clear polling interval
        if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
        }
        
        // Handle final status
        if (result.success && result.status === 'completed') {
            // Payment successful
            showPaymentSuccess(result.data);
        } else if (result.status === 'failed') {
            // Payment failed
            showPaymentFailed(result.message || 'Payment failed', result.data);
        } else if (result.status === 'timeout') {
            // Payment timed out
            showPaymentTimeout();
        } else {
            // Unknown status or callback missing
            showPaymentUnknownStatus(checkoutRequestId);
        }
        
    } catch (error) {
        console.error('Error polling payment status:', error);
        if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
        }
        showPaymentError('Unable to confirm payment status. Please contact support.', checkoutRequestId);
    }
}

// Helper function to show payment success
function showPaymentSuccess(paymentData) {
    // Replace the entire payment dashboard with a full success page
    const container = document.getElementById('payment-dashboard');
    if (!container) return;
    
    const receiptNumber = XSSProtection.escapeHtml(sanitizeHTML(paymentData?.mpesaReceiptNumber || paymentData?.receipt || 'N/A'));
    const amount = paymentData?.amount || 0;
    const method = XSSProtection.escapeHtml(sanitizeHTML(paymentData?.method || 'M-Pesa'));
    const now = new Date().toLocaleString();
    
    container.innerHTML = `
        <div class="success-fullpage">
            <div class="success-confetti-banner">
                <div class="checkmark-ring"><i class="fas fa-check"></i></div>
                <h2>Payment Successful!</h2>
                <p>Your Stokika Kit payment has been received and verified. Welcome to the team!</p>
            </div>
            <div class="success-receipt">
                <h3><i class="fas fa-receipt"></i> Payment Confirmation</h3>
                <div class="receipt-row"><span class="receipt-label">Amount Paid</span><span class="receipt-value green">KES ${XSSProtection.escapeHtml(amount.toLocaleString())}</span></div>
                <div class="receipt-row"><span class="receipt-label">M-Pesa Receipt</span><span class="receipt-value">${receiptNumber}</span></div>
                <div class="receipt-row"><span class="receipt-label">Application Code</span><span class="receipt-value">${XSSProtection.escapeHtml(currentApplicationCode || '')}</span></div>
                <div class="receipt-row"><span class="receipt-label">Payment Date</span><span class="receipt-value">${XSSProtection.escapeHtml(now)}</span></div>
                <div class="receipt-row"><span class="receipt-label">Status</span><span class="receipt-value badge-pill">Confirmed</span></div>
            </div>
            <div class="success-nextsteps">
                <h3><i class="fas fa-list-check"></i> What Happens Next</h3>
                <ol>
                    <li>You will receive your <strong>login credentials via email</strong> within 24 hours.</li>
                    <li>Your <strong>Stokika Starter Kit</strong> will be dispatched to your registered address.</li>
                    <li>Check your email (including spam folder) for onboarding instructions.</li>
                    <li>You can start using the Stokika platform once you receive your credentials.</li>
                </ol>
            </div>
            <div class="success-actions">
                <a href="dalana.html" class="btn btn-primary"><i class="fas fa-home"></i> Return to Home</a>
            </div>
        </div>
    `;
    
    // Reset attempts counter
    paymentAttempts = 0;
}

// Helper function to show payment failed
function showPaymentFailed(message, paymentData) {
    const statusContainer = document.getElementById('paymentStatusContainer');
    const submitBtn = document.getElementById('submitPaymentBtn');
    
    // Map error message to user-friendly text
    const friendlyMessage = getUserFriendlyPaymentError(message);
    
    const retryButtonHTML = paymentAttempts < 3 ? `
        <button type="button" class="btn btn-primary" id="retryPaymentBtn" style="margin-top: 15px;">
            <i class="fas fa-redo"></i> Retry Payment
        </button>
    ` : `
        <p style="color: #ef4444; margin-top: 15px;"><strong>Maximum retry attempts reached.</strong> Please wait 10 minutes and try again.</p>
    `;
    
    statusContainer.innerHTML = `
        <div class="payment-status-failed">
            <i class="fas fa-times-circle" style="color: #ef4444; font-size: 48px;"></i>
            <h4 style="color: #ef4444; margin: 15px 0;">Payment Failed</h4>
            <p style="color: #6b7280;">${XSSProtection.escapeHtml(sanitizeHTML(friendlyMessage))}</p>
            <p style="color: #9ca3af; font-size: 0.85rem; margin-top: 10px;">Attempts: ${paymentAttempts}/3</p>
            ${retryButtonHTML}
        </div>
    `;
    
    // Attach retry handler
    if (paymentAttempts < 3) {
        submitBtn.style.display = 'inline-flex';
        const retryBtn = document.getElementById('retryPaymentBtn');
        if (retryBtn) {
            retryBtn.addEventListener('click', retrySTKPushPayment);
        }
    }
}

// Helper function to show payment timeout
function showPaymentTimeout() {
    const statusContainer = document.getElementById('paymentStatusContainer');
    
    const retryButtonHTML = paymentAttempts < 3 ? `
        <button type="button" class="btn btn-primary" id="retryPaymentBtn" style="margin-top: 15px;">
            <i class="fas fa-redo"></i> Try Again
        </button>
    ` : `
        <p style="color: #ef4444; margin-top: 15px;"><strong>Maximum retry attempts reached.</strong> Please wait 10 minutes and try again.</p>
    `;
    
    statusContainer.innerHTML = `
        <div class="payment-status-timeout">
            <i class="fas fa-clock" style="color: #f59e0b; font-size: 48px;"></i>
            <h4 style="color: #f59e0b; margin: 15px 0;">Payment Request Timed Out</h4>
            <p style="color: #6b7280;">You did not enter your M-Pesa PIN in time.</p>
            ${retryButtonHTML}
        </div>
    `;
    
    // Attach retry handler
    if (paymentAttempts < 3) {
        const retryBtn = document.getElementById('retryPaymentBtn');
        if (retryBtn) {
            retryBtn.addEventListener('click', retrySTKPushPayment);
        }
    }
}

// Helper function to show unknown status
function showPaymentUnknownStatus(checkoutRequestId) {
    const statusContainer = document.getElementById('paymentStatusContainer');
    
    statusContainer.innerHTML = `
        <div class="payment-status-unknown">
            <i class="fas fa-question-circle" style="color: #6b7280; font-size: 48px;"></i>
            <h4 style="color: #6b7280; margin: 15px 0;">Unable to Confirm Payment</h4>
            <p style="color: #6b7280;">We couldn't confirm your payment status automatically.</p>
            <p style="color: #6b7280; font-size: 0.9rem;">Your payment may still be processing. Please check your M-Pesa messages or contact support with this reference:</p>
            <p style="background: #f3f4f6; padding: 10px; border-radius: 4px; font-family: monospace; margin: 10px 0;">${XSSProtection.escapeHtml(sanitizeHTML(checkoutRequestId))}</p>
            <button type="button" class="btn btn-primary" id="checkStatusBtn" style="margin-top: 15px;">
                <i class="fas fa-sync"></i> Check Status Again
            </button>
        </div>
    `;
    
    const checkBtn = document.getElementById('checkStatusBtn');
    if (checkBtn) {
        checkBtn.addEventListener('click', () => recheckPaymentStatus(checkoutRequestId));
    }
}

// Helper function to show generic error
function showPaymentError(message, checkoutRequestId) {
    const statusContainer = document.getElementById('paymentStatusContainer');
    
    const referenceHTML = checkoutRequestId ? 
        `<p style="background: #f3f4f6; padding: 10px; border-radius: 4px; font-family: monospace; margin: 10px 0; font-size: 0.9rem;">Reference: ${XSSProtection.escapeHtml(sanitizeHTML(checkoutRequestId))}</p>` 
        : '';
    
    statusContainer.innerHTML = `
        <div class="payment-status-error">
            <i class="fas fa-exclamation-triangle" style="color: #ef4444; font-size: 48px;"></i>
            <h4 style="color: #ef4444; margin: 15px 0;">Error</h4>
            <p style="color: #6b7280;">${XSSProtection.escapeHtml(sanitizeHTML(message))}</p>
            ${referenceHTML}
        </div>
    `;
}

// Helper function to show STK Push error with retry option
function showSTKPushError(message, showRetry = false) {
    const statusContainer = document.getElementById('paymentStatusContainer');
    statusContainer.style.display = 'block';
    
    const retryInfoHTML = showRetry && paymentAttempts < 3 ? 
        `<p style="color: #6b7280; margin-top: 10px;">Attempts: ${paymentAttempts}/3</p>` 
        : '';
    
    statusContainer.innerHTML = `
        <div class="payment-status-error">
            <i class="fas fa-exclamation-triangle" style="color: #ef4444; font-size: 48px;"></i>
            <h4 style="color: #ef4444; margin: 15px 0;">Payment Initiation Failed</h4>
            <p style="color: #6b7280;">${XSSProtection.escapeHtml(sanitizeHTML(message))}</p>
            ${retryInfoHTML}
        </div>
    `;
}

// Helper function to show rate limit error
function showRateLimitError(message, retryAfter) {
    const statusContainer = document.getElementById('paymentStatusContainer');
    statusContainer.style.display = 'block';
    
    const retryMinutes = Math.ceil(retryAfter / 60);
    
    statusContainer.innerHTML = `
        <div class="payment-status-error">
            <i class="fas fa-clock" style="color: #f59e0b; font-size: 48px;"></i>
            <h4 style="color: #f59e0b; margin: 15px 0;">Too Many Payment Attempts</h4>
            <p style="color: #6b7280;">${XSSProtection.escapeHtml(sanitizeHTML(message))}</p>
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="color: #92400e; margin: 0;"><strong>Rate Limit Exceeded</strong></p>
                <p style="color: #92400e; margin: 5px 0 0 0;">Please wait ${retryMinutes} minute${retryMinutes !== 1 ? 's' : ''} before trying again.</p>
            </div>
        </div>
    `;
    
    // Disable payment button
    const submitBtn = document.getElementById('submitPaymentBtn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.display = 'none';
    }
}

// Implement retry payment flow
async function retrySTKPushPayment() {
    console.log('Retrying STK Push payment, attempt:', paymentAttempts + 1);
    
    // Check rate limit
    if (paymentAttempts >= 3) {
        toast.error('Maximum retry attempts exceeded. Please wait 10 minutes before trying again.');
        return;
    }
    
    // Reset UI and retry
    const statusContainer = document.getElementById('paymentStatusContainer');
    statusContainer.textContent = '';
    statusContainer.style.display = 'none';
    
    const submitBtn = document.getElementById('submitPaymentBtn');
    submitBtn.style.display = 'inline-flex';
    submitBtn.disabled = false;
    
    // Trigger payment submission again
    await initiateSTKPushPayment();
}

// Helper function to recheck payment status
async function recheckPaymentStatus(checkoutRequestId) {
    try {
        const statusContainer = document.getElementById('paymentStatusContainer');
        statusContainer.innerHTML = `
            <div class="payment-status-loading">
                <div class="spinner"></div>
                <p><strong>Checking payment status...</strong></p>
            </div>
        `;
        
        const result = await mpesaClient.checkPaymentStatus(checkoutRequestId);
        
        if (result.success) {
            if (result.status === 'completed' || result.status === 'verified') {
                showPaymentSuccess(result.data);
            } else if (result.status === 'failed') {
                showPaymentFailed('Payment failed', result.data);
            } else {
                showPaymentUnknownStatus(checkoutRequestId);
            }
        } else {
            showPaymentError('Unable to check payment status', checkoutRequestId);
        }
    } catch (error) {
        console.error('Error rechecking status:', error);
        showPaymentError('Error checking payment status', checkoutRequestId);
    }
}

// Helper function to normalize phone number to 254XXXXXXXXX format
function normalizePhoneNumber(phone) {
    if (!phone) return null;
    
    // Use the InputSanitizer if available
    if (typeof InputSanitizer !== 'undefined') {
        const sanitized = InputSanitizer.sanitizePhone(phone);
        return sanitized || null;
    }
    
    // Fallback: Remove all non-numeric characters
    let clean = phone.replace(/\D/g, '');
    
    // Handle different formats
    if (clean.startsWith('0') && clean.length === 10) {
        const secondDigit = clean.charAt(1);
        if (secondDigit === '7' || secondDigit === '1') {
            return '254' + clean.substring(1);
        }
        return null;
    } else if (clean.startsWith('254') && clean.length === 12) {
        const fourthDigit = clean.charAt(3);
        if (fourthDigit === '7' || fourthDigit === '1') {
            return clean;
        }
        return null;
    }
    
    return null;
}

async function initializeTokenPayment(token) {
    toast.info('Token-based payment not supported. Please use the direct payment link.');
}

function showError(message) {
    toast.error(message);
}
