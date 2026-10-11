// Rate Limiter for API calls
class RateLimiter {
    constructor(maxRequests = 10, windowMs = 60000) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.requests = new Map();
    }

    canMakeRequest(key) {
        const now = Date.now();
        const userRequests = this.requests.get(key) || [];
        const recentRequests = userRequests.filter(time => now - time < this.windowMs);
        
        if (recentRequests.length >= this.maxRequests) return false;
        
        recentRequests.push(now);
        this.requests.set(key, recentRequests);
        return true;
    }

    async throttle(key, fn) {
        if (!this.canMakeRequest(key)) {
            throw new Error('Rate limit exceeded. Please wait before trying again.');
        }
        return await fn();
    }
}

window.SyncRateLimiter = new RateLimiter(10, 60000);
