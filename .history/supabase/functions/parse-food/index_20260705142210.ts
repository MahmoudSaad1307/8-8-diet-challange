import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // ── 1. Check API key ──────────────────────────────────────────────────
    const apiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      console.error("[parse-food] GEMINI_API_KEY/OPENAI_API_KEY is not set in Supabase secrets.");
      return json({ error: "GEMINI_API_KEY_MISSING", message: "GEMINI_API_KEY secret is not configured in Supabase Edge Function secrets.", items: [] }, 503);
    }

    // ── 2. Parse request ──────────────────────────────────────────────────
    let text = "";
    try {
      const body = await req.json() as { text?: string };
      text = (body.text ?? "").trim();
    } catch {
      return json({ error: "INVALID_REQUEST", message: "Request body must be JSON with a 'text' field.", items: [] }, 400);
    }

    if (!text) {
      return json({ items: [] }, 200);
    }

    // ── 3. Call Gemini ────────────────────────────────────────────────────
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }]
        },
        contents: [
          {
            role: "user",
            parts: [{ text: `حلّل: "${text}"` }]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
        }
      }),
    });

    // ── 4. Handle Gemini errors ───────────────────────────────────────────
    if (!geminiRes.ok) {
      const errText = await geminiRes.text().catch(() => "");
      console.error(`[parse-food] Gemini returned HTTP ${geminiRes.status}:`, errText.slice(0, 500));

      if (geminiRes.status === 400 || geminiRes.status === 403) {
        return json({
          error: "GEMINI_API_KEY_INVALID",
          message: `Gemini rejected the API key (HTTP ${geminiRes.status}). Check that GEMINI_API_KEY is correct.`,
          items: [],
        }, 401);
      }

      if (geminiRes.status === 429) {
        return json({
          error: "GEMINI_RATE_LIMIT",
          message: "Gemini rate limit or quota exceeded.",
          items: [],
        }, 429);
      }

      return json({
        error: "GEMINI_API_ERROR",
        message: `Gemini returned HTTP ${geminiRes.status}.`,
        detail: errText.slice(0, 300),
        items: [],
      }, 502);
    }

    // ── 5. Parse Gemini response ──────────────────────────────────────────
    const data = await geminiRes.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

    let items: unknown[] = [];
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        items = parsed;
      } else if (parsed && typeof parsed === "object") {
        const obj = parsed as Record<string, unknown>;
        // Accept {"items": [...]} or the first array value
        if (Array.isArray(obj.items)) {
          items = obj.items;
        } else {
          const firstArr = Object.values(obj).find((v) => Array.isArray(v));
          if (Array.isArray(firstArr)) items = firstArr;
        }
      }
    } catch (e) {
      console.error("[parse-food] Failed to parse Gemini JSON:", raw.slice(0, 200), e);
    }

    return json({ items }, 200);

  } catch (err) {
    console.error("[parse-food] Unhandled error:", err);
    return json({ error: "INTERNAL_ERROR", message: String(err), items: [] }, 500);
  }
});
