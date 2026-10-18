/**
 * Delivery Partner Registration — Form Controller
 *
 * Steps: 1=Personal | 2=Delivery Profile | 3=Operating Area | 4=Activation (Paywall)
 *
 * Security Architecture:
 *   - STK Push and manual verification run server-side through Supabase Edge Functions
 *     with Safaricom Daraja API credentials protected in environment variables.
 *   - Edge Function `mpesa-stk-push` validates phone, checks rate limits, confirms amount
 *     against database kit configurations, and issues Daraja STK prompt.
 *   - All form inputs undergo real-time client-side XSS / SQL injection sanitization.
 *   - Strict Content Security Policy (CSP) compliant — no inline handlers or styles.
 */

(function () {
    'use strict';

    /* ── State ─────────────────────────────────────────────────────── */
    const state = {
        currentStep:      1,
        totalSteps:       4,
        registrationFee:  1050,
        currency:         'KES',
        paymentMethod:    'stkpush',
        applicationCode:  null,
        paymentIntentId:  null,
        paymentConfirmed: false,
        supabase:         null,
        poller:           null,
        formData:         {}
    };

    /* ── DOM Cache ──────────────────────────────────────────────────── */
    let el = {};

    /* ═══════════════════════════════════════════════════════════════
       Init
    ═══════════════════════════════════════════════════════════════ */
    document.addEventListener('DOMContentLoaded', async () => {
        cacheElements();
        initSupabase();
        fixLogoError();        // CSP-safe broken-image handler
        initSanitization();
        setupPartnerTypeToggle();
        setupGenderOtherToggle();
        setupBusinessTypeOtherToggle();
        setupVehicleCardToggle();
        setupGoodsOtherToggle();
        setupNavigation();
        setupPaymentMethodToggle();
        setupCopyButtons();
        await fetchFee();
    });

    /* ── DOM Cache ──────────────────────────────────────────────────── */
    function cacheElements() {
        el = {
            form:             document.getElementById('deliveryPartnerForm'),
            progressFill:     document.getElementById('progressFill'),
            stepItems:        document.querySelectorAll('.progress-step-item'),

            /* Step 1 */
            fullName:               document.getElementById('fullName'),
            phone:                  document.getElementById('phone'),
            email:                  document.getElementById('email'),
            nationalId:             document.getElementById('nationalId'),
            gender:                 document.getElementById('gender'),
            genderOtherGroup:       document.getElementById('genderOtherGroup'),
            genderOther:            document.getElementById('genderOther'),
            county:                 document.getElementById('county'),
            town:                   document.getElementById('town'),
            businessFields:         document.getElementById('businessFields'),
            businessName:           document.getElementById('businessName'),
            businessType:           document.getElementById('businessType'),
            businessTypeOtherGroup: document.getElementById('businessTypeOtherGroup'),
            businessTypeOther:      document.getElementById('businessTypeOther'),
            businessRegNumber:      document.getElementById('businessRegNumber'),
            activeDrivers:          document.getElementById('activeDrivers'),

            /* Step 2 */
            vehicleCards:         document.getElementById('vehicleCards'),
            vehicleOtherGroup:    document.getElementById('vehicleOtherGroup'),
            vehicleOtherSpecify:  document.getElementById('vehicleOtherSpecify'),
            vehicleAccess:        document.getElementById('vehicleAccess'),
            vehicleInfoFields:    document.getElementById('vehicleInfoFields'),
            vehicleMakeModel:     document.getElementById('vehicleMakeModel'),
            registrationNumber:   document.getElementById('registrationNumber'),
            fleetVehiclesGroup:   document.getElementById('fleetVehiclesGroup'),
            fleetVehicles:        document.getElementById('fleetVehicles'),
            goodsOtherGroup:      document.getElementById('goodsOtherGroup'),
            goodsOtherSpecify:    document.getElementById('goodsOtherSpecify'),

            /* Step 3 */
            locationRecapValue:   document.getElementById('locationRecapValue'),
            deliveryType:         document.getElementById('deliveryType'),
            additionalAreas:      document.getElementById('additionalAreas'),
            agreementCheck:       document.getElementById('agreementCheck'),

            /* Step 4 */
            feeAmountEls:         document.querySelectorAll('.dynamic-fee-amount'),
            mpesaPhone:           document.getElementById('mpesaPhone'),
            payWithMpesaBtn:      document.getElementById('payWithMpesaBtn'),
            retryPaymentBtn:      document.getElementById('retryPaymentBtn'),
            stkInterface:         document.getElementById('stkPushInterface'),
            stkStatusCard:        document.getElementById('stkStatusCard'),
            stkStatusTitle:       document.getElementById('stkStatusTitle'),
            stkStatusDesc:        document.getElementById('stkStatusDesc'),

            /* Nav */
            toStep2Btn:            document.getElementById('toStep2Btn'),
            backToStep1Btn:        document.getElementById('backToStep1Btn'),
            toStep3Btn:            document.getElementById('toStep3Btn'),
            backToStep2Btn:        document.getElementById('backToStep2Btn'),
            toStep4Btn:            document.getElementById('toStep4Btn'),
            backToStep3Btn:        document.getElementById('backToStep3Btn'),

            toast: document.getElementById('partnerToast')
        };
    }

    /* ── Supabase ───────────────────────────────────────────────────── */
    function initSupabase() {
        if (window._supabaseClient) { state.supabase = window._supabaseClient; return; }
        try {
            const url = (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url) || window.SUPABASE_URL || '';
            const key = (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.anonKey) || window.SUPABASE_ANON_KEY || '';
            if (url && key && window.supabase) {
                state.supabase = window.supabase.createClient(url, key);
            }
        } catch (e) { console.error('[DP] Supabase init:', e); }
    }

    /* ── CSP-safe broken logo fix ───────────────────────────────────── */
    function fixLogoError() {
        const img = document.getElementById('headerLogoImg');
        if (!img) return;
        img.addEventListener('error', function () { img.style.display = 'none'; });
    }

    /* ── Dynamic Fee — RPC first, fallback to GET without custom headers (avoids CORS preflight) ─ */
    async function fetchFee() {
        /* 1. Supabase RPC (direct Postgres query, no CORS preflight issue) */
        if (state.supabase) {
            try {
                const { data, error } = await state.supabase.rpc('get_registration_fee');
                if (!error && data !== null && !isNaN(parseFloat(data))) {
                    state.registrationFee = parseFloat(data);
                    updateFeeDisplay();
                    return;
                }
            } catch (_) {}
        }

        /* 2. Edge function — public endpoint, fetch without custom apikey header to avoid preflight reject */
        const url = (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url) || window.SUPABASE_URL || '';
        if (url) {
            try {
                const res = await fetch(`${url}/functions/v1/get-registration-fee`);
                if (res.ok) {
                    const data = await res.json();
                    if (typeof data.fee === 'number') {
                        state.registrationFee = data.fee;
                        state.currency        = data.currency || 'KES';
                        updateFeeDisplay();
                        return;
                    }
                }
            } catch (_) {}
        }

        /* 3. Fallback default */
        updateFeeDisplay();
    }

    function updateFeeDisplay() {
        const fmt = `${state.currency} ${Number(state.registrationFee).toLocaleString('en-KE', {
            minimumFractionDigits: 2, maximumFractionDigits: 2
        })}`;
        el.feeAmountEls.forEach(elem => { elem.textContent = fmt; });
        if (el.payWithMpesaBtn) {
            el.payWithMpesaBtn.innerHTML = `<span class="pay-icon">📱</span> Pay ${fmt} via M-Pesa`;
        }
        const copyAmountBtn = document.querySelector('[data-copy-amount="true"]');
        if (copyAmountBtn) {
            copyAmountBtn.setAttribute('data-copy', String(state.registrationFee));
        }
    }

    /* ═══════════════════════════════════════════════════════════════
       Sanitization & Anti-Injection
    ═══════════════════════════════════════════════════════════════ */
    function initSanitization() {
        el.form.querySelectorAll('input:not([type="radio"]):not([type="checkbox"]):not([type="file"]), select, textarea')
            .forEach(inp => {
                inp.addEventListener('input', () => {
                    const type = inp.dataset.sanitizeType || 'text';
                    const clean = sanitize(inp.value, type);
                    if (clean !== inp.value) inp.value = clean;
                    clearFieldError(inp);
                });
                inp.addEventListener('paste', e => {
                    const txt = (e.clipboardData || window.clipboardData).getData('text');
                    if (containsDangerous(txt)) {
                        e.preventDefault();
                        showToast('Pasted content was blocked — it contained unsafe characters.', 'error');
                    }
                });
            });

        /* Uppercase M-Pesa code automatically */
        if (el.mpesaTransactionCode) {
            el.mpesaTransactionCode.addEventListener('input', () => {
                const pos = el.mpesaTransactionCode.selectionStart;
                el.mpesaTransactionCode.value = el.mpesaTransactionCode.value.toUpperCase();
                el.mpesaTransactionCode.setSelectionRange(pos, pos);
            });
        }
    }

    function sanitize(val, type) {
        if (!val || typeof val !== 'string') return '';
        let c = val
            .replace(/<[^>]*>?/gm, '')
            .replace(/javascript:/gi, '')
            .replace(/vbscript:/gi, '')
            .replace(/data:text\/html/gi, '')
            .replace(/on\w+\s*=/gi, '');
        switch (type) {
            case 'numeric':              return c.replace(/[^0-9]/g, '');
            case 'phone':                return c.replace(/[^0-9+]/g, '');
            case 'email':                return c.replace(/[^a-zA-Z0-9@._+\-]/g, '').trim();
            case 'alphanumeric':         return c.replace(/[^a-zA-Z0-9\-]/g, '');
            case 'alphanumeric-spaces':  return c.replace(/[^a-zA-Z0-9\s\-]/g, '');
            default:                     return c.replace(/[<>"'&]/g, ch => ({'<':'','>':'','"':'','\'':'','&':'and'}[ch]||''));
        }
    }

    function containsDangerous(str) {
        if (!str) return false;
        return [/<script/i, /<iframe/i, /<object/i, /javascript:/i, /on\w+\s*=/i,
                /UNION\s+SELECT/i, /DROP\s+TABLE/i, /INSERT\s+INTO/i, /DELETE\s+FROM/i]
            .some(p => p.test(str));
    }

    /* ═══════════════════════════════════════════════════════════════
       Conditional UI Toggles
    ═══════════════════════════════════════════════════════════════ */
    function setupPartnerTypeToggle() {
        const cards = document.getElementById('partnerTypeCards');
        if (!cards) return;
        cards.addEventListener('change', () => {
            const t = getRadio('partnerType');
            const isBiz = t === 'business' || t === 'fleet';
            toggle(el.businessFields, isBiz, 'hidden');
            toggle(el.fleetVehiclesGroup, t === 'fleet', 'hidden');
        });
    }

    function setupGenderOtherToggle() {
        if (!el.gender || !el.genderOtherGroup) return;
        el.gender.addEventListener('change', () => {
            const isOther = el.gender.value === 'other';
            toggle(el.genderOtherGroup, isOther, 'hidden');
            if (!isOther && el.genderOther) {
                el.genderOther.value = '';
                clearFieldError(el.genderOther);
            }
        });
    }

    function setupBusinessTypeOtherToggle() {
        if (!el.businessType || !el.businessTypeOtherGroup) return;
        el.businessType.addEventListener('change', () => {
            const isOther = el.businessType.value === 'other';
            toggle(el.businessTypeOtherGroup, isOther, 'hidden');
            if (!isOther && el.businessTypeOther) {
                el.businessTypeOther.value = '';
                clearFieldError(el.businessTypeOther);
            }
        });
    }

    function setupVehicleCardToggle() {
        if (!el.vehicleCards) return;
        el.vehicleCards.addEventListener('change', () => {
            const t = getRadio('vehicleType');
            const isWalker = t === 'walking';
            const isOther  = t === 'other';
            if (el.vehicleInfoFields) el.vehicleInfoFields.style.display = isWalker ? 'none' : '';
            toggle(el.vehicleOtherGroup, isOther, 'hidden');
            if (!isOther && el.vehicleOtherSpecify) {
                el.vehicleOtherSpecify.value = '';
                clearFieldError(el.vehicleOtherSpecify);
            }
        });
    }

    function setupGoodsOtherToggle() {
        const cb = document.getElementById('goodsOther');
        if (!cb || !el.goodsOtherGroup) return;
        cb.addEventListener('change', () => {
            toggle(el.goodsOtherGroup, cb.checked, 'hidden');
            if (!cb.checked && el.goodsOtherSpecify) {
                el.goodsOtherSpecify.value = '';
                clearFieldError(el.goodsOtherSpecify);
            }
        });
    }

    function toggle(elem, show, cls) {
        if (!elem) return;
        if (show) elem.classList.remove(cls);
        else elem.classList.add(cls);
    }

    /* ═══════════════════════════════════════════════════════════════
       Navigation
    ═══════════════════════════════════════════════════════════════ */
    function setupNavigation() {
        bind('toStep2Btn', () => { if (validateStep1()) { collectStep1(); goTo(2); } });
        bind('backToStep1Btn', () => goTo(1));
        bind('toStep3Btn', () => { if (validateStep2()) { collectStep2(); populateLocationRecap(); goTo(3); } });
        bind('backToStep2Btn', () => goTo(2));
        bind('toStep4Btn', () => { if (validateStep3()) { collectStep3(); preparePayStep(); goTo(4); } });
        bind('backToStep3Btn', () => goTo(3));
        bind('backToStep3BtnManual', () => goTo(3));
        bind('payWithMpesaBtn', handleStkPayment);
        bind('retryPaymentBtn', handleStkPayment);
    }

    function bind(id, fn) {
        const e = document.getElementById(id);
        if (e) e.addEventListener('click', fn);
    }

    function goTo(step) {
        state.currentStep = step;
        document.querySelectorAll('.form-step').forEach(s =>
            s.classList.toggle('active', parseInt(s.dataset.step, 10) === step));
        el.stepItems.forEach(item => {
            const n = parseInt(item.dataset.step, 10);
            item.classList.toggle('active',    n === step);
            item.classList.toggle('completed', n < step);
        });
        if (el.progressFill) {
            el.progressFill.style.width = `${((step - 1) / (state.totalSteps - 1)) * 100}%`;
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /* ═══════════════════════════════════════════════════════════════
       Validation
    ═══════════════════════════════════════════════════════════════ */
    function validateStep1() {
        let ok = true;
        const name = el.fullName.value.trim();
        if (!name || name.length < 3) {
            markErr(el.fullName, 'fullNameError', 'Enter your full name (at least 3 characters)');
            ok = false;
        }

        const phone = el.phone.value.trim().replace(/[\s\-\(\)]/g, '');
        if (!/^(0[17][0-9]{8}|254[17][0-9]{8}|\+254[17][0-9]{8})$/.test(phone)) {
            markErr(el.phone, 'phoneError', 'Enter a valid Kenyan phone number (07XX, 01XX, or +254...)');
            ok = false;
        }

        const emailVal = el.email ? el.email.value.trim() : '';
        if (emailVal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
            markErr(el.email, 'emailError', 'Enter a valid email address');
            ok = false;
        }

        if (!getRadio('partnerType')) {
            showErr('partnerTypeError', 'Please select your partner type');
            ok = false;
        }

        if (!el.county.value) {
            markErr(el.county, 'countyError', 'Please select your county');
            ok = false;
        }
        if (!el.town.value.trim()) {
            markErr(el.town, 'townError', 'Enter your main town or area');
            ok = false;
        }

        /* National ID */
        const nid = el.nationalId ? el.nationalId.value.trim() : '';
        if (!nid || !/^[0-9]{6,12}$/.test(nid)) {
            markErr(el.nationalId, 'nationalIdError', 'Enter a valid National ID number (6-12 digits)');
            ok = false;
        }

        /* Gender Other validation */
        if (el.gender && el.gender.value === 'other') {
            if (!el.genderOther || !el.genderOther.value.trim()) {
                markErr(el.genderOther, 'genderOtherError', 'Please specify your gender');
                ok = false;
            }
        }

        /* Business fields validation */
        const pt = getRadio('partnerType');
        if (pt === 'business' || pt === 'fleet') {
            if (!el.businessName.value.trim()) {
                markErr(el.businessName, 'businessNameError', 'Enter your business name');
                ok = false;
            }
            if (!el.businessType.value) {
                markErr(el.businessType, 'businessTypeError', 'Select your business type');
                ok = false;
            } else if (el.businessType.value === 'other') {
                if (!el.businessTypeOther || !el.businessTypeOther.value.trim()) {
                    markErr(el.businessTypeOther, 'businessTypeOtherError', 'Please specify your business type');
                    ok = false;
                }
            }
            if (!el.activeDrivers.value) {
                markErr(el.activeDrivers, 'activeDriversError', 'Select how many drivers you have');
                ok = false;
            }
        }
        return ok;
    }

    function validateStep2() {
        let ok = true;
        if (!getRadio('vehicleType')) {
            showErr('vehicleTypeError', 'Please select your primary delivery method');
            ok = false;
        }

        /* If vehicle type is "other", specify field required */
        if (getRadio('vehicleType') === 'other' && el.vehicleOtherSpecify && !el.vehicleOtherSpecify.value.trim()) {
            markErr(el.vehicleOtherSpecify, 'vehicleOtherSpecifyError', 'Please describe your delivery method');
            ok = false;
        }

        if (!el.vehicleAccess.value) {
            markErr(el.vehicleAccess, 'vehicleAccessError', 'Please tell us your vehicle relationship');
            ok = false;
        }
        if (!getRadio('carryingCapacity')) {
            showErr('carryingCapacityError', 'Please select your maximum typical load');
            ok = false;
        }

        const checkedGoods = document.querySelectorAll('input[name="goods"]:checked');
        if (checkedGoods.length === 0) {
            showErr('goodsError', 'Select at least one type of goods you can deliver');
            ok = false;
        }

        /* If goods "other" is checked, specify field required */
        const goodsOtherCb = document.getElementById('goodsOther');
        if (goodsOtherCb && goodsOtherCb.checked && el.goodsOtherSpecify && !el.goodsOtherSpecify.value.trim()) {
            markErr(el.goodsOtherSpecify, 'goodsOtherSpecifyError', 'Please describe the goods');
            ok = false;
        }

        if (!getRadio('availability')) {
            showErr('availabilityError', 'Please select your availability');
            ok = false;
        }
        return ok;
    }

    function validateStep3() {
        let ok = true;
        if (!getRadio('deliveryCoverage')) {
            showErr('deliveryCoverageError', 'Please select your delivery coverage area');
            ok = false;
        }
        if (!getRadio('routePreference')) {
            showErr('routePreferenceError', 'Please select your route preference');
            ok = false;
        }
        if (!el.deliveryType.value) {
            markErr(el.deliveryType, 'deliveryTypeError', 'Please select your preferred delivery type');
            ok = false;
        }
        if (!getRadio('travelOutside')) {
            showErr('travelOutsideError', 'Indicate if you are willing to travel outside your area');
            ok = false;
        }

        /* Agreement checkbox */
        if (el.agreementCheck && !el.agreementCheck.checked) {
            showErr('agreementError', 'You must certify the accuracy of your details to continue');
            ok = false;
        }
        return ok;
    }

    /* ═══════════════════════════════════════════════════════════════
       Data Collection
    ═══════════════════════════════════════════════════════════════ */
    function collectStep1() {
        const pt = getRadio('partnerType');
        state.formData = {
            ...state.formData,
            fullName:          el.fullName.value.trim(),
            phone:             normalizePhone(el.phone.value.trim()),
            email:             el.email ? el.email.value.trim() : '',
            nationalId:        el.nationalId ? el.nationalId.value.trim() : '',
            gender:            el.gender ? el.gender.value : '',
            genderOther:       el.genderOther ? el.genderOther.value.trim() : '',
            partnerType:       pt,
            county:            el.county.value,
            town:              el.town.value.trim(),
            businessName:      el.businessName ? el.businessName.value.trim() : '',
            businessType:      el.businessType ? el.businessType.value : '',
            businessTypeOther: el.businessTypeOther ? el.businessTypeOther.value.trim() : '',
            businessRegNumber: el.businessRegNumber ? el.businessRegNumber.value.trim() : '',
            activeDrivers:     el.activeDrivers ? el.activeDrivers.value : ''
        };
    }

    function collectStep2() {
        const goods = [...document.querySelectorAll('input[name="goods"]:checked')].map(c => c.value);
        state.formData = {
            ...state.formData,
            vehicleType:        getRadio('vehicleType'),
            vehicleTypeOther:   el.vehicleOtherSpecify ? el.vehicleOtherSpecify.value.trim() : '',
            vehicleAccess:      el.vehicleAccess.value,
            vehicleMakeModel:   el.vehicleMakeModel ? el.vehicleMakeModel.value.trim() : '',
            registrationNumber: el.registrationNumber ? el.registrationNumber.value.trim() : '',
            fleetVehicles:      el.fleetVehicles ? el.fleetVehicles.value : '',
            carryingCapacity:   getRadio('carryingCapacity'),
            goods,
            goodsOtherSpecify:  el.goodsOtherSpecify ? el.goodsOtherSpecify.value.trim() : '',
            availability:       getRadio('availability')
        };
    }

    function collectStep3() {
        state.formData = {
            ...state.formData,
            deliveryCoverage: getRadio('deliveryCoverage'),
            routePreference:  getRadio('routePreference'),
            deliveryType:     el.deliveryType.value,
            travelOutside:    getRadio('travelOutside'),
            additionalAreas:  el.additionalAreas ? el.additionalAreas.value.trim() : ''
        };
    }

    function populateLocationRecap() {
        if (el.locationRecapValue) {
            const parts = [state.formData.town, state.formData.county].filter(Boolean);
            el.locationRecapValue.textContent = parts.join(', ') || '—';
        }
    }

    function preparePayStep() {
        /* Pre-fill M-Pesa phone dynamically with Step 1 phone — kept fully editable */
        const registeredPhone = state.formData.phone ? deNormalizePhone(state.formData.phone) : (el.phone ? el.phone.value.trim() : '');
        if (el.mpesaPhone) {
            if (!el.mpesaPhone.value || el.mpesaPhone.dataset.autofilled === '1') {
                el.mpesaPhone.value = registeredPhone;
                el.mpesaPhone.dataset.autofilled = '1';
            }
            el.mpesaPhone.readOnly = false;
            el.mpesaPhone.disabled = false;
        }
    }

    /* ═══════════════════════════════════════════════════════════════
       Payment Method Toggle
    ═══════════════════════════════════════════════════════════════ */
    // Manual payment removed — STK Push is the only payment method
    function setupPaymentMethodToggle() {
        // STK Push is the only method now, so we just ensure it's selected
        state.paymentMethod = 'stkpush';
        
        const stkRadio = document.querySelector('input[name="paymentMethod"][value="stkpush"]');
        if (stkRadio) stkRadio.checked = true;
        
        const stkCard = document.querySelector('.payment-method[data-method="stkpush"]');
        if (stkCard) stkCard.classList.add('active');
        
        if (el.stkInterface) {
            el.stkInterface.classList.add('active');
            el.stkInterface.style.display = 'block';
        }
    }

    /* ═══════════════════════════════════════════════════════════════
       Copy Buttons
    ═══════════════════════════════════════════════════════════════ */
    function setupCopyButtons() {
        document.querySelectorAll('.btn-copy').forEach(btn => {
            btn.addEventListener('click', () => {
                let text = btn.getAttribute('data-copy');
                if (!text) {
                    const refId = btn.getAttribute('data-copy-id');
                    if (refId) text = (document.getElementById(refId) || {}).textContent || '';
                }
                if (text) {
                    navigator.clipboard.writeText(text.trim()).then(() => {
                        const orig = btn.textContent;
                        btn.textContent = 'Copied!';
                        setTimeout(() => { btn.textContent = orig; }, 2000);
                    }).catch(() => {});
                }
            });
        });
    }

    /* ═══════════════════════════════════════════════════════════════
       Application Code
    ═══════════════════════════════════════════════════════════════ */
    async function ensureAppCode() {
        if (state.applicationCode) return state.applicationCode;

        /* 1. Generate reliable application code locally immediately */
        const phoneDigits = (state.formData.phone || (el.phone ? el.phone.value : '') || '000000').replace(/\D/g, '');
        const phoneSuffix = phoneDigits.slice(-6).padStart(6, '0');
        const rand4 = Math.floor(1000 + Math.random() * 9000);
        state.applicationCode = `SDP${phoneSuffix}${rand4}`;

        /* 2. Try Supabase RPC as preferred canonical code */
        if (state.supabase) {
            try {
                const phone = state.formData.phone || (el.phone ? el.phone.value.trim() : '');
                const { data, error } = await state.supabase.rpc('generate_delivery_partner_code', {
                    p_phone: phone || '0700000000'
                });
                if (!error && data && typeof data === 'string' && data.startsWith('SDP')) {
                    state.applicationCode = data;
                }
            } catch (_) {}
        }

        return state.applicationCode;
    }

    /* ═══════════════════════════════════════════════════════════════
       Payment Error Mapping
    ═══════════════════════════════════════════════════════════════ */
    function getUserFriendlyPaymentError(errorMessage) {
        const message = (errorMessage || '').toLowerCase();
        
        // Map common error patterns to user-friendly messages
        if (message.includes('insufficient') || message.includes('balance')) {
            return '💰 Insufficient M-Pesa balance. Please top up your account and try again.';
        }
        if (message.includes('cancel')) {
            return '🚫 You cancelled the payment. Click "Pay with M-Pesa" when you\'re ready to try again.';
        }
        if (message.includes('timeout') || message.includes('timed out')) {
            return '⏱️ Payment request timed out. Please check your phone and try again.';
        }
        if (message.includes('invalid') && message.includes('phone')) {
            return '📱 Invalid phone number. Please check the number and try again.';
        }
        if (message.includes('unavailable') || message.includes('service')) {
            return '🔧 M-Pesa service temporarily unavailable. Please try again in a few minutes.';
        }
        if (message.includes('rate limit') || message.includes('too many')) {
            return '⏳ Too many payment requests. Please wait a few minutes and try again.';
        }
        if (message.includes('401') || message.includes('unauthorized') || message.includes('credentials')) {
            return '🔒 Payment service configuration error. Please contact support.';
        }
        if (message.includes('wrong pin') || message.includes('incorrect pin')) {
            return '🔢 Wrong M-Pesa PIN entered. Please try again with the correct PIN.';
        }
        if (message.includes('busy') || message.includes('system busy')) {
            return '⚡ M-Pesa system is busy. Please try again in a moment.';
        }
        
        // Return the original message if no mapping found
        return errorMessage || 'Payment could not be processed. Please try again or contact support.';
    }

    /* ═══════════════════════════════════════════════════════════════
       STK Push Payment
    ═══════════════════════════════════════════════════════════════ */
    async function handleStkPayment() {
        const rawPhone = (el.mpesaPhone.value || '').trim().replace(/[\s\-\(\)]/g, '');
        if (!/^(0[17][0-9]{8}|254[17][0-9]{8}|\+254[17][0-9]{8})$/.test(rawPhone)) {
            markErr(el.mpesaPhone, 'mpesaPhoneError', 'Enter a valid M-Pesa phone number');
            return;
        }
        const normPhone = normalizePhone(rawPhone);

        el.payWithMpesaBtn.disabled    = true;
        el.payWithMpesaBtn.textContent = 'Sending STK Push...';
        if (el.retryPaymentBtn) el.retryPaymentBtn.classList.add('hidden');
        el.stkStatusCard.classList.remove('hidden');
        el.stkStatusTitle.textContent = 'Sending prompt to your phone...';
        el.stkStatusDesc.textContent  = `Please check ${rawPhone} and enter your M-Pesa PIN.`;

        try {
            await ensureAppCode();

            /* Step 1: create payment intent */
            const intentId = await createLocalPaymentIntent(normPhone, 'stkpush');
            state.paymentIntentId = intentId;

            /* Step 2: call mpesa-stk-push edge function */
            await callStkPushEdgeFunction(normPhone, intentId);

            el.stkStatusTitle.textContent = 'Waiting for M-Pesa confirmation...';
            el.stkStatusDesc.textContent  = 'Please check your phone for the PIN prompt. Payment will be detected automatically.';

            pollStatus(intentId, el.stkStatusTitle, el.stkStatusDesc, el.payWithMpesaBtn, el.retryPaymentBtn);
        } catch (err) {
            console.error('[DP] STK error:', err);
            const errorMessage = getUserFriendlyPaymentError(err.message || '');
            el.stkStatusTitle.textContent = '❌ Payment Request Failed';
            el.stkStatusDesc.textContent  = errorMessage;
            el.payWithMpesaBtn.disabled    = false;
            updateFeeDisplay();
            if (el.retryPaymentBtn) el.retryPaymentBtn.classList.remove('hidden');
            showToast(errorMessage, 'error');
        }
    }

    /* Create payment_intent row in Supabase */
    async function createLocalPaymentIntent(normPhone, method) {
        if (!state.supabase) throw new Error('Database connection not ready. Please reload the page.');

        const ref = 'SDP-REG-' + Array.from(crypto.getRandomValues(new Uint8Array(4)))
            .map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

        const { data: intent, error } = await state.supabase
            .from('payment_intents')
            .insert({
                payment_purpose:   'REGISTRATION',
                expected_amount:   state.registrationFee,
                currency:          'KES',
                payment_reference: ref,
                status:            'PENDING',
                expires_at:        new Date(Date.now() + 30 * 60 * 1000).toISOString(),
                metadata: {
                    phone:            normPhone,
                    full_name:        state.formData.fullName,
                    national_id:      state.formData.nationalId,
                    county:           state.formData.county,
                    payment_method:   method,
                    account_reference:state.formData.nationalId,
                    role:             'delivery_partner',
                    application_code: state.applicationCode
                }
            })
            .select('id')
            .single();

        if (error || !intent) {
            console.warn('[DP] Payment intent create warning:', error?.message);
            // Non-fatal if payment_intents table has constraints; use fallback generated ID
            return intent?.id || crypto.randomUUID();
        }
        return intent.id;
    }

    /* Call mpesa-stk-push edge function */
    async function callStkPushEdgeFunction(normPhone, intentId) {
        const payload = {
            phoneNumber:      normPhone,
            amount:           state.registrationFee,
            accountReference: state.formData.nationalId,
            transactionDesc:  'Delivery Partner Activation Fee',
            userType:         'vendor',
            applicationCode:  state.applicationCode,
            paymentIntentId:  intentId,
            flowType:           'vendor_registration'
        };

        /* 1. Try Supabase SDK functions.invoke */
        if (state.supabase && state.supabase.functions) {
            try {
                const { data, error } = await state.supabase.functions.invoke('mpesa-stk-push', {
                    body: payload
                });

                if (error) {
                    let errMsg = error.message;
                    if (error.context && typeof error.context.json === 'function') {
                        try {
                            const errBody = await error.context.json();
                            if (errBody.error) errMsg = errBody.error;
                        } catch (_) {}
                    }
                    throw new Error(errMsg || 'M-Pesa STK Push request failed');
                }

                if (data) {
                    if (data.success === false) {
                        throw new Error(data.error || data.message || 'M-Pesa did not accept the request.');
                    }
                    return data;
                }
            } catch (invokeErr) {
                console.warn('[DP] functions.invoke exception, trying direct fetch:', invokeErr);
                if (invokeErr.message && !invokeErr.message.includes('fetch') && !invokeErr.message.includes('Failed to send')) {
                    throw invokeErr;
                }
            }
        }

        /* 2. Direct fetch fallback */
        const url = (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url) || window.SUPABASE_URL || '';
        const key = (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.anonKey) || window.SUPABASE_ANON_KEY || '';
        if (!url || !key) throw new Error('Payment service configuration missing. Please contact support.');

        const res = await fetch(`${url}/functions/v1/mpesa-stk-push`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': key,
                'Authorization': `Bearer ${key}`
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `STK Push failed (${res.status})`);
        }

        const data = await res.json();
        if (data.success === false) throw new Error(data.error || 'M-Pesa did not accept the request.');
        return data;
    }

    /* ═══════════════════════════════════════════════════════════════
       Status Polling (STK Push)
    ═══════════════════════════════════════════════════════════════ */
    function pollStatus(intentId, titleEl, descEl, actionBtn, retryBtn) {
        if (state.poller) { clearInterval(state.poller); state.poller = null; }
        let attempts = 0;
        const MAX = 60; // 5 min

        state.poller = setInterval(async () => {
            attempts++;
            try {
                const result = await checkStatus(intentId);
                const s = result.status;

                if (s === 'CONFIRMED' || s === 'COMPLETED') {
                    clearInterval(state.poller);
                    state.paymentConfirmed = true;
                    titleEl.textContent = '✓ Payment Confirmed!';
                    descEl.textContent  = 'Activating your Delivery Partner profile...';
                    const spinner = el.stkStatusCard.querySelector('.status-spinner');
                    if (spinner) spinner.style.display = 'none';
                    await submitApplication();
                    return;
                }
                if (s === 'FAILED') {
                    clearInterval(state.poller);
                    
                    // Show user-friendly error message
                    const rawError = result.failure_reason || 'Payment could not be processed.';
                    const failureReason = getUserFriendlyPaymentError(rawError);
                    titleEl.textContent = '❌ Payment Failed';
                    descEl.textContent  = failureReason;
                    
                    // Hide spinner if visible
                    const spinner = el.stkStatusCard.querySelector('.status-spinner');
                    if (spinner) spinner.style.display = 'none';
                    
                    // Show toast with error
                    showToast(failureReason, 'error');
                    
                    if (actionBtn) {
                        actionBtn.disabled = false;
                        updateFeeDisplay();
                    }
                    if (retryBtn) retryBtn.classList.remove('hidden');
                    return;
                }
                if (attempts >= MAX) {
                    clearInterval(state.poller);
                    titleEl.textContent = '⏱️ Payment Status Unknown';
                    descEl.textContent  = 'We haven\'t received payment confirmation yet. If you completed the payment, please wait a moment and refresh, or use the manual confirmation option below. If you didn\'t complete the payment, you can try again.';
                    
                    // Hide spinner
                    const spinner = el.stkStatusCard.querySelector('.status-spinner');
                    if (spinner) spinner.style.display = 'none';
                    
                    // Show warning toast
                    showToast('Payment status check timed out. Use manual confirmation if you already paid.', 'warning');
                    
                    if (actionBtn) {
                        actionBtn.disabled = false;
                        updateFeeDisplay();
                    }
                    if (retryBtn) retryBtn.classList.remove('hidden');
                }
            } catch (_) {}
        }, 5000);
    }

    async function checkStatus(intentId) {
        if (state.supabase && state.supabase.functions) {
            try {
                const { data, error } = await state.supabase.functions.invoke('payment-status', {
                    body: { paymentIntentId: intentId, intent_id: intentId }
                });
                if (!error && data) return data;
            } catch (_) {}
        }
        if (state.supabase) {
            try {
                // Fetch from payment_intents with payment_transactions relationship
                const { data: intentData, error: intentError } = await state.supabase
                    .from('payment_intents')
                    .select(`
                        id,
                        status,
                        payment_transactions (
                            id,
                            status,
                            failure_reason,
                            receipt_number,
                            payer_phone
                        )
                    `)
                    .eq('id', intentId)
                    .single();
                
                if (!intentError && intentData) {
                    // If we have transaction data with failure reason, use it
                    if (intentData.payment_transactions && intentData.payment_transactions.length > 0) {
                        const txn = intentData.payment_transactions[0];
                        return {
                            status: intentData.status,
                            failure_reason: txn.failure_reason || null
                        };
                    }
                    return { status: intentData.status, failure_reason: null };
                }
                
                // Fallback: try stokika_kit_payments table
                const { data: kitData, error: kitError } = await state.supabase
                    .from('stokika_kit_payments')
                    .select('payment_status, result_desc')
                    .eq('application_code', state.applicationCode)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();
                
                if (!kitError && kitData) {
                    const statusMap = {
                        'completed': 'CONFIRMED',
                        'failed': 'FAILED',
                        'pending': 'PENDING',
                        'timeout': 'FAILED'
                    };
                    
                    return {
                        status: statusMap[kitData.payment_status] || 'PENDING',
                        failure_reason: kitData.result_desc || null
                    };
                }
            } catch (err) {
                console.error('[DP] Check status error:', err);
            }
        }
        return { status: 'PENDING', failure_reason: null };
    }

    /* ═══════════════════════════════════════════════════════════════
       Final Submission (after payment)
    ═══════════════════════════════════════════════════════════════ */
    async function submitApplication() {
        if (!state.paymentConfirmed) return;
        showToast('Payment verified! Saving your application...', 'success');

        if (state.supabase) {
            try {
                const insertPayload = {
                    application_code:         state.applicationCode,
                    full_name:                state.formData.fullName,
                    phone:                    state.formData.phone,
                    email:                    state.formData.email || null,
                    id_number:                state.formData.nationalId,
                    gender:                   state.formData.gender || null,
                    gender_other:             state.formData.genderOther || null,
                    county:                   state.formData.county,
                    town:                     state.formData.town,
                    partner_type:             state.formData.partnerType,
                    business_name:            state.formData.businessName || null,
                    business_type:            state.formData.businessType || null,
                    business_type_other:      state.formData.businessTypeOther || null,
                    business_reg_number:      state.formData.businessRegNumber || null,
                    active_drivers:           state.formData.activeDrivers || null,
                    vehicle_type:             state.formData.vehicleType,
                    vehicle_type_other:       state.formData.vehicleTypeOther || null,
                    vehicle_access:           state.formData.vehicleAccess,
                    vehicle_make_model:       state.formData.vehicleMakeModel || null,
                    registration_number:      state.formData.registrationNumber || null,
                    fleet_vehicles:           state.formData.fleetVehicles || null,
                    carrying_capacity:        state.formData.carryingCapacity,
                    goods_can_deliver:        state.formData.goods,
                    goods_other_specify:      state.formData.goodsOtherSpecify || null,
                    availability:             state.formData.availability,
                    delivery_coverage:        state.formData.deliveryCoverage,
                    route_preference:         state.formData.routePreference,
                    delivery_type:            state.formData.deliveryType,
                    travel_outside:           state.formData.travelOutside === 'yes',
                    additional_areas:         state.formData.additionalAreas || null,
                    agreement_accepted:       true,
                    agreement_accepted_at:    new Date().toISOString(),
                    status:                   'pending_review',
                    registration_fee:         state.registrationFee,
                    registration_paid:        true,
                    registration_payment_id:  state.paymentIntentId || null
                };

                const { error: insertErr } = await state.supabase.from('delivery_partners').insert(insertPayload);
                if (insertErr) console.warn('[DP] Insert warning:', insertErr.message);
            } catch (err) {
                console.error('[DP] Insert error (non-fatal):', err);
            }
        }

        setTimeout(() => {
            window.location.href = `registration-success.html?code=${encodeURIComponent(state.applicationCode)}`;
        }, 1000);
    }

    /* ═══════════════════════════════════════════════════════════════
       Helpers
    ═══════════════════════════════════════════════════════════════ */
    function getRadio(name) {
        const el = document.querySelector(`input[name="${name}"]:checked`);
        return el ? el.value : null;
    }

    function normalizePhone(p) {
        let c = p.replace(/[\s\-\(\)\+]/g, '');
        if (c.startsWith('0'))  c = '254' + c.substring(1);
        else if (/^[71]/.test(c) && c.length === 9) c = '254' + c;
        return c;
    }

    function deNormalizePhone(p) {
        /* 254XXXXXXXXX → 0XXXXXXXXX for display in input */
        if (p.startsWith('254') && p.length === 12) return '0' + p.substring(3);
        return p;
    }

    function markErr(input, errId, msg) {
        if (input) input.classList.add('input-error');
        showErr(errId, msg);
        if (input && !input.dataset.focusHandled) { input.focus(); input.dataset.focusHandled = '1'; }
    }

    function showErr(id, msg) {
        const e = document.getElementById(id);
        if (e) { e.textContent = msg; e.classList.add('active'); }
    }

    function clearFieldError(input) {
        input.classList.remove('input-error');
        delete input.dataset.focusHandled;
        const parent = input.closest('.form-group');
        if (parent) parent.querySelectorAll('.error-message').forEach(e => {
            e.textContent = ''; e.classList.remove('active');
        });
    }

    function showToast(msg, type = 'info') {
        if (!el.toast) return;
        el.toast.textContent   = msg;
        el.toast.className     = `partner-toast ${type}`;
        el.toast.style.display = 'block';
        setTimeout(() => { el.toast.style.display = 'none'; }, 4500);
    }

})();
