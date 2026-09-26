const { loadEnv } = require('./scripts/load-env');

/**
 * Servidor unico para Next.js + Socket.IO (despliegue en Render).
 *
 * - Next.js maneja todas las rutas HTTP y las route handlers de /api/*.
 * - Socket.IO maneja los canales de tiempo real sobre el MISMO puerto.
 *
 * La instancia de Socket.IO se publica en `global.__socketio` para que las
 * route handlers (capa de aplicacion) puedan emitir `bidUpdated`.
 *
 *   PORT  -> process.env.PORT || 3000   (Render lo define)
 *   HOST  -> 0.0.0.0                    (obligatorio en contenedores)
 */

loadEnv();

const http = require('http');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOST || '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

/** Sala de una subasta: auction-<vehicleId> */
const auctionRoom = (vehicleId) => `auction-${vehicleId}`;

function normalizeVehicleId(value) {
  const raw = value && typeof value === 'object' ? value.vehicleId : value;
  const id = Number.parseInt(raw, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

app.prepare().then(() => {
  const server = http.createServer((req, res) => handle(req, res));

  // Socket.IO se monta DESPUES de crear el server HTTP para que engine.io
  // redirija las peticiones /socket.io y deje pasar el resto a Next.js.
  const io = new Server(server, {
    path: '/socket.io',
    serveClient: false,
    cors: { origin: '*', methods: ['GET', 'POST'] },
    pingInterval: 20000,
    pingTimeout: 25000,
  });

  // Puente con la capa de aplicacion (route handlers de Next.js).
  global.__socketio = io;

  io.on('connection', (socket) => {
    socket.on('joinAuction', (payload) => {
      const vehicleId = normalizeVehicleId(payload);
      if (!vehicleId) return;
      socket.join(auctionRoom(vehicleId));
      socket.emit('joinedAuction', { vehicleId });
    });

    socket.on('leaveAuction', (payload) => {
      const vehicleId = normalizeVehicleId(payload);
      if (!vehicleId) return;
      socket.leave(auctionRoom(vehicleId));
    });

    socket.on('disconnect', () => {
      /* las salas se limpian automaticamente */
    });
  });

  server.listen(port, hostname, () => {
    console.log(`> Subastas Copart lista en http://${hostname}:${port}`);
    console.log(`> Socket.IO escuchando en ws://${hostname}:${port}/socket.io`);
    console.log(`> Modo: ${dev ? 'desarrollo' : 'produccion'}`);
  });

  const shutdown = (signal) => {
    console.log(`\n> ${signal} recibido, cerrando servidor...`);
    io.close();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Cierre automatico de subastas vencidas (VENDIDA / DESIERTA).
  // Es una red de seguridad: la lectura ya calcula el estado efectivo y la
  // API tambien ejecuta un barrido oportunista al listar/detallar un vehiculo.
  const SWEEP_INTERVAL_MS = 60 * 1000;
  let sweeping = false;

  const sweepExpiredAuctions = async () => {
    if (sweeping) return;
    sweeping = true;
    try {
      // `src/infrastructure/container.js` es ESM y usa el alias `@/`, que Node
      // no puede resolver al ejecutar este archivo. Por eso el barrido usa el
      // modulo CommonJS de `scripts/`, que solo depende de adaptadores planos.
      const { closeExpiredAuctions } = require('./scripts/sweep-expired-auctions');
      const closed = await closeExpiredAuctions();
      if (closed > 0) {
        console.log(`[server] ${closed} subasta(s) cerrada(s) por vencimiento.`);
      }
    } catch (error) {
      console.error('[server] No se pudieron cerrar subastas vencidas:', error.message);
    } finally {
      sweeping = false;
    }
  };

  const sweepTimer = setInterval(sweepExpiredAuctions, SWEEP_INTERVAL_MS);
  if (typeof sweepTimer.unref === 'function') sweepTimer.unref();

  setTimeout(sweepExpiredAuctions, 5000).unref();
});
