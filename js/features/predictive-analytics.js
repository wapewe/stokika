// Predictive Analytics System for Stokika
class PredictiveAnalytics {
    constructor() {
        this.supabase = window.supabase?.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    }

    // Predict vendor order patterns
    async predictVendorOrders(vendorId, days = 30) {
        try {
            const { data: orders, error } = await this.supabase
                .from('orders')
                .select('*')
                .eq('vendor_id', vendorId)
                .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
                .order('created_at', { ascending: true });

            if (error) throw error;

            const prediction = this.analyzeOrderPattern(orders, days);
            return prediction;
        } catch (error) {
            console.error('Error predicting orders:', error);
            return null;
        }
    }

    // Analyze order patterns using simple moving average
    analyzeOrderPattern(orders, forecastDays) {
        if (!orders || orders.length < 3) {
            return {
                predictedOrders: 0,
                confidence: 'low',
                trend: 'insufficient_data',
                recommendation: 'Need more order history'
            };
        }

        // Group orders by week
        const weeklyOrders = this.groupOrdersByWeek(orders);
        const weeklyAverages = weeklyOrders.map(week => ({
            week: week.week,
            orderCount: week.orders.length,
            totalAmount: week.orders.reduce((sum, order) => sum + (order.total_amount || 0), 0)
        }));

        // Calculate trend
        const trend = this.calculateTrend(weeklyAverages);
        const avgOrdersPerWeek = weeklyAverages.reduce((sum, week) => sum + week.orderCount, 0) / weeklyAverages.length;
        const avgAmountPerWeek = weeklyAverages.reduce((sum, week) => sum + week.totalAmount, 0) / weeklyAverages.length;

        // Predict for next period
        const weeksToForecast = Math.ceil(forecastDays / 7);
        const predictedOrders = Math.round(avgOrdersPerWeek * weeksToForecast * (1 + trend));
        const predictedAmount = Math.round(avgAmountPerWeek * weeksToForecast * (1 + trend));

        return {
            predictedOrders: Math.max(0, predictedOrders),
            predictedAmount: Math.max(0, predictedAmount),
            confidence: this.calculateConfidence(weeklyAverages),
            trend: trend > 0.1 ? 'increasing' : trend < -0.1 ? 'decreasing' : 'stable',
            trendPercentage: Math.round(trend * 100),
            recommendation: this.generateRecommendation(trend, avgOrdersPerWeek),
            historicalAverage: Math.round(avgOrdersPerWeek),
            dataPoints: weeklyAverages.length
        };
    }

    // Group orders by week
    groupOrdersByWeek(orders) {
        const weeks = {};
        
        orders.forEach(order => {
            const date = new Date(order.created_at);
            const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
            const weekKey = weekStart.toISOString().split('T')[0];
            
            if (!weeks[weekKey]) {
                weeks[weekKey] = { week: weekKey, orders: [] };
            }
            weeks[weekKey].orders.push(order);
        });

        return Object.values(weeks).sort((a, b) => new Date(a.week) - new Date(b.week));
    }

    // Calculate trend using linear regression
    calculateTrend(weeklyData) {
        if (weeklyData.length < 2) return 0;

        const n = weeklyData.length;
        const sumX = weeklyData.reduce((sum, _, index) => sum + index, 0);
        const sumY = weeklyData.reduce((sum, week) => sum + week.orderCount, 0);
        const sumXY = weeklyData.reduce((sum, week, index) => sum + (index * week.orderCount), 0);
        const sumXX = weeklyData.reduce((sum, _, index) => sum + (index * index), 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        return slope / (sumY / n); // Normalize by average
    }

    // Calculate confidence based on data consistency
    calculateConfidence(weeklyData) {
        if (weeklyData.length < 4) return 'low';
        
        const values = weeklyData.map(w => w.orderCount);
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        const coefficientOfVariation = Math.sqrt(variance) / mean;

        if (coefficientOfVariation < 0.3) return 'high';
        if (coefficientOfVariation < 0.6) return 'medium';
        return 'low';
    }

    // Generate recommendation based on trend
    generateRecommendation(trend, avgOrders) {
        if (trend > 0.2) {
            return 'Strong growth trend. Consider increasing inventory and credit limits.';
        } else if (trend > 0.1) {
            return 'Moderate growth. Monitor closely and prepare for increased demand.';
        } else if (trend < -0.2) {
            return 'Declining orders. Investigate issues and provide support.';
        } else if (trend < -0.1) {
            return 'Slight decline. Check vendor satisfaction and market conditions.';
        } else {
            return avgOrders > 2 ? 'Stable performance. Maintain current support level.' : 'Low activity. Consider engagement strategies.';
        }
    }

    // Predict inventory needs for suppliers
    async predictInventoryNeeds(supplierId, productId = null) {
        try {
            let query = this.supabase
                .from('orders')
                .select('*, order_items(*)')
                .eq('supplier_id', supplierId)
                .gte('created_at', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString());

            if (productId) {
                query = query.eq('order_items.product_id', productId);
            }

            const { data: orders, error } = await query;
            if (error) throw error;

            return this.analyzeInventoryDemand(orders);
        } catch (error) {
            console.error('Error predicting inventory:', error);
            return null;
        }
    }

    // Analyze inventory demand patterns
    analyzeInventoryDemand(orders) {
        const productDemand = {};
        
        orders.forEach(order => {
            if (order.order_items) {
                order.order_items.forEach(item => {
                    const productId = item.product_id || item.product_name;
                    if (!productDemand[productId]) {
                        productDemand[productId] = {
                            productName: item.product_name,
                            totalQuantity: 0,
                            orderCount: 0,
                            avgQuantityPerOrder: 0,
                            lastOrderDate: null
                        };
                    }
                    
                    productDemand[productId].totalQuantity += item.quantity;
                    productDemand[productId].orderCount += 1;
                    productDemand[productId].lastOrderDate = order.created_at;
                });
            }
        });

        // Calculate predictions for each product
        Object.keys(productDemand).forEach(productId => {
            const product = productDemand[productId];
            product.avgQuantityPerOrder = Math.round(product.totalQuantity / product.orderCount);
            product.predictedWeeklyDemand = Math.round(product.totalQuantity / 8); // 8 weeks of data
            product.recommendedStock = product.predictedWeeklyDemand * 4; // 4 weeks buffer
            product.riskLevel = this.calculateStockRisk(product);
        });

        return productDemand;
    }

    // Calculate stock risk level
    calculateStockRisk(product) {
        const daysSinceLastOrder = (Date.now() - new Date(product.lastOrderDate)) / (1000 * 60 * 60 * 24);
        
        if (daysSinceLastOrder > 14) return 'low';
        if (product.predictedWeeklyDemand > 10) return 'high';
        if (product.predictedWeeklyDemand > 5) return 'medium';
        return 'low';
    }

    // Predict agent performance
    async predictAgentPerformance(agentId) {
        try {
            const { data: visits, error } = await this.supabase
                .from('vendor_visits')
                .select('*')
                .eq('agent_id', agentId)
                .gte('start_time', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

            if (error) throw error;

            const { data: orders, error: orderError } = await this.supabase
                .from('orders')
                .select('*')
                .eq('created_by', agentId)
                .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

            if (orderError) throw orderError;

            return this.analyzeAgentPerformance(visits, orders);
        } catch (error) {
            console.error('Error predicting agent performance:', error);
            return null;
        }
    }

    // Analyze agent performance metrics
    analyzeAgentPerformance(visits, orders) {
        const totalVisits = visits.length;
        const completedVisits = visits.filter(v => v.status === 'completed').length;
        const totalOrders = orders.length;
        const avgOrderValue = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0) / totalOrders || 0;

        const visitCompletionRate = totalVisits > 0 ? (completedVisits / totalVisits) * 100 : 0;
        const ordersPerVisit = completedVisits > 0 ? totalOrders / completedVisits : 0;

        // Performance score calculation
        let performanceScore = 0;
        performanceScore += Math.min(visitCompletionRate, 100) * 0.3; // 30% weight
        performanceScore += Math.min(ordersPerVisit * 20, 100) * 0.4; // 40% weight
        performanceScore += Math.min(avgOrderValue / 100, 100) * 0.3; // 30% weight

        return {
            totalVisits,
            completedVisits,
            visitCompletionRate: Math.round(visitCompletionRate),
            totalOrders,
            ordersPerVisit: Math.round(ordersPerVisit * 100) / 100,
            avgOrderValue: Math.round(avgOrderValue),
            performanceScore: Math.round(performanceScore),
            performanceGrade: this.getPerformanceGrade(performanceScore),
            prediction: this.generatePerformancePrediction(performanceScore, ordersPerVisit),
            recommendations: this.generateAgentRecommendations(visitCompletionRate, ordersPerVisit, avgOrderValue)
        };
    }

    // Get performance grade
    getPerformanceGrade(score) {
        if (score >= 90) return 'A+';
        if (score >= 80) return 'A';
        if (score >= 70) return 'B+';
        if (score >= 60) return 'B';
        if (score >= 50) return 'C';
        return 'D';
    }

    // Generate performance prediction
    generatePerformancePrediction(score, ordersPerVisit) {
        if (score >= 80) {
            return 'Excellent performance expected to continue. High potential for promotion.';
        } else if (score >= 60) {
            return 'Good performance with room for improvement. Focus on order conversion.';
        } else {
            return 'Performance needs improvement. Requires additional training and support.';
        }
    }

    // Generate agent recommendations
    generateAgentRecommendations(visitRate, ordersPerVisit, avgOrderValue) {
        const recommendations = [];

        if (visitRate < 80) {
            recommendations.push('Improve visit completion rate through better time management');
        }
        if (ordersPerVisit < 0.5) {
            recommendations.push('Focus on sales techniques and product knowledge training');
        }
        if (avgOrderValue < 500) {
            recommendations.push('Work on upselling and cross-selling strategies');
        }
        if (recommendations.length === 0) {
            recommendations.push('Maintain excellent performance and mentor other agents');
        }

        return recommendations;
    }

    // Market trend analysis
    async analyzeMarketTrends(county = null, timeframe = 30) {
        try {
            let query = this.supabase
                .from('orders')
                .select('*, vendors(county)')
                .gte('created_at', new Date(Date.now() - timeframe * 24 * 60 * 60 * 1000).toISOString());

            if (county) {
                query = query.eq('vendors.county', county);
            }

            const { data: orders, error } = await query;
            if (error) throw error;

            return this.processMarketTrends(orders, timeframe);
        } catch (error) {
            console.error('Error analyzing market trends:', error);
            return null;
        }
    }

    // Process market trend data
    processMarketTrends(orders, timeframe) {
        const dailyStats = {};
        const productStats = {};
        
        orders.forEach(order => {
            const date = order.created_at.split('T')[0];
            
            if (!dailyStats[date]) {
                dailyStats[date] = { orders: 0, revenue: 0 };
            }
            
            dailyStats[date].orders += 1;
            dailyStats[date].revenue += order.total_amount || 0;
            
            // Track product popularity
            const product = order.product_name || 'Unknown';
            if (!productStats[product]) {
                productStats[product] = { count: 0, revenue: 0 };
            }
            productStats[product].count += 1;
            productStats[product].revenue += order.total_amount || 0;
        });

        const dailyData = Object.entries(dailyStats)
            .sort(([a], [b]) => new Date(a) - new Date(b))
            .map(([date, stats]) => ({ date, ...stats }));

        const topProducts = Object.entries(productStats)
            .sort(([,a], [,b]) => b.count - a.count)
            .slice(0, 10)
            .map(([product, stats]) => ({ product, ...stats }));

        // Calculate growth rate
        const firstHalf = dailyData.slice(0, Math.floor(dailyData.length / 2));
        const secondHalf = dailyData.slice(Math.floor(dailyData.length / 2));
        
        const firstHalfAvg = firstHalf.reduce((sum, day) => sum + day.orders, 0) / firstHalf.length;
        const secondHalfAvg = secondHalf.reduce((sum, day) => sum + day.orders, 0) / secondHalf.length;
        
        const growthRate = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;

        return {
            totalOrders: orders.length,
            totalRevenue: orders.reduce((sum, order) => sum + (order.total_amount || 0), 0),
            avgOrderValue: orders.length > 0 ? orders.reduce((sum, order) => sum + (order.total_amount || 0), 0) / orders.length : 0,
            growthRate: Math.round(growthRate * 100) / 100,
            trend: growthRate > 5 ? 'growing' : growthRate < -5 ? 'declining' : 'stable',
            dailyData,
            topProducts,
            marketHealth: this.assessMarketHealth(growthRate, orders.length, timeframe)
        };
    }

    // Assess market health
    assessMarketHealth(growthRate, totalOrders, timeframe) {
        const ordersPerDay = totalOrders / timeframe;
        
        if (growthRate > 10 && ordersPerDay > 5) return 'excellent';
        if (growthRate > 5 && ordersPerDay > 3) return 'good';
        if (growthRate > 0 && ordersPerDay > 1) return 'fair';
        if (growthRate > -5) return 'concerning';
        return 'poor';
    }
}

// Demand forecasting for suppliers
class DemandForecaster {
    constructor() {
        this.analytics = new PredictiveAnalytics();
    }

    // Forecast demand for next period
    async forecastDemand(supplierId, days = 30) {
        const inventoryPrediction = await this.analytics.predictInventoryNeeds(supplierId);
        const marketTrends = await this.analytics.analyzeMarketTrends(null, 60);
        
        return {
            inventoryPrediction,
            marketTrends,
            recommendations: this.generateSupplierRecommendations(inventoryPrediction, marketTrends)
        };
    }

    generateSupplierRecommendations(inventory, market) {
        const recommendations = [];
        
        if (market?.growthRate > 10) {
            recommendations.push('Market is growing rapidly. Consider increasing stock levels by 20-30%.');
        }
        
        if (inventory) {
            const highDemandProducts = Object.values(inventory)
                .filter(p => p.riskLevel === 'high')
                .length;
            
            if (highDemandProducts > 0) {
                recommendations.push(`${highDemandProducts} products have high demand risk. Prioritize restocking.`);
            }
        }
        
        if (market?.marketHealth === 'poor') {
            recommendations.push('Market conditions are challenging. Focus on high-margin products.');
        }
        
        return recommendations;
    }
}

// Export classes
window.PredictiveAnalytics = PredictiveAnalytics;
window.DemandForecaster = DemandForecaster;