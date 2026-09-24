import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StatCard } from './StatCard';

type AnalyticsRow = { event_type: string; event_value: string | null; session_id: string | null; created_at: string };

const SERVICE_LABELS: Record<string, string> = {
  reels: "ريلز",
  films: "أفلام قصيرة",
  commercials: "إعلانات TVC",
  docs: "وثائقيات",
  events: "إيفنتات",
  editing: "مونتاج",
  dayrate: "يوم تصوير",
};
const REGION_LABELS: Record<string, string> = { amman: "عمّان", irbid: "إربد" };

const input = { background: "#0e0e0e", border: "1px solid rgba(242,228,212,0.15)", color: "#f2e4d4", padding: "10px 12px", borderRadius: 6, fontSize: 13, fontFamily: "inherit" };

export function AnalyticsAdmin() {
  const [days, setDays] = useState(30);
  const { data, isLoading } = useQuery({
    queryKey: ["analytics", days],
    queryFn: async () => {
      const since = new Date(Date.now() - days * 86400_000).toISOString();
      const { data, error } = await supabase
        .from("analytics_events")
        .select("event_type,event_value,session_id,created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(10000);
      if (error) throw error;
      return data as AnalyticsRow[];
    },
  });

  const summary = useMemo(() => {
    const rows = data ?? [];
    const views = rows.filter((r) => r.event_type === "page_view");
    const uniqueVisitors = new Set(views.map((r) => r.session_id).filter(Boolean)).size;
    const regions: Record<string, number> = {};
    const services: Record<string, number> = {};
    for (const r of rows) {
      if (r.event_type === "region_select" && r.event_value) regions[r.event_value] = (regions[r.event_value] ?? 0) + 1;
      if (r.event_type === "service_select" && r.event_value) services[r.event_value] = (services[r.event_value] ?? 0) + 1;
    }
    const totalRegion = Object.values(regions).reduce((a, b) => a + b, 0);
    const sortedServices = Object.entries(services).sort((a, b) => b[1] - a[1]);
    return { totalViews: views.length, uniqueVisitors, regions, totalRegion, sortedServices };
  }, [data]);

  const maxSvc = summary.sortedServices[0]?.[1] ?? 1;

  return (
    <section style={{ background: "#161616", border: "1px solid rgba(183,37,52,0.2)", borderRadius: 12, padding: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <div>
          <h2 style={{ color: "#f2e4d4", margin: "4px 0 0", fontSize: 22 }}>الزوار وخياراتهم</h2>
        </div>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} style={{ ...input, width: "auto" }}>
          <option value={1} style={{ background: "#161616" }}>آخر 24 ساعة</option>
          <option value={7} style={{ background: "#161616" }}>آخر 7 أيام</option>
          <option value={30} style={{ background: "#161616" }}>آخر 30 يوم</option>
          <option value={90} style={{ background: "#161616" }}>آخر 90 يوم</option>
        </select>
      </div>

      {isLoading ? (
        <p style={{ color: "#bdb3a0" }}>تحميل…</p>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
            <StatCard label="زوار فريدون" value={summary.uniqueVisitors} accent="#3ddc97" />
            <StatCard label="مشاهدات الصفحات" value={summary.totalViews} />
            <StatCard label="اختاروا منطقة" value={summary.totalRegion} />
            <StatCard label="اختاروا خدمة" value={summary.sortedServices.reduce((s, [, v]) => s + v, 0)} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            <div>
              <h3 style={{ color: "#f2e4d4", fontSize: 15, margin: "0 0 12px" }}>المنطقة المختارة</h3>
              {summary.totalRegion === 0 ? (
                <p style={{ color: "#bdb3a0", fontSize: 13 }}>لا توجد بيانات بعد.</p>
              ) : (
                ["amman", "irbid"].map((k) => {
                  const v = summary.regions[k] ?? 0;
                  const pct = summary.totalRegion ? Math.round((v / summary.totalRegion) * 100) : 0;
                  return (
                    <div key={k} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#cfc8bd", marginBottom: 4 }}>
                        <span>{REGION_LABELS[k]}</span>
                        <span style={{ color: "#b72534" }}>{v} ({pct}%)</span>
                      </div>
                      <div style={{ height: 8, background: "#0e0e0e", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: k === "amman" ? "#b72534" : "#3ddc97" }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div>
              <h3 style={{ color: "#f2e4d4", fontSize: 15, margin: "0 0 12px" }}>الخدمات الأكثر طلباً</h3>
              {summary.sortedServices.length === 0 ? (
                <p style={{ color: "#bdb3a0", fontSize: 13 }}>لا توجد بيانات بعد.</p>
              ) : (
                summary.sortedServices.map(([k, v]) => {
                  const pct = Math.round((v / maxSvc) * 100);
                  return (
                    <div key={k} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#cfc8bd", marginBottom: 4 }}>
                        <span>{SERVICE_LABELS[k] ?? k}</span>
                        <span style={{ color: "#b72534" }}>{v}</span>
                      </div>
                      <div style={{ height: 8, background: "#0e0e0e", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: "#b72534" }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
