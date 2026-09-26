import { BidRepository } from '@/domain/ports/bid-repository.port';
import { notFound } from '@/domain/errors/domain-error';
import { mapBidRow } from '@/domain/entities/bid.entity';
import { Vehicle } from '@/domain/entities/vehicle.entity';
import firebaseDb from '@/infrastructure/database/firebase-admin';
import { nextId, toSortedArray } from '@/infrastructure/database/firebase-utils';

const { dbRef } = firebaseDb;

const MAX_WRITE_ATTEMPTS = 3;

/**
 * Adaptador de Firebase Realtime Database del puerto BidRepository.
 *
 * ATOMICIDAD DE LA PUJA (equivalente al UPDLOCK de SQL Server):
 *
 *  1. `vehicles/{vehicleId}` se actualiza con `ref.transaction(...)`.
 *     Realtime Database re-evalua la funcion si otro cliente escribe a la vez
 *     y solo confirma cuando el commit es exitoso (ETag), por lo que dos pujas
 *     simultaneas NO pueden leer el mismo `currentBid`.
 *  2. La validacion de negocio se ejecuta DENTRO de la transaccion, sobre el
 *     valor actual ya bloqueado, mediante el callback `validateBid` que
 *     inyecta la capa de aplicacion (PlaceBidUseCase).
 *  3. Confirmada la transaccion, se actualizan `currentBid` y
 *     `highestBidderId` (mismo nodo, misma escritura atomica).
 *  4. Se guarda la oferta en `bids/{vehicleId}/{bidId}` con una actualizacion
 *     multi-ruta atomica e idempotente.
 *  5. El caso de uso emite el evento Socket.IO `bidUpdated`.
 */
export class FirebaseBidRepository extends BidRepository {
  constructor() {
    super();
    this.db = firebaseDb;
  }

  /** Historial de pujas. El adaptador NO filtra datos: eso lo hace la aplicacion. */
  async findByVehicle(vehicleId) {
    const snapshot = await dbRef(`bids/${vehicleId}`).once('value');
    return toSortedArray(snapshot.val())
      .map(mapBidRow)
      .filter(Boolean)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  /**
   * Registra la puja de forma atomica.
   * @param {{ vehicleId:number, userId:number, amount:number, validateBid:Function }} params
   */
  async placeBid({ vehicleId, userId, amount, validateBid }) {
    const numericVehicleId = Number(vehicleId);
    const numericUserId = Number(userId);
    const vehicleRef = dbRef(`vehicles/${numericVehicleId}`);

    // --- 1) TRANSACCION: valida y actualiza current_bid / highest_bidder_id ---
    const transactionResult = await vehicleRef.transaction((current) => {
      if (!current) {
        throw notFound('El vehiculo solicitado no existe.');
      }

      // Reglas de negocio de la capa de aplicacion, sobre el valor bloqueado.
      // Si lanza un DomainError, la transaccion se cancela y el error sube.
      validateBid(current);

      return {
        ...current,
        currentBid: amount,
        highestBidderId: numericUserId,
      };
    });

    if (!transactionResult.committed) {
      throw new Error('No se pudo confirmar la puja: la subasta cambio durante la operacion. Intenta de nuevo.');
    }

    const updatedSnapshot = transactionResult.snapshot.val();
    const bidId = await nextId(`_counters/bids/${numericVehicleId}`);

    // --- 2) Guarda la oferta (multi-ruta atomica + idempotente) ---------------
    const bidRecord = {
      id: bidId,
      vehicleId: numericVehicleId,
      userId: numericUserId,
      amount,
      createdAt: new Date().toISOString(),
    };

    await this.persistBid(numericVehicleId, bidId, bidRecord, amount, numericUserId);

    const vehicle = new Vehicle({
      id: Number(updatedSnapshot.id),
      ownerId: updatedSnapshot.ownerId,
      year: updatedSnapshot.year,
      itemType: updatedSnapshot.itemType,
      brand: updatedSnapshot.brand,
      model: updatedSnapshot.model,
      engine: updatedSnapshot.engine,
      transmission: updatedSnapshot.transmission,
      fuel: updatedSnapshot.fuel,
      drivetrain: updatedSnapshot.drivetrain,
      cylinders: updatedSnapshot.cylinders,
      damageLevel: updatedSnapshot.damageLevel,
      basePrice: updatedSnapshot.basePrice,
      currentBid: updatedSnapshot.currentBid,
      highestBidderId: updatedSnapshot.highestBidderId,
      startTime: updatedSnapshot.startTime,
      endTime: updatedSnapshot.endTime,
      status: updatedSnapshot.status,
      createdAt: updatedSnapshot.createdAt,
      images: [],
    });

    return { vehicle, bid: { ...bidRecord } };
  }

  /**
   * Escribe la oferta y re-afirma currentBid / highestBidderId en una sola
   * actualizacion multi-ruta (atomica e idempotente: si se repite, el
   * resultado es identico).
   */
  async persistBid(vehicleId, bidId, bidRecord, amount, userId) {
    const payload = {
      [`bids/${vehicleId}/${bidId}`]: bidRecord,
      [`vehicles/${vehicleId}/currentBid`]: amount,
      [`vehicles/${vehicleId}/highestBidderId`]: userId,
    };

    let lastError = null;
    for (let attempt = 1; attempt <= MAX_WRITE_ATTEMPTS; attempt += 1) {
      try {
        await dbRef('').update(payload);
        return true;
      } catch (error) {
        lastError = error;
        console.error(
          `[firebase] No se pudo guardar la oferta ${bidId} (intento ${attempt}/${MAX_WRITE_ATTEMPTS}):`,
          error?.message || error,
        );
      }
    }

    throw lastError || new Error('No se pudo guardar la oferta.');
  }
}

export function createFirebaseBidRepository() {
  return new FirebaseBidRepository();
}
