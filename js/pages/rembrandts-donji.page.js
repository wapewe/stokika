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

document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('loginBtn');
    
    loginBtn.disabled = true;
    loginBtn.textContent = 'Logging in...';

    try {
        await waitForConfig();
        const client = initSupabase();
        if (!client) throw new Error('Supabase not initialized');

        const { data, error } = await client.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;

        // Check if user is admin from session metadata
        const userMetadata = data.user.user_metadata || {};
        const appMetadata = data.user.app_metadata || {};
        
        const isAdmin = 
            userMetadata.user_type === 'admin' || 
            userMetadata.role === 'admin' ||
            appMetadata.user_type === 'admin' ||
            appMetadata.role === 'admin';

        if (!isAdmin) {
            await client.auth.signOut();
            throw new Error('Access denied. Admin privileges required.');
        }

        localStorage.setItem('user_role', 'admin');
        localStorage.setItem('user_id', data.user.id);
        localStorage.setItem('user_email', data.user.email);
        
        window.location.href = '/rembrandts.html';
    } catch (error) {
        showError(error.message);
        loginBtn.disabled = false;
        loginBtn.textContent = 'Login';
    }
});

// Initialize input sanitization
if (window.InputSanitizer) {
    InputSanitizer.initForm('#adminLoginForm');
}
