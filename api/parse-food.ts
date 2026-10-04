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
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    text = (body.text ?? '').trim();

    if (!text) {
      return res.status(200).json({ items: [] });
    }

    const model = (process.env.GEMINI_MODEL || 'gemini-3.8-flash').trim();
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const requestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
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
        },
      }),
    };

    // Gemini returns transient 503 (high demand) / 429 often; retry a few times.
    let geminiRes = await fetch(geminiUrl, requestInit);
    for (let attempt = 1; attempt <= 2 && (geminiRes.status === 503 || geminiRes.status === 429); attempt++) {
      await new Promise((r) => setTimeout(r, 1000 * attempt));
      geminiRes = await fetch(geminiUrl, requestInit);
    }

    if (!geminiRes.ok) {
      const errText = await geminiRes.text().catch(() => '');
      console.error(`[api/parse-food] Gemini returned HTTP ${geminiRes.status}:`, errText.slice(0, 500));

      if (geminiRes.status === 400 || geminiRes.status === 403) {
        return res.status(401).json({
          error: 'GEMINI_API_KEY_INVALID',
          message: `Gemini rejected the API key (HTTP ${geminiRes.status}). Check that GEMINI_API_KEY is correct.`,
          items: [],
        });
      }

      if (geminiRes.status === 429) {
        return res.status(429).json({
          error: 'GEMINI_RATE_LIMIT',
          message: 'Gemini rate limit or quota exceeded.',
          items: [],
        });
      }

      return res.status(502).json({
        error: 'GEMINI_API_ERROR',
        message: `Gemini returned HTTP ${geminiRes.status}.`,
        detail: errText.slice(0, 300),
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
