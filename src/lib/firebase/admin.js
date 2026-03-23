import admin from 'firebase-admin';

// Evaluador dinámico (Defers Execution out of Build Time)
function initFirebaseApp() {
  if (!admin.apps.length && process.env.FIREBASE_PROJECT_ID) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY 
          ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
          : undefined,
      }),
    });
  }
}

// Proxies inteligentes: interceptan cualquier solicitud hacia Auth/Firestore
// solo en el momento que /api/users/route lo demanda (runtime real)
const adminAuth = new Proxy({}, {
  get: (target, prop) => {
    initFirebaseApp();
    if (!admin.apps.length) throw new Error("Requiere configurar FIREBASE_PRIVATE_KEY, PROJECT_ID y EMAIL en Vercel/.env");
    const moduleItem = admin.auth()[prop];
    return typeof moduleItem === 'function' ? moduleItem.bind(admin.auth()) : moduleItem;
  }
});

const adminDb = new Proxy({}, {
  get: (target, prop) => {
    initFirebaseApp();
    if (!admin.apps.length) throw new Error("Requiere configurar FIREBASE env vars para Base De Datos");
    const moduleItem = admin.firestore()[prop];
    return typeof moduleItem === 'function' ? moduleItem.bind(admin.firestore()) : moduleItem;
  }
});

export { adminAuth, adminDb, admin };
