/**
 * Supplier Registration V2 - Mobile-Optimized 5-Step Wizard
 * Handles form state, validation, product management, and submission
 */

(function() {
  'use strict';

  // ============================================================================
  // CONSTANTS
  // ============================================================================

  const KENYA_COUNTIES = [
    'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo-Marakwet', 'Embu', 'Garissa',
    'Homa Bay', 'Isiolo', 'Kajiado', 'Kakamega', 'Kericho', 'Kiambu', 'Kilifi',
    'Kirinyaga', 'Kisii', 'Kisumu', 'Kitui', 'Kwale', 'Laikipia', 'Lamu', 'Machakos',
    'Makueni', 'Mandera', 'Marsabit', 'Meru', 'Migori', 'Mombasa', "Murang'a",
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

  const UNITS_OF_MEASURE = [
    'Piece', 'Kg', 'Bag', 'Box', 'Carton', 'Crate', 'Dozen', 'Litre', 'Pack', 'Bundle'
  ];

  // ============================================================================
  // STATE
  // ============================================================================

  const state = {
    currentStep: 1,
    totalSteps: 5,
    formData: {
      // Step 1
      businessName: '',
      supplierType: '',
      businessRegistrationStatus: '',
      registrationNumber: '',
      yearsInBusiness: '',
      mainBusinessLocation: '',
      contactPerson: '',
      phoneNumber: '',
      emailAddress: '',
      altContactName: '',
      altContactPhone: '',
      
      // Step 2
      categories: [],
      products: [],
      
      // Step 3
      stockLocationCounty: '',
      stockLocationTown: '',
      warehouseAddress: '',
      countiesServed: [],
      townsServed: '',
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
      deferredPayment: '',
      deferredPeriods: [],
      deferredPaymentTerms: '',
      preferredContactMethod: '',
      
      // Step 5
      documents: [],
      certifications: [],
      termsAccepted: false
    },
    editingProductIndex: null,
    editingDocumentIndex: null,
    validationErrors: {}
  };

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

    // Setup components
    setupNavigationButtons();
    setupFormInputListeners();
    setupCategoriesMultiSelect();
    setupCountiesMultiSelect();
    setupProductManagement();
    setupDocumentManagement();
    setupCertifications();
    setupConditionalFields();
    setupModalEvents();

    // Render initial state
    renderStep(state.currentStep);
    updateProgressIndicator();
    updateNavigationButtons();
    populateStaticOptions();

    console.log('[Supplier Reg V2] Initialized');
  }

  // ============================================================================
  // NAVIGATION
  // ============================================================================

  function setupNavigationButtons() {
    const btnPrev = document.getElementById('btnPrevStep');
    const btnNext = document.getElementById('btnNextStep');
    const btnSubmit = document.getElementById('btnSubmitForm');

    if (btnPrev) {
      btnPrev.addEventListener('click', handlePrevious);
    }

    if (btnNext) {
      btnNext.addEventListener('click', handleNext);
    }

    if (btnSubmit) {
      btnSubmit.addEventListener('click', handleSubmit);
    }
  }

  function handleNext() {
    // Save current step data
    saveStepData(state.currentStep);

    // Validate
    const errors = validateStep(state.currentStep);
    if (Object.keys(errors).length > 0) {
      state.validationErrors = errors;
      displayValidationErrors();
      showToastIfAvailable('Please fix the errors before continuing', 'error');
      return;
    }

    // Clear errors
    state.validationErrors = {};
    clearValidationErrors();

    // Save to localStorage
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
    state.currentStep = stepNumber;
    renderStep(stepNumber);
    updateProgressIndicator();
    updateNavigationButtons();

    // Scroll to top
    const modalContent = document.querySelector('.modal-content.supplier-registration-v2');
    if (modalContent) {
      modalContent.scrollTop = 0;
    }
  }

  function renderStep(stepNumber) {
    console.log('[Supplier Reg V2] renderStep called with:', stepNumber);
    
    const allSteps = document.querySelectorAll('#supplierRegistrationModal .form-step');
    console.log('[Supplier Reg V2] Found steps:', allSteps.length);
    
    allSteps.forEach(step => {
      step.classList.remove('active');
    });

    const currentStepEl = document.querySelector(`#supplierRegistrationModal .form-step[data-step="${stepNumber}"]`);
    console.log('[Supplier Reg V2] Current step element:', currentStepEl);
    
    if (currentStepEl) {
      currentStepEl.classList.add('active');
      console.log('[Supplier Reg V2] Added active class to step', stepNumber);
    } else {
      console.error('[Supplier Reg V2] Could not find step element for step', stepNumber);
    }

    // Step-specific rendering
    if (stepNumber === 2) {
      renderProductList();
    } else if (stepNumber === 5) {
      renderReviewSummary();
      renderDocumentList();
    }
  }

  function updateProgressIndicator() {
    for (let i = 1; i <= state.totalSteps; i++) {
      const progressStep = document.querySelector(`.progress-step[data-step="${i}"]`);
      if (!progressStep) continue;

      if (i < state.currentStep) {
        progressStep.classList.add('completed');
        progressStep.classList.remove('active');
      } else if (i === state.currentStep) {
        progressStep.classList.add('active');
        progressStep.classList.remove('completed');
      } else {
        progressStep.classList.remove('active', 'completed');
      }
    }
  }

  function updateNavigationButtons() {
    const btnPrev = document.getElementById('btnPrevStep');
    const btnNext = document.getElementById('btnNextStep');
    const btnSubmit = document.getElementById('btnSubmitForm');

    console.log('[Supplier Reg V2] updateNavigationButtons - currentStep:', state.currentStep, 'totalSteps:', state.totalSteps);

    if (btnPrev) {
      if (state.currentStep === 1) {
        btnPrev.style.display = 'none';
        btnPrev.style.setProperty('display', 'none', 'important');
      } else {
        btnPrev.style.display = 'inline-block';
        btnPrev.style.setProperty('display', 'inline-block', 'important');
      }
    }

    if (btnNext) {
      if (state.currentStep === state.totalSteps) {
        btnNext.style.display = 'none';
        btnNext.style.setProperty('display', 'none', 'important');
      } else {
        btnNext.style.display = 'inline-block';
        btnNext.style.setProperty('display', 'inline-block', 'important');
      }
    }

    if (btnSubmit) {
      if (state.currentStep === state.totalSteps) {
        btnSubmit.style.display = 'inline-block';
        btnSubmit.style.setProperty('display', 'inline-block', 'important');
      } else {
        btnSubmit.style.display = 'none';
        btnSubmit.style.setProperty('display', 'none', 'important');
      }
    }
    
    console.log('[Supplier Reg V2] Button visibility - Prev:', btnPrev?.style.display, 'Next:', btnNext?.style.display, 'Submit:', btnSubmit?.style.display);
  }

  // ============================================================================
  // FORM DATA MANAGEMENT
  // ============================================================================

  function setupFormInputListeners() {
    const form = document.getElementById('supplierRegistrationForm');
    if (!form) return;

    form.addEventListener('input', (e) => {
      const input = e.target;
      
      // Clear validation error for this field
      if (state.validationErrors[input.name]) {
        delete state.validationErrors[input.name];
        clearFieldError(input.name);
      }
    });
  }

  function saveStepData(stepNumber) {
    const form = document.getElementById('supplierRegistrationForm');
    if (!form) return;

    switch (stepNumber) {
      case 1:
        state.formData.businessName = form.querySelector('#sr-businessName')?.value || '';
        state.formData.supplierType = form.querySelector('#sr-supplierType')?.value || '';
        state.formData.businessRegistrationStatus = form.querySelector('#sr-businessRegStatus')?.value || '';
        state.formData.registrationNumber = form.querySelector('#sr-regNumber')?.value || '';
        state.formData.yearsInBusiness = form.querySelector('#sr-yearsInBusiness')?.value || '';
        state.formData.mainBusinessLocation = form.querySelector('#sr-mainLocation')?.value || '';
        state.formData.contactPerson = form.querySelector('#sr-contactPerson')?.value || '';
        state.formData.phoneNumber = form.querySelector('#sr-phone')?.value || '';
        state.formData.emailAddress = form.querySelector('#sr-email')?.value || '';
        state.formData.altContactName = form.querySelector('#sr-altContactName')?.value || '';
        state.formData.altContactPhone = form.querySelector('#sr-altContactPhone')?.value || '';
        break;

      case 3:
        state.formData.stockLocationCounty = form.querySelector('#sr-stockCounty')?.value || '';
        state.formData.stockLocationTown = form.querySelector('#sr-stockTown')?.value || '';
        state.formData.warehouseAddress = form.querySelector('#sr-warehouseAddr')?.value || '';
        state.formData.townsServed = form.querySelector('#sr-townsServed')?.value || '';
        
        // Delivery capability
        const deliveryRadio = form.querySelector('input[name="deliveryCapability"]:checked');
        state.formData.deliveryCapability = deliveryRadio?.value || '';
        
        // Delivery methods
        const deliveryMethods = Array.from(form.querySelectorAll('input[name="deliveryMethod"]:checked')).map(cb => cb.value);
        state.formData.deliveryMethod = deliveryMethods;
        
        state.formData.deliveryLeadTime = form.querySelector('#sr-deliveryTime')?.value || '';
        state.formData.deliveryChargeMethod = form.querySelector('#sr-deliveryFee')?.value || '';
        state.formData.minimumOrderForDelivery = form.querySelector('#sr-minDelivery')?.value || '';
        break;

      case 4:
        state.formData.minimumOrderValue = form.querySelector('#sr-minOrderVal')?.value || '';
        state.formData.maximumOrderValue = form.querySelector('#sr-maxOrderVal')?.value || '';
        state.formData.fulfillmentLeadTime = form.querySelector('#sr-fulfillmentTime')?.value || '';
        
        // Payment methods
        const paymentMethods = Array.from(form.querySelectorAll('input[name="paymentMethods"]:checked')).map(cb => cb.value);
        state.formData.paymentMethods = paymentMethods;
        
        state.formData.preferredPaymentMethod = form.querySelector('#sr-preferredPayment')?.value || '';
        
        // Deferred payment
        const deferredRadio = form.querySelector('input[name="deferredPayment"]:checked');
        state.formData.deferredPayment = deferredRadio?.value || '';
        
        const deferredPeriods = Array.from(form.querySelectorAll('input[name="deferredPeriod"]:checked')).map(cb => cb.value);
        state.formData.deferredPeriods = deferredPeriods;
        
        // Clear validation error for deferredPeriods if any are selected
        if (deferredPeriods.length > 0 && state.validationErrors.deferredPeriods) {
          delete state.validationErrors.deferredPeriods;
          clearFieldError('deferredPeriods');
        }
        
        state.formData.deferredPaymentTerms = form.querySelector('#sr-deferredConditions')?.value || '';
        state.formData.preferredContactMethod = form.querySelector('#sr-contactMethod')?.value || '';
        break;

      case 5:
        state.formData.termsAccepted = form.querySelector('#sr-termsCheck')?.checked || false;
        
        // Collect selected certification types
        const certTypes = Array.from(form.querySelectorAll('input[name="certType"]:checked')).map(cb => cb.value);
        if (certTypes.length > 0 && state.formData.certifications.length === 0) {
          // Auto-create certification entries if not already added
          certTypes.forEach(type => {
            if (!state.formData.certifications.find(c => c.certificationType === type)) {
              state.formData.certifications.push({
                certificationType: type,
                certificationNumber: '',
                issuingAuthority: '',
                issueDate: '',
                expiryDate: '',
                documentUrl: ''
              });
            }
          });
        }
        break;
    }
  }

  function populateStaticOptions() {
    // Populate stock location county dropdown
    const stockCountySelect = document.getElementById('sr-stockCounty');
    if (stockCountySelect) {
      stockCountySelect.innerHTML = '<option value="">Select county</option>';
      KENYA_COUNTIES.forEach(county => {
        const option = document.createElement('option');
        option.value = county;
        option.textContent = county;
        stockCountySelect.appendChild(option);
      });
    }

    // Populate product category dropdown in product form
    const pCategorySelect = document.getElementById('sr-pCategory');
    if (pCategorySelect) {
      pCategorySelect.innerHTML = '<option value="">Select category</option>';
      PRODUCT_CATEGORIES.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        pCategorySelect.appendChild(option);
      });
      
      // Add change handler for "Other" category
      pCategorySelect.addEventListener('change', function() {
        const otherCategoryContainer = document.getElementById('sr-otherCategoryContainer');
        
        if (this.value === 'Other') {
          // Create container if it doesn't exist
          if (!otherCategoryContainer) {
            const container = document.createElement('div');
            container.id = 'sr-otherCategoryContainer';
            container.className = 'form-group';
            container.innerHTML = `
              <label for="sr-otherCategory">Specify Category <span class="required">*</span></label>
              <input type="text" id="sr-otherCategory" placeholder="Enter custom category name">
            `;
            pCategorySelect.closest('.form-group').after(container);
          } else {
            otherCategoryContainer.style.display = 'block';
          }
        } else {
          // Hide other category input
          if (otherCategoryContainer) {
            otherCategoryContainer.style.display = 'none';
          }
        }
      });
    }

    // Populate unit of measure dropdown
    const pUnitSelect = document.getElementById('sr-pUnit');
    if (pUnitSelect) {
      pUnitSelect.innerHTML = '<option value="">Select unit</option>';
      UNITS_OF_MEASURE.forEach(unit => {
        const option = document.createElement('option');
        option.value = unit;
        option.textContent = unit;
        pUnitSelect.appendChild(option);
      });
    }
  }

  // ============================================================================
  // CATEGORIES MULTI-SELECT (STEP 2)
  // ============================================================================

  function setupCategoriesMultiSelect() {
    const container = document.getElementById('sr-categoriesSelect');
    if (!container) return;

    const searchInput = container.querySelector('.sms-search');
    const optionsContainer = container.querySelector('.sms-options');
    const chipsContainer = container.querySelector('.sms-chips');

    // Render options
    renderCategoriesOptions();

    // Search filter
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase();
        const options = optionsContainer.querySelectorAll('.sms-option');
        
        if (query === '') {
          // Reset all options to visible when search is cleared
          options.forEach(opt => {
            opt.style.display = 'block';
          });
        } else {
          // Filter based on query
          options.forEach(opt => {
            const text = opt.textContent.toLowerCase();
            opt.style.display = text.includes(query) ? 'block' : 'none';
          });
        }
      });
    }

    // Option click
    if (optionsContainer) {
      optionsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('sms-option')) {
          const value = e.target.dataset.value;
          toggleCategory(value);
          renderCategoriesChips();
          e.target.classList.toggle('selected');
        }
      });
    }

    // Initial render
    renderCategoriesChips();
  }

  function renderCategoriesOptions() {
    const optionsContainer = document.querySelector('#sr-categoriesSelect .sms-options');
    if (!optionsContainer) return;

    PRODUCT_CATEGORIES.forEach(cat => {
      const option = document.createElement('div');
      option.className = 'sms-option';
      option.dataset.value = cat;
      option.textContent = cat;
      if (state.formData.categories.includes(cat)) {
        option.classList.add('selected');
      }
      optionsContainer.appendChild(option);
    });
  }

  function toggleCategory(category) {
    const index = state.formData.categories.indexOf(category);
    if (index > -1) {
      state.formData.categories.splice(index, 1);
    } else {
      state.formData.categories.push(category);
    }

    // Clear validation error if exists
    if (state.validationErrors.categories) {
      delete state.validationErrors.categories;
      clearFieldError('categories');
    }

    // Update product category dropdown
    updateProductCategoryOptions();
  }

  function renderCategoriesChips() {
    const chipsContainer = document.querySelector('#sr-categoriesSelect .sms-chips');
    if (!chipsContainer) return;

    chipsContainer.innerHTML = '';

    state.formData.categories.forEach(cat => {
      const chip = document.createElement('div');
      chip.className = 'chip';
      chip.innerHTML = `${cat} <span class="chip-remove" data-category="${cat}">×</span>`;
      chipsContainer.appendChild(chip);
    });

    // Chip remove handlers
    chipsContainer.querySelectorAll('.chip-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.dataset.category;
        toggleCategory(cat);
        renderCategoriesChips();
        // Update option visual state
        const option = document.querySelector(`.sms-option[data-value="${cat}"]`);
        if (option) option.classList.remove('selected');
      });
    });
  }

  function updateProductCategoryOptions() {
    const pCategorySelect = document.getElementById('sr-pCategory');
    if (!pCategorySelect) return;

    const currentValue = pCategorySelect.value;
    pCategorySelect.innerHTML = '<option value="">Select category</option>';

    state.formData.categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      pCategorySelect.appendChild(option);
    });

    // Restore selection if still valid
    if (state.formData.categories.includes(currentValue)) {
      pCategorySelect.value = currentValue;
    }
  }

  // ============================================================================
  // COUNTIES MULTI-SELECT (STEP 3)
  // ============================================================================

  function setupCountiesMultiSelect() {
    const container = document.getElementById('sr-countiesServedSelect');
    if (!container) return;

    const searchInput = container.querySelector('.sms-search');
    const optionsContainer = container.querySelector('.sms-options');
    const chipsContainer = container.querySelector('.sms-chips');
    const countBadge = document.getElementById('sr-countiesCount');

    // Render options
    renderCountiesOptions();

    // Search filter
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase();
        const options = optionsContainer.querySelectorAll('.sms-option');
        
        if (query === '') {
          // Reset all options to visible when search is cleared
          options.forEach(opt => {
            opt.style.display = 'block';
          });
        } else {
          // Filter based on query
          options.forEach(opt => {
            const text = opt.textContent.toLowerCase();
            opt.style.display = text.includes(query) ? 'block' : 'none';
          });
        }
      });
    }

    // Option click
    if (optionsContainer) {
      optionsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('sms-option')) {
          const value = e.target.dataset.value;
          toggleCounty(value);
          renderCountiesChips();
          updateCountyBadge();
          e.target.classList.toggle('selected');
        }
      });
    }

    // Initial render
    renderCountiesChips();
    updateCountyBadge();
  }

  function renderCountiesOptions() {
    const optionsContainer = document.querySelector('#sr-countiesServedSelect .sms-options');
    if (!optionsContainer) return;

    KENYA_COUNTIES.forEach(county => {
      const option = document.createElement('div');
      option.className = 'sms-option';
      option.dataset.value = county;
      option.textContent = county;
      if (state.formData.countiesServed.includes(county)) {
        option.classList.add('selected');
      }
      optionsContainer.appendChild(option);
    });
  }

  function toggleCounty(county) {
    const index = state.formData.countiesServed.indexOf(county);
    if (index > -1) {
      state.formData.countiesServed.splice(index, 1);
    } else {
      state.formData.countiesServed.push(county);
    }

    // Clear validation error if exists
    if (state.validationErrors.countiesServed) {
      delete state.validationErrors.countiesServed;
      clearFieldError('countiesServed');
    }
  }

  function renderCountiesChips() {
    const chipsContainer = document.querySelector('#sr-countiesServedSelect .sms-chips');
    if (!chipsContainer) return;

    chipsContainer.innerHTML = '';

    state.formData.countiesServed.forEach(county => {
      const chip = document.createElement('div');
      chip.className = 'chip';
      chip.innerHTML = `${county} <span class="chip-remove" data-county="${county}">×</span>`;
      chipsContainer.appendChild(chip);
    });

    // Chip remove handlers
    chipsContainer.querySelectorAll('.chip-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const county = btn.dataset.county;
        toggleCounty(county);
        renderCountiesChips();
        updateCountyBadge();
        // Update option visual state
        const option = document.querySelector(`#sr-countiesServedSelect .sms-option[data-value="${county}"]`);
        if (option) option.classList.remove('selected');
      });
    });
  }

  function updateCountyBadge() {
    const countBadge = document.getElementById('sr-countiesCount');
    if (countBadge) {
      countBadge.textContent = `${state.formData.countiesServed.length} selected`;
    }
  }

  // ============================================================================
  // PRODUCT MANAGEMENT (STEP 2)
  // ============================================================================

  function setupProductManagement() {
    const addProductBtn = document.getElementById('sr-addProductBtn');
    const saveProductBtn = document.getElementById('sr-saveProductBtn');
    const cancelProductBtn = document.getElementById('sr-cancelProductBtn');

    if (addProductBtn) {
      addProductBtn.addEventListener('click', () => {
        state.editingProductIndex = null;
        showProductForm();
        clearProductForm();
      });
    }

    if (saveProductBtn) {
      saveProductBtn.addEventListener('click', saveProduct);
    }

    if (cancelProductBtn) {
      cancelProductBtn.addEventListener('click', hideProductForm);
    }
  }

  function showProductForm() {
    const form = document.getElementById('sr-productEntryForm');
    const title = document.getElementById('sr-productFormTitle');
    if (form) form.style.display = 'block';
    if (title) title.textContent = state.editingProductIndex !== null ? 'Edit Product' : 'Add Product';
  }

  function hideProductForm() {
    const form = document.getElementById('sr-productEntryForm');
    if (form) form.style.display = 'none';
    state.editingProductIndex = null;
  }

  function clearProductForm() {
    document.getElementById('sr-pName').value = '';
    document.getElementById('sr-pCategory').value = '';
    document.getElementById('sr-pSku').value = '';
    document.getElementById('sr-pUnit').value = '';
    document.getElementById('sr-pPrice').value = '';
    document.getElementById('sr-pMoq').value = '';
    document.getElementById('sr-pStock').value = '';
    document.getElementById('sr-pQty').value = '';
    document.getElementById('sr-pDesc').value = '';
    document.getElementById('sr-pBrand').value = '';
    
    // Hide and clear "Other" category input if it exists
    const otherCategoryContainer = document.getElementById('sr-otherCategoryContainer');
    if (otherCategoryContainer) {
      otherCategoryContainer.style.display = 'none';
      const otherInput = document.getElementById('sr-otherCategory');
      if (otherInput) otherInput.value = '';
    }
  }

  function saveProduct() {
    console.log('[Supplier Reg V2] saveProduct called');
    
    let category = document.getElementById('sr-pCategory')?.value || '';
    
    // If "Other" is selected, use the custom category input
    if (category === 'Other') {
      const otherCategoryInput = document.getElementById('sr-otherCategory');
      const customCategory = otherCategoryInput?.value.trim() || '';
      if (!customCategory) {
        showToastIfAvailable('Please specify the category', 'error');
        return;
      }
      category = customCategory;
    }
    
    const productData = {
      productName: document.getElementById('sr-pName')?.value.trim() || '',
      category: category,
      sku: document.getElementById('sr-pSku')?.value.trim() || '',
      unitOfMeasure: document.getElementById('sr-pUnit')?.value || '',
      unitPrice: parseFloat(document.getElementById('sr-pPrice')?.value) || 0,
      moq: parseInt(document.getElementById('sr-pMoq')?.value) || 1,
      stockStatus: document.getElementById('sr-pStock')?.value || '',
      availableQuantity: parseInt(document.getElementById('sr-pQty')?.value) || null,
      productDescription: document.getElementById('sr-pDesc')?.value.trim() || '',
      brand: document.getElementById('sr-pBrand')?.value.trim() || ''
    };

    console.log('[Supplier Reg V2] Product data:', productData);

    // Validate
    if (!productData.productName || !productData.category || !productData.unitOfMeasure || 
        !productData.unitPrice || !productData.stockStatus) {
      console.error('[Supplier Reg V2] Validation failed:', { productName: productData.productName, category: productData.category, unitOfMeasure: productData.unitOfMeasure, unitPrice: productData.unitPrice, stockStatus: productData.stockStatus });
      showToastIfAvailable('Please fill in all required product fields', 'error');
      return;
    }

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
      console.error('[Supplier Reg V2] Duplicate product found');
      showToastIfAvailable(`Product "${productData.productName}" in category "${productData.category}" already exists`, 'error');
      return;
    }

    if (state.editingProductIndex !== null) {
      // Update existing
      state.formData.products[state.editingProductIndex] = productData;
      console.log('[Supplier Reg V2] Product updated at index', state.editingProductIndex);
    } else {
      // Add new
      state.formData.products.push(productData);
      console.log('[Supplier Reg V2] New product added. Total products:', state.formData.products.length);
    }

    // Clear validation error if exists
    if (state.validationErrors.products) {
      delete state.validationErrors.products;
      clearFieldError('products');
    }

    hideProductForm();
    clearProductForm();
    renderProductList();
    saveDraft();
    
    showToastIfAvailable('Product saved successfully', 'success');
    console.log('[Supplier Reg V2] Product saved. Current products:', state.formData.products);
  }

  function renderProductList() {
    const listContainer = document.getElementById('sr-productList');
    if (!listContainer) return;

    listContainer.innerHTML = '';

    if (state.formData.products.length === 0) {
      listContainer.innerHTML = '<p class="text-center" style="color:#64748b; padding:2rem;">No products added yet</p>';
      return;
    }

    state.formData.products.forEach((product, index) => {
      const card = document.createElement('div');
      card.className = 'product-card';
      card.innerHTML = `
        <div class="product-card-header">
          <div class="product-name">${product.productName}</div>
          <div class="product-actions">
            <button type="button" class="btn-icon" data-action="edit" data-index="${index}" title="Edit product">✏️</button>
            <button type="button" class="btn-icon" data-action="delete" data-index="${index}" title="Delete product">🗑️</button>
          </div>
        </div>
        <div class="product-details">
          <div class="product-detail-item">
            <span class="label">Category</span>
            <span class="value">${product.category}</span>
          </div>
          <div class="product-detail-item">
            <span class="label">Unit</span>
            <span class="value">${product.unitOfMeasure}</span>
          </div>
          <div class="product-detail-item">
            <span class="label">Price</span>
            <span class="value">KSh ${product.unitPrice.toFixed(2)}</span>
          </div>
          <div class="product-detail-item">
            <span class="label">MOQ</span>
            <span class="value">${product.moq}</span>
          </div>
          <div class="product-detail-item">
            <span class="label">Status</span>
            <span class="stock-status-badge ${product.stockStatus}">${formatStockStatus(product.stockStatus)}</span>
          </div>
        </div>
      `;
      listContainer.appendChild(card);
    });

    // Event delegation for edit/delete
    listContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-icon');
      if (!btn) return;

      const action = btn.dataset.action;
      const index = parseInt(btn.dataset.index);

      if (action === 'edit') {
        editProduct(index);
      } else if (action === 'delete') {
        deleteProduct(index);
      }
    });
  }

  function editProduct(index) {
    const product = state.formData.products[index];
    state.editingProductIndex = index;

    document.getElementById('sr-pName').value = product.productName;
    document.getElementById('sr-pCategory').value = product.category;
    document.getElementById('sr-pSku').value = product.sku || '';
    document.getElementById('sr-pUnit').value = product.unitOfMeasure;
    document.getElementById('sr-pPrice').value = product.unitPrice;
    document.getElementById('sr-pMoq').value = product.moq;
    document.getElementById('sr-pStock').value = product.stockStatus;
    document.getElementById('sr-pQty').value = product.availableQuantity || '';
    document.getElementById('sr-pDesc').value = product.productDescription || '';
    document.getElementById('sr-pBrand').value = product.brand || '';

    showProductForm();
  }

  function deleteProduct(index) {
    if (confirm('Are you sure you want to delete this product?')) {
      state.formData.products.splice(index, 1);
      renderProductList();
      saveDraft();
    }
  }

  function formatStockStatus(status) {
    const map = {
      'in_stock': 'In Stock',
      'limited_stock': 'Limited',
      'out_of_stock': 'Out of Stock',
      'made_to_order': 'Made to Order'
    };
    return map[status] || status;
  }

  // ============================================================================
  // DOCUMENT MANAGEMENT (STEP 5)
  // ============================================================================

  function setupDocumentManagement() {
    const addDocBtn = document.getElementById('sr-addDocBtn');
    const saveDocBtn = document.getElementById('sr-saveDocBtn');
    const cancelDocBtn = document.getElementById('sr-cancelDocBtn');

    if (addDocBtn) {
      addDocBtn.addEventListener('click', () => {
        state.editingDocumentIndex = null;
        showDocumentForm();
        clearDocumentForm();
      });
    }

    if (saveDocBtn) {
      saveDocBtn.addEventListener('click', saveDocument);
    }

    if (cancelDocBtn) {
      cancelDocBtn.addEventListener('click', hideDocumentForm);
    }
  }

  function showDocumentForm() {
    const form = document.getElementById('sr-documentEntryForm');
    if (form) form.style.display = 'block';
  }

  function hideDocumentForm() {
    const form = document.getElementById('sr-documentEntryForm');
    if (form) form.style.display = 'none';
    state.editingDocumentIndex = null;
  }

  function clearDocumentForm() {
    document.getElementById('sr-docType').value = '';
    document.getElementById('sr-docNumber').value = '';
    document.getElementById('sr-docAuthority').value = '';
    document.getElementById('sr-docIssueDate').value = '';
    document.getElementById('sr-docExpiry').value = '';
  }

  function saveDocument() {
    const docData = {
      documentType: document.getElementById('sr-docType').value,
      documentNumber: document.getElementById('sr-docNumber').value.trim(),
      issuingAuthority: document.getElementById('sr-docAuthority').value.trim(),
      issueDate: document.getElementById('sr-docIssueDate').value,
      expiryDate: document.getElementById('sr-docExpiry').value
    };

    if (!docData.documentType) {
      showToastIfAvailable('Please select a document type', 'error');
      return;
    }

    if (state.editingDocumentIndex !== null) {
      state.formData.documents[state.editingDocumentIndex] = docData;
    } else {
      state.formData.documents.push(docData);
    }

    hideDocumentForm();
    clearDocumentForm();
    renderDocumentList();
    saveDraft();
  }

  function renderDocumentList() {
    const listContainer = document.getElementById('sr-documentList');
    if (!listContainer) return;

    listContainer.innerHTML = '';

    if (state.formData.documents.length === 0) {
      return;
    }

    state.formData.documents.forEach((doc, index) => {
      const card = document.createElement('div');
      card.className = 'document-card';
      card.innerHTML = `
        <div class="document-info">
          <div class="document-type">${doc.documentType}</div>
          <div class="document-number">${doc.documentNumber || 'No number provided'}</div>
        </div>
        <button type="button" class="btn-icon" data-action="delete-doc" data-index="${index}" title="Remove document">🗑️</button>
      `;
      listContainer.appendChild(card);
    });

    listContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-icon');
      if (btn && btn.dataset.action === 'delete-doc') {
        const index = parseInt(btn.dataset.index);
        state.formData.documents.splice(index, 1);
        renderDocumentList();
        saveDraft();
      }
    });
  }

  // ============================================================================
  // CERTIFICATIONS (STEP 5)
  // ============================================================================

  function setupCertifications() {
    // Certifications are handled via checkboxes
    // No additional setup needed beyond form data capture in saveStepData
  }

  // ============================================================================
  // CONDITIONAL FIELDS
  // ============================================================================

  function setupConditionalFields() {
    // Registration number field visibility
    const businessRegStatusSelect = document.getElementById('sr-businessRegStatus');
    const regNumberGroup = document.getElementById('sr-regNumberGroup');

    if (businessRegStatusSelect && regNumberGroup) {
      businessRegStatusSelect.addEventListener('change', () => {
        if (businessRegStatusSelect.value === 'not_registered') {
          regNumberGroup.style.display = 'none';
        } else {
          regNumberGroup.style.display = 'block';
        }
      });
    }

    // Delivery details visibility
    const deliveryRadios = document.querySelectorAll('input[name="deliveryCapability"]');
    const deliveryDetails = document.getElementById('sr-deliveryDetails');

    deliveryRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.value === 'yes' || radio.value === 'depends') {
          deliveryDetails.style.display = 'block';
        } else {
          deliveryDetails.style.display = 'none';
        }
      });
    });

    // Deferred payment details visibility
    const deferredRadios = document.querySelectorAll('input[name="deferredPayment"]');
    const deferredDetails = document.getElementById('sr-deferredDetails');

    deferredRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.value === 'yes_agreed' || radio.value === 'yes_after_verification') {
          deferredDetails.style.display = 'block';
        } else {
          deferredDetails.style.display = 'none';
        }
      });
    });

    // Preferred payment method dropdown population from selected payment methods
    const paymentMethodCheckboxes = document.querySelectorAll('input[name="paymentMethods"]');
    const preferredPaymentSelect = document.getElementById('sr-preferredPayment');

    paymentMethodCheckboxes.forEach(cb => {
      cb.addEventListener('change', () => {
        updatePreferredPaymentOptions();
      });
    });
  }

  /**
   * Update conditional field visibility based on current form data
   * Called after loading draft to ensure hidden fields are shown if needed
   */
  function updateConditionalFieldVisibility() {
    // Registration number field
    const businessRegStatusSelect = document.getElementById('sr-businessRegStatus');
    const regNumberGroup = document.getElementById('sr-regNumberGroup');
    if (businessRegStatusSelect && regNumberGroup && state.formData.businessRegistrationStatus) {
      businessRegStatusSelect.value = state.formData.businessRegistrationStatus;
      if (state.formData.businessRegistrationStatus === 'not_registered') {
        regNumberGroup.style.display = 'none';
      } else {
        regNumberGroup.style.display = 'block';
      }
    }

    // Delivery details
    const deliveryDetails = document.getElementById('sr-deliveryDetails');
    if (deliveryDetails && state.formData.deliveryCapability) {
      const deliveryRadio = document.querySelector(`input[name="deliveryCapability"][value="${state.formData.deliveryCapability}"]`);
      if (deliveryRadio) {
        deliveryRadio.checked = true;
      }
      if (state.formData.deliveryCapability === 'yes' || state.formData.deliveryCapability === 'depends') {
        deliveryDetails.style.display = 'block';
      }
    }

    // Deferred payment details
    const deferredDetails = document.getElementById('sr-deferredDetails');
    if (deferredDetails && state.formData.deferredPayment) {
      const deferredRadio = document.querySelector(`input[name="deferredPayment"][value="${state.formData.deferredPayment}"]`);
      if (deferredRadio) {
        deferredRadio.checked = true;
      }
      if (state.formData.deferredPayment === 'yes_agreed' || state.formData.deferredPayment === 'yes_after_verification') {
        deferredDetails.style.display = 'block';
      }
    }
  }

  function updatePreferredPaymentOptions() {
    const preferredPaymentSelect = document.getElementById('sr-preferredPayment');
    if (!preferredPaymentSelect) return;

    const currentValue = preferredPaymentSelect.value;
    const selectedMethods = Array.from(document.querySelectorAll('input[name="paymentMethods"]:checked')).map(cb => cb.value);

    preferredPaymentSelect.innerHTML = '<option value="">Select preferred method</option>';

    selectedMethods.forEach(method => {
      const option = document.createElement('option');
      option.value = method;
      option.textContent = formatPaymentMethod(method);
      preferredPaymentSelect.appendChild(option);
    });

    if (selectedMethods.includes(currentValue)) {
      preferredPaymentSelect.value = currentValue;
    }
  }

  function formatPaymentMethod(method) {
    const map = {
      'mpesa': 'M-Pesa',
      'bank_transfer': 'Bank Transfer',
      'cash': 'Cash',
      'other': 'Other'
    };
    return map[method] || method;
  }

  // ============================================================================
  // REVIEW SUMMARY (STEP 5)
  // ============================================================================

  function renderReviewSummary() {
    const summaryContainer = document.getElementById('sr-reviewSummary');
    if (!summaryContainer) return;

    summaryContainer.innerHTML = `
      <div class="summary-section">
        <div class="summary-section-title">
          Business Profile
          <a href="#" class="edit-link" data-jump="1">Edit</a>
        </div>
        <div class="summary-row"><span class="label">Business Name:</span><span class="value">${state.formData.businessName || '—'}</span></div>
        <div class="summary-row"><span class="label">Supplier Type:</span><span class="value">${state.formData.supplierType || '—'}</span></div>
        <div class="summary-row"><span class="label">Contact Person:</span><span class="value">${state.formData.contactPerson || '—'}</span></div>
        <div class="summary-row"><span class="label">Phone:</span><span class="value">${state.formData.phoneNumber || '—'}</span></div>
        <div class="summary-row"><span class="label">Email:</span><span class="value">${state.formData.emailAddress || '—'}</span></div>
      </div>

      <div class="summary-section">
        <div class="summary-section-title">
          Products & Pricing
          <a href="#" class="edit-link" data-jump="2">Edit</a>
        </div>
        <div class="summary-row"><span class="label">Categories:</span><span class="value">${state.formData.categories.join(', ') || '—'}</span></div>
        <div class="summary-row"><span class="label">Products Added:</span><span class="value">${state.formData.products.length}</span></div>
      </div>

      <div class="summary-section">
        <div class="summary-section-title">
          Coverage & Delivery
          <a href="#" class="edit-link" data-jump="3">Edit</a>
        </div>
        <div class="summary-row"><span class="label">Stock Location:</span><span class="value">${state.formData.stockLocationCounty || '—'}, ${state.formData.stockLocationTown || '—'}</span></div>
        <div class="summary-row"><span class="label">Counties Served:</span><span class="value">${state.formData.countiesServed.length} counties</span></div>
        <div class="summary-row"><span class="label">Delivery:</span><span class="value">${state.formData.deliveryCapability || '—'}</span></div>
      </div>

      <div class="summary-section">
        <div class="summary-section-title">
          Commercial Terms
          <a href="#" class="edit-link" data-jump="4">Edit</a>
        </div>
        <div class="summary-row"><span class="label">Min Order Value:</span><span class="value">KSh ${state.formData.minimumOrderValue || '—'}</span></div>
        <div class="summary-row"><span class="label">Max Order Value:</span><span class="value">KSh ${state.formData.maximumOrderValue || '—'}</span></div>
        <div class="summary-row"><span class="label">Payment Methods:</span><span class="value">${state.formData.paymentMethods.join(', ') || '—'}</span></div>
        <div class="summary-row"><span class="label">Deferred Payment:</span><span class="value">${state.formData.deferredPayment || '—'}</span></div>
      </div>
    `;

    // Edit link handlers
    summaryContainer.querySelectorAll('.edit-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const step = parseInt(link.dataset.jump);
        navigateToStep(step);
      });
    });
  }

  // ============================================================================
  // VALIDATION
  // ============================================================================

  function validateStep(stepNumber) {
    const errors = {};

    switch (stepNumber) {
      case 1:
        if (!state.formData.businessName?.trim()) errors.businessName = 'Business name is required';
        if (!state.formData.supplierType) errors.supplierType = 'Supplier type is required';
        if (!state.formData.businessRegistrationStatus) errors.businessRegistrationStatus = 'Registration status is required';
        if (!state.formData.yearsInBusiness) errors.yearsInBusiness = 'Years in business is required';
        if (!state.formData.mainBusinessLocation?.trim()) errors.mainBusinessLocation = 'Main business location is required';
        if (!state.formData.contactPerson?.trim()) errors.contactPerson = 'Contact person is required';
        if (!state.formData.phoneNumber?.trim()) errors.phoneNumber = 'Phone number is required';
        else if (!validatePhone(state.formData.phoneNumber)) errors.phoneNumber = 'Invalid phone format';
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
        break;

      case 4:
        if (!state.formData.minimumOrderValue || parseFloat(state.formData.minimumOrderValue) <= 0) {
          errors.minimumOrderValue = 'Minimum order value is required';
        }
        if (!state.formData.maximumOrderValue || parseFloat(state.formData.maximumOrderValue) <= 0) {
          errors.maximumOrderValue = 'Maximum order value is required';
        }
        
        // Validate max >= min
        const minVal = parseFloat(state.formData.minimumOrderValue) || 0;
        const maxVal = parseFloat(state.formData.maximumOrderValue) || 0;
        if (minVal > 0 && maxVal > 0 && maxVal < minVal) {
          errors.maximumOrderValue = 'Maximum order value must be greater than or equal to minimum order value';
        }
        
        if (!state.formData.fulfillmentLeadTime) errors.fulfillmentLeadTime = 'Fulfillment lead time is required';
        if (state.formData.paymentMethods.length === 0) errors.paymentMethods = 'Select at least one payment method';
        if (!state.formData.preferredPaymentMethod) errors.preferredPaymentMethod = 'Preferred payment method is required';
        if (!state.formData.deferredPayment) errors.deferredPayment = 'Deferred payment option is required';
        
        // Validate deferred payment periods when deferred payment is enabled
        if (state.formData.deferredPayment === 'yes_agreed' || state.formData.deferredPayment === 'yes_after_verification') {
          if (!state.formData.deferredPeriods || state.formData.deferredPeriods.length === 0) {
            errors.deferredPeriods = 'Select at least one deferred payment period';
          }
        }
        break;

      case 5:
        if (!state.formData.termsAccepted) errors.termsAccepted = 'You must accept the terms and conditions';
        break;
    }

    return errors;
  }

  function validatePhone(phone) {
    // Validates Kenyan mobile numbers only (07xx or 01xx format, or +254 7xx/1xx)
    // Landlines are not accepted for supplier registration
    const cleaned = phone.replace(/\s/g, '');
    const regex = /^(?:\+254|0)[17]\d{8}$/;
    return regex.test(cleaned);
  }

  function displayValidationErrors() {
    Object.keys(state.validationErrors).forEach(fieldName => {
      // Handle special cases that don't have traditional form-group wrappers
      if (fieldName === 'categories') {
        const container = document.getElementById('sr-categoriesSelect');
        if (container) {
          const parentFormGroup = container.closest('.form-group');
          if (parentFormGroup) {
            parentFormGroup.classList.add('error');
            let errorMsg = parentFormGroup.querySelector('.error-message');
            if (!errorMsg) {
              errorMsg = document.createElement('div');
              errorMsg.className = 'error-message';
              parentFormGroup.appendChild(errorMsg);
            }
            errorMsg.textContent = state.validationErrors[fieldName];
          }
        }
        return;
      }

      if (fieldName === 'products') {
        const container = document.getElementById('sr-productList');
        if (container) {
          const parentFormGroup = container.closest('.form-group');
          if (parentFormGroup) {
            parentFormGroup.classList.add('error');
            let errorMsg = parentFormGroup.querySelector('.error-message');
            if (!errorMsg) {
              errorMsg = document.createElement('div');
              errorMsg.className = 'error-message';
              parentFormGroup.appendChild(errorMsg);
            }
            errorMsg.textContent = state.validationErrors[fieldName];
          }
        }
        return;
      }

      if (fieldName === 'countiesServed') {
        const container = document.getElementById('sr-countiesServedSelect');
        if (container) {
          const parentFormGroup = container.closest('.form-group');
          if (parentFormGroup) {
            parentFormGroup.classList.add('error');
            let errorMsg = parentFormGroup.querySelector('.error-message');
            if (!errorMsg) {
              errorMsg = document.createElement('div');
              errorMsg.className = 'error-message';
              parentFormGroup.appendChild(errorMsg);
            }
            errorMsg.textContent = state.validationErrors[fieldName];
          }
        }
        return;
      }

      if (fieldName === 'deferredPeriods') {
        // Find the checkbox group within sr-deferredDetails
        const deferredDetails = document.getElementById('sr-deferredDetails');
        if (deferredDetails) {
          const checkboxGroup = deferredDetails.querySelector('.checkbox-group');
          if (checkboxGroup) {
            const parentFormGroup = checkboxGroup.closest('.form-group');
            if (parentFormGroup) {
              parentFormGroup.classList.add('error');
              let errorMsg = parentFormGroup.querySelector('.error-message');
              if (!errorMsg) {
                errorMsg = document.createElement('div');
                errorMsg.className = 'error-message';
                parentFormGroup.appendChild(errorMsg);
              }
              errorMsg.textContent = state.validationErrors[fieldName];
            }
          }
        }
        return;
      }

      // Standard field error handling
      const input = document.querySelector(`[name="${fieldName}"], #sr-${fieldName}`);
      if (!input) return;

      const formGroup = input.closest('.form-group');
      if (formGroup) {
        formGroup.classList.add('error');
        let errorMsg = formGroup.querySelector('.error-message');
        if (!errorMsg) {
          errorMsg = document.createElement('div');
          errorMsg.className = 'error-message';
          formGroup.appendChild(errorMsg);
        }
        errorMsg.textContent = state.validationErrors[fieldName];
      }
    });
  }

  function clearValidationErrors() {
    document.querySelectorAll('.form-group.error').forEach(group => {
      group.classList.remove('error');
      const errorMsg = group.querySelector('.error-message');
      if (errorMsg) errorMsg.remove();
    });
  }

  function clearFieldError(fieldName) {
    // Handle special cases
    if (fieldName === 'categories') {
      const container = document.getElementById('sr-categoriesSelect');
      if (container) {
        const parentFormGroup = container.closest('.form-group');
        if (parentFormGroup) {
          parentFormGroup.classList.remove('error');
          const errorMsg = parentFormGroup.querySelector('.error-message');
          if (errorMsg) errorMsg.remove();
        }
      }
      return;
    }

    if (fieldName === 'products') {
      const container = document.getElementById('sr-productList');
      if (container) {
        const parentFormGroup = container.closest('.form-group');
        if (parentFormGroup) {
          parentFormGroup.classList.remove('error');
          const errorMsg = parentFormGroup.querySelector('.error-message');
          if (errorMsg) errorMsg.remove();
        }
      }
      return;
    }

    if (fieldName === 'countiesServed') {
      const container = document.getElementById('sr-countiesServedSelect');
      if (container) {
        const parentFormGroup = container.closest('.form-group');
        if (parentFormGroup) {
          parentFormGroup.classList.remove('error');
          const errorMsg = parentFormGroup.querySelector('.error-message');
          if (errorMsg) errorMsg.remove();
        }
      }
      return;
    }

    if (fieldName === 'deferredPeriods') {
      const deferredDetails = document.getElementById('sr-deferredDetails');
      if (deferredDetails) {
        const checkboxGroup = deferredDetails.querySelector('.checkbox-group');
        if (checkboxGroup) {
          const parentFormGroup = checkboxGroup.closest('.form-group');
          if (parentFormGroup) {
            parentFormGroup.classList.remove('error');
            const errorMsg = parentFormGroup.querySelector('.error-message');
            if (errorMsg) errorMsg.remove();
          }
        }
      }
      return;
    }

    // Standard field error clearing
    const input = document.querySelector(`[name="${fieldName}"], #sr-${fieldName}`);
    if (!input) return;

    const formGroup = input.closest('.form-group');
    if (formGroup) {
      formGroup.classList.remove('error');
      const errorMsg = formGroup.querySelector('.error-message');
      if (errorMsg) errorMsg.remove();
    }
  }

  // ============================================================================
  // FORM SUBMISSION
  // ============================================================================

  function handleSubmit(e) {
    if (e) e.preventDefault();

    // Save step 5 data
    saveStepData(5);

    // Final validation
    const errors = validateStep(5);
    if (Object.keys(errors).length > 0) {
      state.validationErrors = errors;
      displayValidationErrors();
      showToastIfAvailable('Please accept the terms and conditions', 'error');
      return;
    }

    // Build payload
    const payload = {
      companyName: state.formData.businessName,
      supplierType: state.formData.supplierType,
      businessRegistrationStatus: state.formData.businessRegistrationStatus,
      registrationNumber: state.formData.registrationNumber,
      yearsInBusiness: state.formData.yearsInBusiness,
      mainBusinessLocation: state.formData.mainBusinessLocation,
      contactPerson: state.formData.contactPerson,
      phone: state.formData.phoneNumber,
      email: state.formData.emailAddress,
      alternativeContactName: state.formData.altContactName,
      alternativeContactPhone: state.formData.altContactPhone,
      
      categories: state.formData.categories,
      products: state.formData.products,
      
      stockLocationCounty: state.formData.stockLocationCounty,
      stockLocationTown: state.formData.stockLocationTown,
      warehouseAddress: state.formData.warehouseAddress,
      countiesServed: state.formData.countiesServed,
      townsServedByCounty: {}, // Future enhancement
      deliveryCapability: state.formData.deliveryCapability,
      deliveryMethod: state.formData.deliveryMethod,
      deliveryLeadTime: state.formData.deliveryLeadTime,
      deliveryChargeMethod: state.formData.deliveryChargeMethod,
      minimumOrderForDelivery: parseFloat(state.formData.minimumOrderForDelivery) || null,
      
      minimumOrderValue: parseFloat(state.formData.minimumOrderValue),
      maximumOrderValue: parseFloat(state.formData.maximumOrderValue),
      fulfillmentLeadTime: state.formData.fulfillmentLeadTime,
      paymentMethods: state.formData.paymentMethods,
      preferredPaymentMethod: state.formData.preferredPaymentMethod,
      acceptsDeferredPayment: state.formData.deferredPayment === 'yes_agreed' || state.formData.deferredPayment === 'yes_after_verification',
      deferredPaymentPeriods: state.formData.deferredPeriods.map(p => parseInt(p.replace('_days', ''))),
      deferredPaymentConditions: state.formData.deferredPaymentTerms,
      preferredContactMethod: state.formData.preferredContactMethod,
      
      certifications: state.formData.certifications,
      termsAccepted: state.formData.termsAccepted
    };

    // Submit
    submitRegistration(payload);
  }

  async function submitRegistration(payload) {
    // Show loading spinner
    showLoadingSpinner();

    try {
      // Check if window.supabase exists
      if (typeof window.supabase === 'undefined' || !window.supabase.functions) {
        throw new Error('Supabase client not available');
      }

      const { data, error } = await window.supabase.functions.invoke('supplier-registration-submit', {
        body: payload
      });

      hideLoadingSpinner();

      if (error) {
        throw error;
      }

      if (data && data.success) {
        showToastIfAvailable('Registration submitted successfully! We will contact you shortly.', 'success');
        clearDraft();
        closeModal();
      } else {
        throw new Error(data?.message || 'Registration failed');
      }

    } catch (error) {
      hideLoadingSpinner();
      console.error('Submission error:', error);

      // Check for offline mode
      if (typeof window.offlineFormHandler !== 'undefined') {
        window.offlineFormHandler.saveForm('supplier_registration', payload);
        showToastIfAvailable('You are offline. Registration saved locally and will be submitted when online.', 'info');
        closeModal();
      } else {
        showToastIfAvailable('Submission failed: ' + error.message, 'error');
      }
    }
  }

  function showLoadingSpinner() {
    const spinner = document.createElement('div');
    spinner.className = 'spinner-overlay';
    spinner.id = 'sr-spinner';
    spinner.innerHTML = '<div class="spinner"></div><div class="spinner-text">Submitting registration...</div>';
    document.body.appendChild(spinner);
  }

  function hideLoadingSpinner() {
    const spinner = document.getElementById('sr-spinner');
    if (spinner) spinner.remove();
  }

  // ============================================================================
  // MODAL EVENTS
  // ============================================================================

  function setupModalEvents() {
    const modal = document.getElementById('supplierRegistrationModal');
    const closeBtn = document.getElementById('supplierModalClose');

    if (closeBtn) {
      closeBtn.addEventListener('click', closeModal);
    }

    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeModal();
        }
      });
    }

    // Restore draft on modal open
    // Assumes modal is shown by toggling display or adding class
    const observer = new MutationObserver(() => {
      if (modal.style.display === 'flex' || modal.classList.contains('active')) {
        loadDraft();
        renderStep(state.currentStep);
      }
    });

    if (modal) {
      observer.observe(modal, { attributes: true, attributeFilter: ['style', 'class'] });
    }
  }

  function closeModal() {
    const modal = document.getElementById('supplierRegistrationModal');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('active');
    }
  }

  // ============================================================================
  // LOCAL STORAGE DRAFT
  // ============================================================================

  function saveDraft() {
    try {
      localStorage.setItem('stokika_supplier_draft', JSON.stringify(state.formData));
      localStorage.setItem('stokika_supplier_draft_step', state.currentStep);
    } catch (e) {
      console.warn('Failed to save draft to localStorage:', e);
    }
  }

  function loadDraft() {
    try {
      const saved = localStorage.getItem('stokika_supplier_draft');
      const savedStep = localStorage.getItem('stokika_supplier_draft_step');

      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with state.formData
        Object.keys(parsed).forEach(key => {
          if (parsed[key] !== undefined && parsed[key] !== null) {
            state.formData[key] = parsed[key];
          }
        });
      }

      if (savedStep) {
        state.currentStep = parseInt(savedStep);
      }

      // After loading draft, update conditional field visibility and dependent dropdowns
      updateConditionalFieldVisibility();
      updateProductCategoryOptions();
      updatePreferredPaymentOptions();
    } catch (e) {
      console.warn('Failed to load draft from localStorage:', e);
    }
  }

  function clearDraft() {
    try {
      localStorage.removeItem('stokika_supplier_draft');
      localStorage.removeItem('stokika_supplier_draft_step');
    } catch (e) {
      console.warn('Failed to clear draft from localStorage:', e);
    }
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  function showToastIfAvailable(message, severity) {
    if (typeof window.showToast === 'function') {
      window.showToast(message, severity);
    } else {
      console.log(`[Toast ${severity}] ${message}`);
      alert(message);
    }
  }

  // ============================================================================
  // AUTO-INITIALIZATION
  // ============================================================================

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
