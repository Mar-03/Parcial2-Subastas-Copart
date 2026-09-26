'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Alert from '@/components/alert';
import VehicleForm from '@/components/vehicle-form';
import { apiFetch } from '@/lib/api-client';

/**
 * Seccion de publicacion de vehiculos (POST /api/vehicles).
 */
export default function PublishVehicleSection() {
  const router = useRouter();
  const [success, setSuccess] = useState(null);

  const handleSubmit = async (payload) => {
    const response = await apiFetch('/api/vehicles', { method: 'POST', body: payload });
    setSuccess(
      `Vehiculo publicado correctamente. Ya puedes recibir ofertas en la subasta #${response.vehicle.id}.`,
    );
    setTimeout(() => router.push(`/vehiculos/${response.vehicle.id}`), 1400);
  };

  return (
    <div className="container section">
      <div className="section-head">
        <div>
          <h2>Publicar vehiculo en subasta</h2>
          <p>
            Completa todos los datos. Se requieren al menos 5 imagenes (URLs) y un monto base en
            quetzales.
          </p>
        </div>
      </div>

      {success ? <Alert type="success" message={success} /> : null}

      <div className="card card-pad">
        <VehicleForm onSubmit={handleSubmit} submitLabel="Publicar vehiculo" />
      </div>
    </div>
  );
}
