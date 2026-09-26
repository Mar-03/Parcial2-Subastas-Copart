import jwt from 'jsonwebtoken';
import { TokenService } from '@/domain/ports/token-service.port';

const DEFAULT_EXPIRES_IN = '8h';

/**
 * Adaptador JWT del puerto TokenService.
 *
 * JWT_SECRET se lee de forma perezosa para que el build de Next.js no
 * falle si la variable todavia no esta definida.
 */
export class JwtTokenService extends TokenService {
  constructor() {
    super();
  }

  getSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.trim().length === 0) {
      throw new Error('JWT_SECRET no esta definido. Copia .env.example a .env y defines JWT_SECRET.');
    }
    return secret;
  }

  sign(payload) {
    return jwt.sign(payload, this.getSecret(), {
      expiresIn: process.env.JWT_EXPIRES_IN || DEFAULT_EXPIRES_IN,
    });
  }

  verify(token) {
    return jwt.verify(token, this.getSecret());
  }
}

export function createJwtTokenService() {
  return new JwtTokenService();
}
