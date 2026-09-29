import { CacheService } from '../../cache/cache.service';

export const cacheService = new CacheService({
  isAvailable: () => false,
} as any);
