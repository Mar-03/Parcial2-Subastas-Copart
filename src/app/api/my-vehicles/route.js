import { getContainer } from '@/infrastructure/container';
import { getCurrentUser, jsonSuccess, route } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/my-vehicles
 * Vehiculos publicados por el usuario autenticado.
 */
export const GET = route(async (request) => {
  const currentUser = await getCurrentUser(request);
  const { listMyVehicles } = getContainer();
  const result = await listMyVehicles.execute(currentUser);
  return jsonSuccess(result);
});
