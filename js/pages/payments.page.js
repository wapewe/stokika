let supabase;
let currentPage = 1;
let searchQuery = '';
const itemsPerPage = 10;

// Initialize Supabase client
async function initSupabase() {
    if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
        supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    }
}

async function loadPayments(page = 1) {
    const container = document.getElementById('paymentsList');
    if (!supabase) {
        container.innerHTML =XSSProtection.sanitize( XSSProtection.sanitize('<p>Unable to connect to database.</p>');
        return;
    }
    
    currentPage = page;
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage - 1;

    try {
        let query = supabase.from('payments').select('*', { count: 'exact' });
        
        if (searchQuery) {
            query = query.or(`vendor_name.ilike.%${searchQuery}%,status.ilike.%${searchQuery}%`);
        }
        
        const { data, error, count } = await query.range(start, end).order('payment_date', { ascending: false });
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            container.innerHTML =XSSProtection.sanitize( XSSProtection.sanitize(<p class="empty-state">No payments found.</p>';
            document.getElementById('paginationContainer').innerHTML = XSSProtection.sanitize('';
        } else {
            container.innerHTML = XSSProtection.sanitize(`<div class="payments-grid">${sanitize(data.map(p => {
                const paymentDate = new Date(p.payment_date || p.due_date);
                const statusClass = p.status === 'verified' ? 'verified' : p.status === 'rejected' ? 'rejected' : 'pending';
                const cardStatusClass = p.status === 'verified' ? 'status-verified' : p.status === 'rejected' ? 'status-rejected' : 'status-pending';
                
                return `<div class="payment-card ${cardStatusClass)}">
                    <div class="payment-header">
                        <div>
                            <strong class="payment-vendor">${sanitize(p.vendor_name || 'Unknown Vendor')}</strong><br>
                            <span class="payment-amount">KES ${sanitize((p.amount || 0).toLocaleString())}</span><br>
                            <small class="payment-details">${sanitize(paymentDate.toLocaleDateString())} - ${sanitize(p.payment_method || 'N/A')}</small>
                            ${sanitize(p.mpesa_code ? '<br><small class="payment-details">Code: ' + p.mpesa_code + '</small>' : '')}
                        </div>
                        <span class="payment-status ${sanitize(statusClass)}">${sanitize(p.status || 'pending')}</span>
                    </div>
                </div>`;
            }).join('')}</div>`;
            
            displayPagination(count, page);
        }
    } catch (err) {
        container.innerHTML =XSSProtection.sanitize( XSSProtection.sanitize('<p>Error loading payments.</p>');
    }
}

function displayPagination(totalCount, currentPage) {
    const container = document.getElementById('paginationContainer');
    const totalPages = Math.ceil(totalCount / itemsPerPage);
    
    if (totalPages <= 1) {
        container.textContent = '';
        return;
    }
    
    let html = '';
    
    if (currentPage > 1) {
        html += `<button class="pagination-btn" data-page="${currentPage - 1}">Previous</button>`;
    }
    
    html += `<span class="pagination-info">Page ${currentPage} of ${totalPages}</span>`;
    
    if (currentPage < totalPages) {
        html += `<button class="pagination-btn" data-page="${currentPage + 1}">Next</button>`;
    }
    
    container.textContent = html; // XSS-FIX: Changed from innerHTML - Review if HTML is needed
    
    container.querySelectorAll('.pagination-btn').forEach(btn => {
        btn.addEventListener('click', () => loadPayments(parseInt(btn.dataset.page)));
    });
}

// Initialize page
async function initPaymentsPage() {
    try {
        await initSupabase();
        await authMiddleware.protectPage(['vendor']);
        
        const searchInput = document.getElementById('searchInput');
        
        // Initialize input sanitization
        if (window.InputSanitizer && searchInput) {
            const searchContainer = searchInput.closest('.search-container');
            if (searchContainer) {
                // Add real-time validation
                searchInput.addEventListener('blur', () => {
                    const result = InputSanitizer.validate(
                        searchInput.value, 
                        'string', 
                        { maxLength: 100 }
                    );
                    
                    if (!result.valid) {
                        InputSanitizer.showError(searchInput, result.errors[0]);
                    } else {
                        InputSanitizer.clearError(searchInput);
                        searchInput.value = result.value;
                    }
                });
                
                searchInput.addEventListener('input', () => {
                    if (searchInput.classList.contains('input-error')) {
                        InputSanitizer.clearError(searchInput);
                    }
                });
            }
        }
        
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                // Sanitize input before using it in query
                const sanitized = window.InputSanitizer 
                    ? InputSanitizer.sanitizeString(e.target.value.trim())
                    : e.target.value.trim();
                searchQuery = sanitized;
                loadPayments(1);
            });
            
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    // Sanitize input before using it in query
                    const sanitized = window.InputSanitizer 
                        ? InputSanitizer.sanitizeString(e.target.value.trim())
                        : e.target.value.trim();
                    searchQuery = sanitized;
                    loadPayments(1);
                }
            });
        }
        
        loadPayments(1);
    } catch (error) {
        console.error('Failed to initialize payments page:', error);
    }
}

// Auto-initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPaymentsPage);
} else {
    initPaymentsPage();
}
