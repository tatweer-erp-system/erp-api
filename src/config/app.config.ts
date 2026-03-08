import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  superAdminIps: (process.env.SUPER_ADMIN_IPS || '127.0.0.1').split(',').map((ip) => ip.trim()),
  defaultLang: process.env.DEFAULT_LANG || 'en',
  supportedLangs: (process.env.SUPPORTED_LANGS || 'en,ar').split(',').map((l) => l.trim()),
  sentryDsn: process.env.SENTRY_DSN || '',
}));
