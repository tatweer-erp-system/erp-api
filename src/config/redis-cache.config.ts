import { registerAs } from '@nestjs/config';

export default registerAs('redisCache', () => ({
  host: process.env.REDIS_CACHE_HOST || 'localhost',
  port: parseInt(process.env.REDIS_CACHE_PORT || '6379', 10),
}));
