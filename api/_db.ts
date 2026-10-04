import { neon } from '@neondatabase/serverless';

export interface ApiRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
  body?: unknown;
}

export interface ApiResponse {
  setHeader(name: string, value: string): ApiResponse | void;
  status(code: number): ApiResponse;
  json(data: unknown): void;
  end(): void;
}

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) {
    throw new Error('DATABASE_URL or POSTGRES_URL environment variable is not set.');
  }
  return url;
}

export function getSql() {
  return neon(getDatabaseUrl());
}

export function authorize(req: ApiRequest, res: ApiResponse): boolean {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-app-key');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return false;
  }

  const expected = (process.env.APP_SECRET || process.env.VITE_APP_PASSWORD || 'mahmoud88').trim();
  const got = String(req.headers['x-app-key'] || '').trim();

  if (!expected || got !== expected) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid or missing app key' });
    return false;
  }
  return true;
}

export const LOG_COLS = `id, log_date::text AS log_date, weight_kg::float8 AS weight_kg,
  resistance_done, cardio_calories, water_liters::float8 AS water_liters,
  created_at, updated_at`;

export const FOOD_COLS = `id, log_date::text AS log_date, raw_text, parsed_items, calories,
  protein_g::float8 AS protein_g, carbs_g::float8 AS carbs_g, fats_g::float8 AS fats_g,
  sodium_mg, potassium_mg, created_at`;
