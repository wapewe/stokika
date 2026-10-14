/**
 * Validate ID number format (8 digits, numeric only)
 * @param {string} idNumber - The ID number to validate
 * @returns {object} - {valid: boolean, message: string}
 */
function validateIdNumber(idNumber) {
    if (!idNumber || idNumber.trim() === '') {
        return {
            valid: false,
            message: 'ID number is required'
        };
    }
    
    // Check if exactly 8 characters
    if (idNumber.length !== 8) {
        return {
            valid: false,
            message: 'ID number must be exactly 8 digits'
        };
    }
    
    // Check if contains only digits
    const numericRegex = /^[0-9]{8}$/;
    if (!numericRegex.test(idNumber)) {
        return {
            valid: false,
            message: 'ID number must contain only digits'
        };
    }
    
    return {
        valid: true,
        message: ''
    };
}

/**
 * Display validation error for ID number field
 * @param {string} message - Error message to display
 */
function showIdError(message) {
    const idInput = document.getElementById('idNumber');
    const errorSpan = document.getElementById('idNumberError');
    
    if (idInput) {
        idInput.classList.add('input-error');
    }
    
    if (errorSpan) {
        errorSpan.textContent = message;
        errorSpan.style.display = 'block';
    }
}

/**
 * Clear validation error for ID number field
 */
function clearIdError() {
    const idInput = document.getElementById('idNumber');
    const errorSpan = document.getElementById('idNumberError');
    
    if (idInput) {
        idInput.classList.remove('input-error');
    }
    
    if (errorSpan) {
        errorSpan.textContent = '';
        errorSpan.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Initialize form security and validation
    if (window.InputSanitizer) {
        window.InputSanitizer.initForm('#fieldAgentForm');
    }
    
    // Explicitly expose handleFormSubmit to window for the sanitizer callback
    window.handleFormSubmit = handleFormSubmit;

    const form = document.getElementById('fieldAgentForm');
    const idInput = document.getElementById('idNumber');
    
    // Set max date for 18+ age restriction
    const dobInput = document.getElementById('dateOfBirth');
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() - 18);
    dobInput.max = maxDate.toISOString().split('T')[0];

    dobInput.addEventListener('change', () => {
        const selected = new Date(dobInput.value);
        if (selected > maxDate) {
            dobInput.setCustomValidity('You must be at least 18 years old.');
            dobInput.reportValidity();
        } else {
            dobInput.setCustomValidity('');
        }
    });
    
    // Real-time validation on input for ID number
    if (idInput) {
        idInput.addEventListener('input', (e) => {
            const value = e.target.value;
            
            // Allow only digits (strip non-digits automatically)
            e.target.value = value.replace(/[^0-9]/g, '');
            
            // Validate on every input
            const validation = validateIdNumber(e.target.value);
            if (validation.valid) {
                clearIdError();
            }
        });
        
        // Validate on blur
        idInput.addEventListener('blur', (e) => {
            const validation = validateIdNumber(e.target.value);
            if (!validation.valid && e.target.value !== '') {
                showIdError(validation.message);
            }
        });
    }
    
    // Conditional field handlers
    setupConditionalFields();
    
    form.addEventListener('submit', handleFormSubmit);
});

function setupConditionalFields() {
    // Gender other field
    const genderSelect = document.getElementById('gender');
    const genderOtherField = document.getElementById('genderOtherField');
    
    genderSelect.addEventListener('change', () => {
        if (genderSelect.value === 'other') {
            genderOtherField.style.display = 'block';
            genderOtherField.querySelector('input').required = true;
        } else {
            genderOtherField.style.display = 'none';
            genderOtherField.querySelector('input').required = false;
            genderOtherField.querySelector('input').value = '';
        }
    });
    
    // Employment details
    const employmentRadios = document.querySelectorAll('input[name="currentlyEmployed"]');
    const employmentDetails = document.getElementById('employmentDetails');
    
    employmentRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value === 'yes' && radio.checked) {
                employmentDetails.style.display = 'block';
                employmentDetails.querySelector('input').required = true;
            } else {
                employmentDetails.style.display = 'none';
                employmentDetails.querySelector('input').required = false;
                employmentDetails.querySelector('input').value = '';
            }
        });
    });
    
    // Field experience details
    const fieldExpRadios = document.querySelectorAll('input[name="hasFieldExperience"]');
    const fieldExpDetails = document.getElementById('fieldExperienceDetails');
    const yearsExperienceGroup = document.getElementById('yearsExperienceGroup');
    const yearsExperienceRadios = document.querySelectorAll('input[name="yearsExperience"]');
    
    fieldExpRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value === 'yes' && radio.checked) {
                fieldExpDetails.style.display = 'block';
                // Make years of experience required when field experience is Yes
                yearsExperienceRadios.forEach(r => r.required = true);
                fieldExpDetails.querySelector('textarea[name="experienceDescription"]').required = true;
            } else {
                fieldExpDetails.style.display = 'none';
                document.querySelectorAll('input[name="fieldExperienceTypes"]').forEach(cb => cb.checked = false);
                document.getElementById('otherExperienceField').style.display = 'none';
                // Remove required and clear selection when field experience is No
                yearsExperienceRadios.forEach(r => {
                    r.required = false;
                    r.checked = false;
                });
                const expDesc = fieldExpDetails.querySelector('textarea[name="experienceDescription"]');
                expDesc.required = false;
                expDesc.value = '';
            }
        });
    });
    
    // Other experience field
    const otherExpCheckbox = document.getElementById('exp-other');
    const otherExpField = document.getElementById('otherExperienceField');
    
    if (otherExpCheckbox) {
        otherExpCheckbox.addEventListener('change', () => {
            if (otherExpCheckbox.checked) {
                otherExpField.style.display = 'block';
                otherExpField.querySelector('input').required = true;
            } else {
                otherExpField.style.display = 'none';
                otherExpField.querySelector('input').required = false;
                otherExpField.querySelector('input').value = '';
            }
        });
    }
    
    // Local languages field
    const localLangCheckbox = document.getElementById('lang-local');
    const localLangField = document.getElementById('localLanguagesField');
    
    if (localLangCheckbox) {
        localLangCheckbox.addEventListener('change', () => {
            if (localLangCheckbox.checked) {
                localLangField.style.display = 'block';
            } else {
                localLangField.style.display = 'none';
                localLangField.querySelector('input').value = '';
            }
        });
    }
    
    // Market knowledge details
    const marketRadios = document.querySelectorAll('input[name="familiarWithMarket"]');
    const marketDetails = document.getElementById('marketKnowledgeDetails');
    
    marketRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value === 'yes' && radio.checked) {
                marketDetails.style.display = 'block';
                marketDetails.querySelector('input').required = true;
            } else {
                marketDetails.style.display = 'none';
                marketDetails.querySelector('input').required = false;
                marketDetails.querySelector('input').value = '';
            }
        });
    });
    
    // Smartphone details
    const smartphoneRadios = document.querySelectorAll('input[name="ownsSmartphone"]');
    const smartphoneDetails = document.getElementById('smartphoneDetails');
    
    smartphoneRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value === 'yes' && radio.checked) {
                smartphoneDetails.style.display = 'block';
                smartphoneDetails.querySelectorAll('input').forEach(input => input.required = true);
            } else {
                smartphoneDetails.style.display = 'none';
                smartphoneDetails.querySelectorAll('input').forEach(input => {
                    input.required = false;
                    input.value = '';
                });
            }
        });
    });
    
    // Code of conduct no reason
    const conductRadios = document.querySelectorAll('input[name="agreesToConduct"]');
    const conductNoReason = document.getElementById('conductNoReason');
    
    conductRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value === 'no' && radio.checked) {
                conductNoReason.style.display = 'block';
                conductNoReason.querySelector('textarea').required = true;
            } else {
                conductNoReason.style.display = 'none';
                conductNoReason.querySelector('textarea').required = false;
                conductNoReason.querySelector('textarea').value = '';
            }
        });
    });
    
    // Misconduct details
    const misconductRadios = document.querySelectorAll('input[name="hasMisconduct"]');
    const misconductDetails = document.getElementById('misconductDetails');
    
    misconductRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value === 'yes' && radio.checked) {
                misconductDetails.style.display = 'block';
                misconductDetails.querySelector('textarea').required = true;
            } else {
                misconductDetails.style.display = 'none';
                misconductDetails.querySelector('textarea').required = false;
                misconductDetails.querySelector('textarea').value = '';
            }
        });
    });
    
    // Training no reason
    const trainingRadios = document.querySelectorAll('input[name="agreesToTraining"]');
    const trainingNoReason = document.getElementById('trainingNoReason');
    
    trainingRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value === 'no' && radio.checked) {
                trainingNoReason.style.display = 'block';
                trainingNoReason.querySelector('textarea').required = true;
            } else {
                trainingNoReason.style.display = 'none';
                trainingNoReason.querySelector('textarea').required = false;
                trainingNoReason.querySelector('textarea').value = '';
            }
        });
    });
}

let isSubmitting = false;

function formatTo254(phone) {
    if (!phone) return '';
    let cleaned = String(phone).replace(/[^0-9]/g, '');
    if (cleaned.startsWith('0')) {
        cleaned = '254' + cleaned.substring(1);
    } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
        cleaned = '254' + cleaned;
    }
    return cleaned;
}

window.handleFormSubmit = handleFormSubmit;

async function handleFormSubmit(e) {
    if (e && typeof e.preventDefault === 'function') {
        e.preventDefault();
    }
    
    if (isSubmitting) return;
    isSubmitting = true;
    
    const form = document.getElementById('fieldAgentForm');
    if (!form) {
        console.error('Field agent form not found');
        isSubmitting = false;
        return;
    }

    const submitBtn = document.querySelector('.btn-submit-onboarding') || form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn?.textContent || 'Submit Application';

    try {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        const fieldExperienceTypes = formData.getAll('fieldExperienceTypes');
        const languages = formData.getAll('languages');
        const internetAccess = formData.getAll('internetAccess');

        // ============================================================
        // STEP 1: Client-Side Validation
        // ============================================================
        
        // Validate ID number
        const idValidation = validateIdNumber(data.idNumber);
        if (!idValidation.valid) {
            showIdError(idValidation.message);
            showErrorMessage('Please fix all validation errors before submitting.');
            return;
        }
        
        // Enforce 18+ age
        const dob = new Date(data.dateOfBirth);
        const minAge = new Date();
        minAge.setFullYear(minAge.getFullYear() - 18);
        if (dob > minAge) {
            showErrorMessage('You must be at least 18 years old to apply.');
            return;
        }

        // Show loading overlay (Stage 1)
        showLoadingOverlay('Submitting your application...');
        
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting...';
            submitBtn.style.opacity = '0.6';
        }

        // ============================================================
        // STEP 2: Initialize Supabase
        // ============================================================
        
        const supabase = initSupabase();
        if (!supabase) {
            throw new Error('Failed to initialize Supabase');
        }
        
        // ============================================================
        // STEP 3: Generate Application Code via RPC (Stage 2)
        // ============================================================
        
        updateLoadingMessage('Generating your unique application code...');
        if (submitBtn) submitBtn.textContent = 'Generating application code...';

        const { data: codeData, error: codeError } = await supabase
            .rpc('generate_field_agent_code', {
                id_number: data.idNumber
            });
        
        if (codeError) {
            console.error('RPC Error:', codeError);
            throw new Error(codeError.message || 'Failed to generate application code');
        }
        
        // Check if RPC returned an error message
        if (codeData && codeData.startsWith('ERROR:')) {
            const errorMessage = codeData.substring(7); // Remove "ERROR: " prefix
            
            // Handle specific error cases
            if (errorMessage.includes('already been used')) {
                showIdError('This ID number has already been used. Each person can only apply once.');
                throw new Error('Duplicate ID number');
            } else if (errorMessage.includes('Unable to generate unique code')) {
                throw new Error('Unable to generate unique code. Please try again.');
            } else {
                throw new Error(errorMessage);
            }
        }
        
        const applicationCode = codeData;
        
        // ============================================================
        // STEP 4: Upload Documents to Supabase Storage (Stage 3)
        // ============================================================
        
        updateLoadingMessage('Uploading your documents securely...');
        if (submitBtn) submitBtn.textContent = 'Uploading documents...';
        
        const fileFields = [
            { name: 'idFront', required: true },
            { name: 'idBack', required: true },
            { name: 'cv', required: true },
            { name: 'chiefLetter', required: true },
            { name: 'passportPhoto', required: true },
            { name: 'goodConduct', required: false }
        ];
        
        const uploadedFiles = {};
        
        for (const field of fileFields) {
            const fileInput = form.querySelector(`input[name="${field.name}"]`);
            const file = fileInput?.files?.[0];
            
            if (!file) {
                if (field.required) {
                    throw new Error(`${field.name} is required but no file was selected`);
                }
                uploadedFiles[field.name] = null;
                continue;
            }
            
            // Generate unique filename
            const fileExt = file.name.split('.').pop();
            const fileName = `${applicationCode}_${field.name}_${Date.now()}.${fileExt}`;
            const filePath = `field-agents/${applicationCode}/${fileName}`;
            
            // Upload to Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase
                .storage
                .from('application-documents')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });
            
            if (uploadError) {
                console.error(`Error uploading ${field.name}:`, uploadError);
                throw new Error(`Failed to upload ${field.name}: ${uploadError.message}`);
            }
            
            // Get public URL
            const { data: urlData } = supabase
                .storage
                .from('application-documents')
                .getPublicUrl(filePath);
            
            uploadedFiles[field.name] = urlData.publicUrl;
        }
        
        // ============================================================
        // STEP 5: Insert Application Record with Document URLs (Stage 4)
        // ============================================================
        
        updateLoadingMessage('Saving your application record...');
        if (submitBtn) submitBtn.textContent = 'Saving application...';
        
        // Split full name into first and last name
        const nameParts = data.fullName.trim().split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
        
        // Format all phone numbers to 254XXXXXXXXX for database CHECK constraints
        const agentPhone = formatTo254(data.phone);
        const kinPhone = formatTo254(data.kinPhone);
        const ref1Phone = formatTo254(data.ref1Phone);
        const ref2Phone = formatTo254(data.ref2Phone);

        const { error: insertError } = await supabase
            .from('field_agents')
            .insert({
                application_code: applicationCode,
                first_name: firstName,
                last_name: lastName,
                phone: agentPhone,
                email: data.email,
                id_number: data.idNumber,
                date_of_birth: data.dateOfBirth,
                gender: data.gender === 'other' ? data.genderOther : data.gender,
                county: data.county,
                sub_county: data.subCounty,
                town: data.town,
                ward: data.ward,
                kin_name: data.kinName,
                kin_relationship: data.kinRelationship,
                kin_phone: kinPhone,
                kin_address: data.kinAddress,
                currently_employed: data.currentlyEmployed,
                current_employer: data.currentEmployer,
                has_previous_experience: data.hasFieldExperience,
                experience: fieldExperienceTypes.length > 0 
                    ? fieldExperienceTypes.join(', ') 
                    : (data.fieldExperienceTypes || null),
                experience_other: data.otherExperience,
                years_experience: data.yearsExperience,
                sme_experience: data.experienceDescription,
                languages: languages.length > 0 
                    ? languages.join(', ') 
                    : (data.languages || null),
                local_languages: data.localLanguages,
                local_market_familiar: data.familiarWithMarket,
                market_areas: data.marketAreas,
                owns_smartphone: data.ownsSmartphone,
                phone_brand: data.phoneBrand,
                android_version: data.androidVersion,
                can_use_smartphone: data.canUseSmartphone,
                internet_access: internetAccess.length > 0 
                    ? internetAccess.join(', ') 
                    : (data.internetAccess || null),
                referee1_name: data.ref1Name,
                referee1_phone: ref1Phone,
                referee1_relationship: data.ref1Relationship,
                referee2_name: data.ref2Name,
                referee2_phone: ref2Phone,
                referee2_relationship: data.ref2Relationship,
                criminal_history: data.hasMisconduct,
                criminal_explanation: data.misconductExplanation,
                code_of_conduct: data.agreesToConduct,
                code_of_conduct_explanation: data.conductNoExplanation || null,
                training_willingness: data.agreesToTraining,
                kra_pin: data.kraPin,
                // Document URLs
                id_front_url: uploadedFiles.idFront,
                id_back_url: uploadedFiles.idBack,
                cv_url: uploadedFiles.cv,
                chief_letter_url: uploadedFiles.chiefLetter,
                passport_photo_url: uploadedFiles.passportPhoto,
                good_conduct_url: uploadedFiles.goodConduct,
                agreement: data.agreement ? 'agreed' : 'not_agreed',
                status: 'pending'
            });

        if (insertError) {
            console.error('Insert Error:', insertError);
            throw insertError;
        }

        // ============================================================
        // STEP 6: Redirect to Success Page (Stage 5)
        // ============================================================
        
        // Hide loading overlay
        hideLoadingOverlay();
        
        // Show success message
        showSuccessMessage('Application submitted successfully! Redirecting...');
        
        // Update button state
        if (submitBtn) {
            submitBtn.textContent = '✓ Success! Redirecting...';
            submitBtn.style.background = '#00A651';
        }
        
        // Clear form on successful submission
        form.reset();
        clearIdError();
        
        // Redirect after short delay to show the application code and next stages
        setTimeout(() => {
            window.location.href = `registration-success.html?code=${encodeURIComponent(applicationCode)}`;
        }, 1500);
        
    } catch (error) {
        console.error('Error submitting application:', error);
        
        // Hide loading overlay
        hideLoadingOverlay();
        
        // Restore button state
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
        submitBtn.style.opacity = '1';
        submitBtn.style.background = '';
        
        const errorMessage = error?.message || '';

        // Display user-friendly error message (form data preserved - no reset)
        if (errorMessage === 'Duplicate ID number') {
            // Error already shown via showIdError()
            showErrorMessage('This ID number has already been used. Each person can only apply once.');
        } else if (errorMessage.includes('Unable to generate unique code')) {
            showErrorMessage('Unable to generate unique code. Please try again.');
        } else if (errorMessage.includes('Failed to initialize Supabase')) {
            showErrorMessage('Unable to connect to database service. Please check your network and try again.');
        } else if (errorMessage.includes('Failed to upload')) {
            showErrorMessage(`File upload error: ${errorMessage}. Please check your files and try again.`);
        } else if (errorMessage.includes('Network') || errorMessage.includes('network') || errorMessage.includes('Failed to fetch')) {
            showErrorMessage('Network error. Please check your connection and try again.');
        } else if (errorMessage.includes('Failed to generate application code')) {
            showErrorMessage('Error generating application code. Please try again.');
        } else if (errorMessage.includes('insert') || errorMessage.includes('database')) {
            showErrorMessage('Error submitting application. Please try again.');
        } else {
            showErrorMessage('Error submitting application. Please try again. If the problem persists, contact support.');
        }
    } finally {
        isSubmitting = false;
    }
}

// ============================================================
// UI FEEDBACK FUNCTIONS
// ============================================================

/**
 * Show loading overlay with message
 * @param {string} message - Loading message to display
 */
function showLoadingOverlay(message = 'Processing...') {
    // Remove existing overlay if present
    hideLoadingOverlay();
    
    const overlay = document.createElement('div');
    overlay.id = 'loadingOverlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        backdrop-filter: blur(4px);
    `;
    
    overlay.innerHTML = `
        <div style="
            background: white;
            padding: 2rem 3rem;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            max-width: 400px;
        ">
            <div style="
                width: 50px;
                height: 50px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #FF6B00;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 1rem;
            "></div>
            <p id="loadingMessage" style="
                margin: 0;
                font-size: 1.1rem;
                font-weight: 500;
                color: #333;
            ">${message}</p>
        </div>
    `;
    
    // Add spinning animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(overlay);
}

/**
 * Update loading overlay message
 * @param {string} message - New message to display
 */
function updateLoadingMessage(message) {
    const loadingMessage = document.getElementById('loadingMessage');
    if (loadingMessage) {
        loadingMessage.textContent = message;
    }
}

/**
 * Hide loading overlay
 */
function hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.remove();
    }
}

/**
 * Show success message
 * @param {string} message - Success message to display
 */
function showSuccessMessage(message) {
    showNotification(message, 'success');
}

/**
 * Show error message
 * @param {string} message - Error message to display
 */
function showErrorMessage(message) {
    showNotification(message, 'error');
}

/**
 * Show notification toast
 * @param {string} message - Message to display
 * @param {string} type - 'success' or 'error'
 */
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existing = document.querySelectorAll('.notification-toast');
    existing.forEach(el => el.remove());
    
    const notification = document.createElement('div');
    notification.className = 'notification-toast';
    
    const bgColor = type === 'success' ? '#00A651' : type === 'error' ? '#DC3545' : '#FF6B00';
    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${bgColor};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        font-size: 1rem;
        font-weight: 500;
        max-width: 400px;
        animation: slideIn 0.3s ease-out;
        display: flex;
        align-items: center;
        gap: 0.75rem;
    `;
    
    notification.innerHTML = `
        <span style="
            font-size: 1.5rem;
            font-weight: bold;
        ">${icon}</span>
        <span>${message}</span>
    `;
    
    // Add slide animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds (or longer for errors)
    const duration = type === 'error' ? 7000 : 5000;
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => notification.remove(), 300);
    }, duration);
}