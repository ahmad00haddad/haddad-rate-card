import { supabase } from "@/integrations/supabase/client";

type EventType = "page_view" | "region_select" | "service_select";

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let sid = sessionStorage.getItem("lv_sid");
    if (!sid) {
      sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem("lv_sid", sid);
    }
    return sid;
  } catch {
    return "";
  }
}

export async function trackEvent(event_type: EventType, event_value?: string | null) {
  if (typeof window === "undefined") return;
  try {
    await supabase.from("analytics_events").insert({
      event_type,
      event_value: event_value ? String(event_value).slice(0, 60) : null,
      path: window.location.pathname.slice(0, 200),
      session_id: getSessionId(),
      referrer: document.referrer ? document.referrer.slice(0, 300) : null,
    });
  } catch {
    // silent
  }
}

export function installGlobalTracker() {
  if (typeof window === "undefined") return;
  (window as any).__lvTrack = trackEvent;
}
