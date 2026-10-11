// Help & Support System
class HelpSupportManager {
    constructor() {
        this.isOpen = false;
        this.currentSection = 'help';
        this.init();
    }

    init() {
        this.createHelpWidget();
        this.loadHelpContent();
        this.addHelpCSS();
    }

    createHelpWidget() {
        const helpHTML = `
            <div class="help-widget" id="helpWidget">
                <button class="help-toggle" id="helpToggle">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    <span>Help</span>
                </button>
                
                <div class="help-panel" id="helpPanel">
                    <div class="help-header">
                        <h3>Help & Support</h3>
                        <button class="help-close" id="helpClose">&times;</button>
                    </div>
                    
                    <div class="help-tabs">
                        <button class="help-tab active" data-section="help">Help</button>
                        <button class="help-tab" data-section="faq">FAQ</button>
                        <button class="help-tab" data-section="chat">Chat</button>
                        <button class="help-tab" data-section="contact">Contact</button>
                    </div>
                    
                    <div class="help-content" id="helpContent">
                        <!-- Dynamic content will be loaded here -->
                    </div>
                </div>
            </div>
        `;

        if (document.body) {
            document.body.insertAdjacentHTML('beforeend', helpHTML);
            this.setupEventListeners();
        }
    }

    setupEventListeners() {
        document.getElementById('helpToggle')?.addEventListener('click', () => {
            this.toggleHelp();
        });

        document.getElementById('helpClose')?.addEventListener('click', () => {
            this.closeHelp();
        });

        document.querySelectorAll('.help-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchSection(e.target.dataset.section);
            });
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.help-widget') && this.isOpen) {
                this.closeHelp();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F1') {
                e.preventDefault();
                this.toggleHelp();
            }
            if (e.key === 'Escape' && this.isOpen) {
                this.closeHelp();
            }
        });
    }

    toggleHelp() {
        if (this.isOpen) {
            this.closeHelp();
        } else {
            this.openHelp();
        }
    }

    openHelp() {
        this.isOpen = true;
        document.getElementById('helpPanel').classList.add('open');
        this.loadContent(this.currentSection);
    }

    closeHelp() {
        this.isOpen = false;
        document.getElementById('helpPanel').classList.remove('open');
    }

    switchSection(section) {
        this.currentSection = section;
        
        // Update active tab
        document.querySelectorAll('.help-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.section === section);
        });
        
        this.loadContent(section);
    }

    loadContent(section) {
        const contentContainer = document.getElementById('helpContent');
        
        switch (section) {
            case 'help':
                contentContainer.innerHTML = this.getHelpContent();
                break;
            case 'faq':
                contentContainer.innerHTML = this.getFAQContent();
                break;
            case 'chat':
                contentContainer.innerHTML = this.getChatContent();
                this.initializeChat();
                break;
            case 'contact':
                contentContainer.innerHTML = this.getContactContent();
                this.setupContactForm();
                break;
        }
    }

    getHelpContent() {
        const userRole = AuthManager?.currentUser?.role || 'user';
        
        const helpSections = {
            admin: [
                {
                    title: 'User Management',
                    items: [
                        'Creating new user accounts',
                        'Managing user permissions',
                        'Activating/deactivating users',
                        'Role assignments'
                    ]
                },
                {
                    title: 'Order Management',
                    items: [
                        'Processing orders',
                        'Approving payments',
                        'Managing suppliers',
                        'Handling disputes'
                    ]
                },
                {
                    title: 'Analytics & Reports',
                    items: [
                        'Viewing dashboard analytics',
                        'Exporting reports',
                        'Understanding metrics',
                        'Custom date ranges'
                    ]
                }
            ],
            vendor: [
                {
                    title: 'Getting Started',
                    items: [
                        'Setting up your profile',
                        'Understanding credit limits',
                        'Finding suppliers',
                        'Placing your first order'
                    ]
                },
                {
                    title: 'Order Management',
                    items: [
                        'Creating orders',
                        'Tracking deliveries',
                        'Managing payments',
                        'Reordering products'
                    ]
                },
                {
                    title: 'Payments & Credit',
                    items: [
                        'Understanding payment cycles',
                        'Making payments via M-Pesa',
                        'Building credit history',
                        'Requesting credit increases'
                    ]
                }
            ],
            supplier: [
                {
                    title: 'Getting Started',
                    items: [
                        'Setting up your company profile',
                        'Adding products to catalog',
                        'Setting pricing',
                        'Managing inventory'
                    ]
                },
                {
                    title: 'Order Processing',
                    items: [
                        'Receiving orders',
                        'Accepting/declining orders',
                        'Managing deliveries',
                        'Updating order status'
                    ]
                },
                {
                    title: 'Payments & Analytics',
                    items: [
                        'Tracking payments',
                        'Viewing sales analytics',
                        'Managing customer relationships',
                        'Performance metrics'
                    ]
                }
            ]
        };

        const sections = helpSections[userRole] || helpSections.vendor;
        
        return `
            <div class="help-sections">
                <div class="help-intro">
                    <h4>Welcome to Stokika Help</h4>
                    <p>Find answers to common questions and learn how to use the platform effectively.</p>
                </div>
                
                ${sections.map(section => `
                    <div class="help-section">
                        <h5>${section.title}</h5>
                        <ul>
                            ${section.items.map(item => `
                                <li><a href="#" onclick="HelpSupportManager.showHelpTopic('${item}')">${item}</a></li>
                            `).join('')}
                        </ul>
                    </div>
                `).join('')}
                
                <div class="help-section">
                    <h5>Video Tutorials</h5>
                    <div class="video-tutorials">
                        <div class="video-item" onclick="HelpSupportManager.playVideo('getting-started')">
                            <div class="video-thumbnail">📹</div>
                            <div class="video-info">
                                <div class="video-title">Getting Started with Stokika</div>
                                <div class="video-duration">5:30</div>
                            </div>
                        </div>
                        <div class="video-item" onclick="HelpSupportManager.playVideo('placing-orders')">
                            <div class="video-thumbnail">📹</div>
                            <div class="video-info">
                                <div class="video-title">How to Place Orders</div>
                                <div class="video-duration">3:45</div>
                            </div>
                        </div>
                        <div class="video-item" onclick="HelpSupportManager.playVideo('managing-payments')">
                            <div class="video-thumbnail">📹</div>
                            <div class="video-info">
                                <div class="video-title">Managing Payments</div>
                                <div class="video-duration">4:20</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="help-shortcuts">
                    <h5>Keyboard Shortcuts</h5>
                    <div class="shortcut-list">
                        <div class="shortcut-item">
                            <kbd>F1</kbd>
                            <span>Open/Close Help</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>Ctrl</kbd> + <kbd>S</kbd>
                            <span>Save Current Form</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>Ctrl</kbd> + <kbd>E</kbd>
                            <span>Export Data</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>Esc</kbd>
                            <span>Close Modals/Panels</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getFAQContent() {
        const faqs = [
            {
                category: 'General',
                questions: [
                    {
                        q: 'What is Stokika?',
                        a: 'Stokika is a stock financing platform that helps small businesses access inventory without upfront cash payments. We connect vendors with suppliers and provide flexible payment terms.'
                    },
                    {
                        q: 'How does the payment system work?',
                        a: 'You receive stock upfront and pay later based on your business cycle (daily, weekly, fortnightly, or monthly). Service fees range from 5-20% depending on your business maturity and cycle.'
                    },
                    {
                        q: 'What are the requirements to join?',
                        a: 'You need a valid business, phone number, email, and basic business information. We verify all applications within 24 hours.'
                    }
                ]
            },
            {
                category: 'Orders & Payments',
                questions: [
                    {
                        q: 'How do I place an order?',
                        a: 'Navigate to the suppliers section, browse products, select items, and submit your order. Your field agent can also help you place orders.'
                    },
                    {
                        q: 'When do I need to pay?',
                        a: 'Payment is due based on your selected cycle. You\'ll receive reminders before the due date via SMS and email.'
                    },
                    {
                        q: 'What payment methods are accepted?',
                        a: 'We accept M-Pesa, bank transfers, and cash payments through our field agents.'
                    }
                ]
            },
            {
                category: 'Technical Support',
                questions: [
                    {
                        q: 'I forgot my password. How do I reset it?',
                        a: 'Contact your administrator to reset your password. Only admins can create and manage user accounts for security reasons.'
                    },
                    {
                        q: 'The website is not loading properly',
                        a: 'Try refreshing the page, clearing your browser cache, or using a different browser. Contact support if the issue persists.'
                    },
                    {
                        q: 'How do I update my profile information?',
                        a: 'Go to your dashboard settings and update your information. Some changes may require admin approval.'
                    }
                ]
            }
        ];

        return `
            <div class="faq-content">
                <div class="faq-search">
                    <input type="text" id="faqSearch" placeholder="Search FAQ..." />
                </div>
                
                ${faqs.map(category => `
                    <div class="faq-category">
                        <h4>${category.category}</h4>
                        ${category.questions.map((faq, index) => `
                            <div class="faq-item">
                                <div class="faq-question" onclick="HelpSupportManager.toggleFAQ(${index})">
                                    <span>${faq.q}</span>
                                    <span class="faq-toggle">+</span>
                                </div>
                                <div class="faq-answer" id="faq-${index}">
                                    ${faq.a}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `).join('')}
                
                <div class="faq-footer">
                    <p>Can't find what you're looking for? <a href="#" onclick="HelpSupportManager.switchSection('contact')">Contact us</a></p>
                </div>
            </div>
        `;
    }

    getChatContent() {
        return `
            <div class="chat-container">
                <div class="chat-header">
                    <div class="chat-status">
                        <span class="status-indicator online"></span>
                        <span>Support Team</span>
                    </div>
                </div>
                
                <div class="chat-messages" id="chatMessages">
                    <div class="chat-message bot">
                        <div class="message-avatar">🤖</div>
                        <div class="message-content">
                            <div class="message-text">Hello! I'm here to help you with any questions about Stokika. How can I assist you today?</div>
                            <div class="message-time">${new Date().toLocaleTimeString()}</div>
                        </div>
                    </div>
                </div>
                
                <div class="chat-quick-actions">
                    <button onclick="HelpSupportManager.sendQuickMessage('How do I place an order?')">How to place orders?</button>
                    <button onclick="HelpSupportManager.sendQuickMessage('Payment issues')">Payment issues</button>
                    <button onclick="HelpSupportManager.sendQuickMessage('Technical support')">Technical support</button>
                </div>
                
                <div class="chat-input-container">
                    <input type="text" id="chatInput" placeholder="Type your message..." />
                    <button id="sendMessage">Send</button>
                </div>
            </div>
        `;
    }

    getContactContent() {
        return `
            <div class="contact-content">
                <div class="contact-info">
                    <h4>Get in Touch</h4>
                    <p>Our support team is here to help you succeed with Stokika.</p>
                    
                    <div class="contact-methods">
                        <div class="contact-method">
                            <div class="contact-icon">📞</div>
                            <div class="contact-details">
                                <div class="contact-label">Phone</div>
                                <div class="contact-value">+254 700 123 456</div>
                                <div class="contact-hours">Mon-Fri 8AM-6PM EAT</div>
                            </div>
                        </div>
                        
                        <div class="contact-method">
                            <div class="contact-icon">📧</div>
                            <div class="contact-details">
                                <div class="contact-label">Email</div>
                                <div class="contact-value">support@stokika.com</div>
                                <div class="contact-hours">24/7 support</div>
                            </div>
                        </div>
                        
                        <div class="contact-method">
                            <div class="contact-icon">💬</div>
                            <div class="contact-details">
                                <div class="contact-label">WhatsApp</div>
                                <div class="contact-value">+254 700 123 456</div>
                                <div class="contact-hours">Quick responses</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <form class="support-form" id="supportForm">
                    <h4>Send us a Message</h4>
                    
                    <div class="form-group">
                        <label>Subject</label>
                        <select name="subject" required>
                            <option value="">Select a topic</option>
                            <option value="technical">Technical Issue</option>
                            <option value="payment">Payment Problem</option>
                            <option value="order">Order Issue</option>
                            <option value="account">Account Problem</option>
                            <option value="feature">Feature Request</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Priority</label>
                        <select name="priority" required>
                            <option value="low">Low</option>
                            <option value="medium" selected>Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Message</label>
                        <textarea name="message" rows="5" placeholder="Describe your issue or question in detail..." required></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label>
                            <input type="checkbox" name="screenshot" />
                            I can provide screenshots if needed
                        </label>
                    </div>
                    
                    <button type="submit">Send Message</button>
                </form>
            </div>
        `;
    }

    initializeChat() {
        const chatInput = document.getElementById('chatInput');
        const sendButton = document.getElementById('sendMessage');
        
        const sendMessage = () => {
            const message = chatInput?.value.trim();
            if (message) {
                this.addChatMessage(message, 'user');
                chatInput.value = '';
                
                // Simulate bot response
                setTimeout(() => {
                    this.handleBotResponse(message);
                }, 1000);
            }
        };
        
        sendButton?.addEventListener('click', sendMessage);
        chatInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }

    addChatMessage(text, sender) {
        const messagesContainer = document.getElementById('chatMessages');
        const escapeHtml = (str) => {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        };
        
        const messageHTML = `
            <div class="chat-message ${sender}">
                <div class="message-avatar">${sender === 'user' ? '👤' : '🤖'}</div>
                <div class="message-content">
                    <div class="message-text">${escapeHtml(text)}</div>
                    <div class="message-time">${new Date().toLocaleTimeString()}</div>
                </div>
            </div>
        `;
        
        messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    handleBotResponse(userMessage) {
        const responses = {
            'order': 'To place an order, go to the Suppliers section, browse products, and click "Add to Cart". Your field agent can also help you place orders.',
            'payment': 'Payments are due based on your cycle (daily/weekly/monthly). You can pay via M-Pesa, bank transfer, or through your field agent.',
            'technical': 'For technical issues, try refreshing the page or clearing your browser cache. If the problem persists, I can connect you with our technical team.',
            'account': 'Account issues can be resolved by contacting your administrator or our support team directly.',
            'default': 'I understand you need help. Let me connect you with a human agent who can better assist you with your specific question.'
        };
        
        let response = responses.default;
        const lowerMessage = userMessage.toLowerCase();
        
        for (const [key, value] of Object.entries(responses)) {
            if (lowerMessage.includes(key)) {
                response = value;
                break;
            }
        }
        
        this.addChatMessage(response, 'bot');
    }

    sendQuickMessage(message) {
        this.addChatMessage(message, 'user');
        setTimeout(() => {
            this.handleBotResponse(message);
        }, 500);
    }

    setupContactForm() {
        const form = document.getElementById('supportForm');
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            
            try {
                // In a real implementation, this would send to your support system
                console.log('Support request:', data);
                
                // Show success message
                alert('Your message has been sent! We\'ll get back to you within 24 hours.');
                form.reset();
                
                // Log the support request
                if (window.ActivityLogger) {
                    ActivityLogger.logActivity('support_request', 'support', null, null, data);
                }
                
            } catch (error) {
                alert('Failed to send message. Please try again or contact us directly.');
            }
        });
    }

    // Public methods for external use
    showHelpTopic(topic) {
        // In a real implementation, this would show detailed help for the topic
        alert(`Help topic: ${topic}\n\nDetailed help content would be shown here.`);
    }

    playVideo(videoId) {
        // In a real implementation, this would open a video player
        alert(`Playing video: ${videoId}\n\nVideo player would open here.`);
    }

    toggleFAQ(index) {
        const answer = document.getElementById(`faq-${index}`);
        const toggle = answer?.previousElementSibling.querySelector('.faq-toggle');
        
        if (answer) {
            const isOpen = answer.style.display === 'block';
            answer.style.display = isOpen ? 'none' : 'block';
            if (toggle) toggle.textContent = isOpen ? '+' : '-';
        }
    }

    loadHelpContent() {
        // Load any additional help content or initialize help system
        console.log('Help system initialized');
    }

    addHelpCSS() {
        // Styles are now loaded from external CSS file (help-support.css)
        // This prevents CSP violations
        return;
    }
}

/* DISABLED - Integrated into contact section instead
// Initialize help & support manager when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.HelpSupportManager = new HelpSupportManager();
    });
} else {
    window.HelpSupportManager = new HelpSupportManager();
}
*/


