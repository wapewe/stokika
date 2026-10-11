// Real-time Notification System
class NotificationManager {
    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
        this.supabase = null;
        this.subscription = null;
        this.init();
    }

    async init() {
        if (window.supabase && window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
            // Reuse shared client if available, avoid creating duplicate GoTrueClient instances
            this.supabase = window._sharedSupabaseClient || window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
            if (!window._sharedSupabaseClient) window._sharedSupabaseClient = this.supabase;
            this.createNotificationUI();
            // Only load notifications if AuthManager is available
            if (typeof AuthManager !== 'undefined') {
                await this.loadNotifications();
                this.setupRealtimeSubscription();
            }
        }
    }

    createNotificationUI() {
        // Create notification bell icon
        const bellHTML = `
            <div class="notification-container">
                <button class="notification-bell" id="notificationBell">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                    </svg>
                    <span class="notification-badge" id="notificationBadge">0</span>
                </button>
                <div class="notification-dropdown" id="notificationDropdown">
                    <div class="notification-header">
                        <h3>Notifications</h3>
                        <button class="mark-all-read" id="markAllRead">Mark all read</button>
                    </div>
                    <div class="notification-list" id="notificationList">
                        <div class="no-notifications">No notifications</div>
                    </div>
                    <div class="notification-footer">
                        <a href="#" id="viewAllNotifications">View all notifications</a>
                    </div>
                </div>
            </div>
        `;

        // Add to header
        const header = document.querySelector('.header-nav') || document.querySelector('header');
        if (header) {
            header.insertAdjacentHTML('beforeend', bellHTML);
            this.setupEventListeners();
        }

        // Add CSS
        this.addNotificationCSS();
    }

    setupEventListeners() {
        const bell = document.getElementById('notificationBell');
        const dropdown = document.getElementById('notificationDropdown');
        const markAllRead = document.getElementById('markAllRead');

        bell?.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('show');
        });

        markAllRead?.addEventListener('click', () => {
            this.markAllAsRead();
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.notification-container')) {
                dropdown?.classList.remove('show');
            }
        });
    }

    async loadNotifications() {
        try {
            const userId = (typeof AuthManager !== 'undefined') ? AuthManager?.currentUser?.userId : null;
            if (!userId) return;

            const { data, error } = await this.supabase
                .from('notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;

            this.notifications = data || [];
            this.updateUI();
        } catch (error) {
            console.error('Failed to load notifications:', error);
        }
    }

    setupRealtimeSubscription() {
        const userId = (typeof AuthManager !== 'undefined') ? AuthManager?.currentUser?.userId : null;
        if (!userId) return;

        this.subscription = this.supabase
            .channel('notifications')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${userId}`
            }, (payload) => {
                this.handleNewNotification(payload.new);
            })
            .subscribe();
    }

    handleNewNotification(notification) {
        this.notifications.unshift(notification);
        this.showToast(notification);
        this.updateUI();
        this.playNotificationSound();
    }

    showToast(notification) {
        // Use the enhanced toast system if available
        if (window.Toast) {
            window.Toast.show(notification.message, notification.type, 5000, {
                title: notification.title
            });
            return;
        }

        // Fallback to basic toast
        const toast = document.createElement('div');
        toast.className = `toast toast-${notification.type}`;
        
        const iconDiv = document.createElement('div');
        iconDiv.className = 'toast-icon';
        iconDiv.textContent = this.getNotificationIcon(notification.type);
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'toast-content';
        
        const titleDiv = document.createElement('div');
        titleDiv.className = 'toast-title';
        titleDiv.textContent = notification.title;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'toast-message';
        messageDiv.textContent = notification.message;
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'toast-close';
        closeBtn.textContent = '×';
        
        contentDiv.appendChild(titleDiv);
        contentDiv.appendChild(messageDiv);
        toast.appendChild(iconDiv);
        toast.appendChild(contentDiv);
        toast.appendChild(closeBtn);

        document.body.appendChild(toast);

        // Auto remove after 5 seconds
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 5000);

        // Manual close
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        });
    }

    updateUI() {
        const badge = document.getElementById('notificationBadge');
        const list = document.getElementById('notificationList');

        // Update badge count
        this.unreadCount = this.notifications.filter(n => !n.read).length;
        if (badge) {
            badge.textContent = this.unreadCount;
            badge.style.display = this.unreadCount > 0 ? 'block' : 'none';
        }

        // Update notification list
        if (list) {
            if (this.notifications.length === 0) {
                list.innerHTML = '<div class="no-notifications">No notifications</div>';
            } else {
                list.innerHTML = this.notifications.map(n => this.renderNotification(n)).join('');
            }
        }
    }

    renderNotification(notification) {
        const timeAgo = this.getTimeAgo(new Date(notification.created_at));
        const escapeHtml = (text) => {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        };
        
        return `
            <div class="notification-item ${!notification.read ? 'unread' : ''}" data-id="${escapeHtml(String(notification.id))}">
                <div class="notification-icon ${escapeHtml(notification.type)}">
                    ${this.getNotificationIcon(notification.type)}
                </div>
                <div class="notification-content">
                    <div class="notification-title">${escapeHtml(notification.title)}</div>
                    <div class="notification-message">${escapeHtml(notification.message)}</div>
                    <div class="notification-time">${escapeHtml(timeAgo)}</div>
                </div>
                ${!notification.read ? '<div class="unread-dot"></div>' : ''}
            </div>
        `;
    }

    getNotificationIcon(type) {
        const icons = {
            info: '📢',
            success: '✅',
            warning: '⚠️',
            error: '❌',
            order: '📦',
            payment: '💰',
            system: '⚙️',
            security: '🔒'
        };
        return icons[type] || '📢';
    }

    async markAsRead(notificationId) {
        try {
            const { error } = await this.supabase
                .from('notifications')
                .update({ read: true })
                .eq('id', notificationId);

            if (error) throw error;

            // Update local state
            const notification = this.notifications.find(n => n.id === notificationId);
            if (notification) {
                notification.read = true;
                this.updateUI();
            }
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    }

    async markAllAsRead() {
        try {
            const userId = AuthManager?.currentUser?.userId;
            if (!userId) return;

            const { error } = await this.supabase
                .from('notifications')
                .update({ read: true })
                .eq('user_id', userId)
                .eq('read', false);

            if (error) throw error;

            // Update local state
            this.notifications.forEach(n => n.read = true);
            this.updateUI();
        } catch (error) {
            console.error('Failed to mark all notifications as read:', error);
        }
    }

    // Create notification (for system use)
    async createNotification(userId, title, message, type = 'info', category = null, actionUrl = null, metadata = {}) {
        try {
            const { data, error } = await this.supabase
                .from('notifications')
                .insert([{
                    user_id: userId,
                    title,
                    message,
                    type,
                    category,
                    action_url: actionUrl,
                    metadata
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Failed to create notification:', error);
            throw error;
        }
    }

    playNotificationSound() {
        // Create audio context for notification sound
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (error) {
            console.log('Audio not supported');
        }
    }

    getTimeAgo(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    }

    addNotificationCSS() {
        const style = document.createElement('style');
        style.textContent = `
            .notification-container { position: relative; }
            .notification-bell {
                background: none; border: none; cursor: pointer; position: relative;
                padding: 8px; border-radius: 50%; transition: background 0.2s;
            }
            .notification-bell:hover { background: rgba(0,0,0,0.1); }
            .notification-bell svg { width: 20px; height: 20px; }
            .notification-badge {
                position: absolute; top: 0; right: 0; background: #ff4444;
                color: white; border-radius: 50%; width: 18px; height: 18px;
                font-size: 10px; display: flex; align-items: center; justify-content: center;
                font-weight: bold; display: none;
            }
            .notification-dropdown {
                position: absolute; top: 100%; right: 0; width: 350px;
                background: white; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                display: none; z-index: 1000; max-height: 400px; overflow: hidden;
            }
            .notification-dropdown.show { display: block; }
            .notification-header {
                padding: 16px; border-bottom: 1px solid #eee;
                display: flex; justify-content: space-between; align-items: center;
            }
            .notification-header h3 { margin: 0; font-size: 16px; }
            .mark-all-read {
                background: none; border: none; color: #007bff; cursor: pointer;
                font-size: 12px; text-decoration: underline;
            }
            .notification-list { max-height: 300px; overflow-y: auto; }
            .notification-item {
                padding: 12px 16px; border-bottom: 1px solid #f5f5f5;
                display: flex; align-items: flex-start; gap: 12px; cursor: pointer;
                transition: background 0.2s; position: relative;
            }
            .notification-item:hover { background: #f8f9fa; }
            .notification-item.unread { background: #f0f8ff; }
            .notification-icon { font-size: 20px; }
            .notification-content { flex: 1; }
            .notification-title { font-weight: 600; font-size: 14px; margin-bottom: 4px; }
            .notification-message { font-size: 12px; color: #666; margin-bottom: 4px; }
            .notification-time { font-size: 11px; color: #999; }
            .unread-dot {
                width: 8px; height: 8px; background: #007bff; border-radius: 50%;
                position: absolute; top: 16px; right: 16px;
            }
            .notification-footer {
                padding: 12px 16px; text-align: center; border-top: 1px solid #eee;
            }
            .notification-footer a {
                color: #007bff; text-decoration: none; font-size: 12px;
            }
            .no-notifications {
                padding: 40px 16px; text-align: center; color: #999; font-size: 14px;
            }
            .toast {
                position: fixed; top: 20px; right: 20px; background: white;
                border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                padding: 16px; display: flex; align-items: flex-start; gap: 12px;
                max-width: 350px; z-index: 10000; animation: slideIn 0.3s ease;
            }
            .toast-success { border-left: 4px solid #28a745; }
            .toast-error { border-left: 4px solid #dc3545; }
            .toast-warning { border-left: 4px solid #ffc107; }
            .toast-info { border-left: 4px solid #17a2b8; }
            .toast-icon { font-size: 20px; }
            .toast-content { flex: 1; }
            .toast-title { font-weight: 600; font-size: 14px; margin-bottom: 4px; }
            .toast-message { font-size: 12px; color: #666; }
            .toast-close {
                background: none; border: none; cursor: pointer; font-size: 18px;
                color: #999; padding: 0; width: 20px; height: 20px;
            }
            .toast.fade-out { animation: slideOut 0.3s ease; }
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    destroy() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }
}

// Initialize notification manager
window.NotificationManager = new NotificationManager();