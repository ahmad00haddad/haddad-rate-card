import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  name: z.string().trim().min(2, "الاسم قصير جداً").max(120),
  phone: z
    .string()
    .trim()
    .min(6, "رقم هاتف غير صالح")
    .max(30)
    .regex(/^[+\d\s\-()]+$/, "رقم هاتف غير صالح"),
  email: z.string().trim().email().max(200).optional().or(z.literal("")).nullable(),
  region: z.enum(["amman", "irbid"]).optional().nullable(),
  service: z.string().trim().max(160).optional().nullable(),
  event_date: z.string().trim().max(20).optional().nullable(),
  message: z.string().trim().max(2000).optional().nullable(),
  // honeypot: must be empty
  website: z.string().max(0).optional().nullable(),
});

// Very light in-memory throttle to blunt scripted spam bursts on a single worker.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 5;
const buckets = new Map<string, number[]>();
function throttle(key: string) {
  const now = Date.now();
  const arr = (buckets.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (arr.length >= RATE_MAX) throw new Error("عدد كبير من الطلبات، حاول لاحقاً.");
  arr.push(now);
  buckets.set(key, arr);
}

export const submitQuoteRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    if (data.website) return { ok: true }; // honeypot tripped — silently drop
    throttle("global");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("quote_requests").insert({
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      region: data.region ?? null,
      service: data.service ?? null,
      event_date: data.event_date || null,
      message: data.message ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });