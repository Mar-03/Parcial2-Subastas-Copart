'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Alert from '@/components/alert';
import BidHistory from '@/components/bid-history';
import BidPanel from '@/components/bid-panel';
import DamageBadge from '@/components/damage-badge';
import StatusBadge from '@/components/status-badge';
import VehicleGallery from '@/components/vehicle-gallery';
import { apiFetch } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-provider';
import { formatDateTime, formatMoney } from '@/lib/format';
import { joinAuction, leaveAuction, onBidUpdated } from '@/lib/socket-client';

const SPECS = [
  { key: 'year', label: 'año' },
  { key: 'itemType', label: 'Tipo de articulo' },
  { key: 'brand', label: 'Marca' },
  { key: 'model', label: 'Modelo' },
  { key: 'engine', label: 'Motor' },
  { key: 'transmission', label: 'Transmision' },
  { key: 'fuel', label: 'Combustible' },
  { key: 'drivetrain', label: 'Tren de manejo' },
  { key: 'cylinders', label: 'Numero de cilindros' },
];

/**
 * Detalle de la subasta con actualizaciones EN VIVO (Socket.IO).
 *
 * - Entra a la sala `auction-<id>` al montar.
 * - Escucha el evento `bidUpdated` y actualiza oferta actual, minimo siguiente,
 *   historial y estado del usuario (ganando / superado) SIN recargar la pagina.
 */
export default function AuctionDetail({ vehicleId }) {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [wasOutbid, setWasOutbid] = useState(false);
  const [leading, setLeading] = useState(false);
  const reloadTimer = useRef(null);

  // --- Carga inicial -------------------------------------------------------
  const loadVehicle = useCallback(async () => {
    try {
      const response = await apiFetch(`/api/vehicles/${vehicleId}`);
      setVehicle(response.vehicle);
      setLeading(Boolean(response.vehicle.isLeading));
      setError(null);
    } catch (err) {
      setError(err.message || 'No se pudo cargar la subasta.');
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    setLoading(true);
    loadVehicle();
  }, [loadVehicle]);

  // --- Tiempo real ---------------------------------------------------------
  useEffect(() => {
    if (!vehicleId) return undefined;

    joinAuction(vehicleId);

    const unsubscribe = onBidUpdated((payload) => {
      if (!payload || String(payload.vehicleId) !== String(vehicleId)) return;
      applyLiveUpdate(payload);
    });

    return () => {
      unsubscribe();
      leaveAuction(vehicleId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleId, user?.id]);

  const applyLiveUpdate = useCallback(
    (payload) => {
      setVehicle((current) => {
        if (!current) return current;
        const highestBidderId = payload.highestBidderId ?? null;
        const isNowLeading =
          user != null && highestBidderId != null && String(user.id) === String(highestBidderId);

        setLeading(isNowLeading);
        // Si antes ganaba y ya no, se muestra el aviso de oferta superada.
        setWasOutbid((wasLeadingBefore) => {
          if (!wasLeadingBefore) return false;
          return !isNowLeading;
        });

        return {
          ...current,
          currentBid: Number(payload.currentBid ?? current.currentBid),
          minimumBid: Number(payload.minimumBid ?? current.minimumBid),
          highestBidderId,
          endTime: payload.endTime ?? current.endTime,
          status: payload.status ?? current.status,
          hasBids: Number(payload.currentBid ?? 0) > 0,
          ended: current.ended,
          bids: Array.isArray(payload.bids) && payload.bids.length > 0 ? payload.bids : current.bids,
        };
      });
    },
    [user],
  );

  // --- Envio de oferta -----------------------------------------------------
  const placeBid = useCallback(
    async (amount) => {
      const response = await apiFetch(`/api/vehicles/${vehicleId}/bids`, {
        method: 'POST',
        body: { amount },
      });
      // Actualizacion inmediata con la respuesta del backend (no espera al socket).
      if (response.vehicle) {
        setVehicle(response.vehicle);
        setLeading(Boolean(response.vehicle.isLeading));
        setWasOutbid(false);
      }
      return response.bid;
    },
    [vehicleId],
  );

  // --- Al expirar la subasta se consulta el estado final -------------------
  const handleExpire = useCallback(() => {
    if (reloadTimer.current) return;
    // pequeno margen para que el backend cierre la subasta (VENDIDA / DESIERTA)
    reloadTimer.current = setTimeout(async () => {
      reloadTimer.current = null;
      await loadVehicle();
    }, 1200);
  }, [loadVehicle]);

  useEffect(() => () => {
    if (reloadTimer.current) clearTimeout(reloadTimer.current);
  }, []);

  if (loading || authLoading) {
    return (
      <div className="container section">
        <div className="skeleton" style={{ height: 380, marginBottom: 20 }} />
        <div className="detail-layout">
          <div className="skeleton" style={{ height: 300 }} />
          <div className="skeleton" style={{ height: 460 }} />
        </div>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="container section">
        <div className="card card-pad empty-state">
          <h3>No pudimos mostrar esta subasta</h3>
          <p>{error || 'El Vehículo solicitado no existe.'}</p>
          <Link href="/inventario" className="btn btn-primary">
            Volver al inventario
          </Link>
        </div>
      </div>
    );
  }

  const status = String(vehicle.status || 'ACTIVA').toUpperCase();
  const live = status === 'ACTIVA' && vehicle.hasStarted && !vehicle.ended;

  return (
    <div className="container section">
      <div className="breadcrumb">
        <Link href="/">Inicio</Link> / <Link href="/inventario">Inventario</Link> / {vehicle.brand} {vehicle.model}
      </div>

      <div className="detail-layout">
        <div>
          <VehicleGallery
            images={vehicle.images}
            alt={`${vehicle.brand} ${vehicle.model} ${vehicle.year}`}
          />

          <div className="detail-title-row" style={{ marginTop: 20 }}>
            <div>
              <h1>
                {vehicle.brand} {vehicle.model} {vehicle.year}
              </h1>
              <p style={{ margin: '4px 0 0', color: 'var(--color-text-muted)' }}>
                {vehicle.itemType} - {vehicle.engine} - {vehicle.transmission}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <DamageBadge level={vehicle.damageLevel} />
              <StatusBadge status={vehicle.status} live={live} />
            </div>
          </div>

          {vehicle.damageInfo ? (
            <Alert type="info" message={`${vehicle.damageInfo.label}. ${vehicle.damageInfo.description}`} />
          ) : null}

          <div className="spec-grid">
            {SPECS.map((spec) => (
              <div key={spec.key} className="spec-item">
                <span>{spec.label}</span>
                <strong>{vehicle[spec.key] ?? '-'}</strong>
              </div>
            ))}
            <div className="spec-item">
              <span>Nivel de daño</span>
              <strong>{vehicle.damageLevel}</strong>
            </div>
            <div className="spec-item">
              <span>Monto base</span>
              <strong>{formatMoney(vehicle.basePrice)}</strong>
            </div>
            <div className="spec-item">
              <span>Oferta actual</span>
              <strong>{Number(vehicle.currentBid) > 0 ? formatMoney(vehicle.currentBid) : 'Sin ofertas'}</strong>
            </div>
            <div className="spec-item">
              <span>Fecha de inicio</span>
              <strong>{formatDateTime(vehicle.startTime)}</strong>
            </div>
            <div className="spec-item">
              <span>Fecha de cierre</span>
              <strong>{formatDateTime(vehicle.endTime)}</strong>
            </div>
          </div>

          <BidHistory
            bids={vehicle.bids}
            currentUserId={user?.id ?? null}
            highestBidderId={vehicle.highestBidderId}
          />
        </div>

        <div>
          <BidPanel
            vehicle={vehicle}
            isAuthenticated={isAuthenticated}
            currentUserId={user?.id ?? null}
            onBidPlaced={placeBid}
            onExpire={handleExpire}
            leading={Boolean(leading)}
            wasOutbid={Boolean(wasOutbid)}
          />
        </div>
      </div>
    </div>
  );
}
