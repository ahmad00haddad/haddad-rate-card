import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { estimateEquipmentPrice } from "@/lib/equipment-ai.functions";
import { normalizeAr } from "@/lib/ar-normalize";
import PricingAdmin from "@/components/PricingAdmin";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "لوحة الإدارة — المعدات" }, { name: "robots", content: "noindex" }] }),
  component: AdminPage,
  errorComponent: ({ error, reset }) => (
    <div style={errBox}>
      <p>خطأ: {error.message}</p>
      <button onClick={reset} style={btnGold}>إعادة المحاولة</button>
    </div>
  ),
  notFoundComponent: () => <div style={errBox}>غير موجود.</div>,
});

type Equipment = {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  original_price: number;
  image_path: string | null;
  is_available: boolean;
};

function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!active) return;
      setSession(s);
      if (!s) { setIsAdmin(false); setChecking(false); }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (!data.session) { setIsAdmin(false); setChecking(false); }
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!session) return;
    setChecking(true);
    supabase.from("user_roles").select("role").eq("user_id", session.user.id).eq("role", "admin").maybeSingle()
      .then(({ data }) => { setIsAdmin(!!data); setChecking(false); });
  }, [session]);

  return (
    <div dir="rtl" style={page}>
      <Nav session={session} isAdmin={!!isAdmin} />
      <main style={{ width: "100%", margin: "0 auto", padding: "32px 24px 80px" }}>
        {!session ? <LoginCard /> : checking ? <p style={{ textAlign: "center", color: "#9b948a" }}>جاري التحقق…</p> : isAdmin ? <AdminPanel /> : <NotAuthorized />}
      </main>
    </div>
  );
}

function Nav({ session, isAdmin }: { session: Session | null; isAdmin: boolean }) {
  return (
    <header style={navWrap}>
      <Link to="/" style={{ textDecoration: "none", display: "flex", flexDirection: "column" }}>
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: "#f0ece4" }}>أحمد حداد</span>
        <span style={{ fontSize: 11, letterSpacing: 2, color: "#f49921" }}>لوحة الإدارة</span>
      </Link>
      <nav style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <Link to="/" style={navBtn}>التسعيرات</Link>
        <Link to="/equipment" style={navBtn}>المعدات</Link>
        <Link to="/leads" style={navBtn}>الطلبات</Link>
        {session && (
          <>
            {isAdmin && <span style={{ color: "#86efac", fontSize: 12 }}>● مدير</span>}
            <button onClick={() => supabase.auth.signOut()} style={{ ...navBtn, cursor: "pointer", background: "transparent" }}>خروج</button>
          </>
        )}
      </nav>
    </header>
  );
}

function LoginCard() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setMsg(null);
    const fn = mode === "login" ? supabase.auth.signInWithPassword({ email, password }) : supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/admin` } });
    const { error } = await fn;
    setLoading(false);
    if (error) setMsg(error.message);
    else if (mode === "signup") setMsg("تم إنشاء الحساب — تواصل مع المدير لتفعيل صلاحياتك.");
  }

  return (
    <div style={{ maxWidth: 420, margin: "60px auto", background: "#15171a", padding: 32, border: "1px solid rgba(244,153,33,0.2)", borderRadius: 4 }}>
      <h1 style={{ fontFamily: "'Playfair Display', serif", margin: 0, color: "#f0ece4", fontSize: 28, textAlign: "center" }}>{mode === "login" ? "تسجيل الدخول" : "إنشاء حساب"}</h1>
      <p style={{ color: "#9b948a", textAlign: "center", marginTop: 8, fontSize: 13 }}>لوحة إدارة المعدات</p>
      <form onSubmit={submit} style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="البريد الإلكتروني" style={input} />
        <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="كلمة المرور" style={input} />
        <button type="submit" disabled={loading} style={{ ...btnGold, opacity: loading ? 0.6 : 1 }}>{loading ? "..." : mode === "login" ? "دخول" : "تسجيل"}</button>
      </form>
      {msg && <p style={{ color: msg.startsWith("تم") ? "#86efac" : "#ef6c6c", fontSize: 13, marginTop: 12, textAlign: "center" }}>{msg}</p>}
      <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMsg(null); }} style={{ marginTop: 16, background: "transparent", border: "none", color: "#f49921", cursor: "pointer", fontSize: 13, width: "100%" }}>
        {mode === "login" ? "ليس لديك حساب؟ سجّل الآن" : "لديك حساب؟ سجّل الدخول"}
      </button>
    </div>
  );
}

function NotAuthorized() {
  return (
    <div style={{ maxWidth: 480, margin: "80px auto", textAlign: "center" }}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#f0ece4" }}>لا توجد صلاحيات</h2>
      <p style={{ color: "#9b948a" }}>حسابك ليس مديراً. تواصل مع مالك الموقع لإضافتك كمدير.</p>
      <button onClick={() => supabase.auth.signOut()} style={btnGold}>تسجيل الخروج</button>
    </div>
  );
}

function emptyForm(): Omit<Equipment, "id"> {
  return { name: "", description: "", category: "", original_price: 0, image_path: "", is_available: true };
}

function AdminPanel() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["equipment-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("equipment").select("*").order("id", { ascending: false });
      if (error) throw error;
      return data as Equipment[];
    },
  });

  const [editing, setEditing] = useState<Equipment | null>(null);
  const [form, setForm] = useState<Omit<Equipment, "id">>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMsg, setAiMsg] = useState<string | null>(null);
  const runEstimate = useServerFn(estimateEquipmentPrice);

  function startNew() { setEditing(null); setForm(emptyForm()); }
  function startEdit(e: Equipment) { setEditing(e); const { id: _id, ...rest } = e; setForm(rest); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, original_price: Number(form.original_price) };
    const { error } = editing
      ? await supabase.from("equipment").update(payload).eq("id", editing.id)
      : await supabase.from("equipment").insert(payload);
    setSaving(false);
    if (error) { alert(error.message); return; }
    startNew();
    qc.invalidateQueries({ queryKey: ["equipment-admin"] });
    qc.invalidateQueries({ queryKey: ["equipment"] });
  }

  async function remove(id: number) {
    if (!confirm("حذف هذا العنصر نهائياً؟")) return;
    const { error } = await supabase.from("equipment").delete().eq("id", id);
    if (error) { alert(error.message); return; }
    qc.invalidateQueries({ queryKey: ["equipment-admin"] });
    qc.invalidateQueries({ queryKey: ["equipment"] });
  }

  async function aiEstimate() {
    if (!form.name.trim()) { setAiMsg("أدخل اسم المعدّة أولاً"); return; }
    setAiLoading(true); setAiMsg(null);
    try {
      const r = await runEstimate({ data: { name: form.name, category: form.category, description: form.description } });
      setForm({ ...form, original_price: r.price });
      setAiMsg(`تم التقدير (${r.confidence})${r.notes ? " — " + r.notes : ""}`);
    } catch (err) {
      setAiMsg((err as Error).message);
    } finally {
      setAiLoading(false);
    }
  }

  const stats = useMemo(() => {
    const items = data ?? [];
    const total = items.length;
    const available = items.filter((i) => i.is_available).length;
    const totalValue = items.reduce((s, i) => s + Number(i.original_price || 0), 0);
    const categories = new Set(items.map((i) => i.category).filter(Boolean)).size;
    return { total, available, unavailable: total - available, totalValue, categories };
  }, [data]);

  const categories = useMemo(() => {
    const s = new Set<string>();
    (data ?? []).forEach((e) => e.category && s.add(e.category));
    return ["الكل", ...Array.from(s)];
  }, [data]);
  const [cat, setCat] = useState("الكل");

  const filtered = useMemo(() => {
    const q = normalizeAr(query);
    return (data ?? []).filter((it) => {
      if (cat !== "الكل" && it.category !== cat) return false;
      if (q && !normalizeAr(`${it.name} ${it.description ?? ""}`).includes(q)) return false;
      return true;
    });
  }, [data, query, cat]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div>
        <p style={{ color: "#f49921", fontSize: 12, letterSpacing: 3, margin: 0 }}>لوحة التحكم</p>
        <h1 style={{ fontFamily: "'Playfair Display', serif", color: "#f0ece4", margin: "6px 0 0", fontSize: 32 }}>نظرة عامة</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
        <StatCard label="إجمالي المعدات" value={stats.total} />
        <StatCard label="المتاحة" value={stats.available} accent="#3ddc97" />
        <StatCard label="غير المتاحة" value={stats.unavailable} accent="#ef6c6c" />
        <StatCard label="عدد الفئات" value={stats.categories} />
        <StatCard label="القيمة الإجمالية" value={`${stats.totalValue.toLocaleString()} د.أ`} wide />
      </div>

      <PricingAdmin />

      <AnalyticsSection />

      <div className="admin-grid">
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 10, flexWrap: "wrap" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#f0ece4", margin: 0, fontSize: 22 }}>المعدات ({filtered.length})</h2>
            <button onClick={startNew} style={btnGold}>+ إضافة معدّة</button>
          </div>
          <div className="admin-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: 10, marginBottom: 14 }}>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="بحث..." style={input} />
            <select value={cat} onChange={(e) => setCat(e.target.value)} style={input}>
              {categories.map((c) => <option key={c} value={c} style={{ background: "#15171a" }}>{c}</option>)}
            </select>
          </div>
          {isLoading && <p style={{ color: "#9b948a" }}>تحميل…</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((it) => (
              <div key={it.id} style={{ display: "flex", gap: 12, padding: 12, background: "#15171a", border: "1px solid rgba(244,153,33,0.15)", borderRadius: 8 }}>
                <div style={{ width: 80, height: 80, background: "#fff", flexShrink: 0, overflow: "hidden", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", padding: 4 }}>
                  {it.image_path && <img src={it.image_path} alt={it.name} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                    <strong style={{ color: "#f0ece4" }}>{it.name}</strong>
                    <span style={{ fontSize: 11, color: "#f49921" }}>{it.category}</span>
                  </div>
                  <p style={{ margin: "4px 0 8px", color: "#9b948a", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{it.description}</p>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, color: "#cfc8bd" }}>السعر: <strong style={{ color: "#f0ece4" }}>{Number(it.original_price).toLocaleString()} د.أ</strong></span>
                    <span style={{ flex: 1 }} />
                    <button onClick={() => startEdit(it)} style={btnSm}>تعديل</button>
                    <button onClick={() => remove(it.id)} style={{ ...btnSm, borderColor: "#ef6c6c", color: "#ef6c6c" }}>حذف</button>
                  </div>
                </div>
              </div>
            ))}
            {!isLoading && filtered.length === 0 && <p style={{ color: "#9b948a", textAlign: "center", padding: 20 }}>لا توجد نتائج.</p>}
          </div>
        </section>

        <aside style={{ position: "sticky", top: 90, background: "#15171a", padding: 22, border: "1px solid rgba(244,153,33,0.2)", borderRadius: 10 }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", color: "#f0ece4", margin: "0 0 16px", fontSize: 20 }}>
            {editing ? `تعديل #${editing.id}` : "إضافة معدّة جديدة"}
          </h3>
          <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label style={lbl}>الاسم<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={input} /></label>
            <label style={lbl}>الفئة<input value={form.category ?? ""} onChange={(e) => setForm({ ...form, category: e.target.value })} style={input} /></label>
            <label style={lbl}>الوصف<textarea rows={3} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ ...input, resize: "vertical" }} /></label>
            <label style={lbl}>رابط الصورة<input value={form.image_path ?? ""} onChange={(e) => setForm({ ...form, image_path: e.target.value })} style={input} /></label>
            <label style={lbl}>
              سعر الشراء (د.أ)
              <input type="number" step="0.01" value={form.original_price} onChange={(e) => setForm({ ...form, original_price: Number(e.target.value) })} style={input} />
            </label>
            <button type="button" onClick={aiEstimate} disabled={aiLoading} style={{ ...btnSm, padding: "10px 12px", opacity: aiLoading ? 0.6 : 1 }}>
              {aiLoading ? "جاري التقدير…" : "✦ اقتراح السعر بالذكاء الاصطناعي"}
            </button>
            {aiMsg && <p style={{ fontSize: 12, color: aiMsg.startsWith("تم") ? "#86efac" : "#ef6c6c", margin: 0 }}>{aiMsg}</p>}
            <label style={{ ...lbl, flexDirection: "row", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={form.is_available} onChange={(e) => setForm({ ...form, is_available: e.target.checked })} />
              متوفر
            </label>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button type="submit" disabled={saving} style={{ ...btnGold, flex: 1 }}>{saving ? "..." : editing ? "حفظ التعديلات" : "إضافة"}</button>
              {editing && <button type="button" onClick={startNew} style={btnSm}>إلغاء</button>}
            </div>
          </form>
        </aside>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent, wide }: { label: string; value: number | string; accent?: string; wide?: boolean }) {
  return (
    <div style={{ background: "#15171a", border: "1px solid rgba(244,153,33,0.18)", borderRadius: 12, padding: "18px 20px", gridColumn: wide ? "span 2" : undefined }}>
      <p style={{ margin: 0, color: "#9b948a", fontSize: 12, letterSpacing: 1 }}>{label}</p>
      <p style={{ margin: "8px 0 0", fontFamily: "'Playfair Display', serif", fontSize: 28, color: accent ?? "#f49921", fontWeight: 700 }}>{value}</p>
    </div>
  );
}

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

function AnalyticsSection() {
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
    <section style={{ background: "#15171a", border: "1px solid rgba(244,153,33,0.2)", borderRadius: 12, padding: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <div>
          <p style={{ color: "#f49921", fontSize: 12, letterSpacing: 3, margin: 0 }}>التحليلات</p>
          <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#f0ece4", margin: "4px 0 0", fontSize: 22 }}>الزوار وخياراتهم</h2>
        </div>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} style={{ ...input, width: "auto" }}>
          <option value={1} style={{ background: "#15171a" }}>آخر 24 ساعة</option>
          <option value={7} style={{ background: "#15171a" }}>آخر 7 أيام</option>
          <option value={30} style={{ background: "#15171a" }}>آخر 30 يوم</option>
          <option value={90} style={{ background: "#15171a" }}>آخر 90 يوم</option>
        </select>
      </div>

      {isLoading ? (
        <p style={{ color: "#9b948a" }}>تحميل…</p>
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
              <h3 style={{ color: "#f0ece4", fontSize: 15, margin: "0 0 12px", fontFamily: "'Playfair Display', serif" }}>المنطقة المختارة</h3>
              {summary.totalRegion === 0 ? (
                <p style={{ color: "#9b948a", fontSize: 13 }}>لا توجد بيانات بعد.</p>
              ) : (
                ["amman", "irbid"].map((k) => {
                  const v = summary.regions[k] ?? 0;
                  const pct = summary.totalRegion ? Math.round((v / summary.totalRegion) * 100) : 0;
                  return (
                    <div key={k} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#cfc8bd", marginBottom: 4 }}>
                        <span>{REGION_LABELS[k]}</span>
                        <span style={{ color: "#f49921" }}>{v} ({pct}%)</span>
                      </div>
                      <div style={{ height: 8, background: "#0a0b0d", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: k === "amman" ? "#f49921" : "#3ddc97" }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div>
              <h3 style={{ color: "#f0ece4", fontSize: 15, margin: "0 0 12px", fontFamily: "'Playfair Display', serif" }}>الخدمات الأكثر طلباً</h3>
              {summary.sortedServices.length === 0 ? (
                <p style={{ color: "#9b948a", fontSize: 13 }}>لا توجد بيانات بعد.</p>
              ) : (
                summary.sortedServices.map(([k, v]) => {
                  const pct = Math.round((v / maxSvc) * 100);
                  return (
                    <div key={k} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#cfc8bd", marginBottom: 4 }}>
                        <span>{SERVICE_LABELS[k] ?? k}</span>
                        <span style={{ color: "#f49921" }}>{v}</span>
                      </div>
                      <div style={{ height: 8, background: "#0a0b0d", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: "#f49921" }} />
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

const page = { minHeight: "100vh", background: "#0e0f11", color: "#f0ece4", fontFamily: "'SFMada', system-ui, sans-serif" } as const;
const navWrap = { position: "sticky" as const, top: 0, zIndex: 50, padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(14,15,17,0.9)", backdropFilter: "blur(14px)", borderBottom: "1px solid rgba(244,153,33,0.25)" };
const navBtn = { padding: "8px 16px", border: "1px solid rgba(244,153,33,0.35)", color: "#f49921", textDecoration: "none", fontSize: 13, fontWeight: 600, letterSpacing: 1, borderRadius: 2 } as const;
const input = { background: "#0a0b0d", border: "1px solid rgba(244,153,33,0.25)", color: "#f0ece4", padding: "10px 12px", borderRadius: 2, fontSize: 13, fontFamily: "inherit", width: "100%", boxSizing: "border-box" as const };
const lbl = { display: "flex", flexDirection: "column" as const, gap: 4, fontSize: 12, color: "#9b948a" };
const btnGold = { background: "#f49921", color: "#0e0f11", border: "none", padding: "10px 18px", fontWeight: 700, cursor: "pointer", borderRadius: 2, fontSize: 13 } as const;
const btnSm = { background: "transparent", border: "1px solid rgba(244,153,33,0.35)", color: "#f49921", padding: "6px 12px", fontWeight: 600, cursor: "pointer", borderRadius: 2, fontSize: 12 } as const;
const errBox = { minHeight: "60vh", display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", gap: 16, color: "#f0ece4", background: "#0e0f11" };