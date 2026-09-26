'use client';

import { useEffect, useState } from 'react';
import { formatCountdown } from '@/lib/format';

/**
 * Temporizador regresivo DD:HH:MM:SS. Se actualiza cada segundo.
 * Llama `onExpire` una sola vez cuando llega a cero.
 */
export default function Countdown({ endTime, onExpire, compact = false }) {
  const [remaining, setRemaining] = useState(() => new Date(endTime || 0).getTime() - Date.now());
  const [expiredNotified, setExpiredNotified] = useState(false);

  useEffect(() => {
    setExpiredNotified(false);
    setRemaining(new Date(endTime || 0).getTime() - Date.now());
  }, [endTime]);

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining(new Date(endTime || 0).getTime() - Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [endTime]);

  useEffect(() => {
    if (remaining <= 0 && !expiredNotified) {
      setExpiredNotified(true);
      if (onExpire) onExpire();
    }
  }, [remaining, expiredNotified, onExpire]);

  const parts = formatCountdown(remaining);

  return (
    <div>
      {compact ? null : <div className="countdown-label">Tiempo restante</div>}
      <div className="countdown" role="timer" aria-live="off">
        <div className="countdown-block">
          <strong>{parts.days}</strong>
          <span>Dias</span>
        </div>
        <div className="countdown-block">
          <strong>{parts.hours}</strong>
          <span>Horas</span>
        </div>
        <div className="countdown-block">
          <strong>{parts.minutes}</strong>
          <span>Min</span>
        </div>
        <div className="countdown-block">
          <strong>{parts.seconds}</strong>
          <span>Seg</span>
        </div>
      </div>
    </div>
  );
}
