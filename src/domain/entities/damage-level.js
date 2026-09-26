/**
 * Niveles de dano permitidos (badges de la plataforma).
 */
export const DAMAGE_LEVELS = {
  VERDE: {
    value: 'VERDE',
    label: 'Dano menor / Limpio',
    shortLabel: 'Dano menor',
    description: 'Vehiculo practicamente intacto, listo para rodar.',
    cssClass: 'badge-damage-verde',
  },
  AMARILLO: {
    value: 'AMARILLO',
    label: 'Dano medio / Reparable',
    shortLabel: 'Dano medio',
    description: 'Presenta danos que pueden repararse, unidad rodable.',
    cssClass: 'badge-damage-amarillo',
  },
  ROJO: {
    value: 'ROJO',
    label: 'Dano severo / Salvamento',
    shortLabel: 'Dano severo',
    description: 'Danos severos, vehiculo de salvamento.',
    cssClass: 'badge-damage-rojo',
  },
};

export const DAMAGE_LEVEL_VALUES = Object.keys(DAMAGE_LEVELS);

export function isValidDamageLevel(value) {
  return typeof value === 'string' && DAMAGE_LEVEL_VALUES.includes(value.toUpperCase());
}

export function getDamageLevel(value) {
  if (!isValidDamageLevel(value)) return null;
  return DAMAGE_LEVELS[String(value).toUpperCase()];
}
