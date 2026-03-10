export const mailConfig = () => ({
  host: process.env.MAIL_HOST || 'smtp.sendgrid.net',
  port: parseInt(process.env.MAIL_PORT || '587', 10),
  user: process.env.MAIL_USER || 'apikey',
  pass: process.env.MAIL_PASS || '',
  from: process.env.MAIL_FROM || 'noreply@erp.com',
});
