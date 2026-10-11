// ========================================
// TOAST NOTIFICATION SYSTEM
// ========================================
function showToast(message, type = 'info') {
    // Remove any existing toasts
    const existingToasts = document.querySelectorAll('.toast-notification');
    existingToasts.forEach(toast => toast.remove());
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    
    // Icon based on type
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };
    
    toast.innerHTML = `
        <div class="toast-icon">${icons[type] || icons.info}</div>
        <div class="toast-message">${message}</div>
        <button class="toast-close">&times;</button>
    `;
    
    // Add to body
    document.body.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Close button handler
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    });
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// Header scroll effect
const header = document.querySelector('.header');
const headerNav = document.querySelector('.header-nav');
const headerContent = document.querySelector('.header-content');

window.addEventListener('scroll', () => {
    if (window.pageYOffset > 100) {
        header?.classList.add('scrolled');
    } else {
        header?.classList.remove('scrolled');
    }
});

// Mobile menu toggle
const mobileMenuToggle = document.getElementById('mobileMenuToggle');

mobileMenuToggle?.addEventListener('click', (e) => {
    e.stopPropagation();
    headerNav?.classList.toggle('active');
    mobileMenuToggle?.classList.toggle('active');
    document.body.style.overflow = headerNav?.classList.contains('active') ? 'hidden' : '';
});

// Close menu when clicking outside
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768 && 
        headerNav?.classList.contains('active') && 
        !headerNav.contains(e.target) && 
        e.target !== mobileMenuToggle &&
        !mobileMenuToggle?.contains(e.target)) {
        headerNav?.classList.remove('active');
        mobileMenuToggle?.classList.remove('active');
        document.body.style.overflow = '';
    }
});

// Close mobile menu on link click
document.querySelectorAll('.header-nav a').forEach(link => {
    link.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            headerNav?.classList.remove('active');
            mobileMenuToggle?.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
});

// Get Started Modal
const getStartedBtn = document.getElementById('getStartedBtn');
const getStartedModal = document.getElementById('getStartedModal');
const modalClose = document.getElementById('modalClose');
const joinVendor = document.getElementById('joinVendor');
const joinSupplier = document.getElementById('joinSupplier');

getStartedBtn?.addEventListener('click', () => {
    getStartedModal?.classList.add('active');
});

modalClose?.addEventListener('click', () => {
    getStartedModal?.classList.remove('active');
});

getStartedModal?.addEventListener('click', (e) => {
    if (e.target === getStartedModal) {
        getStartedModal.classList.remove('active');
    }
});

// Handle contact guidance link
document.getElementById('contactGuidance')?.addEventListener('click', (e) => {
    e.preventDefault();
    getStartedModal?.classList.remove('active');
    document.querySelector('#contact')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
});

// Mobile/tablet touch/click functionality for modal cards
function handleMobileCardClick(e) {
    if (window.innerWidth <= 1024) {
        const card = e.currentTarget;
        const registerBtn = card.querySelector('.register-btn');
        
        // If clicking the register button, don't toggle expansion
        if (e.target === registerBtn) {
            return;
        }
        
        e.preventDefault();
        card.classList.toggle('expanded');
    }
}

// Add click listeners to modal cards for mobile
document.addEventListener('DOMContentLoaded', () => {
    const vendorCard = document.getElementById('joinVendor');
    const supplierCard = document.getElementById('joinSupplier');
    
    vendorCard?.addEventListener('click', handleMobileCardClick);
    supplierCard?.addEventListener('click', handleMobileCardClick);
});

// Handle vendor card click (entire card)
joinVendor?.addEventListener('click', (e) => {
    if (e.target.classList.contains('register-btn')) {
        e.stopPropagation();
        getStartedModal?.classList.remove('active');
        const vendorModal = document.getElementById('vendorRegistrationModal');
        vendorModal?.classList.add('active');
        // TypeScript controller automatically handles step display
    }
});

// Handle vendor register button click
document.querySelector('.register-btn.green')?.addEventListener('click', (e) => {
    e.stopPropagation();
    getStartedModal?.classList.remove('active');
    const vendorModal = document.getElementById('vendorRegistrationModal');
    vendorModal?.classList.add('active');
    // TypeScript controller automatically handles step display
});

// Handle supplier card click (entire card)
joinSupplier?.addEventListener('click', (e) => {
    if (e.target.classList.contains('register-btn')) {
        e.stopPropagation();
        getStartedModal?.classList.remove('active');
        const supplierModal = document.getElementById('supplierRegistrationModal');
        supplierModal?.classList.add('active');
    }
});

// Handle supplier register button click
document.querySelector('.register-btn.blue')?.addEventListener('click', (e) => {
    e.stopPropagation();
    getStartedModal?.classList.remove('active');
    const supplierModal = document.getElementById('supplierRegistrationModal');
    supplierModal?.classList.add('active');
});

// ========================================
// SUPPLIER REGISTRATION MODAL
// ========================================
const supplierModalClose = document.getElementById('supplierModalClose');
const supplierRegistrationModal = document.getElementById('supplierRegistrationModal');

// Close supplier modal - X button
if (supplierModalClose) {
    supplierModalClose.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('🔴 Supplier modal X clicked');
        if (supplierRegistrationModal) {
            supplierRegistrationModal.classList.remove('active');
        }
    });
}

// Close supplier modal - click outside
if (supplierRegistrationModal) {
    supplierRegistrationModal.addEventListener('click', (e) => {
        // Only close if clicking directly on the overlay background
        if (e.target === supplierRegistrationModal) {
            console.log('🔴 Supplier modal overlay clicked');
            supplierRegistrationModal.classList.remove('active');
        }
    });
}

// County selection handler
document.addEventListener('change', (e) => {
    if (e.target.name === 'counties') {
        updateTownInputs();
    }
    
    if (e.target.id === 'otherCategory') {
        const otherField = document.getElementById('otherCategoryField');
        const otherInput = document.querySelector('input[name="otherCategoryText"]');
        if (e.target.checked) {
            otherField.classList.remove('hidden');
            otherInput.required = true;
        } else {
            otherField.classList.add('hidden');
            otherInput.required = false;
        }
    }
    
    if (e.target.name === 'acceptsCredit') {
        const creditField = document.getElementById('creditDurationField');
        const creditSelect = document.getElementById('creditDurationSelect');
        if (e.target.value === 'yes') {
            creditField.classList.remove('hidden');
            creditSelect.required = true;
        } else {
            creditField.classList.add('hidden');
            creditSelect.required = false;
        }
    }
});

function updateTownInputs() {
    const selectedCounties = Array.from(document.querySelectorAll('input[name="counties"]:checked')).map(cb => cb.value);
    const townsSection = document.getElementById('townsSection');
    const townInputs = document.getElementById('townInputs');
    
    if (selectedCounties.length > 0) {
        townsSection.classList.remove('hidden');
        townInputs.innerHTML = XSSProtection.sanitize(selectedCounties.map(county => `
            <div class="town-input-group">
                <label>${county} County</label>
                <input type="text" name="towns_${county.replace(/[^a-zA-Z0-9]/g, '_')}" placeholder="Enter towns/areas separated by commas (e.g., Nakuru Town, Naivasha, Gilgil)" required>
            </div>
        `).join(''));
    } else {
        townsSection.classList.add('hidden');
        townInputs.textContent = '';
    }
}

// Supplier form submission
document.getElementById('supplierRegistrationForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const counties = Array.from(document.querySelectorAll('input[name="counties"]:checked')).map(cb => cb.value);
    const categories = Array.from(document.querySelectorAll('input[name="categories"]:checked')).map(cb => cb.value);
    const paymentTerms = Array.from(document.querySelectorAll('input[name="paymentTerms"]:checked')).map(cb => cb.value);
    
    if (counties.length === 0) {
        alert('Please select at least one county.');
        return;
    }
    
    if (categories.length === 0) {
        alert('Please select at least one product category.');
        return;
    }
    
    if (paymentTerms.length === 0) {
        alert('Please select at least one payment term.');
        return;
    }
    
    const data = {
        company_name: formData.get('companyName'),
        contact_person: formData.get('contactPerson'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        registration_number: formData.get('registrationNumber'),
        years_in_business: formData.get('yearsInBusiness'),
        number_of_employees: formData.get('numberOfEmployees'),
        counties: counties.join(', '),
        categories: categories.join(', '),
        other_category_text: formData.get('otherCategoryText'),
        minimum_order_quantity: formData.get('minimumOrderQuantity'),
        certifications: formData.get('certifications'),
        payment_terms: paymentTerms.join(', '),
        accepts_credit: formData.get('acceptsCredit'),
        credit_duration: formData.get('creditDuration'),
        created_at: new Date().toISOString()
    };
    
    try {
        const { data: result, error } = await supabase
            .from('suppliers')
            .insert([data]);
        
        if (error) throw error;
        
        alert('Supplier registration submitted successfully! We will contact you within 24 hours.');
        supplierRegistrationModal.classList.remove('active');
        e.target.reset();
        updateTownInputs();
    } catch (error) {
        console.error('Error submitting supplier registration:', error);
        alert('There was an error submitting your registration. Please try again.');
    }
});


// Hero Scroll Snap Navigation - COMPLETELY REWRITTEN FOR ANIMATIONS
const heroSection = document.querySelector('.hero-section');
const heroContainer = document.querySelector('.hero-container');
const slides = document.querySelectorAll('.hero-slide');
let currentSlide = 0;
let isAnimating = false;

console.log('🎬 Hero initialization - Found ' + slides.length + ' slides');

// Animate hero elements when slide becomes active
function animateSlide(slideIndex) {
    if (!slides[slideIndex]) {
        console.error('❌ Slide ' + slideIndex + ' not found');
        return;
    }
    
    console.log('✨ Animating slide ' + slideIndex);
    
    // Remove loaded class from all slides first
    slides.forEach((slide, idx) => {
        if (idx !== slideIndex) {
            slide.classList.remove('loaded');
        }
    });
    
    // Remove and re-add to trigger animation
    const targetSlide = slides[slideIndex];
    targetSlide.classList.remove('loaded');
    
    // Force reflow to restart animation
    void targetSlide.offsetWidth;
    
    // Add loaded class after tiny delay
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            targetSlide.classList.add('loaded');
            console.log('✅ Loaded class added to slide ' + slideIndex);
        });
    });
}

// Initialize animations when page loads
function initHeroAnimations() {
    console.log('🚀 Initializing hero animations...');
    
    if (slides.length === 0) {
        console.error('❌ ERROR: No hero slides found! Check HTML structure.');
        return;
    }
    
    // Ensure all slides start without loaded class
    slides.forEach((slide, idx) => {
        slide.classList.remove('loaded');
        console.log('Slide ' + idx + ' reset');
    });
    
    // Animate first slide after short delay
    setTimeout(() => {
        console.log('🎯 Triggering first slide animation');
        animateSlide(0);
    }, 500);
}

// Wait for DOM to be completely ready
if (document.readyState === 'loading') {
    console.log('⏳ Waiting for DOM to load...');
    document.addEventListener('DOMContentLoaded', initHeroAnimations);
} else {
    console.log('✓ DOM already loaded, initializing now');
    initHeroAnimations();
}


// Smooth scroll to specific slide
function scrollToSlide(index) {
    if (heroContainer && slides[index]) {
        const slideHeight = window.innerHeight;
        heroContainer.scrollTo({
            top: index * slideHeight,
            behavior: 'smooth'
        });
        currentSlide = index;
    }
}

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' && currentSlide < slides.length - 1) {
        e.preventDefault();
        scrollToSlide(currentSlide + 1);
    } else if (e.key === 'ArrowUp' && currentSlide > 0) {
        e.preventDefault();
        scrollToSlide(currentSlide - 1);
    }
});

// Update current slide based on scroll position
heroContainer?.addEventListener('scroll', () => {
    const slideHeight = window.innerHeight;
    const scrollTop = heroContainer.scrollTop;
    const newSlide = Math.round(scrollTop / slideHeight);
    
    if (newSlide !== currentSlide && newSlide >= 0 && newSlide < slides.length) {
        currentSlide = newSlide;
        animateSlide(newSlide);
        
        // Update slide indicators
        document.querySelectorAll('.slide-dot').forEach((dot, index) => {
            if (index === newSlide) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }
});

// Prevent page scroll until last slide
let isInHero = true;
window.addEventListener('wheel', (e) => {
    if (window.pageYOffset === 0 && currentSlide < slides.length - 1) {
        e.preventDefault();
        if (e.deltaY > 0) {
            scrollToSlide(currentSlide + 1);
        } else if (e.deltaY < 0 && currentSlide > 0) {
            scrollToSlide(currentSlide - 1);
        }
    } else if (window.pageYOffset === 0 && currentSlide === slides.length - 1 && e.deltaY > 0) {
        isInHero = false;
    }
}, { passive: false });

// Smooth scroll for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });

        }
    });
});

// Intersection Observer for animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe all cards and sections
document.querySelectorAll('.step-card, .audience-card, .testimonial-card, .pricing-card, .about-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'all 0.6s ease-out';
    observer.observe(el);
});

// Contact Form Submission
const contactForm = document.getElementById('contactForm');
contactForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(contactForm);
    const data = {
        name: formData.get('name'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        business_type: formData.get('business_type'),
        other_business_type: formData.get('other_business_type'),
        message: formData.get('message'),
        created_at: new Date().toISOString()
    };
    
    // Show loading state
    const submitBtn = contactForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;
    
    try {
        // Use existing Supabase client
        const client = window._supabaseClient || window.supabase;
        if (!client) {
            throw new Error('Supabase not initialized. Please check your configuration.');
        }
        
        const { data: result, error } = await client
            .from('contacts')
            .insert([data]);
        
        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }
        
        alert('Thank you! We will contact you soon.');
        contactForm.reset();
    } catch (error) {
        console.error('Contact form error:', error);
        alert('Something went wrong. Please try again.');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
});

// Newsletter Form Submission
const newsletterForm = document.getElementById('newsletterForm');
newsletterForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(newsletterForm);
    const email = formData.get('email');
    
    if (!email || !email.includes('@')) {
        alert('Please enter a valid email address.');
        return;
    }
    
    const submitBtn = newsletterForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Subscribing...';
    submitBtn.disabled = true;
    
    try {
        // Use existing Supabase client
        const client = window._supabaseClient || window.supabase;
        if (!client) {
            throw new Error('Supabase not initialized. Please check your configuration.');
        }
        
        const { data: result, error } = await client
            .from('newsletter_subscribers')
            .insert([{
                email: email,
                created_at: new Date().toISOString()
            }]);
        
        if (error) {
            if (error.code === '23505') { // Unique constraint violation
                alert('This email is already subscribed to our newsletter.');
            } else {
                throw error;
            }
        } else {
            alert('Successfully subscribed to newsletter!');
            newsletterForm.reset();
        }
    } catch (error) {
        alert('Something went wrong. Please try again.');
        console.error('Error:', error);
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
});

// Back to Top Button
const backToTopBtn = document.getElementById('backToTop');
const scrollIndicator = document.querySelector('.scroll-indicator');

backToTopBtn?.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

// Back to top button visibility
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    // Back to top button visibility (show after scrolling halfway)
    const halfwayPoint = (document.documentElement.scrollHeight - window.innerHeight) / 2;
    if (currentScroll > halfwayPoint) {
        backToTopBtn?.classList.add('visible');
    } else {
        backToTopBtn?.classList.remove('visible');
    }
    
    // Scroll indicator visibility (only show in hero section)
    if (currentScroll < window.innerHeight - 100) {
        scrollIndicator?.style.setProperty('opacity', '1');
        scrollIndicator?.style.setProperty('visibility', 'visible');
    } else {
        scrollIndicator?.style.setProperty('opacity', '0');
        scrollIndicator?.style.setProperty('visibility', 'hidden');
    }
    
    lastScroll = currentScroll;
});

// Success Stories Slider
let currentTestimonial = 0;
const testimonialSlider = document.querySelector('.testimonials-grid');
const testimonialDots = document.querySelectorAll('.testimonial-dot');
const totalTestimonials = 5;

function showTestimonial(index) {
    if (testimonialSlider) {
    if (testimonialSlider) {
        // Only apply transform on desktop (>768px)
        
        testimonialDots.forEach((dot, i) => {
            if (i === index) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }
}

function nextTestimonial() {
    const next = (currentTestimonial + 1) % totalTestimonials;
    showTestimonial(next);
}

testimonialDots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
        showTestimonial(index);
        clearInterval(testimonialAutoSlide);
        testimonialAutoSlide = setInterval(nextTestimonial, 6000);
    });
});

let testimonialAutoSlide = setInterval(nextTestimonial, 6000);

document.addEventListener('DOMContentLoaded', () => {
    // Initialize success stories slider
    showTestimonial(0);
    
    // Initialize hero section interactions
    // Hero section mouse tracking for scroll indicator and slide indicators
    const scrollInd = document.getElementById('scrollIndicator');
    const slideIndicators = document.getElementById('slideIndicators');
    const slideDots = document.querySelectorAll('.slide-dot');
    
    heroSection?.addEventListener('mouseenter', () => {
        scrollInd?.classList.add('visible');
        slideIndicators?.classList.add('visible');
    });
    
    heroSection?.addEventListener('mouseleave', () => {
        scrollInd?.classList.remove('visible');
        slideIndicators?.classList.remove('visible');
    });
    
    heroSection?.addEventListener('mousemove', (e) => {
        if (scrollInd) {
            scrollInd.style.left = e.clientX + 'px';
            scrollInd.style.top = e.clientY + 'px';
            scrollInd.style.transform = 'rotate(180deg) translate(50%, 50%)';
        }
    });
    
    // Slide indicator click handlers
    slideDots.forEach(dot => {
        dot.addEventListener('click', () => {
            const slideIndex = parseInt(dot.getAttribute('data-slide'));
            scrollToSlide(slideIndex);
        });
    });
    
    // Auto-advance slides every 8 seconds
    let autoSlideInterval = setInterval(() => {
        if (currentSlide < slides.length - 1) {
            scrollToSlide(currentSlide + 1);
        } else {
            scrollToSlide(0);
        }
    }, 8000);
    
    // Stop auto-advance on user interaction
    heroContainer?.addEventListener('scroll', () => {
        clearInterval(autoSlideInterval);
    });
    
    heroContainer?.addEventListener('touchstart', () => {
        clearInterval(autoSlideInterval);
    });
});

// ========================================
// ========================================
// VENDOR REGISTRATION MODAL
// ========================================
// NOTE: Modal functionality handled by TypeScript module (dist/vendor-registration.js)
// This section only handles button triggers

// Trigger buttons for opening vendor modal
document.addEventListener('DOMContentLoaded', () => {
    // Register button in Get Started modal (already handled above at line ~160)
    // Removed duplicate handler to prevent conflicts
    
    // Other vendor CTA buttons
    document.querySelectorAll('[data-modal="vendor"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const modal = document.getElementById('vendorRegistrationModal');
            if (modal) {
                modal.classList.add('active');
            }
        });
    });
});

// End of vendor registration triggers
// All other functionality (steps, validation, submission) handled by TypeScript

// Auto-advance hero slides (optional)
let autoAdvanceInterval;

function startAutoAdvance() {
    autoAdvanceInterval = setInterval(() => {
        if (currentSlide < slides.length - 1) {
            scrollToSlide(currentSlide + 1);
        } else {
            scrollToSlide(0);
        }
    }, 5000);
}

function stopAutoAdvance() {
    clearInterval(autoAdvanceInterval);
}

// Uncomment to enable auto-advance
// startAutoAdvance();

// Stop auto-advance when user interacts
heroSection?.addEventListener('scroll', stopAutoAdvance);
heroSection?.addEventListener('touchstart', stopAutoAdvance);


// MOBILE FIX: Disable testimonial slider on mobile devices
(function() {
    const originalShowTestimonial = showTestimonial;
    
    // Override showTestimonial to check screen size
    showTestimonial = function(index) {
        if (testimonialSlider) {
            // Only slide on desktop
            if (window.innerWidth > 768) {
                testimonialSlider.style.transform = `translateX(-${index * 20}%)`;
            } else {
                // On mobile, keep cards stacked (no sliding)
                testimonialSlider.style.transform = 'translateX(0)';
            }
            currentTestimonial = index;
            
            testimonialDots.forEach((dot, i) => {
                if (i === index) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            });
        }
    };
    
    // Stop auto-slide on mobile
    if (window.innerWidth <= 768 && typeof testimonialAutoSlide !== 'undefined') {
        clearInterval(testimonialAutoSlide);
    }
    
    // Handle window resize
    window.addEventListener('resize', () => {
        if (window.innerWidth <= 768) {
            // Mobile: reset position and stop sliding
            if (testimonialSlider) {
                testimonialSlider.style.transform = 'translateX(0)';
            }
            if (typeof testimonialAutoSlide !== 'undefined') {
                clearInterval(testimonialAutoSlide);
            }
        }
    });
})();


// ========================================
// MOBILE FIX: Disable testimonial auto-slide on mobile
// ========================================
(function() {
    // Check if we're on mobile
    function isMobile() {
        return window.innerWidth <= 768;
    }
    
    // Store original interval
    let originalAutoSlide = testimonialAutoSlide;
    
    // Stop auto-slide immediately if on mobile
    if (isMobile()) {
        clearInterval(testimonialAutoSlide);
        testimonialAutoSlide = null;
        
        // Reset slider position to show all cards
        if (testimonialSlider) {
            testimonialSlider.style.transform = 'translateX(0)';
        }
    }
    
    // Override showTestimonial for mobile
    const originalShowTestimonial = window.showTestimonial || showTestimonial;
    window.showTestimonial = function(index) {
        if (isMobile()) {
            // On mobile: just update dots, don't slide
            if (testimonialSlider) {
                testimonialSlider.style.transform = 'translateX(0)';
            }
            currentTestimonial = index;
            
            testimonialDots.forEach((dot, i) => {
                if (i === index) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            });
        } else {
            // On desktop: use original function
            if (typeof originalShowTestimonial === 'function') {
                originalShowTestimonial(index);
            }
        }
    };
    
    // Handle window resize
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (isMobile()) {
                // Switched to mobile: stop sliding
                if (testimonialAutoSlide) {
                    clearInterval(testimonialAutoSlide);
                    testimonialAutoSlide = null;
                }
                if (testimonialSlider) {
                    testimonialSlider.style.transform = 'translateX(0)';
                }
            } else {
                // Switched to desktop: restart sliding if not running
                if (!testimonialAutoSlide && typeof nextTestimonial === 'function') {
                    testimonialAutoSlide = setInterval(nextTestimonial, 6000);
                }
            }
        }, 250);
    });
    
    console.log('📱 Testimonial mobile fix applied - auto-slide disabled on mobile');
})();



// ========================================
// MOBILE TESTIMONIAL SCROLL ANIMATION
// ========================================
(function() {
    // Only run on mobile devices
    function isMobileForAnimation() {
        return window.innerWidth <= 768;
    }
    
    // Create Intersection Observer for testimonial cards on mobile
    let testimonialObserver = null;
    
    function initMobileTestimonials() {
        if (!isMobileForAnimation()) {
            return;
        }
        
        testimonialObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Add 'in-view' class when card enters viewport
                    entry.target.classList.add('in-view');
                    
                    // After animation completes, add 'stable' class to prevent further transforms
                    setTimeout(() => {
                        entry.target.classList.add('stable');
                    }, 1000); // Wait for animation to complete (0.8s + buffer)
                    
                    // Once animated, stop observing this card
                    if (testimonialObserver) {
                        testimonialObserver.unobserve(entry.target);
                    }
                }
            });
        }, {
            threshold: 0.2, // Trigger when 20% of card is visible
            rootMargin: '0px 0px -50px 0px' // Start animation slightly before card enters viewport
        });
        
        const testimonialCards = document.querySelectorAll('.testimonial-card');
        testimonialCards.forEach(card => {
            // Ensure initial state
            card.style.opacity = '0';
            card.style.transform = 'translateY(40px)';
            
            // Start observing
            testimonialObserver.observe(card);
        });
        
        console.log('📱 Mobile testimonial scroll animations initialized');
    }
    
    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', initMobileTestimonials);
    
    // Handle window resize - reinitialize if switching to mobile
    let wasDesktop = !isMobileForAnimation();
    window.addEventListener('resize', () => {
        const isNowMobile = isMobileForAnimation();
        
        if (wasDesktop && isNowMobile) {
            // Just switched to mobile - reinitialize
            initMobileTestimonials();
        } else if (!wasDesktop && !isNowMobile) {
            // Switched to desktop - remove mobile animation classes
            const testimonialCards = document.querySelectorAll('.testimonial-card');
            testimonialCards.forEach(card => {
                card.classList.remove('in-view', 'stable');
                card.style.opacity = '';
                card.style.transform = '';
            });
        }
        
        wasDesktop = !isNowMobile;
    });
})();


}


// ========================================
// DYNAMIC COPYRIGHT YEAR
// ========================================
document.addEventListener('DOMContentLoaded', function() {
    const copyrightYearElement = document.getElementById('copyrightYear');
    if (copyrightYearElement) {
        const currentYear = new Date().getFullYear();
        copyrightYearElement.textContent = currentYear;
        console.log('✅ Copyright year set to:', currentYear);
    }
});


// ========================================
// MOBILE: HERO SLIDE ANIMATIONS ON SCROLL
// ========================================
(function() {
    function isMobileViewport() {
        return window.innerWidth <= 768;
    }
    
    if (!isMobileViewport()) {
        return; // Only run on mobile
    }
    
    // Create Intersection Observer for hero slides on mobile
    const heroSlideObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const slide = entry.target;
                const slideIndex = Array.from(slide.parentElement.children).indexOf(slide);
                
                // Trigger animation for this slide
                console.log('📱 Mobile: Animating slide ' + slideIndex + ' (in viewport)');
                
                // Add loaded class to trigger fade-in animation
                slide.classList.add('loaded');
            }
        });
    }, {
        threshold: 0.3, // Trigger when 30% of slide is visible
        rootMargin: '0px'
    });
    
    // Observe all hero slides on mobile
    document.addEventListener('DOMContentLoaded', () => {
        if (isMobileViewport()) {
            const heroSlides = document.querySelectorAll('.hero-slide');
            heroSlides.forEach((slide, index) => {
                // Don't observe slide 0 - it's already animated on load
                if (index > 0) {
                    heroSlideObserver.observe(slide);
                    console.log('📱 Observing hero slide ' + index + ' for mobile scroll animation');
                }
            });
        }
    });
    
    // Handle window resize
    let wasMobile = isMobileViewport();
    window.addEventListener('resize', () => {
        const isNowMobile = isMobileViewport();
        
        if (!wasMobile && isNowMobile) {
            // Switched to mobile - start observing slides
            const heroSlides = document.querySelectorAll('.hero-slide');
            heroSlides.forEach((slide, index) => {
                if (index > 0 && !slide.classList.contains('loaded')) {
                    heroSlideObserver.observe(slide);
                }
            });
        }
        
        wasMobile = isNowMobile;
    });
})();


// ========================================
// BUTTON EVENT LISTENERS FOR MODAL OPENING
// ========================================
document.addEventListener('DOMContentLoaded', function() {
    // Join as Supplier button in For Suppliers section
    const btnSupplier = document.querySelector('.btn-supplier');
    if (btnSupplier) {
        btnSupplier.addEventListener('click', function(e) {
            e.preventDefault();
            const modal = document.getElementById('supplierRegistrationModal');
            if (modal) {
                modal.classList.add('active');
            }
        });
    }

    // I'm a Supplier button in pricing CTA section
    const btnSupplierCTA = document.querySelector('.btn-cta.supplier');
    if (btnSupplierCTA) {
        btnSupplierCTA.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('📦 Supplier CTA button clicked');
            const modal = document.getElementById('supplierRegistrationModal');
            if (modal) {
                modal.classList.add('active');
                document.body.classList.add('modal-open');
            }
        });
    }

    console.log('✅ Button event listeners initialized');
});
