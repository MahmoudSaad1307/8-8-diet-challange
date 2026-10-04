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

أرجع JSON بالشكل التالي فقط بدون أي نص إضافي:
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

import type { ApiRequest, ApiResponse } from './_db.js';

// Fast "lite" models first (~1s). Big models last.
const DEFAULT_MODELS = 'gemini-3.5-flash-lite,gemini-flash-lite-latest,gemini-3.8-flash';
const PER_MODEL_TIMEOUT_MS = 6000;
const TOTAL_BUDGET_MS = 16000;

export default async function handler(req: ApiRequest, res: ApiResponse) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED', message: 'Only POST requests are allowed.' });
  }

  try {
    const apiKey = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '').trim();
    if (!apiKey) {
      console.error('[api/parse-food] GEMINI_API_KEY is not set in environment variables.');
      return res.status(503).json({
        error: 'GEMINI_API_KEY_MISSING',
        message: 'GEMINI_API_KEY is not configured in Vercel environment variables.',
        items: [],
      });
    }

    let text = '';
    const body = (typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})) as Record<string, unknown>;
    text = (typeof body.text === 'string' ? body.text : '').trim();

    if (!text) {
      return res.status(200).json({ items: [] });
    }

    const requestBody = JSON.stringify({
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: `حلّل: "${text}"` }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const models = (process.env.GEMINI_MODELS || process.env.GEMINI_MODEL || DEFAULT_MODELS)
      .split(',')
      .map((m: string) => m.trim())
      .filter(Boolean);

    const deadline = Date.now() + TOTAL_BUDGET_MS;
    let geminiRes: Response | null = null;
    let lastStatus = 0;
    let lastErrText = '';

    for (const model of models) {
      const remaining = deadline - Date.now();
      if (remaining < 1500) break;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      try {
        const r = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: requestBody,
          signal: AbortSignal.timeout(Math.min(PER_MODEL_TIMEOUT_MS, remaining)),
        });
        if (r.ok) {
          geminiRes = r;
          break;
        }
        lastStatus = r.status;
        lastErrText = await r.text().catch(() => '');
        console.warn(`[api/parse-food] ${model} -> HTTP ${r.status}: ${lastErrText.slice(0, 200)}`);
        // A bad/blocked key fails on every model, so stop immediately.
        if (r.status === 401 || r.status === 403 || (r.status === 400 && /API[_ ]?key/i.test(lastErrText))) break;
      } catch (e) {
        lastStatus = 504;
        lastErrText = String(e);
        console.warn(`[api/parse-food] ${model} -> ${(e as Error).name} (timeout/network)`);
      }
    }

    if (!geminiRes) {
      console.error(`[api/parse-food] All models failed. Last HTTP ${lastStatus}:`, lastErrText.slice(0, 500));

      if (lastStatus === 401 || lastStatus === 403 || (lastStatus === 400 && /API[_ ]?key/i.test(lastErrText))) {
        return res.status(401).json({
          error: 'GEMINI_API_KEY_INVALID',
          message: `Gemini rejected the API key (HTTP ${lastStatus}). Check that GEMINI_API_KEY is correct.`,
          items: [],
        });
      }

      if (lastStatus === 429) {
        return res.status(429).json({
          error: 'GEMINI_RATE_LIMIT',
          message: 'Gemini rate limit or quota exceeded.',
          items: [],
        });
      }

      return res.status(502).json({
        error: 'GEMINI_API_ERROR',
        message: `Gemini returned HTTP ${lastStatus}.`,
        detail: lastErrText.slice(0, 300),
        items: [],
      });
    }

    const data = (await geminiRes.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';

    let items: unknown[] = [];
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        items = parsed;
      } else if (parsed && typeof parsed === 'object') {
        const obj = parsed as Record<string, unknown>;
        if (Array.isArray(obj.items)) {
          items = obj.items;
        } else {
          const firstArr = Object.values(obj).find((v) => Array.isArray(v));
          if (Array.isArray(firstArr)) items = firstArr;
        }
      }
    } catch (e) {
      console.error('[api/parse-food] Failed to parse Gemini JSON:', raw.slice(0, 200), e);
    }

    return res.status(200).json({ items });
  } catch (err) {
    console.error('[api/parse-food] Unhandled error:', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: String(err), items: [] });
  }
}
