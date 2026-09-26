'use client';

import { io } from 'socket.io-client';

let socket = null;

/**
 * Conexion Socket.IO compartida (singleton en el navegador).
 * Si el servidor no expone Socket.IO (por ejemplo `next dev` sin server.js),
 * la conexion falla silenciosamente y la interfaz usa el refresco periodico.
 */
export function getSocket() {
  if (typeof window === 'undefined') return null;
  if (socket) return socket;

  socket = io({
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1500,
    timeout: 8000,
  });

  return socket;
}

export function closeSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export function joinAuction(vehicleId) {
  const activeSocket = getSocket();
  if (!activeSocket) return;
  activeSocket.emit('joinAuction', { vehicleId });
}

export function leaveAuction(vehicleId) {
  const activeSocket = getSocket();
  if (!activeSocket) return;
  activeSocket.emit('leaveAuction', { vehicleId });
}

export function onBidUpdated(handler) {
  const activeSocket = getSocket();
  if (!activeSocket) return () => {};
  activeSocket.on('bidUpdated', handler);
  return () => {
    activeSocket.off('bidUpdated', handler);
  };
}
