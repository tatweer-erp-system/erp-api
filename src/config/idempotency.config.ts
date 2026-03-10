export const idempotencyConfig = () => ({
  idempotency: {
    ttl: parseInt(process.env.IDEMPOTENCY_TTL || '86400', 10),
  },
});
