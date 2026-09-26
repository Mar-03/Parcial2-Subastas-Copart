import { getContainer } from '@/infrastructure/container';
import { getCurrentUser, jsonSuccess, readJson, route } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/vehicles/:id
 * Detalle publico: galeria, datos tecnicos e historial de ofertas
 * (solo monto y fecha, sin identidad de los ofertantes).
 */
export const GET = route(async (request, { params }) => {
  const { id } = await params;
  const currentUser = await getCurrentUser(request);
  const { getVehicleDetail } = getContainer();
  const vehicle = await getVehicleDetail.execute({ vehicleId: id, currentUser });
  return jsonSuccess({ vehicle });
});

/**
 * PUT /api/vehicles/:id
 * Requiere token JWT y ser el propietario del vehiculo.
 */
export const PUT = route(async (request, { params }) => {
  const { id } = await params;
  const currentUser = await getCurrentUser(request);
  const body = await readJson(request);
  const { updateVehicle } = getContainer();
  const vehicle = await updateVehicle.execute({ vehicleId: id, payload: body, currentUser });
  return jsonSuccess({ vehicle });
});
