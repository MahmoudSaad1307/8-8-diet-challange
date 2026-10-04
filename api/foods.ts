import { getSql, authorize, FOOD_COLS, type ApiRequest, type ApiResponse } from './_db.js';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (!authorize(req, res)) return;
  const sql = getSql();

  try {
    if (req.method === 'GET') {
      const date = typeof req.query?.date === 'string' ? req.query.date : undefined;
      if (date) {
        const rows = await sql.query(
          `SELECT ${FOOD_COLS} FROM food_entries WHERE log_date = $1 ORDER BY created_at ASC`,
          [date],
        );
        return res.status(200).json(rows);
      }
      const rows = await sql.query(`SELECT ${FOOD_COLS} FROM food_entries ORDER BY created_at ASC`);
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const b = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}) as Record<string, unknown>;
      if (!b.log_date || !b.raw_text || typeof b.log_date !== 'string' || typeof b.raw_text !== 'string') {
        return res.status(400).json({ error: 'log_date and raw_text required' });
      }

      // Ensure daily_logs row exists for foreign key constraint
      await sql.query(
        `INSERT INTO daily_logs (log_date) VALUES ($1) ON CONFLICT (log_date) DO NOTHING`,
        [b.log_date],
      );

      const rows = await sql.query(
        `INSERT INTO food_entries (log_date, raw_text, parsed_items, calories, protein_g, carbs_g, fats_g, sodium_mg, potassium_mg)
         VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9)
         RETURNING ${FOOD_COLS}`,
        [
          b.log_date,
          b.raw_text,
          JSON.stringify(b.parsed_items ?? []),
          (b.calories as number) ?? 0,
          (b.protein_g as number) ?? 0,
          (b.carbs_g as number) ?? 0,
          (b.fats_g as number) ?? 0,
          (b.sodium_mg as number) ?? 0,
          (b.potassium_mg as number) ?? 0,
        ],
      );
      return res.status(200).json(rows[0]);
    }

    if (req.method === 'DELETE') {
      const bodyObj = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
      const id = (typeof req.query?.id === 'string' ? req.query.id : bodyObj.id) as string | undefined;
      if (!id) {
        return res.status(400).json({ error: 'id required' });
      }
      await sql.query(`DELETE FROM food_entries WHERE id = $1`, [id]);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  } catch (e) {
    console.error('[api/foods]', e);
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: String(e) });
  }
}
