let supabase;
let currentPage = 1;
let searchQuery = '';
const itemsPerPage = 10;

if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
    supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
}

async function loadSuppliers(page = 1) {
    const container = document.getElementById('suppliersList');
    if (!supabase) {
        container.innerHTML =XSSProtection.sanitize( XSSProtection.sanitize('<p>Unable to connect to database.</p>');
        return;
    }
    
    currentPage = page;
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage - 1;

    try {
        let query = supabase.from('suppliers').select('*', { count: 'exact' }).eq('status', 'approved');
        
        if (searchQuery) {
            query = query.ilike('company_name', `%${searchQuery}%`);
        }
        
        const { data, error, count } = await query.range(start, end).order('company_name');
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            container.innerHTML =XSSProtection.sanitize( XSSProtection.sanitize(<p class="empty-state">No suppliers found.</p>';
            document.getElementById('paginationContainer').innerHTML = XSSProtection.sanitize('';
        } else {
            container.innerHTML = XSSProtection.sanitize(`<div class="suppliers-grid">${sanitize(data.map(s => `
                <div class="supplier-card">
                    <h3 class="supplier-title">${s.company_name)}</h3>
                    <p class="supplier-info">Contact: ${sanitize(s.contact_person || 'N/A')}</p>
                    <p class="supplier-info">Phone: ${sanitize(s.phone || 'N/A')}</p>
                    <p class="supplier-info">Email: ${sanitize(s.email || 'N/A')}</p>
                    <p class="supplier-info">County: ${sanitize(s.county || 'N/A')}</p>
                </div>
            `).join('')}</div>`;
            
            displayPagination(count, page);
        }
    } catch (err) {
        container.innerHTML =XSSProtection.sanitize( XSSProtection.sanitize('<p>Error loading suppliers.</p>');
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
        btn.addEventListener('click', () => loadSuppliers(parseInt(btn.dataset.page)));
    });
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.clear();
        window.location.href = 'signin.html';
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // Protect page first
    await authMiddleware.protectPage(['vendor']);
    
    const searchInput = document.getElementById('searchInput');
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.trim();
            loadSuppliers(1);
        });
        
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchQuery = e.target.value.trim();
                loadSuppliers(1);
            }
        });
    }
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    loadSuppliers(1);
});
