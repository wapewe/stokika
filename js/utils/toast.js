/**
 * Beautiful Toast Notification System
 * Displays elegant, animated toast messages for errors, success, info, and warnings
 */

class Toast {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        // Create toast container if it doesn't exist
        if (!document.getElementById('toast-container')) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('toast-container');
        }
    }

    /**
     * Show a toast notification
     * @param {string} message - The message to display
     * @param {string} type - Type of toast: 'error', 'success', 'warning', 'info'
     * @param {number} duration - Duration in milliseconds (default: 5000)
     */
    show(message, type = 'info', duration = 5000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        // Get icon based on type
        const icon = this.getIcon(type);
        
        // Build toast HTML
        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-content">
                <div class="toast-message">${this.escapeHtml(message)}</div>
            </div>
            <button class="toast-close" aria-label="Close">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Add to container
        this.container.appendChild(toast);

        // Trigger animation
        setTimeout(() => {
            toast.classList.add('toast-show');
        }, 10);

        // Auto dismiss
        const timeoutId = setTimeout(() => {
            this.dismiss(toast);
        }, duration);

        // Manual dismiss
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            clearTimeout(timeoutId);
            this.dismiss(toast);
        });

        // Pause on hover
        toast.addEventListener('mouseenter', () => {
            clearTimeout(timeoutId);
        });

        toast.addEventListener('mouseleave', () => {
            setTimeout(() => {
                this.dismiss(toast);
            }, 2000);
        });
    }

    dismiss(toast) {
        toast.classList.remove('toast-show');
        toast.classList.add('toast-hide');
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    getIcon(type) {
        const icons = {
            error: '<i class="fas fa-exclamation-circle"></i>',
            success: '<i class="fas fa-check-circle"></i>',
            warning: '<i class="fas fa-exclamation-triangle"></i>',
            info: '<i class="fas fa-info-circle"></i>'
        };
        return icons[type] || icons.info;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Convenience methods
    error(message, duration) {
        this.show(message, 'error', duration);
    }

    success(message, duration) {
        this.show(message, 'success', duration);
    }

    warning(message, duration) {
        this.show(message, 'warning', duration);
    }

    info(message, duration) {
        this.show(message, 'info', duration);
    }
}

// Create global toast instance
window.toast = new Toast();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Toast;
}
