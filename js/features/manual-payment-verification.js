// Manual Payment Verification Module
// Handles manual payment verification UI and workflow (Section 8)

class ManualPaymentVerification {
    constructor() {
        this.supabase = null;
        this.pendingPayments = [];
        this.currentPayment = null;
        this.refreshInterval = null;
        this.searchTimeout = null;
        this.currentPage = 1;
        this.itemsPerPage = 15;
        this.totalPages = 1;
    }

    async initialize(supabaseClient) {
        this.supabase = supabaseClient;
        await this.loadPendingPayments();
        this.attachEventListeners();
        this.startAutoRefresh();
    }

    attachEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('manualPaymentSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(() => {
                    this.searchPayments(e.target.value);
                }, 500);
            });
        }

        // Refresh button
        const btnRefresh = document.getElementById('btnRefreshManualPayments');
        if (btnRefresh) {
            btnRefresh.addEventListener('click', () => this.loadPendingPayments());
        }

        // Clear search button
        const btnClearSearch = document.getElementById('btnClearManualPaymentSearch');
        if (btnClearSearch) {
            btnClearSearch.addEventListener('click', () => {
                document.getElementById('manualPaymentSearch').value = '';
                this.loadPendingPayments();
            });
        }

        // Status filter
        const statusFilter = document.getElementById('manualPaymentStatusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.loadPendingPayments());
        }

        // Pagination controls
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('manual-payment-page-btn')) {
                const page = parseInt(e.target.dataset.page);
                this.currentPage = page;
                this.loadPendingPayments();
            }
        });

        // Modal close handlers
        const modal = document.getElementById('paymentDetailModal');
        if (modal) {
            const closeBtn = modal.querySelector('.close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.closeModal());
            }
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeModal();
            });
        }
    }

    startAutoRefresh() {
        // Refresh every 30 seconds
        this.refreshInterval = setInterval(() => {
            this.loadPendingPayments(true); // silent refresh
        }, 30000);
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    async loadPendingPayments(silent = false) {
        try {
            if (!silent) {
                const loadingEl = document.getElementById('manualPaymentsLoading');
                if (loadingEl) loadingEl.style.display = 'block';
            }

            // Get status filter
            const statusFilter = document.getElementById('manualPaymentStatusFilter');
            const statusValue = statusFilter ? statusFilter.value : '';

            // Build query
            let query = this.supabase
                .from('stokika_kit_payments')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: true });

            // Apply status filter
            if (statusValue === 'manual_verification_pending') {
                query = query.eq('payment_status', 'awaiting_verification')
                            .eq('manual_fallback_required', true);
            } else if (statusValue === 'timeout') {
                query = query.eq('payment_status', 'timeout');
            } else if (statusValue === 'verified') {
                query = query.eq('payment_status', 'verified')
                            .not('verified_at', 'is', null);
            } else if (statusValue === 'rejected') {
                query = query.eq('payment_status', 'rejected');
            } else {
                // Default: show payments needing manual attention
                query = query.or('payment_status.eq.awaiting_verification,payment_status.eq.timeout,payment_status.eq.callback_missing')
                            .eq('manual_fallback_required', true);
            }

            // Execute query with pagination
            const { data, error, count } = await query
                .range((this.currentPage - 1) * this.itemsPerPage, this.currentPage * this.itemsPerPage - 1);

            if (error) throw error;

            this.pendingPayments = data || [];
            this.totalPages = Math.ceil((count || 0) / this.itemsPerPage);
            
            this.displayPendingPayments(count || 0);
            this.renderPagination();

        } catch (error) {
            console.error('Error loading pending payments:', error);
            this.showError('Failed to load pending payments: ' + error.message);
        } finally {
            if (!silent) {
                const loadingEl = document.getElementById('manualPaymentsLoading');
                if (loadingEl) loadingEl.style.display = 'none';
            }
        }
    }

    async searchPayments(searchTerm) {
        if (!searchTerm || searchTerm.trim().length < 2) {
            this.loadPendingPayments();
            return;
        }

        try {
            const loadingEl = document.getElementById('manualPaymentsLoading');
            if (loadingEl) loadingEl.style.display = 'block';

            const term = searchTerm.trim();

            // Search by application code, checkout request ID, or phone number
            const { data, error } = await this.supabase
                .from('stokika_kit_payments')
                .select('*')
                .or(`application_code.ilike.%${term}%,checkout_request_id.ilike.%${term}%,phone_number.ilike.%${term}%,mpesa_receipt_number.ilike.%${term}%`)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;

            this.pendingPayments = data || [];
            this.displayPendingPayments(data?.length || 0);
            
            // Hide pagination during search
            const paginationEl = document.getElementById('manualPaymentsPagination');
            if (paginationEl) paginationEl.style.display = 'none';

        } catch (error) {
            console.error('Error searching payments:', error);
            this.showError('Search failed: ' + error.message);
        } finally {
            const loadingEl = document.getElementById('manualPaymentsLoading');
            if (loadingEl) loadingEl.style.display = 'none';
        }
    }

    displayPendingPayments(totalCount) {
        const tableContainer = document.getElementById('manualPaymentsTable');
        if (!tableContainer) return;

        if (!this.pendingPayments || this.pendingPayments.length === 0) {
            tableContainer.innerHTML = '<div class="no-data">No payments requiring manual verification</div>';
            return;
        }

        const startIndex = (this.currentPage - 1) * this.itemsPerPage + 1;
        const endIndex = Math.min(startIndex + this.pendingPayments.length - 1, totalCount);

        let html = `
            <div class="table-info">
                <p>Showing ${startIndex}-${endIndex} of ${totalCount} payments</p>
            </div>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Date/Time</th>
                        <th>Application Code</th>
                        <th>User Type</th>
                        <th>Amount</th>
                        <th>Phone Number</th>
                        <th>Status</th>
                        <th>Timeout Info</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;

        this.pendingPayments.forEach(payment => {
            const date = new Date(payment.created_at).toLocaleString();
            const timeoutDate = payment.timeout_detected_at 
                ? new Date(payment.timeout_detected_at).toLocaleString() 
                : 'N/A';
            const statusClass = this.getStatusClass(payment.payment_status);
            const statusBadge = this.getStatusBadge(payment.payment_status);
            const manualConfirmed = payment.manual_payment_confirmed_at 
                ? '<span class="badge badge-info">✓ User Confirmed</span>' 
                : '';

            html += `
                <tr>
                    <td>${this.sanitize(date)}</td>
                    <td><strong>${this.sanitize(payment.application_code || 'N/A')}</strong></td>
                    <td>${this.sanitize(payment.user_type || 'N/A')}</td>
                    <td>KES ${this.sanitize(payment.kit_amount?.toLocaleString() || '0')}</td>
                    <td>${this.maskPhone(payment.phone_number)}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <div class="timeout-info">
                            <small>Queries: ${payment.status_query_count || 0}</small><br>
                            <small>Timeout: ${this.sanitize(timeoutDate)}</small>
                            ${manualConfirmed}
                        </div>
                    </td>
                    <td>
                        <button class="btn-action btn-view" onclick="window.manualPaymentVerification.viewPaymentDetails('${payment.id}')">
                            View Details
                        </button>
                    </td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;

        tableContainer.innerHTML = html;
    }

    renderPagination() {
        const paginationEl = document.getElementById('manualPaymentsPagination');
        if (!paginationEl) return;

        if (this.totalPages <= 1) {
            paginationEl.style.display = 'none';
            return;
        }

        paginationEl.style.display = 'flex';

        let html = '';

        // Previous button
        html += `<button class="manual-payment-page-btn" data-page="${this.currentPage - 1}" ${this.currentPage === 1 ? 'disabled' : ''}>Previous</button>`;

        // Page numbers
        for (let i = 1; i <= this.totalPages; i++) {
            if (i === 1 || i === this.totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                html += `<button class="manual-payment-page-btn ${i === this.currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                html += `<span class="pagination-ellipsis">...</span>`;
            }
        }

        // Next button
        html += `<button class="manual-payment-page-btn" data-page="${this.currentPage + 1}" ${this.currentPage === this.totalPages ? 'disabled' : ''}>Next</button>`;

        paginationEl.innerHTML = html;
    }

    async viewPaymentDetails(paymentId) {
        try {
            // Fetch payment details
            const { data: payment, error: paymentError } = await this.supabase
                .from('stokika_kit_payments')
                .select('*')
                .eq('id', paymentId)
                .single();

            if (paymentError) throw paymentError;

            this.currentPayment = payment;

            // Fetch status query history
            const { data: queryHistory, error: queryError } = await this.supabase
                .from('payment_status_queries')
                .select('*')
                .eq('payment_id', paymentId)
                .order('created_at', { ascending: false });

            // Fetch audit log
            const { data: auditLog, error: auditError } = await this.supabase
                .from('admin_audit_log')
                .select(`
                    *,
                    admin:admin_id (
                        email,
                        full_name
                    )
                `)
                .eq('details->>payment_id', paymentId)
                .order('created_at', { ascending: false });

            this.displayPaymentDetailModal(payment, queryHistory || [], auditLog || []);

        } catch (error) {
            console.error('Error loading payment details:', error);
            this.showError('Failed to load payment details: ' + error.message);
        }
    }

    displayPaymentDetailModal(payment, queryHistory, auditLog) {
        const modal = document.getElementById('paymentDetailModal');
        if (!modal) return;

        const modalContent = modal.querySelector('.payment-detail-content');
        if (!modalContent) return;

        const manualConfirmedDate = payment.manual_payment_confirmed_at 
            ? new Date(payment.manual_payment_confirmed_at).toLocaleString() 
            : 'N/A';

        let html = `
            <div class="payment-detail-header">
                <h3>Payment Details</h3>
                <p class="payment-id">ID: ${this.sanitize(payment.id)}</p>
            </div>

            <div class="payment-detail-section">
                <h4>Basic Information</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Application Code:</span>
                        <span class="detail-value"><strong>${this.sanitize(payment.application_code || 'N/A')}</strong></span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">User Type:</span>
                        <span class="detail-value">${this.sanitize(payment.user_type || 'N/A')}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Amount:</span>
                        <span class="detail-value"><strong>KES ${this.sanitize(payment.kit_amount?.toLocaleString() || '0')}</strong></span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Phone Number:</span>
                        <span class="detail-value">${this.maskPhone(payment.phone_number)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Payment Status:</span>
                        <span class="detail-value">${this.getStatusBadge(payment.payment_status)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Created:</span>
                        <span class="detail-value">${new Date(payment.created_at).toLocaleString()}</span>
                    </div>
                </div>
            </div>

            <div class="payment-detail-section">
                <h4>M-Pesa Transaction Details</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Checkout Request ID:</span>
                        <span class="detail-value">${this.sanitize(payment.checkout_request_id || 'N/A')}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Merchant Request ID:</span>
                        <span class="detail-value">${this.sanitize(payment.merchant_request_id || 'N/A')}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">M-Pesa Receipt:</span>
                        <span class="detail-value">${this.sanitize(payment.mpesa_receipt_number || 'N/A')}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Transaction Date:</span>
                        <span class="detail-value">${payment.transaction_date ? new Date(payment.transaction_date).toLocaleString() : 'N/A'}</span>
                    </div>
                </div>
            </div>

            <div class="payment-detail-section">
                <h4>Timeout & Recovery Information</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Timeout Detected:</span>
                        <span class="detail-value">${payment.timeout_detected_at ? new Date(payment.timeout_detected_at).toLocaleString() : 'No'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Status Query Count:</span>
                        <span class="detail-value">${payment.status_query_count || 0}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Last Status Query:</span>
                        <span class="detail-value">${payment.last_status_query_at ? new Date(payment.last_status_query_at).toLocaleString() : 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Manual Fallback Required:</span>
                        <span class="detail-value">${payment.manual_fallback_required ? 'Yes' : 'No'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">User Confirmed Payment:</span>
                        <span class="detail-value">${this.sanitize(manualConfirmedDate)}</span>
                    </div>
                </div>
            </div>
        `;

        // Status query history
        if (queryHistory.length > 0) {
            html += `
                <div class="payment-detail-section">
                    <h4>Status Query History (${queryHistory.length})</h4>
                    <div class="query-history-list">
            `;
            queryHistory.forEach(query => {
                const response = query.query_response || {};
                const resultCode = response.ResultCode || 'N/A';
                const resultDesc = response.ResultDesc || 'No description';
                html += `
                    <div class="query-history-item">
                        <div class="query-header">
                            <span class="query-date">${new Date(query.created_at).toLocaleString()}</span>
                            <span class="query-badge ${query.is_automatic_retry ? 'badge-auto' : 'badge-manual'}">
                                ${query.is_automatic_retry ? 'Auto' : 'Manual'} (Attempt ${query.query_attempt})
                            </span>
                        </div>
                        <div class="query-details">
                            <strong>Result Code:</strong> ${this.sanitize(resultCode)}<br>
                            <strong>Description:</strong> ${this.sanitize(resultDesc)}
                        </div>
                    </div>
                `;
            });
            html += `
                    </div>
                </div>
            `;
        }

        // Audit log
        if (auditLog.length > 0) {
            html += `
                <div class="payment-detail-section">
                    <h4>Audit Log (${auditLog.length})</h4>
                    <div class="audit-log-list">
            `;
            auditLog.forEach(log => {
                const adminName = log.admin?.full_name || log.admin?.email || 'Unknown Admin';
                html += `
                    <div class="audit-log-item">
                        <div class="audit-header">
                            <span class="audit-admin">${this.sanitize(adminName)}</span>
                            <span class="audit-date">${new Date(log.created_at).toLocaleString()}</span>
                        </div>
                        <div class="audit-action">
                            <strong>${this.sanitize(log.action)}</strong>
                        </div>
                        ${log.details?.notes ? `<div class="audit-notes">${this.sanitize(log.details.notes)}</div>` : ''}
                    </div>
                `;
            });
            html += `
                    </div>
                </div>
            `;
        }

        // Action buttons
        if (payment.payment_status === 'awaiting_verification' || payment.payment_status === 'timeout' || payment.payment_status === 'callback_missing') {
            html += `
                <div class="payment-detail-section">
                    <h4>Verification Actions</h4>
                    <div class="form-group">
                        <label for="verificationNotes">Verification Notes</label>
                        <textarea id="verificationNotes" rows="3" placeholder="Add notes about your verification decision..."></textarea>
                    </div>
                    <div class="action-buttons">
                        <button class="btn-approve" onclick="window.manualPaymentVerification.approvePayment()">
                            ✓ Approve Payment
                        </button>
                        <button class="btn-reject" onclick="window.manualPaymentVerification.rejectPayment()">
                            ✗ Reject Payment
                        </button>
                    </div>
                </div>
            `;
        } else {
            html += `
                <div class="payment-detail-section">
                    <p class="info-message">This payment has already been ${payment.payment_status}. No further action needed.</p>
                </div>
            `;
        }

        modalContent.innerHTML = html;
        modal.style.display = 'block';
    }

    async approvePayment() {
        if (!this.currentPayment) return;

        const notes = document.getElementById('verificationNotes')?.value || '';

        if (!confirm(`Are you sure you want to APPROVE this payment?\n\nApplication Code: ${this.currentPayment.application_code}\nAmount: KES ${this.currentPayment.kit_amount}`)) {
            return;
        }

        try {
            const btnApprove = document.querySelector('.btn-approve');
            if (btnApprove) {
                btnApprove.disabled = true;
                btnApprove.textContent = 'Approving...';
            }

            const { data: { session } } = await this.supabase.auth.getSession();
            if (!session) {
                throw new Error('Not authenticated');
            }

            const response = await fetch(
                `${this.supabase.supabaseUrl}/functions/v1/manual-payment-verify`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        payment_id: this.currentPayment.id,
                        action: 'approve',
                        notes: notes
                    })
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Approval failed');
            }

            this.showSuccess('Payment approved successfully');
            this.closeModal();
            this.loadPendingPayments();

        } catch (error) {
            console.error('Error approving payment:', error);
            this.showError('Failed to approve payment: ' + error.message);
        } finally {
            const btnApprove = document.querySelector('.btn-approve');
            if (btnApprove) {
                btnApprove.disabled = false;
                btnApprove.textContent = '✓ Approve Payment';
            }
        }
    }

    async rejectPayment() {
        if (!this.currentPayment) return;

        const notes = document.getElementById('verificationNotes')?.value || '';

        if (!notes.trim()) {
            this.showError('Please provide a reason for rejection in the notes field');
            return;
        }

        if (!confirm(`Are you sure you want to REJECT this payment?\n\nApplication Code: ${this.currentPayment.application_code}\nAmount: KES ${this.currentPayment.kit_amount}\n\nThis action cannot be undone.`)) {
            return;
        }

        try {
            const btnReject = document.querySelector('.btn-reject');
            if (btnReject) {
                btnReject.disabled = true;
                btnReject.textContent = 'Rejecting...';
            }

            const { data: { session } } = await this.supabase.auth.getSession();
            if (!session) {
                throw new Error('Not authenticated');
            }

            const response = await fetch(
                `${this.supabase.supabaseUrl}/functions/v1/manual-payment-verify`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        payment_id: this.currentPayment.id,
                        action: 'reject',
                        notes: notes
                    })
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Rejection failed');
            }

            this.showSuccess('Payment rejected');
            this.closeModal();
            this.loadPendingPayments();

        } catch (error) {
            console.error('Error rejecting payment:', error);
            this.showError('Failed to reject payment: ' + error.message);
        } finally {
            const btnReject = document.querySelector('.btn-reject');
            if (btnReject) {
                btnReject.disabled = false;
                btnReject.textContent = '✗ Reject Payment';
            }
        }
    }

    closeModal() {
        const modal = document.getElementById('paymentDetailModal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.currentPayment = null;
    }

    getStatusBadge(status) {
        const badges = {
            'pending': '<span class="badge badge-pending">Pending</span>',
            'completed': '<span class="badge badge-success">Completed</span>',
            'verified': '<span class="badge badge-success">Verified</span>',
            'failed': '<span class="badge badge-error">Failed</span>',
            'timeout': '<span class="badge badge-warning">Timeout</span>',
            'awaiting_verification': '<span class="badge badge-info">Awaiting Verification</span>',
            'rejected': '<span class="badge badge-error">Rejected</span>',
            'callback_missing': '<span class="badge badge-warning">Callback Missing</span>'
        };
        return badges[status] || `<span class="badge">${status}</span>`;
    }

    getStatusClass(status) {
        const classes = {
            'pending': 'status-pending',
            'completed': 'status-success',
            'verified': 'status-success',
            'failed': 'status-error',
            'timeout': 'status-warning',
            'awaiting_verification': 'status-info',
            'rejected': 'status-error',
            'callback_missing': 'status-warning'
        };
        return classes[status] || '';
    }

    maskPhone(phone) {
        if (!phone) return 'N/A';
        const str = phone.toString();
        if (str.length >= 10) {
            return str.substring(0, 6) + '****' + str.substring(str.length - 2);
        }
        return str;
    }

    sanitize(str) {
        if (str === null || str === undefined) return '';
        return String(str).replace(/[<>"']/g, '');
    }

    showSuccess(message) {
        const alertDiv = document.getElementById('manualPaymentAlert');
        if (alertDiv) {
            alertDiv.className = 'alert alert-success';
            alertDiv.textContent = message;
            alertDiv.style.display = 'block';
            setTimeout(() => { alertDiv.style.display = 'none'; }, 5000);
        }
    }

    showError(message) {
        const alertDiv = document.getElementById('manualPaymentAlert');
        if (alertDiv) {
            alertDiv.className = 'alert alert-error';
            alertDiv.textContent = message;
            alertDiv.style.display = 'block';
        }
    }

    cleanup() {
        this.stopAutoRefresh();
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
    }
}

// Export for use in rembrandts.page.js
window.ManualPaymentVerification = ManualPaymentVerification;
