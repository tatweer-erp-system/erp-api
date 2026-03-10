export const databaseConfig = () => ({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'erp_user',
  password: process.env.DB_PASS || 'secret',
  database: process.env.DB_NAME || 'erp_shared',
  readHost: process.env.DB_READ_HOST || '',
  readPort: parseInt(process.env.DB_READ_PORT || '5432', 10),
});
