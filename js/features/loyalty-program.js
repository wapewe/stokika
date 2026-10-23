// Loyalty Program System
class LoyaltyProgram {
    constructor() {
        this.supabase = null;
        this.currentVendorId = null;
        this.loyaltyData = null;
    }

    async init() {
        this.supabase = initSupabase();
        if (!this.supabase) throw new Error('Database connection failed');
        this.currentVendorId = await this.getCurrentVendorId();
        await this.loadLoyaltyProgram();
    }

    async getCurrentVendorId() {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) return null;

            const { data: vendor } = await this.supabase
                .from('vendors')
                .select('id')
                .eq('user_id', user.id)
                .single();

            return vendor?.id || null;
        } catch (error) {
            console.error('Error getting vendor ID:', error);
            return null;
        }
    }

    async loadLoyaltyProgram() {
        try {
            const container = document.getElementById('loyaltyContent') || document.createElement('div');
            container.innerHTML = XSSProtection.sanitize(`
                <div class="loyalty-dashboard">
                    <div class="loyal...header">
                        <h2>🎁 Stokika Rewards Program</h2>
                        <p>Earn points on every purchase and redeem for discounts!</p>
                    </div>

                    <div class="loyalty-stats">
                        <div class="stat-card points">
                            <div class="stat-icon">⭐</div>
                            <div class="stat-info">
                                <h4>Available Points</h4>
                                <span id="availablePoints">-</span>
                            </div>
                        </div>
                        <div class="stat-card earned">
                            <div class="stat-icon">📈</div>
                            <div class="stat-info">
                                <h4>Total Earned</h4>
                                <span id="totalEarned">-</span>
                            </div>
                        </div>
                        <div class="stat-card redeemed">
                            <div class="stat-icon">🎯</div>
                            <div class="stat-info">
                                <h4>Total Redeemed</h4>
                                <span id="totalRedeemed">-</span>
                            </div>
                        </div>
                        <div class="stat-card tier">
                            <div class="stat-icon">👑</div>
                            <div class="stat-info">
                                <h4>Loyalty Tier</h4>
                                <span id="loyaltyTier">-</span>
                            </div>
                        </div>
                    </div>

                    <div class="loyalty-actions">
                        <button class="btn-primary" id="btnRedeemPoints">🎁 Redeem Points</button>
                        <button class="btn-secondary" id="btnViewHistory">📋 View History</button>
                        <button class="btn-secondary" id="btnEarnMore">💰 Earn More Points</button>
                    </div>

                    <div class="loyalty-content">
                        <div class="rewards-section">
                            <h3>Available Rewards</h3>
                            <div id="rewardsGrid" class="rewards-grid"></div>
                        </div>

                        <div class="earning-section">
                            <h3>How to Earn Points</h3>
                            <div class="earning-methods">
                                <div class="method-card">
                                    <div class="method-icon">🛒</div>
                                    <h4>Make Purchases</h4>
                                    <p>Earn 1 point for every KES 100 spent</p>
                                </div>
                                <div class="method-card">
                                    <div class="method-icon">👥</div>
                                    <h4>Refer Friends</h4>
                                    <p>Get 500 points for each successful referral</p>
                                </div>
                                <div class="method-card">
                                    <div class="method-icon">📝</div>
                                    <h4>Write Reviews</h4>
                                    <p>Earn 50 points for each product review</p>
                                </div>
                                <div class="method-card">
                                    <div class="method-icon">🎂</div>
                                    <h4>Birthday Bonus</h4>
                                    <p>Get 1000 bonus points on your birthday</p>
                                </div>
                            </div>
                        </div>

                        <div class="history-section" id="loyaltyHistory" style="display: none;">
                            <h3>Points History</h3>
                            <div id="historyTable"></div>
                        </div>
                    </div>
                </div>
            `);

            this.attachEventListeners();
            await this.loadLoyaltyData();
            await this.loadRewards();
        } catch (error) {
            console.error('Error loading loyalty program:', error);
            showUserMessage('Error loading loyalty program', 'error');
        }
    }

    attachEventListeners() {
        const redeemBtn = document.getElementById('btnRedeemPoints');
        const historyBtn = document.getElementById('btnViewHistory');
        const earnMoreBtn = document.getElementById('btnEarnMore');

        if (redeemBtn) redeemBtn.addEventListener('click', () => this.showRedeemModal());
        if (historyBtn) historyBtn.addEventListener('click', () => this.toggleHistory());
        if (earnMoreBtn) earnMoreBtn.addEventListener('click', () => this.showEarnMoreModal());
    }

    async loadLoyaltyData() {
        try {
            if (!this.currentVendorId) {
                this.showGuestMessage();
                return;
            }

            // Get or create loyalty points record
            let { data: loyaltyPoints } = await this.supabase
                .from('loyalty_points')
                .select('*')
                .eq('vendor_id', this.currentVendorId)
                .single();

            if (!loyaltyPoints) {
                // Create new loyalty record
                const { data: newRecord } = await this.supabase
                    .from('loyalty_points')
                    .insert([{
                        vendor_id: this.currentVendorId,
                        program_id: await this.getDefaultProgramId(),
                        points_balance: 0,
                        total_earned: 0,
                        total_redeemed: 0
                    }])
                    .select()
                    .single();

                loyaltyPoints = newRecord;
            }

            this.loyaltyData = loyaltyPoints;
            this.updateLoyaltyStats();
        } catch (error) {
            console.error('Error loading loyalty data:', error);
        }
    }

    async getDefaultProgramId() {
        try {
            const { data: program } = await this.supabase
                .from('loyalty_programs')
                .select('id')
                .eq('is_active', true)
                .single();

            return program?.id || null;
        } catch (error) {
            console.error('Error getting default program:', error);
            return null;
        }
    }

    updateLoyaltyStats() {
        if (!this.loyaltyData) return;

        document.getElementById('availablePoints').textContent = this.loyaltyData.points_balance.toLocaleString();
        document.getElementById('totalEarned').textContent = this.loyaltyData.total_earned.toLocaleString();
        document.getElementById('totalRedeemed').textContent = this.loyaltyData.total_redeemed.toLocaleString();
        
        // Calculate tier based on total earned points
        const tier = this.calculateTier(this.loyaltyData.total_earned);
        document.getElementById('loyaltyTier').textContent = tier;
    }

    calculateTier(totalEarned) {
        if (totalEarned >= 10000) return 'Platinum';
        if (totalEarned >= 5000) return 'Gold';
        if (totalEarned >= 2000) return 'Silver';
        return 'Bronze';
    }

    async loadRewards() {
        const rewardsData = [
            { id: 1, name: '5% Discount', points: 500, description: 'Get 5% off your next order' },
            { id: 2, name: '10% Discount', points: 1000, description: 'Get 10% off your next order' },
            { id: 3, name: 'Free Delivery', points: 300, description: 'Free delivery on your next order' },
            { id: 4, name: '15% Discount', points: 2000, description: 'Get 15% off your next order' },
            { id: 5, name: 'KES 500 Credit', points: 5000, description: 'KES 500 account credit' },
            { id: 6, name: 'Premium Support', points: 1500, description: '30 days of premium customer support' }
        ];

        const rewardsGrid = document.getElementById('rewardsGrid');
        if (!rewardsGrid) return;

        rewardsGrid.innerHTML = XSSProtection.sanitize(rewardsData.map(reward => `
            <div class="reward-card ${this.loyaltyData && this.loyaltyData.points_balance >= reward.points ? 'available' : 'unavailable'}">
                <div class="reward-info">
                    <h4>${reward.name}</h4>
                    <p>${reward.description}</p>
                    <div class="reward-cost">
                        <span class="points">${reward.points.toLocaleString()} points</span>
                    </div>
                </div>
                <button class="btn-redeem" 
                        onclick="window.loyaltyProgram.redeemReward(${reward.id}, ${reward.points})"
                        ${!this.loyaltyData || this.loyaltyData.points_balance < reward.points ? 'disabled' : ''}>
                    ${!this.loyaltyData || this.loyaltyData.points_balance < reward.points ? 'Not Enough Points' : 'Redeem'}
                </button>
            </div>
        `).join(''));
    }

    showGuestMessage() {
        const container = document.querySelector('.loyalty-dashboard');
        if (container) {
            container.innerHTML = XSSProtection.sanitize(`
                <div class="guest-message">
                    <h2>🎁 Join Stokika R...rds</h2>
                    <p>Sign up as a vendor to start earning points and unlock exclusive rewards!</p>
                    <button class="btn-primary" onclick="window.location.href='signin.html'">
                        Sign In / Register
                    </button>
                </div>
            `)
        }
    }

    showRedeemModal() {
        if (!this.loyaltyData || this.loyaltyData.points_balance < 100) {
            showUserMessage('You need at least 100 points to redeem rewards', 'error');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = XSSProtection.sanitize(`
            <div class="modal-content">
                <div class="modal-header">
  ...               <h2>🎁 Redeem Points</h2>
                    <button type="button" class="close">&times;</button>
                </div>
                <div class="redeem-section">
                    <p>Available Points: <strong>${sanitize(this.loyaltyData.points_balance.toLocaleString())}</strong></p>
                    <div class="form-group">
                        <label>Select Reward Type</label>
                        <select id="rewardType">
                            <option value="discount_5">5% Discount (500 points)</option>
                            <option value="discount_10">10% Discount (1000 points)</option>
                            <option value="free_delivery">Free Delivery (300 points)</option>
                            <option value="credit_500">KES 500 Credit (5000 points)</option>
                        </select>
                    </div>
                    <button class="btn-submit" onclick="window.loyaltyProgram.processRedemption()">
                        Redeem Reward
                    </button>
                </div>
            </div>
        `)

        document.body.appendChild(modal);
        modal.style.display = 'block';
        
        modal.querySelector('.close').onclick = () => modal.remove();
    }

    async processRedemption() {
        try {
            const rewardType = document.getElementById('rewardType').value;
            const rewardCosts = {
                'discount_5': 500,
                'discount_10': 1000,
                'free_delivery': 300,
                'credit_500': 5000
            };

            const cost = rewardCosts[rewardType];
            if (!cost || this.loyaltyData.points_balance < cost) {
                showUserMessage('Insufficient points for this reward', 'error');
                return;
            }

            // Deduct points
            const { error: updateError } = await this.supabase
                .from('loyalty_points')
                .update({
                    points_balance: this.loyaltyData.points_balance - cost,
                    total_redeemed: this.loyaltyData.total_redeemed + cost
                })
                .eq('vendor_id', this.currentVendorId);

            if (updateError) throw updateError;

            // Log transaction
            const { error: logError } = await this.supabase
                .from('loyalty_transactions')
                .insert([{
                    vendor_id: this.currentVendorId,
                    transaction_type: 'redeemed',
                    points: cost,
                    description: `Redeemed ${rewardType.replace('_', ' ')}`
                }]);

            if (logError) throw logError;

            showUserMessage('Reward redeemed successfully!', 'success');
            document.querySelector('.modal').remove();
            
            // Reload data
            await this.loadLoyaltyData();
            await this.loadRewards();

        } catch (error) {
            console.error('Redemption error:', error);
            showUserMessage('Error processing redemption', 'error');
        }
    }

    async redeemReward(rewardId, points) {
        if (!this.loyaltyData || this.loyaltyData.points_balance < points) {
            showUserMessage('Insufficient points for this reward', 'error');
            return;
        }

        if (confirm(`Redeem this reward for ${points.toLocaleString()} points?`)) {
            try {
                // Process redemption
                const { error } = await this.supabase
                    .from('loyalty_points')
                    .update({
                        points_balance: this.loyaltyData.points_balance - points,
                        total_redeemed: this.loyaltyData.total_redeemed + points
                    })
                    .eq('vendor_id', this.currentVendorId);

                if (error) throw error;

                // Log transaction
                await this.supabase
                    .from('loyalty_transactions')
                    .insert([{
                        vendor_id: this.currentVendorId,
                        transaction_type: 'redeemed',
                        points: points,
                        description: `Redeemed reward #${rewardId}`
                    }]);

                showUserMessage('Reward redeemed successfully!', 'success');
                await this.loadLoyaltyData();
                await this.loadRewards();

            } catch (error) {
                console.error('Redemption error:', error);
                showUserMessage('Error redeeming reward', 'error');
            }
        }
    }

    async toggleHistory() {
        const historySection = document.getElementById('loyaltyHistory');
        if (!historySection) return;

        if (historySection.style.display === 'none') {
            await this.loadTransactionHistory();
            historySection.style.display = 'block';
        } else {
            historySection.style.display = 'none';
        }
    }

    async loadTransactionHistory() {
        try {
            if (!this.currentVendorId) return;

            const { data: transactions } = await this.supabase
                .from('loyalty_transactions')
                .select('*')
                .eq('vendor_id', this.currentVendorId)
                .order('created_at', { ascending: false })
                .limit(50);

            const historyTable = document.getElementById('historyTable');
            if (!historyTable) return;

            if (!transactions || transactions.length === 0) {
                historyTable.innerHTML = XSSProtection.sanitize('<p>No transaction history found</p>');
                return;
            }

            historyTable.innerHTML = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Points</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${transactions.map(tx => `
                            <tr>
                                <td>${new Date(tx.created_at).toLocaleDateString()}</td>
                                <td><span class="transaction-type ${sanitize(tx.transaction_type)}">${sanitize(tx.transaction_type)}</span></td>
                                <td class="${tx.transaction_type === 'earned' ? 'points-earned' : 'points-redeemed'}">
                                    ${tx.transaction_type === 'earned' ? '+' : '-'}${sanitize(tx.points)}
                                </td>
                                <td>${sanitize(tx.description)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } catch (error) {
            console.error('Error loading transaction history:', error);
        }
    }

    showEarnMoreModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = XSSProtection.sanitize(`
            <div class="modal-content">
                <div class="modal-header">
                    <h2>💰 Earn More Points</h2>
                    <button type="button" class="close">&times;</button>
                </div>
                <div class="earn-more-content">
                    <h3>Quick Ways to Earn Points:</h3>
                    <ul>
                        <li>🛒 Place an order - 1 point per KES 100</li>
                        <li>👥 Refer a friend - 500 points</li>
                        <li>📝 Write a product review - 50 points</li>
                        <li>📱 Follow us on social media - 100 points</li>
                        <li>📧 Subscribe to newsletter - 200 points</li>
                    </ul>
                    <div class="action-buttons">
                        <button class="btn-primary" onclick="window.location.href='inventory.html'">
                            Browse Products
                        </button>
                        <button class="btn-secondary" onclick="window.loyaltyProgram.shareReferral()">
                            Share Referral Link
                        </button>
                    </div>
                </div>
            </div>
        `);

        document.body.appendChild(modal);
        modal.style.display = 'block';
        
        modal.querySelector('.close').onclick = () => modal.remove();
    }

    shareReferral() {
        const referralLink = `${window.location.origin}?ref=${this.currentVendorId}`;
        
        if (navigator.share) {
            navigator.share({
                title: 'Join Stokika and Earn Rewards!',
                text: 'Sign up using my referral link and we both get bonus points!',
                url: referralLink
            });
        } else {
            // Fallback - copy to clipboard
            navigator.clipboard.writeText(referralLink).then(() => {
                showUserMessage('Referral link copied to clipboard!', 'success');
            });
        }
    }

    // Function to award points (called from other parts of the system)
    async awardPoints(vendorId, points, description, orderId = null) {
        try {
            // Update points balance
            const { data: currentPoints } = await this.supabase
                .from('loyalty_points')
                .select('*')
                .eq('vendor_id', vendorId)
                .single();

            if (currentPoints) {
                await this.supabase
                    .from('loyalty_points')
                    .update({
                        points_balance: currentPoints.points_balance + points,
                        total_earned: currentPoints.total_earned + points
                    })
                    .eq('vendor_id', vendorId);

                // Log transaction
                await this.supabase
                    .from('loyalty_transactions')
                    .insert([{
                        vendor_id: vendorId,
                        order_id: orderId,
                        transaction_type: 'earned',
                        points: points,
                        description: description
                    }]);
            }
        } catch (error) {
            console.error('Error awarding points:', error);
        }
    }
}

// Initialize loyalty program
document.addEventListener('DOMContentLoaded', async function() {
    if (document.getElementById('loyaltyContent')) {
        // Wait for Supabase config to be ready
        await window.ConfigLoader.loadConfig();
        window.loyaltyProgram = new LoyaltyProgram();
        await window.loyaltyProgram.init();
    }
});
