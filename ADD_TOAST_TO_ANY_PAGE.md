# Quick Guide: Add Toast to Any Page

## 2-Step Integration

### Step 1: Add to HTML `<head>`
```html
<link rel="stylesheet" href="css/toast.css">
```

### Step 2: Add before closing `</body>`
```html
<!-- After other scripts -->
<script src="js/utils/toast.js"></script>
<script src="js/utils/global-toast-init.js"></script>
```

## That's It!

All `alert()` calls on that page will automatically become beautiful toasts.

## Usage Examples

### In Your JavaScript
```javascript
// These all work automatically:
alert('Error occurred');          // → Error toast
alert('✓ Success!');              // → Success toast
alert('⚠ Warning');               // → Warning toast
alert('Info message');            // → Info toast

// Or use directly:
toast.error('Invalid input');
toast.success('Data saved!');
toast.warning('Session expiring soon');
toast.info('New feature available');
```

## Toast Types

| Type | Color | When to Use |
|------|-------|-------------|
| `toast.error()` | Red | Errors, failures, invalid input |
| `toast.success()` | Green | Success, completion, confirmation |
| `toast.warning()` | Amber | Warnings, cautions, attention needed |
| `toast.info()` | Blue | Information, tips, updates |

## Pages Already Updated

✅ **kit-payment.html** - Fully integrated with toast system

## Pages to Update

Copy the 2 lines above to any of these files:

- [ ] agent.html
- [ ] delivery-partner.html (if not already done)
- [ ] rembrandts.html
- [ ] supervisor-dashboard.html
- [ ] field-agent-dashboard.html
- [ ] vendor-dashboard.html
- [ ] supplier-dashboard.html
- [ ] stock-request.html
- [ ] Any other page with forms or user interactions

## Full Example

```html
<!DOCTYPE html>
<html>
<head>
    <title>My Page</title>
    
    <!-- Your existing CSS -->
    <link rel="stylesheet" href="css/styles.css">
    
    <!-- ADD THIS -->
    <link rel="stylesheet" href="css/toast.css">
</head>
<body>
    
    <!-- Your page content -->
    
    <!-- Your existing scripts -->
    <script src="js/script.js"></script>
    
    <!-- ADD THESE (in this order) -->
    <script src="js/utils/toast.js"></script>
    <script src="js/utils/global-toast-init.js"></script>
</body>
</html>
```

Now all alerts become beautiful toasts! 🎉
