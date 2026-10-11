// Secure Authentication for cPanel Deployment (Frontend-only with Supabase)
class CPanelSecureAuth {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
        this.init();
    }

    async init() {
        await this.loadConfig();
        this.initSupabase();
        this.setupSecurity();
        await this.checkSession();
    }

    async loadConfig() {
        if (window.CONFIG) {
            this.config = window.CONFIG;
        } else {
            // Fallback config
            this.config = {
                SUPABASE_URL: 'https://eidsqrnwfndruuufyacc.supabase.co',
                SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpZHNxcm53Zm5kcnV1dWZ5YWNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3MzcxMTEsImV4cCI6MjEwMzMxMzExMX0.FTeFHJwnw1iT4AIknJUSNWyM221x4U-VkfTCdCsKOEY'
            };
        }
    }

    initSupabase() {
        if (window.supabase && this.config.SUPABASE_URL && this.config.SUPABASE_ANON_KEY) {
            this.supabase = window.supabase.createClient(
                this.config.SUPABASE_URL,
                this.config.SUPABASE_ANON_KEY
            );
        }
    }

    setupSecurity() {
        // Input sanitization
        document.addEventListener('input', (e) => {
            if (e.target.type === 'text' || e.target.type === 'email') {
                e.target.value = this.sanitizeInput(e.target.value);
            }
        });

        // Session timeout
        this.setupSessionTimeout();
        
        // Security headers (client-side)
        this.addSecurityMeta();
    }

    sanitizeInput(input) {
        return input
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .trim()
            .substring(0, 255);
    }

    addSecurityMeta() {
        const meta = document.createElement('meta');
        meta.httpEquiv = 'Content-Security-Policy';
        meta.content = "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline';";
        document.head.appendChild(meta);
    }

    setupSessionTimeout() {
        let lastActivity = Date.now();
        
        ['click', 'keypress', 'scroll', 'mousemove'].forEach(event => {
            document.addEventListener(event, () => {
                lastActivity = Date.now();
            });
        });

        setInterval(() => {
            if (Date.now() - lastActivity > this.sessionTimeout) {
                this.logout();
            }
        }, 60000);
    }

    async login(email, password) {
        try {
            if (!this.validateInput(email, 'email') || !password) {
                throw new Error('Invalid email or password format');
            }

            // Check rate limiting
            if (!this.checkRateLimit('login')) {
                throw new Error('Too many login attempts. Please try again later.');
            }

            // Authenticate with Supabase
            const { data: authData, error: authError } = await this.supabase.auth.signInWithPassword({
                email: email.toLowerCase().trim(),
                password
            });

            if (authError) {
                this.recordFailedAttempt('login');
                throw new Error('Invalid credentials');
            }

            // Get user details
            const { data: user, error: userError } = await this.supabase
                .from('users')
                .select('*')
                .eq('email', email.toLowerCase().trim())
                .single();

            if (userError || !user || user.status !== 'active') {
                await this.supabase.auth.signOut();
                throw new Error('Account not found or inactive');
            }

            // Generate and send OTP
            const otp = await this.generateOTP(user.id, email);
            await this.sendOTPEmail(email, otp);

            // Store temporary login data
            sessionStorage.setItem('temp_login', JSON.stringify({
                userId: user.id,
                email: user.email,
                role: user.role,
                timestamp: Date.now()
            }));

            this.clearRateLimit('login');
            return { requiresOTP: true, email: user.email };

        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    async generateOTP(userId, email) {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        // Store OTP in database
        const { error } = await this.supabase
            .from('otp_verifications')
            .insert({
                user_id: userId,
                email,
                otp_code: otp,
                purpose: 'login',
                expires_at: expiresAt
            });

        if (error) throw new Error('Failed to generate OTP');
        return otp;
    }

    async sendOTPEmail(email, otp) {
        // For demo - in production, use email service
        console.log(`OTP for ${email}: ${otp}`);
        
        if (window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1')) {
            alert(`Demo OTP: ${otp}`);
        }
        
        // TODO: Implement actual email sending via Supabase Edge Functions
    }

    async verifyOTP(otp) {
        try {
            const tempLogin = JSON.parse(sessionStorage.getItem('temp_login') || '{}');
            
            if (!tempLogin.email || Date.now() - tempLogin.timestamp > 600000) {
                throw new Error('Login session expired');
            }

            if (!this.validateInput(otp, 'otp')) {
                throw new Error('Invalid OTP format');
            }

            // Verify OTP
            const { data: otpRecord, error } = await this.supabase
                .from('otp_verifications')
                .select('*')
                .eq('email', tempLogin.email)
                .eq('otp_code', otp)
                .eq('purpose', 'login')
                .eq('verified', false)
                .gt('expires_at', new Date().toISOString())
                .single();

            if (error || !otpRecord) {
                throw new Error('Invalid or expired OTP');
            }

            // Mark OTP as verified
            await this.supabase
                .from('otp_verifications')
                .update({ verified: true })
                .eq('id', otpRecord.id);

            // Create session
            const sessionData = {
                userId: tempLogin.userId,
                email: tempLogin.email,
                role: tempLogin.role,
                loginTime: Date.now()
            };

            localStorage.setItem('user_session', JSON.stringify(sessionData));
            sessionStorage.removeItem('temp_login');

            this.currentUser = sessionData;
            return { success: true, user: sessionData };

        } catch (error) {
            console.error('OTP verification error:', error);
            throw error;
        }
    }

    async createUser(userData) {
        try {
            if (!this.isAdmin()) {
                throw new Error('Admin access required');
            }

            const { email, name, role, password } = userData;

            // Validate inputs
            if (!this.validateInput(email, 'email') || !name || !role || !password) {
                throw new Error('All fields are required');
            }

            // Validate password policy
            if (!this.validatePasswordPolicy(password)) {
                throw new Error('Password does not meet security requirements');
            }

            // Create user in Supabase Auth
            const { data: authUser, error: authError } = await this.supabase.auth.admin.createUser({
                email,
                password,
                email_confirm: true
            });

            if (authError) {
                if (authError.message.includes('already registered')) {
                    throw new Error('Email already exists');
                }
                throw authError;
            }

            // Create user record
            const { data: user, error: userError } = await this.supabase
                .from('users')
                .insert({
                    id: authUser.user.id,
                    email,
                    name,
                    role,
                    user_type: role,
                    status: 'active'
                })
                .select()
                .single();

            if (userError) throw userError;

            return { success: true, user };

        } catch (error) {
            console.error('User creation error:', error);
            throw error;
        }
    }

    async checkSession() {
        try {
            const sessionData = JSON.parse(localStorage.getItem('user_session') || '{}');
            
            if (!sessionData.userId) return null;

            // Check if session expired
            if (Date.now() - sessionData.loginTime > this.sessionTimeout) {
                this.logout();
                return null;
            }

            // Verify with Supabase
            const { data: { user }, error } = await this.supabase.auth.getUser();
            
            if (error || !user) {
                this.logout();
                return null;
            }

            this.currentUser = sessionData;
            return sessionData;

        } catch (error) {
            console.error('Session check failed:', error);
            this.logout();
            return null;
        }
    }

    async logout() {
        try {
            await this.supabase.auth.signOut();
        } catch (error) {
            console.error('Logout error:', error);
        }
        
        localStorage.removeItem('user_session');
        sessionStorage.clear();
        this.currentUser = null;
        window.location.href = '/signin';
    }

    // Utility functions
    validateInput(input, type) {
        const validators = {
            email: (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
            otp: (val) => /^\d{6}$/.test(val),
            password: (val) => val && val.length >= 8
        };
        return validators[type] ? validators[type](input) : true;
    }

    validatePasswordPolicy(password) {
        return password.length >= 12 &&
               /[A-Z]/.test(password) &&
               /[a-z]/.test(password) &&
               /\d/.test(password) &&
               /[!@#$%^&*]/.test(password);
    }

    checkRateLimit(action) {
        const key = `rate_limit_${action}`;
        const attempts = JSON.parse(localStorage.getItem(key) || '{"count": 0, "timestamp": 0}');
        const now = Date.now();
        
        if (now - attempts.timestamp > 900000) { // 15 minutes
            attempts.count = 0;
            attempts.timestamp = now;
        }
        
        if (attempts.count >= 5) return false;
        
        attempts.count++;
        localStorage.setItem(key, JSON.stringify(attempts));
        return true;
    }

    recordFailedAttempt(action) {
        // Already handled in checkRateLimit
    }

    clearRateLimit(action) {
        localStorage.removeItem(`rate_limit_${action}`);
    }

    isAdmin() {
        return this.currentUser && this.currentUser.role === 'admin';
    }

    getCurrentUser() {
        return this.currentUser;
    }

    redirectToDashboard(role) {
        const dashboards = {
            admin: '/admin',
            field_agent: '/agent',
            supervisor: '/supervisor',
            vendor: '/inventory',
            supplier: '/supplier'
        };
        
        window.location.href = dashboards[role] || '/signin';
    }
}

// Initialize for cPanel deployment
window.addEventListener('DOMContentLoaded', () => {
    window.CPanelAuth = new CPanelSecureAuth();
});