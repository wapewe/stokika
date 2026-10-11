// Admin Enhanced Onboarding Management System
class AdminEnhancedOnboardingManager {
    constructor() {
        this.supabase = window.supabase;
        this.currentView = 'overview';
        this.selectedEntity = null;
    }

    async initialize() {
        await this.loadDashboard();
    }

    async loadDashboard() {
        const container = document.getElementById('admin-onboarding-content');
        if (!container) return;

        container.innerHTML = XSSProtection.sanitize(`
            <div class="admin-onboarding-header">
                <h2>Enhanced Onboar...g Management</h2>
                <div class="view-tabs">
                    <button class="tab-btn ${sanitize(this.currentView === 'overview' ? 'active' : '')}" 
                            onclick="adminOnboarding.switchView('overview')">Overview</button>
                    <button class="tab-btn ${sanitize(this.currentView === 'payments' ? 'active' : '')}" 
                            onclick="adminOnboarding.switchView('payments')">Kit Payments</button>
                    <button class="tab-btn ${sanitize(this.currentView === 'territories' ? 'active' : '')}" 
                            onclick="adminOnboarding.switchView('territories')">Territories</button>
                    <button class="tab-btn ${sanitize(this.currentView === 'configurations' ? 'active' : '')}" 
                            onclick="adminOnboarding.switchView('configurations')">Kit Config</button>
                </div>
            </div>
            <div class="admin-onboarding-body">
                ${sanitize(await this.renderCurrentView())}
            </div>
        `);
    }

    async renderCurrentView() {
        switch (this.currentView) {
            case 'overview':
                return await this.renderOverview();
            case 'payments':
                return await this.renderPaymentsView();
            case 'territories':
                return await this.renderTerritoriesView();
            case 'configurations':
                return await this.renderConfigurationsView();
            default:
                return await this.renderOverview();
        }
    }

    async renderOverview() {
        const stats = await this.getOnboardingStats();
        
        return `
            <div class="overview-section">
                <div class="stats-grid">
                    <div class="stat-card">
                        <h3>Pending Onboarding</h3>
                        <div class="stat-number">${stats.pendingOnboarding}</div>
                        <small>Field Agents & Supervisors</small>
                    </div>
                    <div class="stat-card">
                        <h3>Pending Payments</h3>
                        <div class="stat-number">${stats.pendingPayments}</div>
                        <small>Awaiting Verification</small>
                    </div>
                    <div class="stat-card">
                        <h3>Completed Today</h3>
                        <div class="stat-number">${stats.completedToday}</div>
                        <small>Onboarding Finished</small>
                    </div>
                    <div class="stat-card">
                        <h3>Territory Assignments</h3>
                        <div class="stat-number">${stats.territoryAssignments}</div>
                        <small>Active Territories</small>
                    </div>
                </div>

                <div class="recent-activities">
                    <h3>Recent Activities</h3>
                    ${await this.renderRecentActivities()}
                </div>

                <div class="pending-actions">
                    <h3>Pending Admin Actions</h3>
                    ${await this.renderPendingActions()}
                </div>
            </div>
        `;
    }

    async renderPaymentsView() {
        const payments = await this.getPendingPayments();
        
        return `
            <div class="payments-section">
                <div class="section-header">
                    <h3>Kit Payment Management</h3>
                    <div class="payment-filters">
                        <select id="payment-status-filter" onchange="adminOnboarding.filterPayments()">
                            <option value="">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="verified">Verified</option>
                            <option value="failed">Failed</option>
                        </select>
                        <select id="payment-role-filter" onchange="adminOnboarding.filterPayments()">
                            <option value="">All Roles</option>
                            <option value="field_agent">Field Agents</option>
                            <option value="supervisor">Supervisors</option>
                        </select>
                    </div>
                </div>

                <div class="payments-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Role</th>
                                <th>Amount</th>
                                <th>M-Pesa Code</th>
                                <th>Phone</th>
                                <th>Date</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${payments.map(payment => this.renderPaymentRow(payment)).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    async renderTerritoriesView() {
        const territories = await this.getTerritoryAssignments();
        
        return `
            <div class="territories-section">
                <div class="section-header">
                    <h3>Territory Management</h3>
                    <button class="btn btn-primary" onclick="adminOnboarding.showCreateTerritoryModal()">
                        <i class="fas fa-plus"></i> Assign Territory
                    </button>
                </div>

                <div class="territories-grid">
                    ${territories.map(territory => this.renderTerritoryCard(territory)).join('')}
                </div>

                <div class="unassigned-agents">
                    <h4>Agents Awaiting Territory Assignment</h4>
                    ${await this.renderUnassignedAgents()}
                </div>
            </div>
        `;
    }

    async renderConfigurationsView() {
        const configs = await this.getKitConfigurations();
        
        return `
            <div class="configurations-section">
                <div class="section-header">
                    <h3>Kit Configurations</h3>
                    <button class="btn btn-primary" onclick="adminOnboarding.editKitConfig()">
                        <i class="fas fa-edit"></i> Edit Configurations
                    </button>
                </div>

                <div class="config-cards">
                    ${configs.map(config => this.renderConfigCard(config)).join('')}
                </div>
            </div>
        `;
    }

    renderPaymentRow(payment) {
        const entityName = payment.entity_type === 'field_agent' 
            ? payment.field_agents?.full_name 
            : payment.supervisors?.full_name;

        return `
            <tr>
                <td>${entityName || 'N/A'}</td>
                <td>
                    <span class="role-badge ${payment.role_type}">
                        ${payment.role_type.replace('_', ' ').toUpperCase()}
                    </span>
                </td>
                <td>${this.formatCurrency(payment.payment_amount)}</td>
                <td>${payment.mpesa_code || 'N/A'}</td>
                <td>${payment.phone_number}</td>
                <td>${payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : 'N/A'}</td>
                <td>
                    <span class="status-badge ${payment.status}">
                        ${payment.status.toUpperCase()}
                    </span>
                </td>
                <td>
                    ${payment.status === 'pending' ? `
                        <button class="btn btn-sm btn-success" 
                                onclick="adminOnboarding.verifyPayment('${payment.id}')">
                            Verify
                        </button>
                        <button class="btn btn-sm btn-danger" 
                                onclick="adminOnboarding.rejectPayment('${payment.id}')">
                            Reject
                        </button>
                    ` : ''}
                    <button class="btn btn-sm btn-info" 
                            onclick="adminOnboarding.viewPaymentDetails('${payment.id}')">
                        Details
                    </button>
                </td>
            </tr>
        `;
    }

    renderTerritoryCard(territory) {
        return `
            <div class="territory-card">
                <div class="territory-header">
                    <h4>${territory.territory_name}</h4>
                    <span class="territory-status ${territory.is_active ? 'active' : 'inactive'}">
                        ${territory.is_active ? 'Active' : 'Inactive'}
                    </span>
                </div>
                <div class="territory-details">
                    <p><strong>County:</strong> ${territory.county}</p>
                    <p><strong>Sub-County:</strong> ${territory.sub_county || 'N/A'}</p>
                    <p><strong>Agent:</strong> ${territory.field_agents?.full_name || 'Unassigned'}</p>
                    <p><strong>Supervisor:</strong> ${territory.supervisors?.full_name || 'N/A'}</p>
                    <p><strong>Wards:</strong> ${territory.wards?.join(', ') || 'N/A'}</p>
                </div>
                <div class="territory-actions">
                    <button class="btn btn-sm btn-primary" 
                            onclick="adminOnboarding.editTerritory('${territory.id}')">
                        Edit
                    </button>
                    <button class="btn btn-sm btn-secondary" 
                            onclick="adminOnboarding.viewTerritoryMap('${territory.id}')">
                        View Map
                    </button>
                </div>
            </div>
        `;
    }

    renderConfigCard(config) {
        return `
            <div class="config-card">
                <div class="config-header">
                    <h4>${config.role_type.replace('_', ' ').toUpperCase()}</h4>
                    <div class="config-amount">${this.formatCurrency(config.payment_amount)}</div>
                </div>
                
                <div class="config-items">
                    <h5>Kit Items:</h5>
                    <ul>
                        ${config.kit_items.map(item => `
                            <li>${item.quantity}x ${item.item}</li>
                        `).join('')}
                    </ul>
                </div>

                <div class="config-benefits">
                    <h5>Benefits:</h5>
                    <ul>
                        ${config.benefits.map(benefit => `
                            <li>${benefit.benefit}</li>
                        `).join('')}
                    </ul>
                </div>

                <div class="config-status">
                    <span class="status-badge ${config.is_active ? 'active' : 'inactive'}">
                        ${config.is_active ? 'Active' : 'Inactive'}
                    </span>
                </div>
            </div>
        `;
    }

    async getOnboardingStats() {
        try {
            // Get pending onboarding count
            const { count: pendingOnboarding } = await this.supabase
                .from('onboarding_steps')
                .select('*', { count: 'exact', head: true })
                .neq('status', 'completed');

            // Get pending payments count
            const { count: pendingPayments } = await this.supabase
                .from('kit_payments')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending');

            // Get completed today count
            const today = new Date().toISOString().split('T')[0];
            const { count: completedToday } = await this.supabase
                .from('onboarding_steps')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'completed')
                .gte('completed_at', today);

            // Get territory assignments count
            const { count: territoryAssignments } = await this.supabase
                .from('territory_assignments')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true);

            return {
                pendingOnboarding: pendingOnboarding || 0,
                pendingPayments: pendingPayments || 0,
                completedToday: completedToday || 0,
                territoryAssignments: territoryAssignments || 0
            };
        } catch (error) {
            console.error('Error fetching stats:', error);
            return {
                pendingOnboarding: 0,
                pendingPayments: 0,
                completedToday: 0,
                territoryAssignments: 0
            };
        }
    }

    async getPendingPayments() {
        try {
            const { data, error } = await this.supabase
                .from('kit_payments')
                .select(`
                    *,
                    field_agents (full_name, phone, email),
                    supervisors (full_name, phone, email),
                    mpesa_transactions (*)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching payments:', error);
            return [];
        }
    }

    async getTerritoryAssignments() {
        try {
            const { data, error } = await this.supabase
                .from('territory_assignments')
                .select(`
                    *,
                    field_agents (full_name, phone),
                    supervisors (full_name, phone)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching territories:', error);
            return [];
        }
    }

    async getKitConfigurations() {
        try {
            const { data, error } = await this.supabase
                .from('kit_configurations')
                .select('*')
                .order('role_type');

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching configurations:', error);
            return [];
        }
    }

    async renderRecentActivities() {
        // This would fetch recent onboarding activities
        return `
            <div class="activities-list">
                <div class="activity-item">
                    <i class="fas fa-user-plus"></i>
                    <span>New field agent application received</span>
                    <small>2 hours ago</small>
                </div>
                <div class="activity-item">
                    <i class="fas fa-money-bill"></i>
                    <span>Payment verified for John Doe</span>
                    <small>4 hours ago</small>
                </div>
                <div class="activity-item">
                    <i class="fas fa-map-marker"></i>
                    <span>Territory assigned to Jane Smith</span>
                    <small>1 day ago</small>
                </div>
            </div>
        `;
    }

    async renderPendingActions() {
        const pendingSteps = await this.getPendingAdminSteps();
        
        return `
            <div class="pending-actions-list">
                ${pendingSteps.map(step => `
                    <div class="pending-action">
                        <div class="action-info">
                            <strong>${step.step_name}</strong>
                            <p>${step.entity_name} - ${step.entity_type.replace('_', ' ')}</p>
                            ${step.step_name === 'Kit Payment' ? `
                                <button class="btn btn-sm btn-secondary" 
                                        onclick="adminOnboarding.generatePaymentLink('${step.entity_type}', '${step.entity_id}')">
                                    Generate Payment Link
                                </button>
                            ` : ''}
                            ${step.step_name === 'Account Creation' ? `
                                <button class="btn btn-sm btn-success" 
                                        onclick="adminOnboarding.createUserAccount('${step.entity_type}', '${step.entity_id}')">
                                    Create Account
                                </button>
                            ` : ''}
                        </div>
                        <button class="btn btn-sm btn-primary" 
                                onclick="adminOnboarding.handlePendingStep('${step.id}')">
                            Mark Complete
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
    }

    async getPendingAdminSteps() {
        try {
            const { data, error } = await this.supabase
                .from('onboarding_steps')
                .select(`
                    *,
                    field_agents (full_name),
                    supervisors (full_name)
                `)
                .eq('status', 'pending')
                .limit(10);

            if (error) throw error;
            
            return (data || []).map(step => ({
                ...step,
                entity_name: step.entity_type === 'field_agent' 
                    ? step.field_agents?.full_name 
                    : step.supervisors?.full_name
            }));
        } catch (error) {
            console.error('Error fetching pending steps:', error);
            return [];
        }
    }

    async renderUnassignedAgents() {
        try {
            const { data: agents, error } = await this.supabase
                .from('field_agents')
                .select('id, full_name, county, phone')
                .eq('approval_status', 'approved')
                .not('id', 'in', `(SELECT agent_id FROM territory_assignments WHERE is_active = true)`);

            if (error) throw error;

            if (!agents || agents.length === 0) {
                return '<p>No agents awaiting territory assignment.</p>';
            }

            return `
                <div class="unassigned-agents-list">
                    ${agents.map(agent => `
                        <div class="agent-item">
                            <div class="agent-info">
                                <strong>${agent.full_name}</strong>
                                <p>${agent.county} - ${agent.phone}</p>
                            </div>
                            <button class="btn btn-sm btn-primary" 
                                    onclick="adminOnboarding.assignTerritoryToAgent('${agent.id}')">
                                Assign Territory
                            </button>
                        </div>
                    `).join('')}
                </div>
            `;
        } catch (error) {
            console.error('Error fetching unassigned agents:', error);
            return '<p>Error loading unassigned agents.</p>';
        }
    }

    async verifyPayment(paymentId) {
        try {
            const { error } = await this.supabase.rpc('verify_mpesa_payment', {
                p_payment_id: paymentId,
                p_mpesa_code: 'ADMIN_VERIFIED',
                p_verified_by: (await this.supabase.auth.getUser()).data.user.id,
                p_verification_notes: 'Verified by admin'
            });

            if (error) throw error;

            // Advance onboarding step
            await this.advancePaymentStep(paymentId);
            
            this.showMessage('Payment verified successfully', 'success');
            await this.loadDashboard();
        } catch (error) {
            console.error('Error verifying payment:', error);
            this.showMessage('Error verifying payment: ' + error.message, 'error');
        }
    }

    async rejectPayment(paymentId) {
        const reason = prompt('Enter rejection reason:');
        if (!reason) return;

        try {
            const { error } = await this.supabase
                .from('kit_payments')
                .update({
                    status: 'failed',
                    verification_notes: reason,
                    verified_by: (await this.supabase.auth.getUser()).data.user.id,
                    verified_at: new Date().toISOString()
                })
                .eq('id', paymentId);

            if (error) throw error;
            
            this.showMessage('Payment rejected', 'success');
            await this.loadDashboard();
        } catch (error) {
            console.error('Error rejecting payment:', error);
            this.showMessage('Error rejecting payment: ' + error.message, 'error');
        }
    }

    async advancePaymentStep(paymentId) {
        try {
            // Get payment details
            const { data: payment } = await this.supabase
                .from('kit_payments')
                .select('entity_type, entity_id')
                .eq('id', paymentId)
                .single();

            if (!payment) return;

            // Find and advance the payment step
            const { data: paymentStep } = await this.supabase
                .from('onboarding_steps')
                .select('step_number')
                .eq('entity_type', payment.entity_type)
                .eq('entity_id', payment.entity_id)
                .eq('required_payment', true)
                .single();

            if (paymentStep) {
                await this.supabase.rpc('advance_onboarding_step', {
                    p_entity_type: payment.entity_type,
                    p_entity_id: payment.entity_id,
                    p_step_number: paymentStep.step_number,
                    p_completed_by: (await this.supabase.auth.getUser()).data.user.id,
                    p_notes: 'Payment verified and processed'
                });
            }
        } catch (error) {
            console.error('Error advancing payment step:', error);
        }
    }

    async switchView(view) {
        this.currentView = view;
        await this.loadDashboard();
    }

    async generatePaymentLink(entityType, entityId) {
        try {
            const { data: token, error } = await this.supabase.rpc('generate_onboarding_token', {
                p_entity_type: entityType,
                p_entity_id: entityId
            });

            if (error) throw error;

            const paymentLink = `${window.location.origin}/kit-payment?token=${token}`;
            
            // Copy to clipboard
            await navigator.clipboard.writeText(paymentLink);
            
            this.showMessage('Payment link copied to clipboard! Send this to the applicant.', 'success');
            
            // Show link in modal for manual copy
            this.showPaymentLinkModal(paymentLink);
        } catch (error) {
            console.error('Error generating payment link:', error);
            this.showMessage('Error generating payment link: ' + error.message, 'error');
        }
    }

    async createUserAccount(entityType, entityId) {
        try {
            // Get entity data
            const table = entityType === 'field_agent' ? 'field_agents' : 'supervisors';
            const { data: entityData, error: entityError } = await this.supabase
                .from(table)
                .select('full_name, email')
                .eq('id', entityId)
                .single();

            if (entityError) throw entityError;

            // Generate temporary password
            const tempPassword = this.generateTempPassword();

            // Create user account via Supabase Auth
            const { data: authData, error: authError } = await this.supabase.auth.admin.createUser({
                email: entityData.email,
                password: tempPassword,
                email_confirm: false // Will send confirmation email
            });

            if (authError) throw authError;

            // Create user record and link to entity
            const { error: dbError } = await this.supabase.rpc('create_onboarding_account', {
                p_entity_type: entityType,
                p_entity_id: entityId,
                p_email: entityData.email,
                p_password: tempPassword,
                p_created_by: (await this.supabase.auth.getUser()).data.user.id
            });

            if (dbError) throw dbError;

            // Advance account creation step
            await this.supabase.rpc('advance_onboarding_step', {
                p_entity_type: entityType,
                p_entity_id: entityId,
                p_step_number: 7, // Account creation step
                p_completed_by: (await this.supabase.auth.getUser()).data.user.id,
                p_notes: `Account created. Email confirmation sent to ${entityData.email}`
            });

            this.showMessage(`Account created for ${entityData.full_name}. Confirmation email sent.`, 'success');
            await this.loadDashboard();
        } catch (error) {
            console.error('Error creating account:', error);
            this.showMessage('Error creating account: ' + error.message, 'error');
        }
    }

    generateTempPassword() {
        const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
        let password = '';
        for (let i = 0; i < 12; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }

    showPaymentLinkModal(link) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = XSSProtection.sanitize(`
            <div class="modal-content">
                <div class="modal-header">
  ...               <h3>Payment Link Generated</h3>
                    <button type="button" class="close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <p>Send this link to the applicant to complete their kit payment:</p>
                    <div class="link-container">
                        <input type="text" value="${sanitize(link)}" readonly style="width: 100%; padding: 10px; margin: 10px 0;">
                    </div>
                    <button class="btn btn-primary" onclick="navigator.clipboard.writeText('${sanitize(link)}'); this.textContent='Copied!'">
                        Copy Link
                    </button>
                </div>
            </div>
        `);
        document.body.appendChild(modal);
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-KE', {
            style: 'currency',
            currency: 'KES'
        }).format(amount);
    }

    showMessage(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `alert alert-${type}`;
        messageDiv.textContent = message;
        
        const container = document.querySelector('.admin-onboarding-body');
        if (container) {
            container.insertBefore(messageDiv, container.firstChild);
            setTimeout(() => messageDiv.remove(), 5000);
        }
    }
}

// Global instance
let adminOnboarding;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('admin-onboarding-content')) {
        adminOnboarding = new AdminEnhancedOnboardingManager();
        adminOnboarding.initialize();
    }
});

// CSS Styles for Admin Interface
const adminOnboardingStyles = `
<style>
.admin-onboarding-header {
    margin-bottom: 30px;
}

.view-tabs {
    display: flex;
    gap: 10px;
    margin-top: 15px;
}

.tab-btn {
    padding: 10px 20px;
    border: 1px solid #ddd;
    background: #f8f9fa;
    cursor: pointer;
    border-radius: 4px;
}

.tab-btn.active {
    background: #007bff;
    color: white;
    border-color: #007bff;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
}

.stat-card {
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    text-align: center;
}

.stat-number {
    font-size: 32px;
    font-weight: bold;
    color: #007bff;
    margin: 10px 0;
}

.payments-table table {
    width: 100%;
    border-collapse: collapse;
    background: white;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.payments-table th,
.payments-table td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid #eee;
}

.payments-table th {
    background: #f8f9fa;
    font-weight: bold;
}

.role-badge {
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: bold;
}

.role-badge.field_agent {
    background: #e3f2fd;
    color: #1976d2;
}

.role-badge.supervisor {
    background: #f3e5f5;
    color: #7b1fa2;
}

.status-badge {
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: bold;
}

.status-badge.pending {
    background: #fff3cd;
    color: #856404;
}

.status-badge.verified {
    background: #d4edda;
    color: #155724;
}

.status-badge.failed {
    background: #f8d7da;
    color: #721c24;
}

.territories-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
}

.territory-card {
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 20px;
}

.territory-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
}

.territory-status.active {
    background: #d4edda;
    color: #155724;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
}

.territory-status.inactive {
    background: #f8d7da;
    color: #721c24;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
}

.config-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 20px;
}

.config-card {
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 20px;
}

.config-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
}

.config-amount {
    font-size: 24px;
    font-weight: bold;
    color: #28a745;
}

.activities-list,
.pending-actions-list {
    background: white;
    border-radius: 8px;
    padding: 20px;
}

.activity-item,
.pending-action {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 0;
    border-bottom: 1px solid #eee;
}

.activity-item:last-child,
.pending-action:last-child {
    border-bottom: none;
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.payment-filters {
    display: flex;
    gap: 10px;
}

.payment-filters select {
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
}

.unassigned-agents-list {
    background: white;
    border-radius: 8px;
    padding: 20px;
}

.agent-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 0;
    border-bottom: 1px solid #eee;
}

.agent-item:last-child {
    border-bottom: none;
}

.btn {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    text-decoration: none;
    display: inline-block;
}

.btn-sm {
    padding: 4px 8px;
    font-size: 12px;
}

.btn-primary {
    background: #007bff;
    color: white;
}

.btn-success {
    background: #28a745;
    color: white;
}

.btn-danger {
    background: #dc3545;
    color: white;
}

.btn-info {
    background: #17a2b8;
    color: white;
}

.btn-secondary {
    background: #6c757d;
    color: white;
}

@media (max-width: 768px) {
    .stats-grid {
        grid-template-columns: 1fr;
    }
    
    .territories-grid {
        grid-template-columns: 1fr;
    }
    
    .config-cards {
        grid-template-columns: 1fr;
    }
    
    .view-tabs {
        flex-wrap: wrap;
    }
    
    .section-header {
        flex-direction: column;
        align-items: stretch;
        gap: 10px;
    }
}
</style>
`;

// Inject styles
document.head.insertAdjacentHTML('beforeend', XSSProtection.sanitize(adminOnboardingStyles));