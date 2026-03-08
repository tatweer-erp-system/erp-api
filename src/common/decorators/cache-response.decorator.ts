import { SetMetadata } from '@nestjs/common';

export const CACHE_RESPONSE_KEY = 'cache_response';
export const CACHE_RESPONSE_TTL_KEY = 'cache_response_ttl';

export const CacheResponse = (ttlSeconds = 60) => {
  return (target: object, key: string | symbol, descriptor: PropertyDescriptor) => {
    SetMetadata(CACHE_RESPONSE_KEY, true)(target, key, descriptor);
    SetMetadata(CACHE_RESPONSE_TTL_KEY, ttlSeconds)(target, key, descriptor);
    return descriptor;
  };
};
