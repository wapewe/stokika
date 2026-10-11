# Core JavaScript Modules

This directory contains the core ES6 modules for the Stokika application. These modules provide shared functionality used across all pages.

## Modules

### 1. supabase-client.js

**Purpose:** Provides singleton access to the Supabase client with secure initialization.

**Key Functions:**
- `initSupabase()` - Initialize Supabase client (async, singleton pattern)
- `getSupabaseClient()` - Get initialized client instance
- `isInitialized()` - Check if client is initialized

**Usage Example:**
```javascript
import { initSupabase, getSupabaseClient } from './js/core/supabase-client.js';

// Initialize
await initSupabase();

// Use client
const supabase = getSupabaseClient();
const { data, error } = await supabase.from('orders').select('*');
```

**Features:**
- ✅ Singleton pattern (only one instance created)
- ✅ Async initialization with promise caching
- ✅ Waits for config to load automatically
- ✅ Auto-initialization on config-loaded event
- ✅ Proper error handling and logging

---

### 2. utils.js

**Purpose:** Shared utility functions for common operations.

**Categories:**

#### Date Formatting
- `formatDate(date)` - Format to YYYY-MM-DD
- `formatDateTime(date)` - Format to YYYY-MM-DD HH:MM
- `formatRelativeTime(date)` - Format as "2 hours ago"
- `parseDate(dateString)` - Parse string to Date object

#### Currency
- `formatCurrency(amount)` - Format as KES X,XXX.XX
- `parseCurrency(currencyString)` - Parse currency to number

#### Error Handling
- `showError(message, elementId)` - Display error message
- `showSuccess(message, elementId)` - Display success message
- `showLoading(elementId, message)` - Display loading state
- `hideLoading(elementId)` - Hide loading state
- `handleAsyncError(asyncFn, errorElementId)` - Wrap async with error handling

#### String Utilities
- `escapeHtml(str)` - Escape HTML to prevent XSS
- `truncate(str, maxLength)` - Truncate with ellipsis
- `capitalize(str)` - Capitalize first letter
- `kebabCase(str)` - Convert to kebab-case

#### Validation
- `isValidEmail(email)` - Validate email (RFC 5322)
- `isValidKenyanPhone(phone)` - Validate Kenyan phone (254XXXXXXXXX)

#### DOM Utilities
- `getElement(elementId)` - Safe getElementById with logging
- `setTextContent(elementId, text)` - Set text content safely
- `debounce(fn, delay)` - Debounce function execution
- `throttle(fn, limit)` - Throttle function execution

#### Storage
- `getStorageItem(key, defaultValue)` - Safe localStorage get
- `setStorageItem(key, value)` - Safe localStorage set
- `removeStorageItem(key)` - Safe localStorage remove

**Usage Example:**
```javascript
import * as utils from './js/core/utils.js';

// Format currency
const formatted = utils.formatCurrency(1234.56); // "KES 1,234.56"

// Validate email
if (utils.isValidEmail(email)) {
  // Process email
}

// Show error
utils.showError('Something went wrong', 'error-container');

// Format date
const dateStr = utils.formatDate(new Date()); // "2024-01-15"
```

---

### 3. dashboard-init.js

**Purpose:** Common initialization logic for dashboard pages with authentication.

**Key Functions:**
- `initDashboard(config)` - Initialize dashboard with auth
- `checkAuthentication(allowedRoles, redirectUrl)` - Check auth and roles
- `loadUserSession()` - Load current user session data
- `updateUserProfile(userData)` - Update UI with user data
- `setupLogout(buttonSelector, redirectUrl)` - Setup logout button
- `loadDashboardData(dataLoader, containerId)` - Load data with loading state
- `setupRealtimeSubscription(table, callback)` - Setup real-time updates
- `quickInit(config)` - Combined init (auth + profile + logout)

**Usage Example:**
```javascript
import { quickInit, loadDashboardData } from './js/core/dashboard-init.js';

// Quick initialization
const result = await quickInit({
  allowedRoles: ['vendor', 'admin'],
  requiresAuth: true
});

if (result.authenticated && result.authorized) {
  // Load dashboard data
  const data = await loadDashboardData(async () => {
    const supabase = getSupabaseClient();
    const { data } = await supabase.from('orders').select('*');
    return data;
  }, 'dashboard-container');
}
```

**Configuration Object:**
```javascript
{
  allowedRoles: ['vendor', 'admin'], // Roles allowed access
  requiresAuth: true,                // Require authentication
  onAuthSuccess: async (result) => {}, // Callback on success
  onAuthFailure: async (result) => {}, // Callback on failure
  redirectUrl: '/signin.html'        // Redirect URL on auth fail
}
```

**Features:**
- ✅ Automatic authentication check
- ✅ Role-based access control
- ✅ Session management
- ✅ User profile updates
- ✅ Logout functionality
- ✅ Real-time subscriptions
- ✅ Loading state management

---

## Module Loading Order

All core modules must be loaded as ES6 modules using `type="module"`:

```html
<!DOCTYPE html>
<html>
<head>
  <!-- Load config loader first (non-module) -->
  <script src="js/core/config-loader.js"></script>
  
  <!-- Load Supabase from CDN -->
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2" 
          crossorigin="anonymous" 
          type="module"></script>
</head>
<body>
  <!-- Your page content -->
  
  <!-- Load your page module -->
  <script type="module">
    import { initSupabase } from './js/core/supabase-client.js';
    import * as utils from './js/core/utils.js';
    import { quickInit } from './js/core/dashboard-init.js';
    
    // Your page logic here
    await quickInit({ allowedRoles: ['vendor'] });
  </script>
</body>
</html>
```

## Testing

A test file is provided to verify all modules load correctly:

1. Open `test-core-modules.html` in your browser
2. Tests will run automatically after config loads
3. Check console for detailed test results
4. Access modules manually via `window.testModules`

**Manual Testing in Console:**
```javascript
// Test Supabase
await window.testModules.supabaseClient.initSupabase();

// Test Utils
window.testModules.utils.formatCurrency(1234.56);

// Test Dashboard Init
await window.testModules.dashboardInit.loadUserSession();
```

## Browser Compatibility

All modules use ES6 features and require modern browsers:
- ✅ Chrome 61+
- ✅ Firefox 60+
- ✅ Safari 10.1+
- ✅ Edge 16+

For older browsers, a fallback message is recommended:
```html
<script nomodule>
  alert('Your browser is outdated. Please upgrade for full functionality.');
</script>
```

## Best Practices

1. **Always import what you need:**
   ```javascript
   // Good
   import { formatDate, formatCurrency } from './js/core/utils.js';
   
   // Also good for many utils
   import * as utils from './js/core/utils.js';
   ```

2. **Initialize Supabase once per page:**
   ```javascript
   // In your page module
   await initSupabase();
   // Now use getSupabaseClient() everywhere
   ```

3. **Use dashboard-init for protected pages:**
   ```javascript
   // For dashboard pages
   import { quickInit } from './js/core/dashboard-init.js';
   await quickInit({ allowedRoles: ['vendor', 'admin'] });
   ```

4. **Handle errors gracefully:**
   ```javascript
   import { handleAsyncError } from './js/core/utils.js';
   
   const data = await handleAsyncError(async () => {
     return await fetchData();
   }, 'error-container');
   ```

## Migration Guide

### From Old Code
```javascript
// Old (non-module)
const client = initSupabase();

// New (ES6 module)
import { initSupabase, getSupabaseClient } from './js/core/supabase-client.js';
await initSupabase();
const client = getSupabaseClient();
```

### From Inline Functions
```javascript
// Old (inline)
function formatCurrency(amount) {
  return 'KES ' + amount.toFixed(2);
}

// New (import from utils)
import { formatCurrency } from './js/core/utils.js';
const formatted = formatCurrency(amount);
```

## Troubleshooting

**Module not found error:**
- Ensure you're using `type="module"` in script tag
- Check file paths are correct (relative to HTML file)
- Verify files exist in js/core/ directory

**Supabase not initialized:**
- Ensure config-loader.js runs before module imports
- Check browser console for config loading errors
- Verify .env or config.php has proper credentials

**CORS errors:**
- ES6 modules require a web server (not file://)
- Use `python -m http.server` or similar for local testing

**Import errors in console:**
- Check all imports use correct relative paths
- Ensure exported function names match imports
- Verify browser supports ES6 modules

## Support

For issues or questions:
1. Check browser console for detailed error messages
2. Run `test-core-modules.html` to verify modules work
3. Review this documentation for usage examples
4. Check individual module JSDoc comments for details
