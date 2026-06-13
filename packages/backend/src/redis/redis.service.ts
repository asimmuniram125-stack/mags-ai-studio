import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit {
  private client: RedisClientType;
  private readonly logger = new Logger(RedisService.name);

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const host = this.configService.get('redis.host') || 'localhost';
    const port = this.configService.get('redis.port') || 6379;
    const password = this.configService.get('redis.password');

    this.client = createClient({
      url: password
        ? `redis://:${password}@${host}:${port}`
        : `redis://${host}:${port}`,
    });

    await this.client.connect();
    this.logger.log('Redis connected');
  }

  /**
   * Set a key-value pair
   */
  async set(key: string, value: string, exSeconds?: number): Promise<void> {
    if (exSeconds) {
      await this.client.setEx(key, exSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  /**
   * Get a value by key
   */
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  /**
   * Set JSON
   */
  async setJSON(key: string, value: any, exSeconds?: number): Promise<void> {
    const jsonString = JSON.stringify(value);
    await this.set(key, jsonString, exSeconds);
  }

  /**
   * Get JSON
   */
  async getJSON(key: string): Promise<any> {
    const value = await this.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  /**
   * Delete a key
   */
  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  /**
   * Delete a key (alias for delete)
   */
  async del(key: string): Promise<void> {
    await this.client.del(key);
  }
}
