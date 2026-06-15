import { Injectable, TooManyRequestsException } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class RateLimiterService {
  constructor(private readonly redis: RedisService) {}

  async checkRateLimit(
    userId: string,
    endpoint: string,
    limit: number = 100,
    window: number = 60,
  ): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
    const key = `ratelimit:${userId}:${endpoint}`;
    const current = await this.redis.incr(key);

    if (current === 1) {
      await this.redis.expire(key, window);
    }

    const ttl = await this.redis.ttl(key);
    const remaining = Math.max(0, limit - current);

    if (current > limit) {
      throw new TooManyRequestsException(`Rate limit exceeded for ${endpoint}`);
    }

    return {
      allowed: true,
      remaining,
      resetIn: ttl,
    };
  }
}
