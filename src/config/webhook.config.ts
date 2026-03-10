export const webhookConfig = () => ({
  signingSecret: process.env.WEBHOOK_SIGNING_SECRET || '',
});
