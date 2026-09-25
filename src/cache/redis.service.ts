import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect(): Promise<void> {
    const redisUrl = this.configService.get<string>('redis.url') || process.env.REDIS_URL;
    const host = this.configService.get<string>('redis.host') || process.env.REDIS_HOST || 'localhost';
    const port = Number(this.configService.get<number>('redis.port') || process.env.REDIS_PORT || 6379);
    const password =
      this.configService.get<string>('redis.password') ||
      process.env.REDIS_PASSWORD ||
      undefined;

    try {
      if (redisUrl) {
        this.client = new Redis(redisUrl, {
          lazyConnect: true,
          maxRetriesPerRequest: 2,
          retryStrategy: (times) => {
            if (times > 3) {
              return null;
            }
            return Math.min(times * 200, 1000);
          },
        });
      } else {
        this.client = new Redis({
          host,
          port,
          password: password || undefined,
          lazyConnect: true,
          maxRetriesPerRequest: 2,
          retryStrategy: (times) => {
            if (times > 3) {
              return null;
            }
            return Math.min(times * 200, 1000);
          },
        });
      }

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log(`✅ Connected to Redis successfully at ${host}:${port}`);
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        this.logger.warn(`⚠️ Redis Connection Notice: ${err.message}. (Falling back to in-memory caching)`);
      });

      this.client.on('close', () => {
        this.isConnected = false;
      });

      await this.client.connect().catch((err) => {
        this.logger.warn(`⚠️ Could not connect to Redis: ${err.message}. In-memory fallback will be used.`);
      });
    } catch (error: any) {
      this.isConnected = false;
      this.logger.warn(`⚠️ Redis initialization error: ${error.message}`);
    }
  }

  getClient(): Redis | null {
    return this.client;
  }

  isAvailable(): boolean {
    return this.isConnected && this.client !== null && this.client.status === 'ready';
  }

  async get(key: string): Promise<string | null> {
    if (!this.isAvailable() || !this.client) return null;
    try {
      return await this.client.get(key);
    } catch (error: any) {
      this.logger.warn(`Redis GET error for key "${key}": ${error.message}`);
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.isAvailable() || !this.client) return;
    try {
      if (ttlSeconds && ttlSeconds > 0) {
        await this.client.set(key, value, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, value);
      }
    } catch (error: any) {
      this.logger.warn(`Redis SET error for key "${key}": ${error.message}`);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isAvailable() || !this.client) return;
    try {
      await this.client.del(key);
    } catch (error: any) {
      this.logger.warn(`Redis DEL error for key "${key}": ${error.message}`);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    if (!this.isAvailable() || !this.client) return;
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (error: any) {
      this.logger.warn(`Redis DEL PATTERN error for "${pattern}": ${error.message}`);
    }
  }

  async flushAll(): Promise<void> {
    if (!this.isAvailable() || !this.client) return;
    try {
      await this.client.flushall();
    } catch (error: any) {
      this.logger.warn(`Redis FLUSHALL error: ${error.message}`);
    }
  }

  private async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
        this.logger.log('Redis client disconnected cleanly.');
      } catch (err: any) {
        this.logger.warn(`Error disconnecting Redis client: ${err.message}`);
      }
    }
  }
}
