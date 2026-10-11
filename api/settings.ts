import { getSql, authorize, type ApiRequest, type ApiResponse } from './_db.js';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (!authorize(req, res)) return;
  const sql = getSql();

  try {
    if (req.method === 'GET') {
      const key = typeof req.query?.key === 'string' ? req.query.key : undefined;
      if (key) {
        const rows = await sql.query(`SELECT key, value, updated_at FROM app_settings WHERE key = $1`, [key]);
        return res.status(200).json(rows[0]?.value ?? null);
      }

      const rows = await sql.query(`SELECT key, value, updated_at FROM app_settings`);
      const map: Record<string, unknown> = {};
      for (const r of rows as Array<{ key: string; value: unknown }>) {
        map[r.key] = r.value;
      }
      return res.status(200).json(map);
    }

    if (req.method === 'PUT') {
      const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}) as Record<string, unknown>;
      
      const key = (typeof body.key === 'string' ? body.key : 'challenge_config');
      const value = body.value !== undefined ? body.value : body;

      const rows = await sql.query(
        `INSERT INTO app_settings (key, value, updated_at)
         VALUES ($1, $2::jsonb, now())
         ON CONFLICT (key) DO UPDATE SET
           value = EXCLUDED.value,
           updated_at = now()
         RETURNING key, value, updated_at`,
        [key, JSON.stringify(value)],
      );

      return res.status(200).json(rows[0]?.value ?? value);
    }

    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  } catch (e) {
    console.error('[api/settings]', e);
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: String(e) });
  }
}
