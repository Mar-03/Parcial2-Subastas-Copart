import { getContainer } from '@/infrastructure/container';
import { jsonSuccess, readJson, route } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
export const POST = route(async (request) => {
  const body = await readJson(request);
  const { loginUser } = getContainer();
  const result = await loginUser.execute(body);
  return jsonSuccess({ user: result.user, token: result.token }, 200);
});
