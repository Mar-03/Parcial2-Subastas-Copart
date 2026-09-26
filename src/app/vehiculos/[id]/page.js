import AuctionDetail from '@/components/auction-detail';

export const metadata = {
  title: 'Detalle de subasta | Subastas Copart',
  description: 'Detalle del vehiculo en subasta con galeria, temporizador regresivo y ofertas en tiempo real.',
};

/**
 * Detalle de la subasta: /vehiculos/[id]
 * La logica en vivo vive en el componente cliente `AuctionDetail`.
 */
export default async function VehicleDetailPage({ params }) {
  const { id } = await params;

  return (
    <AuctionDetail vehicleId={id} />
  );
}
