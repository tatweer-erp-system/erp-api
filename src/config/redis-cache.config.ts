export const redisCacheConfig = () => ({
  enabled: process.env.CACHE_ENABLED === 'true',
  host: process.env.REDIS_CACHE_HOST || 'localhost',
  port: parseInt(process.env.REDIS_CACHE_PORT || '6379', 10),
});
