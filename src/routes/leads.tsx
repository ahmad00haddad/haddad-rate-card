import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export const Route = createFileRoute("/leads")({
  head: () => ({
    meta: [
      { title: "طلبات عروض الأسعار — الإدارة" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LeadsPage,
});

type Lead = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  region: string | null;
  service: string | null;
  event_date: string | null;
  message: string | null;
  status: string;
  created_at: string;
};

function LeadsPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (!data.session) { setIsAdmin(false); setLoading(false); }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!active) return;
      setSession(s);
      if (!s) { setIsAdmin(false); setLoading(false); }
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!session) return;
    (async () => {
      const { data: role } = await supabase
        .from("user_roles").select("role")
        .eq("user_id", session.user.id).eq("role", "admin").maybeSingle();
      const admin = !!role;
      setIsAdmin(admin);
      if (!admin) { setLoading(false); return; }
      const { data, error } = await supabase
        .from("quote_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) setErr(error.message);
      else setLeads((data ?? []) as Lead[]);
      setLoading(false);
    })();
  }, [session]);

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from("quote_requests").update({ status }).eq("id", id);
    if (error) { alert(error.message); return; }
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
  }
  async function remove(id: string) {
    if (!confirm("حذف هذا الطلب نهائياً؟")) return;
    const { error } = await supabase.from("quote_requests").delete().eq("id", id);
    if (error) { alert(error.message); return; }
    setLeads((prev) => prev.filter((l) => l.id !== id));
  }

  return (
    <div dir="rtl" style={page}>
      <header style={navWrap}>
        <Link to="/" style={{ textDecoration: "none" }}>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: "#f0ece4" }}>
            أحمد حداد
          </span>
          <span style={{ display: "block", fontSize: 11, letterSpacing: 2, color: "#f49921" }}>
            طلبات العملاء
          </span>
        </Link>
        <nav style={{ display: "flex", gap: 10 }}>
          <Link to="/admin" style={navBtn}>المعدات</Link>
          <Link to="/" style={navBtn}>الرئيسية</Link>
        </nav>
      </header>
      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px 80px" }}>
        {!session ? (
          <p style={{ textAlign: "center", color: "#9b948a" }}>
            الرجاء تسجيل الدخول من <Link to="/admin" style={{ color: "#f49921" }}>لوحة الإدارة</Link>.
          </p>
        ) : loading ? (
          <p style={{ textAlign: "center", color: "#9b948a" }}>جاري التحميل…</p>
        ) : !isAdmin ? (
          <p style={{ textAlign: "center", color: "#ff9a9a" }}>غير مصرح.</p>
        ) : err ? (
          <p style={{ textAlign: "center", color: "#ff9a9a" }}>{err}</p>
        ) : leads.length === 0 ? (
          <p style={{ textAlign: "center", color: "#9b948a" }}>لا توجد طلبات بعد.</p>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            <p style={{ color: "#9b948a", fontSize: 13 }}>{leads.length} طلب</p>
            {leads.map((l) => (
              <article key={l.id} style={card}>
                <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                  <div>
                    <h3 style={{ fontSize: 18, color: "#f0ece4", marginBottom: 4 }}>{l.name}</h3>
                    <div style={{ fontSize: 12, color: "#9b948a" }}>
                      {new Date(l.created_at).toLocaleString("ar-JO")}
                    </div>
                  </div>
                  <select
                    value={l.status}
                    onChange={(e) => updateStatus(l.id, e.target.value)}
                    style={{ ...input, width: "auto" }}
                  >
                    <option value="new">جديد</option>
                    <option value="contacted">تم التواصل</option>
                    <option value="quoted">أُرسل عرض</option>
                    <option value="won">مكسب</option>
                    <option value="lost">خسر</option>
                  </select>
                </header>
                <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, fontSize: 13 }}>
                  <Row label="هاتف">
                    <a href={`https://wa.me/${l.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" style={{ color: "#f49921" }}>{l.phone}</a>
                  </Row>
                  {l.email && <Row label="بريد">{l.email}</Row>}
                  {l.region && <Row label="منطقة">{l.region === "amman" ? "عمّان" : "إربد"}</Row>}
                  {l.service && <Row label="خدمة">{l.service}</Row>}
                  {l.event_date && <Row label="تاريخ">{l.event_date}</Row>}
                </dl>
                {l.message && (
                  <p style={{ marginTop: 12, padding: 12, background: "#0a0b0d", borderRadius: 4, color: "#c0bab0", fontSize: 13, whiteSpace: "pre-wrap" }}>
                    {l.message}
                  </p>
                )}
                <div style={{ marginTop: 12, textAlign: "left" }}>
                  <button onClick={() => remove(l.id)} style={{ ...btnSm, borderColor: "rgba(220,60,60,0.4)", color: "#ff9a9a" }}>حذف</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt style={{ fontSize: 11, color: "#9b948a", marginBottom: 2 }}>{label}</dt>
      <dd style={{ color: "#f0ece4" }}>{children}</dd>
    </div>
  );
}

const page = { minHeight: "100vh", background: "#0e0f11", color: "#f0ece4", fontFamily: "'SFMada', system-ui, sans-serif" } as const;
const navWrap = { position: "sticky" as const, top: 0, zIndex: 50, padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(14,15,17,0.9)", backdropFilter: "blur(14px)", borderBottom: "1px solid rgba(244,153,33,0.25)" };
const navBtn = { padding: "8px 16px", border: "1px solid rgba(244,153,33,0.35)", color: "#f49921", textDecoration: "none", fontSize: 13, fontWeight: 600, letterSpacing: 1, borderRadius: 2 } as const;
const input = { background: "#0a0b0d", border: "1px solid rgba(244,153,33,0.25)", color: "#f0ece4", padding: "8px 12px", borderRadius: 2, fontSize: 13, fontFamily: "inherit" };
const btnSm = { background: "transparent", border: "1px solid rgba(244,153,33,0.35)", color: "#f49921", padding: "6px 12px", fontWeight: 600, cursor: "pointer", borderRadius: 2, fontSize: 12 } as const;
const card = { background: "#171a1d", border: "1px solid rgba(244,153,33,0.2)", borderRadius: 4, padding: 20 } as const;