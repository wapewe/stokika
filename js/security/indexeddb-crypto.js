// IndexedDB Encryption Module
class IndexedDBCrypto {
    constructor() {
        this.algorithm = 'AES-GCM';
        this.keyLength = 256;
    }

    async getKey() {
        const stored = sessionStorage.getItem('idb_key');
        if (stored) return await crypto.subtle.importKey('jwk', JSON.parse(stored), {name: this.algorithm}, false, ['encrypt', 'decrypt']);
        
        const key = await crypto.subtle.generateKey({name: this.algorithm, length: this.keyLength}, true, ['encrypt', 'decrypt']);
        const exported = await crypto.subtle.exportKey('jwk', key);
        sessionStorage.setItem('idb_key', JSON.stringify(exported));
        return key;
    }

    async encrypt(data) {
        const key = await this.getKey();
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encoded = new TextEncoder().encode(JSON.stringify(data));
        const encrypted = await crypto.subtle.encrypt({name: this.algorithm, iv}, key, encoded);
        return {data: Array.from(new Uint8Array(encrypted)), iv: Array.from(iv)};
    }

    async decrypt(encrypted) {
        const key = await this.getKey();
        const decrypted = await crypto.subtle.decrypt(
            {name: this.algorithm, iv: new Uint8Array(encrypted.iv)},
            key,
            new Uint8Array(encrypted.data)
        );
        return JSON.parse(new TextDecoder().decode(decrypted));
    }
}

window.IndexedDBCrypto = new IndexedDBCrypto();
