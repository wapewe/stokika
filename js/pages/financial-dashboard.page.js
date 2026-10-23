// Financial Dashboard with Charts
class FinancialDashboard {
    constructor() {
        this.supabase = null;
        this.charts = {};
    }

    async init() {
        this.supabase = initSupabase();
        if (!this.supabase) throw new Error('Database connection failed');
        await this.loadFinancialDashboard();
    }

    async loadFinancialDashboard() {
        try {
            const container = document.getElementById('financialContent') || document.createElement('div');
            container.innerHTML = XSSProtection.sanitize(`
                <div class="financial-dashboard">
                    <div class="fin...ial-controls">
                        <select id="financialPeriod">
                            <option value="7">Last 7 Days</option>
                            <option value="3sanitize(0)" selected>Last 30 Days</option>
                            <option value="90">Last 90 Days</option>
                            <option value="365">Last Year</option>
                        </select>
                        <button class="btn-primary" id="btnGenerateReport">📊 Generate Report</button>
                        <button class="btn-secondary" id="btnExportFinancial">📥 Export Data</button>
                    </div>
                    
                    <div class="financial-stats">
                        <div class="stat-card revenue">
                            <div class="stat-icon">💰</div>
                            <div class="stat-info">
                                <h4>Total Revenue</h4>
                                <span id="totalRevenue">KES 0</span>
                                <small id="revenueChange">+0%</small>
                            </div>
                        </div>
                        <div class="stat-card orders">
                            <div class="stat-icon">🛒</div>
                            <div class="stat-info">
                                <h4>Total Orders</h4>
                                <span id="totalOrders">0</span>
                                <small id="ordersChange">+0%</small>
                            </div>
                        </div>
                        <div class="stat-card commissions">
                            <div class="stat-icon">💼</div>
                            <div class="stat-info">
                                <h4>Commissions</h4>
                                <span id="totalCommissions">KES 0</span>
                                <small id="commissionsChange">+0%</small>
                            </div>
                        </div>
                        <div class="stat-card profit">
                            <div class="stat-icon">📈</div>
                            <div class="stat-info">
                                <h4>Net Profit</h4>
                                <span id="netProfit">KES 0</span>
                                <small id="profitMargin">0%</small>
                            </div>
                        </div>
                    </div>

                    <div class="charts-grid">
                        <div class="chart-card">
                            <h3>Revenue Trend</h3>
                            <canvas id="revenueChart"></canvas>
                        </div>
                        <div class="chart-card">
                            <h3>Order Volume</h3>
                            <canvas id="orderVolumeChart"></canvas>
                        </div>
                        <div class="chart-card">
                            <h3>Commission Breakdown</h3>
                            <canvas id="commissionChart"></canvas>
                        </div>
                        <div class="chart-card">
                            <h3>Payment Methods</h3>
                            <canvas id="paymentMethodChart"></canvas>
                        </div>
                    </div>

                    <div class="financial-tables">
                        <div class="table-section">
                            <h3>Top Performing Vendors</h3>
                            <div id="topVendorsTable"></div>
                        </div>
                        <div class="table-section">
                            <h3>Recent Transactions</h3>
                            <div id="recentTransactionsTable"></div>
                        </div>
                    </div>
                </div>
            `);

            this.attachEventListeners();
            await this.loadFinancialData();
        } catch (error) {
            console.error('Error loading financial dashboard:', error);
            showUserMessage('Error loading financial data', 'error');
        }
    }

    attachEventListeners() {
        const periodSelect = document.getElementById('financialPeriod');
        const generateBtn = document.getElementById('btnGenerateReport');
        const exportBtn = document.getElementById('btnExportFinancial');

        if (periodSelect) periodSelect.addEventListener('change', () => this.loadFinancialData());
        if (generateBtn) generateBtn.addEventListener('click', () => this.generateFinancialReport());
        if (exportBtn) exportBtn.addEventListener('click', () => this.exportFinancialData());
    }

    async loadFinancialData() {
        try {
            const period = parseInt(document.getElementById('financialPeriod')?.value || 30);
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - period);
            const startDateStr = startDate.toISOString();

            // Load orders data
            const { data: orders } = await this.supabase
                .from('orders')
                .select(`
                    *,
                    vendors (business_name, users(name)),
                    payments (amount, payment_method, status)
                `)
                .gte('created_at', startDateStr);

            // Load payments data
            const { data: payments } = await this.supabase
                .from('payments')
                .select('*')
                .gte('created_at', startDateStr);

            // Calculate financial metrics
            const metrics = this.calculateFinancialMetrics(orders || [], payments || []);
            
            // Update UI
            this.updateFinancialStats(metrics);
            this.createCharts(orders || [], payments || []);
            this.loadTopVendors(orders || []);
            this.loadRecentTransactions(payments || []);

        } catch (error) {
            console.error('Error loading financial data:', error);
        }
    }

    calculateFinancialMetrics(orders, payments) {
        const totalRevenue = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
        const totalOrders = orders.length;
        const totalCommissions = orders.reduce((sum, order) => {
            const commission = (order.total_amount || 0) * 0.05; // 5% commission
            return sum + commission;
        }, 0);
        const totalExpenses = totalCommissions; // Simplified
        const netProfit = totalRevenue - totalExpenses;
        const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

        return {
            totalRevenue,
            totalOrders,
            totalCommissions,
            netProfit,
            profitMargin
        };
    }

    updateFinancialStats(metrics) {
        window.SafeDOM.setText('totalRevenue', `KES ${metrics.totalRevenue.toLocaleString()}`);
        window.SafeDOM.setText('totalOrders', metrics.totalOrders.toLocaleString());
        window.SafeDOM.setText('totalCommissions', `KES ${metrics.totalCommissions.toLocaleString()}`);
        window.SafeDOM.setText('netProfit', `KES ${metrics.netProfit.toLocaleString()}`);
        window.SafeDOM.setText('profitMargin', `${metrics.profitMargin.toFixed(1)}%`);
    }

    createCharts(orders, payments) {
        this.createRevenueChart(orders);
        this.createOrderVolumeChart(orders);
        this.createCommissionChart(orders);
        this.createPaymentMethodChart(payments);
    }

    createRevenueChart(orders) {
        const ctx = document.getElementById('revenueChart');
        if (!ctx) return;

        // Group orders by date
        const dailyRevenue = {};
        orders.forEach(order => {
            const date = new Date(order.created_at).toLocaleDateString();
            dailyRevenue[date] = (dailyRevenue[date] || 0) + (order.total_amount || 0);
        });

        const dates = Object.keys(dailyRevenue).sort();
        const revenues = dates.map(date => dailyRevenue[date]);

        if (this.charts.revenue) this.charts.revenue.destroy();
        
        this.charts.revenue = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Daily Revenue (KES)',
                    data: revenues,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'KES ' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }

    createOrderVolumeChart(orders) {
        const ctx = document.getElementById('orderVolumeChart');
        if (!ctx) return;

        const dailyOrders = {};
        orders.forEach(order => {
            const date = new Date(order.created_at).toLocaleDateString();
            dailyOrders[date] = (dailyOrders[date] || 0) + 1;
        });

        const dates = Object.keys(dailyOrders).sort();
        const volumes = dates.map(date => dailyOrders[date]);

        if (this.charts.volume) this.charts.volume.destroy();

        this.charts.volume = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Daily Orders',
                    data: volumes,
                    backgroundColor: '#3b82f6',
                    borderColor: '#1d4ed8',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    createCommissionChart(orders) {
        const ctx = document.getElementById('commissionChart');
        if (!ctx) return;

        const commissionData = {
            'Agent Commission': 0,
            'Supervisor Commission': 0,
            'Platform Fee': 0
        };

        orders.forEach(order => {
            const amount = order.total_amount || 0;
            commissionData['Agent Commission'] += amount * 0.03; // 3%
            commissionData['Supervisor Commission'] += amount * 0.02; // 2%
            commissionData['Platform Fee'] += amount * 0.01; // 1%
        });

        if (this.charts.commission) this.charts.commission.destroy();

        this.charts.commission = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(commissionData),
                datasets: [{
                    data: Object.values(commissionData),
                    backgroundColor: ['#f59e0b', '#8b5cf6', '#ef4444']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    createPaymentMethodChart(payments) {
        const ctx = document.getElementById('paymentMethodChart');
        if (!ctx) return;

        const methodCounts = {};
        payments.forEach(payment => {
            const method = payment.payment_method || 'Unknown';
            methodCounts[method] = (methodCounts[method] || 0) + 1;
        });

        if (this.charts.payment) this.charts.payment.destroy();

        this.charts.payment = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.keys(methodCounts),
                datasets: [{
                    data: Object.values(methodCounts),
                    backgroundColor: ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    loadTopVendors(orders) {
        const vendorStats = {};
        
        orders.forEach(order => {
            const vendorName = order.vendors?.business_name || 'Unknown';
            if (!vendorStats[vendorName]) {
                vendorStats[vendorName] = { orders: 0, revenue: 0 };
            }
            vendorStats[vendorName].orders += 1;
            vendorStats[vendorName].revenue += order.total_amount || 0;
        });

        const topVendors = Object.entries(vendorStats)
            .sort((a, b) => b[1].revenue - a[1].revenue)
            .slice(0, 10);

        const tableHtml = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Vendor</th>
                        <th>Orders</th>
                        <th>Revenue</th>
                    </tr>
                </thead>
                <tbody>
                    ${topVendors.map(([name, stats]) => `
                        <tr>
                            <td>${name}</td>
                            <td>${stats.orders}</td>
                            <td>KES ${stats.revenue.toLocaleString()}</td>
                        </tr>
                    `).join('') || '<tr><td colspan="3">No data available</td></tr>'}
                </tbody>
            </table>
        `;

        document.getElementById('topVendorsTable').innerHTML = XSSProtection.sanitize(tableHtml);
    }

    loadRecentTransactions(payments) {
        const recentPayments = payments
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 10);

        const tableHtml = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Method</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${recentPayments.map(payment => `
                        <tr>
                            <td>${new Date(payment.created_at).toLocaleDateString()}</td>
                            <td>KES ${(payment.amount || 0).toLocaleString()}</td>
                            <td>${payment.payment_method || 'N/A'}</td>
                            <td><span class="status-badge status-${payment.status}">${payment.status}</span></td>
                        </tr>
                    `).join('') || '<tr><td colspan="4">No transactions found</td></tr>'}
                </tbody>
            </table>
        `;

        document.getElementById('recentTransactionsTable').innerHTML = XSSProtection.sanitize(tableHtml);
    }

    async generateFinancialReport() {
        showUserMessage('Generating comprehensive financial report...', 'info');
        // Implementation for detailed report generation
    }

    async exportFinancialData() {
        try {
            const period = parseInt(document.getElementById('financialPeriod')?.value || 30);
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - period);

            await window.bulkOps.exportToCSV('orders', { 
                created_at: `gte.${startDate.toISOString()}` 
            });
        } catch (error) {
            console.error('Export error:', error);
            showUserMessage('Export failed', 'error');
        }
    }
}

// Initialize financial dashboard
document.addEventListener('DOMContentLoaded', async function() {
    if (document.getElementById('financialContent')) {
        // Wait for Supabase config to be ready
        await window.ConfigLoader.loadConfig();
        window.financialDashboard = new FinancialDashboard();
        await window.financialDashboard.init();
    }
});