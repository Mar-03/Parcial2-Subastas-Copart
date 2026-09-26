import { VehicleRepository } from '@/domain/ports/vehicle-repository.port';
import { mapBidRow } from '@/domain/entities/bid.entity';
import { Vehicle } from '@/domain/entities/vehicle.entity';
import firebaseDb from '@/infrastructure/database/firebase-admin';
import { compact, nextId, toIsoString, toSortedArray } from '@/infrastructure/database/firebase-utils';

const { dbRef } = firebaseDb;

const CACHE_TTL_MS = 3000;
const SWEEP_THROTTLE_MS = 30000;

let vehiclesCache = { at: 0, value: null };
let lastSweepAt = 0;

/** Extrae la galeria anidada `vehicles/{id}/images` a un array de URLs. */
function extractImages(raw) {
  const images = toSortedArray(raw.images);
  if (images.length === 0) return [];
  return images
    .map((image) => image.imageUrl)
    .filter((url) => typeof url === 'string' && url.trim().length > 0);
}

/** Convierte el snapshot de `vehicles/{id}` en la entidad Vehicle. */
function toVehicle(raw) {
  if (!raw) return null;
  return new Vehicle({
    id: Number(raw.id),
    ownerId: raw.ownerId === null || raw.ownerId === undefined ? null : Number(raw.ownerId),
    year: Number(raw.year),
    itemType: raw.itemType,
    brand: raw.brand,
    model: raw.model,
    engine: raw.engine,
    transmission: raw.transmission,
    fuel: raw.fuel,
    drivetrain: raw.drivetrain,
    cylinders: Number(raw.cylinders),
    damageLevel: raw.damageLevel,
    basePrice: Number(raw.basePrice),
    currentBid: Number(raw.currentBid) || 0,
    highestBidderId:
      raw.highestBidderId === null || raw.highestBidderId === undefined
        ? null
        : Number(raw.highestBidderId),
    startTime: raw.startTime,
    endTime: raw.endTime,
    status: raw.status,
    createdAt: raw.createdAt,
    images: extractImages(raw),
  });
}

/** Aplica los filtros multi-area en memoria (se combinan entre si). */
function matchesFilters(vehicle, filters) {
  const years = filters.years || [];
  if (years.length > 0 && !years.map(Number).includes(Number(vehicle.year))) return false;

  const brands = filters.brands || [];
  if (brands.length > 0 && !brands.some((item) => String(item).toLowerCase() === String(vehicle.brand).toLowerCase())) {
    return false;
  }

  const models = filters.models || [];
  if (models.length > 0 && !models.some((item) => String(item).toLowerCase() === String(vehicle.model).toLowerCase())) {
    return false;
  }

  const fuels = filters.fuels || [];
  if (fuels.length > 0 && !fuels.some((item) => String(item).toLowerCase() === String(vehicle.fuel).toLowerCase())) {
    return false;
  }

  const damageLevels = filters.damageLevels || [];
  if (damageLevels.length > 0 && !damageLevels.map((item) => String(item).toUpperCase()).includes(String(vehicle.damageLevel).toUpperCase())) {
    return false;
  }

  const itemTypes = filters.itemTypes || [];
  if (itemTypes.length > 0 && !itemTypes.some((item) => String(item).toLowerCase() === String(vehicle.itemType).toLowerCase())) {
    return false;
  }

  const transmissions = filters.transmissions || [];
  if (transmissions.length > 0 && !transmissions.some((item) => String(item).toLowerCase() === String(vehicle.transmission).toLowerCase())) {
    return false;
  }

  const drivetrains = filters.drivetrains || [];
  if (drivetrains.length > 0 && !drivetrains.map((item) => String(item).toUpperCase()).includes(String(vehicle.drivetrain).toUpperCase())) {
    return false;
  }

  if (filters.status && String(vehicle.status).toUpperCase() !== String(filters.status).toUpperCase()) {
    return false;
  }

  if (filters.search) {
    const term = String(filters.search).toLowerCase();
    const haystack = [vehicle.brand, vehicle.model, vehicle.itemType, vehicle.engine, vehicle.fuel]
      .join(' ')
      .toLowerCase();
    if (!haystack.includes(term)) return false;
  }

  return true;
}

const SORTERS = {
  'created_at DESC': (a, b) => String(b.createdAt).localeCompare(String(a.createdAt)),
  'created_at ASC': (a, b) => String(a.createdAt).localeCompare(String(b.createdAt)),
  'end_time ASC': (a, b) => new Date(a.endTime) - new Date(b.endTime),
  'end_time DESC': (a, b) => new Date(b.endTime) - new Date(a.endTime),
  'current_bid DESC': (a, b) => Number(b.currentBid) - Number(a.currentBid),
  'base_price ASC': (a, b) => Number(a.basePrice) - Number(b.basePrice),
  'base_price DESC': (a, b) => Number(b.basePrice) - Number(a.basePrice),
};

/**
 * Adaptador de Firebase Realtime Database del puerto VehicleRepository.
 *
 * Estructura:
 *   vehicles/{vehicleId}/{ id, ownerId, year, ..., status, createdAt, images/{imageId} }
 *   bids/{vehicleId}/{bidId}/{ id, vehicleId, userId, amount, createdAt }
 */
export class FirebaseVehicleRepository extends VehicleRepository {
  constructor() {
    super();
    this.db = firebaseDb;
  }

  invalidateCache() {
    vehiclesCache = { at: 0, value: null };
  }

  /** Snapshot de todos los vehiculos con cache corta (evita lecturas repetidas). */
  async readAllVehicles({ force = false } = {}) {
    if (!force && vehiclesCache.value && Date.now() - vehiclesCache.at < CACHE_TTL_MS) {
      return vehiclesCache.value;
    }
    const snapshot = await dbRef('vehicles').once('value');
    const value = toSortedArray(snapshot.val()).map(toVehicle).filter(Boolean);
    vehiclesCache = { at: Date.now(), value };
    return value;
  }

  async list(filters = {}) {
    const all = await this.readAllVehicles();
    const orderBy = SORTERS[filters.orderBy] || SORTERS['created_at DESC'];
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.min(60, Math.max(1, filters.pageSize || 12));

    const filtered = all.filter((vehicle) => matchesFilters(vehicle, filters));
    filtered.sort(orderBy);

    const offset = (page - 1) * pageSize;
    const vehicles = filtered.slice(offset, offset + pageSize);

    return { vehicles, total: filtered.length, page, pageSize };
  }

  async findById(id) {
    if (id === null || id === undefined || id === '') return null;
    const snapshot = await dbRef(`vehicles/${id}`).once('value');
    return toVehicle(snapshot.val());
  }

  async create(data) {
    const id = await nextId('_counters/vehicles');
    const images = Array.isArray(data.images) ? data.images : [];

    // IMPORTANTE: se escribe con un unico `set()` incluyendo la galeria anidada.
    // Un `update()` multi-ruta que mezcla `vehicles/{id}` con
    // `vehicles/{id}/images/{n}` falla: Firebase rechaza rutas solapadas
    // ("... is ancestor of another path"). Ademas se eliminan los `undefined`,
    // que Realtime Database tambien rechaza.
    const gallery = {};
    images.forEach((imageUrl, index) => {
      const imageId = index + 1;
      gallery[imageId] = { id: imageId, imageUrl: String(imageUrl), sortOrder: index };
    });

    const record = compact({
      id,
      ownerId: Number(data.ownerId),
      year: Number(data.year),
      itemType: data.itemType,
      brand: data.brand,
      model: data.model,
      engine: data.engine,
      transmission: data.transmission,
      fuel: data.fuel,
      drivetrain: data.drivetrain,
      cylinders: Number(data.cylinders),
      damageLevel: data.damageLevel,
      basePrice: Number(data.basePrice),
      currentBid: 0,
      highestBidderId: null,
      // Las fechas llegan como Date desde el validador: Firebase guarda ISO string.
      startTime: toIsoString(data.startTime),
      endTime: toIsoString(data.endTime),
      status: data.status || 'ACTIVA',
      createdAt: new Date().toISOString(),
      images: gallery,
    });

    await dbRef(`vehicles/${id}`).set(record);
    this.invalidateCache();

    return new Vehicle({ ...record, images });
  }

  async update(id, data) {
    const patch = compact({
      year: Number(data.year),
      itemType: data.itemType,
      brand: data.brand,
      model: data.model,
      engine: data.engine,
      transmission: data.transmission,
      fuel: data.fuel,
      drivetrain: data.drivetrain,
      cylinders: Number(data.cylinders),
      damageLevel: data.damageLevel,
      basePrice: Number(data.basePrice),
      // Las fechas llegan como Date desde el validador.
      startTime: toIsoString(data.startTime),
      endTime: toIsoString(data.endTime),
    });

    await dbRef(`vehicles/${id}`).update(patch);

    const images = Array.isArray(data.images) ? data.images : [];
    if (images.length > 0) {
      await this.replaceImages(id, images);
    }
    this.invalidateCache();

    return this.findById(id);
  }

  /**
   * Reemplaza la galeria anidada de un vehiculo conservando el orden.
   * Un solo `set()` sobre el nodo `images`: mezclar el nodo padre con sus
   * hijos en un `update()` multi-ruta es rechazado por Firebase.
   */
  async replaceImages(vehicleId, images) {
    const gallery = {};
    images.forEach((imageUrl, index) => {
      const imageId = index + 1;
      gallery[imageId] = { id: imageId, imageUrl: String(imageUrl), sortOrder: index };
    });

    if (Object.keys(gallery).length === 0) {
      await dbRef(`vehicles/${vehicleId}/images`).remove();
    } else {
      await dbRef(`vehicles/${vehicleId}/images`).set(gallery);
    }
    this.invalidateCache();
  }

  async findByOwner(ownerId) {
    // Consulta indexada nativa de Firebase (orderByChild + equalTo).
    const snapshot = await dbRef('vehicles').orderByChild('ownerId').equalTo(Number(ownerId)).once('value');
    return toSortedArray(snapshot.val())
      .map(toVehicle)
      .filter(Boolean)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }

  async getImages(vehicleId) {
    const snapshot = await dbRef(`vehicles/${vehicleId}/images`).once('value');
    return toSortedArray(snapshot.val())
      .map((image) => image.imageUrl)
      .filter(Boolean);
  }

  async getBids(vehicleId) {
    const snapshot = await dbRef(`bids/${vehicleId}`).once('value');
    return toSortedArray(snapshot.val())
      .map(mapBidRow)
      .filter(Boolean)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  /**
   * Carga el historial de pujas de varios vehiculos en paralelo.
   * Las imagenes ya vienen anidadas en cada snapshot de vehiculo.
   */
  async hydrate(vehicles) {
    const list = Array.isArray(vehicles) ? vehicles.filter(Boolean) : [];
    if (list.length === 0) return [];

    return Promise.all(
      list.map(async (vehicle) => {
        const snapshot = await dbRef(`bids/${vehicle.id}`).once('value');
        vehicle.bids = toSortedArray(snapshot.val())
          .map(mapBidRow)
          .filter(Boolean)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        if (!Array.isArray(vehicle.images)) vehicle.images = [];
        return vehicle;
      }),
    );
  }

  /** Opciones disponibles para los filtros del catalogo. */
  async getFacets() {
    const all = await this.readAllVehicles();
    const facets = { years: [], brands: [], models: [], fuels: [], damageLevels: [] };

    all.forEach((vehicle) => {
      if (!facets.years.includes(vehicle.year)) facets.years.push(vehicle.year);
      if (vehicle.brand && !facets.brands.includes(vehicle.brand)) facets.brands.push(vehicle.brand);
      if (vehicle.model && !facets.models.includes(vehicle.model)) facets.models.push(vehicle.model);
      if (vehicle.fuel && !facets.fuels.includes(vehicle.fuel)) facets.fuels.push(vehicle.fuel);
      const damage = String(vehicle.damageLevel).toUpperCase();
      if (damage && !facets.damageLevels.includes(damage)) facets.damageLevels.push(damage);
    });

    const byName = (a, b) => String(a).localeCompare(String(b), 'es');
    facets.years.sort((a, b) => b - a);
    facets.brands.sort(byName);
    facets.models.sort(byName);
    facets.fuels.sort(byName);
    facets.damageLevels.sort(byName);

    return facets;
  }

  /**
   * Cierra subastas vencidas: VENDIDA si hubo pujas, DESIERTA si no.
   * `currentBid > 0` solo ocurre tras una puja valida, asi que es la fuente de
   * verdad sin necesidad de consultar el historial completo de pujas.
   */
  async closeExpiredAuctions(now = new Date()) {
    if (Date.now() - lastSweepAt < SWEEP_THROTTLE_MS) return 0;
    lastSweepAt = Date.now();

    const all = await this.readAllVehicles({ force: true });
    const nowMs = now.getTime();
    const payload = {};
    let closed = 0;

    all.forEach((vehicle) => {
      if (String(vehicle.status).toUpperCase() !== 'ACTIVA') return;
      const end = new Date(vehicle.endTime).getTime();
      if (!Number.isFinite(end) || end >= nowMs) return;
      payload[`vehicles/${vehicle.id}/status`] = Number(vehicle.currentBid) > 0 ? 'VENDIDA' : 'DESIERTA';
      closed += 1;
    });

    if (closed > 0) {
      await dbRef('').update(payload);
      this.invalidateCache();
    }

    return closed;
  }
}

export function createFirebaseVehicleRepository() {
  return new FirebaseVehicleRepository();
}
