# Common CSS Files - Usage Guide

## Overview

This directory contains modular, reusable CSS files that eliminate code duplication across the application. All common styles have been extracted from page-specific CSS files into four organized base files.

## File Structure

```
css/common/
├── base.css         - Reset, typography, CSS variables, utility classes
├── layout.css       - Grid systems, flexbox, containers, responsive layouts
├── components.css   - Buttons, forms, cards, modals, badges, tables
├── navigation.css   - Sidebar, navbar, tabs, breadcrumbs, pagination
└── README.md        - This file
```

## Usage in HTML Pages

### Basic Usage (All Pages)

Include the common CSS files in your HTML `<head>` section **before** page-specific CSS:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Page - Stokika</title>
  
  <!-- Common CSS Files (Load First) -->
  <link rel="stylesheet" href="css/common/base.css">
  <link rel="stylesheet" href="css/common/layout.css">
  <link rel="stylesheet" href="css/common/components.css">
  <link rel="stylesheet" href="css/common/navigation.css">
  
  <!-- Page-Specific CSS (Load Last) -->
  <link rel="stylesheet" href="css/pages/your-page.css">
</head>
<body>
  <!-- Page content -->
</body>
</html>
```

### Selective Loading

For pages that don't need all common files, you can load only what's needed:

**Authentication Pages (signin, reset-password):**
```html
<link rel="stylesheet" href="css/common/base.css">
<link rel="stylesheet" href="css/common/components.css">
<link rel="stylesheet" href="css/pages/signin.css">
```

**Dashboard Pages (agent, analytics, inventory):**
```html
<link rel="stylesheet" href="css/common/base.css">
<link rel="stylesheet" href="css/common/layout.css">
<link rel="stylesheet" href="css/common/components.css">
<link rel="stylesheet" href="css/common/navigation.css">
<link rel="stylesheet" href="css/pages/dashboard-name.css">
```

**Form Pages (onboarding, settings):**
```html
<link rel="stylesheet" href="css/common/base.css">
<link rel="stylesheet" href="css/common/layout.css">
<link rel="stylesheet" href="css/common/components.css">
<link rel="stylesheet" href="css/pages/form-name.css">
```

## What Each File Provides

### base.css

**CSS Variables (Available Globally):**
- Color tokens: `--primary`, `--secondary`, `--accent`, `--success`, `--warning`, `--error`
- Gradients: `--gradient-primary`, `--gradient-1` through `--gradient-4`
- Background colors: `--bg-primary`, `--bg-secondary`, `--bg-tertiary`
- Text colors: `--text-primary`, `--text-secondary`, `--text-heading`, `--text-label`
- Border colors: `--border`, `--border-light`, `--border-focus`
- Spacing: `--spacing-xs` through `--spacing-2xl`
- Border radius: `--radius-sm` through `--radius-2xl`
- Shadows: `--card-shadow`, `--card-shadow-lg`, `--card-shadow-xl`

**Typography:**
- Global body font styles
- Heading styles (h1-h6)
- Special classes: `.hero-main-title`, `.section-title`

**Utility Classes:**
- Display: `.hidden`, `.flex`, `.block`, `.inline-flex`
- Flexbox: `.items-center`, `.justify-between`, `.gap-md`
- Text: `.text-center`, `.text-primary`, `.text-muted`
- Spacing: `.mt-1`, `.mb-2`, `.p-3`
- Borders: `.rounded`, `.rounded-lg`, `.rounded-xl`
- Shadows: `.shadow-sm`, `.shadow-lg`
- Width: `.w-full`, `.max-w-md`

### layout.css

**Container Classes:**
- `.container` - Standard 1200px max-width container
- `.container-sm`, `.container-md`, `.container-lg` - Sized variants

**Grid Systems:**
- `.grid` - Basic grid with gap
- `.grid-2`, `.grid-3`, `.grid-4` - Fixed column grids
- `.stats-grid` - Auto-fit grid for stat cards (240px min)
- `.charts-grid` - Auto-fit grid for charts (400px min)

**Dashboard Layout:**
- `.dashboard-container` - Dashboard wrapper
- `.main-content` - Main content area (with sidebar offset)

**Centered Layouts:**
- `.centered-layout` - Full-height centered container (for auth pages)
- `.login-container` - Centered card for login forms
- `.onboarding-container` - Onboarding form container

**Flexbox Layouts:**
- `.flex-row`, `.flex-col` - Flex direction
- `.flex-wrap`, `.flex-1` - Flex properties

### components.css

**Cards:**
- `.card` - Standard card with padding, shadow, rounded corners
- `.stat-card` - Specialized card for statistics

**Buttons:**
- `.btn` - Base button class
- `.btn-primary`, `.btn-secondary`, `.btn-outline`, `.btn-danger`, `.btn-success`
- `.btn-sm`, `.btn-lg`, `.btn-block` - Size variants
- `.btn-login`, `.btn-logout`, `.btn-back`, `.btn-copy` - Special variants

**Forms:**
- `.form-group` - Form field wrapper
- `.form-label` - Form label styling
- `.form-input` - Input styling (also applies to `input`, `select`, `textarea`)
- `.error-message`, `.success-message` - Status messages
- `.field-error` - Field-level error text

**Tables:**
- `.table` - Styled table with proper spacing and borders

**Badges:**
- `.badge` - Base badge class
- `.badge-success`, `.badge-warning`, `.badge-danger`, `.badge-info`, `.badge-secondary`

**Modals:**
- `.modal`, `.modal-content`, `.modal-header`, `.modal-body`, `.modal-footer`

**Other Components:**
- `.spinner` - Loading spinner
- `.progress-bar` - Progress indicator
- `.tooltip` - Tooltip component
- `.alert` - Alert boxes (`.alert-success`, `.alert-warning`, `.alert-error`, `.alert-info`)

### navigation.css

**Sidebar:**
- `.sidebar` - Fixed sidebar (260px width, full height)
- `.sidebar-nav` - Navigation list
- `.nav-item` - Navigation link/button
- `.nav-group`, `.nav-group-title` - Grouped navigation

**Top Navbar:**
- `.navbar` - Top navigation bar
- `.navbar-brand`, `.navbar-menu` - Navbar components
- `.navbar-toggle` - Mobile menu toggle

**Other Navigation:**
- `.breadcrumbs` - Breadcrumb navigation
- `.tabs`, `.tab` - Tab navigation
- `.dropdown` - Dropdown menus
- `.pagination` - Pagination controls
- `.stepper` - Multi-step form stepper

## Migrating Existing Pages

### Step 1: Identify Duplicate Styles

Review your page-specific CSS and identify styles that match common patterns:

**Remove from page CSS:**
- CSS reset (`* { margin: 0; padding: 0; }`)
- Common button styles (`.btn-primary`, `.btn-logout`)
- Card styles (`.card`, `.stat-card`)
- Form styles (`.form-group`, `input`, `select`)
- Sidebar/navigation styles (`.sidebar`, `.nav-item`)
- Grid layouts (`.stats-grid`, `.dashboard-container`)

### Step 2: Update HTML to Include Common CSS

Add common CSS imports to your HTML:

```html
<link rel="stylesheet" href="css/common/base.css">
<link rel="stylesheet" href="css/common/layout.css">
<link rel="stylesheet" href="css/common/components.css">
<link rel="stylesheet" href="css/common/navigation.css">
```

### Step 3: Clean Up Page CSS

Remove duplicate styles from your page-specific CSS file. Keep only:
- Page-unique styles not covered by common files
- Page-specific overrides
- Custom components unique to that page

### Step 4: Test Page

Load the page in browser and verify:
- All styles apply correctly
- No visual regressions
- No console errors
- Responsive design works

### Step 5: Use CSS Variables

Update hardcoded colors to use CSS variables:

**Before:**
```css
.custom-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  color: #000000;
}
```

**After:**
```css
.custom-card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  color: var(--text-primary);
}
```

## Example: Migrating agent-dashboard.css

### Before (Duplicated Code)

```css
/* agent-dashboard.css - BEFORE */
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Inter', sans-serif; background: #f5f7fa; }
.dashboard-container { display: flex; min-height: 100vh; }
.sidebar { width: 260px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); ... }
.nav-item { padding: 0.875rem 1rem; border-radius: 10px; ... }
.btn-primary { background: linear-gradient(135deg, #10b981 0%, #059669 100%); ... }
.card { background: #fff; padding: 1.5rem; border-radius: 12px; ... }
.table { width: 100%; border-collapse: collapse; ... }

/* Page-specific styles */
.agent-stats { ... }
.agent-activity-log { ... }
```

### After (Clean, No Duplication)

```css
/* agent-dashboard.css - AFTER */
/* All common styles now imported from css/common/ */

/* Page-specific styles only */
.agent-stats {
  /* Custom styling unique to agent dashboard */
}

.agent-activity-log {
  /* Custom styling unique to agent dashboard */
}

/* Page-specific overrides (if needed) */
.stat-card h3 {
  color: var(--accent); /* Override primary color for this page */
}
```

### HTML Update

```html
<!-- agent.html - Updated -->
<head>
  <!-- Common CSS -->
  <link rel="stylesheet" href="css/common/base.css">
  <link rel="stylesheet" href="css/common/layout.css">
  <link rel="stylesheet" href="css/common/components.css">
  <link rel="stylesheet" href="css/common/navigation.css">
  
  <!-- Page-specific (now much smaller) -->
  <link rel="stylesheet" href="css/agent-dashboard.css">
</head>
```

## Benefits

✅ **No Code Duplication** - Common styles defined once, used everywhere  
✅ **Smaller Page CSS** - Page-specific files are now much smaller  
✅ **Consistent Design** - All pages use the same base styles  
✅ **Easy Maintenance** - Update one file, changes apply everywhere  
✅ **Better Performance** - Browser can cache common files across pages  
✅ **CSS Variables** - Easy theming and color customization  
✅ **Utility Classes** - Rapid prototyping with utility classes  

## Best Practices

1. **Always include base.css first** - It contains CSS variables needed by other files
2. **Load common CSS before page CSS** - Allows page CSS to override if needed
3. **Use CSS variables** - Prefer `var(--primary)` over hardcoded colors
4. **Use utility classes** - Leverage utilities for spacing, display, text alignment
5. **Keep page CSS minimal** - Only add styles truly unique to that page
6. **Test responsively** - Common files include mobile breakpoints
7. **Don't modify common files for one page** - Use page CSS for overrides

## Common Questions

**Q: Can I override common styles in my page CSS?**  
A: Yes! Page CSS loads after common CSS, so you can override any style.

**Q: What if my page doesn't need navigation?**  
A: Only include the common files you need. Not all pages need all four files.

**Q: Can I add new utility classes to base.css?**  
A: Yes, but ensure they're truly reusable across multiple pages first.

**Q: Should I use inline styles?**  
A: No! Inline styles will be removed as part of security integration. Use classes instead.

**Q: How do I handle page-specific colors?**  
A: Define them in your page CSS using CSS variables: `--page-accent: #3b82f6;`

## Next Steps

After completing this task:

1. ✅ Common CSS files created
2. ⏭️ Update existing page CSS files to remove duplicates (Task 4)
3. ⏭️ Extract inline styles from HTML to page CSS files (Phase 2)
4. ⏭️ Test all pages to ensure no visual regressions

## Support

For questions or issues with common CSS files:
- Review this README
- Check existing page implementations
- Test in browser DevTools
- Refer to design.md for architecture decisions
