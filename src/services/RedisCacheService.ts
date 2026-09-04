import Redis from 'ioredis';
import { Logger } from '../utils/logger';

export interface CacheGetResult<T> {
  hit: boolean;
  value: T | null;
}

export class RedisCacheService {
  private client: Redis | null = null;
  private enabled: boolean;
  private defaultTtlSeconds: number;

  constructor(options?: { enabled?: boolean; ttlSeconds?: number }) {
    this.enabled = options?.enabled ?? process.env.REDIS_ENABLED === 'true';
    this.defaultTtlSeconds =
      options?.ttlSeconds ?? parseInt(process.env.REDIS_TTL_SECONDS || '300', 10);

    if (!this.enabled) {
      Logger.info('Redis cache disabled (REDIS_ENABLED != true)');
      return;
    }

    const host = process.env.REDIS_HOST || 'localhost';
    const port = parseInt(process.env.REDIS_PORT || '6379', 10);

    try {
      this.client = new Redis({ host, port, lazyConnect: true });

      this.client.on('error', (err) => {
        Logger.warn(`Redis error: ${err.message}`);
      });

      this.client.on('connect', () => {
        Logger.info(`Redis connected at ${host}:${port}`);
      });

      this.client.connect().catch((err) => {
        Logger.warn(`Redis connection failed, caching disabled: ${err.message}`);
        this.client = null;
      });
    } catch (err) {
      Logger.warn(`Failed to initialize Redis client: ${(err as Error).message}`);
      this.client = null;
    }
  }

  get isEnabled(): boolean {
    return this.enabled && this.client !== null;
  }

  async get<T>(key: string): Promise<CacheGetResult<T>> {
    const client = this.client;
    if (!client) return { hit: false, value: null };

    try {
      const raw = await client.get(key);
      if (raw === null || raw === undefined) {
        return { hit: false, value: null };
      }
      return { hit: true, value: JSON.parse(raw) as T };
    } catch (err) {
      Logger.warn(`Redis GET failed for ${key}: ${(err as Error).message}`);
      return { hit: false, value: null };
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const client = this.client;
    if (!client) return;

    try {
      const ttl = ttlSeconds ?? this.defaultTtlSeconds;
      await client.set(key, JSON.stringify(value), 'EX', ttl);
    } catch (err) {
      Logger.warn(`Redis SET failed for ${key}: ${(err as Error).message}`);
    }
  }

  async del(key: string): Promise<void> {
    const client = this.client;
    if (!client) return;

    try {
      await client.del(key);
    } catch (err) {
      Logger.warn(`Redis DEL failed for ${key}: ${(err as Error).message}`);
    }
  }

  async flushPrefix(prefix: string): Promise<void> {
    const client = this.client;
    if (!client) return;

    try {
      const stream = client.scanStream({ match: `${prefix}*`, count: 100 });
      const pipeline = client.pipeline();

      await new Promise<void>(async (resolve, reject) => {
        stream.on('data', (keys: string[]) => {
          for (const key of keys) {
            pipeline.del(key);
          }
        });
        stream.on('end', async () => {
          try {
            await pipeline.exec();
            resolve();
          } catch (err) {
            reject(err);
          }
        });
        stream.on('error', reject);
      });
    } catch (err) {
      Logger.warn(`Redis FLUSH prefix failed for ${prefix}: ${(err as Error).message}`);
    }
  }
}

export const cacheService = new RedisCacheService();
