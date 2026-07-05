import { useCallback, useEffect, useMemo, useState } from 'react';
import { Header } from './components/Header';
import { MahmoudAuth } from './components/MahmoudAuth';
import { CalendarTrace } from './components/CalendarTrace';
import { DailyLogPanel } from './components/DailyLogPanel';
import { FoodLogger } from './components/FoodLogger';
import { DailySummary } from './components/DailySummary';
import type { CalendarDayStatus, DailyLog, DailyTotals, FoodEntry, ParsedFoodItem } from './lib/types';
import {
  GOAL_DATE,
  START_DATE,
  TARGETS,
  START_WEIGHT_KG,
  TARGET_WEIGHT_KG,
  addDays,
  daysBetween,
  formatDateKey,
  parseDateKey,
  startOfDay,
  toArabicDigits,
  formatArabicDate,
} from './lib/constants';
import {
  addFoodEntry,
  deleteFoodEntry,
  getAllFoodEntries,
  getAllLogs,
  getDailyLog,
  getFoodEntries,
  upsertDailyLog,
} from './lib/db';

function App() {
  const [isAuthorized, setIsAuthorized] = useState<boolean>(() => {
    return localStorage.getItem('mahmoud_authorized') === 'true';
  });

  const today = useMemo(() => startOfDay(new Date()), []);
  const [selectedDate, setSelectedDate] = useState<string>(formatDateKey(today));

  const [showPastDays, setShowPastDays] = useState<boolean>(() => {
    return localStorage.getItem('show_past_days') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('show_past_days', String(showPastDays));
  }, [showPastDays]);

  const [allLogs, setAllLogs] = useState<DailyLog[]>([]);
  const [allFoods, setAllFoods] = useState<FoodEntry[]>([]);
  const [currentLog, setCurrentLog] = useState<DailyLog | null>(null);
  const [currentFoods, setCurrentFoods] = useState<FoodEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Load everything once on mount
  useEffect(() => {
    (async () => {
      const [logs, foods] = await Promise.all([getAllLogs(), getAllFoodEntries()]);
      setAllLogs(logs);
      setAllFoods(foods);
      setLoading(false);
    })().catch((e) => {
      // eslint-disable-next-line no-console
      console.warn('init load error', e);
      setLoading(false);
    });
  }, []);

  // Load selected day's data
  const loadDay = useCallback(async (dateKey: string) => {
    const date = parseDateKey(dateKey);
    const [log, foods] = await Promise.all([getDailyLog(date), getFoodEntries(date)]);
    setCurrentLog(log);
    setCurrentFoods(foods);
  }, []);

  useEffect(() => {
    loadDay(selectedDate);
  }, [selectedDate, loadDay]);

  // Build calendar days from start/today to goal date
  const calendarDays: CalendarDayStatus[] = useMemo(() => {
    const calendarStart = showPastDays ? START_DATE : today;
    const total = daysBetween(calendarStart, GOAL_DATE);
    const logMap = new Map(allLogs.map((l) => [l.log_date, l]));
    const foodMap = new Map<string, FoodEntry[]>();
    for (const f of allFoods) {
      if (!foodMap.has(f.log_date)) foodMap.set(f.log_date, []);
      foodMap.get(f.log_date)!.push(f);
    }

    const days: CalendarDayStatus[] = [];
    for (let i = 0; i <= total; i++) {
      const d = addDays(calendarStart, i);
      const key = formatDateKey(d);
      const log = logMap.get(key) ?? null;
      const foods = foodMap.get(key) ?? [];
      const sodium = foods.reduce((s, f) => s + (f.sodium_mg ?? 0), 0);
      const calories = foods.reduce((s, f) => s + (f.calories ?? 0), 0);
      const isToday = key === formatDateKey(today);
      days.push({
        date: key,
        hasLog: log !== null || foods.length > 0,
        weight_kg: log?.weight_kg ?? null,
        resistance_done: log?.resistance_done ?? false,
        cardio_calories: log?.cardio_calories ?? 0,
        water_liters: log?.water_liters ? Number(log.water_liters) : 0,
        calories,
        sodium,
        sodiumBreached: sodium > TARGETS.sodiumLimit,
        isToday,
        isFuture: d > today,
        isPast: d < today,
      });
    }
    return days;
  }, [allLogs, allFoods, today, showPastDays]);

  // Daily totals from current foods
  const dailyTotals: DailyTotals = useMemo(() => {
    return currentFoods.reduce(
      (acc, f) => ({
        calories: acc.calories + (f.calories ?? 0),
        protein: Math.round((acc.protein + Number(f.protein_g ?? 0)) * 10) / 10,
        carbs: Math.round((acc.carbs + Number(f.carbs_g ?? 0)) * 10) / 10,
        fats: Math.round((acc.fats + Number(f.fats_g ?? 0)) * 10) / 10,
        sodium: acc.sodium + (f.sodium_mg ?? 0),
        potassium: acc.potassium + (f.potassium_mg ?? 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0, sodium: 0, potassium: 0 },
    );
  }, [currentFoods]);

  // Latest weight for header
  const latestWeight = useMemo(() => {
    const sorted = [...allLogs]
      .filter((l) => l.weight_kg !== null)
      .sort((a, b) => b.log_date.localeCompare(a.log_date));
    return sorted[0]?.weight_kg ? Number(sorted[0].weight_kg) : null;
  }, [allLogs]);

  const selectedDateObj = parseDateKey(selectedDate);
  const isFuture = selectedDateObj > today;
  const isToday = selectedDate === formatDateKey(today);

  const handleLogChange = useCallback(
    async (patch: Partial<DailyLog>) => {
      const updated = await upsertDailyLog({
        log_date: selectedDate,
        weight_kg: patch.weight_kg !== undefined ? patch.weight_kg : currentLog?.weight_kg ?? null,
        resistance_done: patch.resistance_done !== undefined ? patch.resistance_done : currentLog?.resistance_done ?? false,
        cardio_calories: patch.cardio_calories !== undefined ? patch.cardio_calories : currentLog?.cardio_calories ?? 0,
        water_liters: patch.water_liters !== undefined ? patch.water_liters : currentLog?.water_liters ?? 0,
      });
      setCurrentLog(updated);
      setAllLogs((prev) => {
        const idx = prev.findIndex((l) => l.log_date === selectedDate);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = updated;
          return next;
        }
        return [...prev, updated];
      });
    },
    [selectedDate, currentLog],
  );

  const handleAddFood = useCallback(
    async (text: string, items: ParsedFoodItem[]) => {
      const entry = await addFoodEntry(selectedDate, text, items);
      if (entry) {
        setCurrentFoods((prev) => [...prev, entry]);
        setAllFoods((prev) => [...prev, entry]);
      }
    },
    [selectedDate],
  );

  const handleDeleteFood = useCallback(
    async (id: string) => {
      await deleteFoodEntry(id, parseDateKey(selectedDate));
      setCurrentFoods((prev) => prev.filter((e) => e.id !== id));
      setAllFoods((prev) => prev.filter((e) => e.id !== id));
    },
    [selectedDate],
  );

  if (!isAuthorized) {
    return <MahmoudAuth onSuccess={() => setIsAuthorized(true)} />;
  }

  return (
    <div className="min-h-screen pb-16">
      <Header currentWeight={latestWeight ?? START_WEIGHT_KG} />

      <main className="mx-auto max-w-6xl space-y-4 px-4 sm:space-y-5 sm:px-6">
        {/* Selected day banner */}
        <div className="flex items-center justify-between rounded-xl border border-white/5 bg-ink-850/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">اليوم المحدد:</span>
            <span className="font-display text-sm font-extrabold text-white">
              {formatArabicDate(selectedDateObj)}
            </span>
          </div>
          {isToday && (
            <span className="chip border border-emerald-400/30 bg-emerald-500/10 text-emerald-300">
              اليوم
            </span>
          )}
          {isFuture && (
            <span className="chip border border-amber-400/30 bg-amber-500/10 text-amber-300">
              تاريخ مستقبلي
            </span>
          )}
        </div>

        <CalendarTrace
          days={calendarDays}
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
          showPastDays={showPastDays}
          onTogglePastDays={setShowPastDays}
        />

        {loading ? (
          <div className="card p-8 text-center text-sm text-slate-400">جارٍ التحميل...</div>
        ) : (
          <>
            <DailyLogPanel
              log={currentLog}
              dateKey={selectedDate}
              isFuture={isFuture}
              isToday={isToday}
              onChange={handleLogChange}
            />

            <FoodLogger
              isFuture={isFuture}
              entries={currentFoods}
              onAdd={handleAddFood}
              onDelete={handleDeleteFood}
            />

            <DailySummary totals={dailyTotals} log={currentLog} isFuture={isFuture} />
          </>
        )}

        <footer className="mt-8 border-t border-white/5 pt-6 text-center text-[11px] font-semibold text-slate-500">
          تحدّي التنشيف · ينتهي في {toArabicDigits(8)} أغسطس {toArabicDigits(2026)} · صُمّم للوصول إلى{' '}
          {toArabicDigits(TARGET_WEIGHT_KG)} كجم
        </footer>
      </main>
    </div>
  );
}

export default App;
