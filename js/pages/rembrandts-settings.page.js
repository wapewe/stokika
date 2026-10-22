// XSS Protection: Using sanitize() helper from xss-protection.js
// Make sure xss-protection.js is loaded in your HTML file

// Admin Settings Management
class AdminSettings {
    constructor() {
        this.supabase = null;
    }

    async init() {
        this.supabase = initSupabase();
        if (!this.supabase) throw new Error('Supabase not initialized');
        await this.loadAllSettings();
        this.attachEventListeners();
    }

    async loadAllSettings() {
        try {
            const { data, error } = await this.supabase
                .from('admin_settings')
                .select('*');
            
            if (error) {
                console.error('Error loading settings:', error);
                alert('Settings table not found. Please run admin-settings-schema.sql in Supabase SQL Editor.');
                return;
            }
            
            const settings = {};
            if (data) {
                data.forEach(s => settings[s.setting_key] = s.setting_value);
            }
            
            // Populate Settings Tab
            this.populateBusinessHours(settings);
            this.populateNotifications(settings);
            this.populateCommissions(settings);
            this.populatePaymentGateway(settings);
            this.populateContent(settings);
            this.populateWorkflow(settings);
        } catch (error) {
            console.error('Error loading settings:', error);
            alert('Error loading settings. Please ensure admin_settings table exists.');
        }
    }

    populateBusinessHours(settings) {
        const start = document.getElementById('businessHoursStart');
        const end = document.getElementById('businessHoursEnd');
        if (start) start.value = settings.business_hours_start || '08:00';
        if (end) end.value = settings.business_hours_end || '18:00';
    }

    populateNotifications(settings) {
        const email = document.getElementById('emailNotifications');
        const sms = document.getElementById('smsNotifications');
        const adminEmail = document.getElementById('adminNotificationEmail');
        
        if (email) email.checked = settings.email_notifications === 'true';
        if (sms) sms.checked = settings.sms_notifications === 'true';
        if (adminEmail) adminEmail.value = settings.admin_notification_email || '';
    }

    populateCommissions(settings) {
        const agent = document.getElementById('agentCommissionRate');
        const supervisor = document.getElementById('supervisorCommissionRate');
        const referral = document.getElementById('referralBonus');
        
        if (agent) agent.value = settings.agent_commission_rate || '5';
        if (supervisor) supervisor.value = settings.supervisor_commission_rate || '3';
        if (referral) referral.value = settings.referral_bonus || '500';
    }

    populatePaymentGateway(settings) {
        const paybill = document.getElementById('mpesaPaybill');
        const account = document.getElementById('mpesaAccount');
        
        if (paybill) paybill.value = settings.mpesa_paybill || '';
        if (account) account.value = settings.mpesa_account || '';
    }

    populateContent(settings) {
        const banner = document.getElementById('homepageBanner');
        const announcement = document.getElementById('announcementText');
        const active = document.getElementById('announcementActive');
        
        if (banner) banner.value = settings.homepage_banner_text || '';
        if (announcement) announcement.value = settings.announcement_text || '';
        if (active) active.checked = settings.announcement_active === 'true';
    }

    populateWorkflow(settings) {
        const threshold = document.getElementById('autoApproveThreshold');
        const supervisorApproval = document.getElementById('requireSupervisorApproval');
        
        if (threshold) threshold.value = settings.auto_approve_threshold || '10000';
        if (supervisorApproval) supervisorApproval.checked = settings.require_supervisor_approval === 'true';
    }

    attachEventListeners() {
        const saveBusinessHours = document.getElementById('btnSaveBusinessHours');
        const saveNotifications = document.getElementById('btnSaveNotifications');
        const saveCommissions = document.getElementById('btnSaveCommissions');
        const savePayment = document.getElementById('btnSavePayment');
        const saveContent = document.getElementById('btnSaveContent');
        const saveWorkflow = document.getElementById('btnSaveWorkflow');
        
        if (saveBusinessHours) saveBusinessHours.onclick = () => this.saveBusinessHours();
        if (saveNotifications) saveNotifications.onclick = () => this.saveNotifications();
        if (saveCommissions) saveCommissions.onclick = () => this.saveCommissions();
        if (savePayment) savePayment.onclick = () => this.savePaymentGateway();
        if (saveContent) saveContent.onclick = () => this.saveContent();
        if (saveWorkflow) saveWorkflow.onclick = () => this.saveWorkflow();
    }

    async saveSetting(key, value) {
        const { error } = await this.supabase
            .from('admin_settings')
            .upsert({ 
                setting_key: key,
                setting_value: value, 
                updated_at: new Date().toISOString(),
                category: this.getCategoryForKey(key)
            }, { onConflict: 'setting_key' });
        
        if (error) throw error;
    }
    
    getCategoryForKey(key) {
        if (key.includes('business_hours') || key.includes('business_days')) return 'business';
        if (key.includes('commission') || key.includes('referral')) return 'commission';
        if (key.includes('mpesa') || key.includes('payment')) return 'payment';
        if (key.includes('notification') || key.includes('email') || key.includes('sms')) return 'notifications';
        if (key.includes('approve') || key.includes('workflow')) return 'workflow';
        if (key.includes('banner') || key.includes('announcement')) return 'content';
        return 'general';
    }

    async saveBusinessHours() {
        try {
            const start = document.getElementById('businessHoursStart').value;
            const end = document.getElementById('businessHoursEnd').value;
            
            await this.saveSetting('business_hours_start', start);
            await this.saveSetting('business_hours_end', end);
            
            alert('Business hours updated successfully');
        } catch (error) {
            console.error('Error saving business hours:', error);
            alert('Failed to save business hours');
        }
    }

    async saveNotifications() {
        try {
            const email = document.getElementById('emailNotifications').checked;
            const sms = document.getElementById('smsNotifications').checked;
            const adminEmail = document.getElementById('adminNotificationEmail').value;
            
            await this.saveSetting('email_notifications', email.toString());
            await this.saveSetting('sms_notifications', sms.toString());
            await this.saveSetting('admin_notification_email', adminEmail);
            
            alert('Notification settings updated successfully');
        } catch (error) {
            console.error('Error saving notifications:', error);
            alert('Failed to save notification settings');
        }
    }

    async saveCommissions() {
        try {
            const agent = document.getElementById('agentCommissionRate').value;
            const supervisor = document.getElementById('supervisorCommissionRate').value;
            const referral = document.getElementById('referralBonus').value;
            
            await this.saveSetting('agent_commission_rate', agent);
            await this.saveSetting('supervisor_commission_rate', supervisor);
            await this.saveSetting('referral_bonus', referral);
            
            alert('Commission rates updated successfully');
        } catch (error) {
            console.error('Error saving commissions:', error);
            alert('Failed to save commission rates');
        }
    }

    async savePaymentGateway() {
        try {
            const paybill = document.getElementById('mpesaPaybill').value;
            const account = document.getElementById('mpesaAccount').value;
            
            await this.saveSetting('mpesa_paybill', paybill);
            await this.saveSetting('mpesa_account', account);
            
            alert('Payment gateway settings updated successfully');
        } catch (error) {
            console.error('Error saving payment gateway:', error);
            alert('Failed to save payment gateway settings');
        }
    }

    async saveContent() {
        try {
            const banner = document.getElementById('homepageBanner').value;
            const announcement = document.getElementById('announcementText').value;
            const active = document.getElementById('announcementActive').checked;
            
            await this.saveSetting('homepage_banner_text', banner);
            await this.saveSetting('announcement_text', announcement);
            await this.saveSetting('announcement_active', active.toString());
            
            alert('Content settings updated successfully');
        } catch (error) {
            console.error('Error saving content:', error);
            alert('Failed to save content settings');
        }
    }

    async saveWorkflow() {
        try {
            const threshold = document.getElementById('autoApproveThreshold').value;
            const supervisorApproval = document.getElementById('requireSupervisorApproval').checked;
            
            await this.saveSetting('auto_approve_threshold', threshold);
            await this.saveSetting('require_supervisor_approval', supervisorApproval.toString());
            
            alert('Workflow settings updated successfully');
        } catch (error) {
            console.error('Error saving workflow:', error);
            alert('Failed to save workflow settings');
        }
    }

    async loadAuditLogs() {
        try {
            const { data, error } = await this.supabase
                .from('admin_settings_audit')
                .select('*')
                .order('changed_at', { ascending: false })
                .limit(50);
            
            if (error) throw error;
            
            const container = document.getElementById('auditLogsTable');
            if (!container) return;
            
            if (!data || data.length === 0) {
                container.innerHTML = XSSProtection.sanitize('<p style="text-align:center;color:#6b7280;padding:2rem;">No audit logs found</p>');
                return;
            }
            
            let html = '<div style="overflow-x:auto;"><table class="data-table"><thead><tr><th>Setting</th><th>Old Value</th><th>New Value</th><th>Changed At</th></tr></thead><tbody>';
            
            data.forEach(log => {
                html += `<tr>
                    <td><strong>${log.setting_key}</strong></td>
                    <td>${log.old_value || '-'}</td>
                    <td>${log.new_value || '-'}</td>
                    <td>${new Date(log.changed_at).toLocaleString()}</td>
                </tr>`;
            });
            
            html += '</tbody></table></div>';
            container.textContent = html; // XSS-FIX: Changed from innerHTML - Review if HTML is needed
        } catch (error) {
            console.error('Error loading audit logs:', error);
            const container = document.getElementById('auditLogsTable');
            if (container) {
                container.innerHTML = XSSProtection.sanitize('<p style="color:#ef4444;padding:1rem;">Error loading audit logs: ' + error.message + '</p>');
            }
        }
    }
}

// Initialize when settings tab is opened
let adminSettingsInstance = null;

async function initAdminSettings() {
    if (!adminSettingsInstance) {
        adminSettingsInstance = new AdminSettings();
        await adminSettingsInstance.init();
    }
}
