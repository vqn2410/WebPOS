import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Inyectamos validadores DUMMY para permitir que Next.js pueda simular la UI en tiempo de compilación 
// estática sin recibir "FirebaseError: Invalid-api-key" debido a la falta de variables de entorno tempranas.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyARdQf173_vLvbtbjLJtTA4ZTe_KQHdgqs",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "appkiosco-146d2.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "appkiosco-146d2",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "appkiosco-146d2.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1074749695413",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1074749695413:web:c900c12f5ac1f69286a5fc"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
