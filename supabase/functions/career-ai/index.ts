// ============================================================
// Supabase Edge Function: career-ai
// พร็อกซีเรียก Gemini โดยเก็บ API key ไว้ฝั่ง server (ไม่โผล่ในหน้าเว็บ)
// ------------------------------------------------------------
// ตั้ง secret ก่อน deploy:
//   GEMINI_API_KEY = <คีย์ที่มีโควตา>        (จำเป็น)
//   GEMINI_MODEL   = gemini-2.0-flash        (ไม่บังคับ · ค่าเริ่มต้นด้านล่าง)
// รับ body: { "prompt": "..." }  → ตอบ: { "text": "..." }  หรือ { "error": "..." }
// ============================================================

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.0-flash";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "ใช้ POST เท่านั้น" }, 405);

  try {
    if (!GEMINI_API_KEY) return json({ error: "ยังไม่ได้ตั้ง secret GEMINI_API_KEY ใน Supabase" }, 500);

    const { prompt } = await req.json().catch(() => ({}));
    if (!prompt || typeof prompt !== "string") return json({ error: "missing prompt" }, 400);

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 700 },
      }),
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = data?.error?.message ?? `Gemini ${r.status}`;
      return json({ error: `Gemini ${r.status} · ${String(msg).slice(0, 200)}` }, r.status);
    }

    const parts = data?.candidates?.[0]?.content?.parts;
    const text = Array.isArray(parts) ? parts.map((p: { text?: string }) => p.text ?? "").join("") : "";
    if (!text.trim()) return json({ error: "Gemini ตอบกลับว่าง" }, 502);

    return json({ text: text.trim() });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
