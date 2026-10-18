/**
 * Enhanced M-Pesa Payment UI with Timeout Handling
 * Section 6: Tasks 6.1-6.8
 * 
 * SECURITY PRINCIPLES:
 * 1. All payment validations happen server-side
 * 2. Client only displays UI and polls status
 * 3. No payment amounts or sensitive data stored in client
 * 4. All API calls go through secure Edge Functions
 * 5. CSRF protection via Supabase Auth tokens
 * 6. Input sanitization for all user inputs
 */

class MpesaPaymentUI {
  /**
   * Task 6.1: Initialize payment UI
   * 
   * SECURITY: No sensitive data in constructor, all config fetched from server
   */
  constructor(containerElement, options = {}) {
    // Validate container exists
    if (!containerElement) {
      throw new Error('Container element is required');
    }

    this.container = containerElement;
    this.supabase = options.supabaseClient;
    
    if (!this.supabase) {
      throw new Error('Supabase client is required');
    }

    // Callbacks for parent integration
    this.onSuccess = options.onSuccess || (() => {});
    this.onError = options.onError || (() => {});
    this.onCancel = options.onCancel || (() => {});

    // State management (only UI state, no sensitive data)
    this.currentPayment = null;
    this.pollInterval = null;
    this.timeoutConfig = null;
    this.startTime = null;
    this.destroyed = false;

    // Security: Bind methods to prevent 'this' hijacking
    this.destroy = this.destroy.bind(this);
    this.initiatePayment = this.initiatePayment.bind(this);
    this.checkPaymentStatus = this.checkPaymentStatus.bind(this);
  }

  /**
   * Task 6.1: Cleanup method
   */
  destroy() {
    this.destroyed = true;
    
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    this.currentPayment = null;
    this.container.innerHTML = '';
  }

  /**
   * Task 6.2: Initiate payment with timeout awareness
   * 
   * SECURITY: All validation happens server-side in mpesa-stk-push function
   */
  async initiatePayment(paymentData) {
    if (this.destroyed) return;

    try {
      // Task 6.2: Fetch timeout configuration from server
      // SECURITY: Config fetched from server, not client-defined
      this.timeoutConfig = await this.fetchTimeoutConfig(paymentData.flowType || 'kit_payment');

      this.showPaymentProgress('Initiating payment...', false);

      // SECURITY: Call server-side Edge Function that validates everything
      const { data, error } = await this.supabase.functions.invoke('mpesa-stk-push', {
        body: {
          // Only send necessary data, server validates all amounts and user eligibility
          applicationCode: this.sanitizeInput(paymentData.applicationCode),
          phoneNumber: this.sanitizePhoneNumber(paymentData.phoneNumber),
          // DO NOT send amount from client - server determines correct amount
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Payment initiation failed');
      }

      // Store minimal payment tracking info (no sensitive data)
      this.currentPayment = {
        checkoutRequestId: data.checkoutRequestId,
        merchantRequestId: data.merchantRequestId,
        startTime: Date.now(),
        flowType: paymentData.flowType || 'kit_payment',
        phoneNumber: this.maskPhoneNumber(paymentData.phoneNumber),
        // SECURITY: Amount displayed is from server response, not client input
        amount: data.amount
      };

      this.startTime = Date.now();

      // Task 6.2: Start polling and show progress with countdown
      this.startPolling();
      this.showPaymentProgress(
        'Payment request sent to your phone. Please enter your M-Pesa PIN.',
        true
      );

    } catch (error) {
      console.error('Payment initiation error:', error);
      this.showError(error.message || 'Failed to initiate payment', true);
      this.onError(error);
    }
  }

  /**
   * Task 6.2: Fetch timeout configuration from server
   * 
   * SECURITY: Configuration comes from server, not client
   */
  async fetchTimeoutConfig(flowType) {
    try {
      const { data, error } = await this.supabase.functions.invoke('config-service', {
        body: { flowType }
      });

      if (error) throw error;

      return {
        timeoutDuration: data.timeout_duration || 90,
        maxRetries: data.max_retries || 3,
        retryInterval: data.retry_interval || 30
      };
    } catch (error) {
      console.error('Failed to fetch timeout config:', error);
      // Return defaults if fetch fails
      return {
        timeoutDuration: 90,
        maxRetries: 3,
        retryInterval: 30
      };
    }
  }

  /**
   * Task 6.3: Poll payment status
   * 
   * SECURITY: Status checked server-side, client just displays result
   */
  startPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }

    // Poll every 3 seconds
    this.pollInterval = setInterval(() => {
      this.checkPaymentStatus();
    }, 3000);

    // Check immediately
    this.checkPaymentStatus();
  }

  /**
   * Task 6.3: Check payment status
   * 
   * SECURITY: All status checks go through server
   */
  async checkPaymentStatus() {
    if (this.destroyed || !this.currentPayment) return;

    try {
      // Task 6.3: Check local timeout first
      const elapsed = (Date.now() - this.startTime) / 1000;
      const timeoutDuration = this.timeoutConfig?.timeoutDuration || 90;

      if (elapsed > timeoutDuration) {
        // Task 6.4: Show timeout state
        this.stopPolling();
        this.showTimeoutState();
        return;
      }

      // Update timer display
      this.updateProgressTimer(timeoutDuration - elapsed);

      // SECURITY: Check status via server Edge Function
      const { data, error } = await this.supabase.functions.invoke('payment-status', {
        body: {
          checkoutRequestId: this.currentPayment.checkoutRequestId
        }
      });

      if (error) throw error;

      // Task 6.3: Handle different statuses
      if (data.status === 'completed' || data.status === 'verified') {
        this.stopPolling();
        this.showSuccess('Payment completed successfully!');
        this.onSuccess(data);
      } else if (data.status === 'failed' || data.status === 'rejected') {
        this.stopPolling();
        this.showError(data.message || 'Payment failed', true);
        this.onError(data);
      } else if (data.status === 'timeout' || data.status === 'callback_missing') {
        this.stopPolling();
        this.showTimeoutState();
      }
      // If still pending, continue polling

    } catch (error) {
      console.error('Status check error:', error);
      // Don't stop polling on error, just log it
    }
  }

  /**
   * Task 6.3: Stop polling
   */
  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  /**
   * Task 6.4: Show timeout state with recovery options
   */
  showTimeoutState() {
    const html = `
      <div class="payment-state timeout-state">
        <div class="state-icon">
          <i class="fas fa-clock"></i>
        </div>
        <h3>Payment Timeout</h3>
        <p>We haven't received confirmation of your payment yet. This could mean:</p>
        <ul class="timeout-reasons">
          <li>You didn't complete the M-Pesa prompt on your phone</li>
          <li>There was a network delay</li>
          <li>The payment is still processing</li>
        </ul>
        <div class="timeout-actions">
          <button id="checkStatusBtn" class="btn btn-primary">
            <i class="fas fa-sync"></i> Check Status Now
          </button>
          <button id="retryPaymentBtn" class="btn btn-secondary">
            <i class="fas fa-redo"></i> Try Again
          </button>

        </div>
      </div>
    `;

    this.container.innerHTML = html;

    // Bind events
    document.getElementById('checkStatusBtn')?.addEventListener('click', () => {
      this.manualStatusCheck();
    });

    document.getElementById('retryPaymentBtn')?.addEventListener('click', () => {
      this.onCancel(); // Let parent handle retry
    });

    // Task 6.4: Auto-trigger status check after 2 seconds
    setTimeout(() => {
      if (!this.destroyed) {
        this.manualStatusCheck();
      }
    }, 2000);
  }

  /**
   * Task 6.5: Manual status check
   * 
   * SECURITY: Calls server-side mpesa-status-query function
   */
  async manualStatusCheck() {
    if (!this.currentPayment) return;

    try {
      this.showPaymentProgress('Checking payment status...', false);

      // SECURITY: Server-side status query with retry limits enforced
      const { data, error } = await this.supabase.functions.invoke('mpesa-status-query', {
        body: {
          checkoutRequestId: this.currentPayment.checkoutRequestId,
          isAutomaticRetry: false // User-initiated
        }
      });

      if (error) throw error;

      // Task 6.5: Handle responses
      if (data.status === 'completed') {
        this.showSuccess('Payment confirmed!');
        this.onSuccess(data);
      } else if (data.status === 'pending') {
        this.showPaymentProgress(
          'Payment is still pending. Please complete the M-Pesa prompt on your phone.',
          false
        );
        
        // Retry after 5 seconds
        setTimeout(() => {
          if (!this.destroyed) {
            this.manualStatusCheck();
          }
        }, 5000);
      } else if (data.status === 'failed' || data.status === 'rejected') {
        this.showError(data.message || 'Payment failed', true);
      }

    } catch (error) {
      console.error('Manual status check error:', error);
      this.showError('Failed to check payment status. Please try again.', true);
    }
  }

  /**
   * Task 6.8: Show payment progress with optional timer
   */
  showPaymentProgress(message, showTimer = false) {
    const timerHtml = showTimer ? `
      <div class="progress-timer">
        <div class="timer-icon">
          <i class="fas fa-clock"></i>
        </div>
        <div id="countdownTimer" class="countdown-timer">
          Timeout in <span id="timerSeconds">90</span> seconds
        </div>
      </div>
    ` : '';

    const html = `
      <div class="payment-state progress-state">
        <div class="spinner"></div>
        <p class="progress-message">${this.sanitizeInput(message)}</p>
        ${timerHtml}
      </div>
    `;

    this.container.innerHTML = html;
  }

  /**
   * Task 6.8: Update countdown timer
   */
  updateProgressTimer(secondsRemaining) {
    const timerElement = document.getElementById('timerSeconds');
    if (timerElement) {
      const seconds = Math.max(0, Math.floor(secondsRemaining));
      timerElement.textContent = seconds;

      // Visual warning when time is running out
      if (seconds <= 30) {
        timerElement.classList.add('timer-warning');
      }
    }
  }

  /**
   * Task 6.8: Show success state
   */
  showSuccess(message) {
    const html = `
      <div class="payment-state success-state">
        <div class="state-icon success-icon">
          <i class="fas fa-check-circle"></i>
        </div>
        <h3>Payment Successful!</h3>
        <p>${this.sanitizeInput(message)}</p>
      </div>
    `;

    this.container.innerHTML = html;
  }

  /**
   * Task 6.8: Show error state with optional retry
   */
  showError(message, showRetry = false) {
    const retryHtml = showRetry ? `
      <button id="retryPaymentBtn" class="btn btn-primary">
        <i class="fas fa-redo"></i> Try Again
      </button>
    ` : '';

    const html = `
      <div class="payment-state error-state">
        <div class="state-icon error-icon">
          <i class="fas fa-exclamation-circle"></i>
        </div>
        <h3>Payment Error</h3>
        <p>${this.sanitizeInput(message)}</p>
        <div class="error-actions">
          ${retryHtml}
        </div>
      </div>
    `;

    this.container.innerHTML = html;

    if (showRetry) {
      document.getElementById('retryPaymentBtn')?.addEventListener('click', () => {
        this.onCancel(); // Let parent handle retry
      });
    }
  }

  /**
   * Task 6.8: Copy to clipboard functionality
   */
  copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const text = element.textContent;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => {
          // Show visual feedback
          const btn = document.querySelector(`[data-copy="${elementId}"]`);
          if (btn) {
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i>';
            btn.classList.add('copied');
            
            setTimeout(() => {
              btn.innerHTML = originalHTML;
              btn.classList.remove('copied');
            }, 2000);
          }
        })
        .catch(err => console.error('Failed to copy:', err));
    } else {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  }

  /**
   * SECURITY: Input sanitization
   */
  sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    
    return input
      .replace(/[<>'"]/g, '') // Remove potentially dangerous characters
      .trim()
      .substring(0, 1000); // Limit length
  }

  /**
   * SECURITY: Phone number sanitization
   */
  sanitizePhoneNumber(phone) {
    if (typeof phone !== 'string') return '';
    
    // Remove everything except digits and plus
    const cleaned = phone.replace(/[^\d+]/g, '');
    
    // Ensure it starts with 254 for Kenya
    if (cleaned.startsWith('0')) {
      return '254' + cleaned.substring(1);
    } else if (cleaned.startsWith('+254')) {
      return cleaned.substring(1);
    } else if (cleaned.startsWith('254')) {
      return cleaned;
    }
    
    return cleaned;
  }

  /**
   * SECURITY: Mask phone number for display
   */
  maskPhoneNumber(phone) {
    const cleaned = this.sanitizePhoneNumber(phone);
    if (cleaned.length !== 12) return 'XXX XXX XXX';
    
    return `${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6, 9)} XXX`;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MpesaPaymentUI;
}
