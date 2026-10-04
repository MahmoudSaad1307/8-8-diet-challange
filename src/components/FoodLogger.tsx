import {
  AlertTriangle,
  CheckCircle2,
  Info,
  KeyRound,
  Loader2,
  Send,
  ServerCrash,
  Sparkles,
  Trash2,
  Utensils,
  WifiOff,
  X,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { TARGETS, toArabicDigits } from '../lib/constants';
import { aggregateItems, formatGrams, parseFoodText } from '../lib/nlpParser';
import type { FoodEntry, ParsedFoodItem } from '../lib/types';

interface FoodLoggerProps {
  isFuture: boolean;
  entries: FoodEntry[];
  onAdd: (text: string, items: ParsedFoodItem[]) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const EXAMPLES = [
  'أكلت ٢٠٠ جرام صدور فراخ مشوية و١٠٠ جرام رز مسلوق',
  '٣ بيض مسلوق مع ٥٠ جرام شوفان ني',
  '١٥٠ جرام سلمون مشوي و٢٠٠ جرام بروكلي',
  '١٢٠ جرام صدور فراخ مستوية و١٠٠ جرام أرز ني',
];

type Stage = 'input' | 'analyzing' | 'preview' | 'saving';

type ApiErrorCode =
  | 'GEMINI_API_KEY_MISSING'
  | 'GEMINI_API_KEY_INVALID'
  | 'GEMINI_RATE_LIMIT'
  | 'GEMINI_API_ERROR'
  | 'NETWORK'
  | 'INTERNAL_ERROR'
  | null;

interface ApiErrorState {
  code: ApiErrorCode;
  httpStatus: number | null;
  message: string;
}

const ERROR_MESSAGES: Record<NonNullable<ApiErrorCode>, { title: string; body: string; color: 'amber' | 'rose' | 'orange' }> = {
  GEMINI_API_KEY_MISSING: {
    title: 'مفتاح Gemini API غير مضاف',
    body: 'أضف GEMINI_API_KEY في Vercel Environment Variables أو ملف الـ .env.',
    color: 'amber',
  },
  GEMINI_API_KEY_INVALID: {
    title: 'مفتاح Gemini API غير صحيح أو منتهي',
    body: 'المفتاح المضاف مرفوض من Google Gemini. تحقق من صحته.',
    color: 'amber',
  },
  GEMINI_RATE_LIMIT: {
    title: 'تجاوزت الحصة المسموحة لـ Gemini',
    body: 'الحساب وصل لحد الاستخدام. انتظر دقيقة وحاول مجدداً.',
    color: 'orange',
  },
  GEMINI_API_ERROR: {
    title: 'خطأ في Gemini API',
    body: 'Gemini أرجع خطأ غير متوقع. حاول مجدداً.',
    color: 'rose',
  },
  NETWORK: {
    title: 'تعذّر الاتصال بالخادم',
    body: 'تحقق من اتصال الإنترنت وحاول مجدداً.',
    color: 'rose',
  },
  INTERNAL_ERROR: {
    title: 'خطأ داخلي في الخادم',
    body: 'حدث خطأ غير متوقع. يرجى مراجعة سجلات Vercel.',
    color: 'rose',
  },
};

class ParseFoodError extends Error {
  constructor(
    public code: ApiErrorCode,
    public httpStatus: number | null,
    message: string,
  ) {
    super(message);
  }
}

const SYSTEM_PROMPT = `أنت خبير تغذية. حلّل وصف الطعام بالعربية أو الإنجليزية.

قواعد الحساب حسب طريقة الطهي:
- ني/خام/raw: أرز ني ≈365 كcal/100جم · فراخ نيئة ≈120 كcal · شوفان ني ≈389 كcal
- مسلوق/boiled: أرز مسلوق ≈130 كcal · فراخ مسلوقة ≈150 كcal
- مشوي/مستوي/grilled: فراخ مشوية ≈165 كcal · لحم مشوي ≈217 كcal
- مقلي/fried: يزيد الدهون والسعرات بشكل كبير

قواعد الكميات:
- إذا ذُكرت كمية بالجرام استخدمها بالضبط
- إذا ذُكرت أعداد (٣ بيض) احسب الوزن: بيضة واحدة ≈55 جم
- إذا لم تُذكر كمية استخدم حصة افتراضية معقولة

أرجح JSON بالشكل التالي فقط بدون أي نص إضافي:
{"items": [{"name":"...","qty_g":100,"calories":0,"protein":0,"carbs":0,"fats":0,"sodium":0,"potassium":0}]}

الحقول:
- name: اسم الطعام بالعربية مع طريقة الطهي
- qty_g: كمية بالجرام (رقم)
- calories: سعرات حرارية (رقم صحيح)
- protein: بروتين جرام (رقم عشري)
- carbs: كربوهيدرات جرام (رقم عشري)
- fats: دهون جرام (رقم عشري)
- sodium: صوديوم ملليجرام (رقم صحيح)
- potassium: بوتاسيوم ملليجرام (رقم صحيح)

إذا لم تجد أطعمة: {"items": []}`;

async function callGeminiDirectly(text: string): Promise<ParsedFoodItem[]> {
  const apiKey = (import.meta.env.VITE_GEMINI_API_KEY as string || '').trim();
  console.log("[callGeminiDirectly] API Key check:", {
    exists: !!apiKey,
    length: apiKey.length,
    preview: apiKey ? apiKey.slice(0, 10) + "..." + apiKey.slice(-10) : "none"
  });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }]
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: `حلّل: "${text}"` }]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
        }
      }),
    });
  } catch (e) {
    console.error("[callGeminiDirectly] Network error:", e);
    throw new ParseFoodError('NETWORK', null, `Network error: ${String(e)}`);
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("[callGeminiDirectly] Gemini API error:", res.status, errText);
    throw new ParseFoodError('GEMINI_API_ERROR', res.status, `Gemini HTTP ${res.status}: ${errText.slice(0, 150)}`);
  }

  const data = await res.json().catch(() => ({}) as Record<string, unknown>) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  };
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{"items":[]}';

  try {
    const parsed = JSON.parse(raw) as { items?: ParsedFoodItem[] };
    return parsed.items ?? [];
  } catch (e) {
    console.error('Failed to parse Gemini response:', raw, e);
    return [];
  }
}

async function callParseFoodApi(text: string): Promise<ParsedFoodItem[]> {
  // 1. Try Vercel Serverless Function first (/api/parse-food)
  try {
    const res = await fetch('/api/parse-food', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (res.status !== 404) {
      const body = await res.json().catch(() => ({}) as Record<string, unknown>) as {
        error?: string;
        message?: string;
        items?: ParsedFoodItem[];
      };

      if (!res.ok) {
        const code = body.error as ApiErrorCode | undefined;
        const knownCodes: ApiErrorCode[] = [
          'GEMINI_API_KEY_MISSING',
          'GEMINI_API_KEY_INVALID',
          'GEMINI_RATE_LIMIT',
          'GEMINI_API_ERROR',
          'INTERNAL_ERROR',
        ];
        const resolvedCode: ApiErrorCode = knownCodes.includes(code ?? null as never)
          ? (code as ApiErrorCode)
          : 'GEMINI_API_ERROR';
        throw new ParseFoodError(resolvedCode, res.status, body.message ?? `HTTP ${res.status}`);
      }

      if (Array.isArray(body.items)) {
        return body.items;
      }
    }
  } catch (e) {
    if (e instanceof ParseFoodError) throw e;
    console.warn('/api/parse-food endpoint not reached, checking fallback options...', e);
  }

  // 2. Fallback to direct Gemini API call if VITE_GEMINI_API_KEY is available
  if (import.meta.env.VITE_GEMINI_API_KEY) {
    return callGeminiDirectly(text);
  }

  // 3. Offline fallback: local rule-based NLP parser
  return parseFoodText(text);
}

export function FoodLogger({ isFuture, entries, onAdd, onDelete }: FoodLoggerProps) {
  const [text, setText] = useState('');
  const [stage, setStage] = useState<Stage>('input');
  const [parsed, setParsed] = useState<ParsedFoodItem[]>([]);
  const [apiErr, setApiErr] = useState<ApiErrorState | null>(null);

  const clearError = () => setApiErr(null);

  const handleAnalyze = async () => {
    if (isFuture || !text.trim()) return;
    setStage('analyzing');
    clearError();
    try {
      const items = await callParseFoodApi(text.trim());
      setParsed(items);
      setStage('preview');
    } catch (e) {
      if (e instanceof ParseFoodError) {
        setApiErr({ code: e.code, httpStatus: e.httpStatus, message: e.message });
      } else {
        setApiErr({ code: 'NETWORK', httpStatus: null, message: String(e) });
      }
      setStage('input');
    }
  };

  const handleSave = async () => {
    if (parsed.length === 0) return;
    setStage('saving');
    try {
      await onAdd(text.trim(), parsed);
      setText('');
      setParsed([]);
      setStage('input');
    } catch (e) {
      setApiErr({ code: 'INTERNAL_ERROR', httpStatus: null, message: String(e) });
      setStage('preview');
    }
  };

  const handleCancel = () => {
    setParsed([]);
    setStage('input');
    clearError();
  };

  const totals = aggregateItems(parsed);

  return (
    <section className={`card p-5 sm:p-6 ${isFuture ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* Header */}
      <div className="mb-4">
        <h2 className="section-title flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-emerald-400" />
          مسجّل الطعام بالذكاء الاصطناعي
        </h2>
        <p className="section-subtitle mt-0.5">
          اكتب ما أكلته بالعربية أو الإنجليزية — الذكاء الاصطناعي يحلّل الكميات وطريقة الطهي
        </p>
      </div>

      {/* ── INPUT STAGE ── */}
      {(stage === 'input' || stage === 'analyzing') && (
        <>
          <div className="relative">
            <textarea
              value={text}
              disabled={stage === 'analyzing'}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAnalyze();
                }
              }}
              placeholder={
                stage === 'analyzing'
                  ? 'جارٍ التحليل...'
                  : 'اكتب ما أكلته... مثال: أكلت ٢٠٠ جرام صدور فراخ مشوية و١٠٠ جرام رز مسلوق'
              }
              rows={3}
              className="input resize-none text-base leading-relaxed disabled:opacity-60"
              dir="rtl"
            />
            {stage === 'analyzing' && (
              <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-ink-900/70 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-7 w-7 animate-spin text-emerald-400" />
                  <span className="text-sm font-bold text-emerald-300">الذكاء الاصطناعي يحلّل وجبتك...</span>
                </div>
              </div>
            )}
          </div>

          {/* Example chips */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => stage === 'input' && setText(ex)}
                disabled={stage === 'analyzing'}
                className="rounded-full border border-white/5 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-400 transition hover:border-emerald-400/30 hover:text-emerald-300 disabled:opacity-40"
              >
                {ex.slice(0, 42)}…
              </button>
            ))}
          </div>

          {/* Error banner */}
          {apiErr?.code && <ApiErrorBanner err={apiErr} />}

          <button
            onClick={handleAnalyze}
            disabled={stage === 'analyzing' || !text.trim()}
            className="btn-primary mt-4 w-full"
          >
            {stage === 'analyzing' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جارٍ التحليل...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                تحليل بالذكاء الاصطناعي
              </>
            )}
          </button>
        </>
      )}

      {/* ── PREVIEW STAGE ── */}
      {(stage === 'preview' || stage === 'saving') && (
        <div className="animate-slide-up space-y-4">
          {/* Original text */}
          <div className="rounded-xl border border-white/5 bg-ink-900/60 px-4 py-2.5 text-xs text-slate-400" dir="rtl">
            «{text}»
          </div>

          {parsed.length === 0 ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-300">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                لم يتعرف الذكاء الاصطناعي على أطعمة محددة. جرّب:{' '}
                <span className="font-bold text-amber-200">«١٥٠ جرام صدور فراخ مشوية و١٠٠ جرام رز مسلوق»</span>
              </span>
            </div>
          ) : (
            <>
              {/* Per-item rows */}
              <div className="space-y-2">
                {parsed.map((item, i) => (
                  <ItemRow key={i} item={item} />
                ))}
              </div>

              {/* Totals */}
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-4">
                <div className="mb-3 text-[11px] font-bold text-emerald-300">إجمالي الوجبة</div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  <TotalStat label="السعرات" value={toArabicDigits(totals.calories)} unit="كcal" target={TARGETS.calories} />
                  <TotalStat label="البروتين" value={toArabicDigits(totals.protein)} unit="جم" target={TARGETS.protein} />
                  <TotalStat label="الكربوهيدرات" value={toArabicDigits(totals.carbs)} unit="جم" target={TARGETS.carbs} />
                  <TotalStat label="الدهون" value={toArabicDigits(totals.fats)} unit="جم" target={TARGETS.fats} />
                  <TotalStat label="الصوديوم" value={toArabicDigits(totals.sodium)} unit="ملجم" target={TARGETS.sodiumLimit} warn />
                  <TotalStat label="البوتاسيوم" value={toArabicDigits(totals.potassium)} unit="ملجم" target={TARGETS.potassiumMin} />
                </div>
              </div>
            </>
          )}

          {/* Action row */}
          <div className="flex gap-2">
            <button onClick={handleCancel} disabled={stage === 'saving'} className="btn-ghost flex-1">
              <X className="h-4 w-4" />
              تعديل
            </button>
            {parsed.length > 0 && (
              <button onClick={handleSave} disabled={stage === 'saving'} className="btn-primary flex-1">
                {stage === 'saving' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جارٍ الحفظ...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    حفظ الوجبة
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── SAVED ENTRIES ── */}
      {entries.length > 0 && (
        <div className="mt-5 border-t border-white/5 pt-4">
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-200">
              وجبات اليوم ({toArabicDigits(entries.length)})
            </h3>
          </div>
          <div className="space-y-2">
            {entries.map((e) => {
              const items = (e.parsed_items ?? []) as ParsedFoodItem[];
              return (
                <div
                  key={e.id}
                  className="group rounded-xl border border-white/5 bg-ink-900/50 p-3 transition hover:border-white/10"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] text-slate-400" dir="rtl">«{e.raw_text}»</div>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {items.map((it, i) => (
                          <span key={i} className="chip border border-white/5 bg-white/5 text-slate-300">
                            {it.name} · {formatGrams(it.qty_g)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => onDelete(e.id)}
                      className="shrink-0 rounded-lg p-1.5 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-400"
                      aria-label="حذف"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold">
                    <span className="text-emerald-300">{toArabicDigits(e.calories)} كال</span>
                    <span className="text-slate-700">·</span>
                    <span className="text-cyan-300">بروتين {toArabicDigits(e.protein_g)} جم</span>
                    <span className="text-slate-700">·</span>
                    <span className="text-amber-300">كرب {toArabicDigits(e.carbs_g)} جم</span>
                    <span className="text-slate-700">·</span>
                    <span className="text-rose-300">دهون {toArabicDigits(e.fats_g)} جم</span>
                    <span className="text-slate-700">·</span>
                    <span className="text-slate-300">صوديوم {toArabicDigits(e.sodium_mg)} ملجم</span>
                    <span className="text-slate-700">·</span>
                    <span className="text-cyan-200">بوتاسيوم {toArabicDigits(e.potassium_mg)} ملجم</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

// ── Error banner ──

function ApiErrorBanner({ err }: { err: ApiErrorState }) {
  if (!err.code) return null;
  const cfg = ERROR_MESSAGES[err.code] ?? ERROR_MESSAGES.GEMINI_API_ERROR;

  const borderMap = { amber: 'border-amber-400/40', rose: 'border-rose-400/40', orange: 'border-orange-400/40' };
  const bgMap = { amber: 'bg-amber-500/10', rose: 'bg-rose-500/10', orange: 'bg-orange-500/10' };
  const titleMap = { amber: 'text-amber-200', rose: 'text-rose-200', orange: 'text-orange-200' };
  const bodyMap = { amber: 'text-amber-300/80', rose: 'text-rose-300/80', orange: 'text-orange-300/80' };

  const iconMap: Record<NonNullable<ApiErrorCode>, ReactNode> = {
    GEMINI_API_KEY_MISSING: <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />,
    GEMINI_API_KEY_INVALID: <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />,
    GEMINI_RATE_LIMIT: <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange-300" />,
    GEMINI_API_ERROR: <ServerCrash className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" />,
    NETWORK: <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" />,
    INTERNAL_ERROR: <ServerCrash className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" />,
  };

  return (
    <div
      className={`mt-3 flex items-start gap-3 rounded-xl border p-4 ${borderMap[cfg.color]} ${bgMap[cfg.color]}`}
    >
      {err.code ? iconMap[err.code] : <Info className="h-5 w-5 text-rose-300" />}
      <div className="min-w-0 flex-1">
        <div className={`text-sm font-bold ${titleMap[cfg.color]}`}>{cfg.title}</div>
        <div className={`mt-1 text-xs ${bodyMap[cfg.color]}`}>{cfg.body}</div>
        {err.httpStatus && (
          <div className="mt-1.5 flex items-center gap-2">
            <code className={`rounded px-1.5 py-0.5 font-mono text-[11px] font-bold ${bgMap[cfg.color]} border ${borderMap[cfg.color]} ${titleMap[cfg.color]}`}>
              HTTP {err.httpStatus}
            </code>
            {err.message && (
              <span className="truncate text-[11px] text-slate-500">{err.message.slice(0, 80)}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ──

function ItemRow({ item }: { item: ParsedFoodItem }) {
  return (
    <div className="rounded-xl border border-white/5 bg-ink-900/60 p-3">
      <div className="mb-2 flex items-center gap-2">
        <Utensils className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
        <span className="font-bold text-slate-100">{item.name}</span>
        <span className="text-[11px] font-semibold text-slate-500">
          {toArabicDigits(item.qty_g)} جم
        </span>
      </div>
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
        <MacroCell label="السعرات" value={toArabicDigits(item.calories)} unit="كcal" color="emerald" />
        <MacroCell label="البروتين" value={toArabicDigits(item.protein)} unit="جم" color="cyan" />
        <MacroCell label="الكربوهيدرات" value={toArabicDigits(item.carbs)} unit="جم" color="amber" />
        <MacroCell label="الدهون" value={toArabicDigits(item.fats)} unit="جم" color="rose" />
        <MacroCell label="الصوديوم" value={toArabicDigits(item.sodium)} unit="ملجم" color="slate" />
        <MacroCell label="البوتاسيوم" value={toArabicDigits(item.potassium)} unit="ملجم" color="slate" />
      </div>
    </div>
  );
}

function MacroCell({
  label, value, unit, color,
}: {
  label: string; value: string; unit: string;
  color: 'emerald' | 'cyan' | 'amber' | 'rose' | 'slate';
}) {
  const map = { emerald: 'text-emerald-300', cyan: 'text-cyan-300', amber: 'text-amber-300', rose: 'text-rose-300', slate: 'text-slate-300' };
  return (
    <div className="rounded-lg bg-white/5 px-2 py-1.5 text-center">
      <div className="text-[9px] font-semibold text-slate-500">{label}</div>
      <div className={`font-display text-sm font-extrabold ${map[color]}`}>{value}</div>
      <div className="text-[9px] text-slate-600">{unit}</div>
    </div>
  );
}

function TotalStat({
  label, value, unit, target, warn = false,
}: {
  label: string; value: string; unit: string; target: number; warn?: boolean;
}) {
  const num = parseFloat(value.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))));
  const pct = target > 0 ? Math.min(100, (num / target) * 100) : 0;
  const over = num > target;
  return (
    <div className="rounded-lg border border-white/5 bg-ink-900/60 p-2 text-center">
      <div className="text-[9px] font-semibold text-slate-500">{label}</div>
      <div className={`font-display text-sm font-extrabold ${warn && over ? 'text-amber-300' : 'text-white'}`}>
        {value}
      </div>
      <div className="text-[9px] text-slate-600">{unit}</div>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/5">
        <div
          className={`h-full rounded-full ${warn && over ? 'bg-amber-400' : 'bg-emerald-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
