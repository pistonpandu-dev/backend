import * as admin from 'firebase-admin';
import { logger } from './logger';

let firebaseApp: admin.app.App;

const initFirebase = (): void => {
  try {
    if (!process.env.FIREBASE_PROJECT_ID || 
        !process.env.FIREBASE_PRIVATE_KEY || 
        !process.env.FIREBASE_CLIENT_EMAIL) {
      throw new Error('Firebase credentials not configured');
    }

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });

    logger.info('🔥 Firebase initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Firebase:', error);
  }
};

const getFirebaseApp = (): admin.app.App => {
  if (!firebaseApp) {
    throw new Error('Firebase not initialized');
  }
  return firebaseApp;
};

export { initFirebase, getFirebaseApp };
