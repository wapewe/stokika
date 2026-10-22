// Secure Authentication System using Supabase Auth
// No fake OTP - uses Supabase's built-in authentication

class SecureAuth {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
        this.init();
    }

    async init() {
        try {
            // Wait for config to load
            await this.waitForConfig();
            
            // Initialize Supabase client
            if (window.supabase && window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
                this.supabase = window.supabase.createClient(
                    window.SUPABASE_URL,
                    window.SUPABASE_ANON_KEY
                );
                console.log('✅ SecureAuth: Supabase initialized');
            } else {
                console.error('❌ SecureAuth: Supabase not available');
                return;
            }
            
            // Check existing session
            await this.checkSession();
            
            // Setup session monitoring
            this.setupSessionMonitoring();
        } catch (error) {
            console.error('❌ SecureAuth initialization failed:', error);
        }
    }

    async waitForConfig() {
        let attempts = 0;
        while ((!window.SUPABASE_URL || !window.supabase) && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.SUPABASE_URL || !window.supabase) {
            console.warn('⚠️ SecureAuth: Timed out waiting for config');
        }
    }

    // Strong password validation
    validatePassword(password) {
        const minLength = 12;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[@$!%*?&]/.test(password);
        const noRepeatedChars = !/(.)\1{2,}/.test(password);

        const errors = [];
        if (password.length < minLength) errors.push(`At least ${minLength} characters`);
        if (!hasUpperCase) errors.push('One uppercase letter');
        if (!hasLowerCase) errors.push('One lowercase letter');
        if (!hasNumbers) errors.push('One number');
        if (!hasSpecialChar) errors.push('One special character (@$!%*?&)');
        if (!noRepeatedChars) errors.push('No repeated characters');

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Sanitize input
    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        return input
            .trim()
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .substring(0, 255);
    }

    // Login with Supabase Auth
    async login(email, password) {
        try {
            email = this.sanitizeInput(email).toLowerCase();
            
            if (!this.validateEmail(email)) {
                throw new Error('Invalid email format');
            }

            // Check server-side rate limiting BEFORE attempting authentication
            const rateLimitCheck = await this.checkServerRateLimit(email);
            if (!rateLimitCheck.allowed) {
                throw new Error(rateLimitCheck.message);
            }

            // Authenticate with Supabase
            const { data: authData, error: authError } = await this.supabase.auth.signInWithPassword({
                email,
                password
            });

            if (authError) {
                throw new Error('Invalid email or password');
            }

            // Get user details from users table
            const { data: userData, error: userError } = await this.supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .single();

            if (userError || !userData) {
                await this.supabase.auth.signOut();
                throw new Error('User account not found');
            }

            if (userData.status !== 'active' && userData.status !== 'approved') {
                await this.supabase.auth.signOut();
                throw new Error('Account is not active. Please contact support.');
            }

            // Store user data securely
            this.currentUser = userData;
            this.storeUserSession(userData);

            // Generate CSRF token
            window.CSRFProtection?.generateToken();

            // Log successful login
            await window.AuditLogger?.log('login', { email, role: userData.role });

            return {
                success: true,
                user: userData
            };

        } catch (error) {
            console.error('Login failed');
            throw error;
        }
    }

    // Store user session securely
    storeUserSession(user) {
        const sessionData = {
            userId: user.id,
            email: user.email,
            role: user.role || user.user_type,
            name: user.name,
            loginTime: Date.now()
        };

        // Store in localStorage (Supabase handles secure session tokens)
        localStorage.setItem('user_data', JSON.stringify(sessionData));
        localStorage.setItem('user_role', sessionData.role);
        localStorage.setItem('vendor_id', user.id);
        localStorage.setItem('vendor_name', user.name);
    }

    // Check current session
    async checkSession() {
        try {
            const { data: { session }, error } = await this.supabase.auth.getSession();
            
            if (error || !session) {
                this.clearSession();
                return null;
            }

            // Verify user still exists and is active
            const { data: userData, error: userError } = await this.supabase
                .from('users')
                .select('*')
                .eq('email', session.user.email)
                .single();

            if (userError || !userData || (userData.status !== 'active' && userData.status !== 'approved')) {
                await this.logout();
                return null;
            }

            this.currentUser = userData;
            this.storeUserSession(userData);
            return userData;

        } catch (error) {
            console.error('Session check failed');
            this.clearSession();
            return null;
        }
    }

    // Logout
    async logout() {
        try {
            await window.AuditLogger?.log('logout', { userId: this.currentUser?.id });
            await this.supabase.auth.signOut();
        } catch (error) {
            console.error('Logout error');
        }
        
        this.clearSession();
        window.location.href = '/signin';
    }

    clearSession() {
        this.currentUser = null;
        localStorage.removeItem('user_data');
        localStorage.removeItem('user_role');
        localStorage.removeItem('vendor_id');
        localStorage.removeItem('vendor_name');
        sessionStorage.clear();
    }

    // Password reset using Supabase
    async requestPasswordReset(email) {
        try {
            email = this.sanitizeInput(email).toLowerCase();
            
            if (!this.validateEmail(email)) {
                throw new Error('Invalid email format');
            }

            const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`
            });

            if (error) throw error;

            return { success: true, message: 'Password reset link sent to your email' };

        } catch (error) {
            console.error('Password reset failed');
            return { success: false, message: 'Failed to send reset link' };
        }
    }

    // Update password
    async updatePassword(newPassword) {
        try {
            const validation = this.validatePassword(newPassword);
            if (!validation.isValid) {
                throw new Error('Password requirements: ' + validation.errors.join(', '));
            }

            const { error } = await this.supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            return { success: true, message: 'Password updated successfully' };

        } catch (error) {
            console.error('Password update failed');
            throw error;
        }
    }

    // Server-side rate limiting check
    async checkServerRateLimit(email) {
        try {
            const response = await fetch('/api/auth/login.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (response.status === 429) {
                // Rate limit exceeded
                const retryMinutes = data.retry_minutes || Math.ceil((data.retry_after || 900) / 60);
                return {
                    allowed: false,
                    message: `Too many login attempts. Please try again in ${retryMinutes} minutes.`,
                    retryAfter: data.retry_after,
                    retryMinutes: retryMinutes
                };
            }

            if (!response.ok) {
                console.error('Rate limit check failed:', data);
                // If rate limit endpoint fails, allow login but log error
                return {
                    allowed: true,
                    message: 'Rate limit check unavailable'
                };
            }

            return {
                allowed: true,
                message: 'Rate limit check passed'
            };

        } catch (error) {
            console.error('Rate limit check error:', error);
            // If network error, allow login (fail open for availability)
            return {
                allowed: true,
                message: 'Rate limit check unavailable'
            };
        }
    }

    // Rate limiting (deprecated - kept for backward compatibility)
    checkRateLimit(action, identifier) {
        const key = `rate_${action}_${identifier}`;
        const data = JSON.parse(localStorage.getItem(key) || '{"count":0,"timestamp":0}');
        const now = Date.now();
        const windowMs = 15 * 60 * 1000; // 15 minutes

        if (now - data.timestamp > windowMs) {
            data.count = 0;
            data.timestamp = now;
        }

        if (data.count >= 5) {
            return false;
        }

        data.count++;
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    }

    recordFailedAttempt(action, identifier) {
        // Already handled in checkRateLimit
    }

    clearFailedAttempts(action, identifier) {
        const key = `rate_${action}_${identifier}`;
        localStorage.removeItem(key);
    }

    // Session monitoring
    setupSessionMonitoring() {
        let lastActivity = Date.now();

        const updateActivity = () => {
            lastActivity = Date.now();
        };

        ['click', 'keypress', 'scroll', 'mousemove'].forEach(event => {
            document.addEventListener(event, updateActivity, { passive: true });
        });

        setInterval(async () => {
            const inactive = Date.now() - lastActivity;
            
            if (inactive > this.sessionTimeout) {
                await this.logout();
            }
        }, 60000); // Check every minute
    }

    // Validation helpers
    validateEmail(email) {
        return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email) && email.length <= 254;
    }

    // Redirect to dashboard
    redirectToDashboard(role) {
        // Block admin login from signin.html - admins must use rembrandts-donji.html
        if (role === 'admin') {
            console.warn('❌ Admin login blocked from signin page');
            if (window.showToast) {
                window.showToast('Admin users must sign in from the admin portal', 'error');
            } else {
                alert('Admin users must sign in from the admin portal');
            }
            setTimeout(() => {
                window.location.href = 'rembrandts-donji.html';
            }, 2000);
            return;
        }

        const dashboards = {
            field_agent: 'agent-dashboard.html',
            supervisor: 'supervisor-dashboard.html',
            vendor: 'vendor-dashboard.html',
            supplier: 'supplier.html',
            delivery_partner: 'delivery-partner-dashboard.html'
        };
        
        const dashboard = dashboards[role];
        
        if (!dashboard) {
            console.error(`Unknown role: ${role}, redirecting to home`);
            window.location.href = 'dalana.html';
            return;
        }
        
        console.log(`✅ Redirecting ${role} to ${dashboard}`);
        window.location.href = dashboard;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isAuthenticated() {
        return this.currentUser !== null;
    }
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    window.SecureAuth = new SecureAuth();
});
