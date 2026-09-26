/**
 * scripts/seed.js
 *
 * Carga datos de demostracion en Firebase Realtime Database:
 *   - 3 usuarios demo (contrasenas con bcrypt, 10 rounds)
 *   - 8 vehículos (6 subastas activas + 2 subastas cerradas)
 *   - galeria de 6 imagenes por Vehículo (URLs)
 *   - ofertas de ejemplo que respetan la regla del +10%
 *
 * Es IDEMPOTENTE: si se ejecuta varias veces no duplica usuarios ni vehículos.
 * Nunca borra datos existentes.
 *
 *   npm run db:seed
 */

const { loadEnv } = require('./load-env');
const {
  dbRef,
  isFirebaseConfigured,
  getMissingFirebaseVars,
  closeFirebase,
} = require('../src/infrastructure/database/firebase-admin');
const { emailKey, nextId } = require('../src/infrastructure/database/firebase-utils');
const bcrypt = require('bcryptjs');

loadEnv();

const HOUR = 60 * 60 * 1000;
const hoursFromNow = (hours) => new Date(Date.now() + hours * HOUR);

const DEMO_PASSWORD = 'Demo1234';
const DEMO_USERS = [
  { firstName: 'Usuario', lastName: 'Uno', email: 'usuario1@demo.com', phone: '+502 5555 0101' },
  { firstName: 'Usuario', lastName: 'Dos', email: 'usuario2@demo.com', phone: '+502 5555 0102' },
  { firstName: 'Usuario', lastName: 'Tres', email: 'usuario3@demo.com', phone: '+502 5555 0103' },
];

/** Galeria de ejemplo (URLs publicas; en Render no se almacenan archivos). */
const GALLERY = [
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=70',
  'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=70',
  'https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=1200&q=70',
  'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=1200&q=70',
  'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1200&q=70',
  'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1200&q=70',
];

const galleryFor = (offset = 0) =>
  Array.from({ length: 6 }, (_, index) => GALLERY[(offset + index) % GALLERY.length]);

/**
 * 6 subastas ACTIVAS (distintos años, marcas, combustibles y daños)
 * + 2 subastas YA CERRADAS para demostrar los estados finales.
 */
const DEMO_VEHICLES = [
  {
    key: 'corolla',
    ownerEmail: 'usuario1@demo.com',
    year: 2015,
    itemType: 'Automovil',
    brand: 'Toyota',
    model: 'Corolla',
    engine: '1.8L I4',
    transmission: 'Automatica',
    fuel: 'Gasolina',
    drivetrain: 'FWD',
    cylinders: 4,
    damageLevel: 'AMARILLO',
    basePrice: 18000,
    startTime: hoursFromNow(-2),
    endTime: hoursFromNow(118),
    status: 'ACTIVA',
    galleryOffset: 0,
    // 18000 -> 19800 -> 21780 (cada oferta +10% sobre la anterior)
    bidPlan: [
      { email: 'usuario2@demo.com', amount: 19800 },
      { email: 'usuario3@demo.com', amount: 21780 },
    ],
  },
  {
    key: 'f150',
    ownerEmail: 'usuario2@demo.com',
    year: 2019,
    itemType: 'Pick Up',
    brand: 'Ford',
    model: 'F-150',
    engine: '3.5L V6',
    transmission: 'Automatica',
    fuel: 'Gasolina',
    drivetrain: '4WD',
    cylinders: 8,
    damageLevel: 'ROJO',
    basePrice: 65000,
    startTime: hoursFromNow(-6),
    endTime: hoursFromNow(94),
    status: 'ACTIVA',
    galleryOffset: 2,
    bidPlan: [{ email: 'usuario1@demo.com', amount: 71500 }],
  },
  {
    key: 'x5',
    ownerEmail: 'usuario3@demo.com',
    year: 2021,
    itemType: 'SUV',
    brand: 'BMW',
    model: 'X5',
    engine: 'Hibrido 2.5L',
    transmission: 'Automatica',
    fuel: 'Hibrido',
    drivetrain: 'AWD',
    cylinders: 6,
    damageLevel: 'VERDE',
    basePrice: 95000,
    startTime: hoursFromNow(-1),
    endTime: hoursFromNow(70),
    status: 'ACTIVA',
    galleryOffset: 4,
    bidPlan: [],
  },
  {
    key: 'civic',
    ownerEmail: 'usuario1@demo.com',
    year: 2012,
    itemType: 'Automovil',
    brand: 'Honda',
    model: 'Civic',
    engine: '1.5L I4',
    transmission: 'Manual',
    fuel: 'Gasolina',
    drivetrain: 'FWD',
    cylinders: 4,
    damageLevel: 'ROJO',
    basePrice: 9500,
    startTime: hoursFromNow(-30),
    endTime: hoursFromNow(46),
    status: 'ACTIVA',
    galleryOffset: 6,
    bidPlan: [
      { email: 'usuario3@demo.com', amount: 10450 },
      { email: 'usuario2@demo.com', amount: 11495 },
    ],
  },
  {
    key: 'frontier',
    ownerEmail: 'usuario2@demo.com',
    year: 2020,
    itemType: 'Pick Up',
    brand: 'Nissan',
    model: 'Frontier',
    engine: '2.5L I4',
    transmission: 'Automatica',
    fuel: 'Diesel',
    drivetrain: '4WD',
    cylinders: 4,
    damageLevel: 'AMARILLO',
    basePrice: 42000,
    startTime: hoursFromNow(-3),
    endTime: hoursFromNow(166),
    status: 'ACTIVA',
    galleryOffset: 1,
    bidPlan: [],
  },
  {
    key: 'l200',
    ownerEmail: 'usuario3@demo.com',
    year: 2018,
    itemType: 'Todoterreno',
    brand: 'Mitsubishi',
    model: 'L200',
    engine: '2.5L I4',
    transmission: 'Manual',
    fuel: 'Diesel',
    drivetrain: '4WD',
    cylinders: 4,
    damageLevel: 'ROJO',
    basePrice: 33000,
    startTime: hoursFromNow(-48),
    endTime: hoursFromNow(22),
    status: 'ACTIVA',
    galleryOffset: 3,
    bidPlan: [],
  },
  {
    // Subasta YA CERRADA con ofertas -> VENDIDA
    key: 'wrangler',
    ownerEmail: 'usuario1@demo.com',
    year: 2016,
    itemType: 'Todoterreno',
    brand: 'Jeep',
    model: 'Wrangler',
    engine: '3.6L V6',
    transmission: 'Automatica',
    fuel: 'Gasolina',
    drivetrain: '4WD',
    cylinders: 6,
    damageLevel: 'ROJO',
    basePrice: 38000,
    startTime: hoursFromNow(-240),
    endTime: hoursFromNow(-72),
    status: 'VENDIDA',
    galleryOffset: 5,
    bidPlan: [
      { email: 'usuario2@demo.com', amount: 41800 },
      { email: 'usuario3@demo.com', amount: 45980 },
    ],
  },
  {
    // Subasta YA CERRADA sin ofertas -> DESIERTA
    key: 'aveo',
    ownerEmail: 'usuario2@demo.com',
    year: 2014,
    itemType: 'Automovil',
    brand: 'Chevrolet',
    model: 'Aveo',
    engine: '1.5L I4',
    transmission: 'Manual',
    fuel: 'Gasolina',
    drivetrain: 'FWD',
    cylinders: 4,
    damageLevel: 'VERDE',
    basePrice: 7500,
    startTime: hoursFromNow(-300),
    endTime: hoursFromNow(-120),
    status: 'DESIERTA',
    galleryOffset: 7,
    bidPlan: [],
  },
];

function printMissingEnv() {
  const missing = getMissingFirebaseVars();
  if (missing.length === 0) return false;
  console.error('\n[ERROR] Faltan variables de entorno de Firebase:');
  missing.forEach((key) => console.error(`  - ${key}`));
  console.error('\nEste script NO se ejecuta sin credenciales reales de Firebase.');
  console.error('Copia el archivo .env.example a .env y completa los valores.\n');
  return true;
}

/** Marca de agua en `_meta` para no duplicar el seed dentro de la misma hora. */
async function markSeedRun(stats) {
  await dbRef('_meta').update({
    lastSeedAt: new Date().toISOString(),
    lastSeedStats: stats,
  });
}

async function seedUsers() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const ids = {};

  for (const user of DEMO_USERS) {
    const indexKey = emailKey(user.email);
    const indexSnapshot = await dbRef(`userEmails/${indexKey}`).once('value');
    const existingId = indexSnapshot.val();

    if (existingId) {
      ids[user.email] = Number(existingId);
      console.log(`  [EXISTE] ${user.email} (id ${existingId})`);
      continue;
    }

    const id = await nextId('_counters/users');
    await dbRef('').update({
      [`users/${id}`]: {
        id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        passwordHash,
        createdAt: new Date().toISOString(),
      },
      [`userEmails/${indexKey}`]: id,
    });

    ids[user.email] = id;
    console.log(`  [CREADO]  ${user.email} (id ${id})`);
  }

  return ids;
}

async function seedVehicles(userIds) {
  const existingSnapshot = await dbRef('vehicles').once('value');
  const existing = existingSnapshot.val() || {};
  const existingList = Array.isArray(existing) ? existing : Object.values(existing);

  let created = 0;
  let skipped = 0;

  for (const vehicle of DEMO_VEHICLES) {
    const ownerId = Number(userIds[vehicle.ownerEmail]);

    // Clave de idempotencia: propietario + marca + modelo + año.
    const duplicate = existingList.find(
      (item) =>
        item &&
        Number(item.ownerId) === ownerId &&
        String(item.brand) === vehicle.brand &&
        String(item.model) === vehicle.model &&
        Number(item.year) === vehicle.year,
    );

    if (duplicate) {
      skipped += 1;
      console.log(`  [EXISTE] ${vehicle.brand} ${vehicle.model} ${vehicle.year} (id ${duplicate.id})`);

      // Asegura la galeria minima (5 imagenes) aunque el Vehículo ya exista.
      const gallery = duplicate.images && typeof duplicate.images === 'object' ? duplicate.images : {};
      if (Object.keys(gallery).length < 5) {
        await writeGallery(duplicate.id, galleryFor(vehicle.galleryOffset));
        console.log('           galeria completada a 6 imagenes');
      }
      continue;
    }

    const id = await nextId('_counters/vehicles');
    await dbRef(`vehicles/${id}`).set({
      id,
      ownerId,
      year: vehicle.year,
      itemType: vehicle.itemType,
      brand: vehicle.brand,
      model: vehicle.model,
      engine: vehicle.engine,
      transmission: vehicle.transmission,
      fuel: vehicle.fuel,
      drivetrain: vehicle.drivetrain,
      cylinders: vehicle.cylinders,
      damageLevel: vehicle.damageLevel,
      basePrice: vehicle.basePrice,
      currentBid: 0,
      highestBidderId: null,
      startTime: vehicle.startTime.toISOString(),
      endTime: vehicle.endTime.toISOString(),
      status: vehicle.status,
      createdAt: new Date().toISOString(),
    });

    await writeGallery(id, galleryFor(vehicle.galleryOffset));
    await seedBids(vehicle, id, userIds);

    created += 1;
    console.log(`  [CREADO]  ${vehicle.brand} ${vehicle.model} ${vehicle.year} (id ${id})`);
  }

  return { created, skipped };
}

async function writeGallery(vehicleId, images) {
  const payload = {};
  images.forEach((imageUrl, index) => {
    const imageId = index + 1;
    payload[`vehicles/${vehicleId}/images/${imageId}`] = { id: imageId, imageUrl, sortOrder: index };
  });
  await dbRef('').update(payload);
}

/**
 * Inserta ofertas de ejemplo respetando la misma regla de negocio del backend:
 * cada oferta debe ser >= la anterior * 1.10.
 */
async function seedBids(vehicle, vehicleId, userIds) {
  if (!vehicle.bidPlan || vehicle.bidPlan.length === 0) return;

  const existingSnapshot = await dbRef(`bids/${vehicleId}`).once('value');
  if (existingSnapshot.exists()) {
    console.log('           ya tiene ofertas, se conservan');
    return;
  }

  const payload = {};
  let current = 0;
  let lastBidId = null;
  let lastUserId = null;

  vehicle.bidPlan.forEach((entry, index) => {
    const amount = Math.round(entry.amount * 100) / 100;
    const minimum = current > 0 ? Math.round(current * 1.1 * 100) / 100 : vehicle.basePrice;

    if (amount < minimum) {
      console.log(`           [AVISO] oferta ${amount} ignorada (minimo permitido ${minimum})`);
      return;
    }

    const bidId = index + 1;
    payload[`bids/${vehicleId}/${bidId}`] = {
      id: bidId,
      vehicleId,
      userId: userIds[entry.email],
      amount,
      createdAt: new Date(
        new Date(vehicle.startTime).getTime() + (index + 1) * 2 * HOUR,
      ).toISOString(),
    };
    payload[`_counters/bids/${vehicleId}`] = bidId;

    current = amount;
    lastBidId = bidId;
    lastUserId = userIds[entry.email];
  });

  if (!lastBidId) return;

  payload[`vehicles/${vehicleId}/currentBid`] = current;
  payload[`vehicles/${vehicleId}/highestBidderId`] = lastUserId;

  await dbRef('').update(payload);
  console.log(`           ${vehicle.bidPlan.length} oferta(s) de ejemplo (mejor: ${current})`);
}

async function printTotals() {
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

  let bidTotal = 0;
  const bidsValue = bids.val() || {};
  Object.values(bidsValue).forEach((group) => {
    if (group && typeof group === 'object') bidTotal += Object.keys(group).length;
  });

  return { users: countNodes(users), vehicles: countNodes(vehicles), images: imageTotal, bids: bidTotal };
}

async function main() {
  console.log('=========================================================');
  console.log(' SEED DE DATOS DE DEMOSTRACION - Subastas Copart');
  console.log(' Firebase Realtime Database');
  console.log('=========================================================\n');

  if (printMissingEnv() || !isFirebaseConfigured()) {
    process.exitCode = 1;
    return;
  }

  console.log(`Proyecto    : ${process.env.FIREBASE_PROJECT_ID}`);
  console.log(`Database URL: ${process.env.FIREBASE_DATABASE_URL}\n`);

  try {
    process.stdout.write('Verificando conexion ... ');
    await dbRef('_meta').once('value');
    console.log('OK\n');

    console.log('Usuarios demo:');
    const userIds = await seedUsers();

    console.log('\nvehículos demo:');
    const result = await seedVehicles(userIds);

    const totals = await printTotals();
    await markSeedRun(totals);

    console.log('\n---------------------------------------------------------');
    console.log(`Seed completado: ${result.created} Vehículo(s) nuevos, ${result.skipped} ya existian.`);
    console.log(
      `Totales en Firebase: ${totals.users} usuario(s), ${totals.vehicles} Vehículo(s), ` +
        `${totals.images} imagen(es), ${totals.bids} oferta(s).`,
    );
    console.log('\nCuentas de demostracion (contrasena: Demo1234):');
    DEMO_USERS.forEach((user) => console.log(`  - ${user.email} / ${DEMO_PASSWORD}`));
    console.log('\nPuedes volver a ejecutar `npm run db:seed` las veces que quieras:');
    console.log('el seed es idempotente y NO duplica ni borra datos.\n');
  } catch (error) {
    console.error('\n[ERROR] El seed fallo.');
    console.error(`        ${(error && error.message) || error}`);
    console.error('\nRevisa las reglas de seguridad de Realtime Database y los permisos');
    console.error('de la cuenta de servicio en Firebase Console > Configuracion > Cuentas de servicio.');
    process.exitCode = 1;
  } finally {
    await closeFirebase();
  }
}

main().catch((error) => {
  console.error(`\n[ERROR] ${(error && error.message) || error}`);
  process.exitCode = 1;
});
