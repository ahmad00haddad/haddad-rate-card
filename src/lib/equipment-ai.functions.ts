import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  name: z.string().min(1).max(200),
  category: z.string().max(120).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
});

export const estimateEquipmentPrice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    // admin check
    const { data: role } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw new Error("Forbidden");

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const prompt = `أنت خبير تسعير معدات تصوير سينمائية في السوق الأردني. قدّر سعر شراء المعدّة التالية بالدينار الأردني (JOD) بناءً على بيانات السوق المعتادة.
الاسم: ${data.name}
الفئة: ${data.category ?? "غير محددة"}
الوصف: ${data.description ?? "—"}

أعد فقط JSON بالشكل:
{"price_jod": <number>, "confidence": "low"|"medium"|"high", "notes": "<سطر واحد عربي مختصر>"}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "ترد فقط بكائن JSON صالح بدون أي شرح إضافي." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) throw new Error("تم تجاوز حد الطلبات، حاول لاحقاً.");
    if (res.status === 402) throw new Error("نفدت أرصدة الذكاء الاصطناعي.");
    if (!res.ok) throw new Error(`AI error ${res.status}`);

    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content ?? "{}";
    let parsed: { price_jod?: number; confidence?: string; notes?: string } = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      const m = content.match(/\{[\s\S]*\}/);
      if (m) parsed = JSON.parse(m[0]);
    }
    return {
      price: Number(parsed.price_jod ?? 0),
      confidence: parsed.confidence ?? "low",
      notes: parsed.notes ?? "",
    };
  });