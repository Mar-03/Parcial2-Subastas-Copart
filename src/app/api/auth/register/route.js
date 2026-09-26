import { getContainer } from '@/infrastructure/container';
import { jsonSuccess, readJson, route } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/auth/register
 * Body: { firstName, lastName, email, phone, password }
 */
export const POST = route(async (request) => {
  const body = await readJson(request);
  const { registerUser } = getContainer();
  const result = await registerUser.execute(body);
  return jsonSuccess({ user: result.user, token: result.token }, 201);
});
