# Supplier Registration V2 - Implementation Plan

## Overview

Replace the single-scroll supplier registration modal in dalana.html with a mobile-optimized 5-step wizard that structures data at product/SKU level and collects operational metrics for supplier matching.

## Architecture Decisions

### Database Design
**Decision**: Create normalized tables for products, certifications, and locations rather than storing as JSON or TEXT.
**Rationale**: Enables efficient querying for product-level matching, supports structured price/availability tracking, and allows future analytics on supplier capacity and coverage patterns.

### Edge Functions vs Client-Side Validation
**Decision**: Use a server-side edge function (supplier-registration-submit) to handle atomic multi-table inserts in a transaction.
**Rationale**: Ensures data integrity across suppliers, supplier_products, supplier_certifications, and supplier_locations tables. Client-side code can fail mid-submission; the transaction boundary in Postgres prevents orphaned records.

### Multi-Select Implementation
**Decision**: Implement searchable multi-select with chips using vanilla JS (no external libraries).
**Rationale**: The existing codebase uses no external UI frameworks (verified in dalana.html head). Introducing Select2 or similar violates the project's no-dependency approach and adds CSP complexity.

### Form State Persistence
**Decision**: Auto-save draft state to localStorage on every step completion, integrated with existing offline-form-handler.js.
**Rationale**: Supplier registration is lengthy (5 steps, product list building). Network loss or accidental close should not lose progress. The project already implements offline-form-handler.js for vendor registration; we extend the pattern.

### CSS Architecture
**Decision**: Single new CSS file (supplier-registration-v2.css) with mobile-first progressive enhancement, loaded after existing modal CSS.
**Rationale**: The existing vendor modal uses css/vendor-registration-modal.css, css/modern-modal-design.css, css/stokika-vendor-modal.css, css/vendor-modal-master-fix.css, css/vendor-payment-step.css, and css/mobile-modal-fix.css (verified in dalana.html lines 42-48). Adding one more CSS file is consistent; overriding rules in existing files risks breaking vendor registration.

## Database Schema Changes

### Migration File: `supabase/migrations/20260127000001_supplier_registration_v2_schema.sql`

Create with timestamp prefix following project convention (verified: most recent migration is `verify_20260125000003_generate_supervisor_code_function.sql`).

**Tables to create:**

1. **supplier_products**
   - `id UUID PRIMARY KEY DEFAULT uuid_generate_v4()`
   - `supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE`
   - `product_name VARCHAR(255) NOT NULL`
   - `category VARCHAR(100) NOT NULL`
   - `sku VARCHAR(100)` (optional)
   - `unit_of_measure VARCHAR(50) NOT NULL` (Piece, Kg, Bag, Box, Carton, Crate, Dozen, Litre, Pack, Bundle)
   - `unit_price DECIMAL(10,2) NOT NULL`
   - `moq INTEGER NOT NULL` (minimum order quantity)
   - `available_quantity INTEGER` (optional, for stock visibility)
   - `stock_status VARCHAR(30) NOT NULL` (in_stock, limited_stock, out_of_stock, made_to_order) with CHECK constraint
   - `product_description TEXT`
   - `brand VARCHAR(100)`
   - `has_volume_pricing BOOLEAN DEFAULT false` (future feature flag)
   - `created_at TIMESTAMPTZ DEFAULT NOW()`
   - `updated_at TIMESTAMPTZ DEFAULT NOW()`
   - **Indexes**: `idx_supplier_products_supplier_id`, `idx_supplier_products_category`, `idx_supplier_products_stock_status`
   - **RLS**: Enable with policies: public cannot read (admin/supplier-only access), suppliers can only see their own products

2. **supplier_volume_pricing** (future-proofing for tiered pricing)
   - `id UUID PRIMARY KEY DEFAULT uuid_generate_v4()`
   - `product_id UUID REFERENCES supplier_products(id) ON DELETE CASCADE`
   - `min_quantity INTEGER NOT NULL`
   - `max_quantity INTEGER` (null for open-ended top tier)
   - `unit_price DECIMAL(10,2) NOT NULL`
   - `created_at TIMESTAMPTZ DEFAULT NOW()`
   - **Indexes**: `idx_volume_pricing_product_id`
   - **RLS**: Enable with admin/supplier-only policies

3. **supplier_certifications**
   - `id UUID PRIMARY KEY DEFAULT uuid_generate_v4()`
   - `supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE`
   - `certification_type VARCHAR(100) NOT NULL` (KEBS, ISO, Organic, HACCP, Business Registration, Trading License, Tax Compliance, Permit, Other)
   - `certification_number VARCHAR(100)`
   - `issuing_authority VARCHAR(255)`
   - `issue_date DATE`
   - `expiry_date DATE`
   - `document_url VARCHAR(500)` (Supabase Storage path)
   - `verification_status VARCHAR(50) DEFAULT 'pending'` (pending, verified, expired, rejected)
   - `created_at TIMESTAMPTZ DEFAULT NOW()`
   - `updated_at TIMESTAMPTZ DEFAULT NOW()`
   - **Indexes**: `idx_supplier_certifications_supplier_id`, `idx_supplier_certifications_type`, `idx_supplier_certifications_verification_status`
   - **RLS**: Enable with admin/supplier-only policies

4. **supplier_locations**
   - `id UUID PRIMARY KEY DEFAULT uuid_generate_v4()`
   - `supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE`
   - `location_type VARCHAR(30) NOT NULL DEFAULT 'service_area'` (stock_location, service_area)
   - `county VARCHAR(100) NOT NULL`
   - `town VARCHAR(255)`
   - `is_primary BOOLEAN DEFAULT false` (one primary stock location per supplier)
   - `created_at TIMESTAMPTZ DEFAULT NOW()`
   - **Indexes**: `idx_supplier_locations_supplier_id`, `idx_supplier_locations_county`, `idx_supplier_locations_type`
   - **RLS**: Enable with public read (for matching), admin/supplier write

**ALTER TABLE suppliers:** (existing columns verified in config/complete-database-schema.sql lines 168-191)

Remove obsolete columns:
- `DROP COLUMN IF EXISTS number_of_employees`
- `DROP COLUMN IF EXISTS certifications` (migrated to supplier_certifications table)
- `DROP COLUMN IF EXISTS minimum_order_quantity` (moved to product level)

Add new operational columns:
- `supplier_type VARCHAR(50)` (Manufacturer, Wholesaler, Distributor, Importer, Producer/Farmer, Retailer, Cooperative, Service Provider, Other)
- `business_registration_status VARCHAR(50)` (Registered Company, Sole Proprietorship, Partnership, Cooperative, Not Yet Registered, Other)
- `main_business_location TEXT`
- `minimum_order_value DECIMAL(10,2)` (aggregate order minimum in KSh)
- `maximum_order_value DECIMAL(10,2)` (typical maximum capacity in KSh)
- `delivery_capability VARCHAR(30)` (yes, no, depends_on_order_size)
- `delivery_method TEXT` (comma-separated: own_vehicle, third_party_courier, stokika_logistics, customer_pickup)
- `delivery_lead_time VARCHAR(50)` (same_day, next_day, 2_3_days, 4_7_days, 7_plus_days, depends)
- `delivery_charge_method VARCHAR(100)` (free, fixed_fee, by_location, by_order_value)
- `minimum_order_for_delivery DECIMAL(10,2)`
- `accepts_deferred_payment BOOLEAN DEFAULT false`
- `deferred_payment_terms TEXT` (JSON: {periods: [7,14,30], conditions: "text"})
- `preferred_contact_method VARCHAR(50)` (phone, email, whatsapp, sms)
- `verification_status VARCHAR(50) DEFAULT 'pending'` (pending, verified, rejected)
- `stock_location_county VARCHAR(100)`
- `stock_location_town VARCHAR(255)`
- `warehouse_address TEXT`
- `alternative_contact_name VARCHAR(255)`
- `alternative_contact_phone VARCHAR(20)`
- `fulfillment_lead_time VARCHAR(50)` (order processing time)

**RLS Policies:**
- Enable RLS on all new tables
- Public can INSERT on suppliers (registration submissions)
- Public cannot read supplier_products, supplier_certifications (admin/authenticated supplier-only)
- Public can read supplier_locations with location_type='service_area' (for vendor matching)
- Admin full CRUD on all tables
- Authenticated suppliers can SELECT/UPDATE their own records only

**Triggers:**
- `update_suppliers_updated_at` (already exists, extend to new tables)
- `update_supplier_products_updated_at BEFORE UPDATE ON supplier_products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`
- `update_supplier_certifications_updated_at BEFORE UPDATE ON supplier_certifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`

## Edge Functions

### 1. `supabase/functions/supplier-registration-submit/index.ts`

**Purpose**: Atomic multi-table insert for new supplier registration.

**Input payload** (POST body):
```typescript
{
  // Step 1: Business Profile
  companyName: string;
  supplierType: string;
  businessRegistrationStatus: string;
  registrationNumber?: string;
  yearsInBusiness: string;
  mainBusinessLocation: string;
  contactPerson: string;
  phone: string;
  email?: string;
  alternativeContactName?: string;
  alternativeContactPhone?: string;
  
  // Step 2: Products & Pricing
  categories: string[]; // legacy field, keep for backwards compat
  products: Array<{
    productName: string;
    category: string;
    sku?: string;
    unitOfMeasure: string;
    unitPrice: number;
    moq: number;
    stockStatus: string;
    availableQuantity?: number;
    productDescription?: string;
    brand?: string;
  }>;
  
  // Step 3: Coverage & Delivery
  stockLocationCounty: string;
  stockLocationTown: string;
  warehouseAddress: string;
  countiesServed: string[];
  townsServedByCounty?: Record<string, string>; // {countyName: "town1, town2"}
  deliveryCapability: string;
  deliveryMethod?: string[];
  deliveryLeadTime?: string;
  deliveryChargeMethod?: string;
  minimumOrderForDelivery?: number;
  
  // Step 4: Supply & Commercial Terms
  minimumOrderValue: number;
  maximumOrderValue: number;
  fulfillmentLeadTime: string;
  paymentMethods: string[]; // legacy payment_terms field
  preferredPaymentMethod: string;
  acceptsDeferredPayment: boolean;
  deferredPaymentPeriods?: number[];
  deferredPaymentConditions?: string;
  preferredContactMethod: string;
  
  // Step 5: Verification
  certifications?: Array<{
    certificationType: string;
    certificationNumber?: string;
    issuingAuthority?: string;
    issueDate?: string;
    expiryDate?: string;
    documentUrl?: string;
  }>;
  termsAccepted: boolean;
}
```

**Processing logic**:
1. Validate required fields (companyName, phone, supplierType, etc.)
2. Validate at least 1 product in products array
3. Begin Postgres transaction
4. INSERT INTO suppliers (map fields, set status='pending', verification_status='pending')
5. Get supplier.id from insert
6. INSERT INTO supplier_products (batch insert all products with supplier_id)
7. INSERT INTO supplier_locations:
   - One row with location_type='stock_location', county=stockLocationCounty, town=stockLocationTown, is_primary=true
   - N rows with location_type='service_area', one per county in countiesServed
8. INSERT INTO supplier_certifications (batch insert if certifications array exists)
9. COMMIT transaction
10. Return `{success: true, supplierId: UUID, message: "Registration submitted successfully"}`

**Error handling**:
- Validation errors: return 400 with `{success: false, errors: [{field, message}]}`
- Database errors: ROLLBACK, return 500 with generic message (log details server-side)
- Duplicate phone/email: return 409 with `{success: false, message: "Supplier with this phone/email already exists"}`

**CORS**: Allow origin from SUPABASE_CONFIG.url or `*` for anon key calls.

**Authentication**: Allow anon (public registration). RLS policies enforce INSERT-only access.

### 2. `supabase/functions/supplier-products-manage/index.ts`

**Purpose**: CRUD operations for supplier_products (future dashboard feature).

**Methods**:
- `GET /?supplier_id=UUID` - List products for a supplier
- `POST /` - Add a product (body: {supplier_id, productName, category, ...})
- `PUT /:id` - Update a product
- `DELETE /:id` - Soft delete or hard delete a product

**Authentication**: Require authenticated user, verify user owns supplier_id (via suppliers.user_id).

**Note**: This function supports future supplier dashboard. Not required for initial registration flow.

### 3. `supabase/functions/supplier-verification-update/index.ts`

**Purpose**: Admin endpoint to update verification_status on suppliers and supplier_certifications.

**Input**:
```typescript
{
  supplierId: string;
  verificationStatus: 'verified' | 'rejected';
  rejectionReason?: string;
  certificationUpdates?: Array<{
    certificationId: string;
    verificationStatus: 'verified' | 'expired' | 'rejected';
  }>;
}
```

**Processing**:
1. Verify caller is admin (check auth.jwt() role)
2. UPDATE suppliers SET verification_status=?, status=('approved' if verified, else 'rejected')
3. If certificationUpdates provided, UPDATE supplier_certifications for each
4. Return `{success: true}`

**Authentication**: Authenticated, role=admin.

**Note**: Admin feature, not required for supplier-facing registration.

## Frontend: CSS

### File: `css/supplier-registration-v2.css`

**Mobile-first architecture**:
- Base styles assume mobile (<= 768px)
- Desktop enhancements in `@media (min-width: 769px)`
- All touch targets >= 44px (WCAG 2.1 Level AAA)
- Focus indicators 2px solid #10b981 with 2px offset

**Key component styles**:

1. **Progress Indicator**
   - Fixed top position (desktop) or sticky top (mobile)
   - 5 circle nodes with connecting lines
   - Active step: filled green circle, bold text
   - Completed step: green checkmark icon, green text
   - Pending step: gray outline circle, gray text
   - Mobile: smaller circles (32px), stacked labels below 480px

2. **Step Container**
   - `.supplier-step` - display:none by default, `.active` shows
   - Slide-in transition: `translateX(100%)` → `translateX(0)` on forward nav, reverse on back
   - Padding: 1.5rem mobile, 2rem desktop
   - Each step has `.step-header` (title + description) and `.step-body` (form fields)

3. **Form Fields**
   - `.form-group` - margin-bottom: 1.25rem
   - `label` - display:block, margin-bottom:0.5rem, font-weight:600, color:#1e293b
   - Required indicator: red asterisk `content:"*"` pseudo-element
   - `input[type="text"], input[type="email"], input[type="tel"], input[type="number"], select, textarea` - full width, padding:0.75rem, border:1px solid #cbd5e1, border-radius:8px, font-size:1rem, transition on focus
   - Focus state: border-color:#10b981, box-shadow:0 0 0 3px rgba(16,185,129,0.1)
   - Error state: `.form-group.error input` - border-color:#ef4444, background:#fef2f2
   - `.error-message` - color:#ef4444, font-size:0.875rem, margin-top:0.25rem

4. **Searchable Multi-Select (Counties)**
   - `.multi-select-container` - position:relative
   - `.multi-select-input` - input field with search icon, placeholder "Search counties..."
   - `.multi-select-dropdown` - position:absolute, top:100%, width:100%, max-height:240px, overflow-y:auto, background:white, border:1px solid #cbd5e1, border-radius:8px, box-shadow:0 4px 12px rgba(0,0,0,0.1), z-index:100
   - `.multi-select-option` - padding:0.75rem, cursor:pointer, hover background:#f1f5f9, selected (checkbox checked) background:#d1fae5, font-weight:600
   - `.selected-chips` - display:flex, flex-wrap:wrap, gap:0.5rem, margin-top:0.5rem
   - `.chip` - background:#10b981, color:white, padding:0.375rem 0.75rem, border-radius:16px, font-size:0.875rem, display:inline-flex, align-items:center, gap:0.25rem
   - `.chip-remove` - cursor:pointer, font-weight:bold, hover:opacity:0.8

5. **Product Cards**
   - `.product-list` - display:flex, flex-direction:column, gap:1rem
   - `.product-card` - border:1px solid #cbd5e1, border-radius:12px, padding:1rem, background:#f9fafb, hover border-color:#10b981
   - `.product-card-header` - display:flex, justify-content:space-between, align-items:start
   - `.product-name` - font-weight:600, font-size:1rem, color:#1e293b
   - `.product-actions` - display:flex, gap:0.5rem (Edit and Delete icon buttons, 44px touch targets)
   - `.product-details` - margin-top:0.75rem, display:grid, grid-template-columns:repeat(auto-fit, minmax(120px, 1fr)), gap:0.5rem
   - `.product-detail-item` - font-size:0.875rem, `.label` (color:#64748b), `.value` (font-weight:600, color:#1e293b)
   - `.add-product-button` - width:100%, padding:0.875rem, border:2px dashed #cbd5e1, background:transparent, color:#64748b, border-radius:8px, font-weight:600, cursor:pointer, hover border-color:#10b981, hover color:#10b981, min-height:44px

6. **Product Modal** (for adding/editing products)
   - `.product-modal-overlay` - fixed, inset:0, background:rgba(0,0,0,0.5), z-index:1000, display:flex, align-items:center, justify-content:center
   - `.product-modal` - background:white, border-radius:16px, width:90%, max-width:600px, max-height:90vh, overflow-y:auto, padding:2rem mobile / 2.5rem desktop
   - `.modal-close-button` - position:absolute, top:1rem, right:1rem, 36px×36px, cursor:pointer

7. **Bottom Navigation Bar**
   - `.form-navigation` - position:sticky bottom:0 (mobile), static (desktop), background:white, border-top:1px solid #e2e8f0, padding:1rem, display:flex, justify-content:space-between, gap:1rem, z-index:50
   - `.btn-previous` - padding:0.875rem 1.5rem, background:white, border:1px solid #cbd5e1, color:#475569, font-weight:600, border-radius:8px, cursor:pointer, hover background:#f8fafc, min-height:44px, min-width:100px
   - `.btn-next, .btn-submit` - padding:0.875rem 1.5rem, background:#10b981, color:white, border:none, font-weight:600, border-radius:8px, cursor:pointer, hover background:#059669, disabled background:#cbd5e1, disabled cursor:not-allowed, min-height:44px, min-width:100px
   - Mobile: buttons full width in column layout when screen < 480px

8. **Step 5: Review Summary**
   - `.summary-section` - margin-bottom:2rem, border:1px solid #e2e8f0, border-radius:12px, padding:1.5rem
   - `.summary-section-title` - font-size:1.25rem, font-weight:700, color:#1e293b, margin-bottom:1rem, display:flex, justify-content:space-between, `.edit-link` (color:#10b981, cursor:pointer, font-size:0.875rem, "Edit" button to jump back)
   - `.summary-row` - display:flex, margin-bottom:0.75rem, `.label` (flex:0 0 40%, color:#64748b, font-size:0.875rem), `.value` (flex:1, color:#1e293b, font-weight:500)
   - `.product-summary-list` - similar to product-card, but read-only, no action buttons

9. **Loading Spinner**
   - `.spinner-overlay` - fixed inset:0, background:rgba(255,255,255,0.9), z-index:2000, display:flex, flex-direction:column, align-items:center, justify-content:center
   - `.spinner` - 48px circle, border:4px solid #e2e8f0, border-top-color:#10b981, animation:spin 0.8s linear infinite
   - `@keyframes spin` - rotate 360deg

10. **Responsive Breakpoints**
    - < 480px: Single column, full-width buttons, smaller typography
    - 480px - 768px: Standard mobile, 2-column product details grid
    - > 768px: Desktop layout, max-width:900px modal content, side-by-side navigation buttons, larger progress indicator

## Frontend: JavaScript

### File: `js/features/supplier-registration-v2.js`

**Module structure** (IIFE to avoid global pollution):

```javascript
(function() {
  'use strict';
  
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const state = {
    currentStep: 1,
    totalSteps: 5,
    formData: {
      // Step 1
      companyName: '',
      supplierType: '',
      businessRegistrationStatus: '',
      registrationNumber: '',
      yearsInBusiness: '',
      mainBusinessLocation: '',
      contactPerson: '',
      phone: '',
      email: '',
      alternativeContactName: '',
      alternativeContactPhone: '',
      // Step 2
      categories: [],
      products: [], // [{id: tempId, productName, category, sku, unitOfMeasure, unitPrice, moq, stockStatus, availableQuantity, productDescription, brand}]
      // Step 3
      stockLocationCounty: '',
      stockLocationTown: '',
      warehouseAddress: '',
      countiesServed: [],
      townsServedByCounty: {},
      deliveryCapability: '',
      deliveryMethod: [],
      deliveryLeadTime: '',
      deliveryChargeMethod: '',
      minimumOrderForDelivery: '',
      // Step 4
      minimumOrderValue: '',
      maximumOrderValue: '',
      fulfillmentLeadTime: '',
      paymentMethods: [],
      preferredPaymentMethod: '',
      acceptsDeferredPayment: false,
      deferredPaymentPeriods: [],
      deferredPaymentConditions: '',
      preferredContactMethod: '',
      // Step 5
      certifications: [], // [{id: tempId, certificationType, certificationNumber, issuingAuthority, issueDate, expiryDate, documentUrl}]
      termsAccepted: false
    },
    editingProductId: null, // non-null when product modal is in edit mode
    validationErrors: {}
  };
  
  const KENYA_COUNTIES = [
    'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo-Marakwet', 'Embu', 'Garissa',
    'Homa Bay', 'Isiolo', 'Kajiado', 'Kakamega', 'Kericho', 'Kiambu', 'Kilifi',
    'Kirinyaga', 'Kisii', 'Kisumu', 'Kitui', 'Kwale', 'Laikipia', 'Lamu', 'Machakos',
    'Makueni', 'Mandera', 'Marsabit', 'Meru', 'Migori', 'Mombasa', 'Murang\'a',
    'Nairobi', 'Nakuru', 'Nandi', 'Narok', 'Nyamira', 'Nyandarua', 'Nyeri',
    'Samburu', 'Siaya', 'Taita-Taveta', 'Tana River', 'Tharaka-Nithi', 'Trans Nzoia',
    'Turkana', 'Uasin Gishu', 'Vihiga', 'Wajir', 'West Pokot'
  ];
  
  const PRODUCT_CATEGORIES = [
    'Fresh Produce', 'Grains & Cereals', 'Dairy Products', 'Meat & Poultry',
    'Household Items', 'Electronics', 'Clothing & Textiles', 'Building Materials',
    'Stationery & Office Supplies', 'Beauty & Personal Care',
    'Pharmaceuticals & Health', 'Agricultural Inputs', 'Automotive Parts',
    'Food & Beverages', 'Other'
  ];
  
  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  
  function init() {
    const modal = document.getElementById('supplierRegistrationModal');
    if (!modal) {
      console.warn('[Supplier Reg V2] Modal not found');
      return;
    }
    
    console.log('[Supplier Reg V2] Initializing...');
    
    // Load draft from localStorage
    loadDraft();
    
    // Setup event listeners
    setupNavigationButtons();
    setupFormInputListeners();
    setupMultiSelectCounties('countiesServed', 'countiesServedChips', 'countiesServedDropdown');
    setupProductListUI();
    setupCertificationListUI();
    setupConditionalFields();
    setupModalClose();
    setupFormSubmit();
    
    // Render initial step
    renderStep(state.currentStep);
    updateProgressIndicator();
    
    console.log('[Supplier Reg V2] Initialized');
  }
  
  // ============================================================================
  // NAVIGATION
  // ============================================================================
  
  function setupNavigationButtons() {
    document.querySelectorAll('[data-supplier-nav]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.target.dataset.supplierNav;
        if (action === 'next') handleNext();
        else if (action === 'prev') handlePrevious();
        else if (action === 'submit') handleSubmit();
        else if (action.startsWith('jump-')) {
          const targetStep = parseInt(action.split('-')[1], 10);
          if (targetStep < state.currentStep) { // can only jump back
            navigateToStep(targetStep);
          }
        }
      });
    });
  }
  
  function handleNext() {
    // Validate current step
    const errors = validateStep(state.currentStep);
    if (Object.keys(errors).length > 0) {
      state.validationErrors = errors;
      displayValidationErrors();
      showToast('Please fix the errors before continuing', 'error');
      return;
    }
    
    // Clear errors
    state.validationErrors = {};
    clearValidationErrors();
    
    // Save step data
    saveStepData(state.currentStep);
    saveDraft();
    
    // Navigate
    if (state.currentStep < state.totalSteps) {
      navigateToStep(state.currentStep + 1);
    }
  }
  
  function handlePrevious() {
    if (state.currentStep > 1) {
      navigateToStep(state.currentStep - 1);
    }
  }
  
  function navigateToStep(stepNumber) {
    const prevStep = state.currentStep;
    state.currentStep = stepNumber;
    
    // Slide transition
    const allSteps = document.querySelectorAll('.supplier-step');
    const currentStepEl = document.querySelector(\`.supplier-step[data-step="\${prevStep}"]\`);
    const nextStepEl = document.querySelector(\`.supplier-step[data-step="\${stepNumber}"]\`);
    
    if (currentStepEl) currentStepEl.classList.remove('active');
    if (nextStepEl) {
      nextStepEl.classList.add('active');
      // Populate fields from state
      populateStepFields(stepNumber);
    }
    
    updateProgressIndicator();
    updateNavigationButtons();
    
    // Scroll to top
    const modalContent = document.querySelector('.modal-content.supplier-registration-v2');
    if (modalContent) modalContent.scrollTop = 0;
  }
  
  function renderStep(stepNumber) {
    document.querySelectorAll('.supplier-step').forEach(el => el.classList.remove('active'));
    const stepEl = document.querySelector(\`.supplier-step[data-step="\${stepNumber}"]\`);
    if (stepEl) {
      stepEl.classList.add('active');
      populateStepFields(stepNumber);
    }
  }
  
  function updateProgressIndicator() {
    for (let i = 1; i <= state.totalSteps; i++) {
      const node = document.querySelector(\`.progress-step[data-step="\${i}"]\`);
      if (!node) continue;
      
      if (i < state.currentStep) {
        node.classList.add('completed');
        node.classList.remove('active');
      } else if (i === state.currentStep) {
        node.classList.add('active');
        node.classList.remove('completed');
      } else {
        node.classList.remove('active', 'completed');
      }
    }
  }
  
  function updateNavigationButtons() {
    const prevBtn = document.querySelector('[data-supplier-nav="prev"]');
    const nextBtn = document.querySelector('[data-supplier-nav="next"]');
    const submitBtn = document.querySelector('[data-supplier-nav="submit"]');
    
    if (prevBtn) prevBtn.style.display = state.currentStep === 1 ? 'none' : 'inline-block';
    if (nextBtn) nextBtn.style.display = state.currentStep === state.totalSteps ? 'none' : 'inline-block';
    if (submitBtn) submitBtn.style.display = state.currentStep === state.totalSteps ? 'inline-block' : 'none';
  }
  
  // ============================================================================
  // FORM DATA MANAGEMENT
  // ============================================================================
  
  function setupFormInputListeners() {
    const form = document.getElementById('supplierRegistrationFormV2');
    if (!form) return;
    
    form.addEventListener('input', (e) => {
      const input = e.target;
      if (input.type === 'checkbox' && input.name === 'categories') {
        updateCategoriesArray();
      } else if (input.type === 'checkbox' && input.name === 'paymentMethods') {
        updatePaymentMethodsArray();
      } else if (input.type === 'checkbox' && input.name === 'deliveryMethod') {
        updateDeliveryMethodArray();
      } else if (input.type === 'checkbox' && input.name === 'deferredPaymentPeriods') {
        updateDeferredPaymentPeriodsArray();
      } else if (input.name === 'termsAccepted') {
        state.formData.termsAccepted = input.checked;
      } else {
        state.formData[input.name] = input.value;
      }
      
      // Clear validation error on edit
      if (state.validationErrors[input.name]) {
        delete state.validationErrors[input.name];
        clearFieldError(input.name);
      }
    });
  }
  
  function saveStepData(stepNumber) {
    // Data is already saved to state via input listeners
    // This function can be used for additional step-specific processing
  }
  
  function populateStepFields(stepNumber) {
    if (stepNumber === 5) {
      renderReviewSummary();
    }
    // Fields are pre-populated via state on page load; this function handles dynamic rendering
  }
  
  // ============================================================================
  // VALIDATION
  // ============================================================================
  
  function validateStep(stepNumber) {
    const errors = {};
    
    switch(stepNumber) {
      case 1:
        if (!state.formData.companyName?.trim()) errors.companyName = 'Company name is required';
        if (!state.formData.supplierType) errors.supplierType = 'Supplier type is required';
        if (!state.formData.businessRegistrationStatus) errors.businessRegistrationStatus = 'Registration status is required';
        if (state.formData.businessRegistrationStatus !== 'Not Yet Registered' && !state.formData.registrationNumber?.trim()) {
          errors.registrationNumber = 'Registration number is required for registered businesses';
        }
        if (!state.formData.yearsInBusiness) errors.yearsInBusiness = 'Years in business is required';
        if (!state.formData.mainBusinessLocation?.trim()) errors.mainBusinessLocation = 'Main business location is required';
        if (!state.formData.contactPerson?.trim()) errors.contactPerson = 'Contact person is required';
        if (!state.formData.phone?.trim()) errors.phone = 'Phone number is required';
        else if (!validatePhone(state.formData.phone)) errors.phone = 'Invalid phone format (use +254XXXXXXXXX or 07XXXXXXXX)';
        break;
        
      case 2:
        if (state.formData.categories.length === 0) errors.categories = 'Select at least one category';
        if (state.formData.products.length === 0) errors.products = 'Add at least one product';
        break;
        
      case 3:
        if (!state.formData.stockLocationCounty) errors.stockLocationCounty = 'Stock location county is required';
        if (!state.formData.stockLocationTown?.trim()) errors.stockLocationTown = 'Stock location town is required';
        if (!state.formData.warehouseAddress?.trim()) errors.warehouseAddress = 'Warehouse address is required';
        if (state.formData.countiesServed.length === 0) errors.countiesServed = 'Select at least one county served';
        if (!state.formData.deliveryCapability) errors.deliveryCapability = 'Delivery capability is required';
        if ((state.formData.deliveryCapability === 'yes' || state.formData.deliveryCapability === 'depends') && state.formData.deliveryMethod.length === 0) {
          errors.deliveryMethod = 'Select at least one delivery method';
        }
        break;
        
      case 4:
        if (!state.formData.minimumOrderValue || state.formData.minimumOrderValue <= 0) errors.minimumOrderValue = 'Minimum order value is required';
        if (!state.formData.maximumOrderValue || state.formData.maximumOrderValue <= 0) errors.maximumOrderValue = 'Maximum order value is required';
        if (state.formData.paymentMethods.length === 0) errors.paymentMethods = 'Select at least one payment method';
        if (!state.formData.preferredPaymentMethod) errors.preferredPaymentMethod = 'Preferred payment method is required';
        break;
        
      case 5:
        if (!state.formData.termsAccepted) errors.termsAccepted = 'You must accept the terms and conditions';
        break;
    }
    
    return errors;
  }
  
  function validatePhone(phone) {
    // Kenya format: +254XXXXXXXXX or 07XXXXXXXX or 01XXXXXXXX
    const regex = /^(?:\+254|0)[17]\d{8}$/;
    return regex.test(phone.replace(/\s/g, ''));
  }
  
  function displayValidationErrors() {
    Object.keys(state.validationErrors).forEach(field => {
      const input = document.querySelector(\`[name="\${field}"]\`);
      if (!input) return;
      
      const formGroup = input.closest('.form-group') || input.closest('.multi-select-container')?.parentElement;
      if (formGroup) {
        formGroup.classList.add('error');
        let errorMsg = formGroup.querySelector('.error-message');
        if (!errorMsg) {
          errorMsg = document.createElement('div');
          errorMsg.className = 'error-message';
          formGroup.appendChild(errorMsg);
        }
        errorMsg.textContent = state.validationErrors[field];
      }
    });
  }
  
  function clearValidationErrors() {
    document.querySelectorAll('.form-group.error, .multi-select-container.error').forEach(el => {
      el.classList.remove('error');
      const errorMsg = el.querySelector('.error-message');
      if (errorMsg) errorMsg.remove();
    });
  }
  
  function clearFieldError(fieldName) {
    const input = document.querySelector(\`[name="\${fieldName}"]\`);
    if (!input) return;
    const formGroup = input.closest('.form-group');
    if (formGroup) {
      formGroup.classList.remove('error');
      const errorMsg = formGroup.querySelector('.error-message');
      if (errorMsg) errorMsg.remove();
    }
  }
  
  // ============================================================================
  // MULTI-SELECT (Counties)
  // ============================================================================
  
  function setupMultiSelectCounties(fieldName, chipsContainerId, dropdownId) {
    const input = document.querySelector(\`[data-multi-select="\${fieldName}"]\`);
    const chipsContainer = document.getElementById(chipsContainerId);
    const dropdown = document.getElementById(dropdownId);
    
    if (!input || !chipsContainer || !dropdown) return;
    
    // Populate dropdown
    KENYA_COUNTIES.forEach(county => {
      const option = document.createElement('div');
      option.className = 'multi-select-option';
      option.dataset.value = county;
      option.innerHTML = \`<input type="checkbox" id="county-\${county}" style="margin-right:8px;"><label for="county-\${county}" style="cursor:pointer;">\${county}</label>\`;
      dropdown.appendChild(option);
      
      option.addEventListener('click', (e) => {
        e.stopPropagation();
        const checkbox = option.querySelector('input[type="checkbox"]');
        checkbox.checked = !checkbox.checked;
        updateSelectedCounties(fieldName, chipsContainer);
      });
    });
    
    // Search filter
    input.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      dropdown.querySelectorAll('.multi-select-option').forEach(option => {
        const county = option.dataset.value.toLowerCase();
        option.style.display = county.includes(query) ? 'block' : 'none';
      });
    });
    
    // Show/hide dropdown
    input.addEventListener('focus', () => dropdown.classList.add('show'));
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.multi-select-container')) {
        dropdown.classList.remove('show');
      }
    });
  }
  
  function updateSelectedCounties(fieldName, chipsContainer) {
    const checkboxes = document.querySelectorAll(\`#\${dropdownId} input[type="checkbox"]:checked\`);
    state.formData[fieldName] = Array.from(checkboxes).map(cb => cb.id.replace('county-', ''));
    renderChips(chipsContainer, state.formData[fieldName], (county) => {
      const checkbox = document.getElementById(\`county-\${county}\`);
      if (checkbox) checkbox.checked = false;
      updateSelectedCounties(fieldName, chipsContainer);
    });
  }
  
  function renderChips(container, items, onRemove) {
    container.innerHTML = '';
    items.forEach(item => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.innerHTML = \`\${item} <span class="chip-remove" data-value="\${item}">&times;</span>\`;
      chip.querySelector('.chip-remove').addEventListener('click', () => onRemove(item));
      container.appendChild(chip);
    });
  }
  
  // ============================================================================
  // PRODUCT MANAGEMENT
  // ============================================================================
  
  function setupProductListUI() {
    const addBtn = document.getElementById('addProductButton');
    if (addBtn) {
      addBtn.addEventListener('click', openProductModal);
    }
    
    renderProductList();
  }
  
  function renderProductList() {
    const container = document.getElementById('productListContainer');
    if (!container) return;
    
    container.innerHTML = '';
    state.formData.products.forEach(product => {
      const card = createProductCard(product);
      container.appendChild(card);
    });
  }
  
  function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = \`
      <div class="product-card-header">
        <div class="product-name">\${product.productName}</div>
        <div class="product-actions">
          <button class="btn-icon" data-action="edit" data-product-id="\${product.id}" title="Edit">✏️</button>
          <button class="btn-icon" data-action="delete" data-product-id="\${product.id}" title="Delete">🗑️</button>
        </div>
      </div>
      <div class="product-details">
        <div class="product-detail-item"><span class="label">Category:</span> <span class="value">\${product.category}</span></div>
        <div class="product-detail-item"><span class="label">Unit:</span> <span class="value">\${product.unitOfMeasure}</span></div>
        <div class="product-detail-item"><span class="label">Price:</span> <span class="value">KSh \${product.unitPrice}</span></div>
        <div class="product-detail-item"><span class="label">MOQ:</span> <span class="value">\${product.moq}</span></div>
        <div class="product-detail-item"><span class="label">Stock:</span> <span class="value">\${product.stockStatus}</span></div>
        \${product.brand ? \`<div class="product-detail-item"><span class="label">Brand:</span> <span class="value">\${product.brand}</span></div>\` : ''}
      </div>
    \`;
    
    card.querySelector('[data-action="edit"]').addEventListener('click', () => editProduct(product.id));
    card.querySelector('[data-action="delete"]').addEventListener('click', () => deleteProduct(product.id));
    
    return card;
  }
  
  function openProductModal(productId = null) {
    state.editingProductId = productId;
    const modal = document.getElementById('productModal');
    if (!modal) return;
    
    // Populate form if editing
    if (productId) {
      const product = state.formData.products.find(p => p.id === productId);
      if (product) {
        Object.keys(product).forEach(key => {
          const input = modal.querySelector(\`[name="\${key}"]\`);
          if (input) input.value = product[key];
        });
      }
      modal.querySelector('.modal-title').textContent = 'Edit Product';
    } else {
      modal.querySelector('form').reset();
      modal.querySelector('.modal-title').textContent = 'Add Product';
    }
    
    modal.classList.add('show');
  }
  
  function closeProductModal() {
    const modal = document.getElementById('productModal');
    if (modal) modal.classList.remove('show');
    state.editingProductId = null;
  }
  
  function saveProduct() {
    const modal = document.getElementById('productModal');
    if (!modal) return;
    
    const form = modal.querySelector('form');
    const formData = new FormData(form);
    const product = {
      id: state.editingProductId || \`temp-\${Date.now()}\`,
      productName: formData.get('productName'),
      category: formData.get('category'),
      sku: formData.get('sku') || '',
      unitOfMeasure: formData.get('unitOfMeasure'),
      unitPrice: parseFloat(formData.get('unitPrice')),
      moq: parseInt(formData.get('moq'), 10),
      stockStatus: formData.get('stockStatus'),
      availableQuantity: formData.get('availableQuantity') ? parseInt(formData.get('availableQuantity'), 10) : null,
      productDescription: formData.get('productDescription') || '',
      brand: formData.get('brand') || ''
    };
    
    // Validate
    if (!product.productName || !product.category || !product.unitOfMeasure || !product.unitPrice || !product.moq || !product.stockStatus) {
      showToast('Please fill all required product fields', 'error');
      return;
    }
    
    if (state.editingProductId) {
      const index = state.formData.products.findIndex(p => p.id === state.editingProductId);
      if (index !== -1) state.formData.products[index] = product;
    } else {
      state.formData.products.push(product);
    }
    
    renderProductList();
    closeProductModal();
    saveDraft();
  }
  
  function editProduct(productId) {
    openProductModal(productId);
  }
  
  function deleteProduct(productId) {
    if (confirm('Delete this product?')) {
      state.formData.products = state.formData.products.filter(p => p.id !== productId);
      renderProductList();
      saveDraft();
    }
  }
  
  // ============================================================================
  // CERTIFICATION MANAGEMENT (similar to products)
  // ============================================================================
  
  function setupCertificationListUI() {
    const addBtn = document.getElementById('addCertificationButton');
    if (addBtn) {
      addBtn.addEventListener('click', openCertificationModal);
    }
    
    renderCertificationList();
  }
  
  function renderCertificationList() {
    const container = document.getElementById('certificationListContainer');
    if (!container) return;
    
    container.innerHTML = '';
    state.formData.certifications.forEach(cert => {
      const card = createCertificationCard(cert);
      container.appendChild(card);
    });
  }
  
  // ... (similar functions for certification CRUD)
  
  // ============================================================================
  // CONDITIONAL FIELDS
  // ============================================================================
  
  function setupConditionalFields() {
    // Show/hide registration number based on registration status
    const regStatusSelect = document.querySelector('[name="businessRegistrationStatus"]');
    if (regStatusSelect) {
      regStatusSelect.addEventListener('change', (e) => {
        const regNumberField = document.getElementById('registrationNumberField');
        if (regNumberField) {
          regNumberField.style.display = e.target.value === 'Not Yet Registered' ? 'none' : 'block';
        }
      });
    }
    
    // Show/hide delivery fields based on delivery capability
    const deliveryCapabilityRadios = document.querySelectorAll('[name="deliveryCapability"]');
    deliveryCapabilityRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        const deliveryFields = document.getElementById('deliveryFields');
        if (deliveryFields) {
          deliveryFields.style.display = (state.formData.deliveryCapability === 'yes' || state.formData.deliveryCapability === 'depends') ? 'block' : 'none';
        }
      });
    });
    
    // Show/hide deferred payment fields
    const deferredPaymentRadios = document.querySelectorAll('[name="acceptsDeferredPayment"]');
    deferredPaymentRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        const deferredFields = document.getElementById('deferredPaymentFields');
        if (deferredFields) {
          deferredFields.style.display = state.formData.acceptsDeferredPayment ? 'block' : 'none';
        }
      });
    });
  }
  
  // ============================================================================
  // STEP 5: REVIEW SUMMARY
  // ============================================================================
  
  function renderReviewSummary() {
    const container = document.getElementById('reviewSummaryContainer');
    if (!container) return;
    
    container.innerHTML = \`
      <div class="summary-section">
        <div class="summary-section-title">Business Profile <span class="edit-link" data-jump="1">Edit</span></div>
        <div class="summary-row"><span class="label">Company Name:</span><span class="value">\${state.formData.companyName}</span></div>
        <div class="summary-row"><span class="label">Supplier Type:</span><span class="value">\${state.formData.supplierType}</span></div>
        <div class="summary-row"><span class="label">Contact Person:</span><span class="value">\${state.formData.contactPerson}</span></div>
        <div class="summary-row"><span class="label">Phone:</span><span class="value">\${state.formData.phone}</span></div>
        <!-- ... more fields ... -->
      </div>
      
      <div class="summary-section">
        <div class="summary-section-title">Products (\${state.formData.products.length}) <span class="edit-link" data-jump="2">Edit</span></div>
        <div class="product-summary-list">
          \${state.formData.products.map(p => \`
            <div class="product-summary-card">
              <div>\${p.productName}</div>
              <div>KSh \${p.unitPrice} / \${p.unitOfMeasure} | MOQ: \${p.moq}</div>
            </div>
          \`).join('')}
        </div>
      </div>
      
      <!-- ... more sections ... -->
    \`;
    
    // Setup edit links
    container.querySelectorAll('.edit-link').forEach(link => {
      link.addEventListener('click', (e) => {
        const targetStep = parseInt(e.target.dataset.jump, 10);
        navigateToStep(targetStep);
      });
    });
  }
  
  // ============================================================================
  // FORM SUBMISSION
  // ============================================================================
  
  function setupFormSubmit() {
    const submitBtn = document.querySelector('[data-supplier-nav="submit"]');
    if (submitBtn) {
      submitBtn.addEventListener('click', handleSubmit);
    }
  }
  
  async function handleSubmit() {
    // Final validation
    const errors = validateStep(5);
    if (Object.keys(errors).length > 0) {
      state.validationErrors = errors;
      displayValidationErrors();
      showToast('Please accept the terms and conditions', 'error');
      return;
    }
    
    showSpinner();
    
    try {
      // Prepare payload
      const payload = {
        ...state.formData,
        // Transform products array (remove temp IDs)
        products: state.formData.products.map(p => {
          const {id, ...rest} = p;
          return rest;
        }),
        // Transform certifications array
        certifications: state.formData.certifications.map(c => {
          const {id, ...rest} = c;
          return rest;
        })
      };
      
      // Call edge function
      const supabase = window._supabaseClient;
      if (!supabase) throw new Error('Supabase client not initialized');
      
      const {data, error} = await supabase.functions.invoke('supplier-registration-submit', {
        body: payload
      });
      
      if (error) throw error;
      
      if (data?.success) {
        showToast('Registration submitted successfully!', 'success');
        clearDraft();
        closeModal();
        
        // Optional: redirect to success page
        // window.location.href = '/supplier-registration-success.html';
      } else {
        throw new Error(data?.message || 'Submission failed');
      }
    } catch (error) {
      console.error('[Supplier Reg V2] Submit error:', error);
      showToast(error.message || 'Registration failed. Please try again.', 'error');
    } finally {
      hideSpinner();
    }
  }
  
  // ============================================================================
  // LOCAL STORAGE (Draft Persistence)
  // ============================================================================
  
  function saveDraft() {
    try {
      localStorage.setItem('supplierRegistrationDraft', JSON.stringify(state.formData));
      console.log('[Supplier Reg V2] Draft saved');
    } catch (e) {
      console.warn('[Supplier Reg V2] Failed to save draft:', e);
    }
  }
  
  function loadDraft() {
    try {
      const draft = localStorage.getItem('supplierRegistrationDraft');
      if (draft) {
        state.formData = JSON.parse(draft);
        console.log('[Supplier Reg V2] Draft loaded');
      }
    } catch (e) {
      console.warn('[Supplier Reg V2] Failed to load draft:', e);
    }
  }
  
  function clearDraft() {
    localStorage.removeItem('supplierRegistrationDraft');
  }
  
  // ============================================================================
  // OFFLINE INTEGRATION
  // ============================================================================
  
  // Integrate with existing offline-form-handler.js if available
  if (window.offlineFormHandler) {
    // Hook into offline detection
    window.addEventListener('offline', () => {
      showToast('You are offline. Your progress is saved locally.', 'warning');
    });
    
    window.addEventListener('online', () => {
      showToast('Back online!', 'success');
    });
  }
  
  // ============================================================================
  // TOAST NOTIFICATIONS
  // ============================================================================
  
  function showToast(message, type = 'info') {
    if (window.showToast) {
      window.showToast(message, type);
    } else if (window.EnhancedToastSystem) {
      window.EnhancedToastSystem.show(message, type);
    } else {
      alert(message);
    }
  }
  
  // ============================================================================
  // UI HELPERS
  // ============================================================================
  
  function showSpinner() {
    const spinner = document.getElementById('supplierSpinner');
    if (spinner) spinner.classList.add('show');
  }
  
  function hideSpinner() {
    const spinner = document.getElementById('supplierSpinner');
    if (spinner) spinner.classList.remove('show');
  }
  
  function setupModalClose() {
    const closeBtn = document.querySelector('#supplierRegistrationModal .modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeModal);
    }
    
    const modal = document.getElementById('supplierRegistrationModal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });
    }
  }
  
  function closeModal() {
    const modal = document.getElementById('supplierRegistrationModal');
    if (modal) modal.classList.remove('active');
  }
  
  // ============================================================================
  // AUTO-INIT
  // ============================================================================
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
})();
```

**Key implementation notes:**
- Use `window._supabaseClient` (confirmed in supabase-config.js line 17)
- Use `window.showToast(message, type)` (confirmed in enhanced-toast-system.js)
- Integrate with `window.offlineFormHandler` if available (try/catch wrapper)
- All touch targets >= 44px
- Focus indicators: 2px solid #10b981 with 2px offset
- Form data auto-saved to localStorage on every step navigation
- Product/certification management uses temporary IDs (`temp-${Date.now()}`) in state, stripped before submission
- Searchable multi-select for counties: filter-as-you-type, checkbox list, selected chips with remove

## HTML Changes: `dalana.html`

### 1. Add CSS link in `<head>` (after line 48, after mobile-modal-fix.css):

```html
<link rel="stylesheet" href="css/supplier-registration-v2.css">
```

### 2. Replace Supplier Registration Modal (lines 1725-1942)

**Find:** `<div class="modal-overlay" id="supplierRegistrationModal">` through its closing `</div>` (before `<!-- Core Configuration... -->`)

**Replace with:** New 5-step wizard markup (full HTML structure in implementation, ~800 lines). Key structure:

```html
<div class="modal-overlay" id="supplierRegistrationModal">
  <div class="modal-content supplier-registration-v2">
    <button class="modal-close" id="supplierModalClose">&times;</button>
    
    <!-- Progress Indicator -->
    <div class="progress-indicator">
      <div class="progress-step active" data-step="1">
        <div class="progress-circle">1</div>
        <div class="progress-label">Business Profile</div>
      </div>
      <div class="progress-line"></div>
      <div class="progress-step" data-step="2">
        <div class="progress-circle">2</div>
        <div class="progress-label">Products & Pricing</div>
      </div>
      <!-- ... steps 3, 4, 5 ... -->
    </div>
    
    <form id="supplierRegistrationFormV2">
      
      <!-- Step 1: Business Profile -->
      <div class="supplier-step active" data-step="1">
        <div class="step-header">
          <h3>Business Profile</h3>
          <p>Tell us about your business</p>
        </div>
        <div class="step-body">
          <!-- Business/Company Name -->
          <div class="form-group">
            <label>Business / Company Name <span class="required">*</span></label>
            <input type="text" name="companyName" placeholder="Enter your business name" required>
          </div>
          
          <!-- Supplier Type -->
          <div class="form-group">
            <label>Supplier Type <span class="required">*</span></label>
            <select name="supplierType" required>
              <option value="">Select type</option>
              <option value="Manufacturer">Manufacturer</option>
              <option value="Wholesaler">Wholesaler</option>
              <option value="Distributor">Distributor</option>
              <option value="Importer">Importer</option>
              <option value="Producer/Farmer">Producer / Farmer</option>
              <option value="Retailer">Retailer</option>
              <option value="Cooperative">Cooperative</option>
              <option value="Service Provider">Service Provider</option>
              <option value="Other">Other</option>
            </select>
          </div>
          
          <!-- Business Registration Status -->
          <div class="form-group">
            <label>Business Registration Status <span class="required">*</span></label>
            <select name="businessRegistrationStatus" required>
              <option value="">Select status</option>
              <option value="Registered Company">Registered Company</option>
              <option value="Sole Proprietorship">Sole Proprietorship</option>
              <option value="Partnership">Partnership</option>
              <option value="Cooperative">Cooperative</option>
              <option value="Not Yet Registered">Not Yet Registered</option>
              <option value="Other">Other</option>
            </select>
          </div>
          
          <!-- Registration Number (conditional) -->
          <div class="form-group" id="registrationNumberField">
            <label>Registration Number</label>
            <input type="text" name="registrationNumber" placeholder="Business registration number">
          </div>
          
          <!-- Years in Business -->
          <div class="form-group">
            <label>Years in Business <span class="required">*</span></label>
            <select name="yearsInBusiness" required>
              <option value="">Select range</option>
              <option value="Less than 1 year">Less than 1 year</option>
              <option value="1-2 years">1-2 years</option>
              <option value="3-5 years">3-5 years</option>
              <option value="6-10 years">6-10 years</option>
              <option value="11-20 years">11-20 years</option>
              <option value="20+ years">20+ years</option>
            </select>
          </div>
          
          <!-- Main Business Location -->
          <div class="form-group">
            <label>Main Business Location <span class="required">*</span></label>
            <input type="text" name="mainBusinessLocation" placeholder="e.g., Nairobi CBD, Industrial Area" required>
          </div>
          
          <!-- Primary Contact Person -->
          <div class="form-group">
            <label>Primary Contact Person <span class="required">*</span></label>
            <input type="text" name="contactPerson" placeholder="Full name" required>
          </div>
          
          <!-- Phone Number -->
          <div class="form-group">
            <label>Phone Number <span class="required">*</span></label>
            <input type="tel" name="phone" placeholder="+254 700 000 000" required>
          </div>
          
          <!-- Email (optional) -->
          <div class="form-group">
            <label>Email Address</label>
            <input type="email" name="email" placeholder="your@email.com">
          </div>
          
          <!-- Alternative Contact (optional) -->
          <div class="form-group">
            <label>Alternative Contact Name</label>
            <input type="text" name="alternativeContactName" placeholder="Full name">
          </div>
          <div class="form-group">
            <label>Alternative Contact Phone</label>
            <input type="tel" name="alternativeContactPhone" placeholder="+254 700 000 000">
          </div>
        </div>
      </div>
      
      <!-- Step 2: Products & Pricing -->
      <div class="supplier-step" data-step="2">
        <div class="step-header">
          <h3>Products & Pricing</h3>
          <p>What do you supply?</p>
        </div>
        <div class="step-body">
          <!-- Product Categories (multi-select chips) -->
          <div class="form-group">
            <label>Product Categories <span class="required">*</span></label>
            <p class="form-hint">Select all categories that apply</p>
            <div class="checkbox-grid">
              <label><input type="checkbox" name="categories" value="Fresh Produce"> Fresh Produce</label>
              <label><input type="checkbox" name="categories" value="Grains & Cereals"> Grains & Cereals</label>
              <label><input type="checkbox" name="categories" value="Dairy Products"> Dairy Products</label>
              <label><input type="checkbox" name="categories" value="Meat & Poultry"> Meat & Poultry</label>
              <label><input type="checkbox" name="categories" value="Household Items"> Household Items</label>
              <label><input type="checkbox" name="categories" value="Electronics"> Electronics</label>
              <label><input type="checkbox" name="categories" value="Clothing & Textiles"> Clothing & Textiles</label>
              <label><input type="checkbox" name="categories" value="Building Materials"> Building Materials</label>
              <label><input type="checkbox" name="categories" value="Stationery & Office Supplies"> Stationery & Office Supplies</label>
              <label><input type="checkbox" name="categories" value="Beauty & Personal Care"> Beauty & Personal Care</label>
              <label><input type="checkbox" name="categories" value="Pharmaceuticals & Health"> Pharmaceuticals & Health</label>
              <label><input type="checkbox" name="categories" value="Agricultural Inputs"> Agricultural Inputs</label>
              <label><input type="checkbox" name="categories" value="Automotive Parts"> Automotive Parts</label>
              <label><input type="checkbox" name="categories" value="Food & Beverages"> Food & Beverages</label>
              <label><input type="checkbox" name="categories" value="Other"> Other</label>
            </div>
          </div>
          
          <!-- Products List -->
          <div class="form-group">
            <label>Products <span class="required">*</span></label>
            <p class="form-hint">Add at least one product with pricing details</p>
            <div id="productListContainer" class="product-list"></div>
            <button type="button" class="add-product-button" id="addProductButton">+ Add Product</button>
          </div>
        </div>
      </div>
      
      <!-- Step 3: Coverage & Delivery -->
      <div class="supplier-step" data-step="3">
        <div class="step-header">
          <h3>Coverage & Delivery</h3>
          <p>Where do you operate and deliver?</p>
        </div>
        <div class="step-body">
          <!-- Stock Location County -->
          <div class="form-group">
            <label>Stock Location County <span class="required">*</span></label>
            <select name="stockLocationCounty" required>
              <option value="">Select county</option>
              <!-- 47 counties -->
            </select>
          </div>
          
          <!-- Stock Location Town -->
          <div class="form-group">
            <label>Stock Location Town <span class="required">*</span></label>
            <input type="text" name="stockLocationTown" placeholder="e.g., Nairobi CBD" required>
          </div>
          
          <!-- Warehouse Address -->
          <div class="form-group">
            <label>Warehouse / Collection Address <span class="required">*</span></label>
            <textarea name="warehouseAddress" rows="2" placeholder="Full address" required></textarea>
          </div>
          
          <!-- Counties Served (searchable multi-select) -->
          <div class="form-group">
            <label>Counties Served <span class="required">*</span></label>
            <p class="form-hint">Which counties can you supply to?</p>
            <div class="multi-select-container">
              <input type="text" data-multi-select="countiesServed" placeholder="Search counties..." autocomplete="off">
              <div class="multi-select-dropdown" id="countiesServedDropdown"></div>
            </div>
            <div class="selected-chips" id="countiesServedChips"></div>
          </div>
          
          <!-- Towns/Areas Served (optional text per county) -->
          <div class="form-group">
            <label>Towns / Areas Served (Optional)</label>
            <p class="form-hint">Specify towns or areas within selected counties</p>
            <textarea name="townsServed" rows="2" placeholder="e.g., Nairobi: CBD, Westlands, Kasarani"></textarea>
          </div>
          
          <!-- Delivery Capability -->
          <div class="form-group">
            <label>Do you offer delivery? <span class="required">*</span></label>
            <div class="radio-group">
              <label><input type="radio" name="deliveryCapability" value="yes"> Yes</label>
              <label><input type="radio" name="deliveryCapability" value="no"> No</label>
              <label><input type="radio" name="deliveryCapability" value="depends"> Depends on Order Size</label>
            </div>
          </div>
          
          <!-- Delivery Fields (conditional) -->
          <div id="deliveryFields" style="display:none;">
            <div class="form-group">
              <label>Delivery Method <span class="required">*</span></label>
              <div class="checkbox-grid">
                <label><input type="checkbox" name="deliveryMethod" value="own_vehicle"> Own Vehicle</label>
                <label><input type="checkbox" name="deliveryMethod" value="third_party_courier"> Third-Party Courier</label>
                <label><input type="checkbox" name="deliveryMethod" value="stokika_logistics"> Stokika Logistics</label>
                <label><input type="checkbox" name="deliveryMethod" value="customer_pickup"> Customer Pickup</label>
              </div>
            </div>
            
            <div class="form-group">
              <label>Typical Delivery Time <span class="required">*</span></label>
              <select name="deliveryLeadTime">
                <option value="">Select time</option>
                <option value="same_day">Same Day</option>
                <option value="next_day">Next Day</option>
                <option value="2_3_days">2-3 Days</option>
                <option value="4_7_days">4-7 Days</option>
                <option value="7_plus_days">7+ Days</option>
                <option value="depends">Depends</option>
              </select>
            </div>
            
            <div class="form-group">
              <label>Delivery Fee Structure <span class="required">*</span></label>
              <select name="deliveryChargeMethod">
                <option value="">Select structure</option>
                <option value="free">Free Delivery</option>
                <option value="fixed_fee">Fixed Fee</option>
                <option value="by_location">By Location</option>
                <option value="by_order_value">By Order Value</option>
              </select>
            </div>
            
            <div class="form-group">
              <label>Minimum Order for Delivery (KSh)</label>
              <input type="number" name="minimumOrderForDelivery" placeholder="e.g., 5000">
            </div>
          </div>
        </div>
      </div>
      
      <!-- Step 4: Supply & Commercial Terms -->
      <div class="supplier-step" data-step="4">
        <div class="step-header">
          <h3>Supply & Commercial Terms</h3>
          <p>Order capacity and payment terms</p>
        </div>
        <div class="step-body">
          <!-- Minimum Order Value -->
          <div class="form-group">
            <label>Minimum Order Value (KSh) <span class="required">*</span></label>
            <input type="number" name="minimumOrderValue" placeholder="e.g., 2000" required>
          </div>
          
          <!-- Maximum Order Value -->
          <div class="form-group">
            <label>Typical Maximum Order Value (KSh) <span class="required">*</span></label>
            <input type="number" name="maximumOrderValue" placeholder="e.g., 500000" required>
            <p class="form-hint">What is the largest order you can typically fulfill?</p>
          </div>
          
          <!-- Fulfillment Lead Time -->
          <div class="form-group">
            <label>Order Fulfillment Lead Time <span class="required">*</span></label>
            <select name="fulfillmentLeadTime" required>
              <option value="">Select time</option>
              <option value="same_day">Same Day</option>
              <option value="next_day">Next Day</option>
              <option value="2_3_days">2-3 Days</option>
              <option value="4_7_days">4-7 Days</option>
              <option value="7_plus_days">7+ Days</option>
              <option value="depends">Depends</option>
            </select>
          </div>
          
          <!-- Payment Methods Accepted -->
          <div class="form-group">
            <label>Payment Methods Accepted <span class="required">*</span></label>
            <div class="checkbox-grid">
              <label><input type="checkbox" name="paymentMethods" value="M-Pesa"> M-Pesa</label>
              <label><input type="checkbox" name="paymentMethods" value="Bank Transfer"> Bank Transfer</label>
              <label><input type="checkbox" name="paymentMethods" value="Cash"> Cash</label>
              <label><input type="checkbox" name="paymentMethods" value="Other"> Other</label>
            </div>
          </div>
          
          <!-- Preferred Payment Method -->
          <div class="form-group">
            <label>Preferred Payment Method <span class="required">*</span></label>
            <select name="preferredPaymentMethod" required>
              <option value="">Select preferred method</option>
              <option value="M-Pesa">M-Pesa</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cash">Cash</option>
              <option value="Other">Other</option>
            </select>
          </div>
          
          <!-- Deferred Payment Terms -->
          <div class="form-group">
            <label>Deferred Payment Terms <span class="required">*</span></label>
            <div class="radio-group">
              <label><input type="radio" name="acceptsDeferredPayment" value="yes_agreed"> Yes — Agreed Terms</label>
              <label><input type="radio" name="acceptsDeferredPayment" value="yes_after_verification"> Yes — After Verification</label>
              <label><input type="radio" name="acceptsDeferredPayment" value="no"> No — Immediate Only</label>
              <label><input type="radio" name="acceptsDeferredPayment" value="open_to_discussion"> Open to Discussion</label>
            </div>
          </div>
          
          <!-- Deferred Payment Details (conditional) -->
          <div id="deferredPaymentFields" style="display:none;">
            <div class="form-group">
              <label>Deferred Payment Period</label>
              <div class="checkbox-grid">
                <label><input type="checkbox" name="deferredPaymentPeriods" value="7"> 7 days</label>
                <label><input type="checkbox" name="deferredPaymentPeriods" value="14"> 14 days</label>
                <label><input type="checkbox" name="deferredPaymentPeriods" value="30"> 30 days</label>
                <label><input type="checkbox" name="deferredPaymentPeriods" value="60"> 60 days</label>
                <label><input type="checkbox" name="deferredPaymentPeriods" value="90"> 90 days</label>
              </div>
            </div>
            
            <div class="form-group">
              <label>Conditions (Optional)</label>
              <textarea name="deferredPaymentConditions" rows="2" placeholder="Any special conditions or requirements"></textarea>
            </div>
          </div>
          
          <!-- Preferred Contact Method -->
          <div class="form-group">
            <label>Preferred Contact Method <span class="required">*</span></label>
            <select name="preferredContactMethod" required>
              <option value="">Select method</option>
              <option value="phone">Phone</option>
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
            </select>
          </div>
        </div>
      </div>
      
      <!-- Step 5: Verification & Review -->
      <div class="supplier-step" data-step="5">
        <div class="step-header">
          <h3>Verification & Review</h3>
          <p>Review your information and submit</p>
        </div>
        <div class="step-body">
          <!-- Review Summary (dynamically rendered) -->
          <div id="reviewSummaryContainer"></div>
          
          <!-- Business Documents (optional, repeatable) -->
          <div class="form-group">
            <label>Business Documents (Optional)</label>
            <p class="form-hint">Upload certifications, licenses, or registrations</p>
            <div id="certificationListContainer" class="certification-list"></div>
            <button type="button" class="add-product-button" id="addCertificationButton">+ Add Document</button>
          </div>
          
          <!-- Terms & Conditions -->
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" name="termsAccepted" required>
              I accept the <a href="#" target="_blank">Terms & Conditions</a> <span class="required">*</span>
            </label>
          </div>
        </div>
      </div>
      
      <!-- Navigation Buttons (fixed bottom on mobile) -->
      <div class="form-navigation">
        <button type="button" class="btn-previous" data-supplier-nav="prev">Previous</button>
        <button type="button" class="btn-next" data-supplier-nav="next">Next</button>
        <button type="button" class="btn-submit" data-supplier-nav="submit" style="display:none;">Submit Registration</button>
      </div>
      
    </form>
  </div>
</div>

<!-- Product Modal (for adding/editing products) -->
<div class="product-modal-overlay" id="productModal">
  <div class="product-modal">
    <button class="modal-close-button">&times;</button>
    <h3 class="modal-title">Add Product</h3>
    <form>
      <div class="form-group">
        <label>Product Name <span class="required">*</span></label>
        <input type="text" name="productName" required>
      </div>
      <div class="form-group">
        <label>Category <span class="required">*</span></label>
        <select name="category" required>
          <option value="">Select category</option>
          <!-- categories from PRODUCT_CATEGORIES -->
        </select>
      </div>
      <div class="form-group">
        <label>SKU / Product Code</label>
        <input type="text" name="sku">
      </div>
      <div class="form-group">
        <label>Unit of Measure <span class="required">*</span></label>
        <select name="unitOfMeasure" required>
          <option value="">Select unit</option>
          <option value="Piece">Piece</option>
          <option value="Kg">Kg</option>
          <option value="Bag">Bag</option>
          <option value="Box">Box</option>
          <option value="Carton">Carton</option>
          <option value="Crate">Crate</option>
          <option value="Dozen">Dozen</option>
          <option value="Litre">Litre</option>
          <option value="Pack">Pack</option>
          <option value="Bundle">Bundle</option>
        </select>
      </div>
      <div class="form-group">
        <label>Unit Price (KSh) <span class="required">*</span></label>
        <input type="number" name="unitPrice" step="0.01" required>
      </div>
      <div class="form-group">
        <label>Minimum Order Quantity <span class="required">*</span></label>
        <input type="number" name="moq" required>
      </div>
      <div class="form-group">
        <label>Stock Status <span class="required">*</span></label>
        <select name="stockStatus" required>
          <option value="">Select status</option>
          <option value="in_stock">In Stock</option>
          <option value="limited_stock">Limited Stock</option>
          <option value="out_of_stock">Out of Stock</option>
          <option value="made_to_order">Made to Order</option>
        </select>
      </div>
      <div class="form-group">
        <label>Available Quantity</label>
        <input type="number" name="availableQuantity">
      </div>
      <div class="form-group">
        <label>Product Description</label>
        <textarea name="productDescription" rows="2"></textarea>
      </div>
      <div class="form-group">
        <label>Brand</label>
        <input type="text" name="brand">
      </div>
      <div class="form-navigation">
        <button type="button" class="btn-previous" onclick="closeProductModal()">Cancel</button>
        <button type="button" class="btn-next" onclick="saveProduct()">Save Product</button>
      </div>
    </form>
  </div>
</div>

<!-- Loading Spinner -->
<div class="spinner-overlay" id="supplierSpinner">
  <div class="spinner"></div>
  <p>Submitting registration...</p>
</div>
```

### 3. Add JS script before `</body>` (after line 2037, after vendor-modal-fix.js):

```html
<script src="js/features/supplier-registration-v2.js"></script>
```

**Critical constraint**: Do NOT move or remove existing scripts. The load order is:
1. Security layer (xss-protection, csrf, rate-limiter, etc.)
2. Features (audit-logger, enhanced-toast-system, offline-manager, offline-form-handler)
3. Vendor registration scripts (vendor-error-handler, vendor-registration-validation, vendor-registration-payment, vendor-payment-method-selector)
4. Modal handler (vendor-modal-fix.js)
5. **NEW**: supplier-registration-v2.js (last)

This ensures supplier-registration-v2.js can access `window.showToast`, `window.offlineFormHandler`, `window._supabaseClient`.

## Implementation Sequence

**Verification command for all steps**: Run `npm run typecheck` (TypeScript validation) and manually test in browser (no automated tests exist for frontend per package.json inspection).

- [ ] 1. Create database migration file `supabase/migrations/20260127000001_supplier_registration_v2_schema.sql` with all table creates, alters, indexes, RLS policies, and triggers as specified above.
      Files: `supabase/migrations/20260127000001_supplier_registration_v2_schema.sql`
      Verify: Apply migration in Supabase SQL Editor, then query `SELECT table_name FROM information_schema.tables WHERE table_name IN ('supplier_products', 'supplier_certifications', 'supplier_locations', 'supplier_volume_pricing')` — all 4 tables exist. Query `SELECT column_name FROM information_schema.columns WHERE table_name='suppliers' AND column_name IN ('supplier_type', 'minimum_order_value', 'delivery_capability')` — new columns exist.

- [ ] 2. Create edge function `supabase/functions/supplier-registration-submit/index.ts` with transaction logic for atomic multi-table insert (suppliers, supplier_products, supplier_locations, supplier_certifications). Handle validation, duplicate detection (phone/email), CORS, error responses.
      Files: `supabase/functions/supplier-registration-submit/index.ts`
      Verify: Deploy function with `supabase functions deploy supplier-registration-submit`, then test with curl POST containing minimal valid payload — returns `{success: true, supplierId: <UUID>}` and database has 1 supplier + N products + M locations.

- [ ] 3. Create CSS file `css/supplier-registration-v2.css` with mobile-first styles for progress indicator, step containers, form fields, searchable multi-select, product cards, product modal, bottom navigation, review summary, loading spinner, and responsive breakpoints as specified above.
      Files: `css/supplier-registration-v2.css`
      Verify: Open dalana.html in browser (after adding link tag), inspect supplier modal with DevTools — all classes defined, no 404s for CSS file, touch targets >= 44px (measure with DevTools ruler), focus indicators visible.

- [ ] 4. Create JavaScript module `js/features/supplier-registration-v2.js` with IIFE structure, state management, step navigation, form validation (phone regex, required fields, min 1 product), searchable multi-select for counties, product CRUD (add/edit/delete with modal), localStorage draft persistence, conditional field visibility, review summary rendering, edge function submission, offline integration (try/catch window.offlineFormHandler), toast notifications (window.showToast), spinner UI, modal open/close.
      Files: `js/features/supplier-registration-v2.js`
      Verify: `npm run typecheck` passes (no TS errors in compiled JS). Open browser console, trigger modal open (inspect element and manually add `.active` class), verify console log `[Supplier Reg V2] Initialized`, test step navigation, add a product, verify localStorage has `supplierRegistrationDraft`.

- [ ] 5. Modify `dalana.html`: (a) Add `<link rel="stylesheet" href="css/supplier-registration-v2.css">` after line 48 (mobile-modal-fix.css). (b) Replace lines 1725-1942 (old supplier registration modal) with new 5-step wizard markup (preserve `id="supplierRegistrationModal"` on outer div). (c) Add `<script src="js/features/supplier-registration-v2.js"></script>` before `</body>` after vendor-modal-fix.js (line ~2037).
      Files: `dalana.html`
      Verify: Open dalana.html in browser, click "Become a Supplier" link (or manually add `.active` class to modal), confirm 5-step wizard appears with progress indicator, no JS errors in console, can navigate steps, existing vendor modal still opens correctly (test "Become a Vendor" link).

- [ ] 6. Integration test: Complete full supplier registration flow in browser. Fill Step 1 (business profile), Step 2 (add 2 products), Step 3 (select 3 counties with searchable multi-select, delivery yes), Step 4 (order values, payment methods, deferred payment), Step 5 (review summary shows all data, accept terms, submit). Verify: (a) Toast shows "Registration submitted successfully". (b) Supabase database has 1 new row in suppliers, 2 rows in supplier_products, 1 stock_location + 3 service_area rows in supplier_locations. (c) localStorage `supplierRegistrationDraft` cleared. (d) Modal closes. Test offline: disconnect network, fill form, verify draft saved to localStorage, reconnect, submit successfully.
      Files: (testing existing files)
      Verify: Manual end-to-end test as described above. Check Supabase dashboard for inserted records. Check browser console for no errors. Check Network tab for successful edge function call (200 response).

- [ ] 7. Mobile optimization test: Open dalana.html in Chrome DevTools mobile emulation (iPhone SE, 375px width). Verify: (a) Progress indicator stacks vertically or scales down. (b) All touch targets >= 44px (measure with ruler). (c) Bottom navigation is sticky. (d) Product cards stack in single column. (e) Multi-select dropdown does not overflow viewport. (f) All text readable (font-size >= 16px for inputs to prevent iOS zoom). (g) Step transitions smooth. (h) Can complete full registration on mobile without horizontal scroll.
      Files: (testing existing files)
      Verify: Manual mobile testing as described. Use Chrome DevTools Device Mode with iPhone SE, Galaxy S20. Test in both portrait and landscape. Screenshot any issues.

## Notes

- **No test framework for frontend**: The project uses Vitest (verified in package.json) but only for TypeScript modules in `src/`. The frontend HTML/CSS/JS has no automated tests. Verification is manual browser testing.

- **Supabase client initialization**: The global client is `window._supabaseClient`, initialized in `js/config/supabase-config.js` line 17. Edge functions are invoked via `supabase.functions.invoke('function-name', {body: payload})`.

- **Toast API**: `window.showToast(message, type)` where type is 'success'/'error'/'warning'/'info'. Defined in `js/features/enhanced-toast-system.js`. If not available, fallback to alert().

- **Offline form handler**: `window.offlineFormHandler` may or may not be available. The supplier-registration-v2.js wraps offline integration in try/catch. localStorage draft persistence is always active.

- **Existing vendor modal**: The vendor registration modal (distinct from supplier modal) must remain functional. It uses `id="vendorRegistrationModal"` and loads at a different position in dalana.html. Do NOT modify vendor modal markup or scripts.

- **CSP compliance**: No inline styles or scripts. All JS in external files. All event listeners added via addEventListener. CSS loaded via link tags.

- **Kenya counties**: All 47 counties hardcoded in JS array (KENYA_COUNTIES). The searchable multi-select filters this array client-side.

- **Product categories**: 15 categories hardcoded in JS (Fresh Produce, Grains & Cereals, ..., Other). Legacy categories field (checkboxes) kept for backwards compatibility; new product table has category per product.

- **File uploads**: Document upload (certifications) is a future feature. Step 5 has placeholder UI but no Supabase Storage integration in initial implementation. The edge function accepts `documentUrl` field but expects pre-uploaded URLs (upload logic to be added later).

- **Edge function deployment**: Deploy with `supabase functions deploy <function-name>`. Requires Supabase CLI installed and linked to project. If deployment fails, developer must manually create function via Supabase Dashboard.

- **Migration rollback**: If migration fails, rollback with manual DROP TABLE statements in reverse order (drop supplier_volume_pricing, supplier_certifications, supplier_locations, supplier_products, then ALTER TABLE suppliers DROP COLUMN for new columns). No automated rollback script.

- **Browser compatibility**: Target modern browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+). Use ES6+ features (arrow functions, template literals, destructuring). No IE11 support.

- **Accessibility**: WCAG 2.1 Level AA compliance. All form fields have labels, required fields marked with asterisk and aria-required, error messages associated with fields, focus indicators visible, color contrast >= 4.5:1, touch targets >= 44px.
