import { registerAs } from '@nestjs/config';

export default registerAs('performance', () => ({
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    ttl: parseInt(process.env.REDIS_TTL || '3600'),
    db: parseInt(process.env.REDIS_DB || '0'),
  },
  caching: {
    defaultTTL: 3600,
    hotPathTTL: 60,
    enableCompression: true,
    compressionThreshold: 1024,
  },
  query: {
    timeout: 5000,
    slowQueryThreshold: 1000,
    enableCaching: true,
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'),
    authWindowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS || '300000'),
    authMaxRequests: parseInt(process.env.RATE_LIMIT_AUTH_MAX_REQUESTS || '10'),
  },
}));
