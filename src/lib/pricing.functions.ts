import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const savePricingItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    id: z.string().uuid(),
    patch: z.record(z.unknown()),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: saved, error } = await context.supabase.rpc("admin_update_pricing_item", {
      _item_id: data.id,
      _patch: data.patch,
    });
    if (error) throw new Error(error.message);
    return saved;
  });

export const createPricingItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ item: z.record(z.unknown()) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: created, error } = await context.supabase.rpc("admin_create_pricing_item", {
      _item: data.item,
    });
    if (error) throw new Error(error.message);
    return created;
  });

export const getPricingAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("pricing_audit_log")
      .select("id,pricing_item_id,action,old_values,new_values,created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data;
  });