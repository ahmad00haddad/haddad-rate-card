import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

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
  rental_percentage: number;
  daily_rental_price: number;
  image_path: string | null;
  is_available: boolean;
};

function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) { setIsAdmin(false); setChecking(false); }
    });
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    return () => sub.subscription.unsubscribe();
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
      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px 80px" }}>
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
  return { name: "", description: "", category: "", original_price: 0, rental_percentage: 0, daily_rental_price: 0, image_path: "", is_available: true };
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

  function startNew() { setEditing(null); setForm(emptyForm()); }
  function startEdit(e: Equipment) { setEditing(e); const { id: _id, ...rest } = e; setForm(rest); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, original_price: Number(form.original_price), rental_percentage: Number(form.rental_percentage), daily_rental_price: Number(form.daily_rental_price) };
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

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 380px)", gap: 24 }}>
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#f0ece4", margin: 0 }}>المعدات ({data?.length ?? 0})</h2>
          <button onClick={startNew} style={btnGold}>+ جديد</button>
        </div>
        {isLoading && <p style={{ color: "#9b948a" }}>تحميل…</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {data?.map((it) => (
            <div key={it.id} style={{ display: "flex", gap: 12, padding: 12, background: "#15171a", border: "1px solid rgba(244,153,33,0.15)", borderRadius: 4 }}>
              <div style={{ width: 80, height: 80, background: "#0a0b0d", flexShrink: 0, overflow: "hidden", borderRadius: 2 }}>
                {it.image_path && <img src={it.image_path} alt={it.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <strong style={{ color: "#f0ece4" }}>{it.name}</strong>
                  <span style={{ fontSize: 11, color: "#f49921" }}>{it.category}</span>
                </div>
                <p style={{ margin: "4px 0 8px", color: "#9b948a", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{it.description}</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => startEdit(it)} style={btnSm}>تعديل</button>
                  <button onClick={() => remove(it.id)} style={{ ...btnSm, borderColor: "#ef6c6c", color: "#ef6c6c" }}>حذف</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <aside style={{ position: "sticky", top: 90, alignSelf: "start", background: "#15171a", padding: 20, border: "1px solid rgba(244,153,33,0.2)", borderRadius: 4 }}>
        <h3 style={{ fontFamily: "'Playfair Display', serif", color: "#f0ece4", margin: "0 0 16px" }}>
          {editing ? `تعديل #${editing.id}` : "إضافة جديدة"}
        </h3>
        <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={lbl}>الاسم<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={input} /></label>
          <label style={lbl}>الفئة<input value={form.category ?? ""} onChange={(e) => setForm({ ...form, category: e.target.value })} style={input} /></label>
          <label style={lbl}>الوصف<textarea rows={3} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ ...input, resize: "vertical" }} /></label>
          <label style={lbl}>رابط الصورة<input value={form.image_path ?? ""} onChange={(e) => setForm({ ...form, image_path: e.target.value })} style={input} /></label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <label style={lbl}>السعر الأصلي<input type="number" step="0.01" value={form.original_price} onChange={(e) => setForm({ ...form, original_price: Number(e.target.value) })} style={input} /></label>
            <label style={lbl}>سعر اليوم<input type="number" step="0.01" value={form.daily_rental_price} onChange={(e) => setForm({ ...form, daily_rental_price: Number(e.target.value) })} style={input} /></label>
          </div>
          <label style={{ ...lbl, flexDirection: "row", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={form.is_available} onChange={(e) => setForm({ ...form, is_available: e.target.checked })} />
            متوفر
          </label>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button type="submit" disabled={saving} style={{ ...btnGold, flex: 1 }}>{saving ? "..." : editing ? "حفظ" : "إضافة"}</button>
            {editing && <button type="button" onClick={startNew} style={btnSm}>إلغاء</button>}
          </div>
        </form>
      </aside>
    </div>
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