export interface DailyLog {
  id: string;
  log_date: string; // YYYY-MM-DD
  weight_kg: number | null;
  resistance_done: boolean;
  cardio_calories: number;
  water_liters: number;
  created_at?: string;
  updated_at?: string;
}

export interface ParsedFoodItem {
  name: string;
  qty_g: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  sodium: number;
  potassium: number;
}

export interface FoodEntry {
  id: string;
  log_date: string;
  raw_text: string;
  parsed_items: ParsedFoodItem[];
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  sodium_mg: number;
  potassium_mg: number;
  created_at?: string;
}

export interface DailyTotals {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  sodium: number;
  potassium: number;
}

export interface DailyTargets {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  sodiumLimit: number; // upper limit
  potassiumMin: number;
  potassiumMax: number;
  waterLiters: number;
  cardioCalories: number;
}

export type CalendarDayStatus = {
  date: string;
  hasLog: boolean;
  weight_kg: number | null;
  resistance_done: boolean;
  cardio_calories: number;
  water_liters: number;
  calories: number;
  sodium: number;
  sodiumBreached: boolean;
  isToday: boolean;
  isFuture: boolean;
  isPast: boolean;
};
