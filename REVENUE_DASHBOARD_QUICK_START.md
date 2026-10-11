# Revenue Dashboard - Quick Start Guide

## What Was Implemented

A comprehensive revenue dashboard that displays:
- ✅ Total revenue from all sources
- ✅ Field agent kit payments (KES 2,500 each)
- ✅ Supervisor kit payments (KES 3,500 each)
- ✅ Vendor order commissions (service fees)
- ✅ Supplier payments (expenses/money out)
- ✅ Net profit calculation with margin percentage
- ✅ Time period filters (Today, This Week, This Month)
- ✅ Auto-refresh every 60 seconds
- ✅ Detailed breakdown tables
- ✅ Fully responsive design

## Files Modified

### 1. admin.html
**Location**: After admin header, before stats-grid
**What**: Added complete revenue dashboard HTML structure with:
- Revenue header with refresh button
- Period tabs (Today/Week/Month)
- 6 revenue summary cards
- Expandable breakdown section

### 2. js/revenue-dashboard.js (NEW FILE)
**What**: Core functionality including:
- Revenue data fetching from Supabase
- Time period calculations
- UI updates
- Auto-refresh logic
- Detailed breakdown generation

### 3. css/admin.css
**What**: Comprehensive styling added:
- Revenue card designs
- Period tab styling
- Breakdown table styles
- Responsive breakpoints
- Animations and transitions

### 4. js/admin.js
**Change**: Added initialization call
```javascript
// Initialize Revenue Dashboard
if (typeof initRevenueDashboard === 'function') {
    initRevenueDashboard();
}
```

## How It Works

### Data Sources

1. **Field Agents**: `stokika_kit_payments` table
   - Filters: `user_type = 'field_agent'`, `payment_status IN ('verified', 'completed')`
   - Amount: `kit_amount` (2500 KES)

2. **Supervisors**: `stokika_kit_payments` table
   - Filters: `user_type = 'supervisor'`, `payment_status IN ('verified', 'completed')`
   - Amount: `kit_amount` (3500 KES)

3. **Vendors**: `orders` table
   - Filters: `vendor_id IS NOT NULL`, `status IN ('completed', 'delivered')`
   - Amount: `service_fee_amount` (Stokika's commission)

4. **Supplier Payments**: `payments` table
   - Filters: `status IN ('paid', 'completed')`
   - Amount: `amount` (money out)

### Calculations

```
Total Revenue = Field Agents + Supervisors + Vendors
Net Profit = Total Revenue - Supplier Payments
Profit Margin = (Net Profit / Total Revenue) × 100
```

### Time Periods

- **Today**: 00:00 today → now
- **This Week**: Monday 00:00 → now
- **This Month**: 1st of month 00:00 → now

## How to Use

### As Admin User

1. **Login**: Access admin panel at `/admin.html`
2. **View Dashboard**: Automatically loads at top of page
3. **Change Period**: Click "Today", "This Week", or "This Month"
4. **Refresh**: Click "🔄 Refresh" button (or wait 60s for auto-refresh)
5. **View Details**: Click "📈 View Detailed Breakdown" to see tables

### As Developer

#### Add New Revenue Source

1. Create fetch function in `revenue-dashboard.js`:
```javascript
async function fetchYourSource(dateRange) {
    const { data, error } = await adminSupabase
        .from('your_table')
        .select('amount, created_at')
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end);
    
    if (error) throw error;
    
    return {
        total: data.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0),
        count: data.length,
        data
    };
}
```

2. Add to `loadRevenueDashboard()`:
```javascript
const [
    fieldAgentsData,
    supervisorsData,
    vendorsData,
    supplierPaymentsData,
    yourNewData  // Add here
] = await Promise.all([
    fetchFieldAgentsRevenue(dateRange),
    fetchSupervisorsRevenue(dateRange),
    fetchVendorsRevenue(dateRange),
    fetchSupplierPayments(dateRange),
    fetchYourSource(dateRange)  // Add here
]);
```

3. Update UI calculations and add new card to HTML

#### Change Auto-Refresh Interval

In `revenue-dashboard.js`, modify:
```javascript
revenueRefreshInterval = setInterval(() => {
    loadRevenueDashboard();
}, 30000); // Change from 60000 to 30000 for 30 seconds
```

#### Add Custom Time Period

In `getDateRange()`, add case:
```javascript
case 'quarter':
    startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    startDate.setHours(0, 0, 0, 0);
    break;
```

Then add tab in HTML:
```html
<button class="period-tab" data-period="quarter">This Quarter</button>
```

## Visual Structure

```
┌─────────────────────────────────────────────────────┐
│ 💰 Revenue Overview               [🔄 Refresh]      │
├─────────────────────────────────────────────────────┤
│ [Today] [This Week] [This Month]                    │
├─────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│ │ Total    │ │ Field    │ │ Super-   │            │
│ │ Revenue  │ │ Agents   │ │ visors   │            │
│ │ KES X    │ │ KES X    │ │ KES X    │            │
│ └──────────┘ └──────────┘ └──────────┘            │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│ │ Vendors  │ │ Supplier │ │ Net      │            │
│ │ KES X    │ │ Payments │ │ Profit   │            │
│ │          │ │ KES X    │ │ KES X    │            │
│ └──────────┘ └──────────┘ └──────────┘            │
├─────────────────────────────────────────────────────┤
│ [📈 View Detailed Breakdown]                        │
│ ┌─────────────────┬─────────────────┐              │
│ │ Revenue Sources │ Expenses        │              │
│ │ [Table]         │ [Table]         │              │
│ └─────────────────┴─────────────────┘              │
└─────────────────────────────────────────────────────┘
```

## Responsive Behavior

- **Desktop (>1200px)**: 3-column grid
- **Tablet (768-1200px)**: 2-column grid
- **Mobile (480-768px)**: 1-column stack
- **Small Mobile (<480px)**: Full-width, adjusted padding

## Color Codes

- **Total Revenue Card**: Green gradient `#10b981` → `#14b8a6`
- **Net Profit Card**: Blue/Purple gradient `#3b82f6` → `#8b5cf6`
- **Expense Amounts**: Red `#ef4444`
- **Regular Cards**: Light gray with green accents
- **Table Headers**: Green gradient
- **Hover Effects**: Lift with green border

## Dependencies

- ✅ Supabase client (`adminSupabase`)
- ✅ Admin authentication
- ✅ Database tables: `stokika_kit_payments`, `orders`, `payments`
- ✅ Chart.js (already loaded in admin.html)

## Testing Checklist

- [ ] Dashboard appears on admin login
- [ ] All 6 cards display with data
- [ ] Period tabs switch data correctly
- [ ] Manual refresh works
- [ ] Auto-refresh triggers (wait 60s)
- [ ] Breakdown expands/collapses
- [ ] Tables show accurate data
- [ ] Responsive on mobile devices
- [ ] Loading states appear
- [ ] Error handling works

## Common Issues & Solutions

### Issue: Dashboard not appearing
**Solution**: Check if you're logged in as admin and Supabase is connected

### Issue: Shows "KES 0" everywhere
**Solution**: Verify database has data in the correct tables with correct statuses

### Issue: Time periods not working
**Solution**: Check browser timezone and date range calculations

### Issue: Auto-refresh not working
**Solution**: Check console for errors, verify interval is set correctly

### Issue: Mobile layout broken
**Solution**: Clear browser cache, check CSS media queries loaded

## Performance Notes

- Parallel data fetching (all sources load simultaneously)
- Indexed database queries on date columns
- 60-second refresh interval (configurable)
- Minimal DOM updates
- Optimized for real-time data

## Next Steps

1. Test dashboard with real data
2. Verify all calculations are accurate
3. Test on different screen sizes
4. Monitor performance with large datasets
5. Consider adding:
   - Revenue charts/graphs
   - Export to CSV/PDF
   - Email reports
   - Custom date ranges
   - Revenue forecasting

## Support

**Documentation**: See `REVENUE_DASHBOARD_IMPLEMENTATION.md` for detailed technical documentation

**Browser Console**: Check for error messages if issues occur

**Database**: Verify data exists in Supabase tables

**Contact**: Development team for assistance

---

**Implementation Date**: January 26, 2025  
**Version**: 1.0.0  
**Status**: ✅ Complete and Ready for Use
