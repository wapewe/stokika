let currentUser = null;
let userRole = null;

// Initialize the page
document.addEventListener('DOMContentLoaded', async () => {
    // Attach logout button handler
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Check if there's a token in URL for token-based onboarding
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
        await initializeTokenOnboarding(token);
    } else {
        await checkAuthStatus();
    }
});

async function initializeTokenOnboarding(token) {
    try {
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('user-info').style.display = 'none';
        
        tokenOnboardingUI = new TokenBasedOnboardingUI();
        const success = await tokenOnboardingUI.initialize(token);
        
        if (!success) {
            showAuthSection();
        }
    } catch (error) {
        console.error('Token onboarding error:', error);
        showError('Failed to load onboarding. Please check your link.');
    }
}

async function checkAuthStatus() {
    try {
        const { data: { user }, error } = await window.supabase.auth.getUser();
        
        if (error) {
            console.error('Auth error:', error);
            showAuthSection();
            return;
        }

        if (user) {
            currentUser = user;
            await loadUserProfile();
            showUserSection();
            await initializeOnboarding();
        } else {
            showAuthSection();
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
        showAuthSection();
    }
}

async function loadUserProfile() {
    try {
        // Get user details from users table
        const { data: userData, error: userError } = await window.supabase
            .from('users')
            .select('name, email, user_type, role')
            .eq('id', currentUser.id)
            .single();

        if (userError) {
            console.error('Error fetching user data:', userError);
            return;
        }

        if (userData) {
            userRole = userData.user_type;
            
            // Update UI with user info
            document.getElementById('user-name').textContent = userData.name || currentUser.email;
            document.getElementById('user-email').textContent = userData.email || currentUser.email;
            
            const roleBadge = document.getElementById('user-role-badge');
            if (userData.user_type) {
                roleBadge.textContent = userData.user_type.replace('_', ' ').toUpperCase();
                roleBadge.className = `user-badge ${userData.user_type}`;
            } else {
                roleBadge.textContent = 'USER';
                roleBadge.className = 'user-badge';
            }
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
    }
}

function showAuthSection() {
    document.getElementById('auth-section').style.display = 'block';
    document.getElementById('user-info').style.display = 'none';
    document.getElementById('onboarding-dashboard').innerHTML = XSSProtection.sanitize(`
        <div style="text-align: center; padding: 50px; color: #666;">
            <i class="fas fa-lock" style="font-size: 48px; margin-bottom: 20px; opacity: 0.5;"></i>
            <h3>Authentication Required</h3>
            <p>Please log in to access your onboarding dashboard.</p>
        </div>
    `);
}

function showUserSection() {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('user-info').style.display = 'block';
    
    // Attach logout button handler (in case it wasn't attached during initial load)
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn && !logoutBtn.hasAttribute('data-handler-attached')) {
        logoutBtn.addEventListener('click', handleLogout);
        logoutBtn.setAttribute('data-handler-attached', 'true');
    }
}

async function initializeOnboarding() {
    try {
        // Check if user has onboarding access (field agent or supervisor)
        if (!userRole || (userRole !== 'field_agent' && userRole !== 'supervisor')) {
            document.getElementById('onboarding-dashboard').innerHTML = XSSProtection.sanitize(`
                <div style="text-align: center; padding: 50px;">
                    <i class="fas fa-info-circle" style="font-size: 48px; margin-bottom: 20px; color: #3498db;"></i>
                    <h3>No Onboarding Required</h3>
                    <p>Your account type does not require onboarding. You can access the platform directly.</p>
                    <div style="margin-top: 20px;">
                        <a href="/admin" class="auth-btn login" style="margin-right: 10px;">
                            <i class="fas fa-tachometer-alt"></i> Admin Dashboard
                        </a>
                        <a href="/inventory" class="auth-btn login">
                            <i class="fas fa-store"></i> Vendor Dashboard
                        </a>
                    </div>
                </div>
            `);
            return;
        }

        // Check if user has completed account creation step
        const { data: steps } = await window.supabase
            .from('onboarding_steps')
            .select('step_name, status')
            .eq('entity_type', userRole)
            .eq('entity_id', await getUserEntityId())
            .order('step_number');

        const accountStep = steps?.find(step => step.step_name === 'Account Creation');
        
        if (!accountStep || accountStep.status !== 'completed') {
            document.getElementById('onboarding-dashboard').innerHTML = XSSProtection.sanitize(`
                <div style="text-align: center; padding: 50px;">
                    <i class="fas fa-clock" style="font-size: 48px; margin-bottom: 20px; color: #ffc107;"></i>
                    <h3>Account Creation Pending</h3>
                    <p>Your account is being created. You will receive an email confirmation once ready.</p>
                    <p>Please check your email and follow the confirmation link.</p>
                </div>
            `);
            return;
        }

        // Initialize the enhanced onboarding system
        if (window.onboardingUI) {
            await window.onboardingUI.initialize();
        } else {
            setTimeout(async () => {
                if (window.onboardingUI) {
                    await window.onboardingUI.initialize();
                } else {
                    showError('Failed to load onboarding system. Please refresh the page.');
                }
            }, 1000);
        }
    } catch (error) {
        console.error('Error initializing onboarding:', error);
        showError('Error loading onboarding dashboard: ' + error.message);
    }
}

async function getUserEntityId() {
    const table = userRole === 'field_agent' ? 'field_agents' : 'supervisors';
    const { data } = await window.supabase
        .from(table)
        .select('id')
        .eq('user_id', currentUser.id)
        .single();
    return data?.id;
}

async function handleLogout() {
    try {
        const { error } = await window.supabase.auth.signOut();
        if (error) {
            console.error('Logout error:', error);
            showError('Error logging out: ' + error.message);
        } else {
            window.location.href = '../dalana.html';
        }
    } catch (error) {
        console.error('Logout error:', error);
        showError('Error logging out: ' + error.message);
    }
}

function showError(message) {
    document.getElementById('onboarding-dashboard').innerHTML = XSSProtection.sanitize(`
        <div class="error-message">
            <i class="fas fa-exclamation-triangle"></i>
            <strong>Error:</strong> ${sanitize(message)}
        </div>
        <div style="text-align: center; margin-top: 20px;">
            <button id="refresh-btn" class="auth-btn login">
                <i class="fas fa-refresh"></i> Refresh Page
            </button>
        </div>
    `);
    
    // Attach refresh handler
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => location.reload());
    }
}

function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.innerHTML = XSSProtection.sanitize(`
        <i class="fas fa-check-circle"></i>
        <strong>Success:</strong> ${sanitize(message)}
    `;
    
    const dashboard = document.getElementById('onboarding-dashboard');
    dashboard.insertBefore(successDiv, dashboard.firstChild);
    
    setTimeout(() => successDiv.remove(), 5000);
}

// Listen for auth state changes
window.supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
        showAuthSection();
    } else if (event === 'SIGNED_IN' && session) {
        currentUser = session.user;
        checkAuthStatus();
    }
});
