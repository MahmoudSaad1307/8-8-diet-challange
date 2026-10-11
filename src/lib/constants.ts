import type { DailyTargets, ChallengeConfig } from './types';

export const DEFAULT_CHALLENGE_CONFIG: ChallengeConfig = {
  startDate: '2026-10-01',
  goalDate: '2026-12-31',
  startWeightKg: 75.0,
  targetWeightKg: 65.0,
  targets: {
    calories: 1500,
    protein: 125,
    carbs: 150,
    fats: 44,
    sodiumLimit: 2300,
    potassiumMin: 3500,
    potassiumMax: 4700,
    waterLiters: 4,
    cardioCalories: 500,
  },
};

// Fallback constants for backward compatibility
export const GOAL_DATE = new Date(DEFAULT_CHALLENGE_CONFIG.goalDate);
export const START_DATE = new Date(DEFAULT_CHALLENGE_CONFIG.startDate);
export const START_WEIGHT_KG = DEFAULT_CHALLENGE_CONFIG.startWeightKg;
export const TARGET_WEIGHT_KG = DEFAULT_CHALLENGE_CONFIG.targetWeightKg;
export const TARGETS: DailyTargets = DEFAULT_CHALLENGE_CONFIG.targets;

export const ARABIC_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

export const ARABIC_WEEKDAYS = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

export const ARABIC_WEEKDAYS_SHORT = ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'];

export const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export function toArabicDigits(value: number | string): string {
  return String(value).replace(/[0-9]/g, (d) => ARABIC_DIGITS[Number(d)]);
}

export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatArabicDate(date: Date): string {
  const day = date.getDate();
  const month = ARABIC_MONTHS[date.getMonth()];
  const year = date.getFullYear();
  return `${toArabicDigits(day)} ${month} ${toArabicDigits(year)}`;
}

export function formatArabicDateShort(date: Date): string {
  const day = date.getDate();
  const month = ARABIC_MONTHS[date.getMonth()];
  return `${toArabicDigits(day)} ${month}`;
}

export function daysBetween(a: Date, b: Date): number {
  const ms = 1000 * 60 * 60 * 24;
  const aMid = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const bMid = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((bMid - aMid) / ms);
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
