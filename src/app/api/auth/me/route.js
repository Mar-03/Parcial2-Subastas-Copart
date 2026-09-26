import { getBearerToken, jsonSuccess, route } from '@/lib/api';
import { getContainer } from '@/infrastructure/container';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/auth/me
 * Devuelve el usuario autenticado o 401 si el token no es valido.
 */
export const GET = route(async (request) => {
  const token = getBearerToken(request);
  if (!token) {
    return jsonSuccess({ user: null }, 200);
  }

  const { resolveCurrentUser } = getContainer();
  const user = await resolveCurrentUser.execute(token);
  if (!user) {
    return jsonSuccess({ user: null }, 200);
  }

  return jsonSuccess({ user: user.toPrivateProfile() }, 200);
});
