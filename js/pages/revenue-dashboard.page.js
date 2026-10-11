// Revenue Dashboard JavaScript
let currentRevenuePeriod = 'day';
let revenueRefreshInterval = null;

// Initialize Revenue Dashboard
function initRevenueDashboard() {
    if (!adminSupabase) {
        console.error('Supabase client not initialized');
        return;
    }

    // Set up event listeners
    setupRevenueEventListeners();
    
    // Initial load
    loadRevenueData('day');
    
    // Auto-refresh every 60 seconds
    revenueRefreshInterval = setInterval(() => {
        loadRevenueData(currentRevenuePeriod);
    }, 60000);
}

// Set up event listeners
function setupRevenueEventListeners() {
    // Period tabs
    document.querySelectorAll('.period-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const period = this.getAttribute('data-period');
            switchRevenuePeriod(period);
        });
    });

    // Refresh button
    document.getElementById('btnRefreshRevenue').addEventListener('click', () => {
        loadRevenueData(currentRevenuePeriod);
    });

    // Toggle breakdown
    document.getElementById('btnToggleBreakdown').addEventListener('click', () => {
        toggleBreakdown();
    });
}

// Switch revenue period
function switchRevenuePeriod(period) {
    currentRevenuePeriod = period;
    
    // Update tab active state
    document.querySelectorAll('.period-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.getAttribute('data-period') === period) {
            tab.classList.add('active');
        }
    });
    
    // Load data for new period
    loadRevenueData(period);
}

// Get date range for period
function getDateRange(period) {
    const now = new Date();
    let startDate, endDate;

    switch(period) {
        case 'day':
            // Today from 00:00:00
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
            endDate = now;
            break;
        case 'week':
            // Current week (Sunday to today)
            const dayOfWeek = now.getDay();
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 0, 0, 0);
            endDate = now;
            break;
        case 'month':
            // Current month (1st to today)
            startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
            endDate = now;
            break;
        default:
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
            endDate = now;
    }

    return {
        start: startDate.toISOString(),
        end: endDate.toISOString()
    };
}

// Load revenue data
async function loadRevenueData(period) {
    if (!adminSupabase) return;

    const dateRange = getDateRange(period);
    showLoadingState();

    try {
        // Fetch all revenue data in parallel
        const [fieldAgentsData, supervisorsData, vendorsData, supplierPaymentsData] = await Promise.all([
            fetchFieldAgentsRevenue(dateRange),
            fetchSupervisorsRevenue(dateRange),
            fetchVendorsRevenue(dateRange),
            fetchSupplierPayments(dateRange)
        ]);

        // Calculate totals
        const fieldAgentsTotal = fieldAgentsData.total || 0;
        const supervisorsTotal = supervisorsData.total || 0;
        const vendorsTotal = vendorsData.total || 0;
        const supplierPaymentsTotal = supplierPaymentsData.total || 0;

        const totalRevenue = fieldAgentsTotal + supervisorsTotal + vendorsTotal;
        const netProfit = totalRevenue - supplierPaymentsTotal;
        const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

        // Update UI
        updateRevenueCards({
            totalRevenue,
            fieldAgents: { total: fieldAgentsTotal, count: fieldAgentsData.count },
            supervisors: { total: supervisorsTotal, count: supervisorsData.count },
            vendors: { total: vendorsTotal, count: vendorsData.count },
            supplierPayments: { total: supplierPaymentsTotal, count: supplierPaymentsData.count },
            netProfit,
            profitMargin
        });

        // Update breakdown tables
        updateBreakdownTables({
            fieldAgentsData,
            supervisorsData,
            vendorsData,
            supplierPaymentsData
        });

    } catch (error) {
        console.error('Error loading revenue data:', error);
        showErrorState();
    }
}

// Fetch Field Agents Revenue
async function fetchFieldAgentsRevenue(dateRange) {
    try {
        const { data, error } = await adminSupabase
            .from('stokika_kit_payments')
            .select('amount')
            .eq('user_type', 'field_agent')
            .in('payment_status', ['verified', 'completed'])
            .gte('created_at', dateRange.start)
            .lte('created_at', dateRange.end);

        if (error) throw error;

        const total = data.reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
        
        return {
            total,
            count: data.length,
            details: data
        };
    } catch (error) {
        console.error('Error fetching field agents revenue:', error);
        return { total: 0, count: 0, details: [] };
    }
}

// Fetch Supervisors Revenue
async function fetchSupervisorsRevenue(dateRange) {
    try {
        const { data, error } = await adminSupabase
            .from('stokika_kit_payments')
            .select('amount')
            .eq('user_type', 'supervisor')
            .in('payment_status', ['verified', 'completed'])
            .gte('created_at', dateRange.start)
            .lte('created_at', dateRange.end);

        if (error) throw error;

        const total = data.reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
        
        return {
            total,
            count: data.length,
            details: data
        };
    } catch (error) {
        console.error('Error fetching supervisors revenue:', error);
        return { total: 0, count: 0, details: [] };
    }
}

// Fetch Vendors Revenue (service fees from orders)
async function fetchVendorsRevenue(dateRange) {
    try {
        const { data, error } = await adminSupabase
            .from('orders')
            .select('service_fee_amount')
            .in('status', ['completed', 'delivered'])
            .gte('created_at', dateRange.start)
            .lte('created_at', dateRange.end);

        if (error) throw error;

        const total = data.reduce((sum, order) => sum + (parseFloat(order.service_fee_amount) || 0), 0);
        
        return {
            total,
            count: data.length,
            details: data
        };
    } catch (error) {
        console.error('Error fetching vendors revenue:', error);
        return { total: 0, count: 0, details: [] };
    }
}

// Fetch Supplier Payments (expenses)
async function fetchSupplierPayments(dateRange) {
    try {
        const { data, error } = await adminSupabase
            .from('payments')
            .select('amount')
            .in('status', ['paid', 'completed'])
            .gte('created_at', dateRange.start)
            .lte('created_at', dateRange.end);

        if (error) throw error;

        const total = data.reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
        
        return {
            total,
            count: data.length,
            details: data
        };
    } catch (error) {
        console.error('Error fetching supplier payments:', error);
        return { total: 0, count: 0, details: [] };
    }
}

// Update revenue cards
function updateRevenueCards(data) {
    // Format currency
    const formatCurrency = (amount) => {
        return `KES ${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    // Total Revenue
    document.getElementById('totalRevenue').textContent = formatCurrency(data.totalRevenue);
    document.getElementById('revenueChange').textContent = '+0%'; // Calculate actual change if you have historical data

    // Field Agents
    document.getElementById('agentsRevenue').textContent = formatCurrency(data.fieldAgents.total);
    document.getElementById('agentsCount').textContent = `${data.fieldAgents.count} payment${data.fieldAgents.count !== 1 ? 's' : ''}`;

    // Supervisors
    document.getElementById('supervisorsRevenue').textContent = formatCurrency(data.supervisors.total);
    document.getElementById('supervisorsCount').textContent = `${data.supervisors.count} payment${data.supervisors.count !== 1 ? 's' : ''}`;

    // Vendors
    document.getElementById('vendorsRevenue').textContent = formatCurrency(data.vendors.total);
    document.getElementById('vendorsCount').textContent = `${data.vendors.count} order${data.vendors.count !== 1 ? 's' : ''}`;

    // Supplier Payments (Expenses)
    document.getElementById('supplierPayments').textContent = formatCurrency(data.supplierPayments.total);
    document.getElementById('supplierPaymentsCount').textContent = `${data.supplierPayments.count} payment${data.supplierPayments.count !== 1 ? 's' : ''}`;

    // Net Profit
    const netProfitElement = document.getElementById('netProfit');
    netProfitElement.textContent = formatCurrency(data.netProfit);
    
    // Update profit/loss class
    netProfitElement.classList.remove('profit', 'loss');
    if (data.netProfit >= 0) {
        netProfitElement.classList.add('profit');
    } else {
        netProfitElement.classList.add('loss');
    }

    // Profit Margin
    document.getElementById('profitMargin').textContent = `${data.profitMargin.toFixed(1)}% margin`;

    // Remove loading state
    hideLoadingState();
}

// Update breakdown tables
function updateBreakdownTables(data) {
    // Revenue Sources Table
    const revenueSourcesHtml = `
        <div class="breakdown-table">
            <table>
                <thead>
                    <tr>
                        <th>Revenue Source</th>
                        <th>Count</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Field Agents (Kit Payments)</td>
                        <td>${data.fieldAgentsData.count}</td>
                        <td>KES ${data.fieldAgentsData.total.toLocaleString()}</td>
                    </tr>
                    <tr>
                        <td>Supervisors (Kit Payments)</td>
                        <td>${data.supervisorsData.count}</td>
                        <td>KES ${data.supervisorsData.total.toLocaleString()}</td>
                    </tr>
                    <tr>
                        <td>Vendors (Order Commissions)</td>
                        <td>${data.vendorsData.count}</td>
                        <td>KES ${data.vendorsData.total.toLocaleString()}</td>
                    </tr>
                    <tr class="total-row">
                        <td><strong>Total Revenue</strong></td>
                        <td><strong>${data.fieldAgentsData.count + data.supervisorsData.count + data.vendorsData.count}</strong></td>
                        <td><strong>KES ${(data.fieldAgentsData.total + data.supervisorsData.total + data.vendorsData.total).toLocaleString()}</strong></td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;

    // Expenses Table
    const expensesHtml = `
        <div class="breakdown-table">
            <table>
                <thead>
                    <tr>
                        <th>Expense Type</th>
                        <th>Count</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Supplier Payments</td>
                        <td>${data.supplierPaymentsData.count}</td>
                        <td class="expense-amount">KES ${data.supplierPaymentsData.total.toLocaleString()}</td>
                    </tr>
                    <tr class="total-row">
                        <td><strong>Total Expenses</strong></td>
                        <td><strong>${data.supplierPaymentsData.count}</strong></td>
                        <td class="expense-amount"><strong>KES ${data.supplierPaymentsData.total.toLocaleString()}</strong></td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;

    document.getElementById('revenueSourcesTable').innerHTML = XSSProtection.sanitize(revenueSourcesHtml);
    document.getElementById('expensesTable').innerHTML = XSSProtection.sanitize(expensesHtml);
}

// Toggle breakdown visibility
function toggleBreakdown() {
    const breakdownContent = document.getElementById('breakdownContent');
    const toggleBtn = document.getElementById('btnToggleBreakdown');
    
    if (breakdownContent.style.display === 'none') {
        breakdownContent.style.display = 'block';
        toggleBtn.textContent = '📉 Hide Detailed Breakdown';
    } else {
        breakdownContent.style.display = 'none';
        toggleBtn.textContent = '📈 View Detailed Breakdown';
    }
}

// Show loading state
function showLoadingState() {
    const amounts = document.querySelectorAll('.revenue-amount');
    amounts.forEach(el => {
        el.style.opacity = '0.5';
    });
}

// Hide loading state
function hideLoadingState() {
    const amounts = document.querySelectorAll('.revenue-amount');
    amounts.forEach(el => {
        el.style.opacity = '1';
    });
}

// Show error state
function showErrorState() {
    const amounts = document.querySelectorAll('.revenue-amount');
    amounts.forEach(el => {
        el.textContent = 'Error';
        el.style.color = '#ef4444';
    });
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (revenueRefreshInterval) {
        clearInterval(revenueRefreshInterval);
    }
});

// Export for global access
window.initRevenueDashboard = initRevenueDashboard;
