/*
# Create app_settings table for dynamic challenge configuration

## Purpose
Allows Mahmoud to customize challenge parameters directly from the dashboard:
- startDate (e.g. 2026-10-01)
- goalDate (e.g. 2026-12-31)
- startWeightKg (e.g. 75.0)
- targetWeightKg (e.g. 65.0)
- targets (calories, protein, carbs, fats, sodiumLimit, potassiumMin, potassiumMax, waterLiters, cardioCalories)
*/

CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_app_settings" ON app_settings;
CREATE POLICY "anon_select_app_settings" ON app_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_app_settings" ON app_settings;
CREATE POLICY "anon_insert_app_settings" ON app_settings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_app_settings" ON app_settings;
CREATE POLICY "anon_update_app_settings" ON app_settings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_app_settings" ON app_settings;
CREATE POLICY "anon_delete_app_settings" ON app_settings FOR DELETE
  TO anon, authenticated USING (true);

INSERT INTO app_settings (key, value) VALUES (
  'challenge_config',
  '{
    "startDate": "2026-10-01",
    "goalDate": "2026-12-31",
    "startWeightKg": 75.0,
    "targetWeightKg": 65.0,
    "targets": {
      "calories": 1500,
      "protein": 125,
      "carbs": 150,
      "fats": 44,
      "sodiumLimit": 2300,
      "potassiumMin": 3500,
      "potassiumMax": 4700,
      "waterLiters": 4,
      "cardioCalories": 500
    }
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;
