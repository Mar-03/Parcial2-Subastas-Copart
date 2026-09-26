/**
 * Estados posibles de una subasta.
 *
 * ACTIVA   -> la subasta esta en curso (o todavia no ha iniciado).
 * VENDIDA  -> la subasta termino y hubo al menos una puja valida.
 * DESIERTA -> la|subasta termino sin ninguna puja valida.
 */
export const AUCTION_STATUS = {
  ACTIVA: 'ACTIVA',
  VENDIDA: 'VENDIDA',
  DESIERTA: 'DESIERTA',
};

export const AUCTION_STATUS_VALUES = Object.values(AUCTION_STATUS);

/** Trenes de manejo soportados por el formulario de publicacion. */
export const DRIVETRAINS = ['AWD', 'FWD', 'RWD', '4WD'];

/** Tipos de articulo mas usados en subastas de vehiculos. */
export const ITEM_TYPES = [
  'Automovil',
  'Camioneta',
  'Motocicleta',
  'Camion',
  'Van',
  'SUV',
  'Pick Up',
  'Todoterreno',
];

/** Combustibles mas usados en el inventario. */
export const FUEL_TYPES = ['Gasolina', 'Diesel', 'Hibrido', 'Electrico', 'Flex', 'H2'];

/** Transmisiones mas usadas en el inventario. */
export const TRANSMISSIONS = ['Manual', 'Automatica'];

/** Motores mas usados en el inventario. */
export const ENGINES = [
  '1.5L I4',
  '1.8L I4',
  '2.0L I4',
  '2.5L I4',
  '3.0L V6',
  '3.5L V6',
  '4.0L V8',
  '5.0L V8',
  '6.2L V8',
  'Electrico',
  'Hibrido 2.5L',
];

export function isValidDrivetrain(value) {
  return typeof value === 'string' && DRIVETRAINS.includes(value.toUpperCase());
}

export function isValidAuctionStatus(value) {
  return typeof value === 'string' && AUCTION_STATUS_VALUES.includes(value.toUpperCase());
}

/**
 * Calcula el estado efectivo de una subasta tomando en cuenta la hora actual.
 * Se usa en la capa de lectura para que la interfaz jamas muestre una subasta
 * activa aunque el barrido en base de datos todavia no se haya ejecutado.
 */
export function resolveEffectiveStatus(status, endTime, now = new Date()) {
  const current = isValidAuctionStatus(status) ? String(status).toUpperCase() : AUCTION_STATUS.ACTIVA;
  if (current !== AUCTION_STATUS.ACTIVA) return current;
  const end = endTime ? new Date(endTime).getTime() : null;
  if (end && Number.isFinite(end) && now.getTime() >= end) {
    // El desempate (VENDIDA vs DESIERTA) lo confirma el barrido en SQL,
    // aqui solo se marca como finalizada.
    return AUCTION_STATUS.VENDIDA;
  }
  return AUCTION_STATUS.ACTIVA;
}

/** Indica si la subasta ya paso su fecha de cierre. */
export function hasAuctionEnded(endTime, now = new Date()) {
  const end = endTime ? new Date(endTime).getTime() : null;
  if (!end || !Number.isFinite(end)) return false;
  return now.getTime() >= end;
}
