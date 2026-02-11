// Fix: Use standard Firebase v9+ modular imports and clean up formatting to ensure correct module resolution
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDTn3FOP59TOUl0Vj0LA8NzIXPAJoX5HFg",
  authDomain: "costrugest.firebaseapp.com",
  projectId: "costrugest",
  storageBucket: "costrugest.firebasestorage.app",
  messagingSenderId: "596860812954",
  appId: "1:596860812954:web:cd19e7afaf6298c9976923",
  measurementId: "G-GWG9R74PLT"
};

// Initialize Firebase application
const app = initializeApp(firebaseConfig);

// Export modular instances
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export default app;