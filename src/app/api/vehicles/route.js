import { getContainer } from '@/infrastructure/container';
import { getCurrentUser, jsonSuccess, readJson, route, toQueryObject } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/vehicles
 * Catalogo publico con filtros multi-area combinables:
 *   ?year=2018,2019&brand=Toyota&model=Corolla&fuel=Gasolina&damageLevel=ROJO
 *   &search=corolla&sort=cierre_proximo&page=1&pageSize=12
 */
export const GET = route(async (request) => {
  const query = toQueryObject(request.nextUrl.searchParams);
  const currentUser = await getCurrentUser(request);
  const { listVehicles } = getContainer();
  const result = await listVehicles.execute(query, currentUser);
  return jsonSuccess(result);
});

/**
 * POST /api/vehicles
 * Requiere token JWT. Publica un vehiculo con minimo 5 imagenes (URLs).
 */
export const POST = route(async (request) => {
  const currentUser = await getCurrentUser(request);
  const body = await readJson(request);
  const { createVehicle } = getContainer();
  const vehicle = await createVehicle.execute(body, currentUser);
  return jsonSuccess({ vehicle }, 201);
});
