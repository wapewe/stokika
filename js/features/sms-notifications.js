// SMS Notifications Integration
class SMSNotifications {
    constructor() {
        this.supabase = null;
        this.apiConfig = {
            // Configure with your SMS provider (e.g., Africa's Talking, Twilio)
            provider: 'africas_talking', // or 'twilio'
            apiKey: '', // Set in environment
            username: '', // Set in environment
            shortCode: '40404' // Your SMS short code
        };
    }

    async init() {
        this.supabase = initSupabase();
        if (!this.supabase) throw new Error('Database connection failed');
        await this.loadSMSSettings();
    }

    async loadSMSSettings() {
        try {
            const container = document.getElementById('smsContent') || document.createElement('div');
            container.innerHTML = XSSProtection.sanitize(`
                <div class="sms-dashboard">
                    <div class="sms-heade...
                        <h2>📱 SMS Notifications</h2>
                        <p>Manage SMS campaigns and automated notifications</p>
                    </div>

                    <div class="sms-stats">
                        <div class="stat-card">
                            <div class="stat-icon">📤</div>
                            <div class="stat-info">
                                <h4>Messages Sent Today</h4>
                                <span id="messagesSentToday">-</span>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">✅</div>
                            <div class="stat-info">
                                <h4>Delivery Rate</h4>
                                <span id="deliveryRate">-</span>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">💰</div>
                            <div class="stat-info">
                                <h4>SMS Credits</h4>
                                <span id="smsCredits">-</span>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">📊</div>
                            <div class="stat-info">
                                <h4>This Month</h4>
                                <span id="monthlyMessages">-</span>
                            </div>
                        </div>
                    </div>

                    <div class="sms-actions">
                        <button class="btn-primary" id="btnSendSMS">📱 Send SMS</button>
                        <button class="btn-secondary" id="btnBulkSMS">📢 Bulk SMS</button>
                        <button class="btn-secondary" id="btnTemplates">📝 Templates</button>
                        <button class="btn-secondary" id="btnSMSHistory">📋 History</button>
                    </div>

                    <div class="sms-content">
                        <div class="templates-section">
                            <h3>SMS Templates</h3>
                            <div id="templatesGrid" class="templates-grid"></div>
                        </div>

                        <div class="automation-section">
                            <h3>Automated SMS Triggers</h3>
                            <div class="automation-settings">
                                <div class="setting-item">
                                    <label>
                                        <input type="checkbox" id="orderConfirmationSMS" checked>
                                        Order Confirmation SMS
                                    </label>
                                    <p>Send SMS when order is confirmed</p>
                                </div>
                                <div class="setting-item">
                                    <label>
                                        <input type="checkbox" id="deliveryUpdateSMS" checked>
                                        Delivery Updates
                                    </label>
                                    <p>Send SMS for delivery status changes</p>
                                </div>
                                <div class="setting-item">
                                    <label>
                                        <input type="checkbox" id="paymentReminderSMS">
                                        Payment Reminders
                                    </label>
                                    <p>Send SMS for pending payments</p>
                                </div>
                                <div class="setting-item">
                                    <label>
                                        <input type="checkbox" id="welcomeSMS" checked>
                                        Welcome Messages
                                    </label>
                                    <p>Send welcome SMS to new users</p>
                                </div>
                            </div>
                            <button class="btn-submit" id="btnSaveAutomation">Save Settings</button>
                        </div>

                        <div class="history-section" id="smsHistory" style="display: none;">
                            <h3>SMS History</h3>
                            <div id="historyTable"></div>
                        </div>
                    </div>
                </div>
            `;

            this.attachEventListeners();
            await this.loadSMSStats();
            await this.loadTemplates();
        } catch (error) {
            console.error('Error loading SMS settings:', error);
            showUserMessage('Error loading SMS settings', 'error');
        }
    }

    attachEventListeners() {
        const sendBtn = document.getElementById('btnSendSMS');
        const bulkBtn = document.getElementById('btnBulkSMS');
        const templatesBtn = document.getElementById('btnTemplates');
        const historyBtn = document.getElementById('btnSMSHistory');
        const saveBtn = document.getElementById('btnSaveAutomation');

        if (sendBtn) sendBtn.addEventListener('click', () => this.showSendSMSModal());
        if (bulkBtn) bulkBtn.addEventListener('click', () => this.showBulkSMSModal());
        if (templatesBtn) templatesBtn.addEventListener('click', () => this.showTemplatesModal());
        if (historyBtn) historyBtn.addEventListener('click', () => this.toggleHistory());
        if (saveBtn) saveBtn.addEventListener('click', () => this.saveAutomationSettings());
    }

    async loadSMSStats() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const thisMonth = new Date().toISOString().slice(0, 7);

            const { data: todayMessages } = await this.supabase
                .from('sms_logs')
                .select('id, status')
                .gte('created_at', today);

            const { data: monthlyMessages } = await this.supabase
                .from('sms_logs')
                .select('id')
                .gte('created_at', thisMonth);

            const sentToday = todayMessages?.length || 0;
            const deliveredToday = todayMessages?.filter(msg => msg.status === 'delivered').length || 0;
            const deliveryRate = sentToday > 0 ? Math.round((deliveredToday / sentToday) * 100) : 0;

            document.getElementById('messagesSentToday').textContent = sentToday;
            document.getElementById('deliveryRate').textContent = `${deliveryRate}%`;
            document.getElementById('smsCredits').textContent = '1,250'; // Mock data
            document.getElementById('monthlyMessages').textContent = monthlyMessages?.length || 0;
        } catch (error) {
            console.error('Error loading SMS stats:', error);
        }
    }

    async loadTemplates() {
        try {
            const { data: templates } = await this.supabase
                .from('sms_templates')
                .select('*')
                .eq('is_active', true);

            const templatesGrid = document.getElementById('templatesGrid');
            if (!templatesGrid) return;

            if (!templates || templates.length === 0) {
                templatesGrid.innerHTML =XSSProtection.sanitize( XSSProtection.sanitize('<p>No SMS templates found</p>');
                return;
            }

            templatesGrid.innerHTML = XSSProtection.sanitize(templates.map(template => `
                <div class="template-card">
                    <h4>${template.name}</h4>
                    <p class="template-text">${template.template_text}</p>
                    <div class="template-variables">
                        Variables: ${template.variables?.join(', ') || 'None'}
                    </div>
                    <div class="template-actions">
                        <button class="btn-small" onclick="window.smsNotifications.useTemplate('${template.id}')">Use</button>
                        <button class="btn-small" onclick="window.smsNotifications.editTemplate('${template.id}')">Edit</button>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading templates:', error);
        }
    }

    showSendSMSModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = XSSProtection.sanitize(`
            <div class="modal-content">
                <div class="modal-header">
  ...               <h2>📱 Send SMS</h2>
                    <button type="button" class="close">&times;</button>
                </div>
                <form onsubmit="event.preventDefault(); window.smsNotifications.sendSingleSMS();">
                    <div class="form-group">
                        <label>Recipient Phone Number</label>
                        <input type="tel" id="smsRecipient" placeholder="+254712345678" required>
                        <small>Include country code (e.g., +254 for Kenya)</small>
                    </div>
                    <div class="form-group">
                        <label>Message</label>
                        <textarea id="smsMessage" maxlength="160" placeholder="Enter your message..." required></textarea>
                        <small><span id="charCount">0</span>/160 characters</small>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="scheduleMessage">
                            Schedule for later
                        </label>
                    </div>
                    <div class="form-group" id="scheduleTime" style="display: none;">
                        <label>Send Time</label>
                        <input type="datetime-local" id="scheduledTime">
                    </div>
                    <button type="submit" class="btn-submit">Send SMS</button>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'block';
        
        // Character counter
        const messageInput = modal.querySelector('#smsMessage');
        const charCount = modal.querySelector('#charCount');
        messageInput.addEventListener('input', () => {
            charCount.textContent = messageInput.value.length;
        });

        // Schedule toggle
        const scheduleCheckbox = modal.querySelector('#scheduleMessage');
        const scheduleTimeDiv = modal.querySelector('#scheduleTime');
        scheduleCheckbox.addEventListener('change', () => {
            scheduleTimeDiv.style.display = scheduleCheckbox.checked ? 'block' : 'none';
        });
        
        modal.querySelector('.close').onclick = () => modal.remove();
    }

    showBulkSMSModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = XSSProtection.sanitize(`
            <div class="modal-content">
                <div class="modal-header">
  ...               <h2>📢 Bulk SMS Campaign</h2>
                    <button type="button" class="close">&times;</button>
                </div>
                <form onsubmit="event.preventDefault(); window.smsNotifications.sendBulkSMS();">
                    <div class="form-group">
                        <label>Target Audience</label>
                        <select id="bulkAudience" required>
                            <option value="">Select Audience</option>
                            <option value="all_vendors">All Vendors</option>
                            <option value="active_vendors">Active Vendors</option>
                            <option value="field_agents">Field Agents</option>
                            <option value="supervisors">Supervisors</option>
                            <option value="custom">Custom List</option>
                        </select>
                    </div>
                    <div class="form-group" id="customNumbers" style="display: none;">
                        <label>Phone Numbers (one per line)</label>
                        <textarea id="phoneNumbers" placeholder="+254712345678\n+254723456789"></textarea>
                    </div>
                    <div class="form-group">
                        <label>Message Template</label>
                        <select id="messageTemplate">
                            <option value="">Select Template</option>
                            <option value="custom">Custom Message</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Message</label>
                        <textarea id="bulkMessage" maxlength="160" required></textarea>
                        <small><span id="bulkCharCount">0</span>/160 characters</small>
                    </div>
                    <div class="estimated-cost">
                        <p>Estimated Recipients: <span id="estimatedRecipients">0</span></p>
                        <p>Estimated Cost: KES <span id="estimatedCost">0</span></p>
                    </div>
                    <button type="submit" class="btn-submit">Send Bulk SMS</button>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'block';
        
        // Event listeners for bulk SMS modal
        const audienceSelect = modal.querySelector('#bulkAudience');
        const customDiv = modal.querySelector('#customNumbers');
        const messageInput = modal.querySelector('#bulkMessage');
        const charCount = modal.querySelector('#bulkCharCount');

        audienceSelect.addEventListener('change', () => {
            customDiv.style.display = audienceSelect.value === 'custom' ? 'block' : 'none';
            this.updateBulkEstimate();
        });

        messageInput.addEventListener('input', () => {
            charCount.textContent = messageInput.value.length;
        });
        
        modal.querySelector('.close').onclick = () => modal.remove();
    }

    async updateBulkEstimate() {
        const audience = document.getElementById('bulkAudience')?.value;
        if (!audience) return;

        try {
            let count = 0;
            
            switch (audience) {
                case 'all_vendors':
                    const { data: allVendors } = await this.supabase
                        .from('vendors')
                        .select('id');
                    count = allVendors?.length || 0;
                    break;
                case 'active_vendors':
                    const { data: activeVendors } = await this.supabase
                        .from('vendors')
                        .select('id')
                        .eq('status', 'active');
                    count = activeVendors?.length || 0;
                    break;
                case 'field_agents':
                    const { data: agents } = await this.supabase
                        .from('field_agents')
                        .select('id')
                        .eq('approval_status', 'approved');
                    count = agents?.length || 0;
                    break;
                case 'custom':
                    const phoneNumbers = document.getElementById('phoneNumbers')?.value || '';
                    count = phoneNumbers.split('\n').filter(num => num.trim()).length;
                    break;
            }

            const costPerSMS = 2; // KES 2 per SMS
            const totalCost = count * costPerSMS;

            document.getElementById('estimatedRecipients').textContent = count;
            document.getElementById('estimatedCost').textContent = totalCost;
        } catch (error) {
            console.error('Error updating estimate:', error);
        }
    }

    async sendSingleSMS() {
        try {
            const recipient = document.getElementById('smsRecipient').value;
            const message = document.getElementById('smsMessage').value;
            const scheduled = document.getElementById('scheduleMessage').checked;
            const scheduleTime = document.getElementById('scheduledTime')?.value;

            if (!this.validatePhoneNumber(recipient)) {
                showUserMessage('Invalid phone number format', 'error');
                return;
            }

            const smsData = {
                recipient_phone: recipient,
                message_text: message,
                status: scheduled ? 'scheduled' : 'pending',
                scheduled_time: scheduled ? scheduleTime : null
            };

            // Log SMS in database
            const { error } = await this.supabase
                .from('sms_logs')
                .insert([smsData]);

            if (error) throw error;

            // Send SMS via provider API
            if (!scheduled) {
                await this.sendSMSViaProvider(recipient, message);
            }

            showUserMessage('SMS sent successfully!', 'success');
            document.querySelector('.modal').remove();
            await this.loadSMSStats();

        } catch (error) {
            console.error('Error sending SMS:', error);
            showUserMessage('Error sending SMS', 'error');
        }
    }

    async sendBulkSMS() {
        try {
            const audience = document.getElementById('bulkAudience').value;
            const message = document.getElementById('bulkMessage').value;
            
            const recipients = await this.getRecipientsList(audience);
            
            if (recipients.length === 0) {
                showUserMessage('No recipients found', 'error');
                return;
            }

            if (!confirm(`Send SMS to ${recipients.length} recipients?`)) {
                return;
            }

            let successCount = 0;
            let failCount = 0;

            for (const recipient of recipients) {
                try {
                    await this.sendSMSViaProvider(recipient, message);
                    
                    // Log successful SMS
                    await this.supabase
                        .from('sms_logs')
                        .insert([{
                            recipient_phone: recipient,
                            message_text: message,
                            status: 'sent'
                        }]);
                    
                    successCount++;
                } catch (error) {
                    console.error(`Failed to send SMS to ${recipient}:`, error);
                    failCount++;
                }
                
                // Small delay to prevent rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            showUserMessage(`Bulk SMS completed: ${successCount} sent, ${failCount} failed`, 'success');
            document.querySelector('.modal').remove();
            await this.loadSMSStats();

        } catch (error) {
            console.error('Error sending bulk SMS:', error);
            showUserMessage('Error sending bulk SMS', 'error');
        }
    }

    async getRecipientsList(audience) {
        try {
            let recipients = [];

            switch (audience) {
                case 'all_vendors':
                    const { data: allVendors } = await this.supabase
                        .from('vendors')
                        .select('users(phone_number)')
                        .not('users.phone_number', 'is', null);
                    recipients = allVendors?.map(v => v.users?.phone_number).filter(Boolean) || [];
                    break;

                case 'active_vendors':
                    const { data: activeVendors } = await this.supabase
                        .from('vendors')
                        .select('users(phone_number)')
                        .eq('status', 'active')
                        .not('users.phone_number', 'is', null);
                    recipients = activeVendors?.map(v => v.users?.phone_number).filter(Boolean) || [];
                    break;

                case 'field_agents':
                    const { data: agents } = await this.supabase
                        .from('field_agents')
                        .select('phone_number')
                        .eq('approval_status', 'approved')
                        .not('phone_number', 'is', null);
                    recipients = agents?.map(a => a.phone_number).filter(Boolean) || [];
                    break;

                case 'custom':
                    const phoneNumbers = document.getElementById('phoneNumbers')?.value || '';
                    recipients = phoneNumbers.split('\n')
                        .map(num => num.trim())
                        .filter(num => num && this.validatePhoneNumber(num));
                    break;
            }

            return recipients;
        } catch (error) {
            console.error('Error getting recipients list:', error);
            return [];
        }
    }

    async sendSMSViaProvider(phoneNumber, message) {
        // Mock SMS sending - replace with actual provider integration
        console.log(`Sending SMS to ${phoneNumber}: ${message}`);
        
        // Example integration with Africa's Talking
        /*
        const response = await fetch('https://api.africastalking.com/version1/messaging', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'apiKey': this.apiConfig.apiKey
            },
            body: new URLSearchParams({
                username: this.apiConfig.username,
                to: phoneNumber,
                message: message,
                from: this.apiConfig.shortCode
            })
        });
        
        if (!response.ok) {
            throw new Error('SMS sending failed');
        }
        */
        
        // Simulate success for demo
        return Promise.resolve({ success: true });
    }

    validatePhoneNumber(phoneNumber) {
        // Basic validation for Kenyan phone numbers
        const kenyanPattern = /^\+254[17]\d{8}$/;
        return kenyanPattern.test(phoneNumber);
    }

    async toggleHistory() {
        const historySection = document.getElementById('smsHistory');
        if (!historySection) return;

        if (historySection.style.display === 'none') {
            await this.loadSMSHistory();
            historySection.style.display = 'block';
        } else {
            historySection.style.display = 'none';
        }
    }

    async loadSMSHistory() {
        try {
            const { data: smsLogs } = await this.supabase
                .from('sms_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);

            const historyTable = document.getElementById('historyTable');
            if (!historyTable) return;

            if (!smsLogs || smsLogs.length === 0) {
                historyTable.innerHTML =XSSProtection.sanitize( XSSProtection.sanitize('<p>No SMS history found</p>');
                return;
            }

            historyTable.innerHTML = XSSProtection.sanitize(`
                <table class="data-table">
                    <thead>
              ...       <tr>
                            <th>Date</th>
                            <th>Recipient</th>
                            <th>Message</th>
                            <th>Status</th>
                            <th>Cost</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sanitize(smsLogs.map(log => `
                            <tr>
                                <td>${new Date(log.created_at).toLocaleString())}</td>
                                <td>${sanitize(log.recipient_phone)}</td>
                                <td class="message-preview">${sanitize(log.message_text.substring(0, 50))}${sanitize(log.message_text.length > 50 ? '...' : '')}</td>
                                <td><span class="status-badge status-${sanitize(log.status)}">${sanitize(log.status)}</span></td>
                                <td>KES ${sanitize(log.cost || '2.00')}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } catch (error) {
            console.error('Error loading SMS history:', error);
        }
    }

    async saveAutomationSettings() {
        try {
            const settings = {
                order_confirmation: document.getElementById('orderConfirmationSMS').checked,
                delivery_updates: document.getElementById('deliveryUpdateSMS').checked,
                payment_reminders: document.getElementById('paymentReminderSMS').checked,
                welcome_messages: document.getElementById('welcomeSMS').checked
            };

            // Save settings to database or local storage
            localStorage.setItem('sms_automation_settings', JSON.stringify(settings));
            
            showUserMessage('Automation settings saved', 'success');
        } catch (error) {
            console.error('Error saving automation settings:', error);
            showUserMessage('Error saving settings', 'error');
        }
    }

    // Automated SMS functions
    async sendOrderConfirmationSMS(orderData) {
        const settings = JSON.parse(localStorage.getItem('sms_automation_settings') || '{}');
        if (!settings.order_confirmation) return;

        const message = `Your order #${orderData.id} has been confirmed. Total: KES ${orderData.total_amount}. Track your order at stokika.com`;
        
        if (orderData.vendor_phone) {
            await this.sendSMSViaProvider(orderData.vendor_phone, message);
        }
    }

    async sendDeliveryUpdateSMS(deliveryData) {
        const settings = JSON.parse(localStorage.getItem('sms_automation_settings') || '{}');
        if (!settings.delivery_updates) return;

        const message = `Delivery update: Your order #${deliveryData.order_id} is ${deliveryData.status}. Track: ${deliveryData.tracking_code}`;
        
        if (deliveryData.recipient_phone) {
            await this.sendSMSViaProvider(deliveryData.recipient_phone, message);
        }
    }

    async sendWelcomeSMS(userData) {
        const settings = JSON.parse(localStorage.getItem('sms_automation_settings') || '{}');
        if (!settings.welcome_messages) return;

        const message = `Welcome to Stokika, ${userData.name}! Your account is now active. Start exploring our products at stokika.com`;
        
        if (userData.phone_number) {
            await this.sendSMSViaProvider(userData.phone_number, message);
        }
    }
}

// Initialize SMS notifications
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('smsContent')) {
        window.smsNotifications = new SMSNotifications();
        window.smsNotifications.init();
    }
});