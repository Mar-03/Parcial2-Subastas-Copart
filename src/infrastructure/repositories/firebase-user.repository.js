import { UserRepository } from '@/domain/ports/user-repository.port';
import { User } from '@/domain/entities/user.entity';
import firebaseDb from '@/infrastructure/database/firebase-admin';
import { emailKey, nextId } from '@/infrastructure/database/firebase-utils';

const { dbRef } = firebaseDb;

/** Convierte el snapshot de `users/{id}` en la entidad User. */
function toUser(raw) {
  if (!raw) return null;
  return new User({
    id: Number(raw.id),
    firstName: raw.firstName,
    lastName: raw.lastName,
    email: raw.email,
    phone: raw.phone,
    passwordHash: raw.passwordHash,
    createdAt: raw.createdAt,
  });
}

/**
 * Adaptador de Firebase Realtime Database del puerto UserRepository.
 *
 * Estructura:
 *   users/{userId}/{ id, firstName, lastName, email, phone, passwordHash, createdAt }
 *   userEmails/{emailKey}/  ->  userId      (indice para buscar por correo)
 *
 * Firebase es solo persistencia: el hash bcrypt y el JWT los gestiona la app.
 */
export class FirebaseUserRepository extends UserRepository {
  constructor() {
    super();
    this.db = firebaseDb;
  }

  async findByEmail(email) {
    const indexKey = emailKey(email);
    const indexSnapshot = await dbRef(`userEmails/${indexKey}`).once('value');
    const userId = indexSnapshot.val();
    if (!userId) return null;
    return this.findById(userId);
  }

  async findById(id) {
    if (id === null || id === undefined || id === '') return null;
    const snapshot = await dbRef(`users/${id}`).once('value');
    return toUser(snapshot.val());
  }

  async create({ firstName, lastName, email, phone, passwordHash }) {
    const id = await nextId('_counters/users');
    const indexKey = emailKey(email);

    const record = {
      id,
      firstName,
      lastName,
      email,
      phone: phone || null,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    // Actualizacion multi-ruta atomica: usuario + indice de correo.
    await dbRef('').update({
      [`users/${id}`]: record,
      [`userEmails/${indexKey}`]: id,
    });

    return new User(record);
  }
}

export function createFirebaseUserRepository() {
  return new FirebaseUserRepository();
}
