// ========================================
// UNIVERSAL TESTIMONIALS SLIDER
// Works on Desktop, Tablet, AND Mobile
// ========================================

(function() {
    'use strict';
    
    console.log('🎠 Initializing Universal Testimonials Slider...');
    
    let currentTestimonial = 0;
    const totalTestimonials = 5;
    let testimonialSlider = null;
    let testimonialDots = null;
    let autoSlideInterval = null;
    let touchStartX = 0;
    let touchEndX = 0;
    let isDragging = false;
    
    function init() {
        testimonialSlider = document.querySelector('.testimonials-grid');
        testimonialDots = document.querySelectorAll('.testimonial-dot');
        
        if (!testimonialSlider) {
            console.warn('⚠️ Testimonials slider not found');
            return;
        }
        
        console.log('✅ Found testimonials slider with', totalTestimonials, 'cards');
        
        // Set up slider
        setupSlider();
        
        // Set up touch/swipe handlers
        setupTouchHandlers();
        
        // Set up dot navigation
        setupDotNavigation();
        
        // Start auto-slide
        startAutoSlide();
        
        // Show first testimonial
        showTestimonial(0);
        
        console.log('✅ Universal Testimonials Slider initialized');
    }
    
    function setupSlider() {
        // Ensure slider is set up correctly
        testimonialSlider.style.display = 'flex';
        testimonialSlider.style.transition = 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
        
        // Make cards equal width
        const cards = testimonialSlider.querySelectorAll('.testimonial-card');
        cards.forEach(card => {
            card.style.minWidth = '100%';
            card.style.flexShrink = '0';
        });
    }
    
    function setupTouchHandlers() {
        // Mouse events for desktop
        testimonialSlider.addEventListener('mousedown', handleDragStart);
        testimonialSlider.addEventListener('mousemove', handleDragMove);
        testimonialSlider.addEventListener('mouseup', handleDragEnd);
        testimonialSlider.addEventListener('mouseleave', handleDragEnd);
        
        // Touch events for mobile/tablet
        testimonialSlider.addEventListener('touchstart', handleTouchStart, { passive: true });
        testimonialSlider.addEventListener('touchmove', handleTouchMove, { passive: true });
        testimonialSlider.addEventListener('touchend', handleTouchEnd);
        
        // Prevent text selection while dragging
        testimonialSlider.addEventListener('dragstart', (e) => e.preventDefault());
    }
    
    function handleDragStart(e) {
        isDragging = true;
        touchStartX = e.pageX;
        testimonialSlider.style.cursor = 'grabbing';
        stopAutoSlide();
    }
    
    function handleDragMove(e) {
        if (!isDragging) return;
        e.preventDefault();
    }
    
    function handleDragEnd(e) {
        if (!isDragging) return;
        isDragging = false;
        touchEndX = e.pageX;
        testimonialSlider.style.cursor = 'grab';
        handleSwipe();
        startAutoSlide();
    }
    
    function handleTouchStart(e) {
        touchStartX = e.touches[0].clientX;
        stopAutoSlide();
    }
    
    function handleTouchMove(e) {
        // Allow native scrolling
    }
    
    function handleTouchEnd(e) {
        touchEndX = e.changedTouches[0].clientX;
        handleSwipe();
        startAutoSlide();
    }
    
    function handleSwipe() {
        const swipeThreshold = 50; // minimum distance for swipe
        const diff = touchStartX - touchEndX;
        
        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                // Swiped left - show next
                nextTestimonial();
            } else {
                // Swiped right - show previous
                previousTestimonial();
            }
        }
    }
    
    function setupDotNavigation() {
        testimonialDots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                showTestimonial(index);
                stopAutoSlide();
                startAutoSlide();
            });
        });
    }
    
    function showTestimonial(index) {
        if (index < 0 || index >= totalTestimonials) return;
        
        currentTestimonial = index;
        
        // Slide to the correct position
        const slidePercentage = -index * 100;
        testimonialSlider.style.transform = `translateX(${slidePercentage}%)`;
        
        // Update dots
        testimonialDots.forEach((dot, i) => {
            if (i === index) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
        
        console.log(`📍 Showing testimonial ${index + 1} of ${totalTestimonials}`);
    }
    
    function nextTestimonial() {
        const next = (currentTestimonial + 1) % totalTestimonials;
        showTestimonial(next);
    }
    
    function previousTestimonial() {
        const prev = (currentTestimonial - 1 + totalTestimonials) % totalTestimonials;
        showTestimonial(prev);
    }
    
    function startAutoSlide() {
        stopAutoSlide();
        autoSlideInterval = setInterval(nextTestimonial, 6000);
        console.log('▶️ Auto-slide started');
    }
    
    function stopAutoSlide() {
        if (autoSlideInterval) {
            clearInterval(autoSlideInterval);
            autoSlideInterval = null;
            console.log('⏸️ Auto-slide stopped');
        }
    }
    
    // Pause on hover (desktop)
    function setupHoverPause() {
        if (testimonialSlider) {
            testimonialSlider.addEventListener('mouseenter', stopAutoSlide);
            testimonialSlider.addEventListener('mouseleave', startAutoSlide);
        }
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            init();
            setupHoverPause();
        });
    } else {
        init();
        setupHoverPause();
    }
    
    // Handle window resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            showTestimonial(currentTestimonial); // Re-position on resize
        }, 250);
    });
    
    // Expose functions globally for debugging
    window.testimonialsSlider = {
        next: nextTestimonial,
        previous: previousTestimonial,
        goto: showTestimonial,
        pause: stopAutoSlide,
        play: startAutoSlide
    };
    
})();
