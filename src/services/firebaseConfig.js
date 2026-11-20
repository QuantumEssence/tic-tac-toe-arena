import { initializeApp } from '@firebase/app';
import { getDatabase } from '@firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAgKKka9giECVaCZ0woNSxK4xLjBNSRRyQ',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'ttt-arena-quantum.firebaseapp.com',
  databaseURL:
    import.meta.env.VITE_FIREBASE_DATABASE_URL ||
    'https://ttt-arena-quantum-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'ttt-arena-quantum',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'ttt-arena-quantum.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '298365623775',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:298365623775:web:3366ed1be9209b1524f86a',
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;
