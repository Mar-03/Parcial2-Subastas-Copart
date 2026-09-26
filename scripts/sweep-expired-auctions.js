/**
 * scripts/sweep-expired-auctions.js
 *
 * Cierre de subastas vencidas: ACTIVA -> VENDIDA (si hubo ofertas) o
 * DESIERTA (sin ofertas). Misma regla que
 * `FirebaseVehicleRepository.closeExpiredAuctions()`.
 *
 * Existe como modulo CommonJS sin alias porque lo carga `server.js`, que Node
 * ejecuta directamente: `src/infrastructure/container.js` es ESM y usa el alias
 * `@/`, que Node no puede resolver. Aqui solo se usan los adaptadores planos
 * de `src/infrastructure/database/` (tambien CommonJS).
 *
 * No borra datos: solo cambia `status` de las subastas ya vencidas.
 */

const { dbRef } = require('../src/infrastructure/database/firebase-admin');
const { toSortedArray } = require('../src/infrastructure/database/firebase-utils');

/**
 * @param {Date} [now]
 * @returns {Promise<number>} cantidad de subastas cerradas en esta pasada
 */
async function closeExpiredAuctions(now = new Date()) {
  const snapshot = await dbRef('vehicles').once('value');
  const vehicles = toSortedArray(snapshot.val());
  const nowMs = now.getTime();

  const payload = {};
  let closed = 0;

  vehicles.forEach((vehicle) => {
    if (!vehicle || String(vehicle.status || '').toUpperCase() !== 'ACTIVA') return;

    const end = new Date(vehicle.endTime).getTime();
    if (!Number.isFinite(end) || end >= nowMs) return;

    // `currentBid > 0` solo ocurre tras una puja valida (ver PlaceBidUseCase).
    const hadBids = Number(vehicle.currentBid) > 0;
    payload[`vehicles/${vehicle.id}/status`] = hadBids ? 'VENDIDA' : 'DESIERTA';
    closed += 1;
  });

  if (closed > 0) {
    await dbRef('/').update(payload);
  }

  return closed;
}

module.exports = { closeExpiredAuctions };

// Permite ejecutarlo manual:  node scripts/sweep-expired-auctions.js
if (require.main === module) {
  require('./load-env').loadEnv();
  closeExpiredAuctions()
    .then((closed) => {
      console.log(`Subastas cerradas por vencimiento: ${closed}`);
      return require('../src/infrastructure/database/firebase-admin').closeFirebase();
    })
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(`[sweep] Error: ${(error && error.message) || error}`);
      process.exit(1);
    });
}
