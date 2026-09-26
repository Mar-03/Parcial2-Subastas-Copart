/**
 * Formato de moneda y fechas para la interfaz (es-GT, quetzales).
 * Es una utilidad de presentacion: la usan componentes, no los casos de uso
 * de negocio (que solo dependen de `formatMoney` de este mismo archivo para
 * construir el mensaje "La oferta minima permitida es Q X").
 */

const NUMBER_FORMAT = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Q 25,000.00 */
export function formatMoney(value) {
  const number = Number(value);
  const safe = Number.isFinite(number) ? number : 0;
  return `Q ${NUMBER_FORMAT.format(safe)}`;
}

/** Q 25,000 (sin decimales, para montos grandes en tarjetas). */
export function formatMoneyShort(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 'Q 0';
  return `Q ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(number)}`;
}

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('es-GT', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});

const DATE_FORMAT = new Intl.DateTimeFormat('es-GT', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const TIME_FORMAT = new Intl.DateTimeFormat('es-GT', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
});

export function formatDateTime(value) {
  const date = toDate(value);
  return date ? DATE_TIME_FORMAT.format(date) : '-';
}

export function formatDate(value) {
  const date = toDate(value);
  return date ? DATE_FORMAT.format(date) : '-';
}

export function formatTime(value) {
  const date = toDate(value);
  return date ? TIME_FORMAT.format(date) : '-';
}

export function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Convierte a DD:HH:MM:SS los milisegundos restantes. */
export function formatCountdown(milliseconds) {
  const total = Math.max(0, Math.floor(Number(milliseconds) / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (value) => String(value).padStart(2, '0');
  return {
    days: pad(days),
    hours: pad(hours),
    minutes: pad(minutes),
    seconds: pad(seconds),
    text: `${pad(days)}:${pad(hours)}:${pad(minutes)}:${pad(seconds)}`,
  };
}

/** Valor para <input type="datetime-local"> a partir de un ISO string. */
export function toDateTimeLocalValue(value) {
  const date = toDate(value);
  if (!date) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Traduce estados de subasta a textos para la interfaz. */
export function auctionStatusLabel(status) {
  switch (String(status || '').toUpperCase()) {
    case 'VENDIDA':
      return 'SUBASTA FINALIZADA - VENDIDA';
    case 'DESIERTA':
      return 'SUBASTA FINALIZADA - NO VENDIDA / DESIERTA';
    case 'ACTIVA':
      return 'EN CURSO';
    default:
      return 'EN CURSO';
  }
}
