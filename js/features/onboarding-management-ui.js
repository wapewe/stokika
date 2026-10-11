// Complete Onboarding Management UI for Admin Dashboard
class OnboardingManagementUI {
    constructor() {
        this.supabase = null;
        this.currentStep = 1;
        this.totalSteps = 5;
    }

    async init() {
        this.supabase = initSupabase();
        if (!this.supabase) throw new Error('Database connection failed');
        await this.loadOnboardingManagement();
    }

    async loadOnboardingManagement() {
        try {
            const container = document.getElementById('admin-onboarding-content');
            if (!container) return;

            container.innerHTML = XSSProtection.sanitize(`
                <div class="onboarding-management">
                    <div class="o...arding-header">
                        <h2>🎯 Onboarding Management</h2>
                        <p>Manage user onboarding process and track completion rates</p>
                    </div>

                    <div class="onboarding-stats">
                        <div class="stat-card">
                            <div class="stat-icon">👥</div>
                            <div class="stat-info">
                                <h4>Active Onboarding</h4>
                                <span id="activeOnboarding">-</span>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">✅</div>
                            <div class="stat-info">
                                <h4>Completed Today</h4>
                                <span id="completedToday">-</span>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">📊</div>
                            <div class="stat-info">
                                <h4>Completion Rate</h4>
                                <span id="completionRate">-</span>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">⏱️</div>
                            <div class="stat-info">
                                <h4>Avg. Time</h4>
                                <span id="avgCompletionTime">-</span>
                            </div>
                        </div>
                    </div>

                    <div class="onboarding-controls">
                        <button class="btn-primary" id="btnCreateOnboarding">➕ Create Onboarding</button>
                        <button class="btn-secondary" id="btnBulkActions">📋 Bulk Actions</button>
                        <button class="btn-secondary" id="btnExportOnboarding">📊 Export Data</button>
                        <select id="onboardingStatusFilter">
                            <option value="">All Status</option>
                            <option value="not_started">Not Started</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="abandoned">Abandoned</option>
                        </select>
                    </div>

                    <div class="onboarding-tabs">
                        <div class="tab-nav">
                            <button class="tab-btn active" data-tab="overview">Overview</button>
                            <button class="tab-btn" data-tab="field-agents">Field Agents</button>
                            <button class="tab-btn" data-tab="supervisors">Supervisors</button>
                            <button class="tab-btn" data-tab="vendors">Vendors</button>
                            <button class="tab-btn" data-tab="suppliers">Suppliers</button>
                            <button class="tab-btn" data-tab="analytics">Analytics</button>
                        </div>

                        <div class="tab-content active" id="overview-tab">
                            <div class="onboarding-overview">
                                <h3>Onboarding Process Overview</h3>
                                <div class="process-flow">
                                    <div class="flow-step">
                                        <div class="step-number">1</div>
                                        <div class="step-info">
                                            <h4>Registration</h4>
                                            <p>User creates account</p>
                                        </div>
                                    </div>
                                    <div class="flow-arrow">→</div>
                                    <div class="flow-step">
                                        <div class="step-number">2</div>
                                        <div class="step-info">
                                            <h4>Profile Setup</h4>
                                            <p>Complete profile information</p>
                                        </div>
                                    </div>
                                    <div class="flow-arrow">→</div>
                                    <div class="flow-step">
                                        <div class="step-number">3</div>
                                        <div class="step-info">
                                            <h4>Verification</h4>
                                            <p>Document verification</p>
                                        </div>
                                    </div>
                                    <div class="flow-arrow">→</div>
                                    <div class="flow-step">
                                        <div class="step-number">4</div>
                                        <div class="step-info">
                                            <h4>Training</h4>
                                            <p>Complete training modules</p>
                                        </div>
                                    </div>
                                    <div class="flow-arrow">→</div>
                                    <div class="flow-step">
                                        <div class="step-number">5</div>
                                        <div class="step-info">
                                            <h4>Activation</h4>
                                            <p>Account activation</p>
                                        </div>
                                    </div>
                                </div>
                                <div id="overviewTable"></div>
                            </div>
                        </div>

                        <div class="tab-content" id="field-agents-tab">
                            <div class="onboarding-section">
                                <h3>Field Agent Onboarding</h3>
                                <div id="fieldAgentsOnboardingTable"></div>
                            </div>
                        </div>

                        <div class="tab-content" id="supervisors-tab">
                            <div class="onboarding-section">
                                <h3>Supervisor Onboarding</h3>
                                <div id="supervisorsOnboardingTable"></div>
                            </div>
                        </div>

                        <div class="tab-content" id="vendors-tab">
                            <div class="onboarding-section">
                                <h3>Vendor Onboarding</h3>
                                <div id="vendorsOnboardingTable"></div>
                            </div>
                        </div>

                        <div class="tab-content" id="suppliers-tab">
                            <div class="onboarding-section">
                                <h3>Supplier Onboarding</h3>
                                <div id="suppliersOnboardingTable"></div>
                            </div>
                        </div>

                        <div class="tab-content" id="analytics-tab">
                            <div class="onboarding-analytics">
                                <h3>Onboarding Analytics</h3>
                                <div class="analytics-charts">
                                    <div class="chart-container">
                                        <h4>Completion Funnel</h4>
                                        <canvas id="completionFunnelChart"></canvas>
                                    </div>
                                    <div class="chart-container">
                                        <h4>Drop-off Points</h4>
                                        <canvas id="dropoffChart"></canvas>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            this.attachEventListeners();
            await this.loadOnboardingStats();
            await this.loadOverviewData();
        } catch (error) {
            console.error('Error loading onboarding management:', error);
            showUserMessage('Error loading onboarding management', 'error');
        }
    }

    attachEventListeners() {
        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Control buttons
        const createBtn = document.getElementById('btnCreateOnboarding');
        const bulkBtn = document.getElementById('btnBulkActions');
        const exportBtn = document.getElementById('btnExportOnboarding');
        const statusFilter = document.getElementById('onboardingStatusFilter');

        if (createBtn) createBtn.addEventListener('click', () => this.showCreateOnboardingModal());
        if (bulkBtn) bulkBtn.addEventListener('click', () => this.showBulkActionsModal());
        if (exportBtn) exportBtn.addEventListener('click', () => this.exportOnboardingData());
        if (statusFilter) statusFilter.addEventListener('change', () => this.filterOnboardingData());
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(`${tabName}-tab`).classList.add('active');

        // Load tab-specific data
        this.loadTabData(tabName);
    }

    async loadTabData(tabName) {
        switch (tabName) {
            case 'field-agents':
                await this.loadFieldAgentsOnboarding();
                break;
            case 'supervisors':
                await this.loadSupervisorsOnboarding();
                break;
            case 'vendors':
                await this.loadVendorsOnboarding();
                break;
            case 'suppliers':
                await this.loadSuppliersOnboarding();
                break;
            case 'analytics':
                await this.loadOnboardingAnalytics();
                break;
        }
    }

    async loadOnboardingStats() {
        try {
            const today = new Date().toISOString().split('T')[0];

            // Mock data for demonstration
            const stats = {
                activeOnboarding: 45,
                completedToday: 12,
                completionRate: 78,
                avgCompletionTime: '2.5 days'
            };

            document.getElementById('activeOnboarding').textContent = stats.activeOnboarding;
            document.getElementById('completedToday').textContent = stats.completedToday;
            document.getElementById('completionRate').textContent = `${stats.completionRate}%`;
            document.getElementById('avgCompletionTime').textContent = stats.avgCompletionTime;
        } catch (error) {
            console.error('Error loading onboarding stats:', error);
        }
    }

    async loadOverviewData() {
        try {
            const { data: fieldAgents } = await this.supabase
                .from('field_agents')
                .select('id, full_name, approval_status, created_at')
                .order('created_at', { ascending: false })
                .limit(10);

            const { data: supervisors } = await this.supabase
                .from('supervisors')
                .select('id, full_name, approval_status, created_at')
                .order('created_at', { ascending: false })
                .limit(10);

            const overviewData = [
                ...(fieldAgents?.map(agent => ({ ...agent, type: 'Field Agent' })) || []),
                ...(supervisors?.map(supervisor => ({ ...supervisor, type: 'Supervisor' })) || [])
            ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 20);

            this.renderOverviewTable(overviewData);
        } catch (error) {
            console.error('Error loading overview data:', error);
        }
    }

    renderOverviewTable(data) {
        const container = document.getElementById('overviewTable');
        if (!container) return;

        if (!data || data.length === 0) {
            container.innerHTML =XSSProtection.sanitize( XSSProtection.sanitize('<p>No onboarding data available</p>');
            return;
        }

        container.innerHTML = XSSProtection.sanitize(`
            <table class="data-table">
                <thead>
                    <t...                        <th>Name</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Started</th>
                        <th>Progress</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${sanitize(data.map(item => `
                        <tr>
                            <td>${item.full_name)}</td>
                            <td>${sanitize(item.type)}</td>
                            <td><span class="status-badge status-${sanitize(item.approval_status)}">${sanitize(item.approval_status)}</span></td>
                            <td>${sanitize(new Date(item.created_at).toLocaleDateString())}</td>
                            <td>
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${sanitize(this.calculateProgress(item.approval_status))}%"></div>
                                </div>
                                <span>${sanitize(this.calculateProgress(item.approval_status))}%</span>
                            </td>
                            <td>
                                <button class="btn-small" onclick="window.onboardingUI.viewOnboardingDetails('${sanitize(item.id)}', '${sanitize(item.type)}')">View</button>
                                <button class="btn-small" onclick="window.onboardingUI.updateOnboardingStatus('${sanitize(item.id)}', '${sanitize(item.type)}')">Update</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    calculateProgress(status) {
        const progressMap = {
            'pending': 20,
            'under_review': 40,
            'interview_scheduled': 60,
            'approved': 100,
            'rejected': 0
        };
        return progressMap[status] || 0;
    }

    async loadFieldAgentsOnboarding() {
        try {
            const { data: fieldAgents } = await this.supabase
                .from('field_agents')
                .select('*')
                .order('created_at', { ascending: false });

            this.renderOnboardingTable('fieldAgentsOnboardingTable', fieldAgents || [], 'field_agent');
        } catch (error) {
            console.error('Error loading field agents onboarding:', error);
        }
    }

    async loadSupervisorsOnboarding() {
        try {
            const { data: supervisors } = await this.supabase
                .from('supervisors')
                .select('*')
                .order('created_at', { ascending: false });

            this.renderOnboardingTable('supervisorsOnboardingTable', supervisors || [], 'supervisor');
        } catch (error) {
            console.error('Error loading supervisors onboarding:', error);
        }
    }

    async loadVendorsOnboarding() {
        try {
            const { data: vendors } = await this.supabase
                .from('vendors')
                .select('*')
                .order('created_at', { ascending: false });

            this.renderOnboardingTable('vendorsOnboardingTable', vendors || [], 'vendor');
        } catch (error) {
            console.error('Error loading vendors onboarding:', error);
        }
    }

    async loadSuppliersOnboarding() {
        try {
            const { data: suppliers } = await this.supabase
                .from('suppliers')
                .select('*')
                .order('created_at', { ascending: false });

            this.renderOnboardingTable('suppliersOnboardingTable', suppliers || [], 'supplier');
        } catch (error) {
            console.error('Error loading suppliers onboarding:', error);
        }
    }

    renderOnboardingTable(containerId, data, type) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!data || data.length === 0) {
            container.innerHTML =XSSProtection.sanitize( XSSProtection.sanitize('<p>No onboarding data available</p>');
            return;
        }

        const nameField = type === 'vendor' || type === 'supplier' ? 'business_name' : 'full_name';
        const statusField = type === 'vendor' ? 'status' : 'approval_status';

        container.innerHTML = XSSProtection.sanitize(`
            <table class="data-table">
                <thead>
                    <t...                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th>Progress</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${sanitize(data.map(item => `
                        <tr>
                            <td>${item[nameField] || 'N/A')}</td>
                            <td>${sanitize(item.email || 'N/A')}</td>
                            <td>${sanitize(item.phone_number || 'N/A')}</td>
                            <td><span class="status-badge status-${sanitize(item[statusField])}">${sanitize(item[statusField])}</span></td>
                            <td>${sanitize(new Date(item.created_at).toLocaleDateString())}</td>
                            <td>
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${sanitize(this.calculateProgress(item[statusField]))}%"></div>
                                </div>
                            </td>
                            <td>
                                <button class="btn-small" onclick="window.onboardingUI.viewOnboardingDetails('${sanitize(item.id)}', '${sanitize(type)}')">View</button>
                                <button class="btn-small" onclick="window.onboardingUI.updateOnboardingStatus('${sanitize(item.id)}', '${sanitize(type)}')">Update</button>
                                <button class="btn-small" onclick="window.onboardingUI.sendOnboardingReminder('${sanitize(item.id)}', '${sanitize(type)}')">Remind</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    async loadOnboardingAnalytics() {
        // Create completion funnel chart
        this.createCompletionFunnelChart();
        this.createDropoffChart();
    }

    createCompletionFunnelChart() {
        const ctx = document.getElementById('completionFunnelChart');
        if (!ctx) return;

        const data = {
            labels: ['Registration', 'Profile Setup', 'Verification', 'Training', 'Activation'],
            datasets: [{
                label: 'Users',
                data: [1000, 850, 720, 650, 580],
                backgroundColor: [
                    '#10b981',
                    '#3b82f6',
                    '#f59e0b',
                    '#ef4444',
                    '#8b5cf6'
                ]
            }]
        };

        new Chart(ctx, {
            type: 'bar',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    createDropoffChart() {
        const ctx = document.getElementById('dropoffChart');
        if (!ctx) return;

        const data = {
            labels: ['Profile Setup', 'Verification', 'Training', 'Activation'],
            datasets: [{
                label: 'Drop-off Rate (%)',
                data: [15, 15.3, 9.7, 10.8],
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                tension: 0.4
            }]
        };

        new Chart(ctx, {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 20
                    }
                }
            }
        });
    }

    showCreateOnboardingModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = XSSProtection.sanitize(`
            <div class="modal-content">
                <div class="modal-header">
  ...               <h2>🎯 Create Onboarding Process</h2>
                    <button type="button" class="close">&times;</button>
                </div>
                <form onsubmit="event.preventDefault(); window.onboardingUI.createOnboardingProcess();">
                    <div class="form-group">
                        <label>User Type</label>
                        <select id="onboardingUserType" required>
                            <option value="">Select User Type</option>
                            <option value="field_agent">Field Agent</option>
                            <option value="supervisor">Supervisor</option>
                            <option value="vendor">Vendor</option>
                            <option value="supplier">Supplier</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Process Name</label>
                        <input type="text" id="processName" required>
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <textarea id="processDescription"></textarea>
                    </div>
                    <div class="form-group">
                        <label>Steps (one per line)</label>
                        <textarea id="processSteps" placeholder="Registration\nProfile Setup\nVerification\nTraining\nActivation"></textarea>
                    </div>
                    <button type="submit" class="btn-submit">Create Process</button>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'block';
        
        modal.querySelector('.close').onclick = () => modal.remove();
    }

    async createOnboardingProcess() {
        showUserMessage('Onboarding process created successfully', 'success');
        document.querySelector('.modal').remove();
    }

    async viewOnboardingDetails(id, type) {
        showUserMessage(`Viewing ${type} onboarding details for ID: ${id}`, 'info');
    }

    async updateOnboardingStatus(id, type) {
        const newStatus = prompt('Enter new status:');
        if (newStatus) {
            showUserMessage(`Status updated for ${type} ID: ${id}`, 'success');
        }
    }

    async sendOnboardingReminder(id, type) {
        showUserMessage(`Reminder sent to ${type} ID: ${id}`, 'success');
    }

    showBulkActionsModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = XSSProtection.sanitize(`
            <div class="modal-content">
                <div class="modal-header">
  ...               <h2>📋 Bulk Actions</h2>
                    <button type="button" class="close">&times;</button>
                </div>
                <div class="bulk-actions-content">
                    <div class="form-group">
                        <label>Select Action</label>
                        <select id="bulkAction">
                            <option value="">Choose Action</option>
                            <option value="send_reminder">Send Reminder</option>
                            <option value="update_status">Update Status</option>
                            <option value="assign_supervisor">Assign Supervisor</option>
                            <option value="export_data">Export Data</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Target Users</label>
                        <select id="bulkTarget">
                            <option value="">Select Target</option>
                            <option value="pending_agents">Pending Field Agents</option>
                            <option value="pending_supervisors">Pending Supervisors</option>
                            <option value="incomplete_onboarding">Incomplete Onboarding</option>
                        </select>
                    </div>
                    <button class="btn-submit" onclick="window.onboardingUI.executeBulkAction()">
                        Execute Action
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'block';
        
        modal.querySelector('.close').onclick = () => modal.remove();
    }

    async executeBulkAction() {
        const action = document.getElementById('bulkAction').value;
        const target = document.getElementById('bulkTarget').value;
        
        if (!action || !target) {
            showUserMessage('Please select both action and target', 'error');
            return;
        }

        showUserMessage(`Executing ${action} for ${target}...`, 'info');
        document.querySelector('.modal').remove();
    }

    async exportOnboardingData() {
        showUserMessage('Exporting onboarding data...', 'info');
        // Implementation for exporting onboarding data
    }

    filterOnboardingData() {
        const status = document.getElementById('onboardingStatusFilter').value;
        showUserMessage(`Filtering by status: ${status || 'All'}`, 'info');
        // Implementation for filtering data
    }
}

// Initialize onboarding management UI
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('admin-onboarding-content')) {
        window.onboardingUI = new OnboardingManagementUI();
        window.onboardingUI.init();
    }
});