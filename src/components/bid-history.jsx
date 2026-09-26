'use client';

import { formatDateTime, formatMoney } from '@/lib/format';

/**
 * Historial publico de ofertas.
 *
 * PRIVACIDAD: por diseno solo se muestra el monto y la fecha/hora.
 * Nunca se expone nombre, correo, telefono ni ningun dato del ofertante.
 */
export default function BidHistory({ bids = [], currentUserId = null, highestBidderId = null, title = 'Historial de ofertas' }) {
  const items = Array.isArray(bids) ? bids : [];

  return (
    <div className="card card-pad bid-history">
      <h3>
        {title}
        <span className="badge badge-neutral">{items.length} oferta(s)</span>
      </h3>
      <p className="privacy-note">
        Por privacidad, el historial muestra unicamente el monto y la hora de cada oferta. La identidad
        de los participantes no se publica.
      </p>

      {items.length === 0 ? (
        <p className="form-hint" style={{ margin: 0 }}>
          Todavia no hay ofertas para este vehiculo. La primera oferta debe ser igual o mayor al monto
          base.
        </p>
      ) : (
        <ul className="bid-list">
          {items.map((bid, index) => {
            const isMine =
              currentUserId != null && highestBidderId != null && String(currentUserId) === String(highestBidderId);
            return (
              <li key={`${bid.createdAt}-${index}`} className={`bid-list-item${index === 0 ? ' is-top' : ''}`}>
                <span className="bid-list-amount">{formatMoney(bid.amount)}</span>
                <span className="bid-list-time">
                  {index === 0 ? <span className="badge badge-activa">Mejor oferta</span> : null}
                  {isMine && index === 0 ? <span className="badge badge-damage-verde">Tu oferta</span> : null}
                  <br />
                  {formatDateTime(bid.createdAt)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
