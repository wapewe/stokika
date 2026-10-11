// Email Service Configuration for stokika Admin Dashboard
// This service handles bulk email functionality and integrates with email providers

class EmailService {
    constructor() {
        this.apiKey = 'your-email-service-api-key'; // Replace with actual API key
        this.baseUrl = 'https://api.emailservice.com'; // Replace with actual service URL
        this.fromEmail = 'admin@stokika.com';
        this.fromName = 'stokika Admin';
    }

    // Send single email
    async sendEmail(to, subject, message, isHtml = false) {
        try {
            const emailData = {
                from: {
                    email: this.fromEmail,
                    name: this.fromName
                },
                to: [{ email: to }],
                subject: subject,
                content: isHtml ? { html: message } : { text: message }
            };

            // This would integrate with your email service provider
            // Example: SendGrid, Mailgun, AWS SES, etc.
            console.log('Sending email:', emailData);
            
            // Simulate API call
            const response = await fetch(`${this.baseUrl}/send`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(emailData)
            });

            if (!response.ok) {
                throw new Error(`Email service error: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error sending email:', error);
            throw error;
        }
    }

    // Send bulk emails
    async sendBulkEmail(recipients, subject, message, isHtml = false) {
        try {
            const emailData = {
                from: {
                    email: this.fromEmail,
                    name: this.fromName
                },
                to: recipients.map(email => ({ email })),
                subject: subject,
                content: isHtml ? { html: message } : { text: message }
            };

            console.log(`Sending bulk email to ${recipients.length} recipients:`, emailData);
            
            // Simulate API call for bulk sending
            const response = await fetch(`${this.baseUrl}/bulk-send`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(emailData)
            });

            if (!response.ok) {
                throw new Error(`Bulk email service error: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error sending bulk email:', error);
            throw error;
        }
    }

    // Email templates for common scenarios
    getTemplate(templateType, data = {}) {
        const templates = {
            'agent-approved': {
                subject: 'Congratulations! Your Field Agent Application has been Approved',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <div style="background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%); color: white; padding: 2rem; text-align: center;">
                            <h1>🎉 Welcome to stokika!</h1>
                        </div>
                        <div style="padding: 2rem;">
                            <p>Dear ${data.name || 'Field Agent'},</p>
                            <p>We are excited to inform you that your field agent application has been <strong>approved</strong>!</p>
                            <p>Next steps:</p>
                            <ul>
                                <li>You will receive your login credentials within 24 hours</li>
                                <li>Attend the mandatory training session (details to follow)</li>
                                <li>Complete your profile setup</li>
                            </ul>
                            <p>Welcome to the stokika family!</p>
                            <p>Best regards,<br>The stokika Team</p>
                        </div>
                    </div>
                `
            },
            'agent-rejected': {
                subject: 'Update on Your Field Agent Application',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <div style="background: #f8fafc; padding: 2rem; text-align: center;">
                            <h1>Application Update</h1>
                        </div>
                        <div style="padding: 2rem;">
                            <p>Dear ${data.name || 'Applicant'},</p>
                            <p>Thank you for your interest in becoming a stokika field agent.</p>
                            <p>After careful review, we regret to inform you that we cannot proceed with your application at this time.</p>
                            <p>We encourage you to reapply in the future as opportunities become available.</p>
                            <p>Thank you for your understanding.</p>
                            <p>Best regards,<br>The stokika Team</p>
                        </div>
                    </div>
                `
            },
            'agent-pending': {
                subject: 'Your Field Agent Application is Under Review',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <div style="background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%); color: white; padding: 2rem; text-align: center;">
                            <h1>Application Received</h1>
                        </div>
                        <div style="padding: 2rem;">
                            <p>Dear ${data.name || 'Applicant'},</p>
                            <p>Thank you for submitting your field agent application to stokika.</p>
                            <p>Your application is currently under review. We will contact you within 48 hours with an update.</p>
                            <p>If you have any questions, please don't hesitate to contact us.</p>
                            <p>Best regards,<br>The stokika Team</p>
                        </div>
                    </div>
                `
            },
            'training-invitation': {
                subject: 'Field Agent Training Session - Action Required',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <div style="background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%); color: white; padding: 2rem; text-align: center;">
                            <h1>📚 Training Invitation</h1>
                        </div>
                        <div style="padding: 2rem;">
                            <p>Dear ${data.name || 'Field Agent'},</p>
                            <p>You are invited to attend the mandatory field agent training session.</p>
                            <p><strong>Training Details:</strong></p>
                            <ul>
                                <li>Date: ${data.date || 'TBD'}</li>
                                <li>Time: ${data.time || 'TBD'}</li>
                                <li>Location: ${data.location || 'TBD'}</li>
                                <li>Duration: ${data.duration || '4 hours'}</li>
                            </ul>
                            <p>Please confirm your attendance by replying to this email.</p>
                            <p>Best regards,<br>The stokika Team</p>
                        </div>
                    </div>
                `
            }
        };

        return templates[templateType] || null;
    }

    // Send template email
    async sendTemplateEmail(to, templateType, data = {}) {
        const template = this.getTemplate(templateType, data);
        if (!template) {
            throw new Error(`Template '${templateType}' not found`);
        }

        return await this.sendEmail(to, template.subject, template.html, true);
    }

    // Send bulk template emails
    async sendBulkTemplateEmail(recipients, templateType, data = {}) {
        const template = this.getTemplate(templateType, data);
        if (!template) {
            throw new Error(`Template '${templateType}' not found`);
        }

        return await this.sendBulkEmail(recipients, template.subject, template.html, true);
    }

    // Validate email address
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Get email statistics (if supported by provider)
    async getEmailStats(emailId) {
        try {
            const response = await fetch(`${this.baseUrl}/stats/${emailId}`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });

            if (!response.ok) {
                throw new Error(`Stats service error: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error getting email stats:', error);
            return null;
        }
    }
}

// Export for use in admin dashboard
window.EmailService = EmailService;

// Example usage:
/*
const emailService = new EmailService();

// Send single email
await emailService.sendEmail('agent@example.com', 'Welcome!', 'Welcome to stokika!');

// Send template email
await emailService.sendTemplateEmail('agent@example.com', 'agent-approved', { name: 'John Doe' });

// Send bulk email
const recipients = ['agent1@example.com', 'agent2@example.com'];
await emailService.sendBulkEmail(recipients, 'Training Update', 'Training starts tomorrow!');

// Send bulk template email
await emailService.sendBulkTemplateEmail(recipients, 'training-invitation', {
    name: 'Field Agents',
    date: '2024-01-15',
    time: '9:00 AM',
    location: 'stokika HQ'
});
*/