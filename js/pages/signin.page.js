/**
 * Sign In Page Module
 * Handles authentication flow for signin.html
 * ES6 Module - Use with type="module"
 */

import { initSupabase, getSupabaseClient } from '../core/supabase-client.js';
import { InputSanitizer } from '../security/input-sanitizer.js';

// State management
let isSubmitting = false;

/**
 * Initialize the sign-in page
 * Sets up form handlers and event listeners
 */
async function initSignInPage() {
  try {
    // Initialize Supabase client
    await initSupabase();
    
    // Initialize input sanitizer for the login form
    InputSanitizer.initForm('#loginForm');
    
    // Setup form handlers
    setupFormHandlers();
    
    console.log('✅ Sign-in page initialized');
  } catch (error) {
    console.error('❌ Failed to initialize sign-in page:', error);
    showError('Failed to initialize. Please refresh the page.');
  }
}

/**
 * Setup form event handlers
 */
function setupFormHandlers() {
  const forgotPasswordLink = document.getElementById('forgotPasswordLink');
  
  // Note: Form submission is now handled by InputSanitizer
  // which will call handleValidatedLogin after sanitization
  
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', handleForgotPassword);
  }
}

/**
 * Handle login form submission after validation and sanitization
 * Called by InputSanitizer with sanitized data
 * @param {Object} sanitizedData - Sanitized form data
 */
async function handleValidatedLogin(sanitizedData) {
  if (isSubmitting) return;
  isSubmitting = true;

  const loginBtn = document.getElementById('loginBtn');
  
  setButtonLoading(loginBtn, true);
  clearMessages();

  try {
    // Extract sanitized values
    const role = sanitizedData.userRole;
    const email = sanitizedData.email;
    const password = sanitizedData.password;

    // Validate inputs (sanitizer already validated, but double-check)
    if (!email || !password) {
      throw new Error('Please fill in all fields');
    }

    // Perform login using SecureAuth
    if (!window.SecureAuth) {
      throw new Error('Authentication module not loaded');
    }

    const result = await window.SecureAuth.login(email, password);
    
    if (result.success) {
      showSuccess('Login successful! Redirecting...');
      
      // Redirect to appropriate dashboard based on role
      setTimeout(() => {
        const userRole = result.user.role || result.user.user_type || role;
        window.SecureAuth.redirectToDashboard(userRole);
      }, 1000);
    }

  } catch (error) {
    console.error('Login error:', error);
    showError(error.message || 'Login failed. Please try again.');
  } finally {
    setButtonLoading(loginBtn, false);
    isSubmitting = false;
  }
}

// Make function globally accessible for InputSanitizer
window.handleValidatedLogin = handleValidatedLogin;

/**
 * Handle login form submission (LEGACY - now handled by handleValidatedLogin)
 * @param {Event} e - Form submit event
 */
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
    // Validate inputs
    if (!email || !password) {
      throw new Error('Please fill in all fields');
    }

    // Perform login using SecureAuth
    if (!window.SecureAuth) {
      throw new Error('Authentication module not loaded');
    }

    const result = await window.SecureAuth.login(email, password);
    
    if (result.success) {
      showSuccess('Login successful! Redirecting...');
      
      // Redirect to appropriate dashboard based on role
      setTimeout(() => {
        const userRole = result.user.role || result.user.user_type || role;
        window.SecureAuth.redirectToDashboard(userRole);
      }, 1000);
    }

  } catch (error) {
    console.error('Login error:', error);
    showError(error.message || 'Login failed. Please try again.');
  } finally {
    setButtonLoading(loginBtn, false);
    isSubmitting = false;
  }
}

/**
 * Handle forgot password link click
 * @param {Event} e - Click event
 */
async function handleForgotPassword(e) {
  e.preventDefault();
  
  const email = prompt('Enter your email address:');
  if (!email) return;

  try {
    if (!window.SecureAuth) {
      throw new Error('Authentication module not loaded');
    }

    const result = await window.SecureAuth.requestPasswordReset(email);
    
    if (result.success) {
      showSuccess(result.message || 'Password reset link sent to your email');
    } else {
      showError(result.message || 'Failed to send reset link');
    }
  } catch (error) {
    console.error('Password reset error:', error);
    showError('Failed to send reset link. Please try again.');
  }
}

/**
 * Show error message to user
 * @param {string} message - Error message
 */
function showError(message) {
  const errorDiv = document.getElementById('errorMessage');
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    // Auto-hide after 8 seconds
    setTimeout(() => {
      errorDiv.style.display = 'none';
    }, 8000);
  }
}

/**
 * Show success message to user
 * @param {string} message - Success message
 */
function showSuccess(message) {
  const successDiv = document.getElementById('successMessage');
  if (successDiv) {
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      successDiv.style.display = 'none';
    }, 5000);
  }
}

/**
 * Clear all messages
 */
function clearMessages() {
  const errorDiv = document.getElementById('errorMessage');
  const successDiv = document.getElementById('successMessage');
  
  if (errorDiv) errorDiv.style.display = 'none';
  if (successDiv) successDiv.style.display = 'none';
}

/**
 * Set button loading state
 * @param {HTMLButtonElement} button - Button element
 * @param {boolean} loading - Loading state
 */
function setButtonLoading(button, loading) {
  if (!button) return;
  
  const text = button.querySelector('.btn-text');
  const loader = button.querySelector('.btn-loading');
  
  if (loading) {
    if (text) text.style.display = 'none';
    if (loader) loader.style.display = 'inline';
    button.disabled = true;
  } else {
    if (text) text.style.display = 'inline';
    if (loader) loader.style.display = 'none';
    button.disabled = false;
  }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSignInPage);
} else {
  // DOM already loaded
  initSignInPage();
}
