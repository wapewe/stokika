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
        // STEP 4: Insert Application Record
        // ============================================================
        
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
                status: 'pending'
            });

        if (insertError) {
            console.error('Insert Error:', insertError);
            throw insertError;
        }

        // ============================================================
        // STEP 5: Redirect to Success Page
        // ============================================================
        
        // Clear form and errors on successful submission
        form.reset();
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
    } finally {
        isSubmitting = false;
    }
}
