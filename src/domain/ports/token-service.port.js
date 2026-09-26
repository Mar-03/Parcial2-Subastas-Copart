/**
 * Puerto (interface) del servicio de tokens JWT.
 * Implementacion: infrastructure/auth/jwt.token-service.js
 */
export class TokenService {
  /** @param {object} payload */
  // eslint-disable-next-line no-unused-vars
  sign(payload) {
    throw new Error('TokenService.sign no implementado');
  }

  /** @param {string} token */
  // eslint-disable-next-line no-unused-vars
  verify(token) {
    throw new Error('TokenService.verify no implementado');
  }
}
