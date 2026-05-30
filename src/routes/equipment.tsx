import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/equipment")({
  head: () => ({
    meta: [
      { title: "معدات التصوير — أحمد حداد" },
      { name: "description", content: "معرض المعدات السينمائية: كاميرات، عدسات، إضاءة، صوت وإكسسوارات." },
      { property: "og:title", content: "معرض المعدات — أحمد حداد" },
      { property: "og:description", content: "كاميرات، عدسات، إضاءة، صوت وإكسسوارات احترافية." },
    ],
  }),
  component: EquipmentPage,
  errorComponent: ({ error, reset }) => (
    <div style={errBox}>
      <p>تعذر تحميل المعدات: {error.message}</p>
      <button onClick={reset} style={btnGold}>إعادة المحاولة</button>
    </div>
  ),
  notFoundComponent: () => <div style={errBox}>لا توجد معدات.</div>,
});

type Equipment = {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  image_path: string | null;
  is_available: boolean;
};

function EquipmentPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["equipment"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment")
        .select("id,name,description,category,image_path,is_available")
        .order("category")
        .order("id");
      if (error) throw error;
      return data as Equipment[];
    },
  });

  const [active, setActive] = useState<string>("الكل");
  const categories = useMemo(() => {
    const set = new Set<string>();
    (data ?? []).forEach((e) => e.category && set.add(e.category));
    return ["الكل", ...Array.from(set)];
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return active === "الكل" ? data : data.filter((e) => e.category === active);
  }, [data, active]);

  return (
    <div dir="rtl" style={page}>
      <SiteNav />
      <section style={{ padding: "60px 24px 24px", textAlign: "center", maxWidth: 1200, margin: "0 auto" }}>
        <p style={kicker}>المعرض</p>
        <h1 style={h1}>المعدات السينمائية</h1>
        <p style={lead}>
          مجموعة من المعدات الاحترافية المستخدمة في إنتاج الأفلام والإعلانات والريلز.
        </p>
      </section>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", padding: "0 24px 32px", maxWidth: 1200, margin: "0 auto" }}>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setActive(c)}
            style={{
              ...chip,
              background: active === c ? "#f49921" : "transparent",
              color: active === c ? "#0e0f11" : "#f0ece4",
              borderColor: active === c ? "#f49921" : "rgba(244,153,33,0.35)",
            }}
          >
            {c}
          </button>
        ))}
      </div>

      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px 80px" }}>
        {isLoading && <p style={{ textAlign: "center", color: "#9b948a" }}>جاري التحميل…</p>}
        {error && <p style={{ textAlign: "center", color: "#ef6c6c" }}>{(error as Error).message}</p>}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 20,
          }}
        >
          {filtered.map((item) => (
            <article key={item.id} style={card}>
              <div style={imgBox}>
                {item.image_path ? (
                  <img
                    src={item.image_path}
                    alt={item.name}
                    loading="lazy"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div style={{ color: "#5a544c", fontSize: 12 }}>لا توجد صورة</div>
                )}
                {item.category && <span style={badge}>{item.category}</span>}
              </div>
              <div style={{ padding: "16px 16px 18px" }}>
                <h3 style={cardTitle}>{item.name}</h3>
                {item.description && <p style={cardDesc}>{item.description}</p>}
              </div>
            </article>
          ))}
        </div>
        {!isLoading && filtered.length === 0 && (
          <p style={{ textAlign: "center", color: "#9b948a", marginTop: 40 }}>لا توجد عناصر في هذه الفئة.</p>
        )}
      </main>
    </div>
  );
}

function SiteNav() {
  return (
    <header style={navWrap} dir="rtl">
      <Link to="/" style={{ textDecoration: "none", display: "flex", flexDirection: "column" }}>
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: "#f0ece4" }}>
          أحمد حداد
        </span>
        <span style={{ fontSize: 11, letterSpacing: 2, color: "#f49921" }}>مصور سينمائي · إربد</span>
      </Link>
      <nav style={{ display: "flex", gap: 10 }}>
        <Link to="/" style={navBtn}>التسعيرات</Link>
        <Link to="/equipment" style={{ ...navBtn, background: "#f49921", color: "#0e0f11", borderColor: "#f49921" }}>المعدات</Link>
        <Link to="/admin" style={navBtn}>الإدارة</Link>
      </nav>
    </header>
  );
}

const page = { minHeight: "100vh", background: "#0e0f11", color: "#f0ece4", fontFamily: "'SFMada', system-ui, sans-serif" } as const;
const navWrap = { position: "sticky" as const, top: 0, zIndex: 50, padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(14,15,17,0.9)", backdropFilter: "blur(14px)", borderBottom: "1px solid rgba(244,153,33,0.25)" };
const navBtn = { padding: "8px 16px", border: "1px solid rgba(244,153,33,0.35)", color: "#f49921", textDecoration: "none", fontSize: 13, fontWeight: 600, letterSpacing: 1, borderRadius: 2 } as const;
const kicker = { color: "#f49921", letterSpacing: 4, fontSize: 12, marginBottom: 12 } as const;
const h1 = { fontFamily: "'Playfair Display', serif", fontSize: "clamp(36px, 5vw, 56px)", margin: 0, color: "#f0ece4" } as const;
const lead = { color: "#a39d93", marginTop: 14, maxWidth: 620, marginInline: "auto", lineHeight: 1.7 } as const;
const chip = { padding: "10px 22px", border: "1px solid", borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: "pointer", letterSpacing: 1, transition: "all .25s" } as const;
const card = { background: "#15171a", border: "1px solid rgba(244,153,33,0.15)", borderRadius: 6, overflow: "hidden", display: "flex", flexDirection: "column" as const, transition: "transform .3s, border-color .3s" };
const imgBox = { position: "relative" as const, aspectRatio: "1/1", background: "#0a0b0d", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" };
const badge = { position: "absolute" as const, top: 10, insetInlineStart: 10, background: "rgba(244,153,33,0.92)", color: "#0e0f11", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 2, letterSpacing: 1 };
const cardTitle = { margin: 0, fontSize: 16, color: "#f0ece4", fontWeight: 600 } as const;
const cardDesc = { margin: "8px 0 0", fontSize: 13, color: "#9b948a", lineHeight: 1.6 } as const;
const errBox = { minHeight: "60vh", display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", gap: 16, color: "#f0ece4", background: "#0e0f11" };
const btnGold = { background: "#f49921", color: "#0e0f11", border: "none", padding: "10px 24px", fontWeight: 700, cursor: "pointer" } as const;