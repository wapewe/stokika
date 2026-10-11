/**
 * Reset Password Page Module
 * Handles password reset flow for reset-password.html
 * ES6 Module - Use with type="module"
 */

import { initSupabase, getSupabaseClient } from '../core/supabase-client.js';
import { InputSanitizer } from '../security/input-sanitizer.js';

// State management
let isSubmitting = false;

/**
 * Initialize the reset password page
 * Sets up form handlers and event listeners
 */
async function initResetPasswordPage() {
  try {
    // Initialize Supabase client
    await initSupabase();
    
    // Initialize input sanitizer for the reset form
    InputSanitizer.initForm('#resetForm');
    
    // Setup form handlers
    setupFormHandlers();
    
    console.log('✅ Reset password page initialized');
  } catch (error) {
    console.error('❌ Failed to initialize reset password page:', error);
    showError('Failed to initialize. Please refresh the page.');
  }
}

/**
 * Setup form event handlers
 */
function setupFormHandlers() {
  const resetForm = document.getElementById('resetForm');
  
  if (resetForm) {
    resetForm.addEventListener('submit', handleResetPassword);
  }
}

/**
 * Handle reset password form submission
 * @param {Event} e - Form submit event
 */
async function handleResetPassword(e) {
  e.preventDefault();
  
  if (isSubmitting) return;
  isSubmitting = true;

  const email = document.getElementById('email').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const submitBtn = e.target.querySelector('.btn-submit');
  
  setButtonLoading(submitBtn, true);
  clearMessages();

  try {
    // Validate email is provided
    if (!email || email.trim() === '') {
      throw new Error('Email address is required');
    }

    // Validate email format
    if (!InputSanitizer.isValidEmail(email)) {
      throw new Error('Please enter a valid email address');
    }

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      throw new Error('Passwords do not match');
    }

    // Validate password length (minimum 12 characters for security)
    if (newPassword.length < 12) {
      throw new Error('Password must be at least 12 characters long');
    }

    // Check rate limit before attempting password reset
    const rateLimitCheck = await checkRateLimit(email);
    if (!rateLimitCheck.allowed) {
      // Rate limit exceeded
      const retryMinutes = rateLimitCheck.retry_minutes || 10;
      throw new Error(`Too many password reset attempts. Please try again in ${retryMinutes} minutes.`);
    }

    // Initialize user settings and perform password reset
    const settings = new window.UserSettings();
    await settings.init();
    const result = await settings.resetPassword(newPassword, email);
    
    if (result.success) {
      showSuccess('Password updated! Redirecting to sign in...');
      
      // Redirect to signin page after 2 seconds
      setTimeout(() => {
        window.location.href = 'signin.html';
      }, 2000);
    } else {
      throw new Error(result.message || 'Failed to reset password');
    }

  } catch (error) {
    console.error('Password reset error:', error);
    showError(error.message || 'Failed to reset password. Please try again.');
  } finally {
    setButtonLoading(submitBtn, false);
    isSubmitting = false;
  }
}

/**
 * Check rate limit for password reset
 * @param {string} email - User email address
 * @returns {Promise<Object>} Rate limit check result
 */
async function checkRateLimit(email) {
  try {
    const response = await fetch('/api/auth/reset-password.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });
    
    const data = await response.json();
    
    if (response.status === 429) {
      // Rate limit exceeded
      return {
        allowed: false,
        retry_after: data.retry_after || 600,
        retry_minutes: data.retry_minutes || 10,
        message: data.message || 'Too many attempts. Please try again later.'
      };
    }
    
    if (!response.ok) {
      console.error('Rate limit check failed:', data);
      // Allow request to proceed on API errors to avoid blocking legitimate users
      return { allowed: true };
    }
    
    return {
      allowed: true,
      message: data.message
    };
    
  } catch (error) {
    console.error('Rate limit check error:', error);
    // Allow request to proceed on network errors to avoid blocking legitimate users
    return { allowed: true };
  }
}

/**
 * Show error message to user
 * @param {string} message - Error message
 */
function showError(message) {
  const messageDiv = document.getElementById('message');
  if (messageDiv) {
    messageDiv.className = 'message error';
    messageDiv.textContent = message;
    messageDiv.style.display = 'block';
    
    // Auto-hide after 8 seconds
    setTimeout(() => {
      messageDiv.style.display = 'none';
    }, 8000);
  }
}

/**
 * Show success message to user
 * @param {string} message - Success message
 */
function showSuccess(message) {
  const messageDiv = document.getElementById('message');
  if (messageDiv) {
    messageDiv.className = 'message success';
    messageDiv.textContent = message;
    messageDiv.style.display = 'block';
  }
}

/**
 * Clear all messages
 */
function clearMessages() {
  const messageDiv = document.getElementById('message');
  if (messageDiv) {
    messageDiv.style.display = 'none';
    messageDiv.className = 'message';
  }
}

/**
 * Set button loading state
 * @param {HTMLButtonElement} button - Button element
 * @param {boolean} loading - Loading state
 */
function setButtonLoading(button, loading) {
  if (!button) return;
  
  if (loading) {
    button.classList.add('loading');
    button.disabled = true;
    
    // Store original text and replace with loading text
    if (!button.dataset.originalText) {
      button.dataset.originalText = button.textContent;
    }
    button.innerHTML = '<span class="btn-text">' + button.dataset.originalText + '</span><span class="btn-loading">Resetting password...</span>';
  } else {
    button.classList.remove('loading');
    button.disabled = false;
    
    // Restore original text
    if (button.dataset.originalText) {
      button.innerHTML = '<span class="btn-text">' + button.dataset.originalText + '</span>';
    }
  }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initResetPasswordPage);
} else {
  // DOM already loaded
  initResetPasswordPage();
}
