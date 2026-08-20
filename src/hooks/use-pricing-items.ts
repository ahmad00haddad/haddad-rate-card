import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PRICING_CHANNEL, pricingQueryKey, type PricingItem } from "@/lib/pricing";

export function usePricingItems(includeHidden = false) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: [...pricingQueryKey, includeHidden ? "admin" : "public"],
    queryFn: async () => {
      let request = supabase.from("pricing_items").select("*").order("sort_order");
      if (!includeHidden) request = request.eq("is_hidden", false).is("deleted_at", null);
      const { data, error } = await request;
      if (error) throw error;
      return data as PricingItem[];
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    const refresh = () => queryClient.invalidateQueries({ queryKey: pricingQueryKey });
    const realtime = supabase
      .channel(`pricing-items-${includeHidden ? "admin" : "public"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "pricing_items" }, refresh)
      .subscribe();
    const browserChannel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(PRICING_CHANNEL);
    if (browserChannel) browserChannel.onmessage = refresh;
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      void supabase.removeChannel(realtime);
      browserChannel?.close();
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [includeHidden, queryClient]);

  return query;
}

export function announcePricingUpdate() {
  if (typeof BroadcastChannel === "undefined") return;
  const channel = new BroadcastChannel(PRICING_CHANNEL);
  channel.postMessage({ type: "pricing-published", at: Date.now() });
  channel.close();
}