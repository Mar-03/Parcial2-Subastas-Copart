import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div>
          <strong style={{ color: '#fff' }}>Subastas Copart</strong>
          <div>Plataforma de subastas de vehiculos en tiempo real</div>
        </div>
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
          <Link href="/">Inicio</Link>
          <Link href="/inventario">Inventario</Link>
          <Link href="/publicar">Publicar vehiculo</Link>
          <Link href="/mis-publicaciones">Mis publicaciones</Link>
        </div>
      </div>
    </footer>
  );
}
