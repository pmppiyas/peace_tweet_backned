import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly memoryStore = new Map<string, CacheEntry<unknown>>();

  constructor(private readonly redisService: RedisService) {}

  async get<T>(key: string): Promise<T | null> {
    if (this.redisService.isAvailable()) {
      try {
        const raw = await this.redisService.get(key);
        if (raw !== null) {
          return JSON.parse(raw) as T;
        }
        return null;
      } catch (err: any) {
        this.logger.warn(`Redis parse error for "${key}": ${err.message}`);
      }
    }

    // In-memory fallback
    const entry = this.memoryStore.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.memoryStore.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds = 300): Promise<void> {
    if (this.redisService.isAvailable()) {
      try {
        const serialized = JSON.stringify(value);
        await this.redisService.set(key, serialized, ttlSeconds);
        return;
      } catch (err: any) {
        this.logger.warn(`Redis set error for "${key}": ${err.message}`);
      }
    }

    // In-memory fallback
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.memoryStore.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    if (this.redisService.isAvailable()) {
      await this.redisService.del(key);
    }
    this.memoryStore.delete(key);
  }

  async delPattern(pattern: string): Promise<void> {
    if (this.redisService.isAvailable()) {
      await this.redisService.delPattern(pattern);
    }

    // In-memory pattern deletion
    const regexPattern = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const key of this.memoryStore.keys()) {
      if (regexPattern.test(key)) {
        this.memoryStore.delete(key);
      }
    }
  }

  async reset(): Promise<void> {
    if (this.redisService.isAvailable()) {
      await this.redisService.flushAll();
    }
    this.memoryStore.clear();
  }

  /**
   * Cache-aside pattern: Gets cached value or executes fetcher, caches result, and returns.
   */
  async remember<T>(
    key: string,
    ttlSeconds: number,
    fetcher: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    const result = await fetcher();
    if (result !== null && result !== undefined) {
      await this.set(key, result, ttlSeconds);
    }
    return result;
  }
}
