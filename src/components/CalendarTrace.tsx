import { useMemo, useRef, useEffect, forwardRef } from 'react';
import {
  Dumbbell,
  Flame,
  Scale,
  AlertTriangle,
  Circle,
  Lock,
} from 'lucide-react';
import type { CalendarDayStatus } from '../lib/types';
import {
  ARABIC_WEEKDAYS_SHORT,
  ARABIC_MONTHS,
  toArabicDigits,
  parseDateKey,
} from '../lib/constants';

interface CalendarTraceProps {
  days: CalendarDayStatus[];
  selectedDate: string;
  onSelect: (date: string) => void;
  showPastDays?: boolean;
  onTogglePastDays?: (show: boolean) => void;
}

export function CalendarTrace({
  days,
  selectedDate,
  onSelect,
  showPastDays = false,
  onTogglePastDays,
}: CalendarTraceProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (selectedRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const el = selectedRef.current;
      const offset = el.offsetLeft - container.clientWidth / 2 + el.clientWidth / 2;
      container.scrollTo({ left: Math.max(0, offset), behavior: 'smooth' });
    }
  }, []);

  const months = useMemo(() => {
    const map = new Map<string, CalendarDayStatus[]>();
    for (const d of days) {
      const date = parseDateKey(d.date);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    }
    return Array.from(map.entries()).map(([key, list]) => {
      const [y, m] = key.split('-').map(Number);
      return { year: y, month: m, label: `${ARABIC_MONTHS[m]} ${toArabicDigits(y)}`, days: list };
    });
  }, [days]);

  if (days.length === 0) return null;

  return (
    <section className="card p-4 sm:p-5">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="section-title">جدول التتبع اليومي</h2>
          <p className="section-subtitle mt-0.5">
            {showPastDays ? 'من ٥ يوليو حتى ٨ أغسطس ٢٠٢٦' : 'من اليوم حتى ٨ أغسطس ٢٠٢٦'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-[10px] font-semibold text-slate-400 sm:gap-6">
          <label className="flex cursor-pointer items-center gap-2 text-[11px] font-bold text-slate-300">
            <input
              type="checkbox"
              checked={showPastDays}
              onChange={(e) => onTogglePastDays?.(e.target.checked)}
              className="sr-only peer"
            />
            <div className="relative h-5 w-9 rounded-full bg-slate-700 after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:bg-emerald-500 peer-checked:after:translate-x-full" />
            <span>عرض الأيام السابقة (من ٥ يوليو)</span>
          </label>

          <div className="hidden h-4 w-px bg-white/10 sm:block" />

          <div className="flex items-center gap-3">
            <LegendDot color="emerald" label="مكتمل" />
            <LegendDot color="amber" label="تجاوز الصوديوم" />
            <LegendDot color="slate" label="قيد التنفيذ" />
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="scrollbar-thin -mx-2 flex gap-5 overflow-x-auto px-2 pb-2"
        dir="rtl"
      >
        {months.map((month) => (
          <div key={`${month.year}-${month.month}`} className="shrink-0">
            <div className="mb-2 px-1 text-xs font-bold text-slate-300">{month.label}</div>
            <div className="grid grid-cols-7 gap-1.5">
              {month.days.map((d) => (
                <DayCard
                  key={d.date}
                  day={d}
                  selected={d.date === selectedDate}
                  onSelect={onSelect}
                  ref={d.date === selectedDate ? selectedRef : undefined}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

interface DayCardProps {
  day: CalendarDayStatus;
  selected: boolean;
  onSelect: (date: string) => void;
}

const DayCard = forwardRef<HTMLButtonElement, DayCardProps>(function DayCard(
  { day, selected, onSelect },
  ref,
) {
  const date = parseDateKey(day.date);
  const weekday = ARABIC_WEEKDAYS_SHORT[date.getDay()];
  const dayNum = date.getDate();

  const isComplete =
    day.hasLog && day.resistance_done && day.cardio_calories > 0 && !day.sodiumBreached;

  const ringClass = selected
    ? 'border-emerald-400/70 bg-emerald-500/10 shadow-neon-emerald'
    : day.isFuture
      ? 'border-white/5 bg-ink-900/40'
      : day.sodiumBreached
        ? 'border-amber-400/40 bg-amber-500/5'
        : isComplete
          ? 'border-emerald-400/30 bg-emerald-500/5'
          : 'border-white/5 bg-ink-850/60 hover:border-white/10';

  return (
    <button
      ref={ref}
      onClick={() => onSelect(day.date)}
      className={`group relative flex h-20 w-12 flex-col items-center justify-between rounded-lg border px-1 py-1.5 transition-all duration-200 sm:h-24 sm:w-14 ${ringClass}`}
    >
      <div className="flex w-full items-center justify-between">
        <span className="text-[9px] font-semibold text-slate-400">{weekday}</span>
        {day.isToday && (
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-neon-emerald" />
        )}
      </div>

      <span
        className={`font-display text-base font-extrabold leading-none ${
          day.isFuture ? 'text-slate-600' : selected ? 'text-white' : 'text-slate-200'
        }`}
      >
        {toArabicDigits(dayNum)}
      </span>

      {day.isFuture ? (
        <Lock className="h-3 w-3 text-slate-700" />
      ) : (
        <div className="grid w-full grid-cols-2 gap-0.5 text-center">
          <StatusIcon
            active={day.resistance_done}
            icon={<Dumbbell className="h-2.5 w-2.5" />}
            activeColor="text-emerald-400"
          />
          <StatusIcon
            active={day.cardio_calories > 0}
            icon={<Flame className="h-2.5 w-2.5" />}
            activeColor="text-cyan-400"
          />
          <StatusIcon
            active={day.weight_kg !== null}
            icon={<Scale className="h-2.5 w-2.5" />}
            activeColor="text-emerald-300"
          />
          <StatusIcon
            active={day.sodiumBreached}
            icon={<AlertTriangle className="h-2.5 w-2.5" />}
            activeColor="text-amber-400"
            warn
          />
        </div>
      )}
    </button>
  );
});

function StatusIcon({
  active,
  icon,
  activeColor,
  warn = false,
}: {
  active: boolean;
  icon: React.ReactNode;
  activeColor: string;
  warn?: boolean;
}) {
  if (active) {
    return <span className={warn ? 'text-amber-400' : activeColor}>{icon}</span>;
  }
  return <Circle className="h-2.5 w-2.5 text-slate-700" strokeWidth={2} />;
}

function LegendDot({ color, label }: { color: 'emerald' | 'amber' | 'slate'; label: string }) {
  const map = {
    emerald: 'bg-emerald-400',
    amber: 'bg-amber-400',
    slate: 'bg-slate-600',
  };
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${map[color]}`} />
      {label}
    </span>
  );
}
