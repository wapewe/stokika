# Dashboard Pages Implementation Guide

## Files Created
1. `js/theme-manager.js` - Shared theme management across all pages
2. `js/pages-common.js` - Common pagination and search functionality

## Implementation Steps for Each Page

### 1. All Pages - Add Theme Support
Add to `<head>` of each page:
```html
<link rel="icon" type="image/x-icon" href="../assets/logos/favicon.ico.png">
<script src="../js/theme-manager.js"></script>
```

Update logo in each page:
```html
<img src="../assets/logos/logo-dark.png" alt="Stokika" class="logo-img" id="dashboardLogo">
```

### 2. inventory-page.html - Stock Items
- Show message: "No stock items yet. Request stock to get started."
- Add button to request stock (links to dashboard)

### 3. suppliers.html - Already Implemented
- Add pagination (10 per page)
- Add search by company name
- Include: `<script src="../js/pages-common.js"></script>`

### 4. orders.html - Already Implemented  
- Add pagination (10 per page)
- Add search by order number or status
- Include: `<script src="../js/pages-common.js"></script>`

### 5. payments.html - Already Implemented
- Add pagination (10 per page)
- Add search by vendor name or status
- Include: `<script src="../js/pages-common.js"></script>`

### 6. analytics.html - Real Data
Replace mock data with:
```javascript
const { data: orders } = await supabase.from('orders').select('total_amount');
const totalSales = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
// Update each stat card with real data
```

### 7. settings.html - Account Settings
Add sections for:
- Profile Information (name, email, phone)
- Business Details (business name, category, location)
- Notification Preferences (email, SMS alerts)
- Theme Preference (light/dark toggle)
- Change Password
- Delete Account

## Search Implementation Pattern
```javascript
async function searchItems(query) {
    const { data } = await supabase
        .from('table_name')
        .select('*')
        .ilike('column_name', `%${query}%`)
        .range((currentPage-1)*10, currentPage*10-1);
    displayItems(data);
}
```

## Pagination Pattern
```javascript
async function loadPage(page) {
    currentPage = page;
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage - 1;
    
    const { data, count } = await supabase
        .from('table_name')
        .select('*', { count: 'exact' })
        .range(start, end);
    
    displayItems(data);
    displayPagination(count, page);
}
```

## Theme Persistence
All pages automatically load saved theme from localStorage via theme-manager.js

## Next Steps
1. Add theme-manager.js script to all pages
2. Update logos with ID for theme switching
3. Implement pagination for suppliers, orders, payments
4. Add search functionality to each page
5. Replace analytics mock data with real queries
6. Build settings page with forms
7. Test theme switching across all pages
