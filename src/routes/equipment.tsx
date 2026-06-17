import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { normalizeAr } from "@/lib/ar-normalize";

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
        .eq("is_available", true)
        .order("category")
        .order("id");
      if (error) throw error;
      return data as Equipment[];
    },
  });

  const [active, setActive] = useState<string>("الكل");
  const [query, setQuery] = useState("");
  const categories = useMemo(() => {
    const set = new Set<string>();
    (data ?? []).forEach((e) => e.category && set.add(e.category));
    return ["الكل", ...Array.from(set)];
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = normalizeAr(query);
    return data.filter((e) => {
      if (active !== "الكل" && e.category !== active) return false;
      if (q && !normalizeAr(`${e.name} ${e.description ?? ""}`).includes(q)) return false;
      return true;
    });
  }, [data, active, query]);

  return (
    <div dir="rtl" style={page}>
      <SiteNav />
      <section style={{ padding: "70px 24px 18px", textAlign: "center", maxWidth: 1100, margin: "0 auto" }}>
        <p style={kicker}>المعرض</p>
        <h1 style={h1}>معداتنا</h1>
        <p style={lead}>
          مجموعة من المعدات الاحترافية المستخدمة في إنتاج الأفلام والإعلانات والريلز.
        </p>
      </section>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "8px 24px 24px", display: "grid", gridTemplateColumns: "1fr 280px", gap: 14 }}>
        <div style={searchWrap}>
          <span style={{ color: "#f49921", fontSize: 14 }}>⌕</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن المعدات..."
            style={searchInput}
          />
        </div>
        <select value={active} onChange={(e) => setActive(e.target.value)} style={selectStyle}>
          {categories.map((c) => (
            <option key={c} value={c} style={{ background: "#15171a" }}>{c}</option>
          ))}
        </select>
      </div>

      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px 80px" }}>
        {isLoading && <p style={{ textAlign: "center", color: "#9b948a" }}>جاري التحميل…</p>}
        {error && <p style={{ textAlign: "center", color: "#ef6c6c" }}>{(error as Error).message}</p>}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 28,
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
                    decoding="async"
                    style={{ width: "85%", height: "85%", objectFit: "contain" }}
                  />
                ) : (
                  <div style={{ color: "#5a544c", fontSize: 12 }}>لا توجد صورة</div>
                )}
              </div>
              <div style={cardBody}>
                <h3 style={cardTitle}>{item.name}</h3>
                {item.description && <p style={cardDesc}>{item.description}</p>}
                {item.category && (
                  <p style={metaLine}>
                    <span style={metaLabel}>الفئة:</span> <span style={metaValue}>{item.category}</span>
                  </p>
                )}
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
const searchWrap = { display: "flex", alignItems: "center", gap: 10, padding: "0 16px", background: "#15171a", border: "1px solid rgba(244,153,33,0.15)", borderRadius: 10, height: 48 } as const;
const searchInput = { flex: 1, background: "transparent", border: "none", outline: "none", color: "#f0ece4", fontSize: 14, fontFamily: "inherit", textAlign: "right" as const } as const;
const selectStyle = { background: "#15171a", border: "1px solid rgba(244,153,33,0.15)", borderRadius: 10, color: "#f0ece4", padding: "0 16px", height: 48, fontSize: 14, fontFamily: "inherit", cursor: "pointer", appearance: "none" as const } as const;
const card = { background: "#15171a", border: "1px solid rgba(244,153,33,0.12)", borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column" as const, boxShadow: "0 10px 30px rgba(0,0,0,0.35)", transition: "transform .3s ease, border-color .3s ease, box-shadow .3s ease" };
const imgBox = { aspectRatio: "1/1", background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", padding: 18 } as const;
const cardBody = { padding: "22px 22px 24px", textAlign: "center" as const, display: "flex", flexDirection: "column" as const, gap: 10 } as const;
const cardTitle = { margin: 0, fontSize: 19, color: "#f49921", fontWeight: 700, lineHeight: 1.4 } as const;
const cardDesc = { margin: 0, fontSize: 13.5, color: "#a39d93", lineHeight: 1.7 } as const;
const metaLine = { margin: "4px 0 0", fontSize: 13, color: "#cfc8bd" } as const;
const metaLabel = { color: "#f0ece4", fontWeight: 700 } as const;
const metaValue = { color: "#a39d93" } as const;
const statusRow = { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 6 } as const;
const dot = { width: 8, height: 8, borderRadius: 999, display: "inline-block" } as const;
const errBox = { minHeight: "60vh", display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", gap: 16, color: "#f0ece4", background: "#0e0f11" };
const btnGold = { background: "#f49921", color: "#0e0f11", border: "none", padding: "10px 24px", fontWeight: 700, cursor: "pointer" } as const;