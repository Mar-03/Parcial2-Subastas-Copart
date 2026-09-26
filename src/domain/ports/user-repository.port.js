/**
 * Puerto (interface) del repositorio de usuarios.
 * La implementacion real vive en infrastructure/repositories
 * (Firebase Realtime Database).
 */
export class UserRepository {
  /**
   * @param {object} data
   * @param {string} data.firstName
   * @param {string} data.lastName
   * @param {string} data.email
   * @param {string} data.phone
   * @param {string} data.passwordHash
   * @returns {Promise<import('../entities/user.entity').User>}
   */
  // eslint-disable-next-line no-unused-vars
  async create(data) {
    throw new Error('UserRepository.create no implementado');
  }

  /** @param {string} email */
  // eslint-disable-next-line no-unused-vars
  async findByEmail(email) {
    throw new Error('UserRepository.findByEmail no implementado');
  }

  /** @param {number|string} id */
  // eslint-disable-next-line no-unused-vars
  async findById(id) {
    throw new Error('UserRepository.findById no implementado');
  }
}
