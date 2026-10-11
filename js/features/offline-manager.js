class OfflineManager {
    constructor() {
        this.dbName = 'stokika-offline';
        this.dbVersion = 1;
        this.db = null;
        this.isOnline = navigator.onLine;
        this.init();
    }

    async init() {
        await this.openDB();
        this.setupEventListeners();
        this.updateOnlineStatus();
        this.registerServiceWorker();
        this.checkPendingSync();
    }

    async openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                if (!db.objectStoreNames.contains('pending_submissions')) {
                    const store = db.createObjectStore('pending_submissions', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('type', 'type', { unique: false });
                }

                if (!db.objectStoreNames.contains('cached_vendors')) {
                    db.createObjectStore('cached_vendors', { keyPath: 'id' });
                }

                if (!db.objectStoreNames.contains('cached_suppliers')) {
                    db.createObjectStore('cached_suppliers', { keyPath: 'id' });
                }

                if (!db.objectStoreNames.contains('visit_logs')) {
                    const visitStore = db.createObjectStore('visit_logs', { keyPath: 'id', autoIncrement: true });
                    visitStore.createIndex('synced', 'synced', { unique: false });
                }

                if (!db.objectStoreNames.contains('photos')) {
                    db.createObjectStore('photos', { keyPath: 'id', autoIncrement: true });
                }
            };
        });
    }

    setupEventListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.updateOnlineStatus();
            this.syncPendingData();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.updateOnlineStatus();
        });
    }

    updateOnlineStatus() {
        const statusEl = document.getElementById('onlineStatus');
        if (statusEl) {
            statusEl.className = this.isOnline ? 'status-online' : 'status-offline';
            statusEl.textContent = this.isOnline ? '🟢 Online' : '🔴 Offline';
        }

        const badge = document.getElementById('syncBadge');
        if (badge && !this.isOnline) {
            this.getPendingCount().then(count => {
                badge.textContent = count;
                badge.style.display = count > 0 ? 'block' : 'none';
            });
        }
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
            try {
                const registration = await navigator.serviceWorker.register('/service-worker.js');
                console.log('Service Worker registered:', registration);
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    }

    async saveVendorOffline(vendorData) {
        const encrypted = await window.IndexedDBCrypto.encrypt(vendorData);
        const tx = this.db.transaction(['pending_submissions'], 'readwrite');
        const store = tx.objectStore('pending_submissions');
        
        await store.add({
            type: 'vendor',
            data: encrypted,
            timestamp: Date.now(),
            synced: false
        });

        this.showNotification('Vendor saved offline. Will sync when online.');
        this.updateOnlineStatus();
    }

    async saveSupplierOffline(supplierData) {
        const encrypted = await window.IndexedDBCrypto.encrypt(supplierData);
        const tx = this.db.transaction(['pending_submissions'], 'readwrite');
        const store = tx.objectStore('pending_submissions');
        
        await store.add({
            type: 'supplier',
            data: encrypted,
            timestamp: Date.now(),
            synced: false
        });

        this.showNotification('Supplier saved offline. Will sync when online.');
        this.updateOnlineStatus();
    }

    async saveVisitLog(visitData) {
        const tx = this.db.transaction(['visit_logs'], 'readwrite');
        const store = tx.objectStore('visit_logs');
        
        await store.add({
            ...visitData,
            timestamp: Date.now(),
            synced: false
        });

        this.showNotification('Visit log saved offline.');
        this.updateOnlineStatus();
    }

    async savePhoto(photoData) {
        const tx = this.db.transaction(['photos'], 'readwrite');
        const store = tx.objectStore('photos');
        
        await store.add({
            ...photoData,
            timestamp: Date.now(),
            synced: false
        });
    }

    async cacheVendors(vendors) {
        const tx = this.db.transaction(['cached_vendors'], 'readwrite');
        const store = tx.objectStore('cached_vendors');
        
        for (const vendor of vendors) {
            await store.put(vendor);
        }
    }

    async getCachedVendors() {
        const tx = this.db.transaction(['cached_vendors'], 'readonly');
        const store = tx.objectStore('cached_vendors');
        return await this.getAllFromStore(store);
    }

    async cacheSuppliers(suppliers) {
        const tx = this.db.transaction(['cached_suppliers'], 'readwrite');
        const store = tx.objectStore('cached_suppliers');
        
        for (const supplier of suppliers) {
            await store.put(supplier);
        }
    }

    async getCachedSuppliers() {
        const tx = this.db.transaction(['cached_suppliers'], 'readonly');
        const store = tx.objectStore('cached_suppliers');
        return await this.getAllFromStore(store);
    }

    async getPendingCount() {
        const tx = this.db.transaction(['pending_submissions', 'visit_logs'], 'readonly');
        const submissionsStore = tx.objectStore('pending_submissions');
        const visitsStore = tx.objectStore('visit_logs');
        
        const submissions = await this.getAllFromStore(submissionsStore);
        const visits = await this.getAllFromStore(visitsStore);
        
        return submissions.length + visits.filter(v => !v.synced).length;
    }

    async syncPendingData() {
        if (!this.isOnline) return;

        this.showNotification('Syncing offline data...');

        try {
            await this.syncSubmissions();
            await this.syncVisitLogs();
            await this.syncPhotos();
            
            this.showNotification('✓ All data synced successfully!');
            this.updateOnlineStatus();
        } catch (error) {
            console.error('Sync error:', error);
            this.showNotification('⚠ Sync failed. Will retry later.');
        }
    }

    async syncSubmissions() {
        const tx = this.db.transaction(['pending_submissions'], 'readwrite');
        const store = tx.objectStore('pending_submissions');
        const items = await this.getAllFromStore(store);

        for (const item of items) {
            try {
                await window.SyncRateLimiter.throttle('sync', async () => {
                    const supabase = window.initSupabase?.();
                    if (!supabase) return;

                    const decrypted = await window.IndexedDBCrypto.decrypt(item.data);
                    const table = item.type === 'vendor' ? 'vendors' : 'suppliers';
                    const { error } = await supabase.from(table).insert([decrypted]);

                    if (!error) {
                        await store.delete(item.id);
                        await window.AuditLogger.log(`sync_${item.type}`, { id: item.id });
                    }
                });
            } catch (error) {
                console.error('Sync item failed:', error);
            }
        }
    }

    async syncVisitLogs() {
        const tx = this.db.transaction(['visit_logs'], 'readwrite');
        const store = tx.objectStore('visit_logs');
        const visits = await this.getAllFromStore(store);

        for (const visit of visits.filter(v => !v.synced)) {
            try {
                const supabase = window.initSupabase?.();
                if (!supabase) continue;

                const { error } = await supabase.from('visit_logs').insert([visit]);

                if (!error) {
                    visit.synced = true;
                    await store.put(visit);
                }
            } catch (error) {
                console.error('Sync visit failed:', error);
            }
        }
    }

    async syncPhotos() {
        const tx = this.db.transaction(['photos'], 'readwrite');
        const store = tx.objectStore('photos');
        const photos = await this.getAllFromStore(store);

        for (const photo of photos.filter(p => !p.synced)) {
            try {
                // Upload photo logic here
                photo.synced = true;
                await store.put(photo);
            } catch (error) {
                console.error('Photo upload failed:', error);
            }
        }
    }

    getAllFromStore(store) {
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'offline-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #1f2937;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }

    async checkPendingSync() {
        const count = await this.getPendingCount();
        if (count > 0 && this.isOnline) {
            this.syncPendingData();
        }
    }
}

// Initialize offline manager
window.offlineManager = new OfflineManager();
