// Configuration for cPanel Deployment
window.CONFIG = {
    // Supabase Configuration (Replace with your actual values)
    SUPABASE_URL: 'https://eidsqrnwfndruuufyacc.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpZHNxcm53Zm5kcnV1dWZ5YWNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3MzcxMTEsImV4cCI6MjEwMzMxMzExMX0.FTeFHJwnw1iT4AIknJUSNWyM221x4U-VkfTCdCsKOEY',
    
    // Domain Configuration
    DOMAIN: 'https://www.stokika.com',
    
    // Email Configuration
    SMTP_CONFIG: {
        HOST: 'smtp.gmail.com',
        PORT: 587,
        USER: 'your-email@gmail.com'
    },
    
    // Security Settings
    SECURITY: {
        SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
        MAX_LOGIN_ATTEMPTS: 5,
        OTP_EXPIRY: 10 * 60 * 1000, // 10 minutes
        PASSWORD_MIN_LENGTH: 12
    },
    
    // Rate Limiting
    RATE_LIMITS: {
        LOGIN: { attempts: 5, window: 15 * 60 * 1000 }, // 5 attempts per 15 minutes
        OTP: { attempts: 3, window: 5 * 60 * 1000 },    // 3 attempts per 5 minutes
        GENERAL: { attempts: 100, window: 15 * 60 * 1000 } // 100 requests per 15 minutes
    },
    
    // File Upload Settings
    FILE_UPLOAD: {
        MAX_SIZE: 5 * 1024 * 1024, // 5MB
        ALLOWED_TYPES: ['image/jpeg', 'image/png', 'application/pdf', 'application/msword'],
        MAX_FILES: 5
    },
    
    // Environment
    ENVIRONMENT: 'production'
};

// Credential Setup Instructions
window.CREDENTIAL_SETUP = {
    SUPABASE: {
        url: 'https://supabase.com',
        steps: [
            '1. Create account at supabase.com',
            '2. Create new project',
            '3. Go to Settings > API',
            '4. Copy Project URL and anon public key',
            '5. Copy service_role key (keep secret)'
        ]
    },
    
    GMAIL_SMTP: {
        url: 'https://myaccount.google.com/security',
        steps: [
            '1. Enable 2-Step Verification',
            '2. Go to App passwords',
            '3. Generate new app password',
            '4. Use generated password in SMTP_PASS'
        ]
    },
    
    MPESA: {
        url: 'https://developer.safaricom.co.ke',
        steps: [
            '1. Create developer account',
            '2. Create new app',
            '3. Get Consumer Key and Secret',
            '4. Use shortcode 174379 for sandbox'
        ]
    }
};

// Security Key Generation (Run in browser console)
window.GENERATE_KEYS = {
    jwt_secret: () => {
        return Array.from(crypto.getRandomValues(new Uint8Array(32)), 
            b => b.toString(16).padStart(2, '0')).join('');
    },
    
    encryption_key: () => {
        return Array.from(crypto.getRandomValues(new Uint8Array(32)), 
            b => b.toString(16).padStart(2, '0')).join('');
    },
    
    session_secret: () => {
        return Array.from(crypto.getRandomValues(new Uint8Array(32)), 
            b => b.toString(16).padStart(2, '0')).join('');
    }
};