/**
 * Entidad de dominio: Puja (BID).
 *
 * IMPORTANTE (privacidad): la entidad completa puede contener `userId` para
 * uso interno del servidor, pero NUNCA se expone publicly. La vista publica
 * contiene unicamente `amount` y `createdAt`.
 */
export class Bid {
  constructor({ id, vehicleId, userId, amount, createdAt }) {
    this.id = id;
    this.vehicleId = vehicleId;
    this.userId = userId;
    this.amount = Number(amount);
    this.createdAt = createdAt;
  }

  toPublic() {
    return {
      amount: this.amount,
      createdAt: this.createdAt,
    };
  }
}

/**
 * Mapea un registro de persistencia a la entidad Bid.
 * Acepta el formato de Firebase Realtime Database (camelCase) y, por
 * compatibilidad, tambien el formato en columnas (snake_case).
 */
export function mapBidRow(row) {
  if (!row) return null;
  return new Bid({
    id: row.id,
    vehicleId: row.vehicleId ?? row.vehicle_id,
    userId: row.userId ?? row.user_id,
    amount: row.amount,
    createdAt: row.createdAt ?? row.created_at,
  });
}
