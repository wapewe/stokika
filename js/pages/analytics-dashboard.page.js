// Analytics Dashboard and Predictive Analytics
class AnalyticsDashboard {
    constructor() {
        this.supabase = null;
        this.charts = {};
    }

    async init() {
        this.supabase = initSupabase();
        if (!this.supabase) throw new Error('Database connection failed');
        await this.loadAnalytics();
    }

    async loadAnalytics() {
        try {
            const container = document.getElementById('analyticsContent');
            if (!container) return;

            container.innerHTML = XSSProtection.sanitize(`
                <div class="analytics-dashboard">
                    <div class="ana...ics-controls">
                        <select id="analyticsTimeRange">
                            <option value="7">Last 7 days</option>
                            <option value="30" selected>Last 30 days</option>
                            <option value="90">Last 90 days</option>
                        </select>
                        <button class="btn-primary" id="btnRefreshAnalytics">🔄 Refresh</button>
                        <button class="btn-secondary" id="btnPredictions">🔮 View Predictions</button>
                    </div>
                    
                    <div class="analytics-grid">
                        <div class="analytics-card">
                            <h3>Performance Overview</h3>
                            <div id="performanceChart" class="chart-container">
                                <canvas id="performanceCanvas"></canvas>
                            </div>
                        </div>
                        
                        <div class="analytics-card">
                            <h3>Market Trends</h3>
                            <div id="trendsChart" class="chart-container">
                                <canvas id="trendsCanvas"></canvas>
                            </div>
                        </div>
                        
                        <div class="analytics-card">
                            <h3>Agent Performance</h3>
                            <div id="agentChart" class="chart-container">
                                <canvas id="agentCanvas"></canvas>
                            </div>
                        </div>
                        
                        <div class="analytics-card">
                            <h3>Revenue Analytics</h3>
                            <div id="revenueChart" class="chart-container">
                                <canvas id="revenueCanvas"></canvas>
                            </div>
                        </div>
                    </div>
                    
                    <div class="analytics-insights">
                        <h3>📊 Key Insights</h3>
                        <div id="insightsContainer"></div>
                    </div>
                    
                    <div class="predictions-section" id="predictionsSection" style="display: none;">
                        <h3>🔮 Predictive Analytics</h3>
                        <div id="predictionsContainer"></div>
                    </div>
                </div>
            `);

            this.attachEventListeners();
            await this.loadCharts();
            await this.loadInsights();
        } catch (error) {
            console.error('Error loading analytics:', error);
            showUserMessage('Error loading analytics dashboard', 'error');
        }
    }

    attachEventListeners() {
        const refreshBtn = document.getElementById('btnRefreshAnalytics');
        const predictionsBtn = document.getElementById('btnPredictions');
        const timeRange = document.getElementById('analyticsTimeRange');

        if (refreshBtn) refreshBtn.addEventListener('click', () => this.loadCharts());
        if (predictionsBtn) predictionsBtn.addEventListener('click', () => this.togglePredictions());
        if (timeRange) timeRange.addEventListener('change', () => this.loadCharts());
    }

    async loadCharts() {
        try {
            const timeRange = document.getElementById('analyticsTimeRange')?.value || 30;
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - parseInt(timeRange));

            // Load performance metrics
            await this.loadPerformanceChart(startDate);
            await this.loadTrendsChart(startDate);
            await this.loadAgentChart(startDate);
            await this.loadRevenueChart(startDate);
        } catch (error) {
            console.error('Error loading charts:', error);
        }
    }

    async loadPerformanceChart(startDate) {
        try {
            const { data: metrics } = await this.supabase
                .from('performance_metrics')
                .select('*')
                .gte('metric_date', startDate.toISOString().split('T')[0])
                .eq('metric_type', 'daily_visits')
                .order('metric_date');

            const canvas = document.getElementById('performanceCanvas');
            if (!canvas) return;

            // Simple chart implementation (replace with Chart.js for production)
            const ctx = canvas.getContext('2d');
            canvas.width = 400;
            canvas.height = 200;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#3b82f6';
            ctx.fillRect(50, 50, 300, 100);
            ctx.fillStyle = '#ffffff';
            ctx.font = '14px Arial';
            ctx.fillText('Performance Chart', 150, 105);
            ctx.fillText(`${metrics?.length || 0} data points`, 150, 125);
        } catch (error) {
            console.error('Error loading performance chart:', error);
        }
    }

    async loadTrendsChart(startDate) {
        try {
            const { data: trends } = await this.supabase
                .from('market_trends')
                .select('*')
                .gte('trend_date', startDate.toISOString().split('T')[0])
                .order('trend_date');

            const canvas = document.getElementById('trendsCanvas');
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            canvas.width = 400;
            canvas.height = 200;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#10b981';
            ctx.fillRect(50, 50, 300, 100);
            ctx.fillStyle = '#ffffff';
            ctx.font = '14px Arial';
            ctx.fillText('Market Trends', 150, 105);
            ctx.fillText(`${trends?.length || 0} trend points`, 150, 125);
        } catch (error) {
            console.error('Error loading trends chart:', error);
        }
    }

    async loadAgentChart(startDate) {
        try {
            const { data: agents } = await this.supabase
                .from('field_agents')
                .select(`
                    id,
                    full_name,
                    performance_metrics (
                        metric_value,
                        metric_date
                    )
                `)
                .eq('approval_status', 'approved');

            const canvas = document.getElementById('agentCanvas');
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            canvas.width = 400;
            canvas.height = 200;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(50, 50, 300, 100);
            ctx.fillStyle = '#ffffff';
            ctx.font = '14px Arial';
            ctx.fillText('Agent Performance', 150, 105);
            ctx.fillText(`${agents?.length || 0} active agents`, 150, 125);
        } catch (error) {
            console.error('Error loading agent chart:', error);
        }
    }

    async loadRevenueChart(startDate) {
        try {
            const { data: orders } = await this.supabase
                .from('orders')
                .select('total_amount, created_at')
                .gte('created_at', startDate.toISOString())
                .eq('status', 'delivered');

            const canvas = document.getElementById('revenueCanvas');
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            canvas.width = 400;
            canvas.height = 200;

            const totalRevenue = orders?.reduce((sum, order) => sum + (parseFloat(order.total_amount) || 0), 0) || 0;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#8b5cf6';
            ctx.fillRect(50, 50, 300, 100);
            ctx.fillStyle = '#ffffff';
            ctx.font = '14px Arial';
            ctx.fillText('Revenue Analytics', 150, 95);
            ctx.fillText(`KES ${totalRevenue.toLocaleString()}`, 150, 115);
            ctx.fillText(`${orders?.length || 0} orders`, 150, 135);
        } catch (error) {
            console.error('Error loading revenue chart:', error);
        }
    }

    async loadInsights() {
        try {
            const insights = await this.generateInsights();
            const container = document.getElementById('insightsContainer');
            if (!container) return;

            container.innerHTML = XSSProtection.sanitize(insights.map(insight => `
                <div class="insight-card ${insight.type}">
                    <div class="insight-icon">${insight.icon}</div>
                    <div class="insight-content">
                        <h4>${insight.title}</h4>
                        <p>${insight.description}</p>
                        <span class="insight-value">${insight.value}</span>
                    </div>
                </div>
            `)).join('');
        } catch (error) {
            console.error('Error loading insights:', error);
        }
    }

    async generateInsights() {
        try {
            const insights = [];

            // Agent performance insight
            const { data: topAgent } = await this.supabase
                .from('performance_metrics')
                .select(`
                    user_id,
                    metric_value,
                    users (name)
                `)
                .eq('metric_type', 'daily_visits')
                .order('metric_value', { ascending: false })
                .limit(1);

            if (topAgent?.[0]) {
                insights.push({
                    type: 'success',
                    icon: '🏆',
                    title: 'Top Performer',
                    description: 'Highest daily visits this month',
                    value: `${topAgent[0].metric_value} visits`
                });
            }

            // Market growth insight
            const { data: recentTrends } = await this.supabase
                .from('market_trends')
                .select('growth_rate')
                .order('trend_date', { ascending: false })
                .limit(1);

            if (recentTrends?.[0]) {
                const growthRate = recentTrends[0].growth_rate || 0;
                insights.push({
                    type: growthRate > 0 ? 'success' : 'warning',
                    icon: growthRate > 0 ? '📈' : '📉',
                    title: 'Market Growth',
                    description: 'Current market trend',
                    value: `${growthRate}% growth`
                });
            }

            // Revenue insight
            const today = new Date();
            const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const { data: monthlyRevenue } = await this.supabase
                .from('orders')
                .select('total_amount')
                .gte('created_at', lastMonth.toISOString())
                .eq('status', 'delivered');

            const totalRevenue = monthlyRevenue?.reduce((sum, order) => sum + (parseFloat(order.total_amount) || 0), 0) || 0;
            insights.push({
                type: 'info',
                icon: '💰',
                title: 'Monthly Revenue',
                description: 'Total revenue this month',
                value: `KES ${totalRevenue.toLocaleString()}`
            });

            return insights;
        } catch (error) {
            console.error('Error generating insights:', error);
            return [];
        }
    }

    async togglePredictions() {
        const section = document.getElementById('predictionsSection');
        if (!section) return;

        if (section.style.display === 'none') {
            section.style.display = 'block';
            await this.loadPredictions();
        } else {
            section.style.display = 'none';
        }
    }

    async loadPredictions() {
        try {
            const { data: predictions } = await this.supabase
                .from('predictions')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10);

            const container = document.getElementById('predictionsContainer');
            if (!container) return;

            if (!predictions || predictions.length === 0) {
                container.innerHTML = XSSProtection.sanitize(`
                    <div class="no-predictions">
                        <p>🔮 No pre...tions available yet</p>
                        <button class="btn-primary" onclick="generatePredictions()">Generate Predictions</button>
                    </div>
                `);
                return;
            }

            container.innerHTML = XSSProtection.sanitize(`
                <div class="predictions-grid">
                    ${sanitize(predictions.map(prediction => `)
                        <div class="prediction-card">
                            <h4>${prediction.prediction_type.replace('_', ' ').toUpperCase())}</h4>
                            <div class="prediction-value">${sanitize(prediction.predicted_value)}</div>
                            <div class="prediction-confidence">
                                Confidence: ${sanitize(prediction.confidence_level)}
                            </div>
                            <div class="prediction-date">
                                ${sanitize(new Date(prediction.prediction_date).toLocaleDateString())}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } catch (error) {
            console.error('Error loading predictions:', error);
        }
    }
}

// Generate sample predictions
window.generatePredictions = async function() {
    try {
        const supabase = initSupabase();
        const predictions = [
            {
                entity_type: 'market',
                prediction_type: 'order_volume',
                predicted_value: Math.floor(Math.random() * 1000) + 500,
                confidence_level: 'high',
                prediction_date: new Date().toISOString().split('T')[0],
                forecast_period: 30
            },
            {
                entity_type: 'vendor',
                prediction_type: 'inventory_demand',
                predicted_value: Math.floor(Math.random() * 500) + 200,
                confidence_level: 'medium',
                prediction_date: new Date().toISOString().split('T')[0],
                forecast_period: 14
            }
        ];

        const { error } = await supabase
            .from('predictions')
            .insert(predictions);

        if (error) throw error;

        showUserMessage('Predictions generated successfully', 'success');
        
        // Reload predictions
        const analytics = new AnalyticsDashboard();
        await analytics.loadPredictions();
    } catch (error) {
        console.error('Error generating predictions:', error);
        showUserMessage('Error generating predictions', 'error');
    }
};

// Initialize analytics when tab is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('analytics-tab')) {
        window.analyticsDashboard = new AnalyticsDashboard();
    }
});