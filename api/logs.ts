import { getSql, authorize, LOG_COLS, type ApiRequest, type ApiResponse } from './_db';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (!authorize(req, res)) return;
  const sql = getSql();

  try {
    if (req.method === 'GET') {
      const date = typeof req.query?.date === 'string' ? req.query.date : undefined;
      if (date) {
        const rows = await sql.query(`SELECT ${LOG_COLS} FROM daily_logs WHERE log_date = $1`, [date]);
        return res.status(200).json(rows[0] ?? null);
      }
      const rows = await sql.query(`SELECT ${LOG_COLS} FROM daily_logs ORDER BY log_date ASC`);
      return res.status(200).json(rows);
    }

    if (req.method === 'PUT') {
      const b = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}) as Record<string, unknown>;
      if (!b.log_date || typeof b.log_date !== 'string') {
        return res.status(400).json({ error: 'log_date required' });
      }

      const hasWeight = 'weight_kg' in b;
      const rows = await sql.query(
        `INSERT INTO daily_logs (log_date, weight_kg, resistance_done, cardio_calories, water_liters)
         VALUES ($1, $2, COALESCE($3::boolean, false), COALESCE($4::int, 0), COALESCE($5::numeric, 0))
         ON CONFLICT (log_date) DO UPDATE SET
           weight_kg       = CASE WHEN $6::boolean THEN $2 ELSE daily_logs.weight_kg END,
           resistance_done = COALESCE($3::boolean, daily_logs.resistance_done),
           cardio_calories = COALESCE($4::int, daily_logs.cardio_calories),
           water_liters    = COALESCE($5::numeric, daily_logs.water_liters),
           updated_at      = now()
         RETURNING ${LOG_COLS}`,
        [
          b.log_date,
          (b.weight_kg as number | null) ?? null,
          (b.resistance_done as boolean | null) ?? null,
          (b.cardio_calories as number | null) ?? null,
          (b.water_liters as number | null) ?? null,
          hasWeight,
        ],
      );
      return res.status(200).json(rows[0]);
    }

    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  } catch (e) {
    console.error('[api/logs]', e);
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: String(e) });
  }
}
