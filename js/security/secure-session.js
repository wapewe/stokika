/**
 * Secure Session Management - Client Side
 * Uses httpOnly cookies instead of localStorage for security
 * Works with api/session.php backend
 */

class SecureSession {
    constructor() {
        this.baseURL = window.location.origin;
        this.sessionData = null;
        this.csrfToken = null;
        this.isInitialized = false;
    }

    /**
     * Initialize session (check if user is logged in)
     */
    async init() {
        if (this.isInitialized) {
            return this.sessionData !== null;
        }

        try {
            const response = await fetch(`${this.baseURL}/api/session.php?action=validate`, {
                method: 'GET',
                credentials: 'include', // Important: include cookies
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                
                if (data.valid) {
                    this.sessionData = {
                        userId: data.userId,
                        userRole: data.userRole,
                        userData: data.userData
                    };
                    this.csrfToken = data.csrfToken;
                    this.isInitialized = true;
                    return true;
                }
            }

            this.isInitialized = true;
            return false;
        } catch (error) {
            console.error('Session validation failed:', error);
            this.isInitialized = true;
            return false;
        }
    }

    /**
     * Create session after successful login (call from backend after auth)
     */
    async createSession(userId, userRole, userData = {}) {
        try {
            const response = await fetch(`${this.baseURL}/api/session.php?action=create`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId,
                    userRole,
                    userData
                })
            });

            if (!response.ok) {
                throw new Error('Failed to create session');
            }

            const data = await response.json();
            
            this.sessionData = { userId, userRole, userData };
            this.csrfToken = data.csrfToken;
            this.isInitialized = true;

            return { success: true, csrfToken: data.csrfToken };
        } catch (error) {
            console.error('Session creation failed:', error);
            throw error;
        }
    }

    /**
     * Destroy session (logout)
     */
    async destroy() {
        try {
            await fetch(`${this.baseURL}/api/session.php`, {
                method: 'DELETE',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            this.sessionData = null;
            this.csrfToken = null;
            this.isInitialized = false;

            return { success: true };
        } catch (error) {
            console.error('Session destruction failed:', error);
            throw error;
        }
    }

    /**
     * Get user ID
     */
    getUserId() {
        return this.sessionData?.userId || null;
    }

    /**
     * Get user role
     */
    getUserRole() {
        return this.sessionData?.userRole || null;
    }

    /**
     * Get user data
     */
    getUserData(key = null) {
        if (!this.sessionData?.userData) {
            return null;
        }

        if (key) {
            return this.sessionData.userData[key] || null;
        }

        return this.sessionData.userData;
    }

    /**
     * Get CSRF token for form submissions
     */
    getCsrfToken() {
        return this.csrfToken;
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return this.sessionData !== null;
    }

    /**
     * Check if user has specific role
     */
    hasRole(role) {
        if (!this.sessionData) {
            return false;
        }

        // Admin has access to everything
        if (this.sessionData.userRole === 'admin') {
            return true;
        }

        return this.sessionData.userRole === role;
    }

    /**
     * Check if user has any of the specified roles
     */
    hasAnyRole(roles) {
        if (!this.sessionData) {
            return false;
        }

        if (this.sessionData.userRole === 'admin') {
            return true;
        }

        return roles.includes(this.sessionData.userRole);
    }

    /**
     * Update session data
     */
    async updateData(key, value) {
        try {
            const response = await fetch(`${this.baseURL}/api/session.php?action=update`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': this.csrfToken
                },
                body: JSON.stringify({ key, value })
            });

            if (!response.ok) {
                throw new Error('Failed to update session data');
            }

            // Update local cache
            if (!this.sessionData.userData) {
                this.sessionData.userData = {};
            }
            this.sessionData.userData[key] = value;

            return { success: true };
        } catch (error) {
            console.error('Session data update failed:', error);
            throw error;
        }
    }

    /**
     * Verify CSRF token (for double-checking before sensitive operations)
     */
    async verifyCsrfToken(token) {
        try {
            const response = await fetch(`${this.baseURL}/api/session.php?action=verify-csrf`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ csrfToken: token })
            });

            if (!response.ok) {
                return false;
            }

            const data = await response.json();
            
            if (data.valid && data.newToken) {
                // Update with rotated token
                this.csrfToken = data.newToken;
            }

            return data.valid;
        } catch (error) {
            console.error('CSRF verification failed:', error);
            return false;
        }
    }

    /**
     * Require authentication - redirect to login if not authenticated
     */
    async requireAuth(redirectUrl = '/signin.html') {
        const isAuth = await this.init();
        
        if (!isAuth) {
            window.location.href = redirectUrl;
            return false;
        }

        return true;
    }

    /**
     * Require specific role - redirect if user doesn't have it
     */
    async requireRole(role, redirectUrl = '/signin.html') {
        const isAuth = await this.requireAuth(redirectUrl);
        
        if (!isAuth) {
            return false;
        }

        if (!this.hasRole(role)) {
            alert(`Access denied. This page requires ${role} role.`);
            window.location.href = '/dashboard.html';
            return false;
        }

        return true;
    }

    /**
     * Require any of specified roles
     */
    async requireAnyRole(roles, redirectUrl = '/signin.html') {
        const isAuth = await this.requireAuth(redirectUrl);
        
        if (!isAuth) {
            return false;
        }

        if (!this.hasAnyRole(roles)) {
            alert(`Access denied. Insufficient permissions.`);
            window.location.href = '/dashboard.html';
            return false;
        }

        return true;
    }
}

// Export as singleton
window.SecureSession = new SecureSession();

// Helper function for legacy code migration
function migrateFromLocalStorage() {
    console.warn('⚠️ MIGRATION: Moving from localStorage to secure httpOnly cookies');
    console.warn('⚠️ Please ensure users re-authenticate after this update');
    
    // DISABLED: Don't clear localStorage for now - admin login needs it
    // Clear old localStorage data
    /*
    const keysToRemove = [
        'session_token',
        'user_data',
        'user_role',
        'user_id',
        'user_email',
        'vendor_id',
        'vendor_name'
    ];
    
    keysToRemove.forEach(key => {
        if (localStorage.getItem(key)) {
            console.warn(`Removing insecure localStorage item: ${key}`);
            localStorage.removeItem(key);
        }
    });
    */
}

// DISABLED: Don't run migration automatically
// Run migration on load
/*
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', migrateFromLocalStorage);
} else {
    migrateFromLocalStorage();
}
*/
