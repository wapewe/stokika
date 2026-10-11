// Delivery Tracking with GPS Maps
class DeliveryTracker {
    constructor() {
        this.supabase = null;
        this.map = null;
        this.markers = {};
        this.deliveryRoutes = {};
    }

    async init() {
        this.supabase = initSupabase();
        if (!this.supabase) throw new Error('Database connection failed');
        await this.loadDeliveries();
    }

    async loadDeliveries() {
        try {
            const container = document.getElementById('deliveryContent') || document.createElement('div');
            container.innerHTML = XSSProtection.sanitize(`
                <div class="delivery-dashboard">
                    <div class="deli...y-controls">
                        <button class="btn-primary" id="btnCreateDelivery">📦 New Delivery</button>
                        <button class="btn-secondary" id="btnTrackAll">🗺️ Track All</button>
                        <select id="deliveryStatusFilter">
                            <option value="">All Deliveries</option>
                            <option value="pending">Pending</option>
                            <option value="assigned">Assigned</option>
                            <option value="picked_up">Picked Up</option>
                            <option value="in_transit">In Transit</option>
                            <option value="delivered">Delivered</option>
                        </select>
                    </div>
                    <div class="delivery-stats">
                        <div class="stat-card">
                            <h4>Active Deliveries</h4>
                            <span id="activeDeliveriesCount">-</span>
                        </div>
                        <div class="stat-card">
                            <h4>Today's Deliveries</h4>
                            <span id="todayDeliveriesCount">-</span>
                        </div>
                        <div class="stat-card">
                            <h4>Completion Rate</h4>
                            <span id="completionRate">-</span>
                        </div>
                    </div>
                    <div id="deliveryMapContainer" class="map-container">
                        <div class="map-placeholder">
                            <p>🗺️ Delivery tracking map will appear here</p>
                            <p>Click "Track All" to view live delivery locations</p>
                        </div>
                    </div>
                    <div id="deliveriesTable"></div>
                </div>
            `);

            this.attachEventListeners();
            await this.loadStats();
            await this.loadDeliveriesTable();
        } catch (error) {
            console.error('Error loading deliveries:', error);
            showUserMessage('Error loading delivery data', 'error');
        }
    }

    attachEventListeners() {
        const createBtn = document.getElementById('btnCreateDelivery');
        const trackBtn = document.getElementById('btnTrackAll');
        const statusFilter = document.getElementById('deliveryStatusFilter');

        if (createBtn) createBtn.addEventListener('click', () => this.showCreateDeliveryModal());
        if (trackBtn) trackBtn.addEventListener('click', () => this.initializeMap());
        if (statusFilter) statusFilter.addEventListener('change', () => this.loadDeliveriesTable());
    }

    async loadStats() {
        try {
            const today = new Date().toISOString().split('T')[0];
            
            const { data: activeDeliveries } = await this.supabase
                .from('deliveries')
                .select('id')
                .in('status', ['assigned', 'picked_up', 'in_transit']);

            const { data: todayDeliveries } = await this.supabase
                .from('deliveries')
                .select('id')
                .gte('created_at', today);

            const { data: completedToday } = await this.supabase
                .from('deliveries')
                .select('id')
                .eq('status', 'delivered')
                .gte('actual_delivery', today);

            const completionRate = todayDeliveries?.length > 0 
                ? Math.round((completedToday?.length || 0) / todayDeliveries.length * 100)
                : 0;

            document.getElementById('activeDeliveriesCount').textContent = activeDeliveries?.length || 0;
            document.getElementById('todayDeliveriesCount').textContent = todayDeliveries?.length || 0;
            document.getElementById('completionRate').textContent = `${completionRate}%`;
        } catch (error) {
            console.error('Error loading delivery stats:', error);
        }
    }

    async loadDeliveriesTable() {
        try {
            const statusFilter = document.getElementById('deliveryStatusFilter')?.value || '';
            
            let query = this.supabase
                .from('deliveries')
                .select(`
                    *,
                    orders (id, total_amount, product_name),
                    vendors (business_name, users(name)),
                    field_agents (full_name)
                `)
                .order('created_at', { ascending: false });

            if (statusFilter) {
                query = query.eq('status', statusFilter);
            }

            const { data: deliveries } = await query;

            const tableHtml = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Tracking Code</th>
                            <th>Order</th>
                            <th>Vendor</th>
                            <th>Agent</th>
                            <th>Status</th>
                            <th>Delivery Address</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${deliveries?.map(delivery => `
                            <tr>
                                <td><strong>${delivery.tracking_code || 'N/A'}</strong></td>
                                <td>${delivery.orders?.product_name || 'N/A'}<br>
                                    <small>KES ${delivery.orders?.total_amount || 0}</small></td>
                                <td>${delivery.vendors?.business_name || 'N/A'}</td>
                                <td>${delivery.field_agents?.full_name || 'Unassigned'}</td>
                                <td><span class="status-badge status-${delivery.status}">${delivery.status}</span></td>
                                <td>${delivery.delivery_address}</td>
                                <td>
                                    <button class="btn-small" onclick="trackDelivery('${delivery.id}')">Track</button>
                                    <button class="btn-small" onclick="updateDeliveryStatus('${delivery.id}')">Update</button>
                                </td>
                            </tr>
                        `).join('') || '<tr><td colspan="7">No deliveries found</td></tr>'}
                    </tbody>
                </table>
            `;

            document.getElementById('deliveriesTable').innerHTML = XSSProtection.sanitize(tableHtml);
        } catch (error) {
            console.error('Error loading deliveries table:', error);
        }
    }

    initializeMap() {
        const mapContainer = document.getElementById('deliveryMapContainer');
        mapContainer.innerHTML = XSSProtection.sanitize(`
            <div class="live-map">
                <h4>🗺️ Live Delivery Tracking</h4...               <div class="map-legend">
                    <span class="legend-item"><span class="marker pickup"></span> Pickup Points</span>
                    <span class="legend-item"><span class="marker delivery"></span> Delivery Points</span>
                    <span class="legend-item"><span class="marker agent"></span> Active Agents</span>
                </div>
                <div class="map-display">
                    <p>Interactive map integration would be implemented here using:</p>
                    <ul>
                        <li>Google Maps API or Leaflet.js</li>
                        <li>Real-time GPS coordinates from deliveries table</li>
                        <li>Route optimization algorithms</li>
                        <li>Live tracking updates every 30 seconds</li>
                    </ul>
                </div>
            </div>
        `);
    }

    showCreateDeliveryModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = XSSProtection.sanitize(`
            <div class="modal-content">
                <div class="modal-header">
  ...               <h2>Create New Delivery</h2>
                    <button type="button" class="close">&times;</button>
                </div>
                <form onsubmit="event.preventDefault(); window.createDelivery();">
                    <div class="form-group">
                        <label>Order ID</label>
                        <input type="text" id="deliveryOrderId" required>
                    </div>
                    <div class="form-group">
                        <label>Delivery Address</label>
                        <textarea id="deliveryAddress" required></textarea>
                    </div>
                    <div class="form-group">
                        <label>Recipient Name</label>
                        <input type="text" id="recipientName" required>
                    </div>
                    <div class="form-group">
                        <label>Recipient Phone</label>
                        <input type="tel" id="recipientPhone" required>
                    </div>
                    <button type="submit" class="btn-submit">Create Delivery</button>
                </form>
            </div>
        `);
        document.body.appendChild(modal);
        modal.style.display = 'block';
        
        modal.querySelector('.close').onclick = () => modal.remove();
    }
}

// Global functions
window.trackDelivery = async function(deliveryId) {
    showUserMessage('Opening delivery tracking details...', 'info');
    // Implementation for individual delivery tracking
};

window.updateDeliveryStatus = async function(deliveryId) {
    const newStatus = prompt('Enter new status (assigned/picked_up/in_transit/delivered):');
    if (!newStatus) return;

    try {
        const supabase = initSupabase();
        const { error } = await supabase
            .from('deliveries')
            .update({ 
                status: newStatus,
                actual_delivery: newStatus === 'delivered' ? new Date().toISOString() : null
            })
            .eq('id', deliveryId);

        if (error) throw error;
        showUserMessage('Delivery status updated', 'success');
        window.deliveryTracker?.loadDeliveriesTable();
    } catch (error) {
        console.error('Error updating delivery:', error);
        showUserMessage('Error updating delivery status', 'error');
    }
};

window.createDelivery = async function() {
    try {
        const supabase = initSupabase();
        const trackingCode = 'STK' + Math.random().toString(36).substr(2, 6).toUpperCase();
        
        const { error } = await supabase
            .from('deliveries')
            .insert([{
                order_id: document.getElementById('deliveryOrderId').value,
                delivery_address: document.getElementById('deliveryAddress').value,
                recipient_name: document.getElementById('recipientName').value,
                recipient_phone: document.getElementById('recipientPhone').value,
                tracking_code: trackingCode,
                status: 'pending'
            }]);

        if (error) throw error;
        
        showUserMessage('Delivery created successfully', 'success');
        document.querySelector('.modal').remove();
        window.deliveryTracker?.loadDeliveriesTable();
    } catch (error) {
        console.error('Error creating delivery:', error);
        showUserMessage('Error creating delivery', 'error');
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('deliveryContent')) {
        window.deliveryTracker = new DeliveryTracker();
        window.deliveryTracker.init();
    }
});