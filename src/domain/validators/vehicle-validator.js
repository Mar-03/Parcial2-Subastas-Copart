import { validationError } from '../errors/domain-error';
import { DAMAGE_LEVEL_VALUES } from '../entities/damage-level';
import {
  AUCTION_STATUS_VALUES,
  DRIVETRAINS,
  ENGINES,
  FUEL_TYPES,
  ITEM_TYPES,
  TRANSMISSIONS,
} from '../entities/auction-status';
import { cleanText, isValidImageUrl, normalizeKey, toDate, toInteger, toNumber } from './common-validator';

/** Regla de la rubrica: minimo 5 imagenes por vehiculo. */
export const MIN_IMAGES = 5;

const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 1900;
const MAX_YEAR = CURRENT_YEAR + 2;

/**
 * Valida y normaliza los datos de un vehiculo (creacion y edicion).
 * @param {object} payload
 * @returns {object} datos normalizados listos para persistir
 */
export function validateVehicleInput(payload = {}) {
  const errors = {};

  const year = toInteger(payload.year);
  const itemType = cleanText(payload.itemType ?? payload.item_type);
  const brand = cleanText(payload.brand ?? payload.marca);
  const model = cleanText(payload.model ?? payload.modelo);
  const engine = cleanText(payload.engine ?? payload.motor);
  const transmission = cleanText(payload.transmission ?? payload.transmision);
  const fuel = cleanText(payload.fuel ?? payload.combustible);
  const drivetrain = cleanText(payload.drivetrain ?? payload.trenDeManejo).toUpperCase();
  const cylinders = toInteger(payload.cylinders ?? payload.cilindros);
  const damageLevel = cleanText(payload.damageLevel ?? payload.damage_level ?? payload.nivelDeDano).toUpperCase();
  const basePrice = toNumber(payload.basePrice ?? payload.base_price ?? payload.montoBase);
  const startTime = toDate(payload.startTime ?? payload.start_time);
  const endTime = toDate(payload.endTime ?? payload.end_time);
  const status = cleanText(payload.status ?? payload.estado).toUpperCase() || AUCTION_STATUS_VALUES[0];
  const images = normalizeImages(payload.images ?? payload.imageUrls ?? payload.imagenes);

  if (!Number.isFinite(year) || year < MIN_YEAR || year > MAX_YEAR) {
    errors.year = `El anio debe estar entre ${MIN_YEAR} y ${MAX_YEAR}.`;
  }
  if (!itemType) errors.itemType = 'El tipo de articulo es obligatorio.';
  else if (itemType.length > 60) errors.itemType = 'El tipo de articulo es demasiado largo.';
  if (!brand) errors.brand = 'La marca es obligatoria.';
  else if (brand.length > 60) errors.brand = 'La marca es demasiado larga.';
  if (!model) errors.model = 'El modelo es obligatorio.';
  else if (model.length > 60) errors.model = 'El modelo es demasiado largo.';

  const engineOk = ENGINES.some((item) => normalizeKey(item) === normalizeKey(engine)) || (engine.length > 0 && engine.length <= 40);
  if (!engine) errors.engine = 'El motor es obligatorio.';
  else if (!engineOk) errors.engine = 'El motor no es valido.';

  const transmissionOk = TRANSMISSIONS.some((item) => normalizeKey(item) === normalizeKey(transmission));
  if (!transmission) errors.transmission = 'La transmision es obligatoria.';
  else if (!transmissionOk) errors.transmission = 'La transmision debe ser Manual o Automatica.';

  const fuelOk = FUEL_TYPES.some((item) => normalizeKey(item) === normalizeKey(fuel));
  if (!fuel) errors.fuel = 'El combustible es obligatorio.';
  else if (!fuelOk) errors.fuel = 'El combustible no es valido.';

  if (!DRIVETRAINS.includes(drivetrain)) {
    errors.drivetrain = 'El tren de manejo debe ser AWD, FWD, RWD o 4WD.';
  }

  if (!Number.isFinite(cylinders) || cylinders < 1 || cylinders > 24) {
    errors.cylinders = 'El numero de cilindros debe estar entre 1 y 24.';
  }

  if (!DAMAGE_LEVEL_VALUES.includes(damageLevel)) {
    errors.damageLevel = 'El nivel de dano debe ser VERDE, AMARILLO o ROJO.';
  }

  if (!Number.isFinite(basePrice) || basePrice <= 0) {
    errors.basePrice = 'El monto base debe ser mayor que 0.';
  } else if (basePrice > 100000000) {
    errors.basePrice = 'El monto base es demasiado alto.';
  }

  if (!startTime) errors.startTime = 'La fecha y hora de inicio es obligatoria.';
  if (!endTime) errors.endTime = 'La fecha y hora de cierre es obligatoria.';
  if (startTime && endTime && endTime.getTime() <= startTime.getTime()) {
    errors.endTime = 'La fecha de cierre debe ser posterior a la fecha de inicio.';
  }

  if (images.length < MIN_IMAGES) {
    errors.images = `Debes ingresar al menos ${MIN_IMAGES} imagenes del vehiculo.`;
  }

  if (!AUCTION_STATUS_VALUES.includes(status)) {
    errors.status = 'El estado de la subasta no es valido.';
  }

  if (Object.keys(errors).length > 0) {
    throw validationError('Revisa los datos del vehiculo antes de publicar.', errors);
  }

  return {
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
    basePrice: Math.round((basePrice + Number.EPSILON) * 100) / 100,
    startTime,
    endTime,
    status,
    images,
  };
}

/**
 * Normaliza la lista de imagenes: acepta array de strings, array de objetos
 * { imageUrl } o texto separado por saltos de linea/comas.
 */
export function normalizeImages(input) {
  let list = input;

  if (typeof list === 'string') {
    list = list.split(/[\n,]+/);
  }
  if (!Array.isArray(list)) {
    list = list === undefined || list === null ? [] : [list];
  }

  const cleaned = list
    .map((item) => {
      if (typeof item === 'string') return cleanText(item);
      if (item && typeof item === 'object') return cleanText(item.imageUrl ?? item.image_url ?? item.url);
      return '';
    })
    .filter(Boolean)
    .filter(isValidImageUrl);

  // Se eliminan duplicados conservando el orden original.
  return Array.from(new Set(cleaned));
}
