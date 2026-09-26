import { AUCTION_STATUS } from '@/domain/entities/auction-status';
import { toPublicVehicle } from '@/domain/entities/vehicle.entity';
import { forbidden, notFound } from '@/domain/errors/domain-error';
import { validateVehicleInput } from '@/domain/validators/vehicle-validator';
import { validateNumericId } from '@/domain/validators/user-validator';
import { requireAuthenticatedUser } from './auth.use-cases';

const SORTS = {
  nuevos: 'created_at DESC',
  antiguos: 'created_at ASC',
  cierre_proximo: 'end_time ASC',
  oferta_mayor: 'current_bid DESC',
  precio_menor: 'base_price ASC',
  precio_mayor: 'base_price DESC',
};

/**
 * Caso de uso: listar vehiculos del catalogo con filtros multi-area.
 * Usuario anonimo permitido.
 */
export class ListVehiclesUseCase {
  constructor({ vehicleRepository }) {
    this.vehicleRepository = vehicleRepository;
  }

  async execute(query = {}, currentUser = null) {
    const filters = buildFilters(query);

    const result = await this.vehicleRepository.list(filters);
    const vehicles = await this.vehicleRepository.hydrate(result.vehicles);

    const facets = await this.vehicleRepository.getFacets();

    return {
      vehicles: vehicles.map((vehicle) =>
        toPublicVehicle(vehicle, { currentUserId: currentUser ? currentUser.id : null }),
      ),
      total: result.total,
      page: filters.page,
      pageSize: filters.pageSize,
      totalPages: Math.max(1, Math.ceil(result.total / filters.pageSize)),
      facets,
    };
  }
}

/** Transforma query params crudos en filtros de dominio. */
export function buildFilters(query = {}) {
  const first = (value) => (Array.isArray(value) ? value[0] : value);

  const raw = {
    year: first(query.year),
    brand: first(query.brand),
    model: first(query.model),
    fuel: first(query.fuel),
    damageLevel: first(query.damageLevel ?? query.damage),
    itemType: first(query.itemType),
    transmission: first(query.transmission),
    drivetrain: first(query.drivetrain),
    status: first(query.status),
    search: first(query.search ?? query.q),
    sort: first(query.sort),
    page: first(query.page),
    pageSize: first(query.pageSize ?? query.limit),
  };

  const toList = (value) => {
    if (value === undefined || value === null || value === '') return [];
    return String(value)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => Number.isNaN(Number(item)) ? item : Number(item));
  };

  const status = String(raw.status || '').toUpperCase();
  const sort = String(raw.sort || 'nuevos').toLowerCase();
  const page = Math.max(1, parseInt(raw.page, 10) || 1);
  const pageSize = Math.min(60, Math.max(1, parseInt(raw.pageSize, 10) || 12));

  return {
    years: toList(raw.year),
    brands: toList(raw.brand),
    models: toList(raw.model),
    fuels: toList(raw.fuel),
    damageLevels: toList(raw.damageLevel),
    itemTypes: toList(raw.itemType),
    transmissions: toList(raw.transmission),
    drivetrains: toList(raw.drivetrain),
    search: raw.search ? String(raw.search).trim() : null,
    status: Object.values(AUCTION_STATUS).includes(status) ? status : null,
    sortKey: SORTS[sort] ? sort : 'nuevos',
    orderBy: SORTS[SORTS[sort] ? sort : 'nuevos'],
    page,
    pageSize,
  };
}

/**
 * Caso de uso: detalle de un vehiculo (incluye galeria e historial publico).
 */
export class GetVehicleDetailUseCase {
  constructor({ vehicleRepository }) {
    this.vehicleRepository = vehicleRepository;
  }

  async execute({ vehicleId, currentUser = null }) {
    const id = validateNumericId(vehicleId, 'vehicleId');
    await this.vehicleRepository.closeExpiredAuctions();

    const vehicle = await this.vehicleRepository.findById(id);
    if (!vehicle) {
      throw notFound('El vehiculo solicitado no existe.');
    }

    const [hydrated] = await this.vehicleRepository.hydrate([vehicle]);

    return toPublicVehicle(hydrated, { currentUserId: currentUser ? currentUser.id : null });
  }
}

/**
 * Caso de uso: historial publico de pujas de un vehiculo.
 * Devuelve unicamente amount y createdAt (privacidad).
 */
export class GetVehicleBidsUseCase {
  constructor({ vehicleRepository }) {
    this.vehicleRepository = vehicleRepository;
  }

  async execute({ vehicleId }) {
    const id = validateNumericId(vehicleId, 'vehicleId');
    const vehicle = await this.vehicleRepository.findById(id);
    if (!vehicle) {
      throw notFound('El vehiculo solicitado no existe.');
    }
    const bids = await this.vehicleRepository.getBids(id);
    return {
      vehicleId: id,
      // Privacidad: solo monto y fecha, sin identidad del ofertante.
      bids: bids.map((bid) => ({ amount: bid.amount, createdAt: bid.createdAt })),
    };
  }
}

/**
 * Caso de uso: publicar un vehiculo. Requiere autenticacion.
 */
export class CreateVehicleUseCase {
  constructor({ vehicleRepository }) {
    this.vehicleRepository = vehicleRepository;
  }

  async execute(payload, currentUser) {
    const user = requireAuthenticatedUser(currentUser, 'Debes iniciar sesion para publicar un vehiculo.');
    const data = validateVehicleInput(payload);

    const vehicle = await this.vehicleRepository.create({
      ...data,
      ownerId: user.id,
      status: AUCTION_STATUS.ACTIVA,
    });

    const [hydrated] = await this.vehicleRepository.hydrate([vehicle]);

    return toPublicVehicle(hydrated, { currentUserId: user.id });
  }
}

/**
 * Caso de uso: editar un vehiculo. Solo el propietario puede editarlo.
 */
export class UpdateVehicleUseCase {
  constructor({ vehicleRepository }) {
    this.vehicleRepository = vehicleRepository;
  }

  async execute({ vehicleId, payload, currentUser }) {
    const user = requireAuthenticatedUser(currentUser, 'Debes iniciar sesion para editar un vehiculo.');
    const id = validateNumericId(vehicleId, 'vehicleId');
    const data = validateVehicleInput(payload);

    const existing = await this.vehicleRepository.findById(id);
    if (!existing) {
      throw notFound('El vehiculo solicitado no existe.');
    }
    if (String(existing.ownerId) !== String(user.id)) {
      throw forbidden('Solo puedes editar los vehiculos que tu mismo publicaste.');
    }

    const vehicle = await this.vehicleRepository.update(id, data);
    const [hydrated] = await this.vehicleRepository.hydrate([vehicle]);

    return toPublicVehicle(hydrated, { currentUserId: user.id });
  }
}

/**
 * Caso de uso: listar las publicaciones del usuario autenticado.
 */
export class ListMyVehiclesUseCase {
  constructor({ vehicleRepository }) {
    this.vehicleRepository = vehicleRepository;
  }

  async execute(currentUser) {
    const user = requireAuthenticatedUser(currentUser, 'Debes iniciar sesion para ver tus publicaciones.');
    await this.vehicleRepository.closeExpiredAuctions();
    const vehicles = await this.vehicleRepository.findByOwner(user.id);
    const hydrated = await this.vehicleRepository.hydrate(vehicles);
    return {
      vehicles: hydrated.map((vehicle) => toPublicVehicle(vehicle, { currentUserId: user.id })),
      total: hydrated.length,
    };
  }
}
