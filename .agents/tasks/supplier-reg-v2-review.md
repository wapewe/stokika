# Supplier Registration Redesign — Mobile-First 5-Step Wizard

Restructures supplier onboarding from a single-scroll form to a mobile-optimized 5-step wizard with product-level data capture, searchable multi-select for counties, and atomic database insertion. The change surfaces supplier capabilities at SKU granularity and eliminates the 47-county checkbox grid that was unusable on mobile.

The old form collected supplier type, categories, and MOQ as free text. The new form collects structured product records (name, SKU, unit, price, MOQ, stock status), searchable county selection, and operational metrics (order capacity, delivery capability, deferred payment terms). Stokika can now match vendors to suppliers based on product availability, delivery coverage, and commercial terms, not just category overlap.

**Watch for:** Product array empty-state validation gap (confirmed), missing deferred payment period validation when enabled (confirmed), searchable multi-select losing selection state on search clear (likely), no duplicate product name+category check at client side (confirmed — only server-side validation exists).

**Verdict**: NEEDS_CHANGES

## High-level view

The wizard replaces a single-scroll form with 5 discrete steps: business profile, products & pricing, coverage & delivery, commercial terms, verification. Each step has independent validation that blocks forward navigation until required fields are complete. Progress is auto-saved to localStorage on every step transition.

Product entry uses an inline add/edit form that populates a card list showing name, category, unit, price, MOQ, and stock status badge. Products are stored as array objects in state, not free text. The form requires at least one product and at least one category before advancing from step 2.

County selection uses a searchable multi-select with live filter, selection chips, and a count badge. The 47-county checkbox grid is gone. Counties served is a required multi-select; stock location county is a required dropdown.

The edge function performs atomic insertion: supplier record, products array (supplier_products table), locations array (supplier_locations table), certifications array (supplier_certifications table). If any insert fails, the function rolls back by deleting already-inserted records. No partial registrations.

Validation happens twice: client-side per-step validation blocks navigation, server-side validation in the edge function rejects malformed payloads. Client validation checks required fields, phone format, and min/max order value consistency. Server validation checks the same plus duplicate phone/email.

The migration removes number_of_employees and the old certifications textarea from the suppliers table. It adds supplier_type, business_registration_status, registration_number, minimum_order_value, maximum_order_value, delivery_capability, and 10+ other operational columns. Four new tables: supplier_products, supplier_volume_pricing (future), supplier_certifications, supplier_locations.

Touch targets meet 44px minimum. All buttons, icons, checkboxes, and radio labels are sized ≥44px. No inline onclick handlers — all event listeners attached in JS. CSS is mobile-first with desktop overrides at 768px.

<details>
<summary>Issues (12)</summary>

1. **Product list empty-state validation gap** — Step 2 validation checks `state.formData.products.length === 0` but never displays the error to the user when products array is empty; the check happens but no error element is rendered in the product list container. Add a form-group wrapper around the product list with an error display target.

2. **Missing deferred payment period validation** — When `deferredPayment` is `yes_agreed` or `yes_after_verification`, step 4 validation checks that `deferredPeriods.length > 0`, but the error is never rendered because there's no form-group wrapper around the checkbox group. Add form-group wrapper and error target.

3. **Categories empty-state validation gap** — Step 2 validation checks `state.formData.categories.length === 0` but the searchable multi-select has no form-group wrapper, so the error-message div is never rendered. Wrap the multi-select in a form-group div.

4. **Counties served empty-state validation gap** — Step 3 validation checks `state.formData.countiesServed.length === 0` but the searchable multi-select has no form-group wrapper. Same issue as categories. Wrap in form-group.

5. **Duplicate product at client side** — `saveProduct()` checks for duplicate product name+category only within the existing products array, but the check happens after the user clicks "Save Product". If they add the same product twice, the second save is blocked with a toast, but the form remains open. Better UX: disable the save button or show inline warning as they type. Alternatively, accept the current behavior as intentional (block on save, keep form open for correction).

6. **Searchable multi-select search clear doesn't reset option display** — When user types in `.sms-search`, options are filtered by setting `display: none` on non-matching options. But there's no logic to restore `display: block` when the search input is cleared. If user types "Nai", sees Nairobi, clears the input, other options stay hidden. Add logic to reset all option display on empty search.

7. **Phone validation too strict for landlines** — `validatePhone()` uses regex `/^(?:\+254|0)[17]\d{8}$/` which only accepts Kenyan mobile (07xx, 01xx). The label says "(Mobile only)" so this is intentional, but supplier businesses may want to provide landline office numbers. Consider allowing landline format or clarifying that mobile-only is a business requirement.

8. **Registration number field hidden by default** — Registration number field is hidden with `style="display:none"` on page load and only shown when businessRegistrationStatus changes. But if user has a draft saved with `businessRegistrationStatus = 'registered_company'`, the field stays hidden until they interact with the dropdown. Fix: run conditional field visibility logic after loading draft.

9. **Delivery details hidden by default** — Delivery method, lead time, fee structure, and minimum order for delivery are wrapped in `#sr-deliveryDetails` which is `display:none` by default. If user has a draft saved with `deliveryCapability = 'yes'`, the fields stay hidden until they click the radio again. Same fix: run conditional visibility logic after loading draft.

10. **Deferred payment details hidden by default** — Same issue as delivery details. If user has draft with `deferredPayment = 'yes_agreed'`, the fields stay hidden. Run conditional visibility logic after loading draft.

11. **Preferred payment method dropdown not populated on draft load** — `updatePreferredPaymentOptions()` is called when user checks a payment method checkbox, but not on draft load. If draft has `paymentMethods = ['mpesa', 'bank_transfer']` and `preferredPaymentMethod = 'mpesa'`, the dropdown will be empty on load. Call `updatePreferredPaymentOptions()` after loading draft.

12. **Product category dropdown not populated on draft load** — `updateProductCategoryOptions()` is called when user selects/deselects a category, but not on draft load. If draft has `categories = ['Fresh Produce', 'Grains']`, the product form's category dropdown will only show "Select category" until user interacts with the categories multi-select. Call `updateProductCategoryOptions()` after loading draft.

</details>

<details>
<summary>Details</summary>

## Step structure and navigation

Five steps, each a `.form-step[data-step="N"]` div. Only one visible at a time via `.active` class. Progress indicator shows 5 circles; completed steps show checkmarks, current step highlighted green.

`handleNext()` saves current step data, validates, advances if no errors. Validation errors stored in `state.validationErrors`, displayed by adding `.error` class to `.form-group` and appending `.error-message` div. Errors cleared on input or successful step advance.

Step navigation scrolls modal to top (`modalContent.scrollTop = 0`).

## Step 1: Business profile validation

Required: businessName, supplierType, businessRegistrationStatus, yearsInBusiness, mainBusinessLocation, contactPerson, phoneNumber.

Phone validation: `/^(?:\+254|0)[17]\d{8}$/` — Kenyan mobile only (07xx, 01xx). Landlines (e.g., `0204000000`) rejected. Label says "(Mobile only)", so this is intentional.

Registration number field conditionally shown when `businessRegistrationStatus !== 'not_registered'`. `setupConditionalFields()` listens to dropdown change event. If user has draft with registered status, field stays hidden until dropdown interaction. Fix: run visibility logic after loading draft.

## Step 2: Product and category management

Required: at least one category, at least one product.

Categories multi-select renders 15 predefined categories as `.sms-option` divs. Click toggles selection, renders chips. Search input filters via `display: none`. Gap: clearing search leaves filtered options hidden. Fix: reset all to `display: block` when search empty.

Product entry form: productName, category (dropdown from selected categories), sku, unitOfMeasure, unitPrice, moq, stockStatus, availableQuantity, productDescription, brand. Required: productName, category, unitOfMeasure, unitPrice, stockStatus.

`updateProductCategoryOptions()` populates product category dropdown from `state.formData.categories`. Called on category select/deselect, not on draft load. If draft has categories, dropdown empty until user interacts.

Products stored as array in `state.formData.products`. Rendered as `.product-card` with name, category, unit, price, MOQ, stock badge.

`saveProduct()` checks duplicate product name+category (case-insensitive name, exact category). If duplicate, shows toast, keeps form open. Form open state allows correction.

Validation checks `categories.length > 0` and `products.length > 0`. Errors never displayed: multi-select and product list not wrapped in `.form-group`.

## Step 3: Coverage and delivery

Required: stockLocationCounty, stockLocationTown, warehouseAddress, at least one county served, deliveryCapability. If delivery enabled (yes/depends): deliveryMethod, deliveryLeadTime, deliveryChargeMethod required.

Counties served: searchable multi-select with 47 Kenyan counties. Old form had 47 checkboxes (unusable on mobile). New multi-select: search input, scrollable list (max-height 240px), chips, count badge. Same search filter gap as categories.

Conditional delivery fields wrapped in `#sr-deliveryDetails`, `display:none` by default. Shown when `deliveryCapability === 'yes' || 'depends'`. If draft has delivery enabled, fields stay hidden until radio interaction. Fix: run visibility logic after loading draft.

Validation checks `countiesServed.length > 0`. Error never displayed: multi-select not wrapped in form-group.

## Step 4: Commercial terms

Required: minimumOrderValue, maximumOrderValue, fulfillmentLeadTime, at least one payment method, preferredPaymentMethod, deferredPayment. If deferred payment enabled (yes_agreed/yes_after_verification): at least one deferredPeriod required.

Validation checks `maximumOrderValue >= minimumOrderValue`. Error displayed on max field if violated.

`updatePreferredPaymentOptions()` populates preferredPaymentMethod dropdown from selected payment methods. Called on checkbox change, not on draft load. If draft has payment methods selected, dropdown empty on load.

Deferred payment fields wrapped in `#sr-deferredDetails`, `display:none` by default. Same visibility issue as delivery fields. Fix: run visibility logic after loading draft.

Validation checks `deferredPeriods.length > 0` when deferred enabled. Error never displayed: checkbox group not wrapped in form-group.

## Step 5: Verification and review

Summary of all steps with edit links (`data-jump="N"`) that call `navigateToStep(N)`. Summary re-renders on every step 5 entry. Four sections: business profile, products & pricing, coverage & delivery, commercial terms.

Optional: business documents (type, number, authority, dates), certifications (KEBS, ISO, Organic, HACCP, other). Stored as arrays in `state.formData.documents` and `state.formData.certifications`.

Required: `termsAccepted` checkbox.

## Form submission and edge function

`handleSubmit()` saves step 5 data, validates, calls `submitRegistration(payload)`.

Edge function performs server-side validation, checks duplicate phone/email, inserts supplier record. Then inserts products, locations, certifications in sequence. If any insert fails, deletes already-inserted records (rollback).

Uses service role key to bypass RLS. RLS policies: authenticated users insert/view own records, service_role full access.

CORS: `Access-Control-Allow-Origin: *`, handles OPTIONS preflight.

Error handling: returns 500 with `{ success: false, message }`. Client checks `data.success`, shows toast. If `window.offlineFormHandler` exists, saves payload locally.

## Mobile-first CSS and touch targets

CSS mobile-first: 320px base, 768px+ desktop overrides. Modal full-screen on mobile (100% width/height, border-radius 0), 640px wide on desktop.

Touch targets: buttons min-height 44px, `.btn-icon` 44px×44px, inputs 0.75rem padding + 1rem font ≈ 44px total, radio/checkbox 18px + label padding ≈ 44px.

Step labels 0.75rem (12px) mobile, 0.625rem (10px) small mobile. Smaller than ideal but acceptable: step circles are primary touch target (40px desktop, 32px mobile).

Navigation buttons flex-direction: column on mobile (full width), side-by-side on desktop.

## LocalStorage draft persistence

`saveDraft()` writes `state.formData` and `state.currentStep` to localStorage on step transition. `loadDraft()` merges localStorage with `state.formData` on modal open. `clearDraft()` clears on successful submission.

Gap: conditional fields (registration number, delivery details, deferred details) and dependent dropdowns (preferred payment, product category) not re-evaluated after loading draft. If draft has conditional fields enabled, they stay hidden until user interaction. Fix: call visibility and population logic after loading draft.

## Validation error display gaps

Four validation checks never display errors: target elements not wrapped in `.form-group`:

1. `categories.length === 0` — searchable multi-select not in form-group.
2. `products.length === 0` — product list not in form-group.
3. `countiesServed.length === 0` — counties multi-select not in form-group.
4. `deferredPeriods.length === 0` — checkbox group not in form-group.

Fix: wrap in `.form-group`, call `displayValidationErrors()` to append `.error-message`.

</details>

## File map

<details>
<summary>Changed files (5)</summary>

- **dalana.html** — Replaced old supplier registration modal with 5-step wizard structure. Added progress indicator, form-step divs, searchable multi-selects, product entry form, document entry form, certification checkboxes, navigation buttons. Linked supplier-registration-v2.css and supplier-registration-v2.js.

- **css/supplier-registration-v2.css** — Mobile-first stylesheet with 44px touch targets, progress indicator styles (step circles, labels, connecting lines), searchable multi-select styles (search input, options list, chips, count badge), product card styles (header, details grid, stock status badges), document card styles, form navigation button styles, conditional field visibility, spinner overlay. Responsive breakpoints at 480px and 768px.

- **js/features/supplier-registration-v2.js** — Form state management, step navigation, per-step validation, product array CRUD, searchable multi-select logic (categories and counties), conditional field visibility (registration number, delivery details, deferred details), preferred payment dropdown population, product category dropdown population, review summary rendering, localStorage draft persistence, Supabase edge function submission, offline handler integration.

- **supabase/migrations/20261016023047_supplier_registration_v2.sql** — Drops number_of_employees and certifications columns. Adds 20+ operational columns to suppliers table. Creates supplier_products, supplier_volume_pricing, supplier_certifications, supplier_locations tables with foreign keys and ON DELETE CASCADE. Creates RLS policies (authenticated insert/select own records, service_role full access, public read service_area locations). Creates indexes on supplier_id, category, stock_status, certification_type, verification_status, county, location_type. Creates updated_at triggers.

- **supabase/functions/supplier-registration-submit/index.ts** — Edge function with CORS handling, payload validation (required fields, categories.length > 0, products.length > 0, countiesServed.length > 0, termsAccepted), duplicate phone/email check, atomic insert (supplier → products → locations → certifications), rollback on failure (deletes supplier if products/locations insert fails), error responses with 400/409/500 status codes.

</details>
