const { dbRef } = require('./firebase-admin');

/**
 * Utilidades compartidas por los repositorios de Firebase Realtime Database.
 * (CommonJS para poder usarlas tambien desde los scripts de consola.)
 */

/**
 * Genera un id entero correlativo usando una transaccion sobre un contador.
 * Mantiene el tipo `id` numerico que ya usan el dominio y los validadores.
 */
async function nextId(counterPath) {
  const result = await dbRef(counterPath).transaction((current) => (Number(current) || 0) + 1);
  const value = result.snapshot.val();
  return Number(value);
}

// Caracteres que Firebase NO permite en las keys.
const FORBIDDEN_KEY_CHARS = new Set(['.', '#', '$', '[', ']', '/']);

/**
 * Normaliza un correo para usarlo como key de Firebase.
 * Ejemplo:  usuario1@demo.com  ->  usuario1%40demo%2Ecom
 * El escape es reversible y nunca colisiona con otro correo.
 */
function emailKey(email) {
  const value = String(email || '')
    .trim()
    .toLowerCase();

  let key = '';
  for (const char of value) {
    if (char === '%') key += '%25';
    else if (FORBIDDEN_KEY_CHARS.has(char)) {
      key += `%${char.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}`;
    } else key += char;
  }
  return key;
}

/** Convierte un objeto de Firebase en un array, ordenandolo por el id numerico. */
function toSortedArray(snapshotValue) {
  if (!snapshotValue || typeof snapshotValue !== 'object') return [];
  return Object.keys(snapshotValue)
    .map((key) => snapshotValue[key])
    .filter(Boolean)
    .sort((a, b) => Number(a.id) - Number(b.id));
}

/** Normaliza una fecha de Firebase (ISO string o timestamp) a Date. */
function toIsoString(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'number') return new Date(value).toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/**
 * Elimina las propiedades cuyo valor es `undefined`.
 * Realtime Database RECHAZA `undefined` en cualquier escritura
 * ("value argument contains undefined in property ..."), por eso todo lo que
 * se persiste pasa primero por aqui. `null` si se conserva (es un valor valido).
 */
function compact(source) {
  const result = {};
  Object.keys(source || {}).forEach((key) => {
    if (source[key] !== undefined) result[key] = source[key];
  });
  return result;
}

module.exports = {
  nextId,
  emailKey,
  toSortedArray,
  toIsoString,
  compact,
};
