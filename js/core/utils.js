/**
 * Utility Functions Module
 * Provides shared utility functions for the application
 * ES6 Module - Use with type="module"
 */

/**
 * Date Formatting Utilities
 */

/**
 * Format date to local date string (YYYY-MM-DD)
 * @param {Date|string} date - Date object or ISO string
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Format date to local datetime string (YYYY-MM-DD HH:MM)
 * @param {Date|string} date - Date object or ISO string
 * @returns {string} Formatted datetime string
 */
export function formatDateTime(date) {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * Format date to relative time (e.g., "2 hours ago")
 * @param {Date|string} date - Date object or ISO string
 * @returns {string} Relative time string
 */
export function formatRelativeTime(date) {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const now = new Date();
  const diffMs = now - d;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSeconds < 60) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return formatDate(d);
}

/**
 * Parse date string to Date object
 * @param {string} dateString - Date string in various formats
 * @returns {Date|null} Date object or null if invalid
 */
export function parseDate(dateString) {
  if (!dateString) return null;
  
  const d = new Date(dateString);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Currency Formatting Utilities
 */

/**
 * Format number as Kenyan Shilling currency
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string (KES X,XXX.XX)
 */
export function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'KES 0.00';
  }
  
  const formatted = Number(amount).toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  return `KES ${formatted}`;
}

/**
 * Parse currency string to number
 * @param {string} currencyString - Currency string (e.g., "KES 1,234.56")
 * @returns {number} Parsed number
 */
export function parseCurrency(currencyString) {
  if (!currencyString) return 0;
  
  const cleaned = String(currencyString).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Error Handling Utilities
 */

/**
 * Display error message to user
 * @param {string} message - Error message to display
 * @param {string} elementId - Optional container element ID
 */
export function showError(message, elementId = null) {
  console.error('Error:', message);
  
  if (elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.innerHTML = `
        <div class="error-message" role="alert" style="
          background-color: #fee; 
          color: #c33; 
          padding: 12px; 
          border-radius: 4px; 
          border-left: 4px solid #c33;
          margin: 10px 0;">
          <strong>Error:</strong> ${escapeHtml(message)}
        </div>
      `;
    }
  } else {
    // Fallback: show alert
    alert(`Error: ${message}`);
  }
}

/**
 * Display success message to user
 * @param {string} message - Success message to display
 * @param {string} elementId - Optional container element ID
 */
export function showSuccess(message, elementId = null) {
  console.log('Success:', message);
  
  if (elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.innerHTML = `
        <div class="success-message" role="status" style="
          background-color: #efe; 
          color: #3c3; 
          padding: 12px; 
          border-radius: 4px; 
          border-left: 4px solid #3c3;
          margin: 10px 0;">
          <strong>Success:</strong> ${escapeHtml(message)}
        </div>
      `;
    }
  }
}

/**
 * Display loading state
 * @param {string} elementId - Container element ID
 * @param {string} message - Optional loading message
 */
export function showLoading(elementId, message = 'Loading...') {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = `
      <div class="loading-message" role="status" style="
        padding: 20px; 
        text-align: center; 
        color: #666;">
        <div class="spinner" style="
          border: 3px solid #f3f3f3; 
          border-top: 3px solid #3498db; 
          border-radius: 50%; 
          width: 40px; 
          height: 40px; 
          animation: spin 1s linear infinite; 
          margin: 0 auto 10px;">
        </div>
        ${escapeHtml(message)}
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;
  }
}

/**
 * Hide loading state
 * @param {string} elementId - Container element ID
 */
export function hideLoading(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    const loading = element.querySelector('.loading-message');
    if (loading) {
      loading.remove();
    }
  }
}

/**
 * Handle async errors with user feedback
 * @param {Function} asyncFn - Async function to execute
 * @param {string} errorElementId - Optional error container element ID
 * @returns {Promise<any>} Result of async function or null on error
 */
export async function handleAsyncError(asyncFn, errorElementId = null) {
  try {
    return await asyncFn();
  } catch (error) {
    console.error('Async error:', error);
    const message = error.message || 'An unexpected error occurred';
    showError(message, errorElementId);
    return null;
  }
}

/**
 * String Utilities
 */

/**
 * Escape HTML to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
export function escapeHtml(str) {
  if (!str) return '';
  
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Truncate string to specified length
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated string with ellipsis if needed
 */
export function truncate(str, maxLength = 50) {
  if (!str || str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Capitalize first letter of string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Convert string to kebab-case
 * @param {string} str - String to convert
 * @returns {string} Kebab-cased string
 */
export function kebabCase(str) {
  if (!str) return '';
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Validation Utilities
 */

/**
 * Validate email format (RFC 5322 compliant)
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
export function isValidEmail(email) {
  if (!email) return false;
  
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email);
}

/**
 * Validate Kenyan phone number format (254XXXXXXXXX)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid Kenyan phone
 */
export function isValidKenyanPhone(phone) {
  if (!phone) return false;
  
  const phoneRegex = /^254[17]\d{8}$/;
  return phoneRegex.test(phone);
}

/**
 * DOM Utilities
 */

/**
 * Get element by ID with error handling
 * @param {string} elementId - Element ID
 * @returns {HTMLElement|null} Element or null if not found
 */
export function getElement(elementId) {
  const element = document.getElementById(elementId);
  if (!element) {
    console.warn(`Element not found: ${elementId}`);
  }
  return element;
}

/**
 * Safely set inner HTML with XSS protection
 * @param {string} elementId - Element ID
 * @param {string} html - HTML content (will be escaped)
 */
export function setTextContent(elementId, html) {
  const element = getElement(elementId);
  if (element) {
    element.textContent = html; // Use textContent for safety
  }
}

/**
 * Debounce function execution
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(fn, delay = 300) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Throttle function execution
 * @param {Function} fn - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(fn, limit = 300) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Network Retry Utilities
 */

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
 * @param {number} initialDelay - Initial delay in milliseconds (default: 1000)
 * @param {number} maxDelay - Maximum delay in milliseconds (default: 10000)
 * @returns {Promise<any>} Result of function or throws error after max retries
 */
export async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000, maxDelay = 10000) {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`[Retry] Attempt ${attempt + 1}/${maxRetries}`);
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on certain errors
      if (error.message?.includes('401') || 
          error.message?.includes('403') || 
          error.message?.includes('404')) {
        console.error('[Retry] Non-retryable error:', error);
        throw error;
      }
      
      // If this was the last attempt, throw the error
      if (attempt === maxRetries - 1) {
        console.error('[Retry] Max retries reached:', error);
        throw error;
      }
      
      // Calculate delay with exponential backoff: initialDelay * 2^attempt
      const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);
      console.log(`[Retry] Waiting ${delay}ms before retry...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Retry a fetch request with exponential backoff
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} maxRetries - Maximum number of retry attempts
 * @returns {Promise<Response>} Fetch response or throws error
 */
export async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  return retryWithBackoff(async () => {
    const response = await fetch(url, options);
    
    // Don't retry on 4xx errors (client errors)
    if (response.status >= 400 && response.status < 500) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  }, maxRetries);
}

/**
 * Local Storage Utilities (with error handling)
 */

/**
 * Safely get item from localStorage
 * @param {string} key - Storage key
 * @param {any} defaultValue - Default value if not found or error
 * @returns {any} Stored value or default
 */
export function getStorageItem(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.warn('LocalStorage get error:', error);
    return defaultValue;
  }
}

/**
 * Safely set item in localStorage
 * @param {string} key - Storage key
 * @param {any} value - Value to store
 * @returns {boolean} True if successful
 */
export function setStorageItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn('LocalStorage set error:', error);
    return false;
  }
}

/**
 * Safely remove item from localStorage
 * @param {string} key - Storage key
 * @returns {boolean} True if successful
 */
export function removeStorageItem(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn('LocalStorage remove error:', error);
    return false;
  }
}
