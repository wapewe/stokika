// M-Pesa Admin Dashboard JavaScript
let mpesaSupabase = null;
let currentMpesaTransactions = [];
let mpesaRealtimeSubscription = null;
let mpesaAutoRefreshInterval = null;
let currentMpesaFilters = {
    search: '',
    status: '',
    userType: '',
    dateFrom: '',
    dateTo: ''
};

// Initialize M-Pesa dashboard
function initializeMpesaDashboard() {
    mpesaSupabase = initSupabase();
    if (!mpesaSupabase) {
        console.error('Failed to initialize Supabase for M-Pesa dashboard');
        return false;
    }
    return true;
}

// Main load function called from admin.js
async function loadMpesaTransactions() {
    if (!mpesaSupabase && !initializeMpesaDashboard()) {
        document.getElementById('mpesaTable').innerHTML =XSSProtection.sanitize( XSSProtection.sanitize(<div class="no-data">Failed to initialize dashboard</div>';
        return;
    }

    // Set up event listeners
    setupMpesaEventListeners();

    // Load overview statistics
    await loadMpesaStats();

    // Load transaction list
    await loadMpesaTransactionList();

    // Set up real-time updates
    setupMpesaRealtimeUpdates();

    // Set up auto-refresh every 30 seconds
    if (mpesaAutoRefreshInterval) {
        clearInterval(mpesaAutoRefreshInterval);
    }
    mpesaAutoRefreshInterval = setInterval(async () => {
        await loadMpesaStats();
        await loadMpesaTransactionList(true); // Silent refresh
    }, 30000);
}

// Set up event listeners for filters and actions
function setupMpesaEventListeners() {
    // Search button
    const searchBtn = document.getElementById('btnSearchMpesa');
    if (searchBtn) {
        searchBtn.onclick = async () => {
            currentMpesaFilters.search = document.getElementById('mpesaSearchInput')?.value || '';
            currentMpesaFilters.status = document.getElementById('mpesaStatusFilter')?.value || '';
            currentMpesaFilters.userType = document.getElementById('mpesaUserTypeFilter')?.value || '';
            currentMpesaFilters.dateFrom = document.getElementById('mpesaDateFrom')?.value || '';
            currentMpesaFilters.dateTo = document.getElementById('mpesaDateTo')?.value || '';
            await loadMpesaTransactionList();
        };
    }

    // Reset filters button
    const resetBtn = document.getElementById('btnResetMpesaFilters');
    if (resetBtn) {
        resetBtn.onclick = async () => {
            document.getElementById('mpesaSearchInput').value = '';
            document.getElementById('mpesaStatusFilter').value = '';
            document.getElementById('mpesaUserTypeFilter').value = '';
            document.getElementById('mpesaDateFrom').value = '';
            document.getElementById('mpesaDateTo').value = '';
            currentMpesaFilters = { search: '', status: '', userType: '', dateFrom: '', dateTo: '' };
            await loadMpesaTransactionList();
        };
    }

    // Export button
    const exportBtn = document.getElementById('btnExportMpesa');
    if (exportBtn) {
        exportBtn.onclick = () => exportMpesaTransactions();
    }

    // Reconciliation button
    const reconcileBtn = document.getElementById('btnReconciliation');
    if (reconcileBtn) {
        reconcileBtn.onclick = () => showReconciliationReport();
    }
}

// Load overview statistics (24h, 7d, 30d)
async function loadMpesaStats() {
    try {
        const now = new Date();
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Query for different time periods
        const [stats24h, stats7d, stats30d, failedCount] = await Promise.all([
            mpesaSupabase
                .from('stokika_kit_payments')
                .select('amount, payment_status', { count: 'exact' })
                .gte('created_at', last24h.toISOString()),
            mpesaSupabase
                .from('stokika_kit_payments')
                .select('amount, payment_status', { count: 'exact' })
                .gte('created_at', last7d.toISOString()),
            mpesaSupabase
                .from('stokika_kit_payments')
                .select('amount, payment_status', { count: 'exact' })
                .gte('created_at', last30d.toISOString()),
            mpesaSupabase
                .from('stokika_kit_payments')
                .select('id', { count: 'exact' })
                .in('payment_status', ['failed', 'rejected', 'timeout'])
                .gte('created_at', last24h.toISOString())
        ]);

        // Calculate success rates and totals
        const calculate = (data) => {
            const completed = data?.data?.filter(t => ['completed', 'verified'].includes(t.payment_status)) || [];
            const total = data?.count || 0;
            const amount = completed.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
            const rate = total > 0 ? (completed.length / total * 100) : 0;
            return { total, amount, rate, completed: completed.length };
        };

        const stats = {
            h24: calculate(stats24h),
            d7: calculate(stats7d),
            d30: calculate(stats30d),
            failed: failedCount.count || 0
        };

        displayMpesaStats(stats);
    } catch (error) {
        console.error('Error loading M-Pesa stats:', error);
    }
}

// Display statistics overview
function displayMpesaStats(stats) {
    const successRateClass = stats.d7.rate >= 95 ? 'success' : stats.d7.rate >= 90 ? 'warning' : 'danger';
    
    const statsHTML = `
        <div class="stats-grid" style="margin-bottom: 2rem;">
            <div class="stat-card">
                <div class="stat-icon">📊</div>
                <div class="stat-info">
                    <div class="stat-number">${stats.h24.total}</div>
                    <div class="stat-label">Transactions (24h)</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: ${stats.d7.rate >= 95 ? 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)' : stats.d7.rate >= 90 ? 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'};">✓</div>
                <div class="stat-info">
                    <div class="stat-number">${stats.d7.rate.toFixed(1)}%</div>
                    <div class="stat-label">Success Rate (7d)</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">💰</div>
                <div class="stat-info">
                    <div class="stat-number">KES ${stats.d30.amount.toLocaleString()}</div>
                    <div class="stat-label">Amount Processed (30d)</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">⚠️</div>
                <div class="stat-info">
                    <div class="stat-number">${stats.failed}</div>
                    <div class="stat-label">Failed (24h)</div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('mpesaStatsOverview').innerHTML = XSSProtection.sanitize(statsHTML;
}

// Load transaction list with filters
async function loadMpesaTransactionList(silent = false) {
    if (!silent) {
        document.getElementById('mpesaLoading').style.display = 'block';
    }

    try {
        // Build query
        let query = mpesaSupabase
            .from('stokika_kit_payments')
            .select(`
                *,
                field_agents(full_name, email),
                supervisors(full_name, email)
            `)
            .order('created_at', { ascending: false })
            .limit(50);

        // Apply filters
        if (currentMpesaFilters.status) {
            query = query.eq('payment_status', currentMpesaFilters.status);
        }

        if (currentMpesaFilters.userType) {
            query = query.eq('user_type', currentMpesaFilters.userType);
        }

        if (currentMpesaFilters.dateFrom) {
            query = query.gte('created_at', currentMpesaFilters.dateFrom + 'T00:00:00');
        }

        if (currentMpesaFilters.dateTo) {
            query = query.lte('created_at', currentMpesaFilters.dateTo + 'T23:59:59');
        }

        // Execute query
        const { data, error } = await query;

        if (error) throw error;

        // Apply client-side search filter (for phone, receipt, app code)
        let filteredData = data || [];
        if (currentMpesaFilters.search) {
            const searchLower = currentMpesaFilters.search.toLowerCase();
            filteredData = filteredData.filter(t => 
                (t.application_code || '').toLowerCase().includes(searchLower) ||
                (t.phone_number || '').includes(searchLower) ||
                (t.mpesa_receipt_number || '').toLowerCase().includes(searchLower)
            );
        }

        currentMpesaTransactions = filteredData;
        displayMpesaTransactions(filteredData);
    } catch (error) {
        console.error('Error loading M-Pesa transactions:', error);
        document.getElementById('mpesaTable').innerHTML =XSSProtection.sanitize( XSSProtection.sanitize(<div class="no-data">Error loading transactions</div>';
    } finally {
        if (!silent) {
            document.getElementById('mpesaLoading').style.display = 'none';
        }
    }
}

// Display transactions in table
function displayMpesaTransactions(transactions) {
    if (!transactions || transactions.length === 0) {
        document.getElementById('mpesaTable').innerHTML =XSSProtection.sanitize( XSSProtection.sanitize(<div class="no-data">No transactions found</div>';
        return;
    }

    const tableHTML = `
        <div class="table-info">
            <p>Showing ${transactions.length} transactions</p>
        </div>
        <table class="data-table">
            <thead>
                <tr>
                    <th>Timestamp</th>
                    <th>App Code</th>
                    <th>User Type</th>
                    <th>User Name</th>
                    <th>Phone</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Receipt</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${transactions.map(t => {
                    const userName = t.user_type === 'field_agent' 
                        ? t.field_agents?.full_name 
                        : t.supervisors?.full_name;
                    
                    return `
                        <tr>
                            <td>${formatDateTime(t.created_at)}</td>
                            <td><strong>${t.application_code || 'N/A'}</strong></td>
                            <td>${formatUserType(t.user_type)}</td>
                            <td>${userName || 'N/A'}</td>
                            <td>${maskPhoneNumber(t.phone_number)}</td>
                            <td>KES ${parseFloat(t.amount || 0).toLocaleString()}</td>
                            <td><span class="status-badge status-${t.payment_status}">${formatStatus(t.payment_status)}</span></td>
                            <td>${t.mpesa_receipt_number || '-'}</td>
                            <td class="action-buttons">
                                <button class="btn-action btn-view" onclick="viewMpesaTransaction('${t.id}')">View</button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;

    document.getElementById('mpesaTable').innerHTML = XSSProtection.sanitize(tableHTML;
}

// Set up real-time updates
function setupMpesaRealtimeUpdates() {
    // Unsubscribe from previous subscription if exists
    if (mpesaRealtimeSubscription) {
        mpesaSupabase.removeChannel(mpesaRealtimeSubscription);
    }

    // Subscribe to changes
    mpesaRealtimeSubscription = mpesaSupabase
        .channel('mpesa_transactions_channel')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'stokika_kit_payments'
        }, async (payload) => {
            console.log('M-Pesa transaction updated:', payload);
            
            // Refresh stats and list
            await loadMpesaStats();
            await loadMpesaTransactionList(true);
            
            // Show notification
            showNotification('New M-Pesa transaction activity', 'info');
        })
        .subscribe();
}

// View transaction details
async function viewMpesaTransaction(transactionId) {
    try {
        const { data, error } = await mpesaSupabase
            .from('stokika_kit_payments')
            .select(`
                *,
                field_agents(full_name, email, phone, county),
                supervisors(full_name, email, phone, county)
            `)
            .eq('id', transactionId)
            .single();

        if (error) throw error;

        // Get callback data if available
        let callbackData = null;
        if (data.checkout_request_id) {
            const { data: callback } = await mpesaSupabase
                .from('mpesa_transactions')
                .select('*')
                .eq('checkout_request_id', data.checkout_request_id)
                .single();
            callbackData = callback;
        }

        displayTransactionDetailModal(data, callbackData);
    } catch (error) {
        console.error('Error loading transaction details:', error);
        alert('Failed to load transaction details');
    }
}

// Display transaction detail modal
async function displayTransactionDetailModal(transaction, callbackData) {
    const userName = transaction.user_type === 'field_agent' 
        ? transaction.field_agents?.full_name 
        : transaction.supervisors?.full_name;
    
    const userEmail = transaction.user_type === 'field_agent' 
        ? transaction.field_agents?.email 
        : transaction.supervisors?.email;

    // Load status change timeline
    const statusTimeline = await loadStatusTimeline(transaction.id);

    const modalHTML = `
        <div class="modal show" id="mpesaDetailModal" style="display: flex;">
            <div class="modal-content" style="max-width: 900px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header">
                    <h2>Transaction Details</h2>
                    <button type="button" class="close" onclick="closeMpesaDetailModal()">&times;</button>
                </div>
                
                <div class="detail-section">
                    <h3>Payment Information</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <div class="detail-label">Transaction ID</div>
                            <div class="detail-value">${transaction.id}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Application Code</div>
                            <div class="detail-value"><strong>${transaction.application_code}</strong></div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Status</div>
                            <div class="detail-value">
                                <span class="status-badge status-${transaction.payment_status}">${formatStatus(transaction.payment_status)}</span>
                            </div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Amount</div>
                            <div class="detail-value">KES ${parseFloat(transaction.amount || 0).toLocaleString()}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Phone Number</div>
                            <div class="detail-value">${transaction.phone_number}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Payment Method</div>
                            <div class="detail-value">${transaction.payment_method || 'mpesa_stk'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Created At</div>
                            <div class="detail-value">${formatDateTime(transaction.created_at)}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Updated At</div>
                            <div class="detail-value">${formatDateTime(transaction.updated_at)}</div>
                        </div>
                    </div>
                </div>

                <div class="detail-section">
                    <h3>User Information</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <div class="detail-label">User Type</div>
                            <div class="detail-value">${formatUserType(transaction.user_type)}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Name</div>
                            <div class="detail-value">${userName || 'N/A'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Email</div>
                            <div class="detail-value">${userEmail || 'N/A'}</div>
                        </div>
                    </div>
                </div>

                ${transaction.checkout_request_id ? `
                <div class="detail-section">
                    <h3>M-Pesa Details</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <div class="detail-label">Checkout Request ID</div>
                            <div class="detail-value" style="font-family: monospace; font-size: 0.85rem;">${transaction.checkout_request_id}</div>
                        </div>
                        ${transaction.merchant_request_id ? `
                        <div class="detail-item">
                            <div class="detail-label">Merchant Request ID</div>
                            <div class="detail-value" style="font-family: monospace; font-size: 0.85rem;">${transaction.merchant_request_id}</div>
                        </div>
                        ` : ''}
                        ${transaction.mpesa_receipt_number ? `
                        <div class="detail-item">
                            <div class="detail-label">M-Pesa Receipt</div>
                            <div class="detail-value"><strong>${transaction.mpesa_receipt_number}</strong></div>
                        </div>
                        ` : ''}
                        ${transaction.transaction_date ? `
                        <div class="detail-item">
                            <div class="detail-label">Transaction Date</div>
                            <div class="detail-value">${formatDateTime(transaction.transaction_date)}</div>
                        </div>
                        ` : ''}
                    </div>
                </div>
                ` : ''}

                ${statusTimeline.length > 0 ? `
                <div class="detail-section">
                    <h3>Status Change Timeline</h3>
                    <div class="timeline-container">
                        ${statusTimeline.map(entry => `
                            <div class="timeline-entry">
                                <div class="timeline-dot"></div>
                                <div class="timeline-content">
                                    <div class="timeline-status">
                                        <span class="status-badge status-${entry.status}">${formatStatus(entry.status)}</span>
                                    </div>
                                    <div class="timeline-timestamp">${formatDateTime(entry.timestamp)}</div>
                                    ${entry.admin_name ? `
                                        <div class="timeline-admin">By: ${entry.admin_name}</div>
                                    ` : ''}
                                    ${entry.details ? `
                                        <div class="timeline-details">${entry.details}</div>
                                    ` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}

                ${transaction.failure_reason || transaction.rejection_reason || transaction.notes ? `
                <div class="detail-section">
                    <h3>${transaction.rejection_reason ? 'Rejection Information' : transaction.notes ? 'Admin Notes' : 'Error Information'}</h3>
                    ${transaction.rejection_reason ? `
                        <div style="padding: 1rem; background: #fee2e2; border-left: 4px solid #ef4444; border-radius: 8px; margin-bottom: 1rem;">
                            <div style="font-weight: 600; color: #991b1b; margin-bottom: 0.5rem;">Rejection Reason:</div>
                            <p style="color: #ef4444; margin: 0;">${transaction.rejection_reason}</p>
                        </div>
                    ` : ''}
                    ${transaction.failure_reason && !transaction.rejection_reason ? `
                        <div style="padding: 1rem; background: #fee2e2; border-left: 4px solid #ef4444; border-radius: 8px; margin-bottom: 1rem;">
                            <div style="font-weight: 600; color: #991b1b; margin-bottom: 0.5rem;">Failure Reason:</div>
                            <p style="color: #ef4444; margin: 0;">${transaction.failure_reason}</p>
                        </div>
                    ` : ''}
                    ${transaction.notes ? `
                        <div style="padding: 1rem; background: #f0f9ff; border-left: 4px solid #3b82f6; border-radius: 8px;">
                            <div style="font-weight: 600; color: #1e40af; margin-bottom: 0.5rem;">Admin Notes:</div>
                            <p style="color: #1e3a8a; margin: 0; white-space: pre-wrap;">${transaction.notes}</p>
                        </div>
                    ` : ''}
                    ${transaction.verified_by ? `
                        <div style="margin-top: 1rem; padding: 0.75rem; background: #f8fafc; border-radius: 6px; font-size: 0.875rem; color: #64748b;">
                            <strong>Processed by:</strong> Admin (User ID: ${transaction.verified_by})<br>
                            ${transaction.verified_at ? `<strong>Processed at:</strong> ${formatDateTime(transaction.verified_at)}` : ''}
                        </div>
                    ` : ''}
                </div>
                ` : ''}

                ${callbackData ? `
                <div class="detail-section">
                    <h3>M-Pesa Callback Data</h3>
                    <pre style="background: #f8fafc; padding: 1rem; border-radius: 8px; overflow-x: auto; font-size: 0.85rem;">${JSON.stringify(callbackData, null, 2)}</pre>
                </div>
                ` : ''}

                ${transaction.payment_status === 'awaiting_verification' ? `
                <div class="detail-section" style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 1.5rem;">
                    <h3 style="color: #f59e0b; margin-bottom: 1rem;">⏳ Manual Payment Verification</h3>
                    
                    <div class="detail-grid" style="margin-bottom: 1rem;">
                        <div class="detail-item">
                            <div class="detail-label">Receipt Code</div>
                            <div class="detail-value"><strong>${transaction.mpesa_receipt_number || transaction.payment_reference || 'Not provided'}</strong></div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Phone Number</div>
                            <div class="detail-value">${transaction.phone_number}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Amount</div>
                            <div class="detail-value">KES ${parseFloat(transaction.amount || 0).toLocaleString()}</div>
                        </div>
                    </div>

                    <div class="form-group" style="margin-bottom: 1rem;">
                        <label for="verificationNotes" style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #1e293b;">
                            Admin Notes / Verification Comments
                        </label>
                        <textarea 
                            id="verificationNotes" 
                            placeholder="Enter any notes or comments about this verification..."
                            style="width: 100%; min-height: 100px; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; font-family: inherit; font-size: 0.95rem; resize: vertical;"
                        ></textarea>
                        <small style="color: #64748b; display: block; margin-top: 0.25rem;">
                            Optional: Add notes about the verification (e.g., "Verified via M-Pesa statement", "Confirmed with customer", etc.)
                        </small>
                    </div>

                    <div style="display: flex; flex-wrap: wrap; gap: 1rem; align-items: center;">
                        <button class="btn-submit" onclick="approveManualPayment('${transaction.id}')" style="flex: 1; min-width: 150px;">
                            ✓ Approve Payment
                        </button>
                        <button class="btn-cancel" onclick="rejectManualPayment('${transaction.id}')" style="flex: 1; min-width: 150px;">
                            ✗ Reject Payment
                        </button>
                    </div>
                    
                    <div style="margin-top: 1rem; padding: 0.75rem; background: #fff7ed; border-radius: 6px; font-size: 0.875rem; color: #92400e;">
                        <strong>⚠️ Important:</strong> Verify the payment details carefully before approving. Approved payments will activate the user's account.
                    </div>
                </div>
                ` : ''}

                <div class="detail-section">
                    <h3>Admin Actions</h3>
                    <div style="display: flex; flex-wrap: wrap; gap: 1rem;">
                        ${['completed', 'verified'].includes(transaction.payment_status) ? `
                            <button class="btn-action" onclick="initiateRefund('${transaction.id}')" style="background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);">💸 Initiate Refund</button>
                        ` : ''}
                        ${!['rejected', 'refunded'].includes(transaction.payment_status) ? `
                            <button class="btn-action" onclick="markSuspicious('${transaction.id}')" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">⚠️ Mark Suspicious</button>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;

    // Append modal to body
    const existingModal = document.getElementById('mpesaDetailModal');
    if (existingModal) {
        existingModal.remove();
    }
    document.body.insertAdjacentHTML('beforeend', XSSProtection.sanitize(modalHTML));
    
    // Add timeline styles if not already present
    addTimelineStyles();
}

// Load status change timeline from audit logs
async function loadStatusTimeline(transactionId) {
    try {
        // Query audit logs for this transaction
        const { data: auditLogs, error: auditError } = await mpesaSupabase
            .from('audit_logs')
            .select(`
                *,
                users:user_id (
                    full_name,
                    email
                )
            `)
            .eq('details->>entity_type', 'mpesa_payment')
            .eq('details->>entity_id', transactionId)
            .order('timestamp', { ascending: true });

        if (auditError && auditError.code !== 'PGRST116') { // PGRST116 means no rows found
            console.error('Error loading audit logs:', auditError);
        }

        // Also get status changes from the payment record itself
        const { data: payment, error: paymentError } = await mpesaSupabase
            .from('stokika_kit_payments')
            .select('*')
            .eq('id', transactionId)
            .single();

        if (paymentError) {
            console.error('Error loading payment:', paymentError);
            return [];
        }

        const timeline = [];

        // Add creation event
        timeline.push({
            status: 'pending',
            timestamp: payment.created_at,
            details: 'Payment initiated'
        });

        // Add audit log entries
        if (auditLogs && auditLogs.length > 0) {
            auditLogs.forEach(log => {
                const details = log.details || {};
                timeline.push({
                    status: details.new_status || payment.payment_status,
                    timestamp: log.timestamp,
                    admin_name: log.users?.full_name || log.users?.email,
                    details: log.action
                });
            });
        }

        // Add verified/rejected events if present
        if (payment.verified_at) {
            timeline.push({
                status: payment.payment_status,
                timestamp: payment.verified_at,
                details: 'Payment verified by admin'
            });
        }

        // Add current status if different from creation
        if (payment.payment_status !== 'pending' && payment.updated_at !== payment.created_at) {
            const lastEntry = timeline[timeline.length - 1];
            // Only add if not already in timeline
            if (!lastEntry || lastEntry.timestamp !== payment.updated_at) {
                timeline.push({
                    status: payment.payment_status,
                    timestamp: payment.updated_at,
                    details: getStatusChangeMessage(payment.payment_status)
                });
            }
        }

        // Remove duplicates and sort by timestamp
        const uniqueTimeline = timeline.filter((item, index, self) =>
            index === self.findIndex(t => t.timestamp === item.timestamp && t.status === item.status)
        ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        return uniqueTimeline;
    } catch (error) {
        console.error('Error loading status timeline:', error);
        return [];
    }
}

// Get status change message
function getStatusChangeMessage(status) {
    const messages = {
        'completed': 'Payment completed successfully',
        'verified': 'Payment verified',
        'failed': 'Payment failed',
        'timeout': 'Payment request timed out',
        'awaiting_verification': 'Awaiting manual verification',
        'rejected': 'Payment rejected',
        'refunded': 'Payment refunded',
        'callback_missing': 'Callback not received'
    };
    return messages[status] || `Status changed to ${status}`;
}

// Add timeline styles
function addTimelineStyles() {
    const styleId = 'mpesa-timeline-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        .timeline-container {
            position: relative;
            padding: 1rem 0;
        }
        
        .timeline-entry {
            position: relative;
            padding-left: 2.5rem;
            padding-bottom: 1.5rem;
        }
        
        .timeline-entry:last-child {
            padding-bottom: 0;
        }
        
        .timeline-entry::before {
            content: '';
            position: absolute;
            left: 0.625rem;
            top: 1.5rem;
            bottom: -0.5rem;
            width: 2px;
            background: #e5e7eb;
        }
        
        .timeline-entry:last-child::before {
            display: none;
        }
        
        .timeline-dot {
            position: absolute;
            left: 0;
            top: 0.5rem;
            width: 1.25rem;
            height: 1.25rem;
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .timeline-content {
            background: #f8fafc;
            padding: 1rem;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
        }
        
        .timeline-status {
            margin-bottom: 0.5rem;
        }
        
        .timeline-timestamp {
            color: #64748b;
            font-size: 0.875rem;
            margin-bottom: 0.25rem;
        }
        
        .timeline-admin {
            color: #475569;
            font-size: 0.875rem;
            margin-bottom: 0.25rem;
            font-weight: 500;
        }
        
        .timeline-details {
            color: #64748b;
            font-size: 0.875rem;
            margin-top: 0.5rem;
            padding-top: 0.5rem;
            border-top: 1px solid #e5e7eb;
        }
    `;
    document.head.appendChild(style);
}

// Close transaction detail modal
function closeMpesaDetailModal() {
    const modal = document.getElementById('mpesaDetailModal');
    if (modal) {
        modal.remove();
    }
}

// Export transactions to CSV
// Task 16: Implement export functionality
// Requirements: 8.6, 23.5
function exportMpesaTransactions() {
    if (!currentMpesaTransactions || currentMpesaTransactions.length === 0) {
        alert('No transactions to export');
        return;
    }

    // Define all fields for comprehensive export
    const headers = [
        'Transaction ID',
        'Created At',
        'Updated At',
        'Application Code',
        'User Type',
        'User Name',
        'User Email',
        'Phone Number (Masked)',
        'Amount (KES)',
        'Payment Method',
        'Status',
        'M-Pesa Receipt Number',
        'Checkout Request ID',
        'Merchant Request ID',
        'Transaction Date',
        'Verified At',
        'Verified By',
        'Failure Reason',
        'Rejection Reason',
        'Admin Notes'
    ];

    // Map transactions to rows with all fields
    const rows = currentMpesaTransactions.map(t => {
        const userName = t.user_type === 'field_agent' 
            ? t.field_agents?.full_name 
            : t.supervisors?.full_name;
        
        const userEmail = t.user_type === 'field_agent' 
            ? t.field_agents?.email 
            : t.supervisors?.email;

        return [
            t.id || '',
            formatDateTimeForCSV(t.created_at),
            formatDateTimeForCSV(t.updated_at),
            t.application_code || '',
            formatUserType(t.user_type),
            userName || '',
            userEmail || '',
            maskPhoneNumber(t.phone_number),
            formatCurrencyForCSV(t.amount),
            t.payment_method || 'mpesa_stk',
            formatStatus(t.payment_status),
            t.mpesa_receipt_number || '',
            t.checkout_request_id || '',
            t.merchant_request_id || '',
            formatDateTimeForCSV(t.transaction_date),
            formatDateTimeForCSV(t.verified_at),
            t.verified_by || '',
            t.failure_reason || '',
            t.rejection_reason || '',
            t.notes || ''
        ];
    });

    // Create CSV content with proper escaping
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => escapeCSVCell(cell)).join(','))
    ].join('\n');

    // Generate filename with date range
    const filename = generateExportFilename();

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL object
    setTimeout(() => URL.revokeObjectURL(url), 100);

    // Show success notification
    showNotification(`Exported ${rows.length} transactions to ${filename}`, 'success');
}

// Helper function: Format currency for CSV (KES with 2 decimal places)
function formatCurrencyForCSV(amount) {
    if (!amount && amount !== 0) return '0.00';
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return '0.00';
    return numAmount.toFixed(2);
}

// Helper function: Format date/time for CSV (human-readable with timezone)
function formatDateTimeForCSV(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    // Format: "2024-01-15 14:30:45 EAT"
    return date.toLocaleString('en-KE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
    });
}

// Helper function: Escape CSV cell content (handle commas, quotes, newlines)
function escapeCSVCell(cell) {
    if (cell === null || cell === undefined) {
        return '""';
    }
    
    const cellString = String(cell);
    
    // If cell contains comma, quote, or newline, wrap in quotes and escape quotes
    if (cellString.includes(',') || cellString.includes('"') || cellString.includes('\n') || cellString.includes('\r')) {
        return '"' + cellString.replace(/"/g, '""') + '"';
    }
    
    return cellString;
}

// Helper function: Generate export filename with date range
function generateExportFilename() {
    const now = new Date();
    const timestamp = now.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Check if filters include date range
    if (currentMpesaFilters.dateFrom && currentMpesaFilters.dateTo) {
        // Format: mpesa-transactions-2024-01-01-to-2024-01-31.csv
        return `mpesa-transactions-${currentMpesaFilters.dateFrom}-to-${currentMpesaFilters.dateTo}.csv`;
    } else if (currentMpesaFilters.dateFrom) {
        // Format: mpesa-transactions-from-2024-01-01.csv
        return `mpesa-transactions-from-${currentMpesaFilters.dateFrom}.csv`;
    } else if (currentMpesaFilters.dateTo) {
        // Format: mpesa-transactions-until-2024-01-31.csv
        return `mpesa-transactions-until-${currentMpesaFilters.dateTo}.csv`;
    } else {
        // Format: mpesa-transactions-2024-01-15.csv (current date)
        return `mpesa-transactions-${timestamp}.csv`;
    }
}

// Utility: Mask phone number
function maskPhoneNumber(phone) {
    if (!phone || phone.length < 8) return phone || 'N/A';
    // Format: 254XXX***678
    return phone.substring(0, 6) + '***' + phone.substring(phone.length - 3);
}

// Utility: Format date and time
function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-KE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Utility: Format user type
function formatUserType(type) {
    const types = {
        'field_agent': 'Field Agent',
        'supervisor': 'Supervisor'
    };
    return types[type] || type;
}

// Utility: Format status
function formatStatus(status) {
    const statuses = {
        'pending': 'Pending',
        'completed': 'Completed',
        'verified': 'Verified',
        'failed': 'Failed',
        'timeout': 'Timeout',
        'awaiting_verification': 'Awaiting Verification',
        'rejected': 'Rejected',
        'refunded': 'Refunded',
        'refund_pending': 'Refund Pending',
        'callback_missing': 'Callback Missing'
    };
    return statuses[status] || status;
}

// Show notification
function showNotification(message, type = 'info') {
    // Simple notification - can be enhanced
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // Create a simple toast notification
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Approve manual payment (admin action) - Enhanced with notes and user activation
async function approveManualPayment(transactionId) {
    // Get verification notes from the textarea
    const notesTextarea = document.getElementById('verificationNotes');
    const adminNotes = notesTextarea ? notesTextarea.value.trim() : '';

    if (!confirm('Are you sure you want to approve this payment? This will activate the user\'s account and mark the payment as completed.')) {
        return;
    }

    try {
        // Get current user (admin)
        const { data: { user } } = await mpesaSupabase.auth.getUser();
        
        if (!user) {
            throw new Error('No authenticated user found');
        }

        // Get payment details first
        const { data: payment, error: fetchError } = await mpesaSupabase
            .from('stokika_kit_payments')
            .select('*, application_code, user_type')
            .eq('id', transactionId)
            .single();

        if (fetchError) throw fetchError;

        // Update payment status to completed
        const { error: updateError } = await mpesaSupabase
            .from('stokika_kit_payments')
            .update({
                payment_status: 'completed',
                verified_by: user.id,
                verified_at: new Date().toISOString(),
                notes: adminNotes || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', transactionId);

        if (updateError) throw updateError;

        // Activate user account - update kit_paid status
        await activateKitPayment(payment.application_code, payment.user_type, transactionId);

        // Log the action to audit trail
        await logAuditAction('approve_manual_mpesa_payment', {
            entity_type: 'mpesa_payment',
            entity_id: transactionId,
            new_status: 'completed',
            admin_notes: adminNotes,
            application_code: payment.application_code,
            user_type: payment.user_type
        });

        showNotification('Payment approved successfully! User account has been activated.', 'success');
        closeMpesaDetailModal();
        await loadMpesaTransactionList();
    } catch (error) {
        console.error('Error approving payment:', error);
        alert('Failed to approve payment: ' + error.message);
    }
}

// Activate kit payment and update user record
async function activateKitPayment(applicationCode, userType, paymentId) {
    try {
        const tableName = userType === 'field_agent' ? 'field_agents' : 'supervisors';
        
        // Update the user's kit payment status
        const { error } = await mpesaSupabase
            .from(tableName)
            .update({
                kit_paid: true,
                kit_payment_date: new Date().toISOString(),
                kit_payment_id: paymentId
            })
            .eq('application_code', applicationCode);

        if (error) {
            console.error('Error activating kit payment:', error);
            throw error;
        }

        console.log(`Kit payment activated for ${applicationCode} (${userType})`);
    } catch (error) {
        console.error('Error in activateKitPayment:', error);
        throw error;
    }
}

// Reject manual payment (admin action) - Enhanced with better UX and audit trail
async function rejectManualPayment(transactionId) {
    // Get verification notes from the textarea (if present, use as context)
    const notesTextarea = document.getElementById('verificationNotes');
    const adminNotes = notesTextarea ? notesTextarea.value.trim() : '';

    // Prompt for rejection reason (required)
    const rejectionReason = prompt('Enter rejection reason (required):\n\nExamples:\n- Invalid receipt number\n- Amount mismatch\n- Duplicate payment\n- Unable to verify');
    
    if (!rejectionReason || rejectionReason.trim() === '') {
        alert('Rejection reason is required. Payment not rejected.');
        return;
    }

    if (!confirm(`Are you sure you want to reject this payment?\n\nReason: ${rejectionReason}\n\nThe user will be notified of this rejection.`)) {
        return;
    }

    try {
        // Get current user (admin)
        const { data: { user } } = await mpesaSupabase.auth.getUser();
        
        if (!user) {
            throw new Error('No authenticated user found');
        }

        // Get payment details first
        const { data: payment, error: fetchError } = await mpesaSupabase
            .from('stokika_kit_payments')
            .select('*, application_code, user_type')
            .eq('id', transactionId)
            .single();

        if (fetchError) throw fetchError;

        // Combine admin notes with rejection reason
        const fullNotes = adminNotes 
            ? `${adminNotes}\n\nREJECTION REASON: ${rejectionReason}`
            : `REJECTION REASON: ${rejectionReason}`;

        // Update payment status to rejected
        const { error: updateError } = await mpesaSupabase
            .from('stokika_kit_payments')
            .update({
                payment_status: 'rejected',
                rejection_reason: rejectionReason.trim(),
                notes: fullNotes,
                verified_by: user.id, // Record who rejected it
                verified_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', transactionId);

        if (updateError) throw updateError;

        // Log the action to audit trail
        await logAuditAction('reject_manual_mpesa_payment', {
            entity_type: 'mpesa_payment',
            entity_id: transactionId,
            new_status: 'rejected',
            rejection_reason: rejectionReason.trim(),
            admin_notes: adminNotes,
            application_code: payment.application_code,
            user_type: payment.user_type
        });

        // TODO: Send notification to user about rejection
        // This would be implemented when notification system is ready

        showNotification('Payment rejected. User should be notified of the rejection.', 'info');
        closeMpesaDetailModal();
        await loadMpesaTransactionList();
    } catch (error) {
        console.error('Error rejecting payment:', error);
        alert('Failed to reject payment: ' + error.message);
    }
}

// Mark payment as suspicious (admin action)
async function markSuspicious(transactionId) {
    const reason = prompt('Enter reason for marking as suspicious:');
    if (!reason) return;

    if (!confirm('Are you sure you want to mark this payment as suspicious? This will flag it for further investigation.')) {
        return;
    }

    try {
        // Add suspicious flag to the payment record
        const { error } = await mpesaSupabase
            .from('stokika_kit_payments')
            .update({
                failure_reason: `SUSPICIOUS: ${reason}`,
                updated_at: new Date().toISOString()
            })
            .eq('id', transactionId);

        if (error) throw error;

        // Log the action to audit trail
        await logAuditAction('mark_mpesa_suspicious', {
            entity_type: 'mpesa_payment',
            entity_id: transactionId,
            reason: reason
        });

        showNotification('Payment marked as suspicious', 'success');
        closeMpesaDetailModal();
        await loadMpesaTransactionList();
    } catch (error) {
        console.error('Error marking payment as suspicious:', error);
        alert('Failed to mark payment as suspicious: ' + error.message);
    }
}

// Initiate refund (admin action)
async function initiateRefund(transactionId) {
    const reason = prompt('Enter refund reason:');
    if (!reason) return;

    if (!confirm('Are you sure you want to initiate a refund for this payment? This action should be coordinated with M-Pesa refund processing.')) {
        return;
    }

    try {
        const { error } = await mpesaSupabase
            .from('stokika_kit_payments')
            .update({
                payment_status: 'refund_pending',
                rejection_reason: reason,
                updated_at: new Date().toISOString()
            })
            .eq('id', transactionId);

        if (error) throw error;

        // Log the action to audit trail
        await logAuditAction('initiate_mpesa_refund', {
            entity_type: 'mpesa_payment',
            entity_id: transactionId,
            new_status: 'refund_pending',
            reason: reason
        });

        showNotification('Refund initiated. Please process the refund in M-Pesa and update status to "refunded" when complete.', 'success');
        closeMpesaDetailModal();
        await loadMpesaTransactionList();
    } catch (error) {
        console.error('Error initiating refund:', error);
        alert('Failed to initiate refund: ' + error.message);
    }
}

// Log audit action
async function logAuditAction(action, details) {
    try {
        // Get current user info
        const { data: { user } } = await mpesaSupabase.auth.getUser();
        
        if (!user) {
            console.warn('No authenticated user for audit log');
            return;
        }

        await mpesaSupabase
            .from('audit_logs')
            .insert({
                user_id: user.id,
                action: action,
                details: details,
                timestamp: new Date().toISOString()
            });
    } catch (error) {
        console.error('Error logging audit action:', error);
        // Don't fail the main action if audit logging fails
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (mpesaRealtimeSubscription) {
        mpesaSupabase.removeChannel(mpesaRealtimeSubscription);
    }
    if (mpesaAutoRefreshInterval) {
        clearInterval(mpesaAutoRefreshInterval);
    }
});

// =============================================================================
// RECONCILIATION REPORT FEATURE (Task 15)
// =============================================================================

// Task 15.1: Implement unmatched transactions detection
async function detectUnmatchedTransactions() {
    try {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        
        // Query payments with status 'pending' older than 5 minutes
        const { data: pendingPayments, error: pendingError } = await mpesaSupabase
            .from('stokika_kit_payments')
            .select(`
                *,
                field_agents(full_name, email),
                supervisors(full_name, email)
            `)
            .eq('payment_status', 'pending')
            .lt('created_at', fiveMinutesAgo.toISOString())
            .order('created_at', { ascending: false });

        if (pendingError) throw pendingError;

        // Query payments marked 'completed' without mpesa_transactions entry
        const { data: completedPayments, error: completedError } = await mpesaSupabase
            .from('stokika_kit_payments')
            .select(`
                *,
                field_agents(full_name, email),
                supervisors(full_name, email)
            `)
            .in('payment_status', ['completed', 'verified'])
            .not('checkout_request_id', 'is', null)
            .order('created_at', { ascending: false });

        if (completedError) throw completedError;

        // Filter completed payments without matching mpesa_transactions
        const unmatchedCompleted = [];
        for (const payment of completedPayments || []) {
            const { data: callback, error: callbackError } = await mpesaSupabase
                .from('mpesa_transactions')
                .select('id')
                .eq('checkout_request_id', payment.checkout_request_id)
                .single();

            if (callbackError && callbackError.code === 'PGRST116') {
                // No matching callback found
                unmatchedCompleted.push(payment);
            }
        }

        return {
            pendingOld: pendingPayments || [],
            completedWithoutCallback: unmatchedCompleted,
            totalDiscrepancies: (pendingPayments?.length || 0) + unmatchedCompleted.length
        };
    } catch (error) {
        console.error('Error detecting unmatched transactions:', error);
        return {
            pendingOld: [],
            completedWithoutCallback: [],
            totalDiscrepancies: 0,
            error: error.message
        };
    }
}

// Task 15.2: Implement daily reconciliation summary
async function generateDailyReconciliationSummary() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Query all transactions for today
        const { data: todaysTransactions, error: transError } = await mpesaSupabase
            .from('stokika_kit_payments')
            .select('*')
            .gte('created_at', today.toISOString())
            .lt('created_at', tomorrow.toISOString());

        if (transError) throw transError;

        // Calculate totals by status
        const statusSummary = {};
        let totalAmount = 0;
        let completedAmount = 0;

        (todaysTransactions || []).forEach(t => {
            const status = t.payment_status;
            const amount = parseFloat(t.amount) || 0;

            if (!statusSummary[status]) {
                statusSummary[status] = { count: 0, amount: 0 };
            }
            statusSummary[status].count++;
            statusSummary[status].amount += amount;
            totalAmount += amount;

            if (['completed', 'verified'].includes(status)) {
                completedAmount += amount;
            }
        });

        // Get unmatched transactions
        const unmatched = await detectUnmatchedTransactions();

        // Count callback missing
        const { count: callbackMissingCount } = await mpesaSupabase
            .from('stokika_kit_payments')
            .select('*', { count: 'exact', head: true })
            .eq('payment_status', 'callback_missing')
            .gte('created_at', today.toISOString())
            .lt('created_at', tomorrow.toISOString());

        return {
            date: today.toISOString().split('T')[0],
            statusSummary,
            totalTransactions: todaysTransactions?.length || 0,
            totalAmount,
            completedAmount,
            discrepancies: unmatched.totalDiscrepancies,
            callbackMissing: callbackMissingCount || 0,
            pendingOldCount: unmatched.pendingOld.length,
            completedWithoutCallbackCount: unmatched.completedWithoutCallback.length
        };
    } catch (error) {
        console.error('Error generating daily reconciliation summary:', error);
        return {
            error: error.message,
            date: new Date().toISOString().split('T')[0],
            statusSummary: {},
            totalTransactions: 0,
            totalAmount: 0,
            completedAmount: 0,
            discrepancies: 0,
            callbackMissing: 0
        };
    }
}

// Task 15.3: Create manual transaction matching UI
async function loadOrphanedTransactions() {
    try {
        // Get orphaned payments (pending > 10 minutes without callback)
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        const { data: orphanedPayments, error: paymentsError } = await mpesaSupabase
            .from('stokika_kit_payments')
            .select(`
                *,
                field_agents(full_name, email),
                supervisors(full_name, email)
            `)
            .in('payment_status', ['pending', 'callback_missing'])
            .lt('created_at', tenMinutesAgo.toISOString())
            .not('checkout_request_id', 'is', null)
            .order('created_at', { ascending: false })
            .limit(50);

        if (paymentsError) throw paymentsError;

        // Get orphaned callbacks (callbacks without matching payments)
        const { data: allCallbacks, error: callbacksError } = await mpesaSupabase
            .from('mpesa_transactions')
            .select('*')
            .order('transaction_date', { ascending: false })
            .limit(50);

        if (callbacksError) throw callbacksError;

        // Filter callbacks without matching payments
        const orphanedCallbacks = [];
        for (const callback of allCallbacks || []) {
            if (!callback.checkout_request_id) continue;

            const { data: payment, error: matchError } = await mpesaSupabase
                .from('stokika_kit_payments')
                .select('id')
                .eq('checkout_request_id', callback.checkout_request_id)
                .single();

            if (matchError && matchError.code === 'PGRST116') {
                orphanedCallbacks.push(callback);
            }
        }

        return {
            orphanedPayments: orphanedPayments || [],
            orphanedCallbacks: orphanedCallbacks
        };
    } catch (error) {
        console.error('Error loading orphaned transactions:', error);
        return {
            orphanedPayments: [],
            orphanedCallbacks: [],
            error: error.message
        };
    }
}

// Manual matching function
async function manuallyMatchTransaction(paymentId, checkoutRequestId) {
    try {
        // Get current user (admin)
        const { data: { user } } = await mpesaSupabase.auth.getUser();
        
        if (!user) {
            throw new Error('No authenticated user found');
        }

        // Verify callback exists
        const { data: callback, error: callbackError } = await mpesaSupabase
            .from('mpesa_transactions')
            .select('*')
            .eq('checkout_request_id', checkoutRequestId)
            .single();

        if (callbackError) throw new Error('Callback not found for this Checkout Request ID');

        // Update payment record
        const updateData = {
            payment_status: callback.result_code === 0 ? 'completed' : 'failed',
            checkout_request_id: checkoutRequestId,
            updated_at: new Date().toISOString()
        };

        if (callback.result_code === 0) {
            // Extract transaction details from callback
            const metadata = callback.callback_metadata?.Item || [];
            const receiptNumber = metadata.find(i => i.Name === 'MpesaReceiptNumber')?.Value;
            const transactionDate = metadata.find(i => i.Name === 'TransactionDate')?.Value;

            if (receiptNumber) {
                updateData.mpesa_receipt_number = receiptNumber;
            }
            if (transactionDate) {
                updateData.transaction_date = new Date(String(transactionDate)).toISOString();
            }
            updateData.verified_at = new Date().toISOString();
        } else {
            updateData.failure_reason = callback.result_desc || 'Payment failed';
        }

        const { error: updateError } = await mpesaSupabase
            .from('stokika_kit_payments')
            .update(updateData)
            .eq('id', paymentId);

        if (updateError) throw updateError;

        // Log the manual matching action to audit trail
        await logAuditAction('manual_mpesa_transaction_match', {
            entity_type: 'mpesa_payment',
            entity_id: paymentId,
            checkout_request_id: checkoutRequestId,
            new_status: updateData.payment_status,
            matched_by: user.id
        });

        return { success: true, message: 'Transaction matched successfully' };
    } catch (error) {
        console.error('Error manually matching transaction:', error);
        return { success: false, error: error.message };
    }
}

// Display reconciliation report modal
async function showReconciliationReport() {
    try {
        // Show loading
        const loadingHTML = `
            <div class="modal show" id="reconciliationModal" style="display: flex;">
                <div class="modal-content" style="max-width: 1200px; max-height: 90vh; overflow-y: auto;">
                    <div class="modal-header">
                        <h2>🔍 Reconciliation Report</h2>
                        <button type="button" class="close" onclick="closeReconciliationModal()">&times;</button>
                    </div>
                    <div style="padding: 2rem; text-align: center;">
                        <div class="spinner" style="margin: 2rem auto;"></div>
                        <p>Loading reconciliation data...</p>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', XSSProtection.sanitize(loadingHTML));

        // Load data
        const [summary, unmatched, orphaned] = await Promise.all([
            generateDailyReconciliationSummary(),
            detectUnmatchedTransactions(),
            loadOrphanedTransactions()
        ]);

        // Build modal content
        const modalHTML = `
            <div class="modal show" id="reconciliationModal" style="display: flex;">
                <div class="modal-content" style="max-width: 1200px; max-height: 90vh; overflow-y: auto;">
                    <div class="modal-header">
                        <h2>🔍 Reconciliation Report</h2>
                        <button type="button" class="close" onclick="closeReconciliationModal()">&times;</button>
                    </div>
                    
                    <!-- Daily Summary Section -->
                    <div class="detail-section">
                        <h3>📊 Daily Summary (${summary.date})</h3>
                        <div class="stats-grid" style="margin-top: 1rem;">
                            <div class="stat-card">
                                <div class="stat-icon">📈</div>
                                <div class="stat-info">
                                    <div class="stat-number">${summary.totalTransactions}</div>
                                    <div class="stat-label">Total Transactions</div>
                                </div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-icon">💰</div>
                                <div class="stat-info">
                                    <div class="stat-number">KES ${summary.completedAmount.toLocaleString()}</div>
                                    <div class="stat-label">Completed Amount</div>
                                </div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-icon" style="background: ${summary.discrepancies === 0 ? 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'};">⚠️</div>
                                <div class="stat-info">
                                    <div class="stat-number">${summary.discrepancies}</div>
                                    <div class="stat-label">Discrepancies</div>
                                </div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-icon" style="background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);">❌</div>
                                <div class="stat-info">
                                    <div class="stat-number">${summary.callbackMissing}</div>
                                    <div class="stat-label">Callback Missing</div>
                                </div>
                            </div>
                        </div>

                        <div style="margin-top: 1.5rem;">
                            <h4 style="margin-bottom: 1rem;">Status Breakdown</h4>
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Status</th>
                                        <th>Count</th>
                                        <th>Amount (KES)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${Object.entries(summary.statusSummary).map(([status, data]) => `
                                        <tr>
                                            <td><span class="status-badge status-${status}">${formatStatus(status)}</span></td>
                                            <td>${data.count}</td>
                                            <td>KES ${data.amount.toLocaleString()}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>

                        <div style="margin-top: 1rem; display: flex; gap: 1rem;">
                            <button class="btn-action" onclick="exportReconciliationCSV()" style="background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%);">
                                📥 Export CSV
                            </button>
                            <button class="btn-action" onclick="exportReconciliationPDF()" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);">
                                📄 Export PDF
                            </button>
                        </div>
                    </div>

                    <!-- Unmatched Transactions Section -->
                    <div class="detail-section" style="background: ${unmatched.totalDiscrepancies > 0 ? '#fef3c7' : '#f0fdf4'}; border-left: 4px solid ${unmatched.totalDiscrepancies > 0 ? '#f59e0b' : '#10b981'};">
                        <h3>⏳ Pending Payments (>5 minutes old)</h3>
                        ${unmatched.pendingOld.length === 0 ? `
                            <p style="color: #10b981; font-weight: 500;">✓ No pending payments older than 5 minutes</p>
                        ` : `
                            <p style="color: #f59e0b; margin-bottom: 1rem;">Found ${unmatched.pendingOld.length} pending payment(s) older than 5 minutes</p>
                            <table class="data-table" style="background: white;">
                                <thead>
                                    <tr>
                                        <th>Timestamp</th>
                                        <th>App Code</th>
                                        <th>Amount</th>
                                        <th>Phone</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${unmatched.pendingOld.map(t => `
                                        <tr>
                                            <td>${formatDateTime(t.created_at)}</td>
                                            <td><strong>${t.application_code}</strong></td>
                                            <td>KES ${parseFloat(t.amount).toLocaleString()}</td>
                                            <td>${maskPhoneNumber(t.phone_number)}</td>
                                            <td>
                                                <button class="btn-action btn-view" onclick="viewMpesaTransaction('${t.id}')" style="font-size: 0.85rem; padding: 0.4rem 0.8rem;">
                                                    View
                                                </button>
                                                <button class="btn-action" onclick="queryPaymentStatus('${t.checkout_request_id}')" style="background: #3b82f6; font-size: 0.85rem; padding: 0.4rem 0.8rem;">
                                                    Query Status
                                                </button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        `}
                    </div>

                    <!-- Completed Without Callback Section -->
                    <div class="detail-section" style="background: ${unmatched.completedWithoutCallback.length > 0 ? '#fee2e2' : '#f0fdf4'}; border-left: 4px solid ${unmatched.completedWithoutCallback.length > 0 ? '#ef4444' : '#10b981'};">
                        <h3>⚠️ Completed Payments Without Callback</h3>
                        ${unmatched.completedWithoutCallback.length === 0 ? `
                            <p style="color: #10b981; font-weight: 500;">✓ All completed payments have matching callbacks</p>
                        ` : `
                            <p style="color: #ef4444; margin-bottom: 1rem;">Found ${unmatched.completedWithoutCallback.length} completed payment(s) without callback record</p>
                            <table class="data-table" style="background: white;">
                                <thead>
                                    <tr>
                                        <th>Timestamp</th>
                                        <th>App Code</th>
                                        <th>Amount</th>
                                        <th>Receipt</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${unmatched.completedWithoutCallback.map(t => `
                                        <tr>
                                            <td>${formatDateTime(t.created_at)}</td>
                                            <td><strong>${t.application_code}</strong></td>
                                            <td>KES ${parseFloat(t.amount).toLocaleString()}</td>
                                            <td>${t.mpesa_receipt_number || 'N/A'}</td>
                                            <td>
                                                <button class="btn-action btn-view" onclick="viewMpesaTransaction('${t.id}')" style="font-size: 0.85rem; padding: 0.4rem 0.8rem;">
                                                    View
                                                </button>
                                                <button class="btn-action" onclick="markAsInvestigate('${t.id}')" style="background: #ef4444; font-size: 0.85rem; padding: 0.4rem 0.8rem;">
                                                    Investigate
                                                </button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        `}
                    </div>

                    <!-- Manual Matching Section -->
                    <div class="detail-section">
                        <h3>🔗 Manual Transaction Matching</h3>
                        <p style="color: #64748b; margin-bottom: 1rem;">
                            Use this section to manually match orphaned payments with callbacks when automatic matching fails.
                        </p>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-top: 1rem;">
                            <!-- Orphaned Payments -->
                            <div>
                                <h4 style="margin-bottom: 0.75rem;">Orphaned Payments</h4>
                                <div style="max-height: 300px; overflow-y: auto; border: 1px solid #e5e7eb; border-radius: 8px; padding: 0.5rem;">
                                    ${orphaned.orphanedPayments.length === 0 ? `
                                        <p style="color: #10b981; padding: 1rem; text-align: center;">No orphaned payments</p>
                                    ` : orphaned.orphanedPayments.map(p => `
                                        <div style="padding: 0.75rem; border-bottom: 1px solid #e5e7eb; cursor: pointer;" onclick="selectOrphanedPayment('${p.id}', '${p.checkout_request_id}', '${p.application_code}', ${p.amount})">
                                            <div style="font-weight: 600; color: #1e293b;">${p.application_code}</div>
                                            <div style="font-size: 0.875rem; color: #64748b;">
                                                KES ${parseFloat(p.amount).toLocaleString()} • ${formatDateTime(p.created_at)}
                                            </div>
                                            <div style="font-size: 0.75rem; color: #94a3b8; font-family: monospace;">
                                                ${p.checkout_request_id || 'No Checkout ID'}
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>

                            <!-- Orphaned Callbacks -->
                            <div>
                                <h4 style="margin-bottom: 0.75rem;">Orphaned Callbacks</h4>
                                <div style="max-height: 300px; overflow-y: auto; border: 1px solid #e5e7eb; border-radius: 8px; padding: 0.5rem;">
                                    ${orphaned.orphanedCallbacks.length === 0 ? `
                                        <p style="color: #10b981; padding: 1rem; text-align: center;">No orphaned callbacks</p>
                                    ` : orphaned.orphanedCallbacks.map(c => `
                                        <div style="padding: 0.75rem; border-bottom: 1px solid #e5e7eb; cursor: pointer;" onclick="selectOrphanedCallback('${c.checkout_request_id}', '${c.mpesa_receipt_number || 'N/A'}')">
                                            <div style="font-weight: 600; color: #1e293b;">${c.mpesa_receipt_number || 'No Receipt'}</div>
                                            <div style="font-size: 0.875rem; color: #64748b;">
                                                Result: ${c.result_code === 0 ? 'Success' : 'Failed'} • ${formatDateTime(c.transaction_date)}
                                            </div>
                                            <div style="font-size: 0.75rem; color: #94a3b8; font-family: monospace;">
                                                ${c.checkout_request_id}
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>

                        <!-- Matching Form -->
                        <div id="matchingForm" style="margin-top: 1.5rem; padding: 1rem; background: #f8fafc; border-radius: 8px; display: none;">
                            <h4 style="margin-bottom: 1rem;">Match Transaction</h4>
                            <div style="margin-bottom: 0.75rem;">
                                <strong>Payment ID:</strong> <span id="matchPaymentId"></span>
                            </div>
                            <div style="margin-bottom: 0.75rem;">
                                <strong>Checkout Request ID:</strong> <span id="matchCheckoutId" style="font-family: monospace; font-size: 0.9rem;"></span>
                            </div>
                            <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                                <button class="btn-submit" onclick="performManualMatch()">
                                    ✓ Confirm Match
                                </button>
                                <button class="btn-cancel" onclick="cancelManualMatch()">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Replace loading modal with full content
        const existingModal = document.getElementById('reconciliationModal');
        if (existingModal) {
            existingModal.remove();
        }
        document.body.insertAdjacentHTML('beforeend', XSSProtection.sanitize(modalHTML));

    } catch (error) {
        console.error('Error showing reconciliation report:', error);
        alert('Failed to load reconciliation report: ' + error.message);
        closeReconciliationModal();
    }
}

// Helper functions for manual matching UI
let selectedPaymentForMatching = null;

function selectOrphanedPayment(paymentId, checkoutRequestId, applicationCode, amount) {
    selectedPaymentForMatching = { paymentId, checkoutRequestId, applicationCode, amount };
    document.getElementById('matchingForm').style.display = 'block';
    document.getElementById('matchPaymentId').textContent = `${applicationCode} (${paymentId.substring(0, 8)}...)`;
    document.getElementById('matchCheckoutId').textContent = checkoutRequestId || 'None';
}

function selectOrphanedCallback(checkoutRequestId, receiptNumber) {
    if (!selectedPaymentForMatching) {
        alert('Please select a payment first');
        return;
    }
    document.getElementById('matchCheckoutId').textContent = checkoutRequestId;
}

async function performManualMatch() {
    if (!selectedPaymentForMatching) {
        alert('No payment selected');
        return;
    }

    const checkoutId = document.getElementById('matchCheckoutId').textContent.trim();
    if (!checkoutId || checkoutId === 'None') {
        alert('Please select a callback to match');
        return;
    }

    if (!confirm(`Match payment ${selectedPaymentForMatching.applicationCode} with callback ${checkoutId}?`)) {
        return;
    }

    const result = await manuallyMatchTransaction(selectedPaymentForMatching.paymentId, checkoutId);
    
    if (result.success) {
        showNotification('Transaction matched successfully!', 'success');
        cancelManualMatch();
        // Reload reconciliation report
        closeReconciliationModal();
        setTimeout(() => showReconciliationReport(), 500);
    } else {
        alert('Failed to match transaction: ' + result.error);
    }
}

function cancelManualMatch() {
    selectedPaymentForMatching = null;
    document.getElementById('matchingForm').style.display = 'none';
    document.getElementById('matchPaymentId').textContent = '';
    document.getElementById('matchCheckoutId').textContent = '';
}

// Close reconciliation modal
function closeReconciliationModal() {
    const modal = document.getElementById('reconciliationModal');
    if (modal) {
        modal.remove();
    }
    selectedPaymentForMatching = null;
}

// Export reconciliation to CSV
async function exportReconciliationCSV() {
    try {
        const summary = await generateDailyReconciliationSummary();
        const unmatched = await detectUnmatchedTransactions();

        const headers = ['Category', 'Status/Description', 'Count', 'Amount (KES)'];
        const rows = [];

        // Add summary rows
        rows.push(['Summary', 'Total Transactions', summary.totalTransactions, summary.totalAmount]);
        rows.push(['Summary', 'Completed Amount', '', summary.completedAmount]);
        rows.push(['Summary', 'Discrepancies', summary.discrepancies, '']);
        rows.push(['Summary', 'Callback Missing', summary.callbackMissing, '']);
        rows.push(['', '', '', '']); // Empty row

        // Add status breakdown
        rows.push(['Status Breakdown', '', '', '']);
        Object.entries(summary.statusSummary).forEach(([status, data]) => {
            rows.push(['Status', formatStatus(status), data.count, data.amount]);
        });
        rows.push(['', '', '', '']); // Empty row

        // Add unmatched details
        rows.push(['Discrepancies', '', '', '']);
        rows.push(['Discrepancies', 'Pending Payments (>5 min)', unmatched.pendingOld.length, '']);
        rows.push(['Discrepancies', 'Completed Without Callback', unmatched.completedWithoutCallback.length, '']);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        const timestamp = summary.date;
        
        link.setAttribute('href', url);
        link.setAttribute('download', `mpesa-reconciliation-${timestamp}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showNotification('Reconciliation report exported to CSV', 'success');
    } catch (error) {
        console.error('Error exporting reconciliation CSV:', error);
        alert('Failed to export CSV: ' + error.message);
    }
}

// Export reconciliation to PDF (placeholder - requires PDF library)
function exportReconciliationPDF() {
    alert('PDF export feature coming soon. Please use CSV export for now.');
    // TODO: Implement PDF generation using jsPDF or similar library
}

// Query payment status for pending transactions
async function queryPaymentStatus(checkoutRequestId) {
    if (!checkoutRequestId) {
        alert('No checkout request ID available');
        return;
    }

    if (!confirm(`Query M-Pesa status for checkout request:\n${checkoutRequestId}?`)) {
        return;
    }

    try {
        showNotification('Querying M-Pesa status...', 'info');
        
        // This would call the mpesa-status-query Edge Function
        // For now, just show a placeholder
        alert('Status query initiated. This feature requires the mpesa-status-query Edge Function to be deployed.');
        
        // TODO: Call Edge Function
        // const { data, error } = await mpesaSupabase.functions.invoke('mpesa-status-query', {
        //     body: { checkoutRequestId }
        // });
        
    } catch (error) {
        console.error('Error querying payment status:', error);
        alert('Failed to query payment status: ' + error.message);
    }
}

// Mark payment for investigation
async function markAsInvestigate(transactionId) {
    const notes = prompt('Enter investigation notes:');
    if (!notes) return;

    try {
        const { error } = await mpesaSupabase
            .from('stokika_kit_payments')
            .update({
                notes: `INVESTIGATION REQUIRED: ${notes}`,
                updated_at: new Date().toISOString()
            })
            .eq('id', transactionId);

        if (error) throw error;

        await logAuditAction('mark_mpesa_for_investigation', {
            entity_type: 'mpesa_payment',
            entity_id: transactionId,
            notes: notes
        });

        showNotification('Payment marked for investigation', 'success');
        
        // Reload reconciliation report
        closeReconciliationModal();
        setTimeout(() => showReconciliationReport(), 500);
    } catch (error) {
        console.error('Error marking payment for investigation:', error);
        alert('Failed to mark payment: ' + error.message);
    }
}

// =============================================================================
// END RECONCILIATION REPORT FEATURE
// =============================================================================

// Make functions globally available
window.loadMpesaTransactions = loadMpesaTransactions;
window.viewMpesaTransaction = viewMpesaTransaction;
window.closeMpesaDetailModal = closeMpesaDetailModal;
window.approveManualPayment = approveManualPayment;
window.rejectManualPayment = rejectManualPayment;
window.markSuspicious = markSuspicious;
window.initiateRefund = initiateRefund;

// Reconciliation functions
window.showReconciliationReport = showReconciliationReport;
window.closeReconciliationModal = closeReconciliationModal;
window.exportReconciliationCSV = exportReconciliationCSV;
window.exportReconciliationPDF = exportReconciliationPDF;
window.selectOrphanedPayment = selectOrphanedPayment;
window.selectOrphanedCallback = selectOrphanedCallback;
window.performManualMatch = performManualMatch;
window.cancelManualMatch = cancelManualMatch;
window.queryPaymentStatus = queryPaymentStatus;
window.markAsInvestigate = markAsInvestigate;
