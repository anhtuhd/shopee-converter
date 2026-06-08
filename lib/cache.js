class MemoryCache {
  constructor() {
    this.cache = new Map();
  }

  // Get data from cache
  get(key) {
    const cachedItem = this.cache.get(key);
    if (!cachedItem) return null;

    // Check expiry
    if (Date.now() > cachedItem.expiry) {
      this.cache.delete(key);
      return null;
    }
    return cachedItem.value;
  }

  // Set data in cache with TTL in seconds (default: 5 minutes / 300 seconds)
  set(key, value, ttlSeconds = 300) {
    const expiry = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { value, expiry });
  }

  // Evict single key from cache
  delete(key) {
    this.cache.delete(key);
  }

  // Clear all cache entries
  clear() {
    this.cache.clear();
  }
}

// Instantiate singleton pattern for Next.js hot-reloads
const globalCache = global.globalCache || new MemoryCache();
if (process.env.NODE_ENV !== 'production') {
  global.globalCache = globalCache;
}

export default globalCache;
