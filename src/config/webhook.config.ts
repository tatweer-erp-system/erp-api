export const webhookConfig = () => ({
  webhook: {
    signingSecret: process.env.WEBHOOK_SIGNING_SECRET || '',
  },
});
