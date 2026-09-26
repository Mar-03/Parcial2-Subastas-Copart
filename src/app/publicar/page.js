import ProtectedRoute from '@/components/protected-route';
import PublishVehicleSection from '@/components/publish-vehicle-section';

export const metadata = {
  title: 'Publicar vehiculo | Subastas Copart',
  description:
    'Publica un vehiculo en subasta con galeria de imagenes, monto base y fecha de cierre.',
};

/**
 * Pagina de publicacion. Solo usuarios autenticados (ProtectedRoute).
 */
export default function PublishVehiclePage() {
  return (
    <ProtectedRoute title="Publicar vehiculo">
      <PublishVehicleSection />
    </ProtectedRoute>
  );
}
