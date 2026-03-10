export const paymentConfig = () => ({
  provider: process.env.PAYMENT_PROVIDER ?? 'moyasar',
  moyasar: {
    secretKey: process.env.MOYASAR_SECRET_KEY ?? '',
    publishableKey: process.env.MOYASAR_PUBLISHABLE_KEY ?? '',
    baseUrl: 'https://api.moyasar.com/v1',
    callbackUrl:
      process.env.MOYASAR_CALLBACK_URL ??
      'http://localhost:3000/api/v1/subscriptions/payment/callback',
  },
  trialDays: parseInt(process.env.TRIAL_DAYS ?? '14', 10),
  currency: process.env.PAYMENT_CURRENCY ?? 'SAR',
});
