/**
 * Supervisor Onboarding Form Page Script
 * Handles form submission and input validation
 */

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
    const form = document.getElementById('supervisorForm');
    const idInput = document.getElementById('idNumber');

    // Initialize input sanitization
    if (typeof InputSanitizer !== 'undefined') {
        InputSanitizer.initForm('#supervisorForm');
        console.log('Input sanitization initialized for supervisor form');
    } else {
        console.warn('InputSanitizer not loaded');
    }

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

    form.addEventListener('submit', handleFormSubmit);
});

let isSubmitting = false;

window.handleFormSubmit = handleFormSubmit;

async function handleFormSubmit(e) {
    if (e && typeof e.preventDefault === 'function') {
        e.preventDefault();
    }
    
    if (isSubmitting) return;
    isSubmitting = true;
    
    const submitButton = document.querySelector('.btn-submit-onboarding');
    const originalButtonText = submitButton?.textContent || 'Submit Application';

    try {
        const form = document.getElementById('supervisorForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // Extract multi-value fields properly from FormData
        const experienceValues = formData.getAll('experience');
        const techSkillsValues = formData.getAll('techSkills');

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

        // Show loading overlay
        showLoadingOverlay('Submitting your application...');

        // ============================================================
        // STEP 2: Initialize Supabase
        // ============================================================
        
        if (submitButton) {
            submitButton.textContent = 'Submitting...';
            submitButton.disabled = true;
            submitButton.style.opacity = '0.6';
        }
        
        const supabase = initSupabase();
        if (!supabase) {
            throw new Error('Failed to initialize Supabase');
        }
        
        // ============================================================
        // STEP 3: Generate Application Code via RPC
        // ============================================================
        
        const { data: codeData, error: codeError } = await supabase
            .rpc('generate_supervisor_code', {
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
        // STEP 4: Upload Documents to Supabase Storage
        // ============================================================
        
        updateLoadingMessage('Uploading documents...');
        if (submitButton) {
            submitButton.textContent = 'Uploading documents...';
        }
        
        const documentUrls = {};
        const documentFields = [
            { formField: 'passportPhoto', storageField: 'passport_photo', bucketPath: 'passport_photo' },
            { formField: 'nationalIdFront', storageField: 'id_front', bucketPath: 'id_front' },
            { formField: 'nationalIdBack', storageField: 'id_back', bucketPath: 'id_back' },
            { formField: 'cv', storageField: 'cv', bucketPath: 'cv' },
            { formField: 'goodConduct', storageField: 'good_conduct', bucketPath: 'good_conduct' }
        ];
        
        for (const doc of documentFields) {
            const fileInput = document.getElementById(doc.formField);
            const file = fileInput?.files?.[0];
            
            // Skip optional files if not provided
            if (!file && doc.formField === 'goodConduct') {
                continue;
            }
            
            if (!file) {
                throw new Error(`Missing required document: ${doc.formField}`);
            }
            
            // Generate unique filename with timestamp
            const timestamp = Date.now();
            const fileExtension = file.name.split('.').pop();
            const fileName = `${applicationCode}_${doc.bucketPath}_${timestamp}.${fileExtension}`;
            const storagePath = `supervisors/${applicationCode}/${fileName}`;
            
            // Upload to Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('application-documents')
                .upload(storagePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });
            
            if (uploadError) {
                console.error(`Upload error for ${doc.formField}:`, uploadError);
                throw new Error(`Failed to upload ${doc.formField}: ${uploadError.message}`);
            }
            
            // Get public URL
            const { data: urlData } = supabase.storage
                .from('application-documents')
                .getPublicUrl(storagePath);
            
            documentUrls[`${doc.storageField}_url`] = urlData.publicUrl;
        }
        
        // ============================================================
        // STEP 5: Insert Application Record with Document URLs
        // ============================================================
        
        updateLoadingMessage('Saving your application...');
        if (submitButton) {
            submitButton.textContent = 'Saving application...';
        }
        
        // Split full name into first and last name
        const nameParts = data.fullName.trim().split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
        
        const { error: insertError } = await supabase
            .from('supervisors')
            .insert({
                application_code: applicationCode,
                first_name: firstName,
                last_name: lastName,
                phone: data.phone,
                email: data.email,
                id_number: data.idNumber,
                date_of_birth: data.dateOfBirth,
                county: data.county,
                education: data.education,
                institution: data.institution,
                course: data.course,
                experience: experienceValues.length > 0 ? experienceValues : (data.experience ? [data.experience] : []),
                years_experience: data.yearsExperience,
                experience_summary: data.experienceSummary,
                tech_skills: techSkillsValues.length > 0 ? techSkillsValues : (data.techSkills ? [data.techSkills] : []),
                tech_confidence: data.techConfidence,
                kra_pin: data.kraPin,
                status: 'pending',
                // Add document URLs
                ...documentUrls
            });

        if (insertError) {
            console.error('Insert Error:', insertError);
            throw insertError;
        }

        // ============================================================
        // STEP 6: Redirect to Success Page
        // ============================================================
        
        // Hide loading overlay
        hideLoadingOverlay();
        
        // Show success message
        showSuccessMessage('Application submitted successfully! Redirecting...');
        
        if (submitButton) {
            submitButton.textContent = '✓ Success! Redirecting...';
            submitButton.style.background = '#00A651';
        }
        
        // Clear form and errors on successful submission
        form.reset();
        clearIdError();
        
        // Redirect after delay for user feedback
        setTimeout(() => {
            window.location.href = `registration-success.html?code=${encodeURIComponent(applicationCode)}`;
        }, 1500);
        
    } catch (error) {
        console.error('Error submitting application:', error);
        
        // Hide loading overlay
        hideLoadingOverlay();
        
        const errorMessage = error?.message || '';

        // Restore button state
        if (submitButton) {
            submitButton.textContent = originalButtonText;
            submitButton.disabled = false;
            submitButton.style.opacity = '1';
            submitButton.style.background = '';
        }

        // Display user-friendly error message (form data preserved - no reset)
        if (errorMessage === 'Duplicate ID number') {
            // Error already shown via showIdError()
            showErrorMessage('This ID number has already been used. Each person can only apply once.');
        } else if (errorMessage.includes('Unable to generate unique code')) {
            showErrorMessage('Unable to generate unique code. Please try again.');
        } else if (errorMessage.includes('Failed to initialize Supabase')) {
            showErrorMessage('Unable to connect to database service. Please check your network and try again.');
        } else if (errorMessage.includes('Network') || errorMessage.includes('network') || errorMessage.includes('Failed to fetch')) {
            showErrorMessage('Network error. Please check your connection and try again.');
        } else if (errorMessage.includes('Failed to generate application code')) {
            showErrorMessage('Error generating application code. Please try again.');
        } else if (errorMessage.includes('Failed to upload')) {
            showErrorMessage('Error uploading documents. Please check your files and try again.');
        } else if (errorMessage.includes('Missing required document')) {
            showErrorMessage('Please ensure all required documents are selected.');
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
