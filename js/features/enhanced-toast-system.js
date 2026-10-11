// Enhanced Toast Notification System for Stokika
// CSP-compliant, no inline styles, works without external dependencies

class EnhancedToastSystem {
    constructor() {
        this.toasts = [];
        this.maxToasts = 5;
        this.defaultDuration = 5000;
        this.container = null;
        
        // Wait for DOM to be ready before initializing
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        this.createContainer();
        console.log('✅ Enhanced Toast System initialized');
    }

    createContainer() {
        if (this.container) return;

        // Double-check body exists
        if (!document.body) {
            console.warn('⚠️ document.body not ready, retrying in 100ms');
            setTimeout(() => this.createContainer(), 100);
            return;
        }

        this.container = document.createElement('div');
        this.container.id = 'toast-container';
        this.container.className = 'toast-container';
        this.container.setAttribute('role', 'region');
        this.container.setAttribute('aria-label', 'Notifications');
        this.container.setAttribute('aria-live', 'polite');

        document.body.appendChild(this.container);
    }

    /**
     * Show a toast notification
     * @param {string} message - The message to display
     * @param {string} type - Type of toast: 'success', 'error', 'warning', 'info'
     * @param {number} duration - Duration in ms (0 for persistent)
     * @param {object} options - Additional options {title, actions, dismissible}
     */
    show(message, type = 'info', duration = this.defaultDuration, options = {}) {
        // Ensure container exists
        if (!this.container) {
            console.warn('⚠️ Toast container not ready, queueing toast');
            setTimeout(() => this.show(message, type, duration, options), 100);
            return null;
        }

        // Remove oldest toast if at max capacity
        if (this.toasts.length >= this.maxToasts) {
            this.dismissOldest();
        }

        const toast = this.createToast(message, type, duration, options);
        this.toasts.push(toast);
        this.container.appendChild(toast.element);

        // Trigger animation
        setTimeout(() => {
            toast.element.classList.add('show');
        }, 10);

        // Auto dismiss if duration is set
        if (duration > 0) {
            toast.timeoutId = setTimeout(() => {
                this.dismiss(toast.id);
            }, duration);
        }

        return toast.id;
    }

    createToast(message, type, duration, options) {
        const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const toast = document.createElement('div');
        toast.id = id;
        toast.className = `toast toast-${type}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-atomic', 'true');

        // Toast content structure
        const iconHTML = this.getIcon(type);
        const title = options.title ? `<div class="toast-title">${this.escapeHtml(options.title)}</div>` : '';
        const isDismissible = options.dismissible !== false;

        toast.innerHTML = `
            <div class="toast-icon">${iconHTML}</div>
            <div class="toast-content">
                ${title}
                <div class="toast-message">${this.escapeHtml(message)}</div>
                ${options.actions ? this.createActions(options.actions) : ''}
            </div>
            ${isDismissible ? '<button class="toast-close" aria-label="Close notification">&times;</button>' : ''}
            ${duration > 0 ? '<div class="toast-progress"></div>' : ''}
        `;

        // Add progress bar animation
        if (duration > 0) {
            const progressBar = toast.querySelector('.toast-progress');
            if (progressBar) {
                progressBar.style.animationDuration = `${duration}ms`;
            }
        }

        // Close button handler
        if (isDismissible) {
            const closeBtn = toast.querySelector('.toast-close');
            closeBtn.addEventListener('click', () => {
                this.dismiss(id);
            });
        }

        // Action button handlers
        if (options.actions) {
            const actionButtons = toast.querySelectorAll('.toast-action-btn');
            actionButtons.forEach((btn, index) => {
                btn.addEventListener('click', () => {
                    if (options.actions[index].onClick) {
                        options.actions[index].onClick();
                    }
                    if (options.actions[index].dismiss !== false) {
                        this.dismiss(id);
                    }
                });
            });
        }

        return {
            id,
            element: toast,
            type,
            message,
            timeoutId: null
        };
    }

    createActions(actions) {
        if (!actions || actions.length === 0) return '';

        return `
            <div class="toast-actions">
                ${actions.map(action => `
                    <button class="toast-action-btn" type="button">
                        ${this.escapeHtml(action.label)}
                    </button>
                `).join('')}
            </div>
        `;
    }

    getIcon(type) {
        const icons = {
            success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>',
            error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
            warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
            info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
        };
        return icons[type] || icons.info;
    }

    dismiss(toastId) {
        const toastObj = this.toasts.find(t => t.id === toastId);
        if (!toastObj) return;

        // Clear timeout if exists
        if (toastObj.timeoutId) {
            clearTimeout(toastObj.timeoutId);
        }

        // Animate out
        toastObj.element.classList.remove('show');
        toastObj.element.classList.add('hide');

        // Remove from DOM and array after animation
        setTimeout(() => {
            if (toastObj.element && toastObj.element.parentNode) {
                toastObj.element.parentNode.removeChild(toastObj.element);
            }
            this.toasts = this.toasts.filter(t => t.id !== toastId);
        }, 300);
    }

    dismissOldest() {
        if (this.toasts.length > 0) {
            this.dismiss(this.toasts[0].id);
        }
    }

    dismissAll() {
        const toastIds = this.toasts.map(t => t.id);
        toastIds.forEach(id => this.dismiss(id));
    }

    // Convenience methods for different toast types
    success(message, options = {}) {
        return this.show(message, 'success', options.duration || this.defaultDuration, options);
    }

    error(message, options = {}) {
        return this.show(message, 'error', options.duration || 0, options); // Errors persist by default
    }

    warning(message, options = {}) {
        return this.show(message, 'warning', options.duration || this.defaultDuration, options);
    }

    info(message, options = {}) {
        return this.show(message, 'info', options.duration || this.defaultDuration, options);
    }

    // Form validation helper
    formSuccess(message = 'Form submitted successfully!') {
        return this.success(message, {
            title: 'Success'
        });
    }

    formError(message = 'Please fix the errors and try again') {
        return this.error(message, {
            title: 'Validation Error',
            dismissible: true
        });
    }

    // Async operation helper
    async promise(promise, messages = {}) {
        const loadingId = this.info(messages.loading || 'Processing...', {
            duration: 0,
            dismissible: false
        });

        try {
            const result = await promise;
            this.dismiss(loadingId);
            this.success(messages.success || 'Operation completed successfully!');
            return result;
        } catch (error) {
            this.dismiss(loadingId);
            this.error(messages.error || error.message || 'Operation failed');
            throw error;
        }
    }

    // Utility: Escape HTML to prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the toast system and make it globally available
window.Toast = new EnhancedToastSystem();

// Also expose as EnhancedToast for backward compatibility
window.EnhancedToast = window.Toast;
