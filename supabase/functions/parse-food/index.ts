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
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      console.error("[parse-food] OPENAI_API_KEY is not set in Supabase secrets.");
      return json({ error: "OPENAI_API_KEY_MISSING", message: "OPENAI_API_KEY secret is not configured in Supabase Edge Function secrets.", items: [] }, 503);
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

    // ── 3. Call OpenAI ────────────────────────────────────────────────────
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        max_tokens: 1024,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `حلّل: "${text}"` },
        ],
      }),
    });

    // ── 4. Handle OpenAI errors ───────────────────────────────────────────
    if (!openaiRes.ok) {
      const errText = await openaiRes.text().catch(() => "");
      console.error(`[parse-food] OpenAI returned HTTP ${openaiRes.status}:`, errText.slice(0, 500));

      if (openaiRes.status === 401) {
        return json({
          error: "OPENAI_API_KEY_INVALID",
          message: `OpenAI rejected the API key (HTTP 401). Check that OPENAI_API_KEY is correct in Supabase secrets.`,
          items: [],
        }, 401);
      }

      if (openaiRes.status === 429) {
        return json({
          error: "OPENAI_RATE_LIMIT",
          message: "OpenAI rate limit or quota exceeded.",
          items: [],
        }, 429);
      }

      return json({
        error: "OPENAI_API_ERROR",
        message: `OpenAI returned HTTP ${openaiRes.status}.`,
        detail: errText.slice(0, 300),
        items: [],
      }, 502);
    }

    // ── 5. Parse OpenAI response ──────────────────────────────────────────
    const data = await openaiRes.json() as { choices?: Array<{ message: { content: string } }> };
    const raw = data.choices?.[0]?.message?.content ?? "{}";

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
      console.error("[parse-food] Failed to parse OpenAI JSON:", raw.slice(0, 200), e);
    }

    return json({ items }, 200);

  } catch (err) {
    console.error("[parse-food] Unhandled error:", err);
    return json({ error: "INTERNAL_ERROR", message: String(err), items: [] }, 500);
  }
});
