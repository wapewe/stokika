let currentApplicationCode = null;
let currentApplicationData = null;
let mpesaClient = null;
let currentCheckoutRequestId = null;
let paymentAttempts = 0;
let pollInterval = null;

// Sanitize HTML to prevent XSS
function sanitizeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Show user message
function showUserMessage(message, type = 'error') {
    const container = document.getElementById('payment-dashboard');
    if (!container) {
        console.error('Payment dashboard container not found');
        return;
    }
    
    const icons = { error: 'fas fa-exclamation-triangle', success: 'fas fa-check-circle', info: 'fas fa-info-circle' };
    const colors = { error: '#ef4444', success: '#10b981', info: '#3b82f6' };
    
    container.innerHTML = XSSProtection.sanitize(`
        <div class="error-container">
            <i class="${XSSProtection.escapeHtml(icons[type])}" style="color: ${XSSProtection.escapeHtml(colors[type])}"></i>
            <h3>${XSSProtection.escapeHtml(type === 'error' ? 'Payment Error' : 'Information')}</h3>
            <p>${XSSProtection.escapeHtml(sanitizeHTML(message))}</p>
            <a href="../dalana.html" class="btn btn-primary">Return to Home</a>
        </div>
    `);
}

// Initialize the page
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize M-Pesa client (Task 10.1)
        const supabase = initSupabase();
        if (supabase) {
            mpesaClient = new MpesaIntegrationClient(supabase);
            console.log('M-Pesa integration client initialized');
        }
        
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        
        if (code) {
            currentApplicationCode = code;
            await verifyAndLoadPayment(code);
        } else {
            // Show code entry section
            document.getElementById('code-entry-section').style.display = 'block';
            document.getElementById('payment-dashboard').style.display = 'none';
            
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
    const codeInput = document.getElementById('applicationCodeInput');
    const code = codeInput.value.trim().toUpperCase();
    
    if (!code) {
        alert('Please enter your application code');
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
        
        // Check field agents table
        let { data: application, error: agentError } = await supabase
            .from('field_agents')
            .select('*')
            .eq('application_code', code)
            .single();
        
        let userType = 'field_agent';
        
        // If not found in field agents, check supervisors
        if (agentError || !application) {
            const { data: supData, error: supError } = await supabase
                .from('supervisors')
                .select('*')
                .eq('application_code', code)
                .single();
            
            if (supError || !supData) {
                throw new Error('Invalid application code. Please check and try again.');
            }
            
            application = supData;
            userType = 'supervisor';
        }
        
        if (!application) throw new Error('Application not found');
        
        currentApplicationData = { ...application, user_type: userType };
        
        const onboarding = new ComprehensiveOnboarding();
        const kitConfig = await onboarding.getKitConfig(userType);
        if (!kitConfig) throw new Error('Kit configuration not found for user type');
        
        // Check existing payment by application code
        const { data: existingPayment } = await supabase
            .from('stokika_kit_payments')
            .select('*')
            .eq('application_code', code)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        
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
        if (existingPayment?.payment_status === 'verified') {
            renderVerifiedPayment(container, existingPayment);
        } else if (existingPayment?.payment_status === 'pending') {
            renderPendingPayment(container, existingPayment);
        } else if (existingPayment?.payment_status === 'rejected') {
            renderRejectedPayment(container, existingPayment, user, kitConfig);
        } else {
            const formHTML = renderPaymentForm(application, kitConfig);
            container.innerHTML = XSSProtection.sanitize(formHTML);
            attachEventListeners();
        }
    } catch (error) {
        console.error('Error rendering dashboard:', error);
        showUserMessage('Failed to display payment form');
    }
}

function renderVerifiedPayment(container, payment) {
    const amount = parseFloat(payment.kit_amount) || 0;
    const method = sanitizeHTML(payment.payment_method || 'N/A');
    const verifiedDate = payment.verified_at ? new Date(payment.verified_at).toLocaleString() : 'N/A';
    
    container.innerHTML = XSSProtection.sanitize(`
        <div class="payment-success">
            <i class="fas fa-check-circle" style="font-size: 64px; color: #00897b;"></i>
            <h2>Payment Verified!</h2>
            <p>Your Stokika Kit payment has been verified.</p>
            <p>Your account is now active. You will receive login credentials via email shortly.</p>
            <div>
                <p><strong>Payment Amount:</strong> KES ${XSSProtection.escapeHtml(amount.toLocaleString())}</p>
                <p><strong>Payment Method:</strong> ${XSSProtection.escapeHtml(method.toUpperCase())}</p>
                <p><strong>Verified On:</strong> ${XSSProtection.escapeHtml(verifiedDate)}</p>
            </div>
        </div>
    `);
}

function renderPendingPayment(container, payment) {
    const amount = parseFloat(payment.kit_amount) || 0;
    const method = sanitizeHTML(payment.payment_method || 'N/A');
    const mpesaCode = payment.mpesa_code ? sanitizeHTML(payment.mpesa_code) : null;
    const submittedDate = payment.created_at ? new Date(payment.created_at).toLocaleString() : 'N/A';
    
    container.innerHTML = XSSProtection.sanitize(`
        <div class="payment-pending">
            <i class="fas fa-clock" style="font-size: 64px; color: #ffc107;"></i>
            <h2>Payment Pending Verification</h2>
            <p>Your payment has been submitted and is awaiting admin verification.</p>
            <div>
                <p><strong>Payment Amount:</strong> KES ${XSSProtection.escapeHtml(amount.toLocaleString())}</p>
                <p><strong>Payment Method:</strong> ${XSSProtection.escapeHtml(method.toUpperCase())}</p>
                ${mpesaCode ? `<p><strong>M-Pesa Code:</strong> ${XSSProtection.escapeHtml(mpesaCode)}</p>` : ''}
                <p><strong>Submitted On:</strong> ${XSSProtection.escapeHtml(submittedDate)}</p>
            </div>
            <p style="margin-top: 20px; color: #666;">You will be notified once your payment is verified.</p>
        </div>
    `);
}

function renderRejectedPayment(container, payment, application, kitConfig) {
    const reason = sanitizeHTML(payment.rejection_reason || 'Not specified');
    
    const formHTML = renderPaymentForm(application, kitConfig);
    container.innerHTML = XSSProtection.sanitize(`
        <div class="payment-rejected">
            <i class="fas fa-times-circle" style="font-size: 64px; color: #ef4444;"></i>
            <h2>Payment Rejected</h2>
            <p>Your payment was rejected by the admin.</p>
            <div>
                <p><strong>Rejection Reason:</strong> ${XSSProtection.escapeHtml(reason)}</p>
            </div>
            <p style="margin-top: 20px;">Please submit a new payment below:</p>
        </div>
        ${formHTML}
    `);
    attachEventListeners();
}

function renderPaymentForm(application, kitConfig) {
    const userType = sanitizeHTML(application.user_type || 'user');
    const amount = parseFloat(kitConfig.kit_amount) || 0;
    const description = sanitizeHTML(kitConfig.description || '');
    const phone = sanitizeHTML(application.phone || '');
    const applicantName = sanitizeHTML(application.full_name || 'Applicant');
    
    let kitItemsHTML = '';
    if (Array.isArray(kitConfig.kit_items)) {
        kitItemsHTML = kitConfig.kit_items
            .map(item => `<li><i class="fas fa-check"></i> ${sanitizeHTML(item)}</li>`)
            .join('');
    }
    
    return `
        <div class="kit-details">
            <h3>Welcome, ${applicantName}!</h3>
            <p style="color: #6b7280; margin-bottom: 1rem;">Application Code: <strong>${sanitizeHTML(currentApplicationCode)}</strong></p>
            <h3>Your ${userType.replace('_', ' ').toUpperCase()} Kit</h3>
            <div class="kit-amount">
                <h2>KES ${amount.toLocaleString()}</h2>
            </div>
            <div class="kit-items">
                <h4>What's Included:</h4>
                <ul>${kitItemsHTML}</ul>
            </div>
            <p class="kit-description">${description}</p>
        </div>
        
        <div class="payment-form">
            <h3>Choose Payment Method</h3>
            
            <div class="payment-method-selector">
                <div class="method-option" data-method="mpesa-stk">
                    <div class="method-icon"><i class="fas fa-bolt"></i></div>
                    <h4>Pay with M-Pesa STK Push</h4>
                    <p>Receive a prompt on your phone to authorize payment instantly</p>
                </div>
                <div class="method-option" data-method="manual">
                    <div class="method-icon"><i class="fas fa-mobile-alt"></i></div>
                    <h4>Manual M-Pesa Paybill</h4>
                    <p>Pay via M-Pesa Paybill and enter transaction code</p>
                </div>
            </div>
            
            <form id="kitPaymentForm" data-sanitize="true" style="display: none;">
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
                                placeholder="07XX, 01XX or 254X format" data-sanitize-type="phone" 
                               maxlength="15" 
                               data-sanitize-type="phone"
                               required />
                        <small style="color: #6b7280;">Enter in format: 0712345678 or 254712345678</small>
                    </div>
                    
                    <div id="paymentStatusContainer" style="display: none; margin-top: 20px;">
                        <!-- Status updates will appear here -->
                    </div>
                </div>
                
                <div id="manualPaymentSection" style="display: none;">
                    <div class="payment-instructions">
                        <h4>M-Pesa Paybill Payment Instructions:</h4>
                        <ol>
                            <li>Go to M-Pesa menu on your phone</li>
                            <li>Select <strong>Lipa na M-Pesa</strong></li>
                            <li>Select <strong>Pay Bill</strong></li>
                            <li>Enter Business Number: <strong>1140839</strong></li>
                            <li>Enter Account Number: <strong>${sanitizeHTML(currentApplicationCode)}</strong></li>
                            <li>Enter Amount: <strong>KES ${amount.toLocaleString()}</strong></li>
                            <li>Enter your M-Pesa PIN and confirm</li>
                            <li>You will receive a confirmation SMS with transaction code</li>
                            <li>Enter the transaction code below</li>
                        </ol>
                    </div>
                    
                    <div class="form-group">
                        <label for="mpesaCode">M-Pesa Transaction Code *</label>
                        <input type="text" 
                               id="mpesaCode" 
                               name="mpesaCode"
                               placeholder="e.g., QA12BC3456" 
                               maxlength="20" 
                               data-sanitize-type="alphanumeric"
                               required />
                        <small style="color: #6b7280;">The 10-character code from your M-Pesa confirmation SMS</small>
                    </div>
                    <div class="form-group">
                        <label for="phoneNumber">Phone Number Used *</label>
                        <input type="tel" 
                               id="phoneNumber" 
                               name="phoneNumber"
                               value="${phone}" 
                                placeholder="07XX, 01XX or 254X format" data-sanitize-type="phone" 
                               maxlength="15" 
                               data-sanitize-type="phone"
                               required />
                        <small style="color: #6b7280;">Enter in format: 0712345678 or 254712345678</small>
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
        option.addEventListener('click', () => {
            const method = option.dataset.method;
            if (method) selectPaymentMethod(method);
        });
    });
    
    const backBtn = document.getElementById('backButton');
    if (backBtn) backBtn.addEventListener('click', resetPaymentMethod);
    
    const form = document.getElementById('kitPaymentForm');
    if (form) {
        form.addEventListener('submit', submitKitPayment);
        
        // Initialize input sanitizer for the payment form
        if (window.InputSanitizer) {
            try {
                window.InputSanitizer.initForm('#kitPaymentForm');
                console.log('Input sanitizer initialized for kit payment form');
            } catch (error) {
                console.error('Error initializing input sanitizer:', error);
            }
        }
    }
}

function selectPaymentMethod(method) {
    try {
        const paymentMethodInput = document.getElementById('paymentMethod');
        const selector = document.querySelector('.payment-method-selector');
        const form = document.getElementById('kitPaymentForm');
        const manualSection = document.getElementById('manualPaymentSection');
        const stkSection = document.getElementById('stkPushSection');
        
        if (!paymentMethodInput || !selector || !form) {
            console.error('Required form elements not found');
            return;
        }
        
        paymentMethodInput.value = method;
        selector.style.display = 'none';
        form.style.display = 'block';
        
        if (method === 'manual') {
            manualSection.style.display = 'block';
            stkSection.style.display = 'none';
            document.getElementById('mpesaCode').required = true;
            document.getElementById('phoneNumber').required = true;
            document.getElementById('stkPhoneNumber').required = false;
        } else if (method === 'mpesa-stk') {
            manualSection.style.display = 'none';
            stkSection.style.display = 'block';
            document.getElementById('stkPhoneNumber').required = true;
            document.getElementById('mpesaCode').required = false;
            document.getElementById('phoneNumber').required = false;
        }
    } catch (error) {
        console.error('Error selecting payment method:', error);
        showUserMessage('Failed to select payment method');
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
        } else if (paymentMethod === 'manual') {
            // Task 10.5: Implement manual payment submission
            await submitManualPaymentVerification();
        } else {
            showUserMessage('Invalid payment method selected', 'error');
        }
    } catch (error) {
        console.error('Error submitting payment:', error);
        showUserMessage(error.message || 'Error submitting payment. Please try again or contact support.', 'error');
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
        if (!mpesaClient) {
            throw new Error('M-Pesa integration not available. Please try manual payment.');
        }
        
        // Get kit configuration
        const onboarding = new ComprehensiveOnboarding();
        const kitConfig = await onboarding.getKitConfig(currentApplicationData.user_type);
        if (!kitConfig) throw new Error('Kit configuration not found');
        
        const amount = parseFloat(kitConfig.kit_amount);
        
        // Check rate limiting (client-side check)
        paymentAttempts++;
        if (paymentAttempts > 3) {
            throw new Error('Maximum payment attempts exceeded. Please try again in 10 minutes or use manual payment.');
        }
        
        // Show status container
        const statusContainer = document.getElementById('paymentStatusContainer');
        statusContainer.style.display = 'block';
        statusContainer.innerHTML = XSSProtection.sanitize(`
            <div class="payment-status-loading">
                <div class="spinner"></div>
                <p><strong>Initiating payment...</strong></p>
                <p style="color: #6b7280; font-size: 0.9rem;">Please wait while we send the payment request to M-Pesa</p>
            </div>
        `);
        
        // Initiate STK Push
        const result = await mpesaClient.initiateSTKPush({
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
            
            // Task 10.4: Check if should offer retry or manual payment
            if (paymentAttempts >= 3) {
                showSTKPushFailureWithManualOption(result.message || result.error);
            } else {
                showSTKPushError(result.message || result.error, true);
            }
            return;
        }
        
        // Store checkout request ID for status tracking
        currentCheckoutRequestId = result.checkoutRequestId;
        
        // Show success message - check phone for prompt
        statusContainer.innerHTML = XSSProtection.sanitize(`
            <div class="payment-status-sent">
                <i class="fas fa-check-circle" style="color: #10b981; font-size: 48px;"></i>
                <p><strong>Payment request sent!</strong></p>
                <p style="color: #6b7280;">Check your phone (${XSSProtection.escapeHtml(maskPhoneNumber(phoneNumber))}) for the M-Pesa prompt</p>
                <p style="color: #6b7280; font-size: 0.9rem;">Enter your M-Pesa PIN to complete the payment</p>
            </div>
        `);
        
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
        
        // Task 10.4: Show error with retry option if not exceeded
        if (paymentAttempts < 3) {
            showSTKPushError(error.message, true);
        } else {
            showSTKPushFailureWithManualOption(error.message);
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
        statusContainer.innerHTML = XSSProtection.sanitize(`
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
        `);
        
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
    const statusContainer = document.getElementById('paymentStatusContainer');
    const receiptNumber = paymentData?.mpesaReceiptNumber || 'N/A';
    const amount = paymentData?.amount || 0;
    
    statusContainer.innerHTML = XSSProtection.sanitize(`
        <div class="payment-status-success">
            <i class="fas fa-check-circle" style="color: #10b981; font-size: 64px;"></i>
            <h3 style="color: #10b981; margin: 15px 0;">Payment Successful!</h3>
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>M-Pesa Receipt:</strong> ${XSSProtection.escapeHtml(sanitizeHTML(receiptNumber))}</p>
                <p><strong>Amount Paid:</strong> KES ${XSSProtection.escapeHtml(amount.toLocaleString())}</p>
            </div>
            <p style="color: #6b7280;">Your kit payment has been confirmed. You will receive account activation details via email shortly.</p>
            <p style="color: #6b7280; font-size: 0.9rem; margin-top: 15px;">You can close this page now.</p>
        </div>
    `);
    
    // Reset attempts counter
    paymentAttempts = 0;
}

// Helper function to show payment failed
function showPaymentFailed(message, paymentData) {
    const statusContainer = document.getElementById('paymentStatusContainer');
    const submitBtn = document.getElementById('submitPaymentBtn');
    
    const retryButtonHTML = paymentAttempts < 3 ? `
        <button type="button" class="btn btn-primary" id="retryPaymentBtn" style="margin-top: 15px;">
            <i class="fas fa-redo"></i> Retry Payment
        </button>
    ` : `
        <p style="color: #f59e0b; margin-top: 15px;"><strong>Maximum retry attempts reached.</strong> Please try manual payment below.</p>
    `;
    
    statusContainer.innerHTML = XSSProtection.sanitize(`
        <div class="payment-status-failed">
            <i class="fas fa-times-circle" style="color: #ef4444; font-size: 48px;"></i>
            <h4 style="color: #ef4444; margin: 15px 0;">Payment Failed</h4>
            <p style="color: #6b7280;">${XSSProtection.escapeHtml(sanitizeHTML(message))}</p>
            ${retryButtonHTML}
        </div>
    `);
    
    // Task 10.4: Attach retry handler
    if (paymentAttempts < 3) {
        submitBtn.style.display = 'inline-flex';
        const retryBtn = document.getElementById('retryPaymentBtn');
        if (retryBtn) {
            retryBtn.addEventListener('click', retrySTKPushPayment);
        }
    } else {
        // Task 10.5: Show manual payment option
        showManualPaymentFallback();
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
        <p style="color: #f59e0b; margin-top: 15px;"><strong>Maximum retry attempts reached.</strong> Please try manual payment below.</p>
    `;
    
    statusContainer.innerHTML = XSSProtection.sanitize(`
        <div class="payment-status-timeout">
            <i class="fas fa-clock" style="color: #f59e0b; font-size: 48px;"></i>
            <h4 style="color: #f59e0b; margin: 15px 0;">Payment Request Timed Out</h4>
            <p style="color: #6b7280;">You did not enter your M-Pesa PIN in time.</p>
            ${retryButtonHTML}
        </div>
    `);
    
    // Task 10.4: Attach retry handler
    if (paymentAttempts < 3) {
        const retryBtn = document.getElementById('retryPaymentBtn');
        if (retryBtn) {
            retryBtn.addEventListener('click', retrySTKPushPayment);
        }
    } else {
        // Task 10.5: Show manual payment option
        showManualPaymentFallback();
    }
}

// Helper function to show unknown status
function showPaymentUnknownStatus(checkoutRequestId) {
    const statusContainer = document.getElementById('paymentStatusContainer');
    
    statusContainer.innerHTML = XSSProtection.sanitize(`
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
    `);
    
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
    
    statusContainer.innerHTML = XSSProtection.sanitize(`
        <div class="payment-status-error">
            <i class="fas fa-exclamation-triangle" style="color: #ef4444; font-size: 48px;"></i>
            <h4 style="color: #ef4444; margin: 15px 0;">Error</h4>
            <p style="color: #6b7280;">${XSSProtection.escapeHtml(sanitizeHTML(message))}</p>
            ${referenceHTML}
        </div>
    `);
}

// Helper function to show STK Push error with retry option
function showSTKPushError(message, showRetry = false) {
    const statusContainer = document.getElementById('paymentStatusContainer');
    statusContainer.style.display = 'block';
    
    const retryInfoHTML = showRetry && paymentAttempts < 3 ? 
        `<p style="color: #6b7280; margin-top: 10px;">Attempts: ${paymentAttempts}/3</p>` 
        : '';
    
    statusContainer.innerHTML = XSSProtection.sanitize(`
        <div class="payment-status-error">
            <i class="fas fa-exclamation-triangle" style="color: #ef4444; font-size: 48px;"></i>
            <h4 style="color: #ef4444; margin: 15px 0;">Payment Initiation Failed</h4>
            <p style="color: #6b7280;">${XSSProtection.escapeHtml(sanitizeHTML(message))}</p>
            ${retryInfoHTML}
        </div>
    `);
}

// Helper function to show STK failure with manual option
function showSTKPushFailureWithManualOption(message) {
    const statusContainer = document.getElementById('paymentStatusContainer');
    statusContainer.style.display = 'block';
    
    statusContainer.innerHTML = XSSProtection.sanitize(`
        <div class="payment-status-error">
            <i class="fas fa-exclamation-triangle" style="color: #ef4444; font-size: 48px;"></i>
            <h4 style="color: #ef4444; margin: 15px 0;">STK Push Unavailable</h4>
            <p style="color: #6b7280;">${XSSProtection.escapeHtml(sanitizeHTML(message))}</p>
            <p style="color: #f59e0b; margin-top: 15px;"><strong>Maximum retry attempts reached.</strong></p>
            <p style="color: #6b7280;">Please use the manual payment option below.</p>
            <button type="button" class="btn btn-primary" id="switchToManualBtn" style="margin-top: 15px;">
                <i class="fas fa-hand-holding-usd"></i> Use Manual Payment
            </button>
        </div>
    `);
    const switchBtn = document.getElementById('switchToManualBtn');
    if (switchBtn) {
        switchBtn.addEventListener('click', showManualPaymentFallback);
    }
}

// Helper function to show rate limit error (Task 40)
function showRateLimitError(message, retryAfter) {
    const statusContainer = document.getElementById('paymentStatusContainer');
    statusContainer.style.display = 'block';
    
    const retryMinutes = Math.ceil(retryAfter / 60);
    
    statusContainer.innerHTML = XSSProtection.sanitize(`
        <div class="payment-status-error">
            <i class="fas fa-clock" style="color: #f59e0b; font-size: 48px;"></i>
            <h4 style="color: #f59e0b; margin: 15px 0;">Too Many Payment Attempts</h4>
            <p style="color: #6b7280;">${XSSProtection.escapeHtml(sanitizeHTML(message))}</p>
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="color: #92400e; margin: 0;"><strong>Rate Limit Exceeded</strong></p>
                <p style="color: #92400e; margin: 5px 0 0 0;">Please wait ${retryMinutes} minute${retryMinutes !== 1 ? 's' : ''} before trying again, or use the manual payment option below.</p>
            </div>
            <button type="button" class="btn btn-primary" id="switchToManualBtn" style="margin-top: 15px;">
                <i class="fas fa-hand-holding-usd"></i> Use Manual Payment Instead
            </button>
        </div>
    `);
    
    const switchBtn = document.getElementById('switchToManualBtn');
    if (switchBtn) {
        switchBtn.addEventListener('click', showManualPaymentFallback);
    }
    
    // Disable payment button and show countdown
    const submitBtn = document.getElementById('submitPaymentBtn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.display = 'none';
    }
}

// Task 10.4: Implement retry payment flow
async function retrySTKPushPayment() {
    console.log('Retrying STK Push payment, attempt:', paymentAttempts + 1);
    
    // Check rate limit
    if (paymentAttempts >= 3) {
        showUserMessage('Maximum retry attempts exceeded. Please wait 10 minutes or use manual payment.', 'error');
        showManualPaymentFallback();
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
        statusContainer.innerHTML = XSSProtection.sanitize(`
            <div class="payment-status-loading">
                <div class="spinner"></div>
                <p><strong>Checking payment status...</strong></p>
            </div>
        `);
        
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

// Task 10.5: Implement manual payment submission UI
function showManualPaymentFallback() {
    // Switch to manual payment method
    const manualSection = document.getElementById('manualPaymentSection');
    const stkSection = document.getElementById('stkPushSection');
    const paymentMethodInput = document.getElementById('paymentMethod');
    const submitBtn = document.getElementById('submitPaymentBtn');
    const submitBtnText = document.getElementById('submitBtnText');
    
    if (manualSection && stkSection) {
        stkSection.style.display = 'none';
        manualSection.style.display = 'block';
        paymentMethodInput.value = 'manual';
        submitBtn.style.display = 'inline-flex';
        submitBtn.disabled = false;
        submitBtnText.textContent = 'Submit Payment';
        
        // Set required fields
        document.getElementById('mpesaCode').required = true;
        document.getElementById('phoneNumber').required = true;
        document.getElementById('stkPhoneNumber').required = false;
        
        // Scroll to manual section
        manualSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Task 10.5: Submit manual payment verification
async function submitManualPaymentVerification() {
    try {
        const submitBtn = document.getElementById('submitPaymentBtn');
        const submitBtnText = document.getElementById('submitBtnText');
        const originalText = submitBtnText.textContent;
        submitBtn.disabled = true;
        submitBtnText.textContent = 'Submitting...';
        
        const mpesaCode = document.getElementById('mpesaCode').value.trim();
        let phoneNumber = document.getElementById('phoneNumber').value.trim();
        const paymentReference = document.getElementById('paymentReference').value.trim() || null;
        
        if (!mpesaCode || !phoneNumber) {
            throw new Error('Please enter M-Pesa transaction code and phone number');
        }
        
        // Validate receipt code format (10 alphanumeric characters)
        const receiptRegex = /^[A-Z0-9]{10}$/i;
        if (!receiptRegex.test(mpesaCode)) {
            throw new Error('Invalid M-Pesa receipt code format. Should be 10 alphanumeric characters (e.g., QA12BC3456)');
        }
        
        // Normalize phone number
        phoneNumber = normalizePhoneNumber(phoneNumber);
        if (!phoneNumber) {
            throw new Error('Invalid phone number format. Use format: 0712345678 or 254712345678');
        }
        
        // Get kit configuration
        const onboarding = new ComprehensiveOnboarding();
        const kitConfig = await onboarding.getKitConfig(currentApplicationData.user_type);
        if (!kitConfig) throw new Error('Kit configuration not found');
        
        const amount = parseFloat(kitConfig.kit_amount);
        
        // Use mpesaClient if available, otherwise fallback to database
        if (mpesaClient) {
            const result = await mpesaClient.submitManualPayment({
                applicationCode: currentApplicationCode,
                mpesaCode: mpesaCode,
                phoneNumber: phoneNumber,
                amount: amount
            });
            
            if (!result.success) {
                // Handle rate limit error (HTTP 429)
                if (result.error === 'RATE_LIMIT_EXCEEDED' || result.code === 429) {
                    submitBtn.disabled = false;
                    submitBtnText.textContent = originalText;
                    showRateLimitError(result.message, result.retryAfter || 300);
                    return;
                }
                
                throw new Error(result.message || 'Failed to submit payment for verification');
            }
            
            // Show success message
            showManualPaymentSubmitted(mpesaCode, amount);
        } else {
            // Fallback: Direct database insert
            const supabase = initSupabase();
            if (!supabase) throw new Error('Database connection failed');
            
            const { error: paymentError } = await supabase
                .from('stokika_kit_payments')
                .insert([{
                    application_code: currentApplicationCode,
                    user_type: currentApplicationData.user_type,
                    phone_number: phoneNumber,
                    amount: amount,
                    payment_method: 'manual_paybill',
                    payment_status: 'awaiting_verification',
                    mpesa_receipt_number: mpesaCode,
                    payment_reference: paymentReference,
                    created_at: new Date().toISOString()
                }]);
            
            if (paymentError) throw paymentError;
            
            // Show success message
            showManualPaymentSubmitted(mpesaCode, amount);
        }
        
    } catch (error) {
        console.error('Error submitting manual payment:', error);
        const submitBtn = document.getElementById('submitPaymentBtn');
        const submitBtnText = document.getElementById('submitBtnText');
        submitBtn.disabled = false;
        submitBtnText.textContent = 'Submit Payment';
        showUserMessage(error.message || 'Error submitting payment. Please try again or contact support.', 'error');
    }
}

// Helper function to show manual payment submitted confirmation
function showManualPaymentSubmitted(receiptCode, amount) {
    const container = document.getElementById('payment-dashboard');
    if (container) {
        container.innerHTML = XSSProtection.sanitize(`
            <div class="payment-submitted">
                <i class="fas fa-check-circle" style="font-size: 64px; color: #10b981; margin-bottom: 20px;"></i>
                <h2>Payment Submitted Successfully!</h2>
                <p>Your manual payment has been submitted and is awaiting admin verification.</p>
                <div style="margin-top: 30px; padding: 20px; background: #f0fdf4; border-radius: 8px;">
                    <p><strong>M-Pesa Receipt Code:</strong> ${XSSProtection.escapeHtml(sanitizeHTML(receiptCode))}</p>
                    <p><strong>Amount:</strong> KES ${XSSProtection.escapeHtml(amount.toLocaleString())}</p>
                    <p><strong>Status:</strong> <span style="color: #f59e0b;">Awaiting Verification</span></p>
                </div>
                <p style="margin-top: 20px; color: #6b7280;">You will receive an email notification once your payment is verified by an administrator.</p>
                <p style="margin-top: 10px; color: #6b7280;">This process typically takes a few hours during business hours.</p>
                <p style="margin-top: 20px; color: #6b7280; font-size: 0.9rem;">You can close this page now.</p>
            </div>
        `);
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
    showUserMessage('Token-based payment not supported. Please use the direct payment link.', 'info');
}

function showError(message) {
    showUserMessage(message, 'error');
}
