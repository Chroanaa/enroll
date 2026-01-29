/**
 * Cache Utility
 *
 * Provides in-memory caching for API calls to reduce database fetches.
 * Cache entries have a configurable TTL (time-to-live) and can be
 * invalidated manually or automatically on mutations.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface PendingRequest<T> {
  promise: Promise<T>;
}

class CacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private pendingRequests: Map<string, PendingRequest<any>> = new Map();
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutes default

  /**
   * Get cached data or fetch if not cached/expired
   */
  async getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    // Check if we have valid cached data
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Check if there's already a pending request for this key
    const pending = this.pendingRequests.get(key);
    if (pending) {
      return pending.promise;
    }

    // Create new request and store it
    const requestPromise = fetchFn()
      .then((data) => {
        this.set(key, data, ttl);
        this.pendingRequests.delete(key);
        return data;
      })
      .catch((error) => {
        this.pendingRequests.delete(key);
        throw error;
      });

    this.pendingRequests.set(key, { promise: requestPromise });
    return requestPromise;
  }

  /**
   * Get data from cache if valid
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      // Cache expired
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set data in cache
   */
  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTTL,
    });
  }

  /**
   * Invalidate specific cache key
   */
  invalidate(key: string): void {
    this.cache.delete(key);
    this.pendingRequests.delete(key);
  }

  /**
   * Invalidate all cache keys matching a pattern
   */
  invalidatePattern(pattern: string | RegExp): void {
    const regex = typeof pattern === "string" ? new RegExp(pattern) : pattern;
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
    for (const key of this.pendingRequests.keys()) {
      if (regex.test(key)) {
        this.pendingRequests.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }

  /**
   * Set default TTL
   */
  setDefaultTTL(ttl: number): void {
    this.defaultTTL = ttl;
  }

  /**
   * Get cache stats for debugging
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Singleton instance
export const cacheManager = new CacheManager();

// Cache keys for different resources
export const CACHE_KEYS = {
  BUILDINGS: "buildings",
  SECTIONS: "sections",
  ROOMS: "rooms",
  DEPARTMENTS: "departments",
  PROGRAMS: "programs",
  MAJORS: "majors",
  FACULTIES: "faculties",
  FEES: "fees",
  SUBJECTS: "subjects",
  CURRICULUMS: "curriculums",
  ENROLLMENTS: "enrollments",
  BILLINGS: "billings",
  UNBILLED_ENROLLEES: "unbilled_enrollees",
  PRODUCTS: "products",
  CATEGORIES: "categories",
  ORDERS: "orders",
  ACADEMIC_TERM: "academic_term",
  ENROLLED_STUDENTS: "enrolled_students",
} as const;

// Cache TTL configurations (in milliseconds)
export const CACHE_TTL = {
  SHORT: 1 * 60 * 1000, // 1 minute - for frequently changing data
  MEDIUM: 5 * 60 * 1000, // 5 minutes - default
  LONG: 15 * 60 * 1000, // 15 minutes - for rarely changing data
  VERY_LONG: 30 * 60 * 1000, // 30 minutes - for static reference data
} as const;

/**
 * Helper function to invalidate related caches after mutations
 */
export function invalidateRelatedCaches(
  resource: keyof typeof CACHE_KEYS,
): void {
  cacheManager.invalidate(CACHE_KEYS[resource]);

  // Invalidate related caches based on resource relationships
  switch (resource) {
    case "BUILDINGS":
      cacheManager.invalidate(CACHE_KEYS.ROOMS);
      break;
    case "DEPARTMENTS":
      cacheManager.invalidate(CACHE_KEYS.PROGRAMS);
      cacheManager.invalidate(CACHE_KEYS.FACULTIES);
      break;
    case "PROGRAMS":
      cacheManager.invalidate(CACHE_KEYS.CURRICULUMS);
      cacheManager.invalidate(CACHE_KEYS.SECTIONS);
      break;
    case "CATEGORIES":
      cacheManager.invalidate(CACHE_KEYS.PRODUCTS);
      break;
    case "ENROLLMENTS":
      cacheManager.invalidate(CACHE_KEYS.UNBILLED_ENROLLEES);
      cacheManager.invalidate(CACHE_KEYS.BILLINGS);
      break;
    case "BILLINGS":
      cacheManager.invalidate(CACHE_KEYS.UNBILLED_ENROLLEES);
      break;
    case "PRODUCTS":
    case "ORDERS":
      cacheManager.invalidate(CACHE_KEYS.PRODUCTS);
      cacheManager.invalidate(CACHE_KEYS.ORDERS);
      break;
  }
}

export default cacheManager;
