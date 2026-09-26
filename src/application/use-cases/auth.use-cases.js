import { conflict, unauthorized } from '@/domain/errors/domain-error';
import { validateRegistration, validateLogin } from '@/domain/validators/user-validator';

/**
 * Caso de uso: registrar un usuario nuevo.
 * Dependencias inyectadas (puerto a puerto), sin acceso a HTTP ni a SQL.
 */
export class RegisterUserUseCase {
  constructor({ userRepository, passwordHasher, tokenService }) {
    this.userRepository = userRepository;
    this.passwordHasher = passwordHasher;
    this.tokenService = tokenService;
  }

  async execute(payload) {
    const data = validateRegistration(payload);

    const existing = await this.userRepository.findByEmail(data.email);
    if (existing) {
      throw conflict('Ya existe una cuenta registrada con ese correo electronico.', 'EMAIL_ALREADY_REGISTERED');
    }

    const passwordHash = await this.passwordHasher.hash(data.password);

    const user = await this.userRepository.create({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      passwordHash,
    });

    const token = this.tokenService.sign({ sub: String(user.id), email: user.email });

    return { user: user.toPrivateProfile(), token };
  }
}

/**
 * Caso de uso: iniciar sesion.
 */
export class LoginUserUseCase {
  constructor({ userRepository, passwordHasher, tokenService }) {
    this.userRepository = userRepository;
    this.passwordHasher = passwordHasher;
    this.tokenService = tokenService;
  }

  async execute(payload) {
    const { email, password } = validateLogin(payload);

    const user = await this.userRepository.findByEmail(email);
    // Mismo mensaje para correo inexistente y contrasena incorrecta (no enumerar usuarios).
    if (!user) {
      throw unauthorized('Correo electronico o contrasena incorrectos.');
    }

    const matches = await this.passwordHasher.compare(password, user.passwordHash);
    if (!matches) {
      throw unauthorized('Correo electronico o contrasena incorrectos.');
    }

    const token = this.tokenService.sign({ sub: String(user.id), email: user.email });

    return { user: user.toPrivateProfile(), token };
  }
}

/**
 * Caso de uso: resolver el usuario autenticado a partir de un token JWT.
 * Devuelve null si el token es invalido (permite navegar como anonimo).
 */
export class ResolveCurrentUserUseCase {
  constructor({ userRepository, tokenService }) {
    this.userRepository = userRepository;
    this.tokenService = tokenService;
  }

  async execute(token) {
    if (!token) return null;
    let payload;
    try {
      payload = this.tokenService.verify(token);
    } catch {
      return null;
    }
    if (!payload || !payload.sub) return null;
    return this.userRepository.findById(payload.sub);
  }
}

/** Exige un usuario autenticado dentro de un caso de uso. */
export function requireAuthenticatedUser(user, message = 'Debes iniciar sesion para realizar esta accion.') {
  if (!user) {
    throw unauthorized(message);
  }
  return user;
}
