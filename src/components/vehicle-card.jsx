import Link from 'next/link';
import DamageBadge from '@/components/damage-badge';
import StatusBadge from '@/components/status-badge';
import { formatDateTime, formatMoney } from '@/lib/format';
import { handleImageError, safeImageSrc } from '@/lib/image';

/**
 * Tarjeta de Vehículo del catalogo: imagen, año, marca, modelo, nivel de daño,
 * monto base, oferta actual, fecha de cierre y boton "Ver subasta".
 */
export default function VehicleCard({ vehicle }) {
  if (!vehicle) return null;

  const image = safeImageSrc(vehicle.images?.[0], vehicle.id);
  const hasBids = Number(vehicle.currentBid) > 0;
  const live = vehicle.status === 'ACTIVA' && vehicle.hasStarted;

  return (
    <article className="vehicle-card">
      <div className="vehicle-card-media">
        <img
          src={image}
          alt={`${vehicle.brand} ${vehicle.model} ${vehicle.year}`}
          loading="lazy"
          onError={handleImageError}
        />
        <div className="vehicle-card-badges">
          <DamageBadge level={vehicle.damageLevel} short />
          <StatusBadge status={vehicle.status} live={live} />
        </div>
      </div>

      <div className="vehicle-card-body">
        <div>
          <h3 className="vehicle-card-title">
            {vehicle.brand} {vehicle.model}
          </h3>
          <p className="vehicle-card-subtitle">
            {vehicle.year} - {vehicle.itemType} - {vehicle.fuel} - {vehicle.drivetrain}
          </p>
        </div>

        <div className="vehicle-card-prices">
          <div className="price-block">
            <span>Monto base</span>
            <strong>{formatMoney(vehicle.basePrice)}</strong>
          </div>
          <div className="price-block current">
            <span>Oferta actual</span>
            <strong>{hasBids ? formatMoney(vehicle.currentBid) : 'Sin ofertas'}</strong>
          </div>
        </div>

        <div className="vehicle-card-footer">
          <span className="vehicle-card-closing">
            Cierre: {formatDateTime(vehicle.endTime)}
          </span>
          <Link href={`/vehículos/${vehicle.id}`} className="btn btn-primary btn-sm">
            Ver subasta
          </Link>
        </div>
      </div>
    </article>
  );
}
