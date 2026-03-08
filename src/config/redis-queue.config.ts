import { registerAs } from '@nestjs/config';

export default registerAs('redisQueue', () => ({
  host: process.env.REDIS_QUEUE_HOST || 'localhost',
  port: parseInt(process.env.REDIS_QUEUE_PORT || '6380', 10),
}));
