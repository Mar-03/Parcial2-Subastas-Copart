/**
 * Entidad de dominio: Usuario.
 * No contiene dependencias de infraestructura.
 */
export class User {
  constructor({ id, firstName, lastName, email, phone, passwordHash, createdAt }) {
    this.id = id;
    this.firstName = firstName;
    this.lastName = lastName;
    this.email = email;
    this.phone = phone;
    this.passwordHash = passwordHash;
    this.createdAt = createdAt;
  }

  get fullName() {
    return [this.firstName, this.lastName].filter(Boolean).join(' ').trim();
  }

  /** Vista publica segura: nunca expone correo, telefono ni hash. */
  toPublic() {
    return {
      id: this.id,
      firstName: this.firstName,
      lastName: this.lastName,
      fullName: this.fullName,
    };
  }

  /** Vista para el propio usuario autenticado (incluye correo y telefono). */
  toPrivateProfile() {
    return {
      id: this.id,
      firstName: this.firstName,
      lastName: this.lastName,
      fullName: this.fullName,
      email: this.email,
      phone: this.phone,
      createdAt: this.createdAt,
    };
  }
}

/**
 * Construye la entidad desde un registro de persistencia.
 * Acepta el formato de Firebase Realtime Database (camelCase) y, por
 * compatibilidad, tambien el formato en columnas (snake_case).
 */
export function mapUserRow(row) {
  if (!row) return null;
  return new User({
    id: row.id,
    firstName: row.firstName ?? row.first_name,
    lastName: row.lastName ?? row.last_name,
    email: row.email,
    phone: row.phone,
    passwordHash: row.passwordHash ?? row.password_hash,
    createdAt: row.createdAt ?? row.created_at,
  });
}
