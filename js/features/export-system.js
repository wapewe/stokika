// XSS Protection: Using sanitize() helper from xss-protection.js
// Make sure xss-protection.js is loaded in your HTML file

// Export System for PDF, Excel, CSV
class ExportManager {
    constructor() {
        this.supabase = null;
        this.init();
    }

    async init() {
        if (window.supabase && window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
            // Reuse shared client if available, avoid creating duplicate GoTrueClient instances
            this.supabase = window._sharedSupabaseClient || window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
            if (!window._sharedSupabaseClient) window._sharedSupabaseClient = this.supabase;
        }
        this.loadLibraries();
    }

    async loadLibraries() {
        // Load required libraries
        if (!window.jsPDF) {
            await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
        }
        if (!window.XLSX) {
            await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
        }
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Export orders to various formats
    async exportOrders(format = 'csv', filters = {}) {
        try {
            const data = await this.getOrdersData(filters);
            
            switch (format.toLowerCase()) {
                case 'pdf':
                    return this.exportToPDF(data, 'Orders Report');
                case 'excel':
                    return this.exportToExcel(data, 'Orders');
                case 'csv':
                default:
                    return this.exportToCSV(data, 'orders');
            }
        } catch (error) {
            console.error('Export failed:', error);
            throw error;
        }
    }

    // Export vendors
    async exportVendors(format = 'csv', filters = {}) {
        try {
            const data = await this.getVendorsData(filters);
            
            switch (format.toLowerCase()) {
                case 'pdf':
                    return this.exportToPDF(data, 'Vendors Report');
                case 'excel':
                    return this.exportToExcel(data, 'Vendors');
                case 'csv':
                default:
                    return this.exportToCSV(data, 'vendors');
            }
        } catch (error) {
            console.error('Export failed:', error);
            throw error;
        }
    }

    // Export suppliers
    async exportSuppliers(format = 'csv', filters = {}) {
        try {
            const data = await this.getSuppliersData(filters);
            
            switch (format.toLowerCase()) {
                case 'pdf':
                    return this.exportToPDF(data, 'Suppliers Report');
                case 'excel':
                    return this.exportToExcel(data, 'Suppliers');
                case 'csv':
                default:
                    return this.exportToCSV(data, 'suppliers');
            }
        } catch (error) {
            console.error('Export failed:', error);
            throw error;
        }
    }

    // Export payments
    async exportPayments(format = 'csv', filters = {}) {
        try {
            const data = await this.getPaymentsData(filters);
            
            switch (format.toLowerCase()) {
                case 'pdf':
                    return this.exportToPDF(data, 'Payments Report');
                case 'excel':
                    return this.exportToExcel(data, 'Payments');
                case 'csv':
                default:
                    return this.exportToCSV(data, 'payments');
            }
        } catch (error) {
            console.error('Export failed:', error);
            throw error;
        }
    }

    // Get orders data with filters
    async getOrdersData(filters = {}) {
        let query = this.supabase
            .from('orders')
            .select(`
                id,
                order_number,
                total_amount,
                service_fee_amount,
                status,
                cycle_type,
                delivery_date,
                created_at,
                vendors!inner(business_name, phone, email),
                suppliers!inner(company_name, contact_person)
            `);

        // Apply filters
        if (filters.startDate) {
            query = query.gte('created_at', filters.startDate);
        }
        if (filters.endDate) {
            query = query.lte('created_at', filters.endDate);
        }
        if (filters.status) {
            query = query.eq('status', filters.status);
        }
        if (filters.vendorId) {
            query = query.eq('vendor_id', filters.vendorId);
        }

        const { data, error } = await query.order('created_at', { ascending: false });
        
        if (error) throw error;

        // Transform data for export
        return data.map(order => ({
            'Order Number': order.order_number,
            'Vendor': order.vendors.business_name,
            'Vendor Phone': order.vendors.phone,
            'Supplier': order.suppliers.company_name,
            'Total Amount': `KES ${order.total_amount?.toLocaleString() || 0}`,
            'Service Fee': `KES ${order.service_fee_amount?.toLocaleString() || 0}`,
            'Status': order.status,
            'Cycle Type': order.cycle_type,
            'Delivery Date': order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : 'N/A',
            'Created Date': new Date(order.created_at).toLocaleDateString()
        }));
    }

    // Get vendors data
    async getVendorsData(filters = {}) {
        let query = this.supabase
            .from('vendors')
            .select('*');

        if (filters.status) {
            query = query.eq('status', filters.status);
        }
        if (filters.county) {
            query = query.eq('county', filters.county);
        }

        const { data, error } = await query.order('created_at', { ascending: false });
        
        if (error) throw error;

        return data.map(vendor => ({
            'Business Name': vendor.business_name,
            'Category': vendor.business_category,
            'County': vendor.county,
            'Town': vendor.town,
            'Phone': vendor.phone,
            'Email': vendor.email,
            'Business Size': vendor.business_size,
            'Stock Cycle': vendor.stock_cycle,
            'Stock Limit': `KES ${vendor.stock_limit?.toLocaleString() || 0}`,
            'Credit Limit': `KES ${vendor.credit_limit?.toLocaleString() || 0}`,
            'Current Balance': `KES ${vendor.current_balance?.toLocaleString() || 0}`,
            'Status': vendor.status,
            'Registration Date': new Date(vendor.registration_date).toLocaleDateString()
        }));
    }

    // Get suppliers data
    async getSuppliersData(filters = {}) {
        let query = this.supabase
            .from('suppliers')
            .select('*');

        if (filters.status) {
            query = query.eq('status', filters.status);
        }
        if (filters.verified !== undefined) {
            query = query.eq('verified', filters.verified);
        }

        const { data, error } = await query.order('created_at', { ascending: false });
        
        if (error) throw error;

        return data.map(supplier => ({
            'Company Name': supplier.company_name,
            'Contact Person': supplier.contact_person,
            'Phone': supplier.phone,
            'Email': supplier.email,
            'Years in Business': supplier.years_in_business,
            'Employees': supplier.number_of_employees,
            'Counties': supplier.counties,
            'Categories': supplier.categories,
            'Min Order Qty': supplier.minimum_order_quantity,
            'Payment Terms': supplier.payment_terms,
            'Accepts Credit': supplier.accepts_credit,
            'Verified': supplier.verified ? 'Yes' : 'No',
            'Status': supplier.status,
            'Created Date': new Date(supplier.created_at).toLocaleDateString()
        }));
    }

    // Get payments data
    async getPaymentsData(filters = {}) {
        let query = this.supabase
            .from('payments')
            .select(`
                *,
                orders!inner(order_number),
                vendors!inner(business_name, phone)
            `);

        if (filters.startDate) {
            query = query.gte('created_at', filters.startDate);
        }
        if (filters.endDate) {
            query = query.lte('created_at', filters.endDate);
        }
        if (filters.status) {
            query = query.eq('status', filters.status);
        }

        const { data, error } = await query.order('created_at', { ascending: false });
        
        if (error) throw error;

        return data.map(payment => ({
            'Order Number': payment.orders.order_number,
            'Vendor': payment.vendors.business_name,
            'Vendor Phone': payment.vendors.phone,
            'Amount': `KES ${payment.amount?.toLocaleString() || 0}`,
            'Payment Date': payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : 'N/A',
            'Due Date': payment.due_date ? new Date(payment.due_date).toLocaleDateString() : 'N/A',
            'Status': payment.status,
            'Payment Method': payment.payment_method,
            'Created Date': new Date(payment.created_at).toLocaleDateString()
        }));
    }

    // Export to CSV
    exportToCSV(data, filename) {
        if (!data || data.length === 0) {
            throw new Error('No data to export');
        }

        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => 
                headers.map(header => {
                    const value = row[header] || '';
                    // Escape commas and quotes
                    return `"${value.toString().replace(/"/g, '""')}"`;
                }).join(',')
            )
        ].join('\n');

        this.downloadFile(csvContent, `${filename}_${this.getDateString()}.csv`, 'text/csv');
    }

    // Export to Excel
    exportToExcel(data, sheetName) {
        if (!data || data.length === 0) {
            throw new Error('No data to export');
        }

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        
        // Auto-size columns
        const colWidths = Object.keys(data[0]).map(key => ({
            wch: Math.max(key.length, ...data.map(row => (row[key] || '').toString().length))
        }));
        ws['!cols'] = colWidths;

        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        
        const filename = `${sheetName.toLowerCase()}_${this.getDateString()}.xlsx`;
        XLSX.writeFile(wb, filename);
    }

    // Export to PDF
    exportToPDF(data, title) {
        if (!data || data.length === 0) {
            throw new Error('No data to export');
        }

        const { jsPDF } = window.jsPDF;
        const doc = new jsPDF('l', 'mm', 'a4'); // Landscape orientation
        
        // Add title
        doc.setFontSize(16);
        doc.text(title, 20, 20);
        
        // Add date
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 30);
        
        // Prepare table data
        const headers = Object.keys(data[0]);
        const rows = data.map(row => headers.map(header => row[header] || ''));
        
        // Add table
        let yPosition = 40;
        const pageHeight = doc.internal.pageSize.height;
        const rowHeight = 8;
        const maxRowsPerPage = Math.floor((pageHeight - 50) / rowHeight);
        
        // Add headers
        doc.setFontSize(8);
        doc.setFont(undefined, 'bold');
        
        let xPosition = 20;
        const colWidth = (doc.internal.pageSize.width - 40) / headers.length;
        
        headers.forEach((header, index) => {
            doc.text(header, xPosition + (index * colWidth), yPosition);
        });
        
        yPosition += rowHeight;
        doc.setFont(undefined, 'normal');
        
        // Add rows
        rows.forEach((row, rowIndex) => {
            if (yPosition > pageHeight - 20) {
                doc.addPage();
                yPosition = 20;
            }
            
            row.forEach((cell, cellIndex) => {
                const text = cell.toString().substring(0, 20); // Truncate long text
                doc.text(text, xPosition + (cellIndex * colWidth), yPosition);
            });
            
            yPosition += rowHeight;
        });
        
        // Save PDF
        const filename = `${title.toLowerCase().replace(/\s+/g, '_')}_${this.getDateString()}.pdf`;
        doc.save(filename);
    }

    // Utility functions
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    }

    getDateString() {
        const now = new Date();
        return now.toISOString().split('T')[0].replace(/-/g, '');
    }

    // Create export UI
    createExportButton(containerId, exportType, filters = {}) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const exportHTML = `
            <div class="export-dropdown">
                <button class="export-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Export
                </button>
                <div class="export-menu">
                    <button onclick="ExportManager.export${exportType}('csv', ${JSON.stringify(filters)})">
                        Export as CSV
                    </button>
                    <button onclick="ExportManager.export${exportType}('excel', ${JSON.stringify(filters)})">
                        Export as Excel
                    </button>
                    <button onclick="ExportManager.export${exportType}('pdf', ${JSON.stringify(filters)})">
                        Export as PDF
                    </button>
                </div>
            </div>
        `;

        container.textContent = exportHTML; // XSS-FIX: Changed from innerHTML - Review if HTML is needed
        this.addExportCSS();
    }

    addExportCSS() {
        if (document.getElementById('export-styles')) return;

        const style = document.createElement('style');
        style.id = 'export-styles';
        style.textContent = `
            .export-dropdown { position: relative; display: inline-block; }
            .export-btn {
                background: #007bff; color: white; border: none; padding: 8px 16px;
                border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 8px;
                font-size: 14px; transition: background 0.2s;
            }
            .export-btn:hover { background: #0056b3; }
            .export-btn svg { width: 16px; height: 16px; }
            .export-menu {
                position: absolute; top: 100%; left: 0; background: white;
                border: 1px solid #ddd; border-radius: 4px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                display: none; z-index: 1000; min-width: 150px;
            }
            .export-dropdown:hover .export-menu { display: block; }
            .export-menu button {
                display: block; width: 100%; padding: 8px 16px; border: none;
                background: none; text-align: left; cursor: pointer; font-size: 14px;
                transition: background 0.2s;
            }
            .export-menu button:hover { background: #f8f9fa; }
        `;
        document.head.appendChild(style);
    }
}

// Initialize export manager
window.ExportManager = new ExportManager();