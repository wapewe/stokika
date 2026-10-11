// Common functionality for all dashboard pages
let supabase;
let currentPage = 1;
const itemsPerPage = 10;

function initSupabase() {
    if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
        supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    }
}

function createPagination(total, current, onPageChange) {
    const totalPages = Math.ceil(total / itemsPerPage);
    if (totalPages <= 1) return '';
    
    let html = '<div style="display:flex;justify-content:center;align-items:center;gap:0.5rem;margin-top:2rem">';
    
    if (current > 1) {
        html += '<button onclick="' + onPageChange + '(' + (current - 1) + ')" style="padding:0.5rem 1rem;border:1px solid #e5e7eb;border-radius:8px;background:#fff;cursor:pointer">Previous</button>';
    }
    
    html += '<span style="padding:0.5rem 1rem">Page ' + current + ' of ' + totalPages + '</span>';
    
    if (current < totalPages) {
        html += '<button onclick="' + onPageChange + '(' + (current + 1) + ')" style="padding:0.5rem 1rem;border:1px solid #e5e7eb;border-radius:8px;background:#fff;cursor:pointer">Next</button>';
    }
    
    html += '</div>';
    return html;
}

function addSearchBar(containerId, placeholder, onSearch) {
    const header = document.querySelector('.dashboard-header');
    if (!header || document.getElementById('pageSearchInput')) return;
    
    const searchBox = document.createElement('div');
    searchBox.className = 'search-box';
    searchBox.style.cssText = 'margin-top:1rem';
    searchBox.innerHTML =XSSProtection.sanitize( XSSProtection.sanitize(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx...1" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg><input type="text" id="pageSearchInput" sanitize(placeholder)="' + placeholder + '" style="width:300px">';
    header.appendChild(searchBox);
    
    document.getElementById('pageSearchInput').addEventListener('keyup', function(e) {
        if (onSearch) onSearch(e.target.value);
    });
}

initSupabase();
