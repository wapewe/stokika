// Sign In Form Handler
let isSubmitting = false;

async function waitForConfig() {
    return new Promise((resolve) => {
        if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
            resolve();
        } else {
            window.addEventListener('supabase-config-loaded', resolve, { once: true });
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    setupForm();
});

function setupForm() {
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('forgotPasswordLink').addEventListener('click', handleForgotPassword);
}

async function handleLogin(e) {
    e.preventDefault();
    
    if (isSubmitting) return;
    isSubmitting = true;

    const role = document.getElementById('userRole').value;
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('loginBtn');
    
    setButtonLoading(loginBtn, true);
    clearMessages();

    try {
        if (!email || !password) {
            throw new Error('Please fill in all fields');
        }

        await waitForConfig();
        const result = await window.SecureAuth.login(email, password);
        
        if (result.success) {
            showSuccess('Login successful! Redirecting...');
            setTimeout(() => {
                window.SecureAuth.redirectToDashboard(result.user.role || result.user.user_type || role);
            }, 1000);
        }

    } catch (error) {
        // Handle rate limiting errors with special formatting
        if (error.message && error.message.includes('Too many login attempts')) {
            showError(error.message, 'warning');
            
            // Disable the form temporarily if rate limited
            const form = document.getElementById('loginForm');
            if (form) {
                form.style.opacity = '0.6';
                setTimeout(() => {
                    form.style.opacity = '1';
                }, 5000);
            }
        } else {
            showError(error.message || 'Login failed. Please try again.');
        }
    } finally {
        setButtonLoading(loginBtn, false);
        isSubmitting = false;
    }
}

async function handleForgotPassword(e) {
    e.preventDefault();
    
    const email = prompt('Enter your email address:');
    if (!email) return;

    try {
        const result = await window.SecureAuth.requestPasswordReset(email);
        if (result.success) {
            showSuccess(result.message);
        } else {
            showError(result.message);
        }
    } catch (error) {
        showError('Failed to send reset link');
    }
}

function showError(message, type = 'error') {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    // Add visual styling for rate limit warnings
    if (type === 'warning') {
        errorDiv.style.backgroundColor = '#ff9800';
        errorDiv.style.color = '#fff';
        errorDiv.style.fontWeight = '600';
        errorDiv.style.padding = '15px';
        errorDiv.style.borderRadius = '5px';
        setTimeout(() => {
            errorDiv.style.backgroundColor = '';
            errorDiv.style.color = '';
            errorDiv.style.fontWeight = '';
            errorDiv.style.padding = '';
            errorDiv.style.borderRadius = '';
        }, 15000);
        // Keep visible longer for rate limit messages
        setTimeout(() => errorDiv.style.display = 'none', 15000);
    } else {
        setTimeout(() => errorDiv.style.display = 'none', 8000);
    }
}

function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    setTimeout(() => successDiv.style.display = 'none', 5000);
}

function clearMessages() {
    document.getElementById('errorMessage').style.display = 'none';
    document.getElementById('successMessage').style.display = 'none';
}

function setButtonLoading(button, loading) {
    const text = button.querySelector('.btn-text');
    const loader = button.querySelector('.btn-loading');
    
    if (loading) {
        text.style.display = 'none';
        loader.style.display = 'inline';
        button.disabled = true;
    } else {
        text.style.display = 'inline';
        loader.style.display = 'none';
        button.disabled = false;
    }
}
