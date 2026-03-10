export const encryptionConfig = () => ({
  encryption: {
    fieldEncryptionKey: process.env.FIELD_ENCRYPTION_KEY || '',
  },
});
