// Bulk Operations - CSV Upload/Export System
class BulkOperations {
    constructor() {
        this.supabase = null;
    }

    async init() {
        this.supabase = initSupabase();
        if (!this.supabase) throw new Error('Database connection failed');
    }

    // CSV Export Functions
    async exportToCSV(tableName, filters = {}) {
        try {
            let query = this.supabase.from(tableName).select('*');
            
            // Apply filters
            Object.entries(filters).forEach(([key, value]) => {
                if (value) query = query.eq(key, value);
            });

            const { data, error } = await query;
            if (error) throw error;

            if (!data || data.length === 0) {
                showUserMessage('No data to export', 'warning');
                return;
            }

            const csv = this.convertToCSV(data);
            this.downloadCSV(csv, `${tableName}_export_${new Date().toISOString().split('T')[0]}.csv`);
            
            showUserMessage(`Exported ${data.length} records successfully`, 'success');
        } catch (error) {
            console.error('Export error:', error);
            showUserMessage('Export failed', 'error');
        }
    }

    convertToCSV(data) {
        if (!data.length) return '';
        
        const headers = Object.keys(data[0]);
        const csvHeaders = headers.join(',');
        
        const csvRows = data.map(row => 
            headers.map(header => {
                const value = row[header];
                // Handle special characters and commas
                if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value || '';
            }).join(',')
        );
        
        return [csvHeaders, ...csvRows].join('\n');
    }

    downloadCSV(csv, filename) {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    // CSV Import Functions
    showImportModal(tableName) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = XSSProtection.sanitize(`
            <div class="modal-content">
                <div class="modal-header">
  ...               <h2>Import ${sanitize(tableName)} Data</h2>
                    <button type="button" class="close">&times;</button>
                </div>
                <div class="import-section">
                    <div class="form-group">
                        <label>Select CSV File</label>
                        <input type="file" id="csvFileInput" accept=".csv" required>
                        <small>File should contain headers matching database columns</small>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="skipFirstRow" checked>
                            Skip first row (headers)
                        </label>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="updateExisting">
                            Update existing records (match by email/ID)
                        </label>
                    </div>
                    <button class="btn-submit" onclick="window.bulkOps.processCSVImport('${sanitize(tableName)}')">
                        Import Data
                    </button>
                </div>
                <div id="importProgress" style="display: none;">
                    <div class="progress-bar">
                        <div class="progress-fill" id="progressFill"></div>
                    </div>
                    <p id="progressText">Processing...</p>
                </div>
                <div id="importResults" style="display: none;"></div>
            </div>
        `);
        
        document.body.appendChild(modal);
        modal.style.display = 'block';
        
        modal.querySelector('.close').onclick = () => modal.remove();
    }

    async processCSVImport(tableName) {
        const fileInput = document.getElementById('csvFileInput');
        const skipFirstRow = document.getElementById('skipFirstRow').checked;
        const updateExisting = document.getElementById('updateExisting').checked;
        
        if (!fileInput.files[0]) {
            showUserMessage('Please select a CSV file', 'error');
            return;
        }

        const file = fileInput.files[0];
        const progressSection = document.getElementById('importProgress');
        const resultsSection = document.getElementById('importResults');
        
        progressSection.style.display = 'block';
        
        try {
            const csvText = await this.readFileAsText(file);
            const rows = this.parseCSV(csvText);
            
            if (rows.length === 0) {
                throw new Error('CSV file is empty');
            }

            let dataRows = skipFirstRow ? rows.slice(1) : rows;
            const headers = skipFirstRow ? rows[0] : Object.keys(dataRows[0]);
            
            const results = await this.importData(tableName, dataRows, headers, updateExisting);
            
            resultsSection.innerHTML = XSSProtection.sanitize(`
                <div class="import-summary">
                    <h3>Import Complete</h3>
                    <p>✅ Successfully imported: ${results.success}</p>
                    <p>❌ Failed records: ${results.failed}</p>
                    ${results.errors.length > 0 ? `
                        <details>
                            <summary>View Errors</summary>
                            <ul>${results.errors.map(err => `<li>${err}</li>`).join('')}</ul>
                        </details>
                    ` : ''}
                </div>
            `);
            resultsSection.style.display = 'block';
            
        } catch (error) {
            console.error('Import error:', error);
            showUserMessage('Import failed: ' + error.message, 'error');
        } finally {
            progressSection.style.display = 'none';
        }
    }

    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    parseCSV(csvText) {
        const lines = csvText.split('\n').filter(line => line.trim());
        return lines.map(line => {
            const values = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    values.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            values.push(current.trim());
            return values;
        });
    }

    async importData(tableName, dataRows, headers, updateExisting) {
        const results = { success: 0, failed: 0, errors: [] };
        const batchSize = 50;
        
        for (let i = 0; i < dataRows.length; i += batchSize) {
            const batch = dataRows.slice(i, i + batchSize);
            const progressFill = document.getElementById('progressFill');
            const progressText = document.getElementById('progressText');
            
            const progress = Math.round((i / dataRows.length) * 100);
            if (progressFill) progressFill.style.width = `${progress}%`;
            if (progressText) progressText.textContent = `Processing ${i + 1}-${Math.min(i + batchSize, dataRows.length)} of ${dataRows.length} records...`;
            
            for (const row of batch) {
                try {
                    const record = {};
                    headers.forEach((header, index) => {
                        if (row[index] !== undefined) {
                            record[header] = row[index];
                        }
                    });
                    
                    if (updateExisting && (record.email || record.id)) {
                        const { error } = await this.supabase
                            .from(tableName)
                            .upsert(record);
                        if (error) throw error;
                    } else {
                        const { error } = await this.supabase
                            .from(tableName)
                            .insert(record);
                        if (error) throw error;
                    }
                    
                    results.success++;
                } catch (error) {
                    results.failed++;
                    results.errors.push(`Row ${i + batch.indexOf(row) + 1}: ${error.message}`);
                }
            }
            
            // Small delay to prevent overwhelming the database
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        return results;
    }
}

// Export functions for different data types
window.exportAgents = async function() {
    await window.bulkOps.exportToCSV('field_agents');
};

window.exportVendors = async function() {
    await window.bulkOps.exportToCSV('vendors');
};

window.exportSuppliers = async function() {
    await window.bulkOps.exportToCSV('suppliers');
};

window.exportOrders = async function() {
    const statusFilter = document.getElementById('orderStatusFilter')?.value || '';
    const filters = statusFilter ? { status: statusFilter } : {};
    await window.bulkOps.exportToCSV('orders', filters);
};

window.exportPayments = async function() {
    await window.bulkOps.exportToCSV('payments');
};

// Import functions
window.importAgents = function() {
    window.bulkOps.showImportModal('field_agents');
};

window.importVendors = function() {
    window.bulkOps.showImportModal('vendors');
};

window.importSuppliers = function() {
    window.bulkOps.showImportModal('suppliers');
};

window.importProducts = function() {
    window.bulkOps.showImportModal('products');
};

// Initialize bulk operations
document.addEventListener('DOMContentLoaded', function() {
    window.bulkOps = new BulkOperations();
    window.bulkOps.init();
});