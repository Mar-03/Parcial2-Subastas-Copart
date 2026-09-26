/**
 * Puerto (interface) del repositorio de pujas.
 *
 * `placeBid` realiza la escritura del BID y la actualizacion de VEHICLES de
 * forma atomica, pasando por el callback `validateBid` definido en la capa de
 * aplicacion. Asi las reglas de puja viven en el dominio/aplicacion y la
 * atomicidad vive en la infraestructura (transaccion de Firebase Realtime
 * Database, equivalente al UPDLOCK + transaccion de la version con SQL Server).
 */
export class BidRepository {
  /** Historial publico de pujas de un vehiculo (solo monto y fecha). */
  // eslint-disable-next-line no-unused-vars
  async findByVehicle(vehicleId) {
    throw new Error('BidRepository.findByVehicle no implementado');
  }

  /**
   * Registra una puja de forma atomica.
   * @param {object} params
   * @param {number|string} params.vehicleId
   * @param {number|string} params.userId
   * @param {number} params.amount
   * @param {(lockedVehicle: object) => void} params.validateBid - regla de negocio (lanza DomainError)
   * @returns {Promise<{ vehicle: object, bid: object }>}
   */
  // eslint-disable-next-line no-unused-vars
  async placeBid({ vehicleId, userId, amount, validateBid }) {
    throw new Error('BidRepository.placeBid no implementado');
  }
}
