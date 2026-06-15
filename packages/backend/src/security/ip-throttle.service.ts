import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

interface IPThrottleRule {
  maxRequests: number;
  windowMs: number;
  banDurationMs: number;
  action: 'throttle' | 'ban' | 'alert';
}

@Injectable()
export class IPThrottleService {
  private readonly rules: Map<string, IPThrottleRule> = new Map([
    ['default', { maxRequests: 1000, windowMs: 60000, banDurationMs: 3600000, action: 'throttle' }],
    ['auth', { maxRequests: 10, windowMs: 300000, banDurationMs: 3600000, action: 'ban' }],
    ['api', { maxRequests: 500, windowMs: 60000, banDurationMs: 1800000, action: 'throttle' }],
  ]);

  constructor(private readonly redis: RedisService) {}

  async checkThrottle(
    ip: string,
    ruleType: string = 'default',
  ): Promise<{ allowed: boolean; retryAfter?: number }> {
    const rule = this.rules.get(ruleType) || this.rules.get('default')!;
    const redisKey = `throttle:${ruleType}:${ip}`;
    const banKey = `ban:${ip}`;

    // Check if IP is banned
    const isBanned = await this.redis.get(banKey);
    if (isBanned) {
      const ttl = await this.redis.ttl(banKey);
      return { allowed: false, retryAfter: ttl };
    }

    // Get current request count
    const count = await this.redis.incr(redisKey);

    if (count === 1) {
      await this.redis.expire(redisKey, rule.windowMs / 1000);
    }

    if (count > rule.maxRequests) {
      if (rule.action === 'ban') {
        await this.redis.setex(banKey, rule.banDurationMs / 1000, 'true');
        return { allowed: false, retryAfter: rule.banDurationMs / 1000 };
      }

      return {
        allowed: false,
        retryAfter: Math.ceil((rule.windowMs - (count - rule.maxRequests) * 1000) / 1000),
      };
    }

    return { allowed: true };
  }

  async banIP(ip: string, durationMs: number = 3600000): Promise<void> {
    await this.redis.setex(`ban:${ip}`, durationMs / 1000, 'true');
  }

  async unbanIP(ip: string): Promise<void> {
    await this.redis.del(`ban:${ip}`);
  }

  async isIPBanned(ip: string): Promise<boolean> {
    const banned = await this.redis.get(`ban:${ip}`);
    return !!banned;
  }
}