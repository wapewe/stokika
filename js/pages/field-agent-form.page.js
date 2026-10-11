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

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    // ============================================================
    // STEP 1: Client-Side Validation
    // ============================================================
    
    // Validate ID number
    const idValidation = validateIdNumber(data.idNumber);
    if (!idValidation.valid) {
        showIdError(idValidation.message);
        alert('Please fix all validation errors before submitting.');
        return;
    }
    
    // Enforce 18+ age
    const dob = new Date(data.dateOfBirth);
    const minAge = new Date();
    minAge.setFullYear(minAge.getFullYear() - 18);
    if (dob > minAge) {
        alert('You must be at least 18 years old to apply.');
        return;
    }

    try {
        // ============================================================
        // STEP 2: Initialize Supabase
        // ============================================================
        
        const supabase = initSupabase();
        if (!supabase) {
            throw new Error('Failed to initialize Supabase');
        }
        
        // ============================================================
        // STEP 3: Generate Application Code via RPC
        // ============================================================
        
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
        // STEP 4: Insert Application Record
        // ============================================================
        
        // Split full name into first and last name
        const nameParts = data.fullName.trim().split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
        
        const { error: insertError } = await supabase
            .from('field_agents')
            .insert({
                application_code: applicationCode,
                first_name: firstName,
                last_name: lastName,
                phone: data.phone,
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
                kin_phone: data.kinPhone,
                kin_address: data.kinAddress,
                currently_employed: data.currentlyEmployed,
                current_employer: data.currentEmployer,
                has_previous_experience: data.hasFieldExperience,
                experience: Array.isArray(data.fieldExperienceTypes) 
                    ? data.fieldExperienceTypes.join(', ') 
                    : data.fieldExperienceTypes || null,
                experience_other: data.otherExperience,
                years_experience: data.yearsExperience,
                sme_experience: data.experienceDescription,
                languages: Array.isArray(data.languages) 
                    ? data.languages.join(', ') 
                    : data.languages || null,
                local_languages: data.localLanguages,
                local_market_familiar: data.familiarWithMarket,
                market_areas: data.marketAreas,
                owns_smartphone: data.ownsSmartphone,
                phone_brand: data.phoneBrand,
                android_version: data.androidVersion,
                can_use_smartphone: data.canUseSmartphone,
                internet_access: Array.isArray(data.internetAccess) 
                    ? data.internetAccess.join(', ') 
                    : data.internetAccess || null,
                referee1_name: data.ref1Name,
                referee1_phone: data.ref1Phone,
                referee1_relationship: data.ref1Relationship,
                referee2_name: data.ref2Name,
                referee2_phone: data.ref2Phone,
                referee2_relationship: data.ref2Relationship,
                criminal_history: data.hasMisconduct,
                criminal_explanation: data.misconductExplanation,
                code_of_conduct: data.agreesToConduct,
                code_of_conduct_explanation: data.conductNoExplanation || null,
                training_willingness: data.agreesToTraining,
                kra_pin: data.kraPin,
                agreement: data.agreement ? 'agreed' : 'not_agreed',
                status: 'pending',
                application_date: new Date().toISOString(),
                timezone: 'Africa/Nairobi'
            });

        if (insertError) {
            console.error('Insert Error:', insertError);
            throw insertError;
        }

        // ============================================================
        // STEP 5: Redirect to Success Page
        // ============================================================
        
        // Clear form and errors on successful submission
        e.target.reset();
        clearIdError();
        
        window.location.href = `registration-success.html?code=${applicationCode}`;
        
    } catch (error) {
        console.error('Error submitting application:', error);
        
        const errorMessage = error?.message || '';

        // Display user-friendly error message (form data preserved - no reset)
        if (errorMessage === 'Duplicate ID number') {
            // Error already shown via showIdError()
            alert('This ID number has already been used. Each person can only apply once.');
        } else if (errorMessage.includes('Unable to generate unique code')) {
            alert('Unable to generate unique code. Please try again.');
        } else if (errorMessage.includes('Failed to initialize Supabase')) {
            alert('Unable to connect to database service. Please check your network and try again.');
        } else if (errorMessage.includes('Network') || errorMessage.includes('network') || errorMessage.includes('Failed to fetch')) {
            alert('Network error. Please check your connection and try again.');
        } else if (errorMessage.includes('Failed to generate application code')) {
            alert('Error generating application code. Please try again.');
        } else if (errorMessage.includes('insert') || errorMessage.includes('database')) {
            alert('Error submitting application. Please try again.');
        } else {
            alert('Error submitting application. Please try again. If the problem persists, contact support.');
        }
    }
}