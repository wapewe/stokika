# Stock Request Page - Testing Guide

## Fixed Issues Summary

### 1. ✅ "Add Item" Button Now Works
- Button properly adds new item rows when clicked
- Event listener correctly attached with preventDefault
- Each item row includes: Product ID, Quantity, Unit Price, Remove button
- Multiple items can be added without issues

### 2. ✅ Real-Time Total Amount Calculation
- Total updates automatically when:
  - Quantity changes
  - Unit price changes
  - Items are added
  - Items are removed
- Formula: Total = Sum of (quantity × unit_price) for all items
- Display uses formatCurrency (e.g., "KES 1,234.56")
- No hardcoded amounts

### 3. ✅ Amount Manipulation Prevention
- Subtotal calculated on both client and server side
- Server validates that subtotal = quantity × unit_price
- Users cannot directly edit the total amount
- Only quantity and unit price are editable

### 4. ✅ Real-Time Supplier Suggestions
- As vendor types supplier UUID, supplier name appears if valid
- Queries the `suppliers` table for matching UUID
- Display shows: "Loading..." → "✓ Supplier Name" or "✗ Not found"
- Uses debouncing (300ms delay) to avoid excessive queries
- Clears suggestion when field is empty

### 5. ✅ CSP Warning Fixed
- Removed `frame-ancestors` from meta tag (only works in HTTP headers)
- All other CSP directives remain in meta tag

### 6. ✅ Script Path Fixed
- Updated to use correct relative path: `dist/stock-request.js`
- File successfully compiled and available

### 7. ✅ Back Button Fixed
- Back button properly navigates to vendor-dashboard.html
- Uses window.location.href with correct relative path

## How to Test

### Prerequisites
1. **Start local dev server** (required to avoid file:// protocol issues):
   ```bash
   # Option 1: If you have a dev server configured
   npm run dev
   
   # Option 2: Use Python's built-in server
   python -m http.server 8000
   
   # Option 3: Use PHP's built-in server
   php -S localhost:8000
   
   # Option 4: Use VS Code Live Server extension
   # Right-click stock-request.html → "Open with Live Server"
   ```

2. **Navigate to**: `http://localhost:8000/stock-request.html`

### Test Cases

#### Test 1: Add Item Button
1. ✅ Page loads with one initial item row
2. ✅ Click "Add Item" button
3. ✅ Verify new item row appears
4. ✅ Click "Add Item" multiple times
5. ✅ Verify each click adds a new row

**Expected**: Each click adds a new item row with empty fields

#### Test 2: Real-Time Total Calculation
1. ✅ In first item row, enter:
   - Quantity: 10
   - Unit Price: 100
2. ✅ Verify total shows: "KES 1,000.00"
3. ✅ Change quantity to 20
4. ✅ Verify total updates to: "KES 2,000.00"
5. ✅ Add second item:
   - Quantity: 5
   - Unit Price: 50
6. ✅ Verify total shows: "KES 2,250.00"

**Expected**: Total updates immediately after each input change

#### Test 3: Remove Item
1. ✅ Add 3 items
2. ✅ Click trash icon on second item
3. ✅ Verify item is removed
4. ✅ Verify total recalculates correctly
5. ✅ When only 1 item remains, click trash icon
6. ✅ Verify warning: "You must have at least one item in the request"

**Expected**: Items can be removed but at least one must remain

#### Test 4: Supplier Lookup (requires valid supplier UUID)
1. ✅ Click in "Supplier ID" field
2. ✅ Start typing a valid supplier UUID
3. ✅ Verify "Loading..." appears below field
4. ✅ After 300ms, verify supplier name appears: "✓ [Business Name]"
5. ✅ Clear the field
6. ✅ Verify suggestion disappears
7. ✅ Enter invalid UUID
8. ✅ Verify shows: "✗ Supplier not found"

**Expected**: Real-time validation with debouncing

#### Test 5: Credit Limit Warning
1. ✅ Check your "Available Credit" in eligibility section
2. ✅ Enter items with total exceeding your credit
3. ✅ Verify warning appears:
   "Warning: Total amount exceeds your available credit of KES X,XXX.XX"
4. ✅ Reduce total below credit limit
5. ✅ Verify warning disappears

**Expected**: Warning appears/disappears based on total vs credit

#### Test 6: Form Validation
1. ✅ Leave all fields empty, click Submit
2. ✅ Verify validation errors for required fields
3. ✅ Enter invalid Product ID (not a UUID)
4. ✅ Verify error: "Invalid product ID: [error message]"
5. ✅ Enter quantity = 0
6. ✅ Verify error: "Quantity must be greater than 0"
7. ✅ Enter negative unit price
8. ✅ Verify error: "Unit price cannot be negative"

**Expected**: All validations trigger before submission

#### Test 7: Back Button
1. ✅ Click "Back to Dashboard" button
2. ✅ Verify navigation to vendor-dashboard.html

**Expected**: Smooth navigation without errors

#### Test 8: Successful Submission (requires valid data)
1. ✅ Fill in valid supplier UUID
2. ✅ Add items with valid product UUIDs
3. ✅ Ensure total is within credit limit
4. ✅ Click Submit
5. ✅ Verify success message
6. ✅ Verify redirect to vendor-dashboard.html?tab=orders

**Expected**: Request submitted successfully

## Example Test Data

### Valid Supplier UUID Format:
```
550e8400-e29b-41d4-a716-446655440000
```

### Valid Product UUID Format:
```
123e4567-e89b-12d3-a456-426614174000
```

### Sample Test Scenario:
```
Supplier ID: [paste valid UUID from database]
Item 1:
  - Product ID: [paste valid product UUID]
  - Quantity: 10
  - Unit Price: 150.00
  - Subtotal: 1,500.00 (calculated)

Item 2:
  - Product ID: [paste valid product UUID]
  - Quantity: 5
  - Unit Price: 80.00
  - Subtotal: 400.00 (calculated)

Total: KES 1,900.00
```

## Troubleshooting

### Issue: Scripts not loading
**Solution**: Make sure you're using a local dev server, not opening the file directly (file:// protocol)

### Issue: Supplier lookup not working
**Solution**: 
1. Check browser console for errors
2. Verify Supabase connection is configured
3. Ensure you're logged in as a vendor
4. Check that suppliers table has data

### Issue: Total not updating
**Solution**: 
1. Open browser console
2. Check for JavaScript errors
3. Verify event listeners are attached
4. Try refreshing the page

### Issue: Cannot submit form
**Solution**:
1. Check all required fields are filled
2. Verify product IDs and supplier ID are valid UUIDs
3. Ensure total is within credit limit
4. Check browser console for specific error messages

## Files Modified

1. **stock-request.html**
   - Removed `frame-ancestors` from CSP
   - Fixed script path to `dist/stock-request.js`
   - Fixed back button navigation path

2. **src/pages/stock-request.page.ts**
   - Added supplier lookup with debouncing
   - Fixed "Add Item" button event listener
   - Fixed total calculation to update in real-time
   - Added credit limit checking function
   - Improved form validation
   - Fixed event listener attachment timing

3. **css/stock-request.css**
   - Added supplier display styles
   - Added loading, found, and not-found states

## Server-Side Validation (Already Implemented)

The `stock-service.ts` already validates:
- ✅ Supplier ID format (UUID)
- ✅ Product ID format (UUID)
- ✅ Quantity > 0
- ✅ Unit price >= 0
- ✅ Subtotal >= 0
- ✅ Total amount vs remaining credit
- ✅ Vendor eligibility

This ensures that even if client-side validation is bypassed, the server will reject invalid requests.

## Success Criteria

All tests should pass with:
- ✅ Add Item button adds rows on every click
- ✅ Total updates immediately on input changes
- ✅ Remove button works for all but last item
- ✅ Supplier lookup shows real-time feedback
- ✅ Credit warning appears when exceeded
- ✅ All validations trigger correctly
- ✅ Back button navigates properly
- ✅ Form submission works with valid data
- ✅ No console errors during normal operation
- ✅ CSP warnings resolved

## Next Steps After Testing

If all tests pass:
1. Deploy to staging environment
2. Test with real supplier and product data
3. Perform end-to-end testing with actual stock requests
4. Get feedback from actual vendors
5. Monitor for any issues in production

If tests fail:
1. Check browser console for specific errors
2. Verify all files are saved and compiled
3. Clear browser cache and reload
4. Review error messages for specific issues
5. Report issues with specific test case and error details
