/**
 * Puerto (interface) de salud de la base de datos.
 * Implementacion: infrastructure/database/firebase-admin.js (FirebaseDatabaseAdapter)
 */
export class DatabasePort {
  /** @returns {Promise<{ connected: boolean, provider: string, [key:string]: any }>} */
  // eslint-disable-next-line no-unused-vars
  async ping() {
    throw new Error('DatabasePort.ping no implementado');
  }
}
