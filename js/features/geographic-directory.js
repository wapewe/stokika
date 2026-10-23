/**
 * Geographic Directory for Admin Dashboard
 * Browse all stakeholders by location (county, town, ward, center)
 */

class GeographicDirectory {
    constructor() {
        this.supabase = null;
        this.currentView = 'county';
        this.stakeholderTypes = {
            'vendors': { table: 'vendors', nameField: 'business_name', icon: '🏪' },
            'suppliers': { table: 'suppliers', nameField: 'company_name', icon: '📦' },
            'delivery_partners': { table: 'delivery_partners', nameField: 'full_name', icon: '🚗' },
            'field_agents': { table: 'field_agents', nameField: 'full_name', icon: '👤' },
            'supervisors': { table: 'supervisors', nameField: 'full_name', icon: '👨‍💼' }
        };
    }

    async init() {
        await window.ConfigLoader.loadConfig();
        this.supabase = initSupabase();
        if (!this.supabase) {
            console.error('Database connection failed');
            return;
        }

        this.attachEventListeners();
        await this.loadGeographicData();
    }

    attachEventListeners() {
        // View tabs
        document.querySelectorAll('.geo-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchView(e.target.dataset.geoView));
        });

        // Search button
        const searchBtn = document.getElementById('btnSearchGeo');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.loadGeographicData());
        }

        // Export button
        const exportBtn = document.getElementById('btnExportGeoDirectory');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportData());
        }
    }

    switchView(view) {
        // Update button states
        document.querySelectorAll('.geo-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.geoView === view);
        });

        this.currentView = view;
        this.loadGeographicData();
    }

    async loadGeographicData() {
        window.SafeDOM.showLoading('geoContent', 'Loading geographic data...');

        try {
            const locationSearch = document.getElementById('geoSearchLocation')?.value || '';
            const stakeholderType = document.getElementById('geoStakeholderType')?.value || '';

            const groupByField = this.currentView; // 'county', 'town', 'ward', 'center'
            const data = await this.aggregateByLocation(groupByField, locationSearch, stakeholderType);

            this.renderGeographicView(data, groupByField);

        } catch (error) {
            console.error('Error loading geographic data:', error);
            window.SafeDOM.showError('geoContent', 'Unable to load geographic data');
        }
    }

    async aggregateByLocation(groupByField, searchFilter, stakeholderFilter) {
        const locationData = {};

        // Determine which stakeholder types to query
        const typesToQuery = stakeholderFilter ? 
            [stakeholderFilter] : 
            Object.keys(this.stakeholderTypes);

        for (const type of typesToQuery) {
            const config = this.stakeholderTypes[type];
            if (!config) continue;

            try {
                // Build query based on available fields
                let query = this.supabase
                    .from(config.table)
                    .select(`
                        ${config.nameField},
                        county,
                        sub_county,
                        town,
                        ward,
                        center,
                        status
                    `);

                // Apply location filter if provided
                if (searchFilter) {
                    query = query.or(
                        `county.ilike.%${searchFilter}%,` +
                        `town.ilike.%${searchFilter}%,` +
                        `ward.ilike.%${searchFilter}%,` +
                        `center.ilike.%${searchFilter}%`
                    );
                }

                const result = await window.SafeSupabase.query(
                    () => query,
                    { defaultValue: [] }
                );

                const records = result.data || [];

                // Group by location field
                records.forEach(record => {
                    // Determine the most specific location available
                    let locationKey;
                    if (groupByField === 'county') {
                        locationKey = record.county || 'Unknown';
                    } else if (groupByField === 'town') {
                        locationKey = record.town || record.sub_county || 'Unknown';
                    } else if (groupByField === 'ward') {
                        locationKey = record.ward || record.town || 'Unknown';
                    } else if (groupByField === 'center') {
                        locationKey = record.center || record.ward || record.town || 'Unknown';
                    }

                    if (!locationData[locationKey]) {
                        locationData[locationKey] = {
                            location: locationKey,
                            stakeholders: {},
                            total: 0
                        };
                    }

                    if (!locationData[locationKey].stakeholders[type]) {
                        locationData[locationKey].stakeholders[type] = [];
                    }

                    locationData[locationKey].stakeholders[type].push(record);
                    locationData[locationKey].total++;
                });

            } catch (error) {
                console.warn(`Could not load ${type}:`, error);
            }
        }

        // Convert to array and sort by total count
        return Object.values(locationData)
            .sort((a, b) => b.total - a.total);
    }

    renderGeographicView(data, groupByField) {
        if (!data || data.length === 0) {
            window.SafeDOM.showPlaceholder('geoContent', 'No data found for this location level', '🗺️');
            return;
        }

        const groupLabel = groupByField.charAt(0).toUpperCase() + groupByField.slice(1);

        const html = `
            <div class="geographic-directory">
                <div class="geo-summary">
                    <h3>📊 Summary by ${groupLabel}</h3>
                    <p>${data.length} ${groupLabel.toLowerCase()}(s) with ${data.reduce((sum, loc) => sum + loc.total, 0)} total stakeholders</p>
                </div>

                <div class="geo-grid">
                    ${data.map(location => this.renderLocationCard(location, groupByField)).join('')}
                </div>
            </div>
        `;

        window.SafeDOM.setHTML('geoContent', XSSProtection.sanitize(html));
    }

    renderLocationCard(location, groupByField) {
        const stakeholderBreakdown = Object.entries(location.stakeholders)
            .map(([type, records]) => {
                const config = this.stakeholderTypes[type];
                return `
                    <div class="stakeholder-count">
                        <span class="stakeholder-icon">${config.icon}</span>
                        <span class="stakeholder-label">${type.replace('_', ' ')}</span>
                        <span class="stakeholder-number">${records.length}</span>
                    </div>
                `;
            })
            .join('');

        return `
            <div class="location-card">
                <div class="location-header">
                    <h4>📍 ${location.location}</h4>
                    <span class="location-total">${location.total} total</span>
                </div>
                <div class="location-stakeholders">
                    ${stakeholderBreakdown}
                </div>
                <div class="location-actions">
                    <button class="btn-small" onclick="window.geoDirectory.viewLocationDetails('${location.location}', '${groupByField}')">
                        View Details
                    </button>
                    <button class="btn-small" onclick="window.geoDirectory.exportLocation('${location.location}')">
                        Export
                    </button>
                </div>
            </div>
        `;
    }

    async viewLocationDetails(location, groupByField) {
        showUserMessage(`Loading details for ${location}...`, 'info');
        
        // Create modal with detailed breakdown
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>📍 ${location}</h2>
                    <button type="button" class="close">&times;</button>
                </div>
                <div class="modal-body">
                    <div id="locationDetailsContent">
                        <div class="loading">Loading details...</div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.style.display = 'block';
        
        modal.querySelector('.close').onclick = () => modal.remove();

        // Load detailed data
        const detailedData = await this.loadLocationDetails(location, groupByField);
        this.renderLocationDetails(detailedData);
    }

    async loadLocationDetails(location, groupByField) {
        const details = {};

        for (const [type, config] of Object.entries(this.stakeholderTypes)) {
            try {
                let query = this.supabase
                    .from(config.table)
                    .select('*');

                // Filter by the appropriate field
                if (groupByField === 'county') {
                    query = query.eq('county', location);
                } else if (groupByField === 'town') {
                    query = query.eq('town', location);
                } else if (groupByField === 'ward') {
                    query = query.eq('ward', location);
                } else if (groupByField === 'center') {
                    query = query.eq('center', location);
                }

                const result = await window.SafeSupabase.query(
                    () => query,
                    { defaultValue: [] }
                );

                if (result.data && result.data.length > 0) {
                    details[type] = result.data;
                }

            } catch (error) {
                console.warn(`Could not load ${type} details:`, error);
            }
        }

        return details;
    }

    renderLocationDetails(detailedData) {
        const content = Object.entries(detailedData)
            .map(([type, records]) => {
                const config = this.stakeholderTypes[type];
                return `
                    <div class="stakeholder-section">
                        <h3>${config.icon} ${type.replace('_', ' ')} (${records.length})</h3>
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Phone</th>
                                    <th>Location</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${records.map(record => `
                                    <tr>
                                        <td>${record[config.nameField] || 'N/A'}</td>
                                        <td>${record.phone_number || record.phone || 'N/A'}</td>
                                        <td>
                                            ${record.county || ''}${record.town ? ', ' + record.town : ''}
                                            ${record.ward ? ', ' + record.ward : ''}
                                            ${record.center ? ', ' + record.center : ''}
                                        </td>
                                        <td><span class="status-badge status-${record.status}">${record.status || record.approval_status || 'N/A'}</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            })
            .join('');

        document.getElementById('locationDetailsContent').innerHTML = XSSProtection.sanitize(content);
    }

    async exportLocation(location) {
        showUserMessage(`Exporting data for ${location}...`, 'info');
        // Implementation for CSV export
    }

    async exportData() {
        showUserMessage('Exporting geographic directory...', 'info');
        // Implementation for full export
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
    if (document.getElementById('geographic-directory-tab')) {
        window.geoDirectory = new GeographicDirectory();
        await window.geoDirectory.init();
    }
});
