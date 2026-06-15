import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

interface CacheConfig {
  ttl: number;
  key: string;
  tags?: string[];
}

@Injectable()
export class RedisCacheService {
  private readonly defaultTTL = 3600; // 1 hour
  private readonly hotPathTTL = 60; // 1 minute for hot paths

  constructor(private readonly redis: RedisService) {}

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    config: Partial<CacheConfig> = {},
  ): Promise<T> {
    const cacheKey = this.normalizeKey(key);

    // Try to get from cache
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch from factory
    const result = await factory();

    // Store in cache
    const ttl = config.ttl || this.defaultTTL;
    await this.redis.setex(cacheKey, ttl, JSON.stringify(result));

    // Add to tag set for invalidation
    if (config.tags) {
      for (const tag of config.tags) {
        await this.redis.sadd(`tag:${tag}`, cacheKey);
      }
    }

    return result;
  }

  async invalidateByTag(tag: string): Promise<void> {
    const keys = await this.redis.smembers(`tag:${tag}`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
      await this.redis.del(`tag:${tag}`);
    }
  }

  async set<T>(key: string, value: T, ttl: number = this.defaultTTL): Promise<void> {
    const cacheKey = this.normalizeKey(key);
    await this.redis.setex(cacheKey, ttl, JSON.stringify(value));
  }

  async get<T>(key: string): Promise<T | null> {
    const cacheKey = this.normalizeKey(key);
    const cached = await this.redis.get(cacheKey);
    return cached ? JSON.parse(cached) : null;
  }

  async del(key: string): Promise<void> {
    await this.redis.del(this.normalizeKey(key));
  }

  private normalizeKey(key: string): string {
    return `cache:${key}`;
  }

  // Hot-path optimization methods
  async getHotPath<T>(
    key: string,
    factory: () => Promise<T>,
  ): Promise<T> {
    return this.getOrSet(key, factory, { ttl: this.hotPathTTL });
  }

  async preloadHotPaths(
    paths: Array<{ key: string; factory: () => Promise<any> }>,
  ): Promise<void> {
    await Promise.all(
      paths.map((path) => this.getHotPath(path.key, path.factory)),
    );
  }
}