/**
 * Dashboard Initialization Module
 * Common initialization logic for all dashboard pages
 * ES6 Module - Use with type="module"
 */

import { initSupabase, getSupabaseClient } from './supabase-client.js';
import { showError, showLoading, hideLoading, handleAsyncError } from './utils.js';

/**
 * Dashboard initialization configuration
 * @typedef {Object} DashboardConfig
 * @property {string[]} allowedRoles - Array of roles allowed to access this dashboard
 * @property {boolean} requiresAuth - Whether authentication is required (default: true)
 * @property {Function} onAuthSuccess - Callback after successful auth check
 * @property {Function} onAuthFailure - Callback after auth failure
 * @property {string} redirectUrl - URL to redirect on auth failure (default: '/signin.html')
 */

/**
 * Initialize dashboard with authentication and common setup
 * @param {DashboardConfig} config - Dashboard configuration
 * @returns {Promise<Object>} Initialization result with user data
 */
export async function initDashboard(config = {}) {
  const {
    allowedRoles = [],
    requiresAuth = true,
    onAuthSuccess = null,
    onAuthFailure = null,
    redirectUrl = '/signin.html'
  } = config;

  try {
    // Initialize Supabase
    await initSupabase();

    // Check authentication if required
    if (requiresAuth) {
      const authResult = await checkAuthentication(allowedRoles, redirectUrl);
      
      if (!authResult.authenticated) {
        if (onAuthFailure) {
          await onAuthFailure(authResult);
        }
        return authResult;
      }

      if (onAuthSuccess) {
        await onAuthSuccess(authResult);
      }

      return authResult;
    }

    // No authentication required
    return {
      authenticated: false,
      user: null,
      role: null
    };

  } catch (error) {
    console.error('Dashboard initialization error:', error);
    showError('Failed to initialize dashboard. Please refresh the page.', 'dashboard-error');
    throw error;
  }
}

/**
 * Check user authentication and role permissions
 * @param {string[]} allowedRoles - Array of allowed roles
 * @param {string} redirectUrl - URL to redirect on failure
 * @returns {Promise<Object>} Authentication result
 */
export async function checkAuthentication(allowedRoles = [], redirectUrl = '/signin.html') {
  try {
    const supabase = getSupabaseClient();
    
    // Get current session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Session check error:', error);
      redirectToLogin(redirectUrl);
      return { authenticated: false, error: error.message };
    }

    if (!session) {
      console.warn('No active session found');
      redirectToLogin(redirectUrl);
      return { authenticated: false, error: 'No session' };
    }

    // Get user data
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('User fetch error:', userError);
      redirectToLogin(redirectUrl);
      return { authenticated: false, error: 'User not found' };
    }

    // Check role if specified
    if (allowedRoles.length > 0) {
      const userRole = user.user_metadata?.role || 'user';
      
      if (!allowedRoles.includes(userRole)) {
        console.warn(`Access denied. User role: ${userRole}, Allowed: ${allowedRoles.join(', ')}`);
        showError('You do not have permission to access this page.', 'dashboard-error');
        
        // Redirect after delay
        setTimeout(() => {
          window.location.href = '/index.html';
        }, 2000);
        
        return { 
          authenticated: true, 
          authorized: false, 
          user, 
          role: userRole,
          error: 'Access denied'
        };
      }
    }

    // Successfully authenticated and authorized
    const userRole = user.user_metadata?.role || 'user';
    console.log(`✅ User authenticated: ${user.email} (${userRole})`);
    
    return {
      authenticated: true,
      authorized: true,
      user,
      role: userRole,
      session
    };

  } catch (error) {
    console.error('Authentication check failed:', error);
    redirectToLogin(redirectUrl);
    return { authenticated: false, error: error.message };
  }
}

/**
 * Redirect to login page
 * @param {string} redirectUrl - Login page URL
 */
function redirectToLogin(redirectUrl = '/signin.html') {
  // Save current page for redirect after login
  const currentPage = window.location.pathname;
  sessionStorage.setItem('redirect_after_login', currentPage);
  
  // Redirect to login
  window.location.href = redirectUrl;
}

/**
 * Load user session data
 * @returns {Promise<Object|null>} User session data or null
 */
export async function loadUserSession() {
  try {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) return null;
    
    return {
      userId: session.user.id,
      email: session.user.email,
      role: session.user.user_metadata?.role || 'user',
      name: session.user.user_metadata?.name || session.user.email,
      metadata: session.user.user_metadata
    };
  } catch (error) {
    console.error('Failed to load user session:', error);
    return null;
  }
}

/**
 * Update user profile in UI
 * @param {Object} userData - User data object
 */
export function updateUserProfile(userData) {
  // Update user name display
  const nameElements = document.querySelectorAll('.user-name, #userName');
  nameElements.forEach(el => {
    el.textContent = userData.name || userData.email;
  });

  // Update user email display
  const emailElements = document.querySelectorAll('.user-email, #userEmail');
  emailElements.forEach(el => {
    el.textContent = userData.email;
  });

  // Update user role display
  const roleElements = document.querySelectorAll('.user-role, #userRole');
  roleElements.forEach(el => {
    el.textContent = userData.role;
  });

  // Update avatar if exists
  const avatarElements = document.querySelectorAll('.user-avatar');
  avatarElements.forEach(el => {
    if (userData.avatar_url) {
      el.src = userData.avatar_url;
    } else {
      // Set default avatar with user initials
      const initials = (userData.name || userData.email)
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
      
      el.textContent = initials;
    }
  });
}

/**
 * Setup logout functionality
 * @param {string} buttonSelector - Logout button selector
 * @param {string} redirectUrl - URL to redirect after logout
 */
export function setupLogout(buttonSelector = '#logoutBtn', redirectUrl = '/signin.html') {
  const logoutBtn = document.querySelector(buttonSelector);
  
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      
      try {
        const supabase = getSupabaseClient();
        const { error } = await supabase.auth.signOut();
        
        if (error) {
          console.error('Logout error:', error);
          showError('Failed to logout. Please try again.');
          return;
        }

        // Clear any stored data
        sessionStorage.clear();
        
        // Redirect to login
        window.location.href = redirectUrl;
        
      } catch (error) {
        console.error('Logout failed:', error);
        showError('Failed to logout. Please try again.');
      }
    });
  }
}

/**
 * Load dashboard data with loading state
 * @param {Function} dataLoader - Async function to load data
 * @param {string} containerId - Container element ID for loading state
 * @returns {Promise<any>} Loaded data
 */
export async function loadDashboardData(dataLoader, containerId) {
  showLoading(containerId, 'Loading dashboard data...');
  
  try {
    const data = await handleAsyncError(dataLoader, containerId);
    hideLoading(containerId);
    return data;
  } catch (error) {
    hideLoading(containerId);
    showError('Failed to load dashboard data.', containerId);
    return null;
  }
}

/**
 * Setup real-time subscriptions for dashboard updates
 * @param {string} table - Table name to subscribe to
 * @param {Function} callback - Callback function for updates
 * @returns {Object} Subscription object
 */
export function setupRealtimeSubscription(table, callback) {
  try {
    const supabase = getSupabaseClient();
    
    const subscription = supabase
      .channel(`${table}-changes`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: table 
        }, 
        (payload) => {
          console.log(`Real-time update on ${table}:`, payload);
          callback(payload);
        }
      )
      .subscribe();

    console.log(`✅ Subscribed to ${table} changes`);
    return subscription;
    
  } catch (error) {
    console.error(`Failed to setup subscription for ${table}:`, error);
    return null;
  }
}

/**
 * Unsubscribe from real-time updates
 * @param {Object} subscription - Subscription object to unsubscribe
 */
export function unsubscribe(subscription) {
  if (subscription) {
    try {
      const supabase = getSupabaseClient();
      supabase.removeChannel(subscription);
      console.log('✅ Unsubscribed from real-time updates');
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
    }
  }
}

/**
 * Common dashboard initialization pattern
 * Combines authentication, user profile, and logout setup
 * @param {DashboardConfig} config - Dashboard configuration
 * @returns {Promise<Object>} Initialization result
 */
export async function quickInit(config = {}) {
  const result = await initDashboard(config);
  
  if (result.authenticated && result.authorized) {
    const userData = await loadUserSession();
    if (userData) {
      updateUserProfile(userData);
    }
    setupLogout();
  }
  
  return result;
}
