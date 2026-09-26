import { getDamageLevel } from '@/domain/entities/damage-level';

/**
 * Badge visual del nivel de daño.
 *   VERDE   -> daño menor / limpio
 *   AMARILLO -> daño medio / reparable
 *   ROJO    -> daño severo / salvamento
 */
export default function DamageBadge({ level, short = false, className = '' }) {
  const info = getDamageLevel(level);
  if (!info) {
    return <span className={`badge badge-neutral ${className}`}>Sin dato</span>;
  }
  return (
    <span className={`badge ${info.cssClass} ${className}`} title={info.description}>
      {info.value}
      {short ? '' : ` - ${info.shortLabel}`}
    </span>
  );
}
