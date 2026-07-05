import { AlertTriangle, Droplets, Zap, Activity, Info, Flame } from 'lucide-react';
import { ProgressRing } from './ProgressRing';
import type { DailyTotals, DailyLog } from '../lib/types';
import { TARGETS, toArabicDigits } from '../lib/constants';

interface DailySummaryProps {
  totals: DailyTotals;
  log: DailyLog | null;
  isFuture: boolean;
}

export function DailySummary({ totals, log, isFuture }: DailySummaryProps) {
  const sodiumBreached = totals.sodium > TARGETS.sodiumLimit;
  const sodiumPct = (totals.sodium / TARGETS.sodiumLimit) * 100;
  const potassiumPct = (totals.potassium / TARGETS.potassiumMin) * 100;
  const cardioZero = (log?.cardio_calories ?? 0) === 0;

  const netCalories = totals.calories - (log?.cardio_calories ?? 0);
  const calorieDeficit = TARGETS.calories - netCalories;

  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-4">
        <h2 className="section-title">الملخّص اليومي والمعادن</h2>
        <p className="section-subtitle mt-0.5">حلّل تقدّمك نحو أهداف الماكروز والأملاح</p>
      </div>

      {/* Macro rings */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <RingCard
          label="السعرات الحرارية"
          value={totals.calories}
          max={TARGETS.calories}
          unit="كcal"
          color="#10e0a0"
        />
        <RingCard
          label="البروتين"
          value={totals.protein}
          max={TARGETS.protein}
          unit="جم"
          color="#22d3ee"
          target={`المستهدف: ${toArabicDigits(TARGETS.protein)} جم`}
        />
        <RingCard
          label="الكربوهيدرات"
          value={totals.carbs}
          max={TARGETS.carbs}
          unit="جم"
          color="#fbbf24"
          target={`المستهدف: ${toArabicDigits(TARGETS.carbs)} جم`}
        />
        <RingCard
          label="الدهون الصحية"
          value={totals.fats}
          max={TARGETS.fats}
          unit="جم"
          color="#fb7185"
          target={`المستهدف: ${toArabicDigits(TARGETS.fats)} جم`}
        />
      </div>

      {/* Net calories / deficit strip */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile
          label="السعرات الصافية"
          value={`${toArabicDigits(netCalories)} كcal`}
          sub="بعد طرح الكارديو"
          icon={<Flame className="h-4 w-4 text-emerald-400" />}
        />
        <StatTile
          label="العجز اليومي"
          value={`${toArabicDigits(Math.max(0, calorieDeficit))} كcal`}
          sub={calorieDeficit < 0 ? 'تجاوزت السعرات!' : 'تحت الحد المستهدف'}
          icon={<Activity className="h-4 w-4 text-cyan-400" />}
          warn={calorieDeficit < 0}
        />
        <StatTile
          label="حرق الكارديو"
          value={`${toArabicDigits(log?.cardio_calories ?? 0)} كcal`}
          sub={`المستهدف: ${toArabicDigits(TARGETS.cardioCalories)}`}
          icon={<Zap className="h-4 w-4 text-amber-400" />}
        />
      </div>

      {/* Cardio smart alert */}
      {cardioZero && !isFuture && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-300">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>نصيحة: أضف ٥٠٠ سعرة حرق حركي/كارديو لتأمين العجز اليومي بالكامل!</span>
        </div>
      )}

      {/* Fluid & Electrolyte Balance */}
      <div className="mt-5">
        <div className="mb-3 flex items-center gap-2">
          <Droplets className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-extrabold text-slate-100">توازن السوائل والأملاح</h3>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {/* Sodium tracker */}
          <div
            className={`relative overflow-hidden rounded-2xl border p-4 transition-all ${
              sodiumBreached
                ? 'border-amber-400/50 bg-amber-500/10 shadow-neon-amber'
                : 'border-emerald-400/30 bg-emerald-500/5'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${sodiumBreached ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                  <AlertTriangle className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-sm font-bold text-slate-100">الصوديوم</div>
                  <div className="text-[10px] font-semibold text-slate-400">
                    الحد اليومي: {toArabicDigits(TARGETS.sodiumLimit)} ملجم
                  </div>
                </div>
              </div>
              <div className="text-left">
                <div className={`font-display text-xl font-extrabold ${sodiumBreached ? 'text-amber-300' : 'text-emerald-300'}`}>
                  {toArabicDigits(totals.sodium)}
                </div>
                <div className="text-[10px] font-semibold text-slate-500">ملجم</div>
              </div>
            </div>

            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-[10px] font-semibold">
                <span className="text-slate-400">التقدّم نحو الحد</span>
                <span className={sodiumBreached ? 'text-amber-300' : 'text-emerald-300'}>
                  {toArabicDigits(Math.round(sodiumPct))}٪
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/5">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    sodiumBreached
                      ? 'bg-gradient-to-l from-amber-400 to-rose-500'
                      : 'bg-gradient-to-l from-emerald-400 to-cyan-400'
                  }`}
                  style={{ width: `${Math.min(100, sodiumPct)}%` }}
                />
              </div>
              <div className="mt-1 text-[10px] font-semibold text-slate-500">
                الحد: {toArabicDigits(TARGETS.sodiumLimit)} ملجم
              </div>
            </div>

            {sodiumBreached && (
              <div className="mt-3 animate-slide-up rounded-lg border border-amber-400/40 bg-amber-500/15 px-3 py-2 text-xs font-bold text-amber-200">
                تم تجاوز حد الصوديوم! خطر عالي لاحتباس السوائل في الوجه. اشرب ماء فوراً!
              </div>
            )}
          </div>

          {/* Potassium tracker */}
          <div className="relative overflow-hidden rounded-2xl border border-cyan-400/30 bg-cyan-500/5 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300">
                  <Droplets className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-sm font-bold text-slate-100">البوتاسيوم</div>
                  <div className="text-[10px] font-semibold text-slate-400">
                    المستهدف: {toArabicDigits(TARGETS.potassiumMin)}-{toArabicDigits(TARGETS.potassiumMax)} ملجم
                  </div>
                </div>
              </div>
              <div className="text-left">
                <div className="font-display text-xl font-extrabold text-cyan-300">
                  {toArabicDigits(totals.potassium)}
                </div>
                <div className="text-[10px] font-semibold text-slate-500">ملجم</div>
              </div>
            </div>

            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-[10px] font-semibold">
                <span className="text-slate-400">نسبة الاستهلاك الكافي</span>
                <span className="text-cyan-300">{toArabicDigits(Math.round(potassiumPct))}٪</span>
              </div>
              <div className="relative h-2.5 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-gradient-to-l from-cyan-400 to-emerald-400 transition-all duration-700"
                  style={{ width: `${Math.min(100, potassiumPct)}%` }}
                />
                {/* Min marker */}
                <div
                  className="absolute top-0 h-full w-0.5 bg-white/30"
                  style={{ right: '0%' }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px] font-semibold text-slate-500">
                <span>الحد الأدنى: {toArabicDigits(TARGETS.potassiumMin)} ملجم</span>
                <span>الأقصى: {toArabicDigits(TARGETS.potassiumMax)} ملجم</span>
              </div>
            </div>

            {totals.potassium < TARGETS.potassiumMin && totals.potassium > 0 && (
              <div className="mt-3 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-[11px] font-semibold text-cyan-200">
                البوتاسيوم يساعد على طرد الماء الزائد — استهدف {toArabicDigits(TARGETS.potassiumMin)} ملجم يومياً.
              </div>
            )}
          </div>
        </div>

        {/* Water + sodium balance hint */}
        <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-white/5 bg-ink-900/50 px-4 py-2.5 text-[11px] font-semibold text-slate-400">
          <Droplets className="h-3.5 w-3.5 text-cyan-400" />
          شرب الماء: {toArabicDigits(log?.water_liters ?? 0)} / {toArabicDigits(TARGETS.waterLiters)} لتر —
          الماء يطرد الصوديوم الزائد ويمنع احتباس السوائل.
        </div>
      </div>
    </section>
  );
}

function RingCard({
  label,
  value,
  max,
  unit,
  color,
  target,
}: {
  label: string;
  value: number;
  max: number;
  unit: string;
  color: string;
  target?: string;
}) {
  const over = value > max;
  return (
    <div className="flex flex-col items-center rounded-2xl border border-white/5 bg-ink-900/50 p-3 text-center sm:p-4">
      <ProgressRing
        value={value}
        max={max}
        size={108}
        stroke={10}
        color={color}
        unit={unit}
        warning={over}
      />
      <div className="mt-2 text-xs font-bold text-slate-200">{label}</div>
      {target && <div className="mt-0.5 text-[10px] font-medium text-slate-500">{target}</div>}
    </div>
  );
}

function StatTile({
  label,
  value,
  sub,
  icon,
  warn = false,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  warn?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        warn ? 'border-rose-400/30 bg-rose-500/5' : 'border-white/5 bg-ink-900/50'
      }`}
    >
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
        {icon}
        {label}
      </div>
      <div className={`mt-1 font-display text-lg font-extrabold ${warn ? 'text-rose-300' : 'text-white'}`}>
        {value}
      </div>
      <div className="text-[10px] font-medium text-slate-500">{sub}</div>
    </div>
  );
}
