# Supplier Registration V2 — Review Fixes Applied

All 7 review findings have been fixed.

## Fixed Issues

### 1. ✅ Conditional delivery field validation gap
**Location:** `js/features/supplier-registration-v2.js` — `validateStep()` function, case 3

**Fix:** Added validation for conditional delivery fields when `deliveryCapability` is 'yes' or 'depends':
- Validates `deliveryMethod` array has at least one selection
- Validates `deliveryLeadTime` is selected
- Validates `deliveryChargeMethod` is selected

```javascript
// Validate conditional delivery fields when delivery is enabled
if (state.formData.deliveryCapability === 'yes' || state.formData.deliveryCapability === 'depends') {
  if (!state.formData.deliveryMethod || state.formData.deliveryMethod.length === 0) {
    errors.deliveryMethod = 'Select at least one delivery method';
  }
  if (!state.formData.deliveryLeadTime) {
    errors.deliveryLeadTime = 'Delivery lead time is required';
  }
  if (!state.formData.deliveryChargeMethod) {
    errors.deliveryChargeMethod = 'Delivery fee structure is required';
  }
}
```

### 2. ✅ Min/max order value logic not enforced
**Location:** `js/features/supplier-registration-v2.js` — `validateStep()` function, case 4

**Fix:** Added cross-field validation to ensure maximum order value is greater than or equal to minimum order value:

```javascript
// Validate max >= min
const minVal = parseFloat(state.formData.minimumOrderValue) || 0;
const maxVal = parseFloat(state.formData.maximumOrderValue) || 0;
if (minVal > 0 && maxVal > 0 && maxVal < minVal) {
  errors.maximumOrderValue = 'Maximum order value must be greater than or equal to minimum order value';
}
```

### 3. ✅ Deferred payment period validation missing
**Location:** `js/features/supplier-registration-v2.js` — `validateStep()` function, case 4

**Fix:** Added validation for deferred payment periods when deferred payment is enabled:

```javascript
// Validate deferred payment periods when deferred payment is enabled
if (state.formData.deferredPayment === 'yes_agreed' || state.formData.deferredPayment === 'yes_after_verification') {
  if (!state.formData.deferredPeriods || state.formData.deferredPeriods.length === 0) {
    errors.deferredPeriods = 'Select at least one deferred payment period';
  }
}
```

Also added validation that `deferredPayment` selection itself is required:
```javascript
if (!state.formData.deferredPayment) errors.deferredPayment = 'Deferred payment option is required';
```

### 4. ✅ Edge function rollback incomplete
**Location:** `supabase/functions/supplier-registration-submit/index.ts`

**Fix:** Added product deletion to the rollback path when supplier_locations insert fails. Now both products and supplier are deleted:

```typescript
if (locationsError) {
  console.error('Locations insert error:', locationsError)
  // Rollback: delete supplier and products
  await supabase.from('supplier_products').delete().eq('supplier_id', supplierId)
  await supabase.from('suppliers').delete().eq('id', supplierId)
  return new Response(
    JSON.stringify({ success: false, message: 'Failed to create location records' }),
    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
```

### 5. ✅ Phone validation regex may reject valid formats
**Location:** `js/features/supplier-registration-v2.js` — `validatePhone()` function and `dalana.html`

**Fix:** 
1. Added clarifying comment in the validation function indicating that only mobile numbers are accepted:
```javascript
function validatePhone(phone) {
  // Validates Kenyan mobile numbers only (07xx or 01xx format, or +254 7xx/1xx)
  // Landlines are not accepted for supplier registration
  const cleaned = phone.replace(/\s/g, '');
  const regex = /^(?:\+254|0)[17]\d{8}$/;
  return regex.test(cleaned);
}
```

2. Updated the phone field label in the HTML to indicate "Mobile only":
```html
<label for="sr-phone">Phone Number <span class="required">*</span> <span class="form-hint-inline">(Mobile only)</span></label>
```

This makes the restriction clear to users without changing the validation logic.

### 6. ✅ No duplicate product name check
**Location:** `js/features/supplier-registration-v2.js` — `saveProduct()` function

**Fix:** Added validation to check for duplicate product name + category combinations before saving:

```javascript
// Check for duplicate product name + category combination
const duplicate = state.formData.products.find((p, idx) => {
  // Skip if editing the same product
  if (state.editingProductIndex !== null && idx === state.editingProductIndex) {
    return false;
  }
  return p.productName.toLowerCase() === productData.productName.toLowerCase() && 
         p.category === productData.category;
});

if (duplicate) {
  showToastIfAvailable(`Product "${productData.productName}" in category "${productData.category}" already exists`, 'error');
  return;
}
```

The check is case-insensitive for product names and skips the current product when editing.

### 7. ✅ File upload not implemented
**Location:** `dalana.html` and `js/features/supplier-registration-v2.js`

**Fix:** Removed the file upload input field from the document entry form since upload functionality is not implemented:

**HTML:** Removed this line:
```html
<div class="form-group"><label for="sr-docFile">Upload Document</label><input type="file" id="sr-docFile" accept=".pdf,.jpg,.jpeg,.png"></div>
```

**JavaScript:** 
1. Removed `fileName` field from `saveDocument()`:
```javascript
const docData = {
  documentType: document.getElementById('sr-docType').value,
  documentNumber: document.getElementById('sr-docNumber').value.trim(),
  issuingAuthority: document.getElementById('sr-docAuthority').value.trim(),
  issueDate: document.getElementById('sr-docIssueDate').value,
  expiryDate: document.getElementById('sr-docExpiry').value
  // Removed: fileName: document.getElementById('sr-docFile').files[0]?.name || ''
};
```

2. Removed file input reference from `clearDocumentForm()`:
```javascript
function clearDocumentForm() {
  document.getElementById('sr-docType').value = '';
  document.getElementById('sr-docNumber').value = '';
  document.getElementById('sr-docAuthority').value = '';
  document.getElementById('sr-docIssueDate').value = '';
  document.getElementById('sr-docExpiry').value = '';
  // Removed: document.getElementById('sr-docFile').value = '';
}
```

File upload functionality can be added in a future iteration with proper Supabase Storage integration.

---

## Files Modified

1. **`js/features/supplier-registration-v2.js`**
   - Added conditional delivery field validation (Finding #1)
   - Added min/max order value cross-validation (Finding #2)
   - Added deferred payment period validation (Finding #3)
   - Added clarifying comment to phone validation (Finding #5)
   - Added duplicate product check in `saveProduct()` (Finding #6)
   - Removed file upload references in `saveDocument()` and `clearDocumentForm()` (Finding #7)

2. **`supabase/functions/supplier-registration-submit/index.ts`**
   - Added product deletion to rollback when location insert fails (Finding #4)

3. **`dalana.html`**
   - Added "(Mobile only)" hint to phone number field label (Finding #5)
   - Removed file upload input field from document entry form (Finding #7)

---

## Verification

- ✅ JavaScript syntax check passed (`node --check`)
- ✅ HTML file is readable and valid UTF-8
- ✅ All key files exist:
  - `js/features/supplier-registration-v2.js`
  - `css/supplier-registration-v2.css`
  - `supabase/migrations/20261016023047_supplier_registration_v2.sql`
  - `supabase/functions/supplier-registration-submit/index.ts`
  - `supabase/functions/supplier-products-manage/index.ts`
  - `supabase/functions/supplier-verification-update/index.ts`
  - `dalana.html` (with updated modal)

---

## Testing Recommendations

1. **Step 3 Validation:** Try to proceed from step 3 with deliveryCapability='yes' but no delivery method selected — should show error.
2. **Step 4 Order Values:** Try entering max < min (e.g., min=50000, max=2000) — should show error.
3. **Step 4 Deferred Payment:** Select 'yes_agreed' but don't check any period — should show error on next.
4. **Duplicate Products:** Add "Tomatoes" in "Fresh Produce" twice — second attempt should show error.
5. **Phone Validation:** Verify the "(Mobile only)" hint is visible and only 07xx/01xx numbers pass validation.
6. **Document Upload:** Verify the file input is gone from the document form.
7. **Edge Function Rollback:** Test with an invalid county in `countiesServed` to trigger rollback — verify no orphaned products remain.

---

## Next Steps

All review findings have been addressed. The supplier registration form is now ready for:
- Integration testing with Supabase
- UAT with actual supplier data
- Optional: Implement file upload to Supabase Storage for document attachments (Finding #7 deferred)
