// Enhanced Contact Section with 3 Tabs: Contacts, Send Message, FAQ
(function() {
    'use strict';
    
    function initContactTabs() {
        const contactGrid = document.querySelector('#contact .contact-grid');
        if (!contactGrid) return;
        
        // Add tabs container before the contact grid
        const tabsHTML = `
            <div class="contact-tabs">
                <button class="contact-tab active" data-tab="contacts">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                    Contacts
                </button>
                <button class="contact-tab" data-tab="message">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    Send Message
                </button>
                <button class="contact-tab" data-tab="faq">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    FAQ
                </button>
            </div>
        `;
        
        contactGrid.insertAdjacentHTML('beforebegin', tabsHTML);
        
        // Get existing elements
        const formContainer = document.querySelector('.contact-form-container');
        const contactInfo = document.querySelector('.contact-info');
        
        // Mark form as message tab content
        formContainer.setAttribute('data-tab-content', 'message');
        formContainer.classList.remove('active'); // Start hidden
        
        // Mark contact info as contacts tab content
        contactInfo.setAttribute('data-tab-content', 'contacts');
        contactInfo.classList.add('active'); // Start visible (default tab)
        
        // Create FAQ content
        const faqHTML = `
            <div class="contact-tab-content" data-tab-content="faq">
                <h3>Frequently Asked Questions</h3>
                <p>Find quick answers to common questions about stokika</p>
                
                <div class="faq-category">
                    <div class="faq-item">
                        <div class="faq-question" data-faq="0">
                            How do I get started with stokika?
                            <span class="faq-toggle">+</span>
                        </div>
                        <div class="faq-answer" id="faq-0">
                            Getting started is easy! Click the "Get Started" button, choose whether you're a vendor or supplier, fill out the registration form, and our team will verify your account within 24 hours.
                        </div>
                    </div>
                    
                    <div class="faq-item">
                        <div class="faq-question" data-faq="1">
                            What are the interest rates?
                            <span class="faq-toggle">+</span>
                        </div>
                        <div class="faq-answer" id="faq-1">
                            Our rates range from 5% to 15% depending on your business size and repayment cycle. Aspiring entrepreneurs start at 15%, established businesses get as low as 5%.
                        </div>
                    </div>
                    
                    <div class="faq-item">
                        <div class="faq-question" data-faq="2">
                            How long does approval take?
                            <span class="faq-toggle">+</span>
                        </div>
                        <div class="faq-answer" id="faq-2">
                            Account verification takes 24 hours. Once verified, stock requests are typically approved within 2-4 hours during business hours.
                        </div>
                    </div>
                    
                    <div class="faq-item">
                        <div class="faq-question" data-faq="3">
                            Can I choose my own supplier?
                            <span class="faq-toggle">+</span>
                        </div>
                        <div class="faq-answer" id="faq-3">
                            Yes! You can either browse our network of 500+ verified suppliers or nominate your preferred supplier for verification.
                        </div>
                    </div>
                    
                    <div class="faq-item">
                        <div class="faq-question" data-faq="4">
                            What counties do you cover?
                            <span class="faq-toggle">+</span>
                        </div>
                        <div class="faq-answer" id="faq-4">
                            We currently operate in all 47 counties across Kenya with plans to expand to other African countries soon.
                        </div>
                    </div>
                    
                    <div class="faq-item">
                        <div class="faq-question" data-faq="5">
                            Is there a registration fee?
                            <span class="faq-toggle">+</span>
                        </div>
                        <div class="faq-answer" id="faq-5">
                            Suppliers register for free. Vendors pay a one-time registration fee based on business size, starting from KES 500 for aspiring entrepreneurs.
                        </div>
                    </div>
                </div>
                
                <div class="faq-footer">
                    <p>Still have questions? <a href="tel:+254728011976">Call us</a> or <a href="https://wa.me/254728011976" target="_blank">WhatsApp +254 728 011 976</a></p>
                </div>
            </div>
        `;
        
        // Insert FAQ content in the contact grid
        contactGrid.insertAdjacentHTML('beforeend', faqHTML);
        
        // Tab switching logic
        const tabs = document.querySelectorAll('.contact-tab');
        const tabContents = document.querySelectorAll('[data-tab-content]');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.getAttribute('data-tab');
                
                // Remove active class from all tabs and ALL tab contents
                tabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                
                // Add active class to clicked tab
                tab.classList.add('active');
                
                // Show only the corresponding content
                const targetContent = document.querySelector(`[data-tab-content="${targetTab}"]`);
                if (targetContent) {
                    targetContent.classList.add('active');
                }
            });
        });
        
        // FAQ Toggle Functionality - Use event delegation
        document.addEventListener('click', function(e) {
            const faqQuestion = e.target.closest('.faq-question');
            if (!faqQuestion) return;
            
            const faqIndex = faqQuestion.getAttribute('data-faq');
            const answer = document.getElementById(`faq-${faqIndex}`);
            const toggle = faqQuestion.querySelector('.faq-toggle');
            
            if (answer && toggle) {
                const isOpen = answer.style.display === 'block';
                answer.style.display = isOpen ? 'none' : 'block';
                toggle.textContent = isOpen ? '+' : '-';
            }
        });
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initContactTabs);
    } else {
        initContactTabs();
    }
})();
