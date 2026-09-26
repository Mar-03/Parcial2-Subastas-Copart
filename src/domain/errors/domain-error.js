/**
 * Errores de dominio.
 *
 * Los use-cases lanzan estos errores; la capa web (route handlers) los traduce
 * a respuestas HTTP. De esta forma las reglas de negocio nunca dependen de
 * Express/Next ni de codigos HTTP.
 */
export class DomainError extends Error {
  constructor(message, { code = 'DOMAIN_ERROR', status = 400, details = null } = {}) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (message, details) =>
  new DomainError(message, { code: 'BAD_REQUEST', status: 400, details });

export const validationError = (message, details) =>
  new DomainError(message, { code: 'VALIDATION_ERROR', status: 422, details });

export const unauthorized = (message = 'Debes iniciar sesion para realizar esta accion.') =>
  new DomainError(message, { code: 'UNAUTHORIZED', status: 401 });

export const forbidden = (message = 'No tienes permisos para realizar esta accion.') =>
  new DomainError(message, { code: 'FORBIDDEN', status: 403 });

export const notFound = (message = 'Recurso no encontrado.') =>
  new DomainError(message, { code: 'NOT_FOUND', status: 404 });

export const conflict = (message, code = 'CONFLICT') =>
  new DomainError(message, { code, status: 409 });

/** Error especifico de las reglas de puja (mensajes exigidos por la rubrica). */
export const bidRuleError = (message, code) =>
  new DomainError(message, { code, status: 409 });

export const NOT_STARTED = 'AUCTION_NOT_STARTED';
export const ALREADY_FINISHED = 'AUCTION_ALREADY_FINISHED';
export const MINIMUM_BID_NOT_MET = 'MINIMUM_BID_NOT_MET';
export const AUCTION_NOT_ACTIVE = 'AUCTION_NOT_ACTIVE';
