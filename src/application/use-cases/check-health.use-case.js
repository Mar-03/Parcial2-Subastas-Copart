/**
 * Caso de uso: verificar el estado de la aplicacion y de la base de datos.
 * Usado por GET /api/health (health check de Render).
 *
 *   { "status": "ok", "database": "connected", "provider": "firebase-realtime-database" }
 */
export class CheckHealthUseCase {
  constructor({ vehicleRepository, database }) {
    this.vehicleRepository = vehicleRepository;
    this.database = database;
  }

  async execute() {
    const payload = {
      status: 'ok',
      database: 'connected',
      provider: 'firebase-realtime-database',
      auctions: 0,
      timestamp: new Date().toISOString(),
    };

    try {
      const info = await this.database.ping();
      if (info && info.connected === false) {
        payload.database = 'disconnected';
      }
    } catch (error) {
      // La API sigue respondiendo: el health check no debe tumbar el deploy.
      payload.database = 'disconnected';
      payload.provider = 'firebase-realtime-database';
      // Mensaje claro y SIN exponer secretos.
      payload.error = error?.message ? String(error.message) : 'Error de conexion con Firebase';
    }

    try {
      const result = await this.vehicleRepository.list({ page: 1, pageSize: 1 });
      payload.auctions = result.total;
    } catch {
      payload.auctions = 0;
    }

    return payload;
  }
}
