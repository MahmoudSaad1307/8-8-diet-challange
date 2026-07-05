import { supabase, isSupabaseEnabled } from './supabase';
import type { DailyLog, FoodEntry, ParsedFoodItem } from './types';
import { formatDateKey } from './constants';

const LS_LOG_PREFIX = 'cc:dailylog:';
const LS_FOOD_PREFIX = 'cc:foodentries:';

// ---------- Local storage fallback (used when Supabase is not configured) ----------

function lsGetLog(date: Date): DailyLog | null {
  const key = formatDateKey(date);
  const raw = localStorage.getItem(LS_LOG_PREFIX + key);
  return raw ? (JSON.parse(raw) as DailyLog) : null;
}

function lsUpsertLog(log: Partial<DailyLog> & { log_date: string }): DailyLog {
  const existing = localStorage.getItem(LS_LOG_PREFIX + log.log_date);
  const prev = existing ? (JSON.parse(existing) as DailyLog) : null;
  const merged: DailyLog = {
    id: prev?.id ?? crypto.randomUUID(),
    log_date: log.log_date,
    weight_kg: log.weight_kg ?? prev?.weight_kg ?? null,
    resistance_done: log.resistance_done ?? prev?.resistance_done ?? false,
    cardio_calories: log.cardio_calories ?? prev?.cardio_calories ?? 0,
    water_liters: log.water_liters ?? prev?.water_liters ?? 0,
    created_at: prev?.created_at ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  localStorage.setItem(LS_LOG_PREFIX + log.log_date, JSON.stringify(merged));
  return merged;
}

function lsGetFoods(date: Date): FoodEntry[] {
  const key = formatDateKey(date);
  const raw = localStorage.getItem(LS_FOOD_PREFIX + key);
  return raw ? (JSON.parse(raw) as FoodEntry[]) : [];
}

function lsAddFood(entry: Omit<FoodEntry, 'id' | 'created_at'>): FoodEntry {
  const key = entry.log_date;
  const existing = lsGetFoods(new Date(key));
  const full: FoodEntry = {
    ...entry,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
  existing.push(full);
  localStorage.setItem(LS_FOOD_PREFIX + key, JSON.stringify(existing));
  return full;
}

function lsDeleteFood(id: string, date: Date): void {
  const key = formatDateKey(date);
  const existing = lsGetFoods(date).filter((e) => e.id !== id);
  localStorage.setItem(LS_FOOD_PREFIX + key, JSON.stringify(existing));
}

function lsAllLogs(): DailyLog[] {
  const logs: DailyLog[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(LS_LOG_PREFIX)) {
      const raw = localStorage.getItem(k);
      if (raw) logs.push(JSON.parse(raw));
    }
  }
  return logs;
}

function lsAllFoods(): FoodEntry[] {
  const foods: FoodEntry[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(LS_FOOD_PREFIX)) {
      const raw = localStorage.getItem(k);
      if (raw) foods.push(...(JSON.parse(raw) as FoodEntry[]));
    }
  }
  return foods;
}

// ---------- Public API ----------

export async function getDailyLog(date: Date): Promise<DailyLog | null> {
  const key = formatDateKey(date);
  if (isSupabaseEnabled && supabase) {
    const { data, error } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('log_date', key)
      .maybeSingle();
    if (error) {
      // eslint-disable-next-line no-console
      console.warn('getDailyLog error', error);
      return lsGetLog(date);
    }
    return (data as DailyLog | null) ?? null;
  }
  return lsGetLog(date);
}

export async function upsertDailyLog(
  log: Partial<DailyLog> & { log_date: string },
): Promise<DailyLog> {
  if (isSupabaseEnabled && supabase) {
    const { data, error } = await supabase
      .from('daily_logs')
      .upsert(
        {
          log_date: log.log_date,
          weight_kg: log.weight_kg,
          resistance_done: log.resistance_done,
          cardio_calories: log.cardio_calories,
          water_liters: log.water_liters,
        },
        { onConflict: 'log_date' },
      )
      .select()
      .maybeSingle();
    if (error || !data) {
      // eslint-disable-next-line no-console
      console.warn('upsertDailyLog error, falling back to local', error);
      return lsUpsertLog(log);
    }
    return data as DailyLog;
  }
  return lsUpsertLog(log);
}

export async function getFoodEntries(date: Date): Promise<FoodEntry[]> {
  const key = formatDateKey(date);
  if (isSupabaseEnabled && supabase) {
    const { data, error } = await supabase
      .from('food_entries')
      .select('*')
      .eq('log_date', key)
      .order('created_at', { ascending: true });
    if (error) {
      // eslint-disable-next-line no-console
      console.warn('getFoodEntries error', error);
      return lsGetFoods(date);
    }
    return (data as FoodEntry[]) ?? [];
  }
  return lsGetFoods(date);
}

export async function addFoodEntry(
  logDate: string,
  rawText: string,
  items: ParsedFoodItem[],
): Promise<FoodEntry | null> {
  const totals = items.reduce(
    (acc, i) => ({
      calories: acc.calories + i.calories,
      protein: Math.round((acc.protein + i.protein) * 10) / 10,
      carbs: Math.round((acc.carbs + i.carbs) * 10) / 10,
      fats: Math.round((acc.fats + i.fats) * 10) / 10,
      sodium: acc.sodium + i.sodium,
      potassium: acc.potassium + i.potassium,
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0, sodium: 0, potassium: 0 },
  );

  const payload = {
    log_date: logDate,
    raw_text: rawText,
    parsed_items: items as unknown as never,
    calories: totals.calories,
    protein_g: totals.protein,
    carbs_g: totals.carbs,
    fats_g: totals.fats,
    sodium_mg: totals.sodium,
    potassium_mg: totals.potassium,
  };

  if (isSupabaseEnabled && supabase) {
    // Ensure a daily_logs row exists for FK integrity
    const { error: logErr } = await supabase
      .from('daily_logs')
      .upsert(
        { log_date: logDate, weight_kg: null, resistance_done: false, cardio_calories: 0, water_liters: 0 },
        { onConflict: 'log_date' },
      );
    if (logErr) {
      // eslint-disable-next-line no-console
      console.warn('ensure log row error', logErr);
    }
    const { data, error } = await supabase
      .from('food_entries')
      .insert(payload)
      .select()
      .maybeSingle();
    if (error || !data) {
      // eslint-disable-next-line no-console
      console.warn('addFoodEntry error, falling back to local', error);
      return lsAddFood({ ...payload, id: '', created_at: '' } as never);
    }
    return data as FoodEntry;
  }
  return lsAddFood({ ...payload, id: '', created_at: '' } as never);
}

export async function deleteFoodEntry(id: string, date: Date): Promise<void> {
  if (isSupabaseEnabled && supabase) {
    const { error } = await supabase.from('food_entries').delete().eq('id', id);
    if (error) {
      // eslint-disable-next-line no-console
      console.warn('deleteFoodEntry error', error);
      lsDeleteFood(id, date);
    }
    return;
  }
  lsDeleteFood(id, date);
}

export async function getAllLogs(): Promise<DailyLog[]> {
  if (isSupabaseEnabled && supabase) {
    const { data, error } = await supabase.from('daily_logs').select('*');
    if (error || !data) {
      // eslint-disable-next-line no-console
      console.warn('getAllLogs error', error);
      return lsAllLogs();
    }
    return data as DailyLog[];
  }
  return lsAllLogs();
}

export async function getAllFoodEntries(): Promise<FoodEntry[]> {
  if (isSupabaseEnabled && supabase) {
    const { data, error } = await supabase.from('food_entries').select('*');
    if (error || !data) {
      // eslint-disable-next-line no-console
      console.warn('getAllFoodEntries error', error);
      return lsAllFoods();
    }
    return data as FoodEntry[];
  }
  return lsAllFoods();
}
