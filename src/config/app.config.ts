export const appConfig = () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  superAdminIps: (process.env.SUPER_ADMIN_IPS || '127.0.0.1').split(',').map((ip) => ip.trim()),
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3001')
    .split(',')
    .map((o) => o.trim()),
  defaultLang: process.env.DEFAULT_LANG || 'en',
  supportedLangs: (process.env.SUPPORTED_LANGS || 'en,ar').split(',').map((l) => l.trim()),
  sentryDsn: process.env.SENTRY_DSN || '',
  defaultTrialDays: parseInt(process.env.DEFAULT_TRIAL_DAYS || '14', 10),
});
