// Enhanced Onboarding System with Role-Based Payments and M-Pesa Integration
class EnhancedOnboardingSystem {
    constructor() {
        this.supabase = window.supabase;
        this.currentUser = null;
        this.userRole = null;
        this.entityId = null;
        this.entityType = null;
    }

    async initialize() {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (user) {
                this.currentUser = user;
                await this.determineUserRole();
            }
        } catch (error) {
            console.error('Error initializing onboarding system:', error);
        }
    }

    async determineUserRole() {
        try {
            // Check if user is field agent
            const { data: agent } = await this.supabase
                .from('field_agents')
                .select('id, approval_status')
                .eq('user_id', this.currentUser.id)
                .single();

            if (agent) {
                this.userRole = 'field_agent';
                this.entityId = agent.id;
                this.entityType = 'field_agent';
                return;
            }

            // Check if user is supervisor
            const { data: supervisor } = await this.supabase
                .from('supervisors')
                .select('id, approval_status')
                .eq('user_id', this.currentUser.id)
                .single();

            if (supervisor) {
                this.userRole = 'supervisor';
                this.entityId = supervisor.id;
                this.entityType = 'supervisor';
                return;
            }

            // Check if user is admin
            const { data: userData } = await this.supabase
                .from('users')
                .select('role')
                .eq('id', this.currentUser.id)
                .single();

            if (userData?.role === 'admin') {
                this.userRole = 'admin';
            }
        } catch (error) {
            console.error('Error determining user role:', error);
        }
    }

    async getKitConfiguration(roleType) {
        try {
            const { data, error } = await this.supabase
                .from('kit_configurations')
                .select('*')
                .eq('role_type', roleType)
                .eq('is_active', true)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching kit configuration:', error);
            return null;
        }
    }

    async getUserOnboardingSteps() {
        if (!this.entityId || !this.entityType) return [];

        try {
            const { data, error } = await this.supabase
                .from('onboarding_steps')
                .select('*')
                .eq('entity_type', this.entityType)
                .eq('entity_id', this.entityId)
                .order('step_number');

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching onboarding steps:', error);
            return [];
        }
    }

    async getKitPaymentStatus() {
        if (!this.entityId || !this.entityType) return null;

        try {
            const { data, error } = await this.supabase
                .from('kit_payments')
                .select(`
                    *,
                    mpesa_transactions (*)
                `)
                .eq('entity_type', this.entityType)
                .eq('entity_id', this.entityId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return data;
        } catch (error) {
            console.error('Error fetching payment status:', error);
            return null;
        }
    }

    async initiateKitPayment(paymentMethod = 'manual') {
        if (!this.entityId || !this.entityType) {
            throw new Error('User not properly identified');
        }

        const kitConfig = await this.getKitConfiguration(this.userRole);
        if (!kitConfig) {
            throw new Error('Kit configuration not found');
        }

        try {
            // Create kit payment record
            const { data: payment, error: paymentError } = await this.supabase
                .from('kit_payments')
                .insert({
                    entity_type: this.entityType,
                    entity_id: this.entityId,
                    role_type: this.userRole,
                    payment_amount: kitConfig.payment_amount,
                    phone_number: this.getPhoneNumber(),
                    kit_items: kitConfig.kit_items,
                    status: 'pending'
                })
                .select()
                .single();

            if (paymentError) throw paymentError;

            if (paymentMethod === 'automatic') {
                return await this.initiateSTKPush(payment.id, kitConfig.payment_amount);
            }

            return {
                success: true,
                paymentId: payment.id,
                amount: kitConfig.payment_amount,
                message: 'Payment record created. Please complete M-Pesa payment manually.'
            };
        } catch (error) {
            console.error('Error initiating payment:', error);
            throw error;
        }
    }

    async initiateSTKPush(paymentId, amount) {
        try {
            const phoneNumber = this.getPhoneNumber();
            
            // Create M-Pesa transaction record
            const { data: transaction, error: transError } = await this.supabase
                .from('mpesa_transactions')
                .insert({
                    kit_payment_id: paymentId,
                    transaction_type: 'payment',
                    phone_number: phoneNumber,
                    amount: amount,
                    account_reference: `STOKIKA-${paymentId.substring(0, 8)}`,
                    transaction_desc: `Stokika Kit Payment - ${this.userRole}`,
                    status: 'pending'
                })
                .select()
                .single();

            if (transError) throw transError;

            // Here you would integrate with M-Pesa STK Push API
            // For now, we'll simulate the process
            const stkResponse = await this.simulateSTKPush(phoneNumber, amount, transaction.id);
            
            return {
                success: true,
                transactionId: transaction.id,
                checkoutRequestId: stkResponse.checkoutRequestId,
                message: 'STK Push initiated. Please complete payment on your phone.'
            };
        } catch (error) {
            console.error('Error initiating STK Push:', error);
            throw error;
        }
    }

    async simulateSTKPush(phoneNumber, amount, transactionId) {
        // Simulate M-Pesa STK Push response
        const checkoutRequestId = `ws_CO_${Date.now()}`;
        const merchantRequestId = `mr_${Date.now()}`;

        // Update transaction with M-Pesa details
        await this.supabase
            .from('mpesa_transactions')
            .update({
                checkout_request_id: checkoutRequestId,
                merchant_request_id: merchantRequestId
            })
            .eq('id', transactionId);

        return {
            checkoutRequestId,
            merchantRequestId,
            responseCode: '0',
            responseDescription: 'Success. Request accepted for processing'
        };
    }

    async getTerritoryAssignment() {
        if (!this.entityId || this.userRole !== 'field_agent') return null;

        try {
            const { data, error } = await this.supabase
                .from('territory_assignments')
                .select(`
                    *,
                    supervisors (full_name, phone)
                `)
                .eq('agent_id', this.entityId)
                .eq('is_active', true)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return data;
        } catch (error) {
            console.error('Error fetching territory assignment:', error);
            return null;
        }
    }

    getPhoneNumber() {
        // This should be retrieved from user profile or form input
        return this.currentUser?.phone || '254700000000';
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-KE', {
            style: 'currency',
            currency: 'KES'
        }).format(amount);
    }
}

// Enhanced Onboarding Dashboard UI
class EnhancedOnboardingDashboardUI {
    constructor() {
        this.onboardingSystem = new EnhancedOnboardingSystem();
        this.currentSteps = [];
        this.kitConfig = null;
        this.paymentStatus = null;
    }

    async initialize() {
        await this.onboardingSystem.initialize();
        await this.loadUserData();
        this.renderDashboard();
    }

    async loadUserData() {
        try {
            this.currentSteps = await this.onboardingSystem.getUserOnboardingSteps();
            this.kitConfig = await this.onboardingSystem.getKitConfiguration(this.onboardingSystem.userRole);
            this.paymentStatus = await this.onboardingSystem.getKitPaymentStatus();
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    renderDashboard() {
        const container = document.getElementById('onboarding-dashboard');
        if (!container) return;

        container.innerHTML = XSSProtection.sanitize(`
            <div class="onboarding-container">
                <h2>Welcome to Stokika...boarding</h2>
                <div class="role-badge ${sanitize(this.onboardingSystem.userRole)}">
                    ${sanitize(this.onboardingSystem.userRole?.replace('_', ' ').toUpperCase())}
                </div>
                
                ${sanitize(this.renderKitPaymentSection())}
                ${sanitize(this.renderOnboardingSteps())}
                ${sanitize(this.renderTerritorySection())}
            </div>
        `);

        this.attachEventListeners();
    }

    renderKitPaymentSection() {
        if (!this.kitConfig) return '';

        const paymentStep = this.currentSteps.find(step => step.required_payment);
        if (!paymentStep || paymentStep.status === 'completed') return '';

        return `
            <div class="payment-section">
                <h3>Kit Payment Required</h3>
                <div class="kit-details">
                    <div class="payment-amount">
                        <strong>${this.onboardingSystem.formatCurrency(this.kitConfig.payment_amount)}</strong>
                    </div>
                    
                    <div class="kit-items">
                        <h4>Your Kit Includes:</h4>
                        <ul>
                            ${this.kitConfig.kit_items.map(item => `
                                <li>${item.quantity}x ${item.item} - ${item.description}</li>
                            `).join('')}
                        </ul>
                    </div>

                    <div class="benefits">
                        <h4>Benefits:</h4>
                        <ul>
                            ${this.kitConfig.benefits.map(benefit => `
                                <li><strong>${benefit.benefit}:</strong> ${benefit.description}</li>
                            `).join('')}
                        </ul>
                    </div>

                    ${this.renderPaymentOptions()}
                </div>
            </div>
        `;
    }

    renderPaymentOptions() {
        if (this.paymentStatus?.status === 'verified') {
            return `
                <div class="payment-status verified">
                    <i class="fas fa-check-circle"></i>
                    Payment Verified - Kit will be prepared for delivery
                </div>
            `;
        }

        if (this.paymentStatus?.status === 'pending') {
            return `
                <div class="payment-status pending">
                    <i class="fas fa-clock"></i>
                    Payment submitted - Awaiting verification
                    <div class="payment-details">
                        M-Pesa Code: ${this.paymentStatus.mpesa_code || 'N/A'}<br>
                        Amount: ${this.onboardingSystem.formatCurrency(this.paymentStatus.payment_amount)}
                    </div>
                </div>
            `;
        }

        return `
            <div class="payment-options">
                <h4>Choose Payment Method:</h4>
                
                <div class="payment-method">
                    <button class="btn btn-primary" onclick="onboardingUI.initiateAutomaticPayment()">
                        <i class="fas fa-mobile-alt"></i>
                        Pay via STK Push
                    </button>
                    <small>Automatic payment via M-Pesa STK Push</small>
                </div>

                <div class="payment-method">
                    <button class="btn btn-secondary" onclick="onboardingUI.showManualPaymentForm()">
                        <i class="fas fa-edit"></i>
                        Manual M-Pesa Payment
                    </button>
                    <small>Pay manually and enter M-Pesa code</small>
                </div>

                <form id="manual-payment-form" class="manual-payment-form" style="display: none;" data-sanitize="true">
                    <h5>Manual Payment Details</h5>
                    <p><strong>Paybill:</strong> 174379</p>
                    <p><strong>Account:</strong> STOKIKA</p>
                    <p><strong>Amount:</strong> ${this.onboardingSystem.formatCurrency(this.kitConfig.payment_amount)}</p>
                    
                    <div class="form-group">
                        <label>M-Pesa Transaction Code:</label>
                        <input type="text" 
                               id="mpesa-code" 
                               name="mpesa-code"
                               placeholder="e.g., QGH7X8Y9Z0" 
                               data-sanitize-type="alphanumeric"
                               maxlength="10"
                               pattern="[A-Z0-9]{10}"
                               required>
                        <small>10 characters, uppercase letters and numbers only</small>
                    </div>
                    
                    <div class="form-group">
                        <label>Phone Number Used:</label>
                        <input type="tel" 
                               id="payment-phone" 
                               name="payment-phone"
                               placeholder="0712345678 or 254712345678" 
                               data-sanitize-type="phone"
                               pattern="^254[17]\d{8}$"
                               required>
                        <small>Kenyan format: 0712345678 or 254712345678</small>
                    </div>
                    
                    <button type="submit" class="btn btn-success">
                        Submit Payment
                    </button>
                </form>
            </div>
        `;
    }

    renderOnboardingSteps() {
        if (!this.currentSteps.length) return '';

        return `
            <div class="onboarding-steps">
                <h3>Onboarding Progress</h3>
                <div class="steps-container">
                    ${this.currentSteps.map(step => `
                        <div class="step ${step.status}">
                            <div class="step-number">${step.step_number}</div>
                            <div class="step-content">
                                <h4>${step.step_name}</h4>
                                <p>${step.step_description}</p>
                                ${step.status === 'completed' ? `
                                    <small>Completed: ${new Date(step.completed_at).toLocaleDateString()}</small>
                                ` : ''}
                                ${step.notes ? `<div class="step-notes">${step.notes}</div>` : ''}
                            </div>
                            <div class="step-status">
                                ${this.getStepStatusIcon(step.status)}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderTerritorySection() {
        if (this.onboardingSystem.userRole !== 'field_agent') return '';

        return `
            <div class="territory-section">
                <h3>Territory Assignment</h3>
                <div id="territory-info">
                    <p>Territory will be assigned during onboarding process.</p>
                </div>
            </div>
        `;
    }

    getStepStatusIcon(status) {
        switch (status) {
            case 'completed':
                return '<i class="fas fa-check-circle text-success"></i>';
            case 'in_progress':
                return '<i class="fas fa-clock text-warning"></i>';
            case 'pending':
                return '<i class="fas fa-circle text-muted"></i>';
            default:
                return '<i class="fas fa-circle text-muted"></i>';
        }
    }

    async initiateAutomaticPayment() {
        try {
            const result = await this.onboardingSystem.initiateKitPayment('automatic');
            if (result.success) {
                this.showMessage('STK Push sent to your phone. Please complete the payment.', 'success');
                setTimeout(() => this.checkPaymentStatus(), 30000); // Check after 30 seconds
            }
        } catch (error) {
            this.showMessage('Error initiating payment: ' + error.message, 'error');
        }
    }

    showManualPaymentForm() {
        const form = document.getElementById('manual-payment-form');
        if (form) {
            form.style.display = form.style.display === 'none' ? 'block' : 'none';
        }
    }

    async checkPaymentStatus() {
        await this.loadUserData();
        this.renderDashboard();
    }

    showMessage(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `alert alert-${type}`;
        messageDiv.textContent = message;
        
        const container = document.querySelector('.onboarding-container');
        if (container) {
            container.insertBefore(messageDiv, container.firstChild);
            setTimeout(() => messageDiv.remove(), 5000);
        }
    }
}

// Global instance
let onboardingUI;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    onboardingUI = new EnhancedOnboardingDashboardUI();
    onboardingUI.initialize();
});

// CSS Styles
const onboardingStyles = `
<style>
.onboarding-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
}

.role-badge {
    display: inline-block;
    padding: 8px 16px;
    border-radius: 20px;
    font-weight: bold;
    margin-bottom: 20px;
}

.role-badge.field_agent {
    background: #e3f2fd;
    color: #1976d2;
}

.role-badge.supervisor {
    background: #f3e5f5;
    color: #7b1fa2;
}

.payment-section {
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 20px;
}

.payment-amount {
    font-size: 24px;
    color: #28a745;
    text-align: center;
    margin-bottom: 20px;
}

.kit-items, .benefits {
    margin-bottom: 20px;
}

.kit-items ul, .benefits ul {
    list-style-type: none;
    padding: 0;
}

.kit-items li, .benefits li {
    padding: 8px 0;
    border-bottom: 1px solid #eee;
}

.payment-options {
    margin-top: 20px;
}

.payment-method {
    margin-bottom: 15px;
    text-align: center;
}

.payment-method button {
    width: 200px;
    margin-bottom: 5px;
}

.manual-payment-form {
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 5px;
    padding: 20px;
    margin-top: 15px;
}

.payment-status {
    padding: 15px;
    border-radius: 5px;
    text-align: center;
    margin-top: 15px;
}

.payment-status.verified {
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
}

.payment-status.pending {
    background: #fff3cd;
    color: #856404;
    border: 1px solid #ffeaa7;
}

.onboarding-steps {
    margin-top: 30px;
}

.steps-container {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.step {
    display: flex;
    align-items: center;
    padding: 15px;
    border: 1px solid #dee2e6;
    border-radius: 8px;
    background: #fff;
}

.step.completed {
    background: #f8fff8;
    border-color: #28a745;
}

.step.in_progress {
    background: #fff8e1;
    border-color: #ffc107;
}

.step-number {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #6c757d;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    margin-right: 15px;
}

.step.completed .step-number {
    background: #28a745;
}

.step.in_progress .step-number {
    background: #ffc107;
}

.step-content {
    flex: 1;
}

.step-content h4 {
    margin: 0 0 5px 0;
    font-size: 16px;
}

.step-content p {
    margin: 0;
    color: #6c757d;
    font-size: 14px;
}

.step-notes {
    margin-top: 10px;
    padding: 10px;
    background: #f8f9fa;
    border-radius: 4px;
    font-size: 12px;
}

.step-status {
    font-size: 20px;
}

.territory-section {
    margin-top: 30px;
    padding: 20px;
    background: #f8f9fa;
    border-radius: 8px;
}

.form-group {
    margin-bottom: 15px;
}

.form-group label {
    display: block;
    margin-bottom: 5px;
    font-weight: bold;
}

.form-group input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
}

.btn {
    padding: 10px 20px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    text-decoration: none;
    display: inline-block;
}

.btn-primary {
    background: #007bff;
    color: white;
}

.btn-secondary {
    background: #6c757d;
    color: white;
}

.btn-success {
    background: #28a745;
    color: white;
}

.alert {
    padding: 12px 20px;
    border-radius: 4px;
    margin-bottom: 20px;
}

.alert-success {
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
}

.alert-error {
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
}

.alert-info {
    background: #d1ecf1;
    color: #0c5460;
    border: 1px solid #bee5eb;
}

@media (max-width: 768px) {
    .onboarding-container {
        padding: 10px;
    }
    
    .step {
        flex-direction: column;
        text-align: center;
    }
    
    .step-number {
        margin-right: 0;
        margin-bottom: 10px;
    }
}
</style>
`;

// Inject styles
document.head.insertAdjacentHTML('beforeend', XSSProtection.sanitize(onboardingStyles));