// Payment Timeout Configuration Module
// Handles timeout configuration UI and metrics dashboard (Section 7)

class PaymentTimeoutConfig {
    constructor() {
        this.supabase = null;
        this.currentConfig = null;
        this.metricsRefreshInterval = null;
        this.selectedPeriod = '24h';
    }

    async initialize(supabaseClient) {
        this.supabase = supabaseClient;
        await this.loadConfiguration();
        await this.loadMetrics();
        this.attachEventListeners();
    }

    attachEventListeners() {
        // Configuration save button
        const btnSaveConfig = document.getElementById('btnSaveTimeoutConfig');
        if (btnSaveConfig) {
            btnSaveConfig.addEventListener('click', () => this.saveConfiguration());
        }

        // Metrics refresh button
        const btnRefreshMetrics = document.getElementById('btnRefreshTimeoutMetrics');
        if (btnRefreshMetrics) {
            btnRefreshMetrics.addEventListener('click', () => this.loadMetrics());
        }

        // Metrics period buttons
        document.querySelectorAll('.metrics-period-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.metrics-period-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.selectedPeriod = e.target.dataset.period;
                this.loadMetrics();
            });
        });

        // Input validation
        ['timeoutDuration', 'maxRetries', 'retryInterval'].forEach(field => {
            const input = document.getElementById(field);
            if (input) {
                input.addEventListener('input', () => this.validateField(field));
            }
        });
    }

    async loadConfiguration() {
        try {
            const loadingEl = document.getElementById('timeoutConfigLoading');
            if (loadingEl) loadingEl.style.display = 'block';

            // Get the access token
            const { data: { session } } = await this.supabase.auth.getSession();
            if (!session) {
                throw new Error('Not authenticated');
            }

            // Call config-service Edge Function
            const response = await fetch(
                `${this.supabase.supabaseUrl}/functions/v1/config-service`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to load configuration');
            }

            this.currentConfig = await response.json();
            this.displayConfiguration();

        } catch (error) {
            console.error('Error loading timeout configuration:', error);
            this.showError('Failed to load timeout configuration: ' + error.message);
        } finally {
            const loadingEl = document.getElementById('timeoutConfigLoading');
            if (loadingEl) loadingEl.style.display = 'none';
        }
    }

    displayConfiguration() {
        if (!this.currentConfig) return;

        // Display current values
        document.getElementById('currentTimeoutDuration').textContent = 
            `${this.currentConfig.timeout_duration}s`;
        document.getElementById('currentMaxRetries').textContent = 
            this.currentConfig.max_retries;
        document.getElementById('currentRetryInterval').textContent = 
            `${this.currentConfig.retry_interval}s`;
        document.getElementById('currentFlowType').textContent = 
            this.currentConfig.flow_type || 'kit_payment';

        // Set input values
        document.getElementById('timeoutDuration').value = 
            this.currentConfig.timeout_duration;
        document.getElementById('maxRetries').value = 
            this.currentConfig.max_retries;
        document.getElementById('retryInterval').value = 
            this.currentConfig.retry_interval;
    }

    validateField(fieldName) {
        const input = document.getElementById(fieldName);
        const value = parseInt(input.value);
        let min, max, errorMsg;

        switch(fieldName) {
            case 'timeoutDuration':
                min = 30;
                max = 300;
                errorMsg = 'Timeout duration must be between 30 and 300 seconds';
                break;
            case 'maxRetries':
                min = 1;
                max = 5;
                errorMsg = 'Max retries must be between 1 and 5';
                break;
            case 'retryInterval':
                min = 10;
                max = 60;
                errorMsg = 'Retry interval must be between 10 and 60 seconds';
                break;
        }

        const feedback = document.getElementById(`${fieldName}Feedback`);
        if (value < min || value > max || isNaN(value)) {
            input.classList.add('invalid');
            input.classList.remove('valid');
            if (feedback) {
                feedback.textContent = errorMsg;
                feedback.style.display = 'block';
            }
            return false;
        } else {
            input.classList.remove('invalid');
            input.classList.add('valid');
            if (feedback) {
                feedback.style.display = 'none';
            }
            return true;
        }
    }

    async saveConfiguration() {
        // Validate all fields
        const isValid = ['timeoutDuration', 'maxRetries', 'retryInterval']
            .every(field => this.validateField(field));

        if (!isValid) {
            this.showError('Please correct the validation errors before saving');
            return;
        }

        try {
            const btnSave = document.getElementById('btnSaveTimeoutConfig');
            const originalText = btnSave.textContent;
            btnSave.disabled = true;
            btnSave.textContent = 'Saving...';

            const { data: { session } } = await this.supabase.auth.getSession();
            if (!session) {
                throw new Error('Not authenticated');
            }

            const configData = {
                timeout_duration: parseInt(document.getElementById('timeoutDuration').value),
                max_retries: parseInt(document.getElementById('maxRetries').value),
                retry_interval: parseInt(document.getElementById('retryInterval').value)
            };

            const response = await fetch(
                `${this.supabase.supabaseUrl}/functions/v1/config-service`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(configData)
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save configuration');
            }

            this.currentConfig = await response.json();
            this.displayConfiguration();
            this.showSuccess('Timeout configuration saved successfully');

        } catch (error) {
            console.error('Error saving timeout configuration:', error);
            this.showError('Failed to save configuration: ' + error.message);
        } finally {
            const btnSave = document.getElementById('btnSaveTimeoutConfig');
            btnSave.disabled = false;
            btnSave.textContent = 'Save Configuration';
        }
    }

    async loadMetrics() {
        try {
            const loadingEl = document.getElementById('timeoutMetricsLoading');
            if (loadingEl) loadingEl.style.display = 'block';

            // Calculate date range based on selected period
            const now = new Date();
            let startDate;
            switch(this.selectedPeriod) {
                case '24h':
                    startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                    break;
                case '7d':
                    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case '30d':
                    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    break;
            }

            // Query payment metrics
            const { data: metrics, error } = await this.supabase
                .from('payment_metrics')
                .select('metric_type, flow_type, metadata')
                .gte('created_at', startDate.toISOString());

            if (error) throw error;

            this.calculateAndDisplayMetrics(metrics);

        } catch (error) {
            console.error('Error loading timeout metrics:', error);
            this.showError('Failed to load metrics: ' + error.message);
        } finally {
            const loadingEl = document.getElementById('timeoutMetricsLoading');
            if (loadingEl) loadingEl.style.display = 'none';
        }
    }

    calculateAndDisplayMetrics(metrics) {
        if (!metrics || metrics.length === 0) {
            this.displayZeroMetrics();
            return;
        }

        // Count metric types
        const counts = {
            timeout_detected: 0,
            auto_recovery_success: 0,
            manual_fallback_triggered: 0,
            total_payments: 0
        };

        metrics.forEach(m => {
            if (m.metric_type === 'timeout_detected') counts.timeout_detected++;
            if (m.metric_type === 'auto_recovery_success') counts.auto_recovery_success++;
            if (m.metric_type === 'manual_fallback_triggered') counts.manual_fallback_triggered++;
            if (m.metric_type === 'payment_initiated') counts.total_payments++;
        });

        // Calculate rates
        const timeoutRate = counts.total_payments > 0 
            ? ((counts.timeout_detected / counts.total_payments) * 100).toFixed(1)
            : '0.0';

        const recoveryRate = counts.timeout_detected > 0
            ? ((counts.auto_recovery_success / counts.timeout_detected) * 100).toFixed(1)
            : '0.0';

        const fallbackRate = counts.timeout_detected > 0
            ? ((counts.manual_fallback_triggered / counts.timeout_detected) * 100).toFixed(1)
            : '0.0';

        // Display metrics
        document.getElementById('metricTimeoutRate').textContent = `${timeoutRate}%`;
        document.getElementById('metricTimeoutCount').textContent = 
            `${counts.timeout_detected} of ${counts.total_payments} payments`;

        document.getElementById('metricRecoveryRate').textContent = `${recoveryRate}%`;
        document.getElementById('metricRecoveryCount').textContent = 
            `${counts.auto_recovery_success} of ${counts.timeout_detected} timeouts`;

        document.getElementById('metricFallbackRate').textContent = `${fallbackRate}%`;
        document.getElementById('metricFallbackCount').textContent = 
            `${counts.manual_fallback_triggered} of ${counts.timeout_detected} timeouts`;

        // Update last refresh time
        document.getElementById('metricsLastRefresh').textContent = 
            new Date().toLocaleTimeString();
    }

    displayZeroMetrics() {
        document.getElementById('metricTimeoutRate').textContent = '0.0%';
        document.getElementById('metricTimeoutCount').textContent = '0 of 0 payments';
        document.getElementById('metricRecoveryRate').textContent = '0.0%';
        document.getElementById('metricRecoveryCount').textContent = '0 of 0 timeouts';
        document.getElementById('metricFallbackRate').textContent = '0.0%';
        document.getElementById('metricFallbackCount').textContent = '0 of 0 timeouts';
        document.getElementById('metricsLastRefresh').textContent = 
            new Date().toLocaleTimeString();
    }

    showSuccess(message) {
        const alertDiv = document.getElementById('timeoutConfigAlert');
        if (alertDiv) {
            alertDiv.className = 'alert alert-success';
            alertDiv.textContent = message;
            alertDiv.style.display = 'block';
            setTimeout(() => { alertDiv.style.display = 'none'; }, 5000);
        }
    }

    showError(message) {
        const alertDiv = document.getElementById('timeoutConfigAlert');
        if (alertDiv) {
            alertDiv.className = 'alert alert-error';
            alertDiv.textContent = message;
            alertDiv.style.display = 'block';
        }
    }

    cleanup() {
        if (this.metricsRefreshInterval) {
            clearInterval(this.metricsRefreshInterval);
        }
    }
}

// Export for use in rembrandts.page.js
window.PaymentTimeoutConfig = PaymentTimeoutConfig;
