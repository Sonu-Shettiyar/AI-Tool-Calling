 
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export class RateLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  async checkLimit(identifier: string): Promise<{
    success: boolean;
    limit: number;
    remaining: number;
    resetTime: number;
  }> {
    const now = Date.now();
    const entry = rateLimitStore.get(identifier);

    if (!entry || now > entry.resetTime) {
      // First request or window expired
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + this.config.windowMs,
      };
      rateLimitStore.set(identifier, newEntry);

      return {
        success: true,
        limit: this.config.maxRequests,
        remaining: this.config.maxRequests - 1,
        resetTime: newEntry.resetTime,
      };
    }

    if (entry.count >= this.config.maxRequests) {
      // Rate limit exceeded
      return {
        success: false,
        limit: this.config.maxRequests,
        remaining: 0,
        resetTime: entry.resetTime,
      };
    }

    // Increment count
    entry.count++;
    rateLimitStore.set(identifier, entry);

    return {
      success: true,
      limit: this.config.maxRequests,
      remaining: this.config.maxRequests - entry.count,
      resetTime: entry.resetTime,
    };
  }

  // Clean up expired entries (call periodically)
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }
}

// Default rate limiter: 10 requests per minute per user
export const defaultRateLimiter = new RateLimiter({
  maxRequests: 10,
  windowMs: 60 * 1000, // 1 minute
});

// Clean up expired entries every 5 minutes
setInterval(() => {
  defaultRateLimiter.cleanup();
}, 5 * 60 * 1000);
