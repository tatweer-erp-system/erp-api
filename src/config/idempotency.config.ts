export const idempotencyConfig = () => ({
  ttl: parseInt(process.env.IDEMPOTENCY_TTL || '86400', 10),
});
