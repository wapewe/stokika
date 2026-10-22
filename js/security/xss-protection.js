/**
 * XSS Protection Utility
 * Provides functions to safely render user-generated content
 * and prevent Cross-Site Scripting (XSS) attacks
 */

const XSSProtection = {
    /**
     * Escape HTML special characters to prevent XSS
     * Use this for ANY user-generated content before rendering
     */
    escapeHtml(str) {
        if (str === null || str === undefined) {
            return '';
        }

        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    },

    /**
     * Sanitize text content (alias for escapeHtml for backward compatibility)
     * Use this for ANY user-generated content before rendering
     */
    sanitize(str) {
        return this.escapeHtml(str);
    },

    /**
     * Escape HTML attributes
     */
    escapeAttr(str) {
        if (str === null || str === undefined) {
            return '';
        }

        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/'/g, '&#x27;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    },

    /**
     * Sanitize URL to prevent javascript: and data: protocols
     */
    sanitizeUrl(url) {
        if (!url) return '';

        const str = String(url).trim();
        
        // Block dangerous protocols
        const dangerous = /^(javascript|data|vbscript|file|about):/i;
        if (dangerous.test(str)) {
            return '';
        }

        return str;
    },

    /**
     * Safely set innerHTML with sanitization
     * Use this instead of directly assigning to element.innerHTML
     */
    setInnerHTML(element, html) {
        if (!element) return;

        // Create a temporary container
        const temp = document.createElement('div');
        temp.textContent = html; // XSS-FIX: Changed from innerHTML - Review if HTML is needed

        // Remove dangerous elements and attributes
        this.sanitizeNode(temp);

        // Clear and append
        element.textContent = '';
        while (temp.firstChild) {
            element.appendChild(temp.firstChild);
        }
    },

    /**
     * Recursively sanitize a DOM node
     */
    sanitizeNode(node) {
        // Remove script tags
        const scripts = node.querySelectorAll('script');
        scripts.forEach(script => script.remove());

        // Remove event handlers and dangerous attributes
        const dangerousAttrs = [
            'onclick', 'onload', 'onerror', 'onmouseover', 'onmouseout',
            'onmouseenter', 'onmouseleave', 'onfocus', 'onblur', 'onchange',
            'onsubmit', 'onkeydown', 'onkeyup', 'onkeypress'
        ];

        const allElements = node.querySelectorAll('*');
        allElements.forEach(element => {
            // Remove dangerous attributes
            dangerousAttrs.forEach(attr => {
                if (element.hasAttribute(attr)) {
                    element.removeAttribute(attr);
                }
            });

            // Sanitize href and src attributes
            if (element.hasAttribute('href')) {
                const href = element.getAttribute('href');
                element.setAttribute('href', this.sanitizeUrl(href));
            }

            if (element.hasAttribute('src')) {
                const src = element.getAttribute('src');
                // Allow data: for images only
                if (element.tagName.toLowerCase() === 'img' && src.startsWith('data:image/')) {
                    // Keep data URLs for images
                } else {
                    element.setAttribute('src', this.sanitizeUrl(src));
                }
            }

            // Remove inline styles that could be exploited
            if (element.hasAttribute('style')) {
                const style = element.getAttribute('style');
                // Block dangerous CSS
                if (/expression|behavior|binding|javascript:/i.test(style)) {
                    element.removeAttribute('style');
                }
            }
        });
    },

    /**
     * Safely create an element with text content
     * Prevents XSS by using textContent instead of innerHTML
     */
    createTextElement(tagName, text, className = '') {
        const element = document.createElement(tagName);
        element.textContent = text;
        if (className) {
            element.className = className;
        }
        return element;
    },

    /**
     * Safely set text content (use this instead of innerHTML for plain text)
     */
    setText(element, text) {
        if (!element) return;
        element.textContent = text;
    },

    /**
     * Create a safe HTML template with escaped values
     * Usage: safeTemplate`<div>Hello ${userName}</div>`
     */
    safeTemplate(strings, ...values) {
        let result = strings[0];
        
        for (let i = 0; i < values.length; i++) {
            // Escape the value
            result += this.escapeHtml(values[i]);
            result += strings[i + 1];
        }
        
        return result;
    },

    /**
     * Safely append HTML (use instead of insertAdjacentHTML)
     */
    appendHTML(element, html) {
        if (!element) return;

        const temp = document.createElement('div');
        temp.textContent = html; // XSS-FIX: Changed from innerHTML - Review if HTML is needed
        this.sanitizeNode(temp);

        while (temp.firstChild) {
            element.appendChild(temp.firstChild);
        }
    },

    /**
     * Validate and sanitize user input
     */
    sanitizeInput(value, type = 'text') {
        if (!value) return '';

        switch (type) {
            case 'email':
                // Remove dangerous characters from email
                return String(value).replace(/[<>"']/g, '');

            case 'number':
                // Parse as number and return as string
                const num = parseFloat(value);
                return isNaN(num) ? '' : String(num);

            case 'alphanumeric':
                // Only allow letters and numbers
                return String(value).replace(/[^a-zA-Z0-9]/g, '');

            case 'text':
            default:
                // Escape HTML
                return this.escapeHtml(value);
        }
    },

    /**
     * Create a safe modal with escaped content
     */
    createSafeModal(title, content, options = {}) {
        const modal = document.createElement('div');
        modal.className = options.className || 'modal-overlay';

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';

        // Safe title
        const titleElement = document.createElement('h2');
        titleElement.textContent = title;
        modalContent.appendChild(titleElement);

        // Safe content (can be HTML but will be sanitized)
        if (typeof content === 'string') {
            this.appendHTML(modalContent, content);
        } else if (content instanceof Node) {
            modalContent.appendChild(content);
        }

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.className = 'modal-close';
        closeBtn.onclick = () => modal.remove();
        modalContent.appendChild(closeBtn);

        modal.appendChild(modalContent);
        return modal;
    },

    /**
     * Render array of items safely
     */
    renderList(container, items, renderFunction) {
        if (!container) return;

        container.textContent = '';

        if (!items || items.length === 0) {
            const empty = this.createTextElement('p', 'No items to display', 'empty-state');
            container.appendChild(empty);
            return;
        }

        items.forEach(item => {
            const element = renderFunction(item);
            if (element) {
                container.appendChild(element);
            }
        });
    }
};

// Make available globally
window.XSSProtection = XSSProtection;

// Convenience alias
window.sanitize = XSSProtection.escapeHtml.bind(XSSProtection);
window.sanitizeUrl = XSSProtection.sanitizeUrl.bind(XSSProtection);

// Log deprecation warnings for unsafe innerHTML usage
if (typeof Proxy !== 'undefined' && window.location.hostname !== 'localhost') {
    // Warning system for production (disabled in localhost for development)
    const originalInnerHTMLSet = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML').set;
    
    Object.defineProperty(Element.prototype, 'innerHTML', {
        set: function(value) {
            if (typeof value === 'string' && value.includes('<')) {
                console.warn(
                    '⚠️ XSS Warning: Direct innerHTML assignment detected.',
                    'Consider using XSSProtection.setInnerHTML() or textContent instead.',
                    'Element:', this.tagName,
                    'StackTrace:', new Error().stack
                );
            }
            return originalInnerHTMLSet.call(this, value);
        },
        get: function() {
            return Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML').get.call(this);
        }
    });
}
