import { CacheService } from '../../cache/cache.service';
import { RedisService } from '../../cache/redis.service';

export const redisService = new RedisService();
redisService.onModuleInit?.().catch(() => {});

export const cacheService = new CacheService(redisService);

