/*
# Create tables for the Cutting Challenge tracker (single-tenant, no auth)

## Purpose
The app is a personal fitness "cutting" challenge tracker ending on 2026-08-08.
It tracks daily morning weight, resistance training, cardio calories, water
intake, and an AI-parsed food log with full macronutrient + electrolyte
breakdown (calories, protein, carbs, fats, sodium, potassium). There is no
sign-in screen, so the schema is single-tenant and open to the anon key.

## 1. New Tables

### daily_logs
One row per calendar day. Holds the non-food daily metrics.
- `id` (uuid, primary key)
- `log_date` (date, unique) — the calendar day this row represents
- `weight_kg` (numeric 5,2) — morning weigh-in
- `resistance_done` (boolean, default false) — did resistance training today?
- `cardio_calories` (integer, default 0) — calories burned via cardio
- `water_liters` (numeric 4,2, default 0) — water intake in liters
- `created_at`, `updated_at` (timestamptz)

### food_entries
One row per food-log submission (a single NLP text can produce one row whose
`parsed_items` jsonb holds the per-item breakdown). Macros are denormalized
onto the row so daily totals can be computed with a single sum.
- `id` (uuid, primary key)
- `log_date` (date) — which day this entry belongs to
- `raw_text` (text) — the original Arabic/English text the user typed
- `parsed_items` (jsonb, default '[]') — array of {name, qty_g, calories, protein, carbs, fats, sodium, potassium}
- `calories` (integer, default 0) — total calories for this entry
- `protein_g` (numeric 6,1, default 0)
- `carbs_g` (numeric 6,1, default 0)
- `fats_g` (numeric 6,1, default 0)
- `sodium_mg` (integer, default 0)
- `potassium_mg` (integer, default 0)
- `created_at` (timestamptz)

## 2. Indexes
- `daily_logs_log_date_key` — unique on log_date (enforced by UNIQUE constraint)
- `food_entries_log_date_idx` — on food_entries.log_date for fast daily aggregation

## 3. Security
- RLS enabled on both tables.
- Both tables are intentionally single-tenant / shared (no sign-in screen),
  so all four CRUD policies use `TO anon, authenticated` with `USING (true)` /
  `WITH CHECK (true)`. This is the documented single-tenant pattern; the data
  is the app owner's own tracker and there is no multi-user isolation need.

## 4. Important Notes
1. No `user_id` column and no `auth.uid()` checks — the app has no sign-in.
2. `daily_logs.log_date` has a UNIQUE constraint so upserts by date are safe.
3. `food_entries.parsed_items` is jsonb so the per-item breakdown is queryable.
4. All policies are idempotent (DROP POLICY IF EXISTS before CREATE).
*/

CREATE TABLE IF NOT EXISTS daily_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_date date UNIQUE NOT NULL,
  weight_kg numeric(5,2),
  resistance_done boolean NOT NULL DEFAULT false,
  cardio_calories integer NOT NULL DEFAULT 0,
  water_liters numeric(4,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_daily_logs" ON daily_logs;
CREATE POLICY "anon_select_daily_logs" ON daily_logs FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_daily_logs" ON daily_logs;
CREATE POLICY "anon_insert_daily_logs" ON daily_logs FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_daily_logs" ON daily_logs;
CREATE POLICY "anon_update_daily_logs" ON daily_logs FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_daily_logs" ON daily_logs;
CREATE POLICY "anon_delete_daily_logs" ON daily_logs FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS food_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_date date NOT NULL REFERENCES daily_logs(log_date) ON DELETE CASCADE,
  raw_text text NOT NULL,
  parsed_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  calories integer NOT NULL DEFAULT 0,
  protein_g numeric(6,1) NOT NULL DEFAULT 0,
  carbs_g numeric(6,1) NOT NULL DEFAULT 0,
  fats_g numeric(6,1) NOT NULL DEFAULT 0,
  sodium_mg integer NOT NULL DEFAULT 0,
  potassium_mg integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS food_entries_log_date_idx ON food_entries(log_date);

ALTER TABLE food_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_food_entries" ON food_entries;
CREATE POLICY "anon_select_food_entries" ON food_entries FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_food_entries" ON food_entries;
CREATE POLICY "anon_insert_food_entries" ON food_entries FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_food_entries" ON food_entries;
CREATE POLICY "anon_update_food_entries" ON food_entries FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_food_entries" ON food_entries;
CREATE POLICY "anon_delete_food_entries" ON food_entries FOR DELETE
  TO anon, authenticated USING (true);
