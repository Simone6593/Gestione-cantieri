import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyDTn3FOP59TOUl0Vj0LA8NzIXPAJoX5HFg",
  authDomain: "costrugest.firebaseapp.com",
  projectId: "costrugest",
  storageBucket: "costrugest.firebasestorage.app",
  messagingSenderId: "596860812954",
  appId: "1:596860812954:web:cd19e7afaf6298c9976923",
  measurementId: "G-GWG9R74PLT"
};

// Fix: Use the standard initializeApp from the modular SDK
const app = initializeApp(firebaseConfig);

// Esporta le istanze dei servizi legandole all'app inizializzata
export const auth = getAuth(app);
export const db = getFirestore(app);

// Inizializzazione sicura per Analytics
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export default app;