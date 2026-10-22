function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

// Wait for config to load
async function waitForConfig() {
    return new Promise((resolve) => {
        if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
            resolve();
        } else {
            window.addEventListener('supabase-config-loaded', resolve, { once: true });
        }
    });
}

// Initialize on page load
console.log('🔵 rembrandts-donji.page.js loaded');

// Wait for everything to be ready
window.addEventListener('load', function() {
    console.log('🔵 Window loaded, initializing login form...');
    initLoginForm();
});

function initLoginForm() {
    const form = document.getElementById('adminLoginForm');
    if (!form) {
        console.error('❌ Login form not found!');
        return;
    }
    
    console.log('✅ Login form found');
    
    // Remove any existing listeners (just in case)
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    
    console.log('✅ Attaching submit event listener');
    newForm.addEventListener('submit', handleLogin, false);
    
    // Also prevent default submission
    newForm.onsubmit = function(e) {
        e.preventDefault();
        handleLogin(e);
        return false;
    };
    
    console.log('✅ Login form initialized successfully');
}

async function handleLogin(e) {
    e.preventDefault();
    console.log('🔵 Form submitted!');
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('loginBtn');
    
    console.log('Email:', email);
    console.log('Password length:', password.length);
    
    loginBtn.disabled = true;
    loginBtn.textContent = 'Logging in...';

    console.log('Starting login process...');

    try {
        await waitForConfig();
        console.log('Config loaded');
        
        const client = initSupabase();
        if (!client) throw new Error('Supabase not initialized');
        console.log('Supabase client initialized');

        console.log('Attempting sign in...');
        const { data, error } = await client.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            console.error('Sign in error:', error);
            throw new Error(error.message || 'Invalid email or password');
        }
        
        console.log('Sign in successful, checking admin privileges...');

        // TEMPORARY: Email whitelist while RLS policies are being fixed
        const ADMIN_EMAILS = ['krieta8@gmail.com', 'sponyomjaka@gmail.com'];
        if (ADMIN_EMAILS.includes(data.user.email)) {
            console.log('✅ LOGIN: Admin verified via whitelist -', data.user.email);
            localStorage.setItem('user_role', 'admin');
            localStorage.setItem('user_id', data.user.id);
            localStorage.setItem('user_email', data.user.email);
            localStorage.setItem('admin_whitelisted', 'true');
            localStorage.setItem('admin_email', data.user.email);
            
            console.log('Redirecting to admin dashboard...');
            window.location.href = '/rembrandts.html';
            return;
        }

        // Check if user is admin from database profile (primary method)
        const { data: profile, error: profileError } = await client
            .from('profiles')
            .select('role_id, user_roles!inner(role_name)')
            .eq('id', data.user.id)
            .single();

        if (profileError) {
            console.error('Profile check error:', profileError);
            console.log('Falling back to metadata check...');
            // Fallback to metadata check
            const userMetadata = data.user.user_metadata || {};
            const appMetadata = data.user.app_metadata || {};
            
            console.log('User metadata:', userMetadata);
            console.log('App metadata:', appMetadata);
            
            const isAdmin = 
                userMetadata.user_type === 'admin' || 
                userMetadata.role === 'admin' ||
                appMetadata.user_type === 'admin' ||
                appMetadata.role === 'admin';

            if (!isAdmin) {
                await client.auth.signOut();
                throw new Error('Access denied. Admin privileges required.');
            }
            console.log('Admin verified via metadata');
        } else {
            // Check role from database
            const roleName = profile?.user_roles?.role_name;
            console.log('Profile role:', roleName);
            
            if (roleName !== 'admin' && roleName !== 'super_admin') {
                await client.auth.signOut();
                throw new Error('Access denied. Admin privileges required.');
            }
            console.log('Admin verified via database profile');
        }

        console.log('Setting local storage and redirecting...');
        localStorage.setItem('user_role', 'admin');
        localStorage.setItem('user_id', data.user.id);
        localStorage.setItem('user_email', data.user.email);
        
        console.log('Redirecting to admin dashboard...');
        window.location.href = '/rembrandts.html';
    } catch (error) {
        console.error('❌ Login error:', error);
        showError(error.message);
        loginBtn.disabled = false;
        loginBtn.textContent = 'Login';
    }
}

// Note: InputSanitizer is initialized separately by the security framework
console.log('🔵 Login page script fully loaded');
