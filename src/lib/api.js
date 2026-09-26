import { NextResponse } from 'next/server';
import { DomainError } from '@/domain/errors/domain-error';
import { getContainer } from '@/infrastructure/container';

/**
 * Utilidades de la capa web (traducen casos de uso <-> HTTP).
 * No contienen logica de negocio.
 */

export function jsonSuccess(data = {}, status = 200) {
  return NextResponse.json({ success: true, ...data }, { status });
}

export function jsonError(message, { status = 400, code = 'ERROR', details = null } = {}) {
  return NextResponse.json(
    { success: false, message, code, ...(details ? { errors: details } : {}) },
    { status },
  );
}

/**
 * Envoltura de route handlers: convierte DomainError y errores de
 * infraestructura en respuestas JSON consistentes.
 */
export function route(handler) {
  return async function wrappedRoute(...args) {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof DomainError) {
        return jsonError(error.message, {
          status: error.status,
          code: error.code,
          details: error.details,
        });
      }

      console.error('[api] Error no controlado:', error);
      return jsonError('Ocurrio un error inesperado en el servidor.', {
        status: 500,
        code: 'INTERNAL_ERROR',
      });
    }
  };
}

/** Lee el cuerpo JSON de la peticion. */
export async function readJson(request) {
  try {
    const body = await request.json();
    return body && typeof body === 'object' ? body : {};
  } catch {
    throw new DomainError('El cuerpo de la peticion debe ser JSON valido.', {
      code: 'INVALID_JSON',
      status: 400,
    });
  }
}

/** Extrae el token JWT del encabezado Authorization. */
export function getBearerToken(request) {
  const header = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!header) return null;
  const [scheme, token] = String(header).split(' ');
  if (!token || String(scheme).toLowerCase() !== 'bearer') return null;
  return token.trim() || null;
}

/**
 * Resuelve el usuario actual a partir del token.
 * Devuelve null para el usuario anonimo (permitido en catalogo y detalle).
 */
export async function getCurrentUser(request) {
  const token = getBearerToken(request);
  if (!token) return null;
  const { resolveCurrentUser } = getContainer();
  return resolveCurrentUser.execute(token);
}

/** Convierte un NextRequest searchParams en un objeto plano. */
export function toQueryObject(searchParams) {
  if (!searchParams) return {};
  if (typeof searchParams.forEach === 'function' && typeof searchParams.get === 'function') {
    const result = {};
    searchParams.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
  return { ...searchParams };
}
