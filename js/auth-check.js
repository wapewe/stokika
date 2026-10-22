/**
 * Authentication Check for Protected Pages
 * Redirects to signin.html if user is not authenticated
 */

(function() {
  'use strict';

  // Check if user is authenticated
  function checkAuth() {
    try {
      // Check for session token in localStorage (your current auth method)
      const sessionToken = localStorage.getItem('session_token');
      const userId = localStorage.getItem('user_id');
      const userRole = localStorage.getItem('user_role');

      // If no session token, redirect to signin
      if (!sessionToken || !userId) {
        console.warn('⚠️ No active session. Redirecting to sign in...');
        redirectToSignIn();
        return false;
      }

      // Optional: Check token expiry if you store it
      const tokenExpiry = localStorage.getItem('token_expiry');
      if (tokenExpiry) {
        const expiryTime = new Date(tokenExpiry).getTime();
        const now = Date.now();
        
        if (now > expiryTime) {
          console.warn('⚠️ Session expired. Redirecting to sign in...');
          clearSession();
          redirectToSignIn();
          return false;
        }
      }

      console.log('✅ User authenticated:', { userId, userRole });
      return true;

    } catch (error) {
      console.error('❌ Auth check error:', error);
      redirectToSignIn();
      return false;
    }
  }

  // Clear session data
  function clearSession() {
    localStorage.removeItem('session_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_role');
    localStorage.removeItem('token_expiry');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_name');
  }

  // Redirect to sign in page
  function redirectToSignIn() {
    // Store the current page URL to redirect back after login
    const currentPage = window.location.pathname + window.location.search;
    localStorage.setItem('redirect_after_login', currentPage);
    
    // Redirect to signin page
    window.location.href = '/signin.html';
  }

  // Run auth check on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAuth);
  } else {
    checkAuth();
  }

  // Expose checkAuth globally for manual checks
  window.checkAuthentication = checkAuth;

})();
