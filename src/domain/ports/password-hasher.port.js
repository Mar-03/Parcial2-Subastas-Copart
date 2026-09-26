/**
 * Puerto (interface) del servicio de hashing de contrasenas.
 * Implementacion: infrastructure/auth/bcrypt.password-hasher.js
 */
export class PasswordHasher {
  /** @param {string} plainText */
  // eslint-disable-next-line no-unused-vars
  async hash(plainText) {
    throw new Error('PasswordHasher.hash no implementado');
  }

  /** @param {string} plainText @param {string} hash */
  // eslint-disable-next-line no-unused-vars
  async compare(plainText, hash) {
    throw new Error('PasswordHasher.compare no implementado');
  }
}
