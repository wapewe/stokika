class NotificationSystem {
    constructor() {
        this.supabase = null;
        this.userId = null;
        this.unreadCount = 0;
    }

    async init(supabaseClient, userId) {
        this.supabase = supabaseClient;
        this.userId = userId;
        await this.loadUnreadCount();
        this.setupRealtimeSubscription();
    }

    async loadUnreadCount() {
        const { count } = await this.supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', this.userId)
            .eq('is_read', false);
        
        this.unreadCount = count || 0;
        this.updateBadge();
    }

    async getNotifications(limit = 10) {
        const { data, error } = await this.supabase
            .from('notifications')
            .select('*')
            .eq('user_id', this.userId)
            .order('created_at', { ascending: false })
            .limit(limit);
        
        return data || [];
    }

    async markAsRead(notificationId) {
        const { error } = await this.supabase
            .from('notifications')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('id', notificationId);
        
        if (!error) {
            this.unreadCount = Math.max(0, this.unreadCount - 1);
            this.updateBadge();
        }
    }

    async markAllAsRead() {
        const { error } = await this.supabase
            .from('notifications')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('user_id', this.userId)
            .eq('is_read', false);
        
        if (!error) {
            this.unreadCount = 0;
            this.updateBadge();
        }
    }

    async createNotification(title, message, type = 'info', category = null, actionUrl = null) {
        const { data, error } = await this.supabase
            .from('notifications')
            .insert([{
                user_id: this.userId,
                title,
                message,
                type,
                category,
                action_url: actionUrl
            }]);
        
        return !error;
    }

    setupRealtimeSubscription() {
        this.supabase
            .channel('notifications')
            .on('postgres_changes', 
                { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'notifications',
                    filter: `user_id=eq.${this.userId}`
                }, 
                (payload) => {
                    this.unreadCount++;
                    this.updateBadge();
                    this.showToast(payload.new.title, payload.new.message, payload.new.type);
                }
            )
            .subscribe();
    }

    updateBadge() {
        const badges = document.querySelectorAll('.notification-badge');
        badges.forEach(badge => {
            badge.textContent = this.unreadCount;
            badge.style.display = this.unreadCount > 0 ? 'block' : 'none';
        });
    }

    showToast(title, message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = XSSProtection.sanitize(`<strong>${sanitize(title)}</strong><p>${sanitize(message)}</p>`);
        toast.style.cssText = 'position:fixed;top:20px;right:20px;background:#fff;padding:1rem;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:10000;min-width:300px;animation:slideIn 0.3s ease';
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    async showNotificationPanel() {
        const notifications = await this.getNotifications();
        
        const panel = document.createElement('div');
        panel.id = 'notificationPanel';
        panel.style.cssText = 'position:fixed;top:60px;right:20px;width:400px;max-height:600px;background:#fff;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.15);z-index:9999;overflow:hidden';
        
        panel.innerHTML = XSSProtection.sanitize(`
            <div style="padding:1rem;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center">
                <h3 style="margin:0">Notifications</h3>
                <button onclick="notificationSystem.markAllAsRead()" style="background:none;border:none;color:#667eea;cursor:pointer;font-size:0.875rem">Mark all read</button>
            </div>
            <div style="max-height:500px;overflow-y:auto">
                ${sanitize(notifications.length === 0 ? '<p style="padding:2rem;text-align:center;color:#64748b">No notifications</p>' : notifications.map(n => `)
                    <div onclick="notificationSystem.markAsRead('${n.id)}')" style="padding:1rem;border-bottom:1px solid #e2e8f0;cursor:pointer;background:${sanitize(n.is_read ? '#fff' : '#f8fafc')}">
                        <div style="display:flex;justify-content:space-between;margin-bottom:0.5rem">
                            <strong style="color:#1a202c">${sanitize(n.title)}</strong>
                            <span style="font-size:0.75rem;color:#64748b">${sanitize(new Date(n.created_at).toLocaleDateString())}</span>
                        </div>
                        <p style="margin:0;color:#64748b;font-size:0.875rem">${sanitize(n.message)}</p>
                    </div>
                `).join('')}
            </div>
        `;
        
        document.body.appendChild(panel);
        
        setTimeout(() => {
            document.addEventListener('click', function closePanel(e) {
                if (!panel.contains(e.target) && !e.target.closest('.notification-btn')) {
                    panel.remove();
                    document.removeEventListener('click', closePanel);
                }
            });
        }, 100);
    }
}

const notificationSystem = new NotificationSystem();
