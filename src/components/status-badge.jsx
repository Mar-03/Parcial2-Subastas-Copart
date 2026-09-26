/**
 * Badge del estado de la subasta: EN CURSO / VENDIDA / DESIERTA.
 */
export default function StatusBadge({ status, live = false }) {
  const value = String(status || 'ACTIVA').toUpperCase();

  if (value === 'VENDIDA') {
    return <span className="badge badge-vendida">VENDIDA</span>;
  }
  if (value === 'DESIERTA') {
    return <span className="badge badge-desierta">DESIERTA</span>;
  }
  return (
    <span className={`badge ${live ? 'badge-live' : 'badge-activa'}`}>
      {live ? 'EN VIVO' : 'EN CURSO'}
    </span>
  );
}
