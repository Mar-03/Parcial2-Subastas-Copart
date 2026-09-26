import { RealtimePublisher } from '@/domain/ports/realtime-publisher.port';

/**
 * Salas de Socket.IO: auction-<vehicleId>
 */
export function auctionRoom(vehicleId) {
  return `auction-${vehicleId}`;
}

/**
 * Adaptador Socket.IO del puerto RealtimePublisher.
 *
 * La instancia de Socket.IO se crea en server.js (unico proceso Node que
 * maneja HTTP + WebSocket) y se expone en `global.__socketio`. Asi las route
 * handlers de Next.js pueden emitir eventos sin volver a crear un servidor.
 *
 * Si la app corre con `next dev` (sin Socket.IO) la publicacion es un no-op
 * silencioso: la interfaz sigue funcionando con el refresco periodico.
 */
export class SocketIoRealtimePublisher extends RealtimePublisher {
  publishBidUpdated(vehicleId, payload) {
    const io = globalThis.__socketio;
    if (!io || typeof io.to !== 'function') return false;

    io.to(auctionRoom(vehicleId)).emit('bidUpdated', payload);
    return true;
  }
}

export function createRealtimePublisher() {
  return new SocketIoRealtimePublisher();
}
