import Link from 'next/link';
import VehicleCatalog from '@/components/vehicle-catalog';

/**
 * HOME / INVENTARIO
 * Hero + catalogo completo con filtros multi-area sin recargar.
 */
export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <h1>Subastas de vehículos en tiempo real</h1>
            <p>
              Compra vehículos en subasta con ofertas en vivo. Publica tu unidad, recibe propuestas al
              instante y gana cuando el tiempo se agota.
            </p>
            <div className="hero-actions">
              <Link href="/inventario" className="btn btn-light btn-lg">
                Ver inventario
              </Link>
              <Link href="/publicar" className="btn btn-primary btn-lg">
                Publicar Vehículo
              </Link>
            </div>

            <div className="hero-stats">
              <div className="hero-stat">
                <strong>Tiempo real</strong>
                <span>Ofertas con Socket.IO</span>
              </div>
              <div className="hero-stat">
                <strong>+10%</strong>
                <span>Incremento minimo por puja</span>
              </div>
              <div className="hero-stat">
                <strong>5+ fotos</strong>
                <span>Galeria por Vehículo</span>
              </div>
              <div className="hero-stat">
                <strong>Q 25,000.00</strong>
                <span>Formato de moneda</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <VehicleCatalog
        showFilters
        heading="Inventario de subastas"
        subheading="Filtra por año, marca, modelo, combustible y nivel de daño. Los filtros se combinan entre si."
      />
    </>
  );
}
