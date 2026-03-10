export const outboxConfig = () => ({
  pollInterval: parseInt(process.env.OUTBOX_POLL_INTERVAL || '10000', 10),
  retentionCron: process.env.RETENTION_CRON || '0 2 * * *',
});
