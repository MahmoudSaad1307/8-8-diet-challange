import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  RotateCcw,
  Calendar,
  Scale,
  Flame,
  Droplets,
  Zap,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useConfig } from '../contexts/ConfigContext';
import { DEFAULT_CHALLENGE_CONFIG, parseDateKey, daysBetween, toArabicDigits } from '../lib/constants';
import type { ChallengeConfig } from '../lib/types';

interface SettingsDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsDashboard({ isOpen, onClose }: SettingsDashboardProps) {
  const { config, updateConfig } = useConfig();
  const [formData, setFormData] = useState<ChallengeConfig>(config);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  // Sync form when config updates or modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData(config);
      setErrorMessage(null);
      setSavedSuccess(false);
      setConfirmReset(false);
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  // Calculate challenge stats dynamically
  const startD = parseDateKey(formData.startDate);
  const goalD = parseDateKey(formData.goalDate);
  const totalDays = Math.max(0, daysBetween(startD, goalD));
  const weightDiff = Math.max(0, formData.startWeightKg - formData.targetWeightKg);
  const weeks = totalDays > 0 ? totalDays / 7 : 0;
  const weeklyLoss = weeks > 0 ? (weightDiff / weeks).toFixed(2) : '0';

  const handleInputChange = (field: keyof Omit<ChallengeConfig, 'targets'>, val: unknown) => {
    setFormData((prev) => ({
      ...prev,
      [field]: val,
    }));
    setErrorMessage(null);
  };

  const handleTargetChange = (field: keyof ChallengeConfig['targets'], val: number) => {
    setFormData((prev) => ({
      ...prev,
      targets: {
        ...prev.targets,
        [field]: val,
      },
    }));
    setErrorMessage(null);
  };

  const handleResetRequest = () => setConfirmReset(true);

  const handleResetConfirm = () => {
    setFormData(DEFAULT_CHALLENGE_CONFIG);
    setErrorMessage(null);
    setConfirmReset(false);
  };

  const handleResetCancel = () => setConfirmReset(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    if (!formData.startDate || !formData.goalDate) {
      setErrorMessage('يرجى تحديد تاريخ البداية وتاريخ الهدف.');
      return;
    }

    if (new Date(formData.goalDate) < new Date(formData.startDate)) {
      setErrorMessage('تاريخ الهدف يجب أن يكون بعد تاريخ البداية.');
      return;
    }

    if (formData.startWeightKg <= 0 || formData.targetWeightKg <= 0) {
      setErrorMessage('يرجى إدخال أوزان صحيحة وموجبة.');
      return;
    }

    if (formData.targetWeightKg >= formData.startWeightKg) {
      setErrorMessage('الوزن المستهدف يجب أن يكون أقل من وزن البداية في خطة التنشيف.');
      return;
    }

    try {
      setIsSaving(true);
      await updateConfig(formData);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 700);
    } catch (err) {
      setErrorMessage('حدث خطأ أثناء حفظ الإعدادات: ' + String(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink-950/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-ink-900 p-5 shadow-2xl shadow-emerald-950/40 scrollbar-thin sm:p-7">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-ink-950 shadow-neon-emerald">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-black text-white sm:text-xl">
                لوحة التحكم وتخصيص التحدي
              </h2>
              <p className="text-xs text-slate-400">
                تعديل التواريخ والأوزان المستهدفة وكافة أهداف التغذية والنشاط
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Dynamic Calculation Stats Banner */}
        <div className="mt-5 grid grid-cols-3 gap-2.5 rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-3.5 text-center">
          <div>
            <div className="text-[10px] font-bold text-slate-400">مدة التحدي الكلية</div>
            <div className="font-display text-base font-extrabold text-emerald-300">
              {toArabicDigits(totalDays)} يوم
            </div>
          </div>
          <div className="border-x border-white/10">
            <div className="text-[10px] font-bold text-slate-400">إجمالي النزول المطلوب</div>
            <div className="font-display text-base font-extrabold text-cyan-300">
              {toArabicDigits(weightDiff.toFixed(1))} كجم
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400">معدل النزول الأسبوعي</div>
            <div className="font-display text-base font-extrabold text-amber-300">
              ~ {toArabicDigits(weeklyLoss)} كجم/أسبوع
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-bold text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {savedSuccess && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-bold text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>تم حفظ الإعدادات بنجاح! جارٍ التحديث...</span>
          </div>
        )}

        {/* Settings Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Section 1: Challenge Dates & Weights */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
              <Calendar className="h-4 w-4" />
              <span>التواريخ والأوزان الأساسية</span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-300">
                  تاريخ بداية التحدي
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-ink-850 px-3.5 py-2.5 text-sm font-semibold text-white outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-300">
                  تاريخ الهدف (نهاية التحدي)
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={formData.goalDate}
                    onChange={(e) => handleInputChange('goalDate', e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-ink-850 px-3.5 py-2.5 text-sm font-semibold text-white outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-300">
                  وزن البداية (كجم)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="20"
                    max="250"
                    required
                    value={formData.startWeightKg}
                    onChange={(e) => handleInputChange('startWeightKg', parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-white/10 bg-ink-850 px-3.5 py-2.5 text-sm font-semibold text-white outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                  />
                  <Scale className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-300">
                  الوزن المستهدف (كجم)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="20"
                    max="250"
                    required
                    value={formData.targetWeightKg}
                    onChange={(e) => handleInputChange('targetWeightKg', parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-white/10 bg-ink-850 px-3.5 py-2.5 text-sm font-semibold text-white outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  />
                  <Scale className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Daily Nutrition & Macros */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
              <Flame className="h-4 w-4" />
              <span>الأهداف الغذائية اليومية والماكروز</span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-300">
                  السعرات (kcal)
                </label>
                <input
                  type="number"
                  min="500"
                  max="6000"
                  required
                  value={formData.targets.calories}
                  onChange={(e) => handleTargetChange('calories', parseInt(e.target.value) || 0)}
                  className="w-full rounded-xl border border-white/10 bg-ink-850 px-3 py-2 text-sm font-bold text-white outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-300">
                  البروتين (جرام)
                </label>
                <input
                  type="number"
                  min="20"
                  max="500"
                  required
                  value={formData.targets.protein}
                  onChange={(e) => handleTargetChange('protein', parseInt(e.target.value) || 0)}
                  className="w-full rounded-xl border border-white/10 bg-ink-850 px-3 py-2 text-sm font-bold text-white outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-300">
                  الكاربوهيدرات (جرام)
                </label>
                <input
                  type="number"
                  min="0"
                  max="800"
                  required
                  value={formData.targets.carbs}
                  onChange={(e) => handleTargetChange('carbs', parseInt(e.target.value) || 0)}
                  className="w-full rounded-xl border border-white/10 bg-ink-850 px-3 py-2 text-sm font-bold text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-300">
                  الدهون (جرام)
                </label>
                <input
                  type="number"
                  min="10"
                  max="300"
                  required
                  value={formData.targets.fats}
                  onChange={(e) => handleTargetChange('fats', parseInt(e.target.value) || 0)}
                  className="w-full rounded-xl border border-white/10 bg-ink-850 px-3 py-2 text-sm font-bold text-white outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-300">
                  حد الصوديوم الأقصى (مج)
                </label>
                <input
                  type="number"
                  min="500"
                  max="10000"
                  required
                  value={formData.targets.sodiumLimit}
                  onChange={(e) => handleTargetChange('sodiumLimit', parseInt(e.target.value) || 0)}
                  className="w-full rounded-xl border border-white/10 bg-ink-850 px-3 py-2 text-sm font-bold text-white outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-300">
                  أدنى بوتاسيوم (مج)
                </label>
                <input
                  type="number"
                  min="1000"
                  max="8000"
                  required
                  value={formData.targets.potassiumMin}
                  onChange={(e) => handleTargetChange('potassiumMin', parseInt(e.target.value) || 0)}
                  className="w-full rounded-xl border border-white/10 bg-ink-850 px-3 py-2 text-sm font-bold text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-300">
                  أقصى بوتاسيوم (مج)
                </label>
                <input
                  type="number"
                  min="1000"
                  max="10000"
                  required
                  value={formData.targets.potassiumMax}
                  onChange={(e) => handleTargetChange('potassiumMax', parseInt(e.target.value) || 0)}
                  className="w-full rounded-xl border border-white/10 bg-ink-850 px-3 py-2 text-sm font-bold text-white outline-none focus:border-cyan-400"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Water & Cardio */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
              <Zap className="h-4 w-4" />
              <span>أهداف الماء والنشاط الرياضي</span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-300">
                  الماء اليومي (لتر)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.25"
                    min="1"
                    max="10"
                    required
                    value={formData.targets.waterLiters}
                    onChange={(e) => handleTargetChange('waterLiters', parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-white/10 bg-ink-850 px-3.5 py-2.5 text-sm font-semibold text-white outline-none focus:border-cyan-400"
                  />
                  <Droplets className="absolute left-3 top-3 h-4 w-4 text-cyan-400" />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-300">
                  هدف حرق الكارديو اليومي (kcal)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="2000"
                    step="50"
                    required
                    value={formData.targets.cardioCalories}
                    onChange={(e) => handleTargetChange('cardioCalories', parseInt(e.target.value) || 0)}
                    className="w-full rounded-xl border border-white/10 bg-ink-850 px-3.5 py-2.5 text-sm font-semibold text-white outline-none focus:border-emerald-400"
                  />
                  <Flame className="absolute left-3 top-3 h-4 w-4 text-emerald-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
            {confirmReset ? (
              <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5">
                <span className="text-xs font-semibold text-rose-300">هل أنت متأكد؟</span>
                <button
                  type="button"
                  onClick={handleResetConfirm}
                  className="rounded-lg border border-rose-500/40 bg-rose-500/20 px-2.5 py-1 text-xs font-bold text-rose-200 hover:bg-rose-500/30"
                >
                  تأكيد الاستعادة
                </button>
                <button
                  type="button"
                  onClick={handleResetCancel}
                  className="rounded-lg px-2.5 py-1 text-xs font-bold text-slate-400 hover:text-white"
                >
                  إلغاء
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleResetRequest}
                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>استعادة الافتراضي</span>
              </button>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/10 bg-ink-850 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/5"
              >
                إلغاء
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-500 px-5 py-2 text-xs font-extrabold text-ink-950 shadow-neon-emerald transition-all hover:opacity-90 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{isSaving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
