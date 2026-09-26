import bcrypt from 'bcryptjs';
import { PasswordHasher } from '@/domain/ports/password-hasher.port';

const SALT_ROUNDS = 10;

/**
 * Adaptador bcryptjs del puerto PasswordHasher.
 */
export class BcryptPasswordHasher extends PasswordHasher {
  async hash(plainText) {
    return bcrypt.hash(plainText, SALT_ROUNDS);
  }

  async compare(plainText, hash) {
    if (!hash) return false;
    try {
      return await bcrypt.compare(plainText, hash);
    } catch {
      return false;
    }
  }
}

export function createBcryptPasswordHasher() {
  return new BcryptPasswordHasher();
}
