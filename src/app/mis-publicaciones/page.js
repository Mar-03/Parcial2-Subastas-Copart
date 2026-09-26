import MyVehiclesSection from '@/components/my-vehicles-section';
import ProtectedRoute from '@/components/protected-route';

export const metadata = {
  title: 'Mis publicaciones | Subastas Copart',
  description: 'Administra los vehiculos que has publicado y las ofertas recibidas.',
};

/**
 * Mis publicaciones. Solo usuarios autenticados (ProtectedRoute).
 */
export default function MyVehiclesPage() {
  return (
    <ProtectedRoute title="Mis publicaciones">
      <MyVehiclesSection />
    </ProtectedRoute>
  );
}
