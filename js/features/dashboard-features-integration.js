// Dashboard Features Integration for Stokika Platform
// Master integration file that initializes and coordinates all dashboard features

class DashboardFeaturesIntegration {
    constructor() {
        this.isInitialized = false;
        this.features = {};
        this.userRole = localStorage.getItem('userRole') || 'guest';
        this.userId = localStorage.getItem('userId') || null;
        
        this.init();
    }

    async init() {
        if (this.isInitialized) return;
        
        try {
            // Initialize all feature systems
            await this.initializeFeatures();
            
            // Setup cross-feature integrations
            this.setupIntegrations();
            
            // Setup global event listeners
            this.setupGlobalEventListeners();
            
            // Initialize feature-specific UI elements
            this.initializeUI();
            
            // Setup keyboard shortcuts
            this.setupKeyboardShortcuts();
            
            this.isInitialized = true;
            
            console.log('✅ Dashboard Features Integration initialized successfully');
            
            // Show welcome notification
            this.showWelcomeNotification();
            
        } catch (error) {
            console.error('❌ Error initializing dashboard features:', error);
        }
    }

    async initializeFeatures() {
        // Initialize notification system first (other systems depend on it)
        if (window.NotificationSystem) {
            this.features.notifications = new NotificationSystem();
        }

        // Initialize dark mode system
        if (window.DarkModeSystem) {
            this.features.darkMode = new DarkModeSystem();
        }

        // Initialize advanced search
        if (window.AdvancedSearchSystem) {
            this.features.search = new AdvancedSearchSystem();
        }

        // Initialize export system
        if (window.ExportSystem) {
            this.features.export = new ExportSystem();
        }

        // Initialize activity log system
        if (window.ActivityLogSystem) {
            this.features.activityLog = new ActivityLogSystem();
        }

        // Initialize help support system
        if (window.HelpSupportSystem) {
            this.features.helpSupport = new HelpSupportSystem();
        }

        // Wait for all systems to be ready
        await this.waitForSystemsReady();
    }

    async waitForSystemsReady() {
        // Wait a bit for all systems to fully initialize
        return new Promise(resolve => {
            setTimeout(() => {
                console.log('🚀 All dashboard features ready');
                resolve();
            }, 500);
        });
    }

    setupIntegrations() {
        // Integration between notification and activity log systems
        this.setupNotificationActivityIntegration();
        
        // Integration between search and export systems
        this.setupSearchExportIntegration();
        
        // Integration between theme and all visual systems
        this.setupThemeIntegration();
        
        // Integration between help system and other features
        this.setupHelpIntegration();
    }

    setupNotificationActivityIntegration() {
        // Log notification events to activity system
        document.addEventListener('notificationShown', (e) => {
            if (this.features.activityLog) {
                this.features.activityLog.log(
                    'view',
                    'Notification Received',
                    `${e.detail.type}: ${e.detail.title}`,
                    { notificationType: e.detail.type, message: e.detail.message }
                );
            }
        });

        // Show notifications for important activities
        document.addEventListener('activityLogged', (e) => {
            const activity = e.detail;
            
            // Show notifications for certain activity types
            if (['create', 'update', 'delete'].includes(activity.type) && this.features.notifications) {
                this.features.notifications.info(
                    'Activity Logged',
                    activity.description,
                    'system'
                );
            }
        });
    }

    setupSearchExportIntegration() {
        // Add export button to search results
        document.addEventListener('globalSearch', (e) => {
            if (this.features.export) {
                // Add export functionality to search results
                setTimeout(() => {
                    const searchResultsContainer = document.querySelector('.search-results');
                    if (searchResultsContainer && !searchResultsContainer.querySelector('.export-search-btn')) {
                        this.features.export.addExportButton(searchResultsContainer, {
                            text: 'Export Results'
                        });
                    }
                }, 100);
            }
        });
    }

    setupThemeIntegration() {
        // Update all systems when theme changes
        document.addEventListener('themeChanged', (e) => {
            const { theme } = e.detail;
            
            // Update notification system colors
            if (this.features.notifications) {
                this.updateNotificationTheme(theme);
            }
            
            // Update search system colors
            if (this.features.search) {
                this.updateSearchTheme(theme);
            }
            
            // Update activity log colors
            if (this.features.activityLog) {
                this.updateActivityLogTheme(theme);
            }
            
            // Update help system colors
            if (this.features.helpSupport) {
                this.updateHelpSupportTheme(theme);
            }
        });
    }

    setupHelpIntegration() {
        // Add contextual help triggers
        this.addContextualHelp();
        
        // Log help system usage
        document.addEventListener('helpOpened', (e) => {
            if (this.features.activityLog) {
                this.features.activityLog.log(
                    'view',
                    'Help Accessed',
                    `Opened help: ${e.detail.section}`,
                    { helpSection: e.detail.section }
                );
            }
        });
    }

    setupGlobalEventListeners() {
        // Global error handling
        window.addEventListener('error', (e) => {
            if (this.features.notifications) {
                this.features.notifications.error(
                    'System Error',
                    'An unexpected error occurred. Please try again.',
                    'system'
                );
            }
            
            if (this.features.activityLog) {
                this.features.activityLog.log(
                    'error',
                    'JavaScript Error',
                    e.message,
                    { 
                        filename: e.filename,
                        lineno: e.lineno,
                        colno: e.colno,
                        stack: e.error?.stack
                    }
                );
            }
        });

        // Network status monitoring
        window.addEventListener('online', () => {
            if (this.features.notifications) {
                this.features.notifications.success(
                    'Connection Restored',
                    'You are back online',
                    'system'
                );
            }
        });

        window.addEventListener('offline', () => {
            if (this.features.notifications) {
                this.features.notifications.warning(
                    'Connection Lost',
                    'You are now offline. Some features may be limited.',
                    'system'
                );
            }
        });

        // Page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                // User returned to page - refresh notifications
                if (this.features.notifications) {
                    this.features.notifications.checkForNewNotifications?.();
                }
            }
        });
    }

    initializeUI() {
        // Add feature toggle buttons to dashboard
        this.addFeatureToggles();
        
        // Add quick access toolbar
        this.addQuickAccessToolbar();
        
        // Initialize dashboard widgets
        this.initializeDashboardWidgets();
        
        // Setup responsive behavior
        this.setupResponsiveBehavior();
    }

    addFeatureToggles() {
        const togglesHTML = `
            <div id="feature-toggles" class="feature-toggles">
                <button class="feature-toggle" data-feature="notifications" title="Toggle Notifications">
                    <i class="fas fa-bell"></i>
                </button>
                <button class="feature-toggle" data-feature="search" title="Global Search">
                    <i class="fas fa-search"></i>
                </button>
                <button class="feature-toggle" data-feature="export" title="Export Data">
                    <i class="fas fa-download"></i>
                </button>
                <button class="feature-toggle" data-feature="activity" title="Activity Log">
                    <i class="fas fa-history"></i>
                </button>
                <button class="feature-toggle" data-feature="help" title="Help & Support">
                    <i class="fas fa-question-circle"></i>
                </button>
            </div>
        `;

        // Add to header if it exists
        const header = document.querySelector('header') || document.querySelector('.header');
        if (header && !document.getElementById('feature-toggles')) {
            header.insertAdjacentHTML('beforeend', XSSProtection.sanitize(togglesHTML));
            this.setupFeatureToggleListeners();
        }
    }

    setupFeatureToggleListeners() {
        document.querySelectorAll('.feature-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                const feature = e.target.closest('.feature-toggle').dataset.feature;
                this.toggleFeature(feature);
            });
        });
    }

    toggleFeature(featureName) {
        switch (featureName) {
            case 'notifications':
                this.features.notifications?.togglePanel?.();
                break;
            case 'search':
                document.getElementById('global-search')?.focus();
                break;
            case 'export':
                this.features.export?.openModal?.();
                break;
            case 'activity':
                this.features.activityLog?.togglePanel?.();
                break;
            case 'help':
                this.features.helpSupport?.togglePanel?.();
                break;
        }
    }

    addQuickAccessToolbar() {
        const toolbarHTML = `
            <div id="quick-access-toolbar" class="quick-access-toolbar">
                <div class="toolbar-section">
                    <span class="toolbar-label">Quick Actions:</span>
                    <button class="toolbar-btn" onclick="dashboardFeatures.quickExport()">
                        <i class="fas fa-download"></i> Export
                    </button>
                    <button class="toolbar-btn" onclick="dashboardFeatures.quickSearch()">
                        <i class="fas fa-search"></i> Search
                    </button>
                </div>
                <div class="toolbar-section">
                    <button class="toolbar-btn" onclick="dashboardFeatures.toggleTheme()">
                        <i class="fas fa-moon"></i> Theme
                    </button>
                    <button class="toolbar-btn" onclick="dashboardFeatures.showHelp()">
                        <i class="fas fa-question"></i> Help
                    </button>
                </div>
            </div>
        `;

        // Add toolbar styles
        this.addToolbarStyles();
        
        // Add to dashboard if main content area exists
        const mainContent = document.querySelector('main') || document.querySelector('.main-content') || document.querySelector('.dashboard-content');
        if (mainContent && !document.getElementById('quick-access-toolbar')) {
            mainContent.insertAdjacentHTML('afterbegin', XSSProtection.sanitize(toolbarHTML));
        }
    }

    addToolbarStyles() {
        if (document.getElementById('toolbar-styles')) return;

        const styles = `
            <style id="toolbar-styles">
                .feature-toggles {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                }
                
                .feature-toggle {
                    background: none;
                    border: none;
                    color: var(--text-secondary, #64748b);
                    cursor: pointer;
                    padding: 8px;
                    border-radius: 6px;
                    transition: all 0.2s;
                    font-size: 16px;
                }
                
                .feature-toggle:hover {
                    background: var(--hover-bg, #f8fafc);
                    color: var(--accent-primary, #3b82f6);
                }
                
                .quick-access-toolbar {
                    background: var(--card-bg, white);
                    border: 1px solid var(--border-color, #e2e8f0);
                    border-radius: 8px;
                    padding: 12px 16px;
                    margin-bottom: 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 16px;
                }
                
                .toolbar-section {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                
                .toolbar-label {
                    font-size: 14px;
                    font-weight: 600;
                    color: var(--text-secondary, #64748b);
                }
                
                .toolbar-btn {
                    background: var(--bg-secondary, #f8fafc);
                    border: 1px solid var(--border-color, #e2e8f0);
                    color: var(--text-primary, #1e293b);
                    padding: 6px 12px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 13px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    transition: all 0.2s;
                }
                
                .toolbar-btn:hover {
                    background: var(--accent-primary, #3b82f6);
                    color: white;
                    border-color: var(--accent-primary, #3b82f6);
                }
                
                @media (max-width: 768px) {
                    .quick-access-toolbar {
                        flex-direction: column;
                        align-items: stretch;
                    }
                    
                    .toolbar-section {
                        justify-content: center;
                    }
                    
                    .feature-toggles {
                        justify-content: center;
                    }
                }
            </style>
        `;

        document.head.insertAdjacentHTML('beforeend', XSSProtection.sanitize(styles));
    }

    initializeDashboardWidgets() {
        // Add feature status widgets
        this.addFeatureStatusWidget();
        
        // Add quick stats widget
        this.addQuickStatsWidget();
    }

    addFeatureStatusWidget() {
        const widgetHTML = `
            <div class="dashboard-widget feature-status-widget">
                <div class="widget-header">
                    <h4>System Status</h4>
                    <i class="fas fa-cog widget-icon"></i>
                </div>
                <div class="widget-content">
                    <div class="status-item">
                        <span class="status-label">Notifications</span>
                        <span class="status-indicator active"></span>
                    </div>
                    <div class="status-item">
                        <span class="status-label">Search</span>
                        <span class="status-indicator active"></span>
                    </div>
                    <div class="status-item">
                        <span class="status-label">Export</span>
                        <span class="status-indicator active"></span>
                    </div>
                    <div class="status-item">
                        <span class="status-label">Activity Log</span>
                        <span class="status-indicator active"></span>
                    </div>
                </div>
            </div>
        `;

        this.addWidgetToSidebar(widgetHTML);
    }

    addQuickStatsWidget() {
        const widgetHTML = `
            <div class="dashboard-widget quick-stats-widget">
                <div class="widget-header">
                    <h4>Quick Stats</h4>
                    <i class="fas fa-chart-bar widget-icon"></i>
                </div>
                <div class="widget-content">
                    <div class="stat-row">
                        <span class="stat-label">Today's Activities</span>
                        <span id="today-activities-count" class="stat-value">0</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Unread Notifications</span>
                        <span id="unread-notifications-count" class="stat-value">0</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Theme</span>
                        <span id="current-theme" class="stat-value">Light</span>
                    </div>
                </div>
            </div>
        `;

        this.addWidgetToSidebar(widgetHTML);
        this.updateQuickStats();
    }

    addWidgetToSidebar(widgetHTML) {
        const sidebar = document.querySelector('.sidebar') || document.querySelector('.side-panel');
        if (sidebar) {
            sidebar.insertAdjacentHTML('beforeend', XSSProtection.sanitize(widgetHTML));
        }
    }

    updateQuickStats() {
        // Update stats every 30 seconds
        setInterval(() => {
            if (this.features.activityLog) {
                const todayCount = this.features.activityLog.getTodayActivitiesCount?.() || 0;
                const todayElement = document.getElementById('today-activities-count');
                if (todayElement) todayElement.textContent = todayCount;
            }

            if (this.features.notifications) {
                const unreadCount = this.features.notifications.unreadCount || 0;
                const unreadElement = document.getElementById('unread-notifications-count');
                if (unreadElement) unreadElement.textContent = unreadCount;
            }

            if (this.features.darkMode) {
                const currentTheme = this.features.darkMode.getCurrentTheme?.() || 'light';
                const themeElement = document.getElementById('current-theme');
                if (themeElement) themeElement.textContent = currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1);
            }
        }, 30000);
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K for search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                document.getElementById('global-search')?.focus();
            }
            
            // Ctrl/Cmd + Shift + N for notifications
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'N') {
                e.preventDefault();
                this.features.notifications?.togglePanel?.();
            }
            
            // Ctrl/Cmd + Shift + E for export
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
                e.preventDefault();
                this.features.export?.openModal?.();
            }
            
            // Ctrl/Cmd + Shift + H for help
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'H') {
                e.preventDefault();
                this.features.helpSupport?.togglePanel?.();
            }
            
            // Ctrl/Cmd + Shift + A for activity log
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
                e.preventDefault();
                this.features.activityLog?.togglePanel?.();
            }
        });
    }

    setupResponsiveBehavior() {
        // Handle mobile/tablet layouts
        const handleResize = () => {
            const isMobile = window.innerWidth < 768;
            
            // Adjust feature panels for mobile
            if (isMobile) {
                this.adjustForMobile();
            } else {
                this.adjustForDesktop();
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // Initial call
    }

    adjustForMobile() {
        // Hide quick access toolbar on mobile
        const toolbar = document.getElementById('quick-access-toolbar');
        if (toolbar) {
            toolbar.style.display = 'none';
        }
        
        // Adjust panel sizes for mobile
        document.documentElement.style.setProperty('--panel-width', '100%');
    }

    adjustForDesktop() {
        // Show quick access toolbar on desktop
        const toolbar = document.getElementById('quick-access-toolbar');
        if (toolbar) {
            toolbar.style.display = 'flex';
        }
        
        // Reset panel sizes for desktop
        document.documentElement.style.setProperty('--panel-width', '400px');
    }

    addContextualHelp() {
        // Add help triggers to important elements
        const helpTriggers = [
            { selector: '.orders-section', topic: 'orders' },
            { selector: '.payments-section', topic: 'payments' },
            { selector: '.inventory-section', topic: 'inventory' },
            { selector: '.analytics-section', topic: 'analytics' }
        ];

        helpTriggers.forEach(trigger => {
            const element = document.querySelector(trigger.selector);
            if (element && !element.querySelector('.contextual-help')) {
                const helpButton = document.createElement('button');
                helpButton.className = 'contextual-help';
                helpButton.innerHTML =XSSProtection.sanitize( XSSProtection.sanitize(<i class="fas fa-question-circle"></i>';
                helpButton.title = `Get help with ${trigger.topic}`);
                helpButton.onclick = () => {
                    this.features.helpSupport?.openDocs?.();
                    document.dispatchEvent(new CustomEvent('helpOpened', {
                        detail: { section: trigger.topic }
                    }));
                };
                
                element.style.position = 'relative';
                element.appendChild(helpButton);
            }
        });
    }

    updateNotificationTheme(theme) {
        // Update notification colors based on theme
        const notifications = document.querySelectorAll('.toast, .notification-panel');
        notifications.forEach(notification => {
            notification.setAttribute('data-theme', theme);
        });
    }

    updateSearchTheme(theme) {
        // Update search colors based on theme
        const searchElements = document.querySelectorAll('.search-container, .search-suggestions');
        searchElements.forEach(element => {
            element.setAttribute('data-theme', theme);
        });
    }

    updateActivityLogTheme(theme) {
        // Update activity log colors based on theme
        const activityElements = document.querySelectorAll('.activity-panel');
        activityElements.forEach(element => {
            element.setAttribute('data-theme', theme);
        });
    }

    updateHelpSupportTheme(theme) {
        // Update help system colors based on theme
        const helpElements = document.querySelectorAll('.help-panel');
        helpElements.forEach(element => {
            element.setAttribute('data-theme', theme);
        });
    }

    showWelcomeNotification() {
        if (this.features.notifications) {
            setTimeout(() => {
                this.features.notifications.success(
                    'Welcome to Stokika!',
                    'All dashboard features are now active. Press Ctrl+Shift+H for help.',
                    'system'
                );
            }, 1000);
        }
    }

    // Public API methods
    quickExport() {
        this.features.export?.openModal?.();
    }

    quickSearch() {
        const searchInput = document.getElementById('global-search');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }

    toggleTheme() {
        this.features.darkMode?.toggleTheme?.();
    }

    showHelp() {
        this.features.helpSupport?.togglePanel?.();
    }

    getFeatureStatus() {
        return {
            notifications: !!this.features.notifications,
            darkMode: !!this.features.darkMode,
            search: !!this.features.search,
            export: !!this.features.export,
            activityLog: !!this.features.activityLog,
            helpSupport: !!this.features.helpSupport
        };
    }

    // Utility methods
    showFeatureNotification(featureName, message) {
        if (this.features.notifications) {
            this.features.notifications.info(featureName, message, 'system');
        }
    }

    logFeatureActivity(featureName, action, description) {
        if (this.features.activityLog) {
            this.features.activityLog.log('view', `${featureName} ${action}`, description);
        }
    }
}

// Initialize dashboard features integration
const dashboardFeatures = new DashboardFeaturesIntegration();

// Make it globally available
window.dashboardFeatures = dashboardFeatures;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DashboardFeaturesIntegration;
}

// Add global styles for widgets
document.head.insertAdjacentHTML('beforeend', XSSProtection.sanitize(`
    <style>
        .dashboard-widget {
            background: var(--card-bg, white);
            border: 1px solid var(--border-color, #e2e8f0);
            border-radius: 8px;
            margin-bottom: 16px;
            overflow: hidden;
        }
        
        .widget-header {
            padding: 12px 16px;
            background: var(--bg-secondary, #f8fafc);
            border-bottom: 1px solid var(--border-color, #e2e8f0);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .widget-header h4 {
            margin: 0;
            font-size: 14px;
            font-weight: 600;
            color: var(--text-primary, #1e293b);
        }
        
        .widget-icon {
            color: var(--text-secondary, #64748b);
        }
        
        .widget-content {
            padding: 16px;
        }
        
        .status-item, .stat-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }
        
        .status-item:last-child, .stat-row:last-child {
            margin-bottom: 0;
        }
        
        .status-label, .stat-label {
            font-size: 13px;
            color: var(--text-secondary, #64748b);
        }
        
        .status-indicator {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--text-tertiary, #94a3b8);
        }
        
        .status-indicator.active {
            background: var(--accent-secondary, #10b981);
        }
        
        .stat-value {
            font-size: 13px;
            font-weight: 600;
            color: var(--accent-primary, #3b82f6);
        }
        
        .contextual-help {
            position: absolute;
            top: 8px;
            right: 8px;
            background: var(--accent-primary, #3b82f6);
            color: white;
            border: none;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0.7;
            transition: opacity 0.2s;
        }
        
        .contextual-help:hover {
            opacity: 1;
        }
    </style>
`);
