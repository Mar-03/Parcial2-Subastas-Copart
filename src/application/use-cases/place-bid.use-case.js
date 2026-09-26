import { AUCTION_STATUS } from '@/domain/entities/auction-status';
import {
  calculateMinimumBid,
  roundMoney,
  toPublicVehicle,
} from '@/domain/entities/vehicle.entity';
import {
  ALREADY_FINISHED,
  AUCTION_NOT_ACTIVE,
  MINIMUM_BID_NOT_MET,
  NOT_STARTED,
  bidRuleError,
  notFound,
  validationError,
} from '@/domain/errors/domain-error';
import { toNumber } from '@/domain/validators/common-validator';
import { validateNumericId } from '@/domain/validators/user-validator';
import { requireAuthenticatedUser } from './auth.use-cases';
import { formatMoney } from '@/lib/format';

/**
 * Caso de uso: registrar una puja.
 *
 * TODAS las reglas de puja se validan aqui (capa de aplicacion) y de nuevo
 * dentro de la transaccion de Firebase, usando el vehiculo ya bloqueado, para
 * evitar condiciones de carrera.
 *
 * Reglas:
 *  1. El usuario debe estar autenticado.
 *  2. No se acepta antes de startTime.
 *  3. No se acepta despues de endTime.
 *  4. Sin pujas previas:  oferta >= basePrice.
 *  5. Con pujas previas: oferta >= currentBid * 1.10
 */
export class PlaceBidUseCase {
  constructor({ bidRepository, vehicleRepository, realtimePublisher }) {
    this.bidRepository = bidRepository;
    this.vehicleRepository = vehicleRepository;
    this.realtimePublisher = realtimePublisher;
  }

  async execute({ vehicleId, payload, currentUser, now = new Date() }) {
    // --- Regla 1: autenticacion -------------------------------------------------
    const user = requireAuthenticatedUser(
      currentUser,
      'Debes iniciar sesion para ofertar en una subasta.',
    );

    const id = validateNumericId(vehicleId, 'vehicleId');
    const amount = readBidAmount(payload);

    // Comprobacion rapida (sin bloqueo) para dar mensajes claros de inmediato.
    // La validacion definitiva se repite dentro de la transaccion.
    const preview = await this.vehicleRepository.findById(id);
    if (!preview) {
      throw notFound('El vehiculo solicitado no existe.');
    }
    this.assertBidAllowed(preview, amount, now);

    // --- Transaccion atomica con validacion definitiva -------------------------
    const result = await this.bidRepository.placeBid({
      vehicleId: id,
      userId: user.id,
      amount,
      validateBid: (lockedVehicle) => this.assertBidAllowed(lockedVehicle, amount, now),
    });

    // --- Tiempo real ------------------------------------------------------------
    const [hydrated] = await this.vehicleRepository.hydrate([result.vehicle]);
    const payloadEvent = this.buildEvent(hydrated);

    if (this.realtimePublisher) {
      this.realtimePublisher.publishBidUpdated(hydrated.id, payloadEvent);
    }

    return {
      bid: { amount: result.bid.amount, createdAt: result.bid.createdAt },
      vehicle: toPublicVehicle(hydrated, { currentUserId: user.id, now }),
      event: payloadEvent,
    };
  }

  /**
   * Reglas 2, 3, 4 y 5. Se ejecuta con el vehiculo bloqueado dentro de la
   * transaccion, por lo que los mensajes de error son siempre los definitivos.
   */
  assertBidAllowed(vehicle, amount, now = new Date()) {
    const start = new Date(vehicle.startTime);
    const end = new Date(vehicle.endTime);
    const currentTime = now instanceof Date ? now : new Date(now);

    // Regla 2: la subasta todavia no ha iniciado.
    if (Number.isFinite(start.getTime()) && currentTime.getTime() < start.getTime()) {
      throw bidRuleError('Esta subasta todavia no ha iniciado.', NOT_STARTED);
    }

    // Regla 3: la subasta ya finalizo.
    if (Number.isFinite(end.getTime()) && currentTime.getTime() > end.getTime()) {
      throw bidRuleError('Esta subasta ha finalizado.', ALREADY_FINISHED);
    }

    // Regla extra: solo se puja sobre subastas activas.
    const status = String(vehicle.status || AUCTION_STATUS.ACTIVA).toUpperCase();
    if (status !== AUCTION_STATUS.ACTIVA) {
      throw bidRuleError('Esta subasta ha finalizado.', AUCTION_NOT_ACTIVE);
    }

    // Reglas 4 y 5: oferta minima.
    const minimumBid = calculateMinimumBid(vehicle.currentBid, vehicle.basePrice);
    if (amount < minimumBid) {
      throw bidRuleError(`La oferta minima permitida es Q ${formatMoney(minimumBid)}`, MINIMUM_BID_NOT_MET);
    }
  }

  /** Payload del evento `bidUpdated` de Socket.IO. */
  buildEvent(vehicle) {
    return {
      vehicleId: vehicle.id,
      currentBid: Number(vehicle.currentBid),
      minimumBid: calculateMinimumBid(vehicle.currentBid, vehicle.basePrice),
      highestBidderId: vehicle.highestBidderId ?? null,
      endTime: vehicle.endTime,
      status: String(vehicle.status || AUCTION_STATUS.ACTIVA).toUpperCase(),
      // Privacidad: el historial publico solo tiene monto y fecha.
      bids: vehicle.bids.map((bid) => ({ amount: Number(bid.amount), createdAt: bid.createdAt })),
    };
  }
}

/**
 * Lee y normaliza el monto ofertado (acepta number o string con decimales).
 */
export function readBidAmount(payload = {}) {
  const raw = payload.amount ?? payload.monto ?? payload.oferta ?? payload.bid;
  const errors = {};

  let amount = toNumber(raw);

  if (!Number.isFinite(amount)) {
    errors.amount = 'Ingresa un monto valido.';
  } else if (amount <= 0) {
    errors.amount = 'El monto de la oferta debe ser mayor que 0.';
  } else if (amount > 100000000) {
    errors.amount = 'El monto de la oferta es demasiado alto.';
  } else {
    // Acepta hasta 2 decimales; se redondea a 2 decimales.
    amount = roundMoney(amount);
    if (Math.abs(toNumber(raw) - amount) > 0.004) {
      errors.amount = 'El monto admite como maximo 2 decimales.';
    }
  }

  if (Object.keys(errors).length > 0) {
    throw validationError('Revisa el monto de tu oferta.', errors);
  }

  return amount;
}
