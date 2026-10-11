// Field Agent Affiliate System
class AgentAffiliateSystem {
    constructor() {
        this.supabase = initSupabase();
    }

    // Generate affiliate link for agent
    generateAffiliateLink(agentNumber, entityType = 'vendor') {
        const baseUrl = window.location.origin;
        const page = entityType === 'vendor' ? 'dalana.html' : 'dalana.html';
        return `${baseUrl}/${page}?ref=${agentNumber}&type=${entityType}`;
    }

    // Extract referral code from URL
    getReferralFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return {
            agentCode: urlParams.get('ref'),
            entityType: urlParams.get('type') || 'vendor'
        };
    }

    // Verify agent code
    async verifyAgentCode(agentCode) {
        try {
            const { data, error } = await this.supabase.rpc('verify_agent_code', {
                p_agent_code: agentCode
            });

            if (error) throw error;
            return data && data.length > 0 ? data[0] : null;
        } catch (error) {
            console.error('Error verifying agent code:', error);
            return null;
        }
    }

    // Link vendor to agent
    async linkVendorToAgent(vendorId, agentNumber, referralSource = 'agent_link') {
        try {
            const { data, error } = await this.supabase.rpc('link_vendor_to_agent', {
                p_vendor_id: vendorId,
                p_agent_number: agentNumber,
                p_referral_source: referralSource
            });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error linking vendor to agent:', error);
            return false;
        }
    }

    // Link supplier to agent
    async linkSupplierToAgent(supplierId, agentNumber, referralSource = 'agent_link') {
        try {
            const { data, error } = await this.supabase.rpc('link_supplier_to_agent', {
                p_supplier_id: supplierId,
                p_agent_number: agentNumber,
                p_referral_source: referralSource
            });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error linking supplier to agent:', error);
            return false;
        }
    }

    // Get agent referral stats
    async getAgentReferralStats(agentId) {
        try {
            const { data, error } = await this.supabase.rpc('get_agent_referral_stats', {
                p_agent_id: agentId
            });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error getting referral stats:', error);
            return null;
        }
    }

    // Get agent referrals
    async getAgentReferrals(agentId) {
        try {
            const { data, error } = await this.supabase
                .from('agent_referrals')
                .select(`
                    *,
                    vendors(business_name, phone, email, status),
                    suppliers(company_name, phone, email, status)
                `)
                .eq('agent_id', agentId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error getting agent referrals:', error);
            return [];
        }
    }

    // Store referral in session/localStorage
    storeReferralInfo(agentCode, entityType) {
        const referralData = {
            agentCode: agentCode,
            entityType: entityType,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem('stokika_referral', JSON.stringify(referralData));
        sessionStorage.setItem('stokika_referral', JSON.stringify(referralData));
    }

    // Get stored referral info
    getStoredReferralInfo() {
        const stored = localStorage.getItem('stokika_referral') || sessionStorage.getItem('stokika_referral');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                return null;
            }
        }
        return null;
    }

    // Clear referral info
    clearReferralInfo() {
        localStorage.removeItem('stokika_referral');
        sessionStorage.removeItem('stokika_referral');
    }

    // Display agent info banner
    displayAgentBanner(agentInfo) {
        const banner = document.createElement('div');
        banner.id = 'agent-referral-banner';
        banner.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 20px;
            text-align: center;
            z-index: 9999;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            font-family: 'Inter', sans-serif;
        `;
        
        banner.innerHTML = XSSProtection.sanitize(`
            <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                <i class="fas fa-user-tie" style="font-size: 20px;"></i>
                <span style="font-weight: 600;">Referred by Field Agent: ${sanitize(agentInfo.full_name)}</span>
                <span style="opacity: 0.9;">(${sanitize(agentInfo.agent_number)})</span>
            </div>
        `);
        
        document.body.style.paddingTop = '50px';
        document.body.insertBefore(banner, document.body.firstChild);
    }

    // Initialize referral tracking on page load
    async initializeReferralTracking() {
        const urlReferral = this.getReferralFromURL();
        
        if (urlReferral.agentCode) {
            const agentInfo = await this.verifyAgentCode(urlReferral.agentCode);
            
            if (agentInfo && agentInfo.is_valid) {
                this.storeReferralInfo(urlReferral.agentCode, urlReferral.entityType);
                this.displayAgentBanner(agentInfo);
                return agentInfo;
            } else {
                console.warn('Invalid or inactive agent code');
            }
        }
        
        const storedReferral = this.getStoredReferralInfo();
        if (storedReferral) {
            const agentInfo = await this.verifyAgentCode(storedReferral.agentCode);
            if (agentInfo && agentInfo.is_valid) {
                this.displayAgentBanner(agentInfo);
                return agentInfo;
            }
        }
        
        return null;
    }
}

// Export for use in other files
window.AgentAffiliateSystem = AgentAffiliateSystem;
