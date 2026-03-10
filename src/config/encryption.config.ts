export const encryptionConfig = () => ({
  fieldEncryptionKey: process.env.FIELD_ENCRYPTION_KEY || '',
});
