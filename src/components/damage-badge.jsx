import { getDamageLevel } from '@/domain/entities/damage-level';

/**
 * Badge visual del nivel de dano.
 *   VERDE   -> dano menor / limpio
 *   AMARILLO -> dano medio / reparable
 *   ROJO    -> dano severo / salvamento
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
