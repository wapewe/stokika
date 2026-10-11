// Admin Onboarding Management System
class AdminOnboardingSystem {
    constructor() {
        this.supabase = window.supabase?.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    }

    // Initialize onboarding for new application
    async initializeOnboarding(entityType, entityId, roleType = null) {
        try {
            const { error } = await this.supabase.rpc('initialize_onboarding_steps', {
                p_entity_type: entityType,
                p_entity_id: entityId,
                p_role_type: roleType || entityType
            });

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error initializing onboarding:', error);
            return false;
        }
    }

    // Get onboarding progress for entity
    async getOnboardingProgress(entityType, entityId) {
        try {
            const { data, error } = await this.supabase
                .from('onboarding_steps')
                .select('*')
                .eq('entity_type', entityType)
                .eq('entity_id', entityId)
                .order('step_number', { ascending: true });

            if (error) throw error;

            const totalSteps = data.length;
            const completedSteps = data.filter(step => step.status === 'completed').length;
            const currentStep = data.find(step => step.status === 'pending' || step.status === 'in_progress');

            return {
                steps: data,
                totalSteps,
                completedSteps,
                progressPercentage: Math.round((completedSteps / totalSteps) * 100),
                currentStep: currentStep || null,
                isComplete: completedSteps === totalSteps
            };
        } catch (error) {
            console.error('Error getting onboarding progress:', error);
            return null;
        }
    }

    // Advance to next step
    async advanceStep(entityType, entityId, stepNumber, notes = '') {
        try {
            const { data, error } = await this.supabase.rpc('advance_onboarding_step', {
                p_entity_type: entityType,
                p_entity_id: entityId,
                p_step_number: stepNumber,
                p_completed_by: (await this.supabase.auth.getUser()).data.user?.id,
                p_notes: notes
            });

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error advancing step:', error);
            return false;
        }
    }

    // Mark for interview
    async markForInterview(entityType, entityId, interviewDate, notes = '') {
        try {
            // Update interview step
            const { error: stepError } = await this.supabase
                .from('onboarding_steps')
                .update({
                    status: 'completed',
                    completed_by: (await this.supabase.auth.getUser()).data.user?.id,
                    completed_at: new Date().toISOString(),
                    notes: `Interview scheduled for ${interviewDate}. ${notes}`
                })
                .eq('entity_type', entityType)
                .eq('entity_id', entityId)
                .eq('step_name', 'Schedule Interview');

            if (stepError) throw stepError;

            // Update entity interview status
            const table = entityType === 'field_agent' ? 'field_agents' : 'supervisors';
            const { error: entityError } = await this.supabase
                .from(table)
                .update({
                    interview_status: 'awaiting_interview',
                    interview_date: interviewDate,
                    interview_notes: notes
                })
                .eq('id', entityId);

            if (entityError) throw entityError;
            return true;
        } catch (error) {
            console.error('Error marking for interview:', error);
            return false;
        }
    }

    // Mark as interviewed
    async markAsInterviewed(entityType, entityId, interviewNotes = '') {
        try {
            // Update interview conducted step
            const { error: stepError } = await this.supabase
                .from('onboarding_steps')
                .update({
                    status: 'completed',
                    completed_by: (await this.supabase.auth.getUser()).data.user?.id,
                    completed_at: new Date().toISOString(),
                    notes: interviewNotes
                })
                .eq('entity_type', entityType)
                .eq('entity_id', entityId)
                .eq('step_name', 'Interview Conducted');

            if (stepError) throw stepError;

            // Update entity interview status
            const table = entityType === 'field_agent' ? 'field_agents' : 'supervisors';
            const { error: entityError } = await this.supabase
                .from(table)
                .update({
                    interview_status: 'interviewed',
                    interview_notes: interviewNotes
                })
                .eq('id', entityId);

            if (entityError) throw entityError;
            return true;
        } catch (error) {
            console.error('Error marking as interviewed:', error);
            return false;
        }
    }

    // Get kit configuration
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
            console.error('Error getting kit configuration:', error);
            return null;
        }
    }

    // Record kit payment
    async recordKitPayment(entityType, entityId, roleType, mpesaCode, phoneNumber, paymentAmount) {
        try {
            const { data, error } = await this.supabase
                .from('kit_payments')
                .insert([{
                    entity_type: entityType,
                    entity_id: entityId,
                    role_type: roleType,
                    payment_amount: paymentAmount,
                    mpesa_code: mpesaCode,
                    phone_number: phoneNumber,
                    payment_date: new Date().toISOString(),
                    status: 'pending'
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error recording payment:', error);
            return null;
        }
    }

    // Verify kit payment
    async verifyKitPayment(paymentId, isVerified, notes = '') {
        try {
            const status = isVerified ? 'verified' : 'failed';
            const { data, error } = await this.supabase
                .from('kit_payments')
                .update({
                    status: status,
                    verification_notes: notes,
                    verified_by: (await this.supabase.auth.getUser()).data.user?.id,
                    verified_at: new Date().toISOString()
                })
                .eq('id', paymentId)
                .select()
                .single();

            if (error) throw error;

            // If verified, advance payment verification step
            if (isVerified) {
                await this.advanceStep(data.entity_type, data.entity_id, 6, `Payment verified: ${data.mpesa_code}`);
            }

            return data;
        } catch (error) {
            console.error('Error verifying payment:', error);
            return null;
        }
    }

    // Create user account (after payment verification)
    async createUserAccount(entityType, entityId, email, password, name) {
        try {
            // Create auth user
            const { data: authData, error: authError } = await this.supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        name: name,
                        user_type: entityType
                    }
                }
            });

            if (authError) throw authError;

            // Create user record
            const { error: userError } = await this.supabase
                .from('users')
                .insert([{
                    id: authData.user.id,
                    name: name,
                    email: email,
                    role: 'user',
                    user_type: entityType,
                    status: 'active'
                }]);

            if (userError) throw userError;

            // Update entity with user_id
            const table = entityType === 'field_agent' ? 'field_agents' : 'supervisors';
            const { error: entityError } = await this.supabase
                .from(table)
                .update({ user_id: authData.user.id })
                .eq('id', entityId);

            if (entityError) throw entityError;

            // Advance account creation step
            await this.advanceStep(entityType, entityId, 7, `Account created: ${email}`);

            return authData.user;
        } catch (error) {
            console.error('Error creating user account:', error);
            return null;
        }
    }

    // Get pending payments
    async getPendingPayments() {
        try {
            const { data, error } = await this.supabase
                .from('kit_payments')
                .select(`
                    *,
                    field_agents!kit_payments_entity_id_fkey(full_name, email, phone),
                    supervisors!kit_payments_entity_id_fkey(full_name, email, phone)
                `)
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error getting pending payments:', error);
            return [];
        }
    }

    // Get onboarding dashboard data
    async getOnboardingDashboard() {
        try {
            const [agentSteps, supervisorSteps, pendingPayments] = await Promise.all([
                this.supabase
                    .from('onboarding_steps')
                    .select('*, field_agents!onboarding_steps_entity_id_fkey(full_name, email, phone)')
                    .eq('entity_type', 'field_agent')
                    .order('created_at', { ascending: false }),
                this.supabase
                    .from('onboarding_steps')
                    .select('*, supervisors!onboarding_steps_entity_id_fkey(full_name, email, phone)')
                    .eq('entity_type', 'supervisor')
                    .order('created_at', { ascending: false }),
                this.getPendingPayments()
            ]);

            return {
                agentSteps: agentSteps.data || [],
                supervisorSteps: supervisorSteps.data || [],
                pendingPayments: pendingPayments,
                stats: {
                    totalAgents: agentSteps.data?.length || 0,
                    totalSupervisors: supervisorSteps.data?.length || 0,
                    pendingPaymentsCount: pendingPayments.length
                }
            };
        } catch (error) {
            console.error('Error getting dashboard data:', error);
            return null;
        }
    }
}

// Onboarding Dashboard UI
class OnboardingDashboardUI {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.system = new AdminOnboardingSystem();
    }

    async render() {
        const data = await this.system.getOnboardingDashboard();
        if (!data) {
            this.container.innerHTML =XSSProtection.sanitize( XSSProtection.sanitize(<div class="error">Error loading onboarding data</div>';
            return;
        }

        this.container.innerHTML = XSSProtection.sanitize(`
            <div class="onboarding-admin-dashboard">
                <div class="stat...verview">
                    <div class="stat-card">
                        <h3>Field Agents</h3>
                        <div class="stat-number">${sanitize(data.stats.totalAgents)}</div>
                        <div class="stat-label">In Onboarding</div>
                    </div>
                    <div class="stat-card">
                        <h3>Supervisors</h3>
                        <div class="stat-number">${sanitize(data.stats.totalSupervisors)}</div>
                        <div class="stat-label">In Onboarding</div>
                    </div>
                    <div class="stat-card">
                        <h3>Pending Payments</h3>
                        <div class="stat-number">${sanitize(data.stats.pendingPaymentsCount)}</div>
                        <div class="stat-label">Awaiting Verification</div>
                    </div>
                </div>

                <div class="onboarding-sections">
                    <div class="section">
                        <h3>Pending Kit Payments</h3>
                        <div class="payments-list">
                            ${sanitize(data.pendingPayments.map(payment => `
                                <div class="payment-item">
                                    <div class="payment-info">
                                        <strong>${payment.field_agents?.full_name || payment.supervisors?.full_name)}</strong>
                                        <span class="role-badge">${sanitize(payment.role_type.replace('_', ' '))}</span>
                                        <div class="payment-details">
                                            <span>KES ${sanitize(payment.payment_amount)}</span>
                                            <span>M-Pesa: ${sanitize(payment.mpesa_code)}</span>
                                            <span>Phone: ${sanitize(payment.phone_number)}</span>
                                        </div>
                                    </div>
                                    <div class="payment-actions">
                                        <button class="btn-verify" onclick="onboardingUI.verifyPayment('${sanitize(payment.id)}', true)">✅ Verify</button>
                                        <button class="btn-reject" onclick="onboardingUI.verifyPayment('${sanitize(payment.id)}', false)">❌ Reject</button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="section">
                        <h3>Active Onboarding Processes</h3>
                        <div class="onboarding-list">
                            ${await this.renderOnboardingList(data.agentSteps, data.supervisorSteps)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async renderOnboardingList(agentSteps, supervisorSteps) {
        const allSteps = [...agentSteps, ...supervisorSteps];
        const groupedByEntity = {};

        allSteps.forEach(step => {
            const key = `${step.entity_type}_${step.entity_id}`;
            if (!groupedByEntity[key]) {
                groupedByEntity[key] = {
                    entityType: step.entity_type,
                    entityId: step.entity_id,
                    name: step.field_agents?.full_name || step.supervisors?.full_name,
                    email: step.field_agents?.email || step.supervisors?.email,
                    steps: []
                };
            }
            groupedByEntity[key].steps.push(step);
        });

        return Object.values(groupedByEntity).map(entity => `
            <div class="onboarding-entity">
                <div class="entity-header">
                    <h4>${entity.name}</h4>
                    <span class="entity-type">${entity.entityType.replace('_', ' ')}</span>
                    <button class="btn-view" onclick="onboardingUI.viewOnboarding('${entity.entityType}', '${entity.entityId}')">View Progress</button>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${this.calculateProgress(entity.steps)}%"></div>
                </div>
                <div class="current-step">
                    Current: ${this.getCurrentStep(entity.steps)}
                </div>
            </div>
        `).join('');
    }

    calculateProgress(steps) {
        const completed = steps.filter(s => s.status === 'completed').length;
        return Math.round((completed / steps.length) * 100);
    }

    getCurrentStep(steps) {
        const current = steps.find(s => s.status === 'pending' || s.status === 'in_progress');
        return current ? current.step_name : 'Complete';
    }

    async verifyPayment(paymentId, isVerified) {
        const notes = prompt(isVerified ? 'Verification notes:' : 'Rejection reason:');
        if (notes === null) return;

        const result = await this.system.verifyKitPayment(paymentId, isVerified, notes);
        if (result) {
            alert(isVerified ? 'Payment verified successfully!' : 'Payment rejected');
            this.render(); // Refresh dashboard
        } else {
            alert('Error processing payment verification');
        }
    }

    async viewOnboarding(entityType, entityId) {
        const progress = await this.system.getOnboardingProgress(entityType, entityId);
        if (!progress) {
            alert('Error loading onboarding progress');
            return;
        }

        this.showOnboardingModal(entityType, entityId, progress);
    }

    showOnboardingModal(entityType, entityId, progress) {
        const modal = document.createElement('div');
        modal.className = 'modal show';
        modal.innerHTML = XSSProtection.sanitize(`
            <div class="modal-content onboarding-modal">
                <div class="...al-header">
                    <h2>Onboarding Progress - ${sanitize(entityType.replace('_', ' '))}</h2>
                    <button type="button" class="close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="onboarding-progress">
                    <div class="progress-header">
                        <h3>Progress: ${sanitize(progress.completedSteps)}/${sanitize(progress.totalSteps)} (${sanitize(progress.progressPercentage)}%)</h3>
                        <div class="progress-bar-large">
                            <div class="progress-fill" style="width: ${sanitize(progress.progressPercentage)}%"></div>
                        </div>
                    </div>
                    <div class="steps-list">
                        ${sanitize(progress.steps.map(step => `
                            <div class="step-item ${step.status)}">
                                <div class="step-number">${sanitize(step.step_number)}</div>
                                <div class="step-content">
                                    <h4>${sanitize(step.step_name)}</h4>
                                    <p>${sanitize(step.step_description)}</p>
                                    ${step.required_payment ? `<div class="payment-info">Payment Required: KES ${step.payment_amount}</div>` : ''}
                                    ${step.notes ? `<div class="step-notes">Notes: ${step.notes}</div>` : ''}
                                    ${step.completed_at ? `<div class="completed-date">Completed: ${new Date(step.completed_at).toLocaleDateString()}</div>` : ''}
                                </div>
                                <div class="step-actions">
                                    ${step.status === 'pending' ? `
                                        <button class="btn-advance" onclick="onboardingUI.advanceStep('${entityType}', '${entityId}', ${step.step_number})">Complete Step</button>
                                        ${step.step_name.includes('Interview') ? `
                                            <button class="btn-interview" onclick="onboardingUI.scheduleInterview('${entityType}', '${entityId}')">Schedule Interview</button>
                                        ` : ''}
                                    ` : ''}
                                    ${step.status === 'completed' ? '<span class="status-completed">✅ Completed</span>' : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    async advanceStep(entityType, entityId, stepNumber) {
        const notes = prompt('Add notes for this step (optional):') || '';
        const success = await this.system.advanceStep(entityType, entityId, stepNumber, notes);
        
        if (success) {
            alert('Step completed successfully!');
            document.querySelector('.modal.show').remove();
            this.render(); // Refresh dashboard
        } else {
            alert('Error completing step');
        }
    }

    async scheduleInterview(entityType, entityId) {
        const date = prompt('Enter interview date (YYYY-MM-DD):');
        if (!date) return;

        const notes = prompt('Interview notes (optional):') || '';
        const success = await this.system.markForInterview(entityType, entityId, date, notes);
        
        if (success) {
            alert('Interview scheduled successfully!');
            document.querySelector('.modal.show').remove();
            this.render();
        } else {
            alert('Error scheduling interview');
        }
    }
}

// Export classes
window.AdminOnboardingSystem = AdminOnboardingSystem;
window.OnboardingDashboardUI = OnboardingDashboardUI;