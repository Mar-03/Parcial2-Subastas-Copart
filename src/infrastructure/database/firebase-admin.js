const { cert, getApps, initializeApp, deleteApp } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');

/**
 * Adaptador de inicializacion de Firebase Admin (Realtime Database).
 *
 * Este archivo esta en CommonJS a proposito: lo comparten la app de Next.js
 * (importada desde codigo ESM) y los scripts de consola (scripts/init-db.js y
 * scripts/seed.js, que corren con `node` puro).
 *
 * LAZY: no se inicializa nada al importar el modulo. Esto es lo que permite que
 * `next build` termine correctamente SIN credenciales de Firebase.
 *
 * Firebase se usa EXCLUSIVAMENTE como persistencia:
 *   - La autenticacion es propia (JWT + bcryptjs).
 *   - No se usa Firebase Authentication.
 *   - No se usa Firestore.
 */

const REQUIRED_VARS = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_DATABASE_URL',
];

let appInstance = null;
let databaseInstance = null;

/** Indica si las variables de entorno de Firebase estan completas. */
function isFirebaseConfigured() {
  return REQUIRED_VARS.every((key) => {
    const value = process.env[key];
    return typeof value === 'string' && value.trim().length > 0;
  });
}

/** Variables de Firebase faltantes (util para diagnostico). */
function getMissingFirebaseVars() {
  return REQUIRED_VARS.filter((key) => {
    const value = process.env[key];
    return typeof value !== 'string' || value.trim().length === 0;
  });
}

function readConfig() {
  const missing = getMissingFirebaseVars();
  if (missing.length > 0) {
    throw new Error(
      `Faltan variables de entorno de Firebase: ${missing.join(', ')}. ` +
        'Copia .env.example a .env y completalas.',
    );
  }

  // Render guarda la llave privada con los saltos de linea escapados (\n),
  // por eso se convierten de vuelta a saltos de linea reales.
  const privateKey = String(process.env.FIREBASE_PRIVATE_KEY).replace(/\\n/g, '\n');

  return {
    credential: cert({
      projectId: String(process.env.FIREBASE_PROJECT_ID).trim(),
      clientEmail: String(process.env.FIREBASE_CLIENT_EMAIL).trim(),
      privateKey,
    }),
    databaseURL: String(process.env.FIREBASE_DATABASE_URL).trim().replace(/\/+$/, ''),
  };
}

/** Devuelve (inicializando si hace falta) la instancia de Firebase App. */
function getFirebaseApp() {
  if (appInstance) return appInstance;

  const existing = getApps();
  if (existing.length > 0) {
    appInstance = existing[0];
    return appInstance;
  }

  const { credential, databaseURL } = readConfig();
  appInstance = initializeApp({ credential, databaseURL });
  return appInstance;
}

/** Devuelve (creando si hace falta) la referencia a Realtime Database. */
function getRealtimeDatabase() {
  if (databaseInstance) return databaseInstance;
  databaseInstance = getDatabase(getFirebaseApp());
  return databaseInstance;
}

/**
 * Atajo: `ref(path)` sobre la base de datos.
 *
 * OJO con la distincion Reference / DataSnapshot:
 *   - `dbRef(...)` devuelve un REFERENCE: sirve para escribir, pedir snapshots
 *     (`once('value')`, `transaction`) o remover. NO tiene `.val()`.
 *   - El valor se lee sobre el DATASNAPSHOT: `(await ref.once('value')).val()`.
 *
 * Una ruta vacia o "/" significa la RAIZ de la base de datos, que en Firebase
 * Admin se obtiene con `database.ref('/')` (`.ref('')` lanza "path argument was
 * an invalid path"). Se usa para las escrituras multi-ruta atomicas.
 */
function dbRef(path = '') {
  const database = getRealtimeDatabase();
  const normalized = String(path === null || path === undefined ? '' : path).trim();
  if (normalized === '' || normalized === '/') {
    return database.ref('/');
  }
  return database.ref(normalized);
}

/**
 * Puerto de salud de la base de datos (implementa domain/ports/database.port.js).
 * Verifica conectividad real con Realtime Database sin exponer secretos.
 */
class FirebaseDatabaseAdapter {
  async ping() {
    const startedAt = Date.now();
    // Lectura minima sobre un nodo de metadata: si responde, hay conexion.
    const snapshot = await dbRef('_meta').once('value');
    return {
      connected: true,
      databaseURL: String(process.env.FIREBASE_DATABASE_URL || '').replace(/\/+$/, ''),
      projectId: String(process.env.FIREBASE_PROJECT_ID || ''),
      latencyMs: Date.now() - startedAt,
      initializedAt: snapshot.exists() ? snapshot.val().initializedAt || null : null,
    };
  }
}

let adapterInstance = null;

function getDatabaseAdapter() {
  if (!adapterInstance) {
    adapterInstance = new FirebaseDatabaseAdapter();
  }
  return adapterInstance;
}

/** Cierra la instancia (lo usan los scripts de consola al terminar). */
async function closeFirebase() {
  if (appInstance) {
    try {
      await deleteApp(appInstance);
    } catch {
      /* ignorado */
    }
  }
  appInstance = null;
  databaseInstance = null;
  adapterInstance = null;
}

module.exports = {
  getFirebaseApp,
  getRealtimeDatabase,
  getDatabaseAdapter,
  dbRef,
  isFirebaseConfigured,
  getMissingFirebaseVars,
  closeFirebase,
  FirebaseDatabaseAdapter,
};
