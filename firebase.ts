
// @ts-ignore - Ensure firebase/app is correctly resolved in the environment
import { initializeApp } from 'firebase/app';
// @ts-ignore - Bypass type resolution error in specific environment
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDTn3FOP59TOUl0Vj0LA8NzIXPAJoX5HFg",
  authDomain: "costrugest.firebaseapp.com",
  projectId: "costrugest",
  storageBucket: "costrugest.firebasestorage.app",
  messagingSenderId: "596860812954",
  appId: "1:596860812954:web:cd19e7afaf6298c9976923",
  measurementId: "G-GWG9R74PLT"
};

// Initialize the standard Firebase application using the modular SDK
const app = initializeApp(firebaseConfig);

// Export service instances for use throughout the application
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Safe initialization for Analytics (only in browser environment)
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export default app;
