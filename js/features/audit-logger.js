// Audit Logging Module
class AuditLogger {
    constructor() {
        this.dbName = 'stokika-audit';
        this.storeName = 'logs';
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async log(action, details = {}) {
        const db = await this.init();
        const log = {
            action,
            details,
            timestamp: new Date().toISOString(),
            userId: localStorage.getItem('vendor_id'),
            userRole: localStorage.getItem('user_role'),
            ip: await this.getIP()
        };
        
        const tx = db.transaction([this.storeName], 'readwrite');
        tx.objectStore(this.storeName).add(log);
        
        // Also send to server if online
        if (navigator.onLine && window.supabase) {
            try {
                await window.supabase.from('audit_logs').insert(log);
            } catch (e) {}
        }
    }

    async getIP() {
        try {
            const res = await fetch('https://api.ipify.org?format=json');
            const data = await res.json();
            return data.ip;
        } catch {
            return 'unknown';
        }
    }
}

window.AuditLogger = new AuditLogger();
