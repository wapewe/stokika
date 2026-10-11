// GPS Tracking and Territory Management
class GPSTracker {
    constructor() {
        this.supabase = null;
        this.currentPosition = null;
        this.watchId = null;
        this.isTracking = false;
    }

    async init() {
        this.supabase = initSupabase();
        if (!this.supabase) throw new Error('Database connection failed');
        await this.loadGPSData();
    }

    async loadGPSData() {
        try {
            const container = document.getElementById('gpsContent');
            if (!container) return;

            container.innerHTML = XSSProtection.sanitize(`
                <div class="gps-dashboard">
                    <div class="gps-contr...">
                        <button class="btn-primary" id="btnStartTracking">📍 Start Tracking</button>
                        <button class="btn-secondary" id="btnStopTracking" disabled>⏹️ Stop Tracking</button>
                        <button class="btn-secondary" id="btnViewTerritories">🗺️ View Territories</button>
                    </div>
                    <div class="gps-stats">
                        <div class="stat-card">
                            <h4>Active Agents</h4>
                            <span id="activeAgentsCount">-</span>
                        </div>
                        <div class="stat-card">
                            <h4>Territories</h4>
                            <span id="territoriesCount">-</span>
                        </div>
                        <div class="stat-card">
                            <h4>Today's Visits</h4>
                            <span id="todayVisitsCount">-</span>
                        </div>
                    </div>
                    <div id="gpsMapContainer" class="map-container">
                        <div class="map-placeholder">
                            <p>📍 GPS Map will be displayed here</p>
                            <p>Click "Start Tracking" to begin location monitoring</p>
                        </div>
                    </div>
                    <div id="gpsDataTable"></div>
                </div>
            `);

            this.attachEventListeners();
            await this.loadStats();
        } catch (error) {
            console.error('Error loading GPS data:', error);
            showUserMessage('Error loading GPS data', 'error');
        }
    }

    attachEventListeners() {
        const startBtn = document.getElementById('btnStartTracking');
        const stopBtn = document.getElementById('btnStopTracking');
        const territoriesBtn = document.getElementById('btnViewTerritories');

        if (startBtn) startBtn.addEventListener('click', () => this.startTracking());
        if (stopBtn) stopBtn.addEventListener('click', () => this.stopTracking());
        if (territoriesBtn) territoriesBtn.addEventListener('click', () => this.showTerritories());
    }

    async loadStats() {
        try {
            // Load active agents count
            const { data: agents } = await this.supabase
                .from('field_agents')
                .select('id')
                .eq('approval_status', 'approved');

            // Load territories count
            const { data: territories } = await this.supabase
                .from('geofences')
                .select('id')
                .eq('is_active', true);

            // Load today's visits
            const today = new Date().toISOString().split('T')[0];
            const { data: visits } = await this.supabase
                .from('vendor_visits')
                .select('id')
                .gte('start_time', today);

            document.getElementById('activeAgentsCount').textContent = agents?.length || 0;
            document.getElementById('territoriesCount').textContent = territories?.length || 0;
            document.getElementById('todayVisitsCount').textContent = visits?.length || 0;
        } catch (error) {
            console.error('Error loading GPS stats:', error);
        }
    }

    startTracking() {
        if (!navigator.geolocation) {
            showUserMessage('Geolocation not supported', 'error');
            return;
        }

        const options = {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        };

        this.watchId = navigator.geolocation.watchPosition(
            (position) => this.onLocationUpdate(position),
            (error) => this.onLocationError(error),
            options
        );

        this.isTracking = true;
        document.getElementById('btnStartTracking').disabled = true;
        document.getElementById('btnStopTracking').disabled = false;
        showUserMessage('GPS tracking started', 'success');
    }

    stopTracking() {
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }

        this.isTracking = false;
        document.getElementById('btnStartTracking').disabled = false;
        document.getElementById('btnStopTracking').disabled = true;
        showUserMessage('GPS tracking stopped', 'info');
    }

    async onLocationUpdate(position) {
        this.currentPosition = position;
        const { latitude, longitude, accuracy } = position.coords;

        try {
            // Save location to database
            await this.supabase
                .from('user_locations')
                .insert([{
                    user_id: getCurrentUserId(),
                    user_type: 'admin',
                    latitude: latitude,
                    longitude: longitude,
                    accuracy: accuracy,
                    timestamp: new Date().toISOString()
                }]);

            // Update map display
            this.updateMapDisplay(latitude, longitude);
        } catch (error) {
            console.error('Error saving location:', error);
        }
    }

    onLocationError(error) {
        console.error('Location error:', error);
        showUserMessage('Location access denied or unavailable', 'error');
    }

    updateMapDisplay(lat, lng) {
        const mapContainer = document.getElementById('gpsMapContainer');
        if (mapContainer) {
            mapContainer.innerHTML = XSSProtection.sanitize(`
                <div class="current-location">
                    <h4>📍 Current Loc...on</h4>
                    <p>Latitude: ${sanitize(lat.toFixed(6))}</p>
                    <p>Longitude: ${sanitize(lng.toFixed(6))}</p>
                    <p>Last Updated: ${sanitize(new Date().toLocaleTimeString())}</p>
                </div>
            `);
        }
    }

    async showTerritories() {
        try {
            const { data: territories } = await this.supabase
                .from('geofences')
                .select(`
                    *,
                    supervisors (
                        full_name,
                        users (email)
                    )
                `)
                .eq('is_active', true);

            const tableHtml = `
                <div class="territories-section">
                    <h3>Territory Management</h3>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Territory Name</th>
                                <th>County</th>
                                <th>Supervisor</th>
                                <th>Radius (km)</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${territories?.map(territory => `
                                <tr>
                                    <td>${territory.name}</td>
                                    <td>${territory.county || 'N/A'}</td>
                                    <td>${territory.supervisors?.full_name || 'Unassigned'}</td>
                                    <td>${territory.radius_km}</td>
                                    <td>
                                        <button class="btn-small" onclick="viewTerritory('${territory.id}')">View</button>
                                        <button class="btn-small btn-danger" onclick="deleteTerritory('${territory.id}')">Delete</button>
                                    </td>
                                </tr>
                            `).join('') || '<tr><td colspan="5">No territories found</td></tr>'}
                        </tbody>
                    </table>
                </div>
            `;

            document.getElementById('gpsDataTable').innerHTML = XSSProtection.sanitize(tableHtml);
        } catch (error) {
            console.error('Error loading territories:', error);
            showUserMessage('Error loading territories', 'error');
        }
    }
}

// Territory Management Functions
window.viewTerritory = async function(territoryId) {
    showUserMessage('Territory details view - Feature coming soon', 'info');
};

window.deleteTerritory = async function(territoryId) {
    if (!confirm('Delete this territory? This action cannot be undone.')) return;
    
    try {
        const supabase = initSupabase();
        const { error } = await supabase
            .from('geofences')
            .delete()
            .eq('id', territoryId);

        if (error) throw error;
        
        showUserMessage('Territory deleted successfully', 'success');
        // Reload territories
        const gpsTracker = new GPSTracker();
        await gpsTracker.showTerritories();
    } catch (error) {
        console.error('Error deleting territory:', error);
        showUserMessage('Error deleting territory', 'error');
    }
};

// Initialize GPS tracking when tab is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('gps-tab')) {
        window.gpsTracker = new GPSTracker();
    }
});