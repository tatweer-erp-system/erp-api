export const mongodbConfig = () => ({
  mongodb: {
    enabled: process.env.MONGODB_ENABLED === 'true',
    uri:
      process.env.MONGODB_URI ||
      `mongodb://${process.env.MONGODB_HOST || 'localhost'}:${process.env.MONGODB_PORT || '27017'}/${process.env.MONGODB_NAME || 'erp_logs'}`,
  },
});
