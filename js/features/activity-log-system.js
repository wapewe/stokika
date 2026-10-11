// XSS Protection: Using sanitize() helper from xss-protection.js
// Make sure xss-protection.js is loaded in your HTML file

// Activity Log System
class ActivityLogger {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.init();
    }

    async init() {
        if (window.supabase && window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
            // Reuse shared client if available, avoid creating duplicate GoTrueClient instances
            this.supabase = window._sharedSupabaseClient || window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
            if (!window._sharedSupabaseClient) window._sharedSupabaseClient = this.supabase;
            this.currentUser = (typeof AuthManager !== 'undefined') ? AuthManager?.currentUser : null;
            this.setupAutoLogging();
        }
    }

    // Log user activity
    async logActivity(action, entityType = null, entityId = null, oldValues = null, newValues = null, details = {}) {
        try {
            const activityData = {
                user_id: this.currentUser?.userId || this.currentUser?.id || null,
                action,
                entity_type: entityType,
                entity_id: entityId || null,
                old_values: oldValues,
                new_values: newValues,
                ip_address: await this.getClientIP(),
                user_agent: navigator.userAgent.substring(0, 200),
                details
            };

            const { data, error } = await this.supabase
                .from('audit_logs')
                .insert([activityData]);

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Failed to log activity:', error);
        }
    }

    // Setup automatic logging for common actions
    setupAutoLogging() {
        // Log page visits
        this.logActivity('page_visit', 'page', null, null, null, {
            page: window.location.pathname,
            referrer: document.referrer
        });

        // Log form submissions
        document.addEventListener('submit', (e) => {
            const form = e.target;
            if (form.tagName === 'FORM') {
                this.logFormSubmission(form);
            }
        });

        // Log button clicks for important actions
        document.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (button && this.isImportantAction(button)) {
                this.logButtonClick(button);
            }
        });

        // Log navigation
        window.addEventListener('beforeunload', () => {
            this.logActivity('page_leave', 'page', null, null, null, {
                page: window.location.pathname,
                duration: Date.now() - this.pageStartTime
            });
        });

        this.pageStartTime = Date.now();
    }

    logFormSubmission(form) {
        const formData = new FormData(form);
        const data = {};
        for (let [key, value] of formData.entries()) {
            // Don't log sensitive data
            if (!this.isSensitiveField(key)) {
                data[key] = value;
            }
        }

        this.logActivity('form_submit', 'form', form.id || form.className, null, null, {
            form_id: form.id,
            form_class: form.className,
            fields: Object.keys(data)
        });
    }

    logButtonClick(button) {
        this.logActivity('button_click', 'button', button.id, null, null, {
            button_text: button.textContent?.trim().substring(0, 50),
            button_id: button.id,
            button_class: button.className
        });
    }

    isImportantAction(button) {
        const importantClasses = [
            'btn-submit', 'btn-save', 'btn-delete', 'btn-approve', 'btn-reject',
            'btn-create', 'btn-update', 'btn-export', 'logout-btn'
        ];
        
        const importantIds = [
            'saveBtn', 'deleteBtn', 'approveBtn', 'rejectBtn', 'exportBtn'
        ];

        return importantClasses.some(cls => button.classList.contains(cls)) ||
               importantIds.includes(button.id) ||
               button.textContent?.toLowerCase().includes('save') ||
               button.textContent?.toLowerCase().includes('delete') ||
               button.textContent?.toLowerCase().includes('approve');
    }

    isSensitiveField(fieldName) {
        const sensitiveFields = [
            'password', 'confirm_password', 'otp', 'pin', 'cvv', 'ssn'
        ];
        return sensitiveFields.some(field => 
            fieldName.toLowerCase().includes(field)
        );
    }

    // Specific logging methods for different entities
    async logUserAction(action, userId, oldData = null, newData = null) {
        return this.logActivity(action, 'user', userId, oldData, newData);
    }

    async logVendorAction(action, vendorId, oldData = null, newData = null) {
        return this.logActivity(action, 'vendor', vendorId, oldData, newData);
    }

    async logSupplierAction(action, supplierId, oldData = null, newData = null) {
        return this.logActivity(action, 'supplier', supplierId, oldData, newData);
    }

    async logOrderAction(action, orderId, oldData = null, newData = null) {
        return this.logActivity(action, 'order', orderId, oldData, newData);
    }

    async logPaymentAction(action, paymentId, oldData = null, newData = null) {
        return this.logActivity(action, 'payment', paymentId, oldData, newData);
    }

    // Get activity logs with filters
    async getActivityLogs(filters = {}) {
        try {
            let query = this.supabase
                .from('audit_logs')
                .select(`
                    *,
                    users(name, email, role)
                `);

            // Apply filters
            if (filters.userId) {
                query = query.eq('user_id', filters.userId);
            }
            
            if (filters.action) {
                query = query.eq('action', filters.action);
            }
            
            if (filters.entityType) {
                query = query.eq('entity_type', filters.entityType);
            }
            
            if (filters.startDate) {
                query = query.gte('created_at', filters.startDate);
            }
            
            if (filters.endDate) {
                query = query.lte('created_at', filters.endDate);
            }

            const { data, error } = await query
                .order('created_at', { ascending: false })
                .limit(filters.limit || 100);

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Failed to get activity logs:', error);
            return [];
        }
    }

    // Create activity log viewer UI
    createActivityLogViewer(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const viewerHTML = `
            <div class="activity-log-viewer">
                <div class="activity-log-header">
                    <h3>Activity Log</h3>
                    <div class="activity-filters">
                        <select id="actionFilter">
                            <option value="">All Actions</option>
                            <option value="create">Create</option>
                            <option value="update">Update</option>
                            <option value="delete">Delete</option>
                            <option value="login">Login</option>
                            <option value="logout">Logout</option>
                            <option value="approve">Approve</option>
                            <option value="reject">Reject</option>
                        </select>
                        
                        <select id="entityFilter">
                            <option value="">All Entities</option>
                            <option value="user">Users</option>
                            <option value="vendor">Vendors</option>
                            <option value="supplier">Suppliers</option>
                            <option value="order">Orders</option>
                            <option value="payment">Payments</option>
                        </select>
                        
                        <input type="date" id="startDateFilter" placeholder="Start Date">
                        <input type="date" id="endDateFilter" placeholder="End Date">
                        
                        <button id="applyActivityFilters">Apply</button>
                        <button id="clearActivityFilters">Clear</button>
                        <button id="exportActivityLog">Export</button>
                    </div>
                </div>
                
                <div class="activity-log-list" id="activityLogList">
                    <div class="loading">Loading activity logs...</div>
                </div>
                
                <div class="activity-log-pagination" id="activityPagination">
                    <button id="prevPage" disabled>Previous</button>
                    <span id="pageInfo">Page 1 of 1</span>
                    <button id="nextPage" disabled>Next</button>
                </div>
            </div>
        `;

        container.innerHTML = viewerHTML;
        this.setupActivityLogEvents();
        this.loadActivityLogs();
        this.addActivityLogCSS();
    }

    setupActivityLogEvents() {
        document.getElementById('applyActivityFilters')?.addEventListener('click', () => {
            this.loadActivityLogs();
        });

        document.getElementById('clearActivityFilters')?.addEventListener('click', () => {
            document.getElementById('actionFilter').value = '';
            document.getElementById('entityFilter').value = '';
            document.getElementById('startDateFilter').value = '';
            document.getElementById('endDateFilter').value = '';
            this.loadActivityLogs();
        });

        document.getElementById('exportActivityLog')?.addEventListener('click', () => {
            this.exportActivityLog();
        });
    }

    async loadActivityLogs() {
        const listContainer = document.getElementById('activityLogList');
        if (!listContainer) return;

        listContainer.innerHTML = '<div class="loading">Loading activity logs...</div>';

        try {
            const filters = {
                action: document.getElementById('actionFilter')?.value,
                entityType: document.getElementById('entityFilter')?.value,
                startDate: document.getElementById('startDateFilter')?.value,
                endDate: document.getElementById('endDateFilter')?.value,
                limit: 50
            };

            const logs = await this.getActivityLogs(filters);
            this.displayActivityLogs(logs);
        } catch (error) {
            listContainer.innerHTML = '<div class="error">Failed to load activity logs</div>';
        }
    }

    displayActivityLogs(logs) {
        const listContainer = document.getElementById('activityLogList');
        
        if (logs.length === 0) {
            listContainer.innerHTML = '<div class="no-logs">No activity logs found</div>';
            return;
        }

        const escapeHtml = (text) => {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        };

        const logsHTML = logs.map(log => `
            <div class="activity-log-item">
                <div class="log-icon">${this.getActionIcon(log.action)}</div>
                <div class="log-content">
                    <div class="log-header">
                        <span class="log-user">${escapeHtml(log.users?.name || 'System')}</span>
                        <span class="log-action">${escapeHtml(this.formatAction(log.action))}</span>
                        ${log.entity_type ? `<span class="log-entity">${escapeHtml(log.entity_type)}</span>` : ''}
                        <span class="log-time">${escapeHtml(this.formatTime(log.created_at))}</span>
                    </div>
                    <div class="log-details">
                        ${this.formatLogDetails(log)}
                    </div>
                    ${log.ip_address ? `<div class="log-meta">IP: ${escapeHtml(log.ip_address)}</div>` : ''}
                </div>
            </div>
        `).join('');

        listContainer.innerHTML = logsHTML;
    }

    getActionIcon(action) {
        const icons = {
            create: '➕',
            update: '✏️',
            delete: '🗑️',
            login: '🔑',
            logout: '🚪',
            approve: '✅',
            reject: '❌',
            view: '👁️',
            export: '📤',
            import: '📥',
            page_visit: '🌐',
            form_submit: '📝',
            button_click: '🖱️'
        };
        return icons[action] || '📋';
    }

    formatAction(action) {
        return action.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    formatLogDetails(log) {
        let details = '';
        
        if (log.old_values && log.new_values) {
            details += '<div class="log-changes">Changes made:</div>';
            const changes = this.getChanges(log.old_values, log.new_values);
            details += changes.map(change => 
                `<div class="change-item">${change.field}: ${change.from} → ${change.to}</div>`
            ).join('');
        }
        
        if (log.details) {
            const detailsObj = typeof log.details === 'string' ? 
                JSON.parse(log.details) : log.details;
            
            Object.entries(detailsObj).forEach(([key, value]) => {
                if (key !== 'sensitive_data') {
                    details += `<div class="detail-item">${key}: ${value}</div>`;
                }
            });
        }
        
        return details || 'No additional details';
    }

    getChanges(oldValues, newValues) {
        const changes = [];
        const oldObj = typeof oldValues === 'string' ? JSON.parse(oldValues) : oldValues;
        const newObj = typeof newValues === 'string' ? JSON.parse(newValues) : newValues;
        
        Object.keys(newObj).forEach(key => {
            if (oldObj[key] !== newObj[key] && !this.isSensitiveField(key)) {
                changes.push({
                    field: key,
                    from: oldObj[key] || 'empty',
                    to: newObj[key] || 'empty'
                });
            }
        });
        
        return changes;
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }

    async exportActivityLog() {
        try {
            const filters = {
                action: document.getElementById('actionFilter')?.value,
                entityType: document.getElementById('entityFilter')?.value,
                startDate: document.getElementById('startDateFilter')?.value,
                endDate: document.getElementById('endDateFilter')?.value,
                limit: 1000
            };

            const logs = await this.getActivityLogs(filters);
            
            const exportData = logs.map(log => ({
                'Date/Time': new Date(log.created_at).toLocaleString(),
                'User': log.users?.name || 'System',
                'Email': log.users?.email || 'N/A',
                'Action': this.formatAction(log.action),
                'Entity Type': log.entity_type || 'N/A',
                'Entity ID': log.entity_id || 'N/A',
                'IP Address': log.ip_address || 'N/A',
                'Details': JSON.stringify(log.details || {})
            }));

            // Use ExportManager if available
            if (window.ExportManager) {
                ExportManager.exportToCSV(exportData, 'audit_logs');
            } else {
                this.downloadCSV(exportData, 'audit_logs');
            }
        } catch (error) {
            console.error('Export failed:', error);
            alert('Export failed. Please try again.');
        }
    }

    downloadCSV(data, filename) {
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => 
                headers.map(header => `"${(row[header] || '').toString().replace(/"/g, '""')}"`).join(',')
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    async getClientIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch {
            return '127.0.0.1';
        }
    }

    addActivityLogCSS() {
        if (document.getElementById('activity-log-styles')) return;

        const style = document.createElement('style');
        style.id = 'activity-log-styles';
        style.textContent = `
            .activity-log-viewer {
                background: var(--card-bg, white);
                border-radius: 8px;
                padding: 20px;
                box-shadow: var(--shadow, 0 2px 4px rgba(0,0,0,0.1));
            }
            
            .activity-log-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                flex-wrap: wrap;
                gap: 16px;
            }
            
            .activity-log-header h3 {
                margin: 0;
                color: var(--text-primary, #333);
            }
            
            .activity-filters {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }
            
            .activity-filters select,
            .activity-filters input {
                padding: 6px 12px;
                border: 1px solid var(--border-primary, #ddd);
                border-radius: 4px;
                background: var(--input-bg, white);
                color: var(--text-primary, #333);
            }
            
            .activity-filters button {
                padding: 6px 12px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                transition: background 0.2s;
            }
            
            .activity-filters button:first-of-type {
                background: #007bff;
                color: white;
            }
            
            .activity-filters button:nth-of-type(2) {
                background: #6c757d;
                color: white;
            }
            
            .activity-filters button:last-of-type {
                background: #28a745;
                color: white;
            }
            
            .activity-log-list {
                max-height: 600px;
                overflow-y: auto;
                border: 1px solid var(--border-primary, #eee);
                border-radius: 4px;
            }
            
            .activity-log-item {
                display: flex;
                align-items: flex-start;
                gap: 12px;
                padding: 16px;
                border-bottom: 1px solid var(--border-secondary, #f5f5f5);
                transition: background 0.2s;
            }
            
            .activity-log-item:hover {
                background: var(--bg-secondary, #f8f9fa);
            }
            
            .log-icon {
                font-size: 20px;
                width: 24px;
                text-align: center;
            }
            
            .log-content {
                flex: 1;
            }
            
            .log-header {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 8px;
                flex-wrap: wrap;
            }
            
            .log-user {
                font-weight: 600;
                color: var(--text-primary, #333);
            }
            
            .log-action {
                background: #007bff;
                color: white;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 12px;
            }
            
            .log-entity {
                background: #6c757d;
                color: white;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 12px;
            }
            
            .log-time {
                color: var(--text-muted, #666);
                font-size: 12px;
                margin-left: auto;
            }
            
            .log-details {
                font-size: 14px;
                color: var(--text-secondary, #666);
                margin-bottom: 4px;
            }
            
            .log-changes {
                font-weight: 500;
                margin-bottom: 4px;
            }
            
            .change-item,
            .detail-item {
                font-size: 12px;
                color: var(--text-muted, #888);
                margin-left: 16px;
            }
            
            .log-meta {
                font-size: 11px;
                color: var(--text-muted, #999);
            }
            
            .loading,
            .error,
            .no-logs {
                text-align: center;
                padding: 40px;
                color: var(--text-muted, #666);
            }
            
            .error {
                color: #dc3545;
            }
            
            .activity-log-pagination {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 16px;
                margin-top: 20px;
            }
            
            .activity-log-pagination button {
                padding: 8px 16px;
                border: 1px solid var(--border-primary, #ddd);
                background: var(--button-bg, white);
                color: var(--text-primary, #333);
                border-radius: 4px;
                cursor: pointer;
                transition: background 0.2s;
            }
            
            .activity-log-pagination button:hover:not(:disabled) {
                background: var(--button-hover, #f8f9fa);
            }
            
            .activity-log-pagination button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
        `;
        document.head.appendChild(style);
    }
}

// Initialize activity logger
window.ActivityLogger = new ActivityLogger();