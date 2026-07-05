import { useState, useEffect } from 'react';
import { Scale, Dumbbell, Flame, Droplets, Plus, Minus, Check, X } from 'lucide-react';
import type { DailyLog } from '../lib/types';
import { TARGETS, toArabicDigits } from '../lib/constants';

interface DailyLogPanelProps {
  log: DailyLog | null;
  dateKey: string;
  isFuture: boolean;
  isToday: boolean;
  onChange: (patch: Partial<DailyLog>) => Promise<void>;
}

export function DailyLogPanel({ log, dateKey, isFuture, isToday, onChange }: DailyLogPanelProps) {
  const [weightInput, setWeightInput] = useState<string>(log?.weight_kg ? String(log.weight_kg) : '');
  const [cardioInput, setCardioInput] = useState<string>(String(log?.cardio_calories ?? 0));
  const [waterInput, setWaterInput] = useState<string>(String(log?.water_liters ?? 0));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setWeightInput(log?.weight_kg ? String(log.weight_kg) : '');
    setCardioInput(String(log?.cardio_calories ?? 0));
    setWaterInput(String(log?.water_liters ?? 0));
  }, [log?.id, log?.weight_kg, log?.cardio_calories, log?.water_liters, dateKey]);

  const disabled = isFuture;

  const handleWeightSave = async () => {
    if (disabled) return;
    const v = parseFloat(weightInput);
    if (Number.isNaN(v) || v <= 0) return;
    setSaving(true);
    try {
      await onChange({ weight_kg: v });
    } finally {
      setSaving(false);
    }
  };

  const handleCardioSave = async () => {
    if (disabled) return;
    const v = Math.max(0, parseInt(cardioInput) || 0);
    setSaving(true);
    try {
      await onChange({ cardio_calories: v });
    } finally {
      setSaving(false);
    }
  };

  const toggleResistance = async () => {
    if (disabled) return;
    setSaving(true);
    try {
      await onChange({ resistance_done: !log?.resistance_done });
    } finally {
      setSaving(false);
    }
  };

  const adjustWater = async (delta: number) => {
    if (disabled) return;
    const current = parseFloat(waterInput) || 0;
    const next = Math.max(0, Math.round((current + delta) * 10) / 10);
    setWaterInput(String(next));
    setSaving(true);
    try {
      await onChange({ water_liters: next });
    } finally {
      setSaving(false);
    }
  };

  const waterPct = Math.min(100, ((parseFloat(waterInput) || 0) / TARGETS.waterLiters) * 100);
  const resistanceDone = log?.resistance_done ?? false;

  return (
    <section className={`card p-5 sm:p-6 ${disabled ? 'opacity-50' : ''}`}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="section-title">لوحة التسجيل اليومي</h2>
          <p className="section-subtitle mt-0.5">
            {isFuture ? 'لا يمكن التسجيل في تاريخ مستقبلي' : 'سجّل قراءاتك الصباحية والتمارين'}
          </p>
        </div>
        {saving && (
          <span className="chip border border-cyan-400/30 bg-cyan-500/10 text-cyan-300">
            <span className="h-1.5 w-1.5 animate-ping rounded-full bg-cyan-400" />
            جارٍ الحفظ
          </span>
        )}
      </div>

      {/* Morning weight — prominent top input */}
      <div className="rounded-2xl border border-emerald-400/20 bg-gradient-to-bl from-emerald-500/10 to-transparent p-4">
        <div className="flex items-center gap-2 text-emerald-300">
          <Scale className="h-4 w-4" />
          <label className="text-sm font-bold">الوزن الصباحي (كجم)</label>
        </div>
        <p className="mt-0.5 text-[11px] text-slate-400">يُقاس فور الاستيقاظ قبل الإفطار</p>
        <div className="mt-3 flex items-stretch gap-2">
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            min="40"
            max="120"
            value={weightInput}
            disabled={disabled}
            onChange={(e) => setWeightInput(e.target.value)}
            onBlur={handleWeightSave}
            onKeyDown={(e) => e.key === 'Enter' && handleWeightSave()}
            placeholder="٠٫٠"
            className="input font-display text-2xl font-extrabold tracking-tight"
            dir="ltr"
          />
          <button
            onClick={handleWeightSave}
            disabled={disabled || !weightInput}
            className="btn-primary shrink-0 px-4"
          >
            <Check className="h-4 w-4" />
            حفظ
          </button>
        </div>
        {log?.weight_kg && (
          <div className="mt-2 text-[11px] font-semibold text-emerald-300/80">
            آخر تسجيل: {toArabicDigits(log.weight_kg)} كجم
          </div>
        )}
      </div>

      {/* Workout logging */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {/* Resistance toggle */}
        <div className="rounded-xl border border-white/5 bg-ink-900/50 p-4">
          <div className="flex items-center gap-2 text-slate-300">
            <Dumbbell className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-bold">تمارين المقاومة</span>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={toggleResistance}
              disabled={disabled}
              className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-bold transition-all ${
                resistanceDone
                  ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-300 shadow-neon-emerald'
                  : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              {resistanceDone ? (
                <span className="flex items-center justify-center gap-1.5">
                  <Check className="h-4 w-4" /> تم
                </span>
              ) : (
                <span className="flex items-center justify-center gap-1.5">
                  <X className="h-4 w-4" /> لم يتم
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Cardio calories */}
        <div className="rounded-xl border border-white/5 bg-ink-900/50 p-4">
          <div className="flex items-center gap-2 text-slate-300">
            <Flame className="h-4 w-4 text-cyan-400" />
            <span className="text-sm font-bold">السعرات المحروقة في الكارديو</span>
          </div>
          <div className="mt-3 flex items-stretch gap-2">
            <input
              type="number"
              inputMode="numeric"
              min="0"
              step="50"
              value={cardioInput}
              disabled={disabled}
              onChange={(e) => setCardioInput(e.target.value)}
              onBlur={handleCardioSave}
              onKeyDown={(e) => e.key === 'Enter' && handleCardioSave()}
              placeholder="٠"
              className="input font-display text-lg font-bold"
              dir="ltr"
            />
            <span className="flex items-center text-xs font-semibold text-slate-400">كcal</span>
          </div>
          <div className="mt-2 text-[11px] font-semibold text-cyan-300/80">
            المستهدف: {toArabicDigits(TARGETS.cardioCalories)} سعرة
          </div>
        </div>
      </div>

      {/* Water intake */}
      <div className="mt-3 rounded-xl border border-white/5 bg-ink-900/50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-300">
            <Droplets className="h-4 w-4 text-cyan-400" />
            <span className="text-sm font-bold">معدل شرب الماء</span>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            المستهدف: {toArabicDigits(TARGETS.waterLiters)} لتر
          </span>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={() => adjustWater(-0.25)}
            disabled={disabled}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10 active:scale-95 disabled:opacity-40"
          >
            <Minus className="h-4 w-4" />
          </button>
          <div className="relative flex-1">
            <div className="h-12 overflow-hidden rounded-xl border border-white/10 bg-ink-950">
              <div
                className="h-full rounded-xl bg-gradient-to-l from-cyan-400 to-cyan-500 transition-all duration-500"
                style={{ width: `${waterPct}%` }}
              />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-display text-lg font-extrabold text-white drop-shadow">
                {toArabicDigits(parseFloat(waterInput) || 0)} لتر
              </span>
            </div>
          </div>
          <button
            onClick={() => adjustWater(0.25)}
            disabled={disabled}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/40 bg-cyan-500/15 text-cyan-300 transition hover:bg-cyan-500/25 active:scale-95 disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] font-semibold">
          <span className="text-slate-400">التقدّم اليومي</span>
          <span className={waterPct >= 100 ? 'text-emerald-300' : 'text-cyan-300'}>
            {toArabicDigits(Math.round(waterPct))}٪
          </span>
        </div>
      </div>

      {isToday && (
        <div className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-500/5 px-4 py-2.5 text-[11px] font-semibold text-emerald-300/90">
          نصيحة: سجّل وزنك الصباحي يومياً في نفس التوقيت وبعد دورة المياه مباشرة للحصول على قراءة دقيقة.
        </div>
      )}
    </section>
  );
}
