/**
 * Delivery Partners Management for Admin Dashboard
 * Manages delivery partner applications and coverage areas
 */

class DeliveryPartnersManagement {
    constructor() {
        this.supabase = null;
        this.currentFilter = 'all';
    }

    async init() {
        await window.ConfigLoader.loadConfig();
        this.supabase = initSupabase();
        if (!this.supabase) {
            console.error('Database connection failed');
            return;
        }

        this.attachEventListeners();
        await this.loadDeliveryPartners();
    }

    attachEventListeners() {
        // Sub-tab navigation
        document.querySelectorAll('.sub-tab-btn[data-tab-type="dp"]').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchSubTab(e.target.dataset.subtab));
        });

        // Search button
        const searchBtn = document.getElementById('btnSearchDP');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.loadDeliveryPartners());
        }

        // Export button
        const exportBtn = document.getElementById('btnExportDeliveryPartners');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportData());
        }
    }

    switchSubTab(subtab) {
        // Update button states
        document.querySelectorAll('.sub-tab-btn[data-tab-type="dp"]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.subtab === subtab);
        });

        // Update content visibility
        document.querySelectorAll('#delivery-partners-tab .sub-tab-content').forEach(content => {
            content.classList.remove('active');
        });

        const targetContent = document.getElementById(`dpSubTab${subtab.charAt(0).toUpperCase() + subtab.slice(1)}`);
        if (targetContent) {
            targetContent.classList.add('active');
        }

        this.currentFilter = subtab;
        this.loadDeliveryPartners();
    }

    async loadDeliveryPartners() {
        const loadingId = `dp${this.currentFilter === 'all' ? '' : this.currentFilter.charAt(0).toUpperCase() + this.currentFilter.slice(1)}Loading`;
        const tableId = `dp${this.currentFilter === 'all' ? '' : this.currentFilter.charAt(0).toUpperCase() + this.currentFilter.slice(1)}Table`;

        window.SafeDOM.showLoading(loadingId, 'Loading delivery partners...');

        try {
            // Build query
            let query = this.supabase
                .from('delivery_partners')
                .select('*')
                .order('created_at', { ascending: false });

            // Apply status filter
            if (this.currentFilter === 'pending') {
                query = query.eq('status', 'pending_review');
            } else if (this.currentFilter === 'approved') {
                query = query.eq('status', 'approved');
            } else if (this.currentFilter === 'active') {
                query = query.eq('status', 'active');
            }

            // Apply search filters
            const nameSearch = document.getElementById('dpNameSearch')?.value;
            if (nameSearch) {
                query = query.ilike('full_name', `%${nameSearch}%`);
            }

            const countyFilter = document.getElementById('dpCountyFilter')?.value;
            if (countyFilter) {
                query = query.ilike('county', `%${countyFilter}%`);
            }

            const partnerTypeFilter = document.getElementById('dpPartnerTypeFilter')?.value;
            if (partnerTypeFilter) {
                query = query.eq('partner_type', partnerTypeFilter);
            }

            const vehicleTypeFilter = document.getElementById('dpVehicleTypeFilter')?.value;
            if (vehicleTypeFilter) {
                query = query.eq('vehicle_type', vehicleTypeFilter);
            }

            const result = await window.SafeSupabase.query(
                () => query,
                { defaultValue: [], fallbackMessage: 'Delivery partners feature coming soon' }
            );

            const partners = result.data || [];

            // Hide loading
            const loadingEl = document.getElementById(loadingId);
            if (loadingEl) loadingEl.style.display = 'none';

            if (result.handled) {
                window.SafeDOM.showPlaceholder(tableId, result.message, '🚗');
                return;
            }

            this.renderTable(partners, tableId);

        } catch (error) {
            console.error('Error loading delivery partners:', error);
            window.SafeDOM.showError(tableId, 'Unable to load delivery partners');
        }
    }

    renderTable(partners, tableId) {
        if (!partners || partners.length === 0) {
            window.SafeDOM.showPlaceholder(tableId, 'No delivery partners found', '🚗');
            return;
        }

        const tableHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Application Code</th>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Partner Type</th>
                        <th>County/Town</th>
                        <th>Vehicle</th>
                        <th>Coverage</th>
                        <th>Status</th>
                        <th>Registration</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${partners.map(partner => `
                        <tr>
                            <td><strong>${partner.application_code}</strong></td>
                            <td>
                                ${partner.full_name}
                                ${partner.partner_type === 'business' || partner.partner_type === 'fleet' ? 
                                    `<br><small>${partner.business_name || 'N/A'}</small>` : ''}
                            </td>
                            <td>${partner.phone}</td>
                            <td>
                                <span class="badge badge-${partner.partner_type}">
                                    ${partner.partner_type === 'individual' ? '👤' : 
                                      partner.partner_type === 'business' ? '🏢' : '🚛'} 
                                    ${partner.partner_type}
                                </span>
                            </td>
                            <td>${partner.county}<br><small>${partner.town}</small></td>
                            <td>
                                ${this.formatVehicleType(partner.vehicle_type)}
                                ${partner.registration_number ? `<br><small>${partner.registration_number}</small>` : ''}
                            </td>
                            <td>
                                <span class="badge badge-coverage">${this.formatCoverage(partner.delivery_coverage)}</span>
                                ${partner.additional_areas ? `<br><small>${partner.additional_areas}</small>` : ''}
                            </td>
                            <td><span class="status-badge status-${partner.status}">${partner.status}</span></td>
                            <td>
                                ${partner.registration_paid ? 
                                    '<span class="badge badge-success">✅ Paid</span>' : 
                                    '<span class="badge badge-warning">⏳ Pending</span>'}
                            </td>
                            <td>
                                <button class="btn-small" onclick="viewDeliveryPartner('${partner.id}')">View</button>
                                <button class="btn-small" onclick="manageDeliveryPartner('${partner.id}')">Manage</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        window.SafeDOM.setHTML(tableId, XSSProtection.sanitize(tableHTML));
    }

    formatVehicleType(type) {
        const icons = {
            'motorcycle': '🏍️',
            'bicycle': '🚲',
            'car': '🚗',
            'pickup': '🛻',
            'van': '🚐',
            'lorry': '🚛',
            'walking': '🚶'
        };
        return `${icons[type] || '🚗'} ${type}`;
    }

    formatCoverage(coverage) {
        const labels = {
            'local': 'Local Only',
            'county': 'Within County',
            'inter_county': 'Inter-County',
            'any': 'Anywhere'
        };
        return labels[coverage] || coverage;
    }

    async exportData() {
        showUserMessage('Exporting delivery partners data...', 'info');
        // Implementation for CSV export
    }
}

// Global functions
window.viewDeliveryPartner = async function(partnerId) {
    showUserMessage('Loading delivery partner details...', 'info');
    // Implementation for viewing partner details
};

window.manageDeliveryPartner = async function(partnerId) {
    showUserMessage('Opening partner management...', 'info');
    // Implementation for managing partner status
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
    if (document.getElementById('delivery-partners-tab')) {
        window.deliveryPartnersManagement = new DeliveryPartnersManagement();
        await window.deliveryPartnersManagement.init();
    }
});
