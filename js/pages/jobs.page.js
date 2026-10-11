/**
 * Jobs Page Module
 * Handles the careers/jobs listing page functionality
 */

// Module initialization
document.addEventListener('DOMContentLoaded', function() {
    console.log('[Jobs Page] Initializing...');
    
    // Initialize page components
    initJobCards();
    
    console.log('[Jobs Page] Initialization complete');
});

/**
 * Initialize job card interactions
 */
function initJobCards() {
    const jobCards = document.querySelectorAll('.job-card');
    
    if (!jobCards.length) {
        console.log('[Jobs Page] No job cards found');
        return;
    }
    
    console.log(`[Jobs Page] Found ${jobCards.length} job card(s)`);
    
    // Add smooth scroll to apply buttons if needed
    const applyButtons = document.querySelectorAll('.btn-apply');
    applyButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            console.log('[Jobs Page] Apply button clicked:', this.href);
        });
    });
}

/**
 * Future enhancements can be added here:
 * - Dynamic job loading from Supabase
 * - Job filtering/search functionality
 * - Application tracking
 */
