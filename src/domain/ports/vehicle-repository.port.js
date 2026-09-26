/**
 * Puerto (interface) del repositorio de vehiculos.
 */
export class VehicleRepository {
  /**
   * Lista vehiculos con filtros multi-area combinables.
   * @param {object} filters - { year, brand, model, fuel, damageLevel, status, search, sort, page, pageSize, ownerId }
   * @returns {Promise<{ vehicles: import('../entities/vehicle.entity').Vehicle[], total: number }>}
   */
  // eslint-disable-next-line no-unused-vars
  async list(filters) {
    throw new Error('VehicleRepository.list no implementado');
  }

  /** @param {number|string} id */
  // eslint-disable-next-line no-unused-vars
  async findById(id) {
    throw new Error('VehicleRepository.findById no implementado');
  }

  /** @param {object} data */
  // eslint-disable-next-line no-unused-vars
  async create(data) {
    throw new Error('VehicleRepository.create no implementado');
  }

  /** @param {number|string} id @param {object} data */
  // eslint-disable-next-line no-unused-vars
  async update(id, data) {
    throw new Error('VehicleRepository.update no implementado');
  }

  /** @param {number|string} ownerId */
  // eslint-disable-next-line no-unused-vars
  async findByOwner(ownerId) {
    throw new Error('VehicleRepository.findByOwner no implementado');
  }

  /**
   * Carga imagenes y pujas de varios vehiculos en solo dos consultas.
   * @param {Array<{id: number|string}>} vehicles
   */
  // eslint-disable-next-line no-unused-vars
  async hydrate(vehicles) {
    throw new Error('VehicleRepository.hydrate no implementado');
  }

  /** @param {number|string} vehicleId */
  // eslint-disable-next-line no-unused-vars
  async getImages(vehicleId) {
    throw new Error('VehicleRepository.getImages no implementado');
  }

  /** @param {number|string} vehicleId */
  // eslint-disable-next-line no-unused-vars
  async getBids(vehicleId) {
    throw new Error('VehicleRepository.getBids no implementado');
  }

  /** Opciones disponibles para los filtros del catalogo. */
  // eslint-disable-next-line no-unused-vars
  async getFacets() {
    throw new Error('VehicleRepository.getFacets no implementado');
  }

  /** Cierra subastas vencidas (VENDIDA / DESIERTA). */
  // eslint-disable-next-line no-unused-vars
  async closeExpiredAuctions(now = new Date()) {
    throw new Error('VehicleRepository.closeExpiredAuctions no implementado');
  }
}
