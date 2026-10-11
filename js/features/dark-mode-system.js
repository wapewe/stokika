// Dark Mode System
class DarkModeManager {
    constructor() {
        this.isDarkMode = false;
        this.init();
    }

    init() {
        this.loadPreference();
        this.createToggleButton();
        this.addDarkModeCSS();
        this.detectSystemPreference();
        this.applyTheme();
    }

    loadPreference() {
        const saved = localStorage.getItem('dark_mode');
        if (saved !== null) {
            this.isDarkMode = JSON.parse(saved);
        } else {
            // Check system preference
            this.isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
    }

    savePreference() {
        localStorage.setItem('dark_mode', JSON.stringify(this.isDarkMode));
    }

    detectSystemPreference() {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', (e) => {
            // Only auto-switch if user hasn't manually set preference
            if (localStorage.getItem('dark_mode') === null) {
                this.isDarkMode = e.matches;
                this.applyTheme();
                this.updateToggleButton();
            }
        });
    }

    createToggleButton() {
        // Only create toggle if header exists
        const header = document.querySelector('.header-nav') || document.querySelector('header');
        if (!header) return;

        const toggleHTML = `
            <button class="dark-mode-toggle" id="darkModeToggle" title="Toggle dark mode">
                <div class="toggle-track">
                    <div class="toggle-thumb">
                        <svg class="sun-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="5"/>
                            <line x1="12" y1="1" x2="12" y2="3"/>
                            <line x1="12" y1="21" x2="12" y2="23"/>
                            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                            <line x1="1" y1="12" x2="3" y2="12"/>
                            <line x1="21" y1="12" x2="23" y2="12"/>
                            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                        </svg>
                        <svg class="moon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                        </svg>
                    </div>
                </div>
            </button>
        `;

        header.insertAdjacentHTML('beforeend', toggleHTML);

        // Add event listener
        document.getElementById('darkModeToggle')?.addEventListener('click', () => {
            this.toggle();
        });
    }

    toggle() {
        this.isDarkMode = !this.isDarkMode;
        this.savePreference();
        this.applyTheme();
        this.updateToggleButton();
        
        // Trigger custom event for other components
        window.dispatchEvent(new CustomEvent('themeChanged', {
            detail: { isDarkMode: this.isDarkMode }
        }));
    }

    applyTheme() {
        const root = document.documentElement;
        
        if (this.isDarkMode) {
            root.classList.add('dark-mode');
        } else {
            root.classList.remove('dark-mode');
        }

        // Update meta theme-color for mobile browsers
        this.updateMetaThemeColor();
    }

    updateToggleButton() {
        const toggle = document.getElementById('darkModeToggle');
        if (toggle) {
            toggle.classList.toggle('dark', this.isDarkMode);
        }
    }

    updateMetaThemeColor() {
        let themeColorMeta = document.querySelector('meta[name="theme-color"]');
        if (!themeColorMeta) {
            themeColorMeta = document.createElement('meta');
            themeColorMeta.name = 'theme-color';
            document.head.appendChild(themeColorMeta);
        }
        
        themeColorMeta.content = this.isDarkMode ? '#1a1a1a' : '#ffffff';
    }

    addDarkModeCSS() {
        // Skip if already added
        if (document.getElementById('dark-mode-styles')) return;
        
        // Wait for head to exist
        if (!document.head) {
            setTimeout(() => this.addDarkModeCSS(), 50);
            return;
        }
        const style = document.createElement('style');
        style.id = 'dark-mode-styles';
        style.textContent = `
            /* Dark Mode Toggle Button */
            .dark-mode-toggle {
                background: none;
                border: none;
                cursor: pointer;
                padding: 4px;
                border-radius: 20px;
                transition: all 0.3s ease;
                position: relative;
                width: 60px;
                height: 30px;
            }

            .toggle-track {
                width: 100%;
                height: 100%;
                background: #e9ecef;
                border-radius: 15px;
                position: relative;
                transition: background 0.3s ease;
                border: 2px solid #dee2e6;
            }

            .dark-mode-toggle.dark .toggle-track {
                background: #495057;
                border-color: #6c757d;
            }

            .toggle-thumb {
                width: 22px;
                height: 22px;
                background: white;
                border-radius: 50%;
                position: absolute;
                top: 2px;
                left: 2px;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            }

            .dark-mode-toggle.dark .toggle-thumb {
                transform: translateX(30px);
                background: #212529;
            }

            .sun-icon, .moon-icon {
                width: 12px;
                height: 12px;
                position: absolute;
                transition: all 0.3s ease;
            }

            .sun-icon {
                color: #ffc107;
                opacity: 1;
            }

            .moon-icon {
                color: #6c757d;
                opacity: 0;
            }

            .dark-mode-toggle.dark .sun-icon {
                opacity: 0;
            }

            .dark-mode-toggle.dark .moon-icon {
                opacity: 1;
                color: #ffc107;
            }

            /* Base Dark Mode Styles */
            :root {
                --transition-theme: all 0.3s ease;
                
                /* Light Mode CSS Variables (default) */
                --bg-primary: #ffffff;
                --bg-secondary: #f8f9fa;
                --bg-tertiary: #e9ecef;
                --text-primary: #212529;
                --text-secondary: #6c757d;
                --text-muted: #adb5bd;
                --border-primary: #dee2e6;
                --border-secondary: #e9ecef;
                --card-bg: #ffffff;
                --input-bg: #ffffff;
                --input-border: #ced4da;
                --button-bg: #f8f9fa;
                --button-hover: #e9ecef;
                --success-bg: #d1e7dd;
                --success-text: #0f5132;
                --warning-bg: #fff3cd;
                --warning-text: #664d03;
                --error-bg: #f8d7da;
                --error-text: #721c24;
                --info-bg: #d1ecf1;
                --info-text: #055160;
                --shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                --shadow-lg: 0 8px 25px rgba(0, 0, 0, 0.15);
            }

            * {
                transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
            }

            /* Dark mode application */
            .dark-mode {
                color-scheme: dark;
                
                /* Dark Mode CSS Variables */
                --bg-primary: #1a1a1a;
                --bg-secondary: #2d2d2d;
                --bg-tertiary: #3a3a3a;
                --text-primary: #ffffff;
                --text-secondary: #b3b3b3;
                --text-muted: #888888;
                --border-primary: #404040;
                --border-secondary: #555555;
                --card-bg: #2d2d2d;
                --input-bg: #3a3a3a;
                --input-border: #555555;
                --button-bg: #404040;
                --button-hover: #4a4a4a;
                --success-bg: #1e4d2b;
                --success-text: #4ade80;
                --warning-bg: #4d3d1e;
                --warning-text: #fbbf24;
                --error-bg: #4d1e1e;
                --error-text: #f87171;
                --info-bg: #1e3a4d;
                --info-text: #60a5fa;
                --shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
                --shadow-lg: 0 10px 25px rgba(0, 0, 0, 0.4);
            }

            .dark-mode body {
                background: var(--bg-primary);
                color: var(--text-primary);
            }

            .dark-mode .header {
                background: var(--bg-secondary);
                border-bottom-color: var(--border-primary);
            }

            .dark-mode .card,
            .dark-mode .modal-content,
            .dark-mode .dropdown-menu {
                background: var(--card-bg);
                border-color: var(--border-primary);
                box-shadow: var(--shadow-lg);
            }

            .dark-mode input,
            .dark-mode select,
            .dark-mode textarea {
                background: var(--input-bg);
                border-color: var(--input-border);
                color: var(--text-primary);
            }

            .dark-mode input:focus,
            .dark-mode select:focus,
            .dark-mode textarea:focus {
                border-color: #007bff;
                box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
            }

            .dark-mode button:not(.btn-primary):not(.btn-success):not(.btn-danger):not(.btn-warning) {
                background: var(--button-bg);
                color: var(--text-primary);
                border-color: var(--border-primary);
            }

            .dark-mode button:not(.btn-primary):not(.btn-success):not(.btn-danger):not(.btn-warning):hover {
                background: var(--button-hover);
            }

            .dark-mode .table {
                color: var(--text-primary);
            }

            .dark-mode .table th,
            .dark-mode .table td {
                border-color: var(--border-primary);
            }

            .dark-mode .table-striped tbody tr:nth-of-type(odd) {
                background: var(--bg-secondary);
            }

            .dark-mode .navbar {
                background: var(--bg-secondary) !important;
            }

            .dark-mode .navbar-nav .nav-link {
                color: var(--text-primary) !important;
            }

            .dark-mode .sidebar {
                background: var(--bg-secondary);
                border-color: var(--border-primary);
            }

            .dark-mode .sidebar-item {
                color: var(--text-secondary);
            }

            .dark-mode .sidebar-item:hover,
            .dark-mode .sidebar-item.active {
                background: var(--bg-tertiary);
                color: var(--text-primary);
            }

            /* Status indicators */
            .dark-mode .alert-success {
                background: var(--success-bg);
                color: var(--success-text);
                border-color: var(--success-text);
            }

            .dark-mode .alert-warning {
                background: var(--warning-bg);
                color: var(--warning-text);
                border-color: var(--warning-text);
            }

            .dark-mode .alert-danger {
                background: var(--error-bg);
                color: var(--error-text);
                border-color: var(--error-text);
            }

            .dark-mode .alert-info {
                background: var(--info-bg);
                color: var(--info-text);
                border-color: var(--info-text);
            }

            /* Charts and graphs */
            .dark-mode .chart-container {
                background: var(--card-bg);
            }

            .dark-mode .chart-title {
                color: var(--text-primary);
            }

            .dark-mode .chart-legend {
                color: var(--text-secondary);
            }

            /* Notification styles */
            .dark-mode .notification-dropdown {
                background: var(--card-bg);
                border-color: var(--border-primary);
            }

            .dark-mode .notification-item {
                border-color: var(--border-secondary);
            }

            .dark-mode .notification-item:hover {
                background: var(--bg-tertiary);
            }

            .dark-mode .toast {
                background: var(--card-bg);
                color: var(--text-primary);
            }

            /* Search results */
            .dark-mode .search-results {
                background: var(--card-bg);
            }

            .dark-mode .result-item {
                background: var(--bg-secondary);
                border-color: var(--border-primary);
            }

            .dark-mode .result-item:hover {
                background: var(--bg-tertiary);
            }

            /* Export dropdown */
            .dark-mode .export-menu {
                background: var(--card-bg);
                border-color: var(--border-primary);
            }

            .dark-mode .export-menu button:hover {
                background: var(--bg-tertiary);
            }

            /* Scrollbars */
            .dark-mode ::-webkit-scrollbar {
                width: 8px;
                height: 8px;
            }

            .dark-mode ::-webkit-scrollbar-track {
                background: var(--bg-secondary);
            }

            .dark-mode ::-webkit-scrollbar-thumb {
                background: var(--border-primary);
                border-radius: 4px;
            }

            .dark-mode ::-webkit-scrollbar-thumb:hover {
                background: var(--text-muted);
            }

            /* Smooth transitions */
            .dark-mode * {
                transition: var(--transition-theme);
            }

            /* Print styles - force light mode */
            @media print {
                .dark-mode {
                    color-scheme: light;
                }
                
                .dark-mode body {
                    background: white !important;
                    color: black !important;
                }
                
                .dark-mode * {
                    background: white !important;
                    color: black !important;
                }
            }

            /* Accessibility - respect user's motion preferences */
            @media (prefers-reduced-motion: reduce) {
                .dark-mode *,
                .toggle-thumb,
                .sun-icon,
                .moon-icon {
                    transition: none !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Public methods for external use
    getCurrentTheme() {
        return this.isDarkMode ? 'dark' : 'light';
    }

    setTheme(theme) {
        this.isDarkMode = theme === 'dark';
        this.savePreference();
        this.applyTheme();
        this.updateToggleButton();
    }

    // Initialize theme on page load
    initializeTheme() {
        this.applyTheme();
        this.updateToggleButton();
    }
}

// Initialize dark mode manager when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.DarkModeManager = new DarkModeManager();
    });
} else {
    window.DarkModeManager = new DarkModeManager();
}

