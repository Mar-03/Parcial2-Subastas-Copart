/**
 * scripts/init-db.js
 *
 * Firebase Realtime Database NO requiere CREATE TABLE: el esquema es flexible.
 * Este script:
 *   1. Verifica que las variables de entorno de Firebase estén definidas.
 *   2. Verifica la conexión real con Realtime Database.
 *   3. Escribe metadata de inicialización en `_meta`.
 *
 * Es IDEMPOTENTE y NO destructivo: nunca borra ni sobrescribe datos existentes.
 *
 *   npm run db:init
 */

const { loadEnv } = require('./load-env');
const {
  dbRef,
  isFirebaseConfigured,
  getMissingFirebaseVars,
  closeFirebase,
} = require('../src/infrastructure/database/firebase-admin');

loadEnv();

const META_NODE = '_meta';

function printMissingEnv() {
  const missing = getMissingFirebaseVars();
  if (missing.length === 0) return false;
  console.error('\n[ERROR] Faltan variables de entorno de Firebase:');
  missing.forEach((key) => console.error(`  - ${key}`));
  console.error('\nCopia el archivo .env.example a .env y completa los valores:\n');
  console.error('  cp .env.example .env      (Linux / macOS)');
  console.error('  copy .env.example .env    (Windows)\n');
  return true;
}

async function main() {
  console.log('=========================================================');
  console.log(' INICIALIZACION DE FIREBASE REALTIME DATABASE');
  console.log(' Subastas Copart');
  console.log('=========================================================\n');

  if (printMissingEnv() || !isFirebaseConfigured()) {
    process.exitCode = 1;
    return;
  }

  console.log(`Proyecto    : ${process.env.FIREBASE_PROJECT_ID}`);
  console.log(`Database URL: ${process.env.FIREBASE_DATABASE_URL}`);
  console.log(`Client email: ${process.env.FIREBASE_CLIENT_EMAIL}\n`);

  try {
    // --- 1) Verificacion de conexion (lectura minima, no destructiva) ---
    process.stdout.write('  Verificando conexion con Realtime Database ... ');
    const probe = await dbRef('_meta/connectionTest').once('value');
    console.log('OK');

    // --- 2) Metadata de inicializacion (no sobrescribe lo existente) ---
    process.stdout.write('  Escribiendo metadata en _meta ... ');
    const metaRef = dbRef(META_NODE);
    // OJO: `metaRef` es un Reference; el valor se obtiene del DataSnapshot.
    const metaSnapshot = await metaRef.once('value');
    const previousValue = metaSnapshot.val();
    const previous = previousValue && typeof previousValue === 'object' ? previousValue : {};

    const next = {
      ...previous,
      app: 'Subastas Copart',
      schema: 'realtime-database',
      schemaVersion: previous.schemaVersion || 1,
      initializedAt: previous.initializedAt || new Date().toISOString(),
      lastInitCheckAt: new Date().toISOString(),
    };

    await metaRef.update(next);
    console.log('OK');

    // --- 3) Reporte del estado actual (solo lectura) ---
    const [users, vehicles, bids] = await Promise.all([
      dbRef('users').once('value'),
      dbRef('vehicles').once('value'),
      dbRef('bids').once('value'),
    ]);

    const countNodes = (snapshot) => {
      const value = snapshot.val();
      return value && typeof value === 'object' ? Object.keys(value).length : 0;
    };

    let imageTotal = 0;
    const vehiclesValue = vehicles.val() || {};
    Object.values(vehiclesValue).forEach((vehicle) => {
      const gallery = vehicle && vehicle.images;
      imageTotal += gallery && typeof gallery === 'object' ? Object.keys(gallery).length : 0;
    });

    console.log('\nEstado actual de la base de datos:');
    console.log(`  - Nodo _meta             : ${metaSnapshot.exists() ? 'ya inicializado' : 'nuevo'}`);
    console.log(`  - users/                 : ${countNodes(users)} usuario(s)`);
    console.log(`  - vehicles/              : ${countNodes(vehicles)} vehiculo(s)`);
    console.log(`  - vehicles/*/images/     : ${imageTotal} imagen(es)`);
    console.log(`  - bids/                  : ${countNodes(bids)} subasta(s) con ofertas`);

    console.log('\n[OK] Firebase Realtime Database lista. Siguiente paso:  npm run db:seed');
  } catch (error) {
    console.error('\n[ERROR] No se pudo completar la inicializacion.');
    console.error(`        ${(error && error.message) || error}`);
    console.error('\nVerifica en la consola de Firebase:');
    console.error('  1) Que el proyecto y la base de datos RealtimeDatabase existan.');
    console.error('  2) Que las credenciales de la cuenta de servicio sean correctas.');
    console.error('  3) Que las reglas de seguridad no bloqueen el acceso del servidor');
    console.error('     (la app escribe desde el backend con credenciales administrativas).');
    process.exitCode = 1;
  } finally {
    await closeFirebase();
  }
}

main().catch((error) => {
  console.error(`\n[ERROR] ${(error && error.message) || error}`);
  process.exitCode = 1;
});
