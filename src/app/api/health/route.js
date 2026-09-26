import { getContainer } from '@/infrastructure/container';
import { jsonSuccess, route } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/health
 *
 * Health check de Render.
 *   { "status": "ok", "database": "connected" }
 */
export const GET = route(async () => {
  const { checkHealth } = getContainer();
  const health = await checkHealth.execute();
  return jsonSuccess(health, 200);
});
