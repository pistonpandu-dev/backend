import * as admin from 'firebase-admin';
import { logger } from './logger';

let firebaseApp: admin.app.App | null = null;

const initFirebase = (): admin.app.App => {
  try {
    if (firebaseApp) {
      return firebaseApp;
    }

    const requiredEnv = ['FIREBASE_PROJECT_ID', 'FIREBASE_PRIVATE_KEY', 'FIREBASE_CLIENT_EMAIL'];
    const missingEnv = requiredEnv.filter(env => !process.env[env]);
    
    if (missingEnv.length > 0) {
      throw new Error(`Missing Firebase credentials: ${missingEnv.join(', ')}`);
    }

    const privateKey = process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n');

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: privateKey,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });

    logger.info('🔥 Firebase initialized successfully');
    return firebaseApp;
  } catch (error) {
    logger.error('Failed to initialize Firebase:', error);
    throw error;
  }
};

const getFirebaseApp = (): admin.app.App => {
  if (!firebaseApp) {
    throw new Error('Firebase not initialized. Call initFirebase first.');
  }
  return firebaseApp;
};

const getFirebaseMessaging = (): admin.messaging.Messaging => {
  const app = getFirebaseApp();
  return app.messaging();
};

const getFirebaseFirestore = (): admin.firestore.Firestore => {
  const app = getFirebaseApp();
  return app.firestore();
};

export { initFirebase, getFirebaseApp, getFirebaseMessaging, getFirebaseFirestore };
