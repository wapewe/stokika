// Onboarding Management System for Admin Dashboard
class OnboardingManager {
    constructor() {
        this.supabase = window.supabase?.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    }

    // Get onboarding statistics
    async getOnboardingStats() {
        try {
            const [agentStats, supervisorStats] = await Promise.all([
                this.getAgentOnboardingStats(),
                this.getSupervisorOnboardingStats()
            ]);

            return {
                agents: agentStats,
                supervisors: supervisorStats,
                totalPending: agentStats.pending + supervisorStats.pending,
                totalApproved: agentStats.approved + supervisorStats.approved
            };
        } catch (error) {
            console.error('Error getting onboarding stats:', error);
            return null;
        }
    }

    // Get agent onboarding statistics
    async getAgentOnboardingStats() {
        try {
            const { data, error } = await this.supabase
                .from('field_agents')
                .select('approval_status, interview_status, created_at');

            if (error) throw error;

            const stats = {
                total: data.length,
                pending: data.filter(a => a.approval_status === 'pending').length,
                approved: data.filter(a => a.approval_status === 'approved').length,
                rejected: data.filter(a => a.approval_status === 'rejected').length,
                suspended: data.filter(a => a.approval_status === 'suspended').length,
                interviewed: data.filter(a => a.interview_status === 'interviewed').length,
                awaitingInterview: data.filter(a => a.interview_status === 'awaiting_interview').length,
                recentApplications: data.filter(a => 
                    new Date(a.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                ).length
            };

            return stats;
        } catch (error) {
            console.error('Error getting agent stats:', error);
            return { total: 0, pending: 0, approved: 0, rejected: 0, suspended: 0 };
        }
    }

    // Get supervisor onboarding statistics
    async getSupervisorOnboardingStats() {
        try {
            const { data, error } = await this.supabase
                .from('supervisors')
                .select('approval_status, interview_status, is_active, created_at');

            if (error) throw error;

            const stats = {
                total: data.length,
                pending: data.filter(s => s.approval_status === 'pending').length,
                approved: data.filter(s => s.approval_status === 'approved').length,
                rejected: data.filter(s => s.approval_status === 'rejected').length,
                active: data.filter(s => s.is_active === true).length,
                interviewed: data.filter(s => s.interview_status === 'interviewed').length,
                awaitingInterview: data.filter(s => s.interview_status === 'awaiting_interview').length,
                recentApplications: data.filter(s => 
                    new Date(s.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                ).length
            };

            return stats;
        } catch (error) {
            console.error('Error getting supervisor stats:', error);
            return { total: 0, pending: 0, approved: 0, rejected: 0, active: 0 };
        }
    }

    // Schedule interview for agent
    async scheduleAgentInterview(agentId, interviewDate, notes = '') {
        try {
            const { error } = await this.supabase
                .from('field_agents')
                .update({
                    interview_status: 'awaiting_interview',
                    interview_date: interviewDate,
                    interview_notes: notes,
                    updated_at: new Date().toISOString()
                })
                .eq('id', agentId);

            if (error) throw error;

            // Log the action
            await this.logOnboardingAction(agentId, 'field_agent', 'interview_scheduled', {
                interview_date: interviewDate,
                notes: notes
            });

            return true;
        } catch (error) {
            console.error('Error scheduling interview:', error);
            return false;
        }
    }

    // Schedule interview for supervisor
    async scheduleSupervisorInterview(supervisorId, interviewDate, notes = '') {
        try {
            const { error } = await this.supabase
                .from('supervisors')
                .update({
                    interview_status: 'awaiting_interview',
                    interview_date: interviewDate,
                    interview_notes: notes,
                    updated_at: new Date().toISOString()
                })
                .eq('id', supervisorId);

            if (error) throw error;

            // Log the action
            await this.logOnboardingAction(supervisorId, 'supervisor', 'interview_scheduled', {
                interview_date: interviewDate,
                notes: notes
            });

            return true;
        } catch (error) {
            console.error('Error scheduling interview:', error);
            return false;
        }
    }

    // Bulk approve agents
    async bulkApproveAgents(agentIds, approvedBy) {
        try {
            const { error } = await this.supabase
                .from('field_agents')
                .update({
                    approval_status: 'approved',
                    approved_by: approvedBy,
                    approved_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .in('id', agentIds);

            if (error) throw error;

            // Log bulk action
            for (const agentId of agentIds) {
                await this.logOnboardingAction(agentId, 'field_agent', 'bulk_approved', {
                    approved_by: approvedBy
                });
            }

            return true;
        } catch (error) {
            console.error('Error bulk approving agents:', error);
            return false;
        }
    }

    // Bulk reject agents
    async bulkRejectAgents(agentIds, rejectionReason, rejectedBy) {
        try {
            const { error } = await this.supabase
                .from('field_agents')
                .update({
                    approval_status: 'rejected',
                    rejection_reason: rejectionReason,
                    approved_by: rejectedBy,
                    approved_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .in('id', agentIds);

            if (error) throw error;

            // Log bulk action
            for (const agentId of agentIds) {
                await this.logOnboardingAction(agentId, 'field_agent', 'bulk_rejected', {
                    rejected_by: rejectedBy,
                    reason: rejectionReason
                });
            }

            return true;
        } catch (error) {
            console.error('Error bulk rejecting agents:', error);
            return false;
        }
    }

    // Generate onboarding report
    async generateOnboardingReport(startDate, endDate) {
        try {
            const [agents, supervisors] = await Promise.all([
                this.supabase
                    .from('field_agents')
                    .select('*')
                    .gte('created_at', startDate)
                    .lte('created_at', endDate)
                    .order('created_at', { ascending: false }),
                this.supabase
                    .from('supervisors')
                    .select('*')
                    .gte('created_at', startDate)
                    .lte('created_at', endDate)
                    .order('created_at', { ascending: false })
            ]);

            if (agents.error) throw agents.error;
            if (supervisors.error) throw supervisors.error;

            const report = {
                period: { start: startDate, end: endDate },
                agents: {
                    total: agents.data.length,
                    approved: agents.data.filter(a => a.approval_status === 'approved').length,
                    rejected: agents.data.filter(a => a.approval_status === 'rejected').length,
                    pending: agents.data.filter(a => a.approval_status === 'pending').length,
                    byCounty: this.groupByCounty(agents.data),
                    averageProcessingTime: this.calculateAverageProcessingTime(agents.data)
                },
                supervisors: {
                    total: supervisors.data.length,
                    approved: supervisors.data.filter(s => s.approval_status === 'approved').length,
                    rejected: supervisors.data.filter(s => s.approval_status === 'rejected').length,
                    pending: supervisors.data.filter(s => s.approval_status === 'pending').length,
                    active: supervisors.data.filter(s => s.is_active === true).length,
                    byCounty: this.groupByCounty(supervisors.data),
                    averageProcessingTime: this.calculateAverageProcessingTime(supervisors.data)
                },
                generatedAt: new Date().toISOString()
            };

            return report;
        } catch (error) {
            console.error('Error generating report:', error);
            return null;
        }
    }

    // Group applications by county
    groupByCounty(applications) {
        const grouped = {};
        applications.forEach(app => {
            const county = app.county || 'Unknown';
            if (!grouped[county]) {
                grouped[county] = { total: 0, approved: 0, rejected: 0, pending: 0 };
            }
            grouped[county].total++;
            grouped[county][app.approval_status || 'pending']++;
        });
        return grouped;
    }

    // Calculate average processing time
    calculateAverageProcessingTime(applications) {
        const processed = applications.filter(app => 
            app.approved_at && app.approval_status !== 'pending'
        );

        if (processed.length === 0) return 0;

        const totalTime = processed.reduce((sum, app) => {
            const created = new Date(app.created_at);
            const approved = new Date(app.approved_at);
            return sum + (approved - created);
        }, 0);

        return Math.round(totalTime / processed.length / (1000 * 60 * 60 * 24)); // days
    }

    // Log onboarding actions
    async logOnboardingAction(entityId, entityType, action, details = {}) {
        try {
            const { error } = await this.supabase
                .from('audit_logs')
                .insert([{
                    entity_type: entityType,
                    entity_id: entityId,
                    action: action,
                    new_values: details,
                    created_at: new Date().toISOString()
                }]);

            if (error) throw error;
        } catch (error) {
            console.error('Error logging action:', error);
        }
    }

    // Get onboarding pipeline
    async getOnboardingPipeline() {
        try {
            const [agents, supervisors] = await Promise.all([
                this.supabase
                    .from('field_agents')
                    .select('id, full_name, email, county, approval_status, interview_status, created_at')
                    .eq('approval_status', 'pending')
                    .order('created_at', { ascending: true })
                    .limit(10),
                this.supabase
                    .from('supervisors')
                    .select('id, full_name, email, county, approval_status, interview_status, created_at')
                    .eq('approval_status', 'pending')
                    .order('created_at', { ascending: true })
                    .limit(10)
            ]);

            if (agents.error) throw agents.error;
            if (supervisors.error) throw supervisors.error;

            return {
                agents: agents.data.map(agent => ({
                    ...agent,
                    type: 'field_agent',
                    daysWaiting: Math.floor((Date.now() - new Date(agent.created_at)) / (1000 * 60 * 60 * 24))
                })),
                supervisors: supervisors.data.map(supervisor => ({
                    ...supervisor,
                    type: 'supervisor',
                    daysWaiting: Math.floor((Date.now() - new Date(supervisor.created_at)) / (1000 * 60 * 60 * 24))
                }))
            };
        } catch (error) {
            console.error('Error getting pipeline:', error);
            return { agents: [], supervisors: [] };
        }
    }

    // Send onboarding reminder emails
    async sendOnboardingReminders(type = 'all') {
        try {
            const pipeline = await this.getOnboardingPipeline();
            let candidates = [];

            if (type === 'all' || type === 'agents') {
                candidates = candidates.concat(
                    pipeline.agents.filter(agent => agent.daysWaiting >= 3)
                );
            }

            if (type === 'all' || type === 'supervisors') {
                candidates = candidates.concat(
                    pipeline.supervisors.filter(supervisor => supervisor.daysWaiting >= 3)
                );
            }

            // This would integrate with your email service
            const emailPromises = candidates.map(candidate => {
                return this.sendReminderEmail(candidate);
            });

            await Promise.all(emailPromises);
            return candidates.length;
        } catch (error) {
            console.error('Error sending reminders:', error);
            return 0;
        }
    }

    // Send reminder email (placeholder for email service integration)
    async sendReminderEmail(candidate) {
        try {
            // Log the email in the database
            const { error } = await this.supabase
                .from('email_logs')
                .insert([{
                    recipient_email: candidate.email,
                    recipient_name: candidate.full_name,
                    subject: `Onboarding Status Update - ${candidate.type === 'field_agent' ? 'Field Agent' : 'Supervisor'} Application`,
                    message: `Dear ${candidate.full_name}, your application is being reviewed. We will contact you soon.`,
                    email_type: 'onboarding_reminder',
                    status: 'sent'
                }]);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error logging reminder email:', error);
            return false;
        }
    }

    // Get document verification status
    async getDocumentVerificationStatus(entityId, entityType) {
        try {
            const tableName = entityType === 'field_agent' ? 'agent_documents' : 'supervisor_documents';
            const { data, error } = await this.supabase
                .from(tableName)
                .select('*')
                .eq(entityType === 'field_agent' ? 'agent_id' : 'supervisor_id', entityId);

            if (error) throw error;

            const requiredDocs = entityType === 'field_agent' 
                ? ['passportPhoto', 'nationalIdFront', 'nationalIdBack', 'cv']
                : ['passportPhoto', 'nationalIdFront', 'nationalIdBack', 'cv', 'goodConduct'];

            const uploadedDocs = data.map(doc => doc.document_type);
            const missingDocs = requiredDocs.filter(doc => !uploadedDocs.includes(doc));

            return {
                total: requiredDocs.length,
                uploaded: uploadedDocs.length,
                missing: missingDocs,
                complete: missingDocs.length === 0,
                documents: data
            };
        } catch (error) {
            console.error('Error getting document status:', error);
            return { total: 0, uploaded: 0, missing: [], complete: false, documents: [] };
        }
    }

    // Auto-assign supervisors to agents
    async autoAssignSupervisors() {
        try {
            // Get approved agents without supervisors
            const { data: unassignedAgents, error: agentError } = await this.supabase
                .from('field_agents')
                .select('id, county')
                .eq('approval_status', 'approved')
                .is('supervisor_id', null);

            if (agentError) throw agentError;

            // Get active supervisors
            const { data: activeSupervisors, error: supervisorError } = await this.supabase
                .from('supervisors')
                .select('id, county, assigned_region')
                .eq('is_active', true)
                .eq('approval_status', 'approved');

            if (supervisorError) throw supervisorError;

            const assignments = [];

            for (const agent of unassignedAgents) {
                // Find supervisor in same county
                const supervisor = activeSupervisors.find(s => 
                    s.county === agent.county || 
                    (s.assigned_region && s.assigned_region.includes(agent.county))
                );

                if (supervisor) {
                    assignments.push({
                        agentId: agent.id,
                        supervisorId: supervisor.id
                    });
                }
            }

            // Execute assignments
            for (const assignment of assignments) {
                await this.supabase
                    .from('field_agents')
                    .update({ supervisor_id: assignment.supervisorId })
                    .eq('id', assignment.agentId);
            }

            return assignments.length;
        } catch (error) {
            console.error('Error auto-assigning supervisors:', error);
            return 0;
        }
    }
}

// Onboarding Dashboard Widget
class OnboardingDashboard {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.manager = new OnboardingManager();
    }

    // Render onboarding dashboard
    async render() {
        const stats = await this.manager.getOnboardingStats();
        const pipeline = await this.manager.getOnboardingPipeline();

        if (!stats) {
            this.container.innerHTML =XSSProtection.sanitize( XSSProtection.sanitize(<div class="error">Error loading onboarding data</div>';
            return;
        }

        this.container.innerHTML = XSSProtection.sanitize(`
            <div class="onboarding-dashboard">
                <div class="dashboard-...der">
                    <h2>Onboarding Management</h2>
                    <div class="dashboard-actions">
                        <button class="btn-action btn-approve" onclick="onboardingDashboard.bulkApprove()">Bulk Approve</button>
                        <button class="btn-action btn-email" onclick="onboardingDashboard.sendReminders()">Send Reminders</button>
                        <button class="btn-action btn-export" onclick="onboardingDashboard.exportReport()">Export Report</button>
                    </div>
                </div>

                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">👥</div>
                        <div class="stat-info">
                            <div class="stat-number">${sanitize(stats.agents.total)}</div>
                            <div class="stat-label">Total Agents</div>
                            <div class="stat-breakdown">
                                <span class="pending">${sanitize(stats.agents.pending)} pending</span>
                                <span class="approved">${sanitize(stats.agents.approved)} approved</span>
                            </div>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon">👨💼</div>
                        <div class="stat-info">
                            <div class="stat-number">${sanitize(stats.supervisors.total)}</div>
                            <div class="stat-label">Total Supervisors</div>
                            <div class="stat-breakdown">
                                <span class="pending">${sanitize(stats.supervisors.pending)} pending</span>
                                <span class="approved">${sanitize(stats.supervisors.active)} active</span>
                            </div>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon">⏳</div>
                        <div class="stat-info">
                            <div class="stat-number">${sanitize(stats.totalPending)}</div>
                            <div class="stat-label">Pending Review</div>
                            <div class="stat-breakdown">
                                <span class="recent">${sanitize(stats.agents.recentApplications + stats.supervisors.recentApplications)} this week</span>
                            </div>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon">📋</div>
                        <div class="stat-info">
                            <div class="stat-number">${sanitize(stats.agents.interviewed + stats.supervisors.interviewed)}</div>
                            <div class="stat-label">Interviewed</div>
                            <div class="stat-breakdown">
                                <span class="awaiting">${sanitize(stats.agents.awaitingInterview + stats.supervisors.awaitingInterview)} awaiting</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="pipeline-section">
                    <h3>Onboarding Pipeline</h3>
                    <div class="pipeline-grid">
                        <div class="pipeline-column">
                            <h4>Field Agents (${sanitize(pipeline.agents.length)})</h4>
                            <div class="pipeline-items">
                                ${sanitize(pipeline.agents.map(agent => `
                                    <div class="pipeline-item">
                                        <div class="item-info">
                                            <strong>${agent.full_name)}</strong>
                                            <span class="county">${sanitize(agent.county)}</span>
                                            <span class="waiting">${sanitize(agent.daysWaiting)} days waiting</span>
                                        </div>
                                        <div class="item-actions">
                                            <button class="btn-mini btn-approve" onclick="onboardingDashboard.quickApprove('${sanitize(agent.id)}', 'field_agent')">✓</button>
                                            <button class="btn-mini btn-interview" onclick="onboardingDashboard.scheduleInterview('${sanitize(agent.id)}', 'field_agent')">📅</button>
                                            <button class="btn-mini btn-view" onclick="onboardingDashboard.viewDetails('${sanitize(agent.id)}', 'field_agent')">👁</button>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <div class="pipeline-column">
                            <h4>Supervisors (${pipeline.supervisors.length})</h4>
                            <div class="pipeline-items">
                                ${pipeline.supervisors.map(supervisor => `
                                    <div class="pipeline-item">
                                        <div class="item-info">
                                            <strong>${supervisor.full_name}</strong>
                                            <span class="county">${supervisor.county}</span>
                                            <span class="waiting">${supervisor.daysWaiting} days waiting</span>
                                        </div>
                                        <div class="item-actions">
                                            <button class="btn-mini btn-approve" onclick="onboardingDashboard.quickApprove('${supervisor.id}', 'supervisor')">✓</button>
                                            <button class="btn-mini btn-interview" onclick="onboardingDashboard.scheduleInterview('${supervisor.id}', 'supervisor')">📅</button>
                                            <button class="btn-mini btn-view" onclick="onboardingDashboard.viewDetails('${supervisor.id}', 'supervisor')">👁</button>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Quick approve candidate
    async quickApprove(id, type) {
        if (!confirm(`Approve this ${type.replace('_', ' ')}?`)) return;

        try {
            const table = type === 'field_agent' ? 'field_agents' : 'supervisors';
            const { error } = await this.manager.supabase
                .from(table)
                .update({
                    approval_status: 'approved',
                    approved_at: new Date().toISOString()
                })
                .eq('id', id);

            if (error) throw error;

            alert('Approved successfully!');
            this.render(); // Refresh dashboard
        } catch (error) {
            console.error('Error approving:', error);
            alert('Error approving candidate');
        }
    }

    // Schedule interview
    async scheduleInterview(id, type) {
        const date = prompt('Enter interview date (YYYY-MM-DD):');
        if (!date) return;

        const notes = prompt('Interview notes (optional):') || '';

        try {
            if (type === 'field_agent') {
                await this.manager.scheduleAgentInterview(id, date, notes);
            } else {
                await this.manager.scheduleSupervisorInterview(id, date, notes);
            }

            alert('Interview scheduled successfully!');
            this.render();
        } catch (error) {
            console.error('Error scheduling interview:', error);
            alert('Error scheduling interview');
        }
    }

    // View candidate details
    viewDetails(id, type) {
        if (type === 'field_agent') {
            window.manageAgent(id);
        } else {
            window.manageSupervisor(id);
        }
    }

    // Bulk approve selected candidates
    async bulkApprove() {
        // This would integrate with your existing selection system
        alert('Bulk approve feature - integrate with your selection system');
    }

    // Send reminder emails
    async sendReminders() {
        try {
            const count = await this.manager.sendOnboardingReminders();
            alert(`Sent ${count} reminder emails`);
        } catch (error) {
            console.error('Error sending reminders:', error);
            alert('Error sending reminders');
        }
    }

    // Export onboarding report
    async exportReport() {
        const startDate = prompt('Start date (YYYY-MM-DD):', 
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        );
        const endDate = prompt('End date (YYYY-MM-DD):', 
            new Date().toISOString().split('T')[0]
        );

        if (!startDate || !endDate) return;

        try {
            const report = await this.manager.generateOnboardingReport(startDate, endDate);
            if (report) {
                this.downloadReport(report);
            }
        } catch (error) {
            console.error('Error generating report:', error);
            alert('Error generating report');
        }
    }

    // Download report as JSON
    downloadReport(report) {
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `onboarding_report_${report.period.start}_${report.period.end}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Export classes
window.OnboardingManager = OnboardingManager;
window.OnboardingDashboard = OnboardingDashboard;