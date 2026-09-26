import { AUCTION_STATUS, resolveEffectiveStatus, hasAuctionEnded } from './auction-status';
import { getDamageLevel } from './damage-level';

/**
 * Entidad de dominio: Vehiculo en subasta.
 *
 * Regla de puja (dominio puro, sin dependencias de infraestructura):
 *   minimumBid = currentBid > 0 ? currentBid * 1.10 : basePrice   (2 decimales)
 */
export class Vehicle {
  constructor({
    id,
    ownerId,
    year,
    itemType,
    brand,
    model,
    engine,
    transmission,
    fuel,
    drivetrain,
    cylinders,
    damageLevel,
    basePrice,
    currentBid,
    highestBidderId,
    startTime,
    endTime,
    status,
    createdAt,
    images = [],
    bids = [],
  }) {
    this.id = id;
    this.ownerId = ownerId;
    this.year = year;
    this.itemType = itemType;
    this.brand = brand;
    this.model = model;
    this.engine = engine;
    this.transmission = transmission;
    this.fuel = fuel;
    this.drivetrain = drivetrain;
    this.cylinders = cylinders;
    this.damageLevel = damageLevel;
    this.basePrice = basePrice;
    this.currentBid = currentBid;
    this.highestBidderId = highestBidderId;
    this.startTime = startTime;
    this.endTime = endTime;
    this.status = status;
    this.createdAt = createdAt;
    this.images = images;
    this.bids = bids;
  }

  /** Oferta minima siguiente, con dos decimales. */
  get minimumBid() {
    return calculateMinimumBid(this.currentBid, this.basePrice);
  }

  get hasBids() {
    return Number(this.currentBid) > 0;
  }

  get primaryImage() {
    return this.images.length > 0 ? this.images[0] : null;
  }

  toJSON() {
    return {
      id: this.id,
      ownerId: this.ownerId,
      year: this.year,
      itemType: this.itemType,
      brand: this.brand,
      model: this.model,
      engine: this.engine,
      transmission: this.transmission,
      fuel: this.fuel,
      drivetrain: this.drivetrain,
      cylinders: this.cylinders,
      damageLevel: this.damageLevel,
      basePrice: Number(this.basePrice),
      currentBid: Number(this.currentBid),
      highestBidderId: this.highestBidderId ?? null,
      startTime: this.startTime,
      endTime: this.endTime,
      status: this.status,
      createdAt: this.createdAt,
      images: this.images,
      bids: this.bids,
    };
  }
}

/** Redondeo monetario a dos decimales. */
export function roundMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.round((number + Number.EPSILON) * 100) / 100;
}

/**
 * Calculo oficial de la oferta minima.
 *   currentBid > 0  ->  currentBid * 1.10
 *   currentBid = 0  ->  basePrice
 */
export function calculateMinimumBid(currentBid, basePrice) {
  const current = Number(currentBid) || 0;
  if (current > 0) return roundMoney(current * 1.1);
  return roundMoney(Number(basePrice) || 0);
}

/**
 * Mapea un registro de persistencia a la entidad Vehicle.
 * Acepta el formato de Firebase Realtime Database (camelCase) y, por
 * compatibilidad, tambien el formato en columnas (snake_case).
 */
export function mapVehicleRow(row) {
  if (!row) return null;
  return new Vehicle({
    id: row.id,
    ownerId: row.ownerId ?? row.owner_id,
    year: row.year,
    itemType: row.itemType ?? row.item_type,
    brand: row.brand,
    model: row.model,
    engine: row.engine,
    transmission: row.transmission,
    fuel: row.fuel,
    drivetrain: row.drivetrain,
    cylinders: row.cylinders,
    damageLevel: row.damageLevel ?? row.damage_level,
    basePrice: row.basePrice ?? row.base_price,
    currentBid: row.currentBid ?? row.current_bid,
    highestBidderId: row.highestBidderId ?? row.highest_bidder_id,
    startTime: row.startTime ?? row.start_time,
    endTime: row.endTime ?? row.end_time,
    status: row.status,
    createdAt: row.createdAt ?? row.created_at,
  });
}

/** Indica si la subasta ya dio inicio (startTime alcanzado). */
export function hasAuctionStarted(startTime, now = new Date()) {
  const start = startTime ? new Date(startTime).getTime() : null;
  if (!start || !Number.isFinite(start)) return true;
  return now.getTime() >= start;
}

/**
 * Vista publica de un vehiculo. Nunca incluye datos del propietario
 * (nombre, correo, telefono) ni identidad de los ofertantes.
 */
export function toPublicVehicle(vehicle, { currentUserId = null, now = new Date() } = {}) {
  const status = resolveEffectiveStatus(vehicle.status, vehicle.endTime, now);
  const damage = getDamageLevel(vehicle.damageLevel);
  const json = vehicle.toJSON();
  return {
    ...json,
    status,
    statusLabel: status === AUCTION_STATUS.ACTIVA ? 'EN CURSO' : status,
    damageInfo: damage
      ? { label: damage.label, shortLabel: damage.shortLabel, cssClass: damage.cssClass, description: damage.description }
      : null,
    minimumBid: calculateMinimumBid(vehicle.currentBid, vehicle.basePrice),
    hasBids: Number(vehicle.currentBid) > 0,
    hasStarted: hasAuctionStarted(vehicle.startTime, now),
    ended: hasAuctionEnded(vehicle.endTime, now),
    isOwner: currentUserId != null && String(currentUserId) === String(vehicle.ownerId),
    isLeading:
      currentUserId != null &&
      vehicle.highestBidderId != null &&
      String(currentUserId) === String(vehicle.highestBidderId),
    images: vehicle.images,
    bids: vehicle.bids.map(toPublicBid),
  };
}

/** Vista publica de una puja: solo monto y fecha. Sin identidad del ofertante. */
export function toPublicBid(bid) {
  return {
    amount: Number(bid.amount),
    createdAt: bid.createdAt,
  };
}
