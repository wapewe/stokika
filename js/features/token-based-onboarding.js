// Token-Based Onboarding System (Pre-Account)
class TokenBasedOnboardingSystem {
    constructor() {
        this.supabase = window.supabase;
        this.token = null;
        this.entityData = null;
        this.entityType = null;
        this.entityId = null;
    }

    async initializeWithToken(token) {
        this.token = token;
        try {
            await this.validateToken();
            await this.loadEntityData();
            return true;
        } catch (error) {
            console.error('Token validation failed:', error);
            return false;
        }
    }

    async validateToken() {
        const { data, error } = await this.supabase
            .from('onboarding_tokens')
            .select(`
                entity_type,
                entity_id,
                expires_at,
                used
            `)
            .eq('token', this.token)
            .single();

        if (error || !data) {
            throw new Error('Invalid token');
        }

        if (data.used) {
            throw new Error('Token has already been used');
        }

        if (new Date(data.expires_at) < new Date()) {
            throw new Error('Token has expired');
        }

        this.entityType = data.entity_type;
        this.entityId = data.entity_id;
    }

    async loadEntityData() {
        const table = this.entityType === 'field_agent' ? 'field_agents' : 'supervisors';
        
        const { data, error } = await this.supabase
            .from(table)
            .select('*')
            .eq('id', this.entityId)
            .single();

        if (error || !data) {
            throw new Error('Entity not found');
        }

        this.entityData = data;
    }

    async getKitConfiguration() {
        const { data, error } = await this.supabase
            .from('kit_configurations')
            .select('*')
            .eq('role_type', this.entityType)
            .eq('is_active', true)
            .single();

        if (error) throw error;
        return data;
    }

    async getOnboardingSteps() {
        const { data, error } = await this.supabase
            .from('onboarding_steps')
            .select('*')
            .eq('entity_type', this.entityType)
            .eq('entity_id', this.entityId)
            .order('step_number');

        if (error) throw error;
        return data || [];
    }

    async getPaymentStatus() {
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
    }

    async createKitPayment(phoneNumber, paymentMethod = 'manual') {
        const { data, error } = await this.supabase.rpc('create_kit_payment', {
            p_entity_type: this.entityType,
            p_entity_id: this.entityId,
            p_role_type: this.entityType,
            p_phone_number: phoneNumber,
            p_payment_method: paymentMethod
        });

        if (error) throw error;
        return data;
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-KE', {
            style: 'currency',
            currency: 'KES'
        }).format(amount);
    }
}

// Token-Based Onboarding UI
class TokenBasedOnboardingUI {
    constructor() {
        this.onboardingSystem = new TokenBasedOnboardingSystem();
        this.steps = [];
        this.kitConfig = null;
        this.paymentStatus = null;
    }

    async initialize(token) {
        const isValid = await this.onboardingSystem.initializeWithToken(token);
        if (!isValid) {
            this.showError('Invalid or expired onboarding link');
            return false;
        }

        await this.loadData();
        this.renderDashboard();
        return true;
    }

    async loadData() {
        try {
            this.steps = await this.onboardingSystem.getOnboardingSteps();
            this.kitConfig = await this.onboardingSystem.getKitConfiguration();
            this.paymentStatus = await this.onboardingSystem.getPaymentStatus();
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    renderDashboard() {
        const container = document.getElementById('onboarding-dashboard');
        if (!container) return;

        const entityData = this.onboardingSystem.entityData;
        const entityType = this.onboardingSystem.entityType;

        container.innerHTML = XSSProtection.sanitize(`
            <div class="token-onboarding-container">
                <div class="appl...nt-info">
                    <h2>Welcome, ${sanitize(entityData.full_name)}!</h2>
                    <div class="role-badge ${sanitize(entityType)}">
                        ${sanitize(entityType.replace('_', ' ').toUpperCase())} APPLICANT
                    </div>
                    <p><strong>Email:</strong> ${sanitize(entityData.email)}</p>
                    <p><strong>Phone:</strong> ${sanitize(entityData.phone)}</p>
                </div>
                
                ${sanitize(this.renderPaymentSection())}
                ${sanitize(this.renderProgressSection())}
                ${sanitize(this.renderNextSteps())}
            </div>
        `);

        this.attachEventListeners();
    }

    renderPaymentSection() {
        if (!this.kitConfig) return '';

        const paymentStep = this.steps.find(step => step.required_payment);
        if (!paymentStep || paymentStep.status === 'completed') {
            return this.paymentStatus ? `
                <div class="payment-section completed">
                    <h3><i class="fas fa-check-circle"></i> Payment Completed</h3>
                    <p>Your kit payment has been processed. Account creation is pending admin approval.</p>
                </div>
            ` : '';
        }

        return `
            <div class="payment-section">
                <h3>Kit Payment Required</h3>
                <div class="payment-info">
                    <div class="payment-amount">
                        ${this.onboardingSystem.formatCurrency(this.kitConfig.payment_amount)}
                    </div>
                    
                    <div class="kit-preview">
                        <h4>Your ${this.onboardingSystem.entityType.replace('_', ' ')} Kit Includes:</h4>
                        <ul>
                            ${this.kitConfig.kit_items.map(item => `
                                <li><strong>${item.quantity}x ${item.item}</strong> - ${item.description}</li>
                            `).join('')}
                        </ul>
                    </div>

                    ${this.renderPaymentForm()}
                </div>
            </div>
        `;
    }

    renderPaymentForm() {
        if (this.paymentStatus?.status === 'verified') {
            return `
                <div class="payment-status verified">
                    <i class="fas fa-check-circle"></i>
                    Payment Verified - Account creation pending
                </div>
            `;
        }

        if (this.paymentStatus?.status === 'pending') {
            return `
                <div class="payment-status pending">
                    <i class="fas fa-clock"></i>
                    Payment submitted - Awaiting admin verification
                </div>
            `;
        }

        return `
            <div class="payment-form">
                <h4>Complete Your Payment</h4>
                <div class="payment-instructions">
                    <p><strong>Pay via M-Pesa:</strong></p>
                    <p>Paybill: <strong>174379</strong></p>
                    <p>Account: <strong>STOKIKA</strong></p>
                    <p>Amount: <strong>${this.onboardingSystem.formatCurrency(this.kitConfig.payment_amount)}</strong></p>
                </div>
                
                <div class="form-group">
                    <label>M-Pesa Transaction Code:</label>
                    <input type="text" id="mpesa-code" placeholder="e.g., QGH7X8Y9Z0" required>
                </div>
                
                <div class="form-group">
                    <label>Phone Number Used:</label>
                    <input type="tel" id="payment-phone" value="${this.onboardingSystem.entityData.phone}" required>
                </div>
                
                <button class="btn btn-primary" onclick="tokenOnboardingUI.submitPayment()">
                    Submit Payment
                </button>
            </div>
        `;
    }

    renderProgressSection() {
        const completedSteps = this.steps.filter(step => step.status === 'completed').length;
        const totalSteps = this.steps.length;
        const progressPercent = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

        return `
            <div class="progress-section">
                <h3>Onboarding Progress</h3>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progressPercent}%"></div>
                </div>
                <p>${completedSteps} of ${totalSteps} steps completed (${Math.round(progressPercent)}%)</p>
            </div>
        `;
    }

    renderNextSteps() {
        const nextStep = this.steps.find(step => step.status === 'pending');
        
        return `
            <div class="next-steps">
                <h3>What's Next?</h3>
                ${nextStep ? `
                    <div class="next-step">
                        <h4>${nextStep.step_name}</h4>
                        <p>${nextStep.step_description}</p>
                        ${nextStep.required_payment ? 
                            '<p><strong>Action Required:</strong> Complete payment above</p>' : 
                            '<p><strong>Status:</strong> Waiting for admin action</p>'
                        }
                    </div>
                ` : `
                    <div class="all-complete">
                        <i class="fas fa-trophy"></i>
                        <p>All steps completed! You will receive your account credentials via email once approved.</p>
                    </div>
                `}
            </div>
        `;
    }

    showMessage(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `alert alert-${type}`;
        messageDiv.innerHTML = XSSProtection.sanitize(`<i class="fas fa-${sanitize(type === 'error' ? 'exclamation-triangle' : 'info-circle')}"></i> ${sanitize(message)}`);
        
        const container = document.querySelector('.token-onboarding-container');
        if (container) {
            container.insertBefore(messageDiv, container.firstChild);
            setTimeout(() => messageDiv.remove(), 5000);
        }
    }

    showError(message) {
        document.getElementById('onboarding-dashboard').innerHTML = XSSProtection.sanitize(`
            <div class="error-container">
                <i class="fas fa-exclamatio...riangle"></i>
                <h3>Access Error</h3>
                <p>${sanitize(message)}</p>
                <a href="../dalana.html" class="btn btn-primary">Return to Home</a>
            </div>
        `);
    }

    attachEventListeners() {
        // Event listeners attached via onclick in HTML
    }
}

// Global instance
let tokenOnboardingUI;

// CSS Styles
const tokenOnboardingStyles = `
<style>
.token-onboarding-container {
    max-width: 700px;
    margin: 0 auto;
}

.applicant-info {
    background: #f8f9fa;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 20px;
    text-align: center;
}

.applicant-info h2 {
    margin: 0 0 15px 0;
    color: #2c3e50;
}

.payment-section {
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 20px;
}

.payment-section.completed {
    background: #d4edda;
    border-color: #c3e6cb;
    color: #155724;
}

.payment-amount {
    font-size: 28px;
    font-weight: bold;
    color: #28a745;
    text-align: center;
    margin-bottom: 20px;
}

.kit-preview {
    margin-bottom: 20px;
}

.kit-preview ul {
    list-style: none;
    padding: 0;
}

.kit-preview li {
    padding: 8px 0;
    border-bottom: 1px solid #eee;
}

.payment-instructions {
    background: #e9ecef;
    padding: 15px;
    border-radius: 5px;
    margin-bottom: 20px;
}

.payment-form {
    border-top: 1px solid #eee;
    padding-top: 20px;
}

.payment-status {
    padding: 15px;
    border-radius: 5px;
    text-align: center;
    font-weight: bold;
}

.payment-status.verified {
    background: #d4edda;
    color: #155724;
}

.payment-status.pending {
    background: #fff3cd;
    color: #856404;
}

.progress-section {
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 20px;
}

.progress-bar {
    width: 100%;
    height: 20px;
    background: #e9ecef;
    border-radius: 10px;
    overflow: hidden;
    margin: 10px 0;
}

.progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #28a745, #20c997);
    transition: width 0.3s ease;
}

.next-steps {
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 20px;
}

.next-step {
    padding: 15px;
    background: #f8f9fa;
    border-radius: 5px;
}

.all-complete {
    text-align: center;
    padding: 20px;
    color: #28a745;
}

.all-complete i {
    font-size: 48px;
    margin-bottom: 15px;
}

.error-container {
    text-align: center;
    padding: 50px;
    color: #dc3545;
}

.error-container i {
    font-size: 48px;
    margin-bottom: 20px;
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
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 16px;
}

.btn {
    padding: 12px 24px;
    border: none;
    border-radius: 4px;
    font-weight: bold;
    cursor: pointer;
    text-decoration: none;
    display: inline-block;
}

.btn-primary {
    background: #007bff;
    color: white;
}

.btn-primary:hover {
    background: #0056b3;
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

@media (max-width: 768px) {
    .token-onboarding-container {
        padding: 10px;
    }
    
    .payment-amount {
        font-size: 24px;
    }
}
</style>
`;

// Inject styles
document.head.insertAdjacentHTML('beforeend', XSSProtection.sanitize(tokenOnboardingStyles));