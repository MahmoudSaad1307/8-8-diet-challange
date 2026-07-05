import { useEffect, useState } from 'react';
import { Target, Calendar, TrendingDown, Flame, Scale } from 'lucide-react';
import {
  GOAL_DATE,
  START_WEIGHT_KG,
  TARGET_WEIGHT_KG,
  toArabicDigits,
  formatArabicDate,
  daysBetween,
  startOfDay,
} from '../lib/constants';

interface HeaderProps {
  currentWeight: number | null;
}

function useCountdown() {
  const [remaining, setRemaining] = useState(() => calcRemaining());
  useEffect(() => {
    const id = setInterval(() => setRemaining(calcRemaining()), 1000);
    return () => clearInterval(id);
  }, []);
  return remaining;
}

function calcRemaining() {
  const now = new Date();
  const diff = GOAL_DATE.getTime() - now.getTime();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
  }
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    done: false,
  };
}

export function Header({ currentWeight }: HeaderProps) {
  const r = useCountdown();
  const totalDays = daysBetween(startOfDay(new Date()), GOAL_DATE);
  const elapsed = totalDays - r.days;
  const timeProgress = Math.max(0, Math.min(100, (elapsed / totalDays) * 100));

  const weight = currentWeight ?? START_WEIGHT_KG;
  const weightLost = Math.max(0, START_WEIGHT_KG - weight);
  const weightToLose = START_WEIGHT_KG - TARGET_WEIGHT_KG;
  const weightProgress = Math.max(0, Math.min(100, (weightLost / weightToLose) * 100));

  return (
    <header className="relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-40" aria-hidden />
      <div
        className="absolute -top-24 right-1/2 h-72 w-72 translate-x-1/2 rounded-full bg-emerald-500/20 blur-[120px]"
        aria-hidden
      />
      <div
        className="absolute -top-16 left-10 h-56 w-56 rounded-full bg-cyan-500/15 blur-[100px]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-4 pb-6 pt-8 sm:px-6 sm:pt-10">
        {/* Brand row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-ink-950 shadow-neon-emerald">
              <Flame className="h-6 w-6" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="font-display text-lg font-extrabold leading-tight text-white sm:text-xl">
                تحدّي التنشيف
              </h1>
              <p className="text-[11px] font-semibold text-emerald-300/80 sm:text-xs">
                رحلة الوصول إلى ٦٥ كجم
              </p>
            </div>
          </div>
          <div className="chip border border-emerald-400/30 bg-emerald-500/10 text-emerald-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            مباشر
          </div>
        </div>

        {/* Goal date + countdown */}
        <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="card p-5 sm:p-6">
            <div className="flex items-center gap-2 text-emerald-300">
              <Calendar className="h-4 w-4" />
              <span className="text-xs font-bold">تاريخ الهدف</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-display text-3xl font-extrabold text-white sm:text-4xl">
                ٨ أغسطس ٢٠٢٦
              </span>
            </div>

            <div className="mt-5 grid grid-cols-4 gap-2 sm:gap-3">
              <CountdownCell value={r.days} label="يوم" accent="emerald" big />
              <CountdownCell value={r.hours} label="ساعة" accent="cyan" />
              <CountdownCell value={r.minutes} label="دقيقة" accent="cyan" />
              <CountdownCell value={r.seconds} label="ثانية" accent="amber" pulse />
            </div>

            {/* Time progress */}
            <div className="mt-5">
              <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-slate-400">
                <span>تقدّم المدة</span>
                <span className="text-emerald-300">{toArabicDigits(Math.round(timeProgress))}٪</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-gradient-to-l from-emerald-400 to-cyan-400 transition-all duration-700"
                  style={{ width: `${timeProgress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Weight progress */}
          <div className="card p-5 sm:p-6">
            <div className="flex items-center gap-2 text-cyan-300">
              <Scale className="h-4 w-4" />
              <span className="text-xs font-bold">تقدّم الوزن</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-display text-3xl font-extrabold text-white">
                {toArabicDigits(weight.toFixed(1))}
              </span>
              <span className="text-sm font-semibold text-slate-400">كجم</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                من {toArabicDigits(START_WEIGHT_KG)} إلى {toArabicDigits(TARGET_WEIGHT_KG)} كجم
              </span>
              <span className="font-bold text-emerald-300">{toArabicDigits(Math.round(weightProgress))}٪</span>
            </div>

            <div className="mt-4 space-y-2">
              <Bar
                label="الوزن المفقود"
                value={weightLost}
                max={weightToLose}
                color="emerald"
                unit="كجم"
              />
              <div className="flex items-center justify-between text-[11px] font-semibold">
                <span className="flex items-center gap-1 text-slate-400">
                  <TrendingDown className="h-3 w-3" />
                  المتبقي
                </span>
                <span className="text-emerald-300">
                  {toArabicDigits(Math.max(0, weight - TARGET_WEIGHT_KG).toFixed(1))} كجم
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Today strip */}
        <div className="mt-4 flex items-center justify-between rounded-xl border border-white/5 bg-ink-850/60 px-4 py-2.5 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Target className="h-3.5 w-3.5 text-emerald-400" />
            <span className="font-semibold">اليوم</span>
            <span className="text-slate-400">·</span>
            <span className="font-bold text-white">{formatArabicDate(new Date())}</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-300">
            <span className="font-bold">{toArabicDigits(r.days)}</span>
            <span className="text-slate-400">يوم متبقٍ</span>
          </div>
        </div>
      </div>
    </header>
  );
}

function CountdownCell({
  value,
  label,
  accent,
  big = false,
  pulse = false,
}: {
  value: number;
  label: string;
  accent: 'emerald' | 'cyan' | 'amber';
  big?: boolean;
  pulse?: boolean;
}) {
  const colorMap = {
    emerald: 'text-emerald-300 border-emerald-400/20 bg-emerald-500/5',
    cyan: 'text-cyan-300 border-cyan-400/20 bg-cyan-500/5',
    amber: 'text-amber-300 border-amber-400/20 bg-amber-500/5',
  };
  return (
    <div
      className={`rounded-xl border ${colorMap[accent]} px-2 py-3 text-center ${pulse ? 'animate-pulse-glow' : ''}`}
    >
      <div className={`font-display font-extrabold leading-none ${big ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'}`}>
        {toArabicDigits(String(value).padStart(2, '0'))}
      </div>
      <div className="mt-1.5 text-[10px] font-semibold text-slate-400">{label}</div>
    </div>
  );
}

function Bar({
  label,
  value,
  max,
  color,
  unit,
}: {
  label: string;
  value: number;
  max: number;
  color: 'emerald' | 'cyan' | 'amber';
  unit: string;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const grad = {
    emerald: 'from-emerald-400 to-emerald-500',
    cyan: 'from-cyan-400 to-cyan-500',
    amber: 'from-amber-400 to-amber-500',
  }[color];
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-slate-400">
        <span>{label}</span>
        <span className="text-slate-200">
          {toArabicDigits(value.toFixed(1))} / {toArabicDigits(max.toFixed(1))} {unit}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/5">
        <div
          className={`h-full rounded-full bg-gradient-to-l ${grad} transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
