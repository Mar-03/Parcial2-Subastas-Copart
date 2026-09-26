'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import Alert from '@/components/alert';
import DamageBadge from '@/components/damage-badge';
import StatusBadge from '@/components/status-badge';
import { apiFetch } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-provider';
import { formatDateTime, formatMoney } from '@/lib/format';
import { handleImageError, safeImageSrc } from '@/lib/image';

/**
 * Tabla con los vehículos publicados por el usuario autenticado
 * (GET /api/my-vehicles). Muestra estado, oferta actual y fecha de cierre.
 */
export default function MyVehiclesSection() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const response = await apiFetch('/api/my-vehicles');
      setVehicles(response.vehicles || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar tus publicaciones.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Respaldo periodico: el detalle ya se actualiza con Socket.IO.
    const timer = setInterval(load, 20000);
    return () => clearInterval(timer);
  }, [load]);

  return (
    <div className="container section">
      <div className="section-head">
        <div>
          <h2>Mis publicaciones</h2>
          <p>
            vehículos publicados por {user?.fullName || 'tu cuenta'}. Solo tu puedes ver esta lista y
            administrar tus unidades.
          </p>
        </div>
        <Link href="/publicar" className="btn btn-primary">
          Publicar otro Vehículo
        </Link>
      </div>

      {error ? <Alert type="error" message={error} /> : null}

      {loading ? (
        <div className="table-wrap">
          <div className="skeleton" style={{ height: 220, margin: 16 }} />
        </div>
      ) : vehicles.length === 0 ? (
        <div className="card card-pad empty-state">
          <h3>Todavia no has publicado ningun Vehículo</h3>
          <p>
            Publica tu primer Vehículo en subasta para recibir ofertas en tiempo real de los
            participantes registrados.
          </p>
          <Link href="/publicar" className="btn btn-primary">
            Publicar Vehículo
          </Link>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Foto</th>
                <th>Vehículo</th>
                <th>daño</th>
                <th>Monto base</th>
                <th>Oferta actual</th>
                <th>Estado</th>
                <th>Cierre</th>
                <th>Accion</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((vehicle) => (
                <tr key={vehicle.id}>
                  <td>
                    <img
                      className="table-thumb"
                      src={safeImageSrc(vehicle.images?.[0], vehicle.id)}
                      alt={`${vehicle.brand} ${vehicle.model}`}
                      onError={handleImageError}
                    />
                  </td>
                  <td>
                    <strong>
                      {vehicle.brand} {vehicle.model}
                    </strong>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      {vehicle.year} - {vehicle.itemType} - {vehicle.fuel}
                    </div>
                  </td>
                  <td>
                    <DamageBadge level={vehicle.damageLevel} short />
                  </td>
                  <td>{formatMoney(vehicle.basePrice)}</td>
                  <td>
                    <strong>
                      {Number(vehicle.currentBid) > 0
                        ? formatMoney(vehicle.currentBid)
                        : 'Sin ofertas'}
                    </strong>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                      {vehicle.bids?.length || 0} oferta(s)
                    </div>
                  </td>
                  <td>
                    <StatusBadge
                      status={vehicle.status}
                      live={vehicle.status === 'ACTIVA' && vehicle.hasStarted}
                    />
                  </td>
                  <td>{formatDateTime(vehicle.endTime)}</td>
                  <td>
                    <Link href={`/vehículos/${vehicle.id}`} className="btn btn-secondary btn-sm">
                      Ver subasta
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
