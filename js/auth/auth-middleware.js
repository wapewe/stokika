// Authentication Middleware - SECURE VERSION
// Uses httpOnly cookies instead of localStorage
// Protects dashboard pages and manages user sessions

class AuthMiddleware {
    constructor() {
        this.supabase = null;
        this.secureSession = null;
        this.init();
    }

    async init() {
        // Wait for SecureSession to be available
        if (window.SecureSession) {
            this.secureSession = window.SecureSession;
            await this.secureSession.init();
        }

        if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
            this.supabase = window.supabase.createClient(
                window.SUPABASE_URL,
                window.SUPABASE_ANON_KEY
            );
        }
    }

    // Check if user is authenticated - SECURE METHOD
    async isAuthenticated() {
        try {
            // Use SecureSession if available (preferred)
            if (this.secureSession) {
                return this.secureSession.isAuthenticated();
            }

            // Fallback to Supabase check
            const { data: { session } } = await this.supabase.auth.getSession();
            return !!session;
        } catch (error) {
            console.error('Auth check error:', error);
            return false;
        }
    }

    // Get current user role - SECURE METHOD
    getUserRole() {
        // Use SecureSession (server-side validation)
        if (this.secureSession && this.secureSession.isAuthenticated()) {
            return this.secureSession.getUserRole();
        }

        // ⚠️ DEPRECATED: localStorage fallback (will be removed)
        console.warn('⚠️ Using deprecated localStorage for user_role. Please migrate to secure-session.js');
        return localStorage.getItem('user_role');
    }

    // Get current user ID - SECURE METHOD
    getUserId() {
        // Use SecureSession
        if (this.secureSession && this.secureSession.isAuthenticated()) {
            return this.secureSession.getUserId();
        }

        // ⚠️ DEPRECATED: localStorage fallback (will be removed)
        console.warn('⚠️ Using deprecated localStorage for vendor_id. Please migrate to secure-session.js');
        return localStorage.getItem('vendor_id');
    }

    // Get current user name - SECURE METHOD
    getUserName() {
        // Use SecureSession
        if (this.secureSession && this.secureSession.isAuthenticated()) {
            return this.secureSession.getUserData('name') || 'User';
        }

        // ⚠️ DEPRECATED: localStorage fallback (will be removed)
        return localStorage.getItem('vendor_name') || 'User';
    }

    // Protect page - redirect if not authenticated - SECURE METHOD
    async protectPage(allowedRoles = []) {
        // Ensure initialization
        await this.init();

        const isAuth = await this.isAuthenticated();
        
        if (!isAuth) {
            window.location.href = 'signin.html';
            return false;
        }

        const userRole = this.getUserRole();
        
        if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
            // Check if user role is valid
            if (!userRole) {
                console.error('No user role found - session may be invalid');
                window.location.href = 'signin.html';
                return false;
            }

            this.redirectToDashboard(userRole);
            return false;
        }

        return true;
    }

    // Redirect to appropriate dashboard based on role
    redirectToDashboard(role) {
        const dashboards = {
            'vendor': 'inventory.html',
            'supplier': 'supplier.html',
            'supervisor': 'supervisor.html',
            'field_agent': 'agent.html',
            'admin': 'rembrandts.html'
        };

        const dashboard = dashboards[role] || 'signin.html';
        window.location.href = dashboard;
    }

    // Logout user - SECURE METHOD
    async logout() {
        try {
            // Clear server-side session first
            if (this.secureSession) {
                await this.secureSession.destroy();
            }

            // Then sign out from Supabase
            if (this.supabase) {
                await this.supabase.auth.signOut();
            }

            // Clear any remaining localStorage (legacy cleanup)
            const keysToRemove = [
                'vendor_id',
                'vendor_name',
                'user_role',
                'user_id',
                'user_email',
                'session_token',
                'user_data'
            ];

            keysToRemove.forEach(key => localStorage.removeItem(key));

            window.location.href = 'signin.html';
        } catch (error) {
            console.error('Logout error:', error);
            // Force redirect even if error
            window.location.href = 'signin.html';
        }
    }

    // Setup logout buttons
    setupLogoutButtons() {
        const logoutButtons = document.querySelectorAll('[data-logout], .logout-btn, #logoutBtn');
        logoutButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        });
    }

    // Get CSRF token for forms
    getCsrfToken() {
        if (this.secureSession && this.secureSession.isAuthenticated()) {
            return this.secureSession.getCsrfToken();
        }
        return null;
    }
}

// Export singleton instance
const authMiddleware = new AuthMiddleware();

// Auto-protect pages with data-protected attribute
document.addEventListener('DOMContentLoaded', async () => {
    const protectedPage = document.querySelector('[data-protected]');
    
    if (protectedPage) {
        const allowedRoles = protectedPage.getAttribute('data-allowed-roles');
        const roles = allowedRoles ? allowedRoles.split(',') : [];
        await authMiddleware.protectPage(roles);
    }

    // Setup logout buttons
    authMiddleware.setupLogoutButtons();
});
