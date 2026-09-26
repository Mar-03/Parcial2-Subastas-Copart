import { getContainer } from '@/infrastructure/container';
import { getCurrentUser, jsonSuccess, route } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/vehicles/:id/bids
 * Historial publico de ofertas. Por privacidad devuelve unicamente
 * { amount, createdAt }: nunca nombre, correo ni telefono del ofertante.
 */
export const GET = route(async (request, { params }) => {
  const { id } = await params;
  await getCurrentUser(request);
  const { getVehicleBids } = getContainer();
  const result = await getVehicleBids.execute({ vehicleId: id });
  return jsonSuccess(result);
});
