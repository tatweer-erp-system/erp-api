export const storageConfig = () => ({
  storage: {
    enabled: process.env.STORAGE_ENABLED === 'true',
    provider: process.env.STORAGE_PROVIDER || 's3',
    aws: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      bucket: process.env.AWS_BUCKET || 'erp-uploads',
      region: process.env.AWS_REGION || 'us-east-1',
    },
  },
});
