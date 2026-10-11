// Advanced Search System
class SearchManager {
    constructor() {
        this.supabase = null;
        this.searchHistory = JSON.parse(localStorage.getItem('search_history') || '[]');
        this.savedSearches = JSON.parse(localStorage.getItem('saved_searches') || '[]');
        this.init();
    }

    async init() {
        if (window.supabase && window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
            // Reuse shared client if available, avoid creating duplicate GoTrueClient instances
            this.supabase = window._sharedSupabaseClient || window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
            if (!window._sharedSupabaseClient) window._sharedSupabaseClient = this.supabase;
            this.createSearchUI();
        }
    }

    createSearchUI() {
        const searchHTML = `
            <div class="advanced-search-container">
                <div class="search-input-container">
                    <input type="text" id="globalSearch" placeholder="Search vendors, suppliers, orders..." class="search-input">
                    <button class="search-btn" id="searchBtn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"/>
                            <path d="M21 21l-4.35-4.35"/>
                        </svg>
                    </button>
                    <button class="filter-btn" id="filterBtn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                        </svg>
                    </button>
                </div>
                
                <div class="search-suggestions" id="searchSuggestions"></div>
                
                <div class="search-filters" id="searchFilters">
                    <div class="filter-section">
                        <h4>Entity Type</h4>
                        <label><input type="checkbox" name="entity" value="vendors"> Vendors</label>
                        <label><input type="checkbox" name="entity" value="suppliers"> Suppliers</label>
                        <label><input type="checkbox" name="entity" value="orders"> Orders</label>
                        <label><input type="checkbox" name="entity" value="payments"> Payments</label>
                    </div>
                    
                    <div class="filter-section">
                        <h4>Status</h4>
                        <select name="status" id="statusFilter">
                            <option value="">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </div>
                    
                    <div class="filter-section">
                        <h4>Date Range</h4>
                        <input type="date" name="startDate" id="startDate">
                        <input type="date" name="endDate" id="endDate">
                    </div>
                    
                    <div class="filter-section">
                        <h4>Amount Range</h4>
                        <input type="number" name="minAmount" placeholder="Min amount" id="minAmount">
                        <input type="number" name="maxAmount" placeholder="Max amount" id="maxAmount">
                    </div>
                    
                    <div class="filter-actions">
                        <button class="apply-filters" id="applyFilters">Apply Filters</button>
                        <button class="clear-filters" id="clearFilters">Clear</button>
                        <button class="save-search" id="saveSearch">Save Search</button>
                    </div>
                </div>
                
                <div class="search-results" id="searchResults"></div>
                
                <div class="search-history" id="searchHistory">
                    <h4>Recent Searches</h4>
                    <div class="history-list" id="historyList"></div>
                </div>
                
                <div class="saved-searches" id="savedSearches">
                    <h4>Saved Searches</h4>
                    <div class="saved-list" id="savedList"></div>
                </div>
            </div>
        `;

        // Add to page (you can customize where to place this)
        const container = document.getElementById('searchContainer') || document.body;
        container.insertAdjacentHTML('beforeend', searchHTML);
        
        this.setupEventListeners();
        this.addSearchCSS();
        this.loadSearchHistory();
        this.loadSavedSearches();
    }

    setupEventListeners() {
        const searchInput = document.getElementById('globalSearch');
        const searchBtn = document.getElementById('searchBtn');
        const filterBtn = document.getElementById('filterBtn');
        const applyFilters = document.getElementById('applyFilters');
        const clearFilters = document.getElementById('clearFilters');
        const saveSearch = document.getElementById('saveSearch');

        // Search input events
        searchInput?.addEventListener('input', (e) => {
            this.handleSearchInput(e.target.value);
        });

        searchInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performSearch();
            }
        });

        // Button events
        searchBtn?.addEventListener('click', () => this.performSearch());
        filterBtn?.addEventListener('click', () => this.toggleFilters());
        applyFilters?.addEventListener('click', () => this.applyFilters());
        clearFilters?.addEventListener('click', () => this.clearFilters());
        saveSearch?.addEventListener('click', () => this.saveCurrentSearch());
    }

    async handleSearchInput(query) {
        if (query.length < 2) {
            this.hideSuggestions();
            return;
        }

        // Debounce search suggestions
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.showSuggestions(query);
        }, 300);
    }

    async showSuggestions(query) {
        try {
            const suggestions = await this.getSuggestions(query);
            const suggestionsContainer = document.getElementById('searchSuggestions');
            
            if (suggestions.length === 0) {
                this.hideSuggestions();
                return;
            }

            const escapeHtml = (text) => {
                const div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML;
            };

            const suggestionsHTML = suggestions.map(suggestion => `
                <div class="suggestion-item" onclick="SearchManager.selectSuggestion('${escapeHtml(suggestion.text)}', '${escapeHtml(suggestion.type)}')">
                    <div class="suggestion-icon">${this.getSuggestionIcon(suggestion.type)}</div>
                    <div class="suggestion-content">
                        <div class="suggestion-text">${escapeHtml(suggestion.text)}</div>
                        <div class="suggestion-type">${escapeHtml(suggestion.type)}</div>
                    </div>
                </div>
            `).join('');

            suggestionsContainer.innerHTML = suggestionsHTML;
            suggestionsContainer.style.display = 'block';
        } catch (error) {
            console.error('Failed to load suggestions:', error);
        }
    }

    async getSuggestions(query) {
        const suggestions = [];
        
        try {
            // Search vendors
            const { data: vendors } = await this.supabase
                .from('vendors')
                .select('business_name, email, phone')
                .or(`business_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
                .limit(5);

            vendors?.forEach(vendor => {
                suggestions.push({
                    text: vendor.business_name,
                    type: 'vendor',
                    data: vendor
                });
            });

            // Search suppliers
            const { data: suppliers } = await this.supabase
                .from('suppliers')
                .select('company_name, email, phone')
                .or(`company_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
                .limit(5);

            suppliers?.forEach(supplier => {
                suggestions.push({
                    text: supplier.company_name,
                    type: 'supplier',
                    data: supplier
                });
            });

            // Search orders
            const { data: orders } = await this.supabase
                .from('orders')
                .select('order_number, vendors(business_name)')
                .or(`order_number.ilike.%${query}%`)
                .limit(3);

            orders?.forEach(order => {
                suggestions.push({
                    text: `${order.order_number} - ${order.vendors?.business_name}`,
                    type: 'order',
                    data: order
                });
            });

        } catch (error) {
            console.error('Suggestion search failed:', error);
        }

        return suggestions;
    }

    selectSuggestion(text, type) {
        document.getElementById('globalSearch').value = text;
        this.hideSuggestions();
        this.performSearch();
    }

    hideSuggestions() {
        const suggestionsContainer = document.getElementById('searchSuggestions');
        suggestionsContainer.style.display = 'none';
    }

    async performSearch() {
        const query = document.getElementById('globalSearch').value.trim();
        if (!query) return;

        // Add to search history
        this.addToHistory(query);

        try {
            const results = await this.searchAll(query, this.getActiveFilters());
            this.displayResults(results);
        } catch (error) {
            console.error('Search failed:', error);
            this.showError('Search failed. Please try again.');
        }
    }

    async searchAll(query, filters = {}) {
        const results = {
            vendors: [],
            suppliers: [],
            orders: [],
            payments: []
        };

        try {
            // Search vendors
            if (!filters.entities || filters.entities.includes('vendors')) {
                const { data: vendors } = await this.supabase
                    .from('vendors')
                    .select('*')
                    .or(`business_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%,county.ilike.%${query}%`)
                    .limit(20);
                results.vendors = vendors || [];
            }

            // Search suppliers
            if (!filters.entities || filters.entities.includes('suppliers')) {
                const { data: suppliers } = await this.supabase
                    .from('suppliers')
                    .select('*')
                    .or(`company_name.ilike.%${query}%,contact_person.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
                    .limit(20);
                results.suppliers = suppliers || [];
            }

            // Search orders
            if (!filters.entities || filters.entities.includes('orders')) {
                const { data: orders } = await this.supabase
                    .from('orders')
                    .select(`
                        *,
                        vendors(business_name, phone),
                        suppliers(company_name, contact_person)
                    `)
                    .or(`order_number.ilike.%${query}%`)
                    .limit(20);
                results.orders = orders || [];
            }

            // Search payments
            if (!filters.entities || filters.entities.includes('payments')) {
                const { data: payments } = await this.supabase
                    .from('payments')
                    .select(`
                        *,
                        orders(order_number),
                        vendors(business_name, phone)
                    `)
                    .limit(20);
                results.payments = payments || [];
            }

        } catch (error) {
            console.error('Search error:', error);
        }

        return results;
    }

    displayResults(results) {
        const resultsContainer = document.getElementById('searchResults');
        
        const escapeHtml = (text) => {
            const div = document.createElement('div');
            div.textContent = text || '';
            return div.innerHTML;
        };
        
        let resultsHTML = '<div class="search-results-header"><h3>Search Results</h3></div>';
        
        // Display vendors
        if (results.vendors.length > 0) {
            resultsHTML += `
                <div class="result-section">
                    <h4>Vendors (${results.vendors.length})</h4>
                    ${results.vendors.map(vendor => `
                        <div class="result-item vendor-result">
                            <div class="result-icon">🏪</div>
                            <div class="result-content">
                                <div class="result-title">${escapeHtml(vendor.business_name)}</div>
                                <div class="result-details">
                                    ${escapeHtml(vendor.email)} • ${escapeHtml(vendor.phone)} • ${escapeHtml(vendor.county)}
                                </div>
                                <div class="result-meta">
                                    Status: ${escapeHtml(vendor.status)} • Category: ${escapeHtml(vendor.business_category)}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        // Display suppliers
        if (results.suppliers.length > 0) {
            resultsHTML += `
                <div class="result-section">
                    <h4>Suppliers (${results.suppliers.length})</h4>
                    ${results.suppliers.map(supplier => `
                        <div class="result-item supplier-result">
                            <div class="result-icon">📦</div>
                            <div class="result-content">
                                <div class="result-title">${escapeHtml(supplier.company_name)}</div>
                                <div class="result-details">
                                    ${escapeHtml(supplier.contact_person)} • ${escapeHtml(supplier.email)} • ${escapeHtml(supplier.phone)}
                                </div>
                                <div class="result-meta">
                                    Status: ${escapeHtml(supplier.status)} • Verified: ${supplier.verified ? 'Yes' : 'No'}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        // Display orders
        if (results.orders.length > 0) {
            resultsHTML += `
                <div class="result-section">
                    <h4>Orders (${results.orders.length})</h4>
                    ${results.orders.map(order => `
                        <div class="result-item order-result">
                            <div class="result-icon">📋</div>
                            <div class="result-content">
                                <div class="result-title">${escapeHtml(order.order_number)}</div>
                                <div class="result-details">
                                    Vendor: ${escapeHtml(order.vendors?.business_name)} • Supplier: ${escapeHtml(order.suppliers?.company_name)}
                                </div>
                                <div class="result-meta">
                                    Amount: KES ${order.total_amount?.toLocaleString()} • Status: ${escapeHtml(order.status)}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        if (results.vendors.length === 0 && results.suppliers.length === 0 && 
            results.orders.length === 0 && results.payments.length === 0) {
            resultsHTML += '<div class="no-results">No results found</div>';
        }

        resultsContainer.innerHTML = resultsHTML;
        resultsContainer.style.display = 'block';
    }

    toggleFilters() {
        const filtersContainer = document.getElementById('searchFilters');
        filtersContainer.style.display = filtersContainer.style.display === 'block' ? 'none' : 'block';
    }

    getActiveFilters() {
        const filters = {};
        
        // Get selected entities
        const entityCheckboxes = document.querySelectorAll('input[name="entity"]:checked');
        if (entityCheckboxes.length > 0) {
            filters.entities = Array.from(entityCheckboxes).map(cb => cb.value);
        }

        // Get other filters
        const status = document.getElementById('statusFilter')?.value;
        if (status) filters.status = status;

        const startDate = document.getElementById('startDate')?.value;
        if (startDate) filters.startDate = startDate;

        const endDate = document.getElementById('endDate')?.value;
        if (endDate) filters.endDate = endDate;

        const minAmount = document.getElementById('minAmount')?.value;
        if (minAmount) filters.minAmount = parseFloat(minAmount);

        const maxAmount = document.getElementById('maxAmount')?.value;
        if (maxAmount) filters.maxAmount = parseFloat(maxAmount);

        return filters;
    }

    applyFilters() {
        this.performSearch();
    }

    clearFilters() {
        document.querySelectorAll('#searchFilters input, #searchFilters select').forEach(input => {
            if (input.type === 'checkbox') {
                input.checked = false;
            } else {
                input.value = '';
            }
        });
        this.performSearch();
    }

    addToHistory(query) {
        // Remove if already exists
        this.searchHistory = this.searchHistory.filter(item => item.query !== query);
        
        // Add to beginning
        this.searchHistory.unshift({
            query,
            timestamp: Date.now()
        });

        // Keep only last 10
        this.searchHistory = this.searchHistory.slice(0, 10);
        
        localStorage.setItem('search_history', JSON.stringify(this.searchHistory));
        this.loadSearchHistory();
    }

    loadSearchHistory() {
        const historyContainer = document.getElementById('historyList');
        if (!historyContainer) return;

        if (this.searchHistory.length === 0) {
            historyContainer.innerHTML = '<div class="empty-state">No recent searches</div>';
            return;
        }

        const escapeHtml = (text) => {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        };

        const historyHTML = this.searchHistory.map(item => `
            <div class="history-item" onclick="SearchManager.useHistorySearch('${escapeHtml(item.query)}')">
                <div class="history-query">${escapeHtml(item.query)}</div>
                <div class="history-time">${escapeHtml(this.getTimeAgo(item.timestamp))}</div>
            </div>
        `).join('');

        historyContainer.innerHTML = historyHTML;
    }

    useHistorySearch(query) {
        document.getElementById('globalSearch').value = query;
        this.performSearch();
    }

    saveCurrentSearch() {
        const query = document.getElementById('globalSearch').value.trim();
        if (!query) return;

        const name = prompt('Enter a name for this search:');
        if (!name) return;

        const searchData = {
            name,
            query,
            filters: this.getActiveFilters(),
            timestamp: Date.now()
        };

        this.savedSearches.push(searchData);
        localStorage.setItem('saved_searches', JSON.stringify(this.savedSearches));
        this.loadSavedSearches();
    }

    loadSavedSearches() {
        const savedContainer = document.getElementById('savedList');
        if (!savedContainer) return;

        if (this.savedSearches.length === 0) {
            savedContainer.innerHTML = '<div class="empty-state">No saved searches</div>';
            return;
        }

        const escapeHtml = (text) => {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        };

        const savedHTML = this.savedSearches.map((search, index) => `
            <div class="saved-item">
                <div class="saved-content" onclick="SearchManager.useSavedSearch(${index})">
                    <div class="saved-name">${escapeHtml(search.name)}</div>
                    <div class="saved-query">${escapeHtml(search.query)}</div>
                </div>
                <button class="delete-saved" onclick="SearchManager.deleteSavedSearch(${index})">&times;</button>
            </div>
        `).join('');

        savedContainer.innerHTML = savedHTML;
    }

    useSavedSearch(index) {
        const search = this.savedSearches[index];
        if (!search) return;

        document.getElementById('globalSearch').value = search.query;
        
        // Apply saved filters
        Object.entries(search.filters).forEach(([key, value]) => {
            if (key === 'entities') {
                document.querySelectorAll('input[name="entity"]').forEach(cb => {
                    cb.checked = value.includes(cb.value);
                });
            } else {
                const element = document.getElementById(key + 'Filter') || document.getElementById(key);
                if (element) element.value = value;
            }
        });

        this.performSearch();
    }

    deleteSavedSearch(index) {
        this.savedSearches.splice(index, 1);
        localStorage.setItem('saved_searches', JSON.stringify(this.savedSearches));
        this.loadSavedSearches();
    }

    getSuggestionIcon(type) {
        const icons = {
            vendor: '🏪',
            supplier: '📦',
            order: '📋',
            payment: '💰'
        };
        return icons[type] || '🔍';
    }

    getTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    }

    showError(message) {
        const resultsContainer = document.getElementById('searchResults');
        const escapeHtml = (text) => {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        };
        resultsContainer.innerHTML = `<div class="search-error">${escapeHtml(message)}</div>`;
        resultsContainer.style.display = 'block';
    }

    addSearchCSS() {
        if (document.getElementById('search-styles')) return;

        const style = document.createElement('style');
        style.id = 'search-styles';
        style.textContent = `
            .advanced-search-container { max-width: 800px; margin: 20px auto; }
            .search-input-container {
                display: flex; gap: 8px; margin-bottom: 16px;
                position: relative;
            }
            .search-input {
                flex: 1; padding: 12px 16px; border: 2px solid #ddd;
                border-radius: 8px; font-size: 16px; outline: none;
                transition: border-color 0.2s;
            }
            .search-input:focus { border-color: #007bff; }
            .search-btn, .filter-btn {
                padding: 12px; background: #007bff; color: white;
                border: none; border-radius: 8px; cursor: pointer;
                transition: background 0.2s;
            }
            .search-btn:hover, .filter-btn:hover { background: #0056b3; }
            .search-btn svg, .filter-btn svg { width: 20px; height: 20px; }
            
            .search-suggestions {
                position: absolute; top: 100%; left: 0; right: 60px;
                background: white; border: 1px solid #ddd; border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 1000;
                display: none; max-height: 300px; overflow-y: auto;
            }
            .suggestion-item {
                padding: 12px 16px; cursor: pointer; display: flex;
                align-items: center; gap: 12px; border-bottom: 1px solid #f5f5f5;
                transition: background 0.2s;
            }
            .suggestion-item:hover { background: #f8f9fa; }
            .suggestion-icon { font-size: 20px; }
            .suggestion-text { font-weight: 500; }
            .suggestion-type { font-size: 12px; color: #666; }
            
            .search-filters {
                background: #f8f9fa; padding: 20px; border-radius: 8px;
                margin-bottom: 16px; display: none;
            }
            .filter-section { margin-bottom: 16px; }
            .filter-section h4 { margin: 0 0 8px 0; font-size: 14px; }
            .filter-section label {
                display: block; margin-bottom: 4px; font-size: 14px;
            }
            .filter-section input, .filter-section select {
                padding: 8px; border: 1px solid #ddd; border-radius: 4px;
                margin-right: 8px; margin-bottom: 8px;
            }
            .filter-actions {
                display: flex; gap: 8px; margin-top: 16px;
            }
            .filter-actions button {
                padding: 8px 16px; border: none; border-radius: 4px;
                cursor: pointer; font-size: 14px; transition: background 0.2s;
            }
            .apply-filters { background: #28a745; color: white; }
            .clear-filters { background: #6c757d; color: white; }
            .save-search { background: #17a2b8; color: white; }
            
            .search-results { display: none; }
            .search-results-header h3 { margin: 0 0 16px 0; }
            .result-section { margin-bottom: 24px; }
            .result-section h4 {
                margin: 0 0 12px 0; color: #333; font-size: 16px;
                border-bottom: 2px solid #007bff; padding-bottom: 4px;
            }
            .result-item {
                display: flex; align-items: flex-start; gap: 12px;
                padding: 12px; border: 1px solid #eee; border-radius: 8px;
                margin-bottom: 8px; transition: box-shadow 0.2s;
            }
            .result-item:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            .result-icon { font-size: 24px; }
            .result-content { flex: 1; }
            .result-title { font-weight: 600; font-size: 16px; margin-bottom: 4px; }
            .result-details { color: #666; font-size: 14px; margin-bottom: 4px; }
            .result-meta { color: #999; font-size: 12px; }
            
            .search-history, .saved-searches {
                background: #f8f9fa; padding: 16px; border-radius: 8px;
                margin-top: 16px;
            }
            .search-history h4, .saved-searches h4 {
                margin: 0 0 12px 0; font-size: 14px;
            }
            .history-item, .saved-item {
                display: flex; justify-content: space-between; align-items: center;
                padding: 8px 12px; background: white; border-radius: 4px;
                margin-bottom: 4px; cursor: pointer; transition: background 0.2s;
            }
            .history-item:hover, .saved-item:hover { background: #e9ecef; }
            .history-query, .saved-name { font-weight: 500; }
            .history-time, .saved-query { font-size: 12px; color: #666; }
            .delete-saved {
                background: #dc3545; color: white; border: none;
                border-radius: 50%; width: 24px; height: 24px;
                cursor: pointer; font-size: 16px;
            }
            .empty-state, .no-results, .search-error {
                text-align: center; padding: 20px; color: #666;
            }
            .search-error { color: #dc3545; }
        `;
        document.head.appendChild(style);
    }
}

// Initialize search manager
window.SearchManager = new SearchManager();