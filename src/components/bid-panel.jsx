'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Alert from '@/components/alert';
import Countdown from '@/components/countdown';
import { formatDateTime, formatMoney } from '@/lib/format';

/**
 * Panel de ofertar.
 *
 * IMPORTANTE: este componente NO decide si la oferta es valida. Esa validacion
 * vive por completo en el backend (POST /api/vehicles/:id/bids). Aqui solo se
 * muestra el minimo que devuelve la API y se envian las peticiones.
 */
export default function BidPanel({
  vehicle,
  isAuthenticated,
  currentUserId,
  onBidPlaced,
  onExpire,
  leading,
  wasOutbid,
}) {
  const minimumBid = Number(vehicle.minimumBid ?? vehicle.basePrice ?? 0);
  const [amount, setAmount] = useState(() => minimumBid.toFixed(2));
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setAmount(minimumBid.toFixed(2));
  }, [minimumBid]);

  const status = String(vehicle.status || 'ACTIVA').toUpperCase();
  const ended = Boolean(vehicle.ended) || status === 'VENDIDA' || status === 'DESIERTA';
  const notStarted = !vehicle.hasStarted;
  const closed = ended || notStarted;

  // El usuario autenticado es el mejor ofertante si su id coincide con el
  // highestBidderId que devuelve la API. `leading` llega ya resuelto desde el
  // componente padre (tambien se actualiza por Socket.IO).
  const isLeading =
    Boolean(leading) ||
    (currentUserId != null &&
      vehicle.highestBidderId != null &&
      String(currentUserId) === String(vehicle.highestBidderId));

  const setPreset = (multiplier) => {
    const value = Number((minimumBid * multiplier).toFixed(2));
    setAmount(value.toFixed(2));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!isAuthenticated) {
      setError('Debes iniciar sesion para ofertar en una subasta.');
      return;
    }

    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Ingresa un monto valido mayor que 0.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await onBidPlaced(parsed);
      setSuccess(`Oferta registrada correctamente: ${formatMoney(parsed)}`);
      setError(null);
    } catch (err) {
      // El mensaje de error proviene del backend (reglas de puja).
      setError(err.message || 'No se pudo registrar tu oferta.');
      setSuccess(null);
    } finally {
      setSubmitting(false);
    }
  };

  const hasBids = Number(vehicle.currentBid) > 0;

  return (
    <div className="bid-panel">
      <h2>Ofertar en esta subasta</h2>

      {ended ? (
        <div
          className={`finalized-banner ${
            status === 'VENDIDA' ? 'finalized-sold' : 'finalized-unsold'
          }`}
        >
          {status === 'VENDIDA'
            ? 'SUBASTA FINALIZADA - VENDIDA'
            : 'SUBASTA FINALIZADA - NO VENDIDA / DESIERTA'}
        </div>
      ) : null}

      {notStarted && !ended ? (
        <Alert type="warning" message="Esta subasta todavia no ha iniciado." />
      ) : null}

      <div className="bid-amount-display">
        <span>Oferta actual</span>
        <strong>{hasBids ? formatMoney(vehicle.currentBid) : 'Sin ofertas'}</strong>
      </div>

      <p className="bid-minimum">
        Oferta minima siguiente: <strong>{formatMoney(minimumBid)}</strong>
      </p>

      {!closed ? <Countdown endTime={vehicle.endTime} onExpire={onExpire} /> : null}

      {isLeading && !closed ? (
        <div className="bid-status bid-status-leading">
          <span aria-hidden="true">&#10003;</span>
          <span>Vas ganando esta subasta!</span>
        </div>
      ) : null}

      {wasOutbid && !isLeading && !closed ? (
        <div className="bid-status bid-status-outbid">
          <span aria-hidden="true">!</span>
          <span>Tu oferta ha sido superada. Haz tu oferta ahora antes de que termine el tiempo!</span>
        </div>
      ) : null}

      {error ? <Alert type="error" message={error} onClose={() => setError(null)} /> : null}
      {success ? <Alert type="success" message={success} onClose={() => setSuccess(null)} /> : null}

      {closed ? (
        <Alert
          type="info"
          message={
            ended
              ? 'El boton de ofertar se bloquea cuando la subasta termina.'
              : 'La subasta abrira en su fecha de inicio.'
          }
        />
      ) : (
        <form onSubmit={handleSubmit}>
          <label className="form-label" htmlFor="bid-amount">
            Tu oferta (Q) <span className="required">*</span>
          </label>
          <input
            id="bid-amount"
            className="bid-input"
            type="number"
            inputMode="decimal"
            step="0.01"
            min={minimumBid}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            disabled={submitting || !isAuthenticated}
            required
          />

          <div className="bid-quick">
            {[1, 1.1, 1.25, 1.5].map((multiplier) => (
              <button
                key={multiplier}
                type="button"
                onClick={() => setPreset(multiplier)}
                disabled={submitting || !isAuthenticated}
              >
                {multiplier === 1 ? 'Minimo' : `x${multiplier}`}
                <br />
                <span style={{ fontSize: '0.72rem' }}>
                  {formatMoney(Number((minimumBid * multiplier).toFixed(2)))}
                </span>
              </button>
            ))}
          </div>

          {isAuthenticated ? (
            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting}>
              {submitting ? 'Registrando oferta...' : 'Ofertar ahora'}
            </button>
          ) : (
            <div>
              <Alert
                type="info"
                message="Debes iniciar sesion para ofertar. Puedes ver el catalogo y el detalle sin cuenta."
              />
              <Link href="/login" className="btn btn-primary btn-block">
                Iniciar sesion para ofertar
              </Link>
            </div>
          )}
        </form>
      )}

      <div style={{ marginTop: 16, fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
        <div>
          Monto base: <strong>{formatMoney(vehicle.basePrice)}</strong>
        </div>
        <div>
          Inicio: <strong>{formatDateTime(vehicle.startTime)}</strong>
        </div>
        <div>
          Cierre: <strong>{formatDateTime(vehicle.endTime)}</strong>
        </div>
        {currentUserId != null ? (
          <div style={{ marginTop: 6 }}>
            Sesion iniciada como usuario #{currentUserId}
          </div>
        ) : null}
      </div>
    </div>
  );
}
