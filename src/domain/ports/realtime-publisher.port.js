/**
 * Puerto (interface) del publicador de eventos de tiempo real.
 * Implementacion: infrastructure/realtime/socket-emitter.js (Socket.IO)
 */
export class RealtimePublisher {
  /**
   * @param {number|string} vehicleId
   * @param {object} payload - { vehicleId, currentBid, highestBidderId, endTime, ... }
   */
  // eslint-disable-next-line no-unused-vars
  publishBidUpdated(vehicleId, payload) {
    throw new Error('RealtimePublisher.publishBidUpdated no implementado');
  }
}
