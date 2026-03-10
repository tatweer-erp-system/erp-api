export const redisQueueConfig = () => ({
  redisQueue: {
    enabled: process.env.QUEUES_ENABLED === 'true',
    host: process.env.REDIS_QUEUE_HOST || 'localhost',
    port: parseInt(process.env.REDIS_QUEUE_PORT || '6380', 10),
  },
});
