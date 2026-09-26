const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

/** Normaliza texto: recorta espacios y colapsa espacios internos. */
export function cleanText(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\s+/g, ' ').trim();
}

/** Quita acentos y pasa a mayusculas (normaliza claves de catalogos). */
export function normalizeKey(value) {
  return cleanText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

export function isValidEmail(email) {
  return EMAIL_REGEX.test(cleanText(email));
}

/**
 * Valida una referencia de imagen.
 *
 * Se aceptan:
 *   - URLs http/https
 *   - Rutas relativas (por ejemplo /uploads/x.jpg)
 *   - Data URLs de imagen (`data:image/jpeg;base64,...`), que es como se
 *     guardan las fotografias subidas desde la computadora: el navegador las
 *     redimensiona y comprime, y Realtime Database almacena el Data URL.
 *     Sin Firebase Storage.
 */
export function isValidImageUrl(url) {
  const value = cleanText(url);
  if (!value) return false;

  // Imagen local convertida a Data URL (base64). Limite alto: ~1.5 MB por foto.
  if (/^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(value)) {
    return value.length <= 1500000;
  }

  if (value.length > 2048) return false;
  if (value.startsWith('/')) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Convierte cualquier entrada a numero, o NaN. */
export function toNumber(value) {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return NaN;
  return Number(value.trim().replace(/,/g, ''));
}

/** Convierte a entero, o NaN. */
export function toInteger(value) {
  const number = toNumber(value);
  if (!Number.isFinite(number)) return NaN;
  return Math.trunc(number);
}

/** Convierte a Date valida, o null. */
export function toDate(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') {
    const fromNumber = new Date(value);
    return Number.isNaN(fromNumber.getTime()) ? null : fromNumber;
  }
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
