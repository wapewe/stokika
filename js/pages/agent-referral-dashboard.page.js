// XSS Protection: Using sanitize() helper from xss-protection.js
// Make sure xss-protection.js is loaded in your HTML file

// Agent Referral Dashboard Component
class AgentReferralDashboard {
    constructor() {
        this.affiliateSystem = new AgentAffiliateSystem();
        this.agentData = null;
    }

    // Initialize dashboard
    async initialize(agentData) {
        this.agentData = agentData;
        await this.loadReferralStats();
        await this.loadReferralsList();
        this.setupAffiliateLinks();
    }

    // Load referral statistics
    async loadReferralStats() {
        if (!this.agentData?.id) return;

        const stats = await this.affiliateSystem.getAgentReferralStats(this.agentData.id);
        
        if (stats) {
            document.getElementById('totalReferrals').textContent = stats.total_referrals || 0;
            document.getElementById('activeReferrals').textContent = stats.active_referrals || 0;
            document.getElementById('totalCommission').textContent = `KES ${(stats.total_commission || 0).toLocaleString()}`;
        }
    }

    // Load referrals list
    async loadReferralsList() {
        if (!this.agentData?.id) return;

        const referrals = await this.affiliateSystem.getAgentReferrals(this.agentData.id);
        const container = document.getElementById('referralsList');

        if (!referrals || referrals.length === 0) {
            container.innerHTML = XSSProtection.sanitize('<p style="text-align: center; color: #6c757d; padding: 20px;">No referrals yet. Share your affiliate links to start earning!</p>');
            return;
        }

        const html = `
            <div class="referrals-table">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                            <th style="padding: 12px; text-align: left;">Type</th>
                            <th style="padding: 12px; text-align: left;">Business Name</th>
                            <th style="padding: 12px; text-align: left;">Contact</th>
                            <th style="padding: 12px; text-align: left;">Status</th>
                            <th style="padding: 12px; text-align: left;">Date</th>
                            <th style="padding: 12px; text-align: right;">Commission</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${referrals.map(ref => this.renderReferralRow(ref)).join('')}
                    </tbody>
                </table>
            </div>
        `;

        container.textContent = html; // XSS-FIX: Changed from innerHTML - Review if HTML is needed
    }

    // Render single referral row
    renderReferralRow(referral) {
        const isVendor = referral.entity_type === 'vendor';
        const entity = isVendor ? referral.vendors : referral.suppliers;
        const businessName = isVendor ? entity?.business_name : entity?.company_name;
        const status = referral.status || 'pending';
        const statusColors = {
            pending: '#ffc107',
            approved: '#28a745',
            active: '#17a2b8',
            inactive: '#6c757d'
        };

        return `
            <tr style="border-bottom: 1px solid #dee2e6;">
                <td style="padding: 12px;">
                    <span style="display: inline-block; padding: 4px 8px; background: ${isVendor ? '#e3f2fd' : '#fff3e0'}; color: ${isVendor ? '#1976d2' : '#f57c00'}; border-radius: 4px; font-size: 12px; font-weight: 600;">
                        ${isVendor ? '🏪 Vendor' : '🚚 Supplier'}
                    </span>
                </td>
                <td style="padding: 12px; font-weight: 600;">${businessName || 'N/A'}</td>
                <td style="padding: 12px;">
                    <div style="font-size: 12px;">
                        <div>📞 ${entity?.phone || 'N/A'}</div>
                        <div style="color: #6c757d;">📧 ${entity?.email || 'N/A'}</div>
                    </div>
                </td>
                <td style="padding: 12px;">
                    <span style="display: inline-block; padding: 4px 12px; background: ${statusColors[status]}; color: white; border-radius: 12px; font-size: 12px; font-weight: 600;">
                        ${status.toUpperCase()}
                    </span>
                </td>
                <td style="padding: 12px; font-size: 12px; color: #6c757d;">
                    ${new Date(referral.registration_date).toLocaleDateString()}
                </td>
                <td style="padding: 12px; text-align: right; font-weight: 600; color: #28a745;">
                    KES ${(referral.commission_earned || 0).toLocaleString()}
                </td>
            </tr>
        `;
    }

    // Setup affiliate links
    setupAffiliateLinks() {
        if (!this.agentData?.agent_number) return;

        const vendorLink = this.affiliateSystem.generateAffiliateLink(this.agentData.agent_number, 'vendor');
        const supplierLink = this.affiliateSystem.generateAffiliateLink(this.agentData.agent_number, 'supplier');

        const vendorInput = document.getElementById('vendorAffiliateLink');
        const supplierInput = document.getElementById('supplierAffiliateLink');

        if (vendorInput) vendorInput.value = vendorLink;
        if (supplierInput) supplierInput.value = supplierLink;
    }
}

// Copy affiliate link function
window.copyAffiliateLink = function(type) {
    const inputId = type === 'vendor' ? 'vendorAffiliateLink' : 'supplierAffiliateLink';
    const input = document.getElementById(inputId);
    
    if (input) {
        input.select();
        document.execCommand('copy');
        
        // Show success message
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = '✓ Copied!';
        btn.style.background = '#28a745';
        
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '';
        }, 2000);
    }
};

// Export
window.AgentReferralDashboard = AgentReferralDashboard;
