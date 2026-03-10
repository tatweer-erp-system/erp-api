export const firebaseConfig = () => ({
  firebase: {
    enabled: process.env.FIREBASE_ENABLED === 'true',
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  },
});
