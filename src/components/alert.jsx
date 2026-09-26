/**
 * Mensaje visual de error, exito, advertencia o informacion.
 * Muestra tambien el detalle de validacion campo por campo.
 */
export default function Alert({ type = 'info', title, message, errors, onClose }) {
  if (!message && !errors && !title) return null;

  const list = errors && typeof errors === 'object' ? Object.values(errors).filter(Boolean) : null;

  return (
    <div className={`alert alert-${type}`} role={type === 'error' ? 'alert' : 'status'}>
      {title ? <strong style={{ display: 'block', marginBottom: 2 }}>{title}</strong> : null}
      {message}
      {list && list.length > 0 ? (
        <ul>
          {list.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      ) : null}
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar mensaje"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 800,
            fontSize: '1rem',
            float: 'right',
            marginLeft: 8,
            color: 'inherit',
          }}
        >
          ✕
        </button>
      ) : null}
    </div>
  );
}
