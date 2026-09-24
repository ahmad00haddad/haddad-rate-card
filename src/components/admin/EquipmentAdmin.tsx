import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { supabase } from '@/integrations/supabase/client';
import { estimateEquipmentPrice } from '@/lib/equipment-ai.functions';
import { normalizeAr } from '@/lib/ar-normalize';
import { StatCard } from './StatCard';

type Equipment = {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  original_price: number;
  image_path: string | null;
  is_available: boolean;
  daily_rental_price: number;
  rental_percentage: number;
};

function emptyForm(): Omit<Equipment, 'id'> {
  return { name: '', description: '', category: '', original_price: 0, image_path: '', is_available: true, daily_rental_price: 0, rental_percentage: 0 };
}

const input = { background: "#0e0e0e", border: "1px solid rgba(242,228,212,0.15)", color: "#f2e4d4", padding: "10px 12px", borderRadius: 6, fontSize: 13, fontFamily: "inherit", width: "100%", boxSizing: "border-box" as const };
const lbl = { display: "flex", flexDirection: "column" as const, gap: 4, fontSize: 12, color: "#bdb3a0" };
const btnRed = { background: "#b72534", color: "#f2e4d4", border: "none", padding: "10px 18px", fontWeight: 700, cursor: "pointer", borderRadius: 6, fontSize: 13 } as const;
const btnSm = { background: "transparent", border: "1px solid rgba(183,37,52,0.35)", color: "#b72534", padding: "6px 12px", fontWeight: 600, cursor: "pointer", borderRadius: 6, fontSize: 12 } as const;

export function EquipmentAdmin() {
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
  function startEdit(e: Equipment) { setEditing(e); const { id: _id, ...rest } = e; setForm({ ...rest, daily_rental_price: rest.daily_rental_price ?? 0, rental_percentage: rest.rental_percentage ?? 0 }); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, original_price: Number(form.original_price), daily_rental_price: Number(form.daily_rental_price) || 0, rental_percentage: Number(form.rental_percentage) || 0 };
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
        <StatCard label="إجمالي المعدات" value={stats.total} />
        <StatCard label="المتاحة" value={stats.available} accent="#3ddc97" />
        <StatCard label="غير المتاحة" value={stats.unavailable} accent="#ef6c6c" />
        <StatCard label="عدد الفئات" value={stats.categories} />
        <StatCard label="القيمة الإجمالية" value={`${stats.totalValue.toLocaleString()} د.أ`} wide />
      </div>

      <div className="admin-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 300px", gap: 24, alignItems: "start" }}>
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 10, flexWrap: "wrap" }}>
            <h2 style={{ color: "#f2e4d4", margin: 0, fontSize: 22 }}>المعدات ({filtered.length})</h2>
            <button onClick={startNew} style={btnRed}>+ إضافة معدّة</button>
          </div>
          <div className="admin-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: 10, marginBottom: 14 }}>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="بحث..." style={input} />
            <select value={cat} onChange={(e) => setCat(e.target.value)} style={input}>
              {categories.map((c) => <option key={c} value={c} style={{ background: "#161616" }}>{c}</option>)}
            </select>
          </div>
          {isLoading && <p style={{ color: "#bdb3a0" }}>تحميل…</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((it) => (
              <div key={it.id} style={{ display: "flex", gap: 12, padding: 12, background: "#161616", border: "1px solid rgba(183,37,52,0.15)", borderRadius: 12 }}>
                <div style={{ width: 80, height: 80, background: "#fff", flexShrink: 0, overflow: "hidden", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", padding: 4 }}>
                  {it.image_path && <img src={it.image_path} alt={it.name} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                    <strong style={{ color: "#f2e4d4" }}>{it.name}</strong>
                    <span style={{ fontSize: 11, color: "#b72534" }}>{it.category}</span>
                  </div>
                  <p style={{ margin: "4px 0 8px", color: "#bdb3a0", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{it.description}</p>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, color: "#cfc8bd" }}>السعر: <strong style={{ color: "#f2e4d4" }}>{Number(it.original_price).toLocaleString()} د.أ</strong></span>
                    <span style={{ flex: 1 }} />
                    <button onClick={() => startEdit(it)} style={btnSm}>تعديل</button>
                    <button onClick={() => remove(it.id)} style={{ ...btnSm, borderColor: "#ef6c6c", color: "#ef6c6c" }}>حذف</button>
                  </div>
                </div>
              </div>
            ))}
            {!isLoading && filtered.length === 0 && <p style={{ color: "#bdb3a0", textAlign: "center", padding: 20 }}>لا توجد نتائج.</p>}
          </div>
        </section>

        <aside style={{ position: "sticky", top: 90, background: "#161616", padding: 22, border: "1px solid rgba(183,37,52,0.2)", borderRadius: 12 }}>
          <h3 style={{ color: "#f2e4d4", margin: "0 0 16px", fontSize: 20 }}>
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
            <button type="button" onClick={aiEstimate} disabled={aiLoading} style={{ ...btnSm, padding: "10px 12px", opacity: aiLoading ? 0.6 : 1, width: '100%', boxSizing: 'border-box' }}>
              {aiLoading ? "جاري التقدير…" : "✦ اقتراح السعر بالذكاء الاصطناعي"}
            </button>
            {aiMsg && <p style={{ fontSize: 12, color: aiMsg.startsWith("تم") ? "#86efac" : "#ef6c6c", margin: 0 }}>{aiMsg}</p>}
            <label style={{ ...lbl, flexDirection: "row", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={form.is_available} onChange={(e) => setForm({ ...form, is_available: e.target.checked })} />
              متوفر
            </label>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button type="submit" disabled={saving} style={{ ...btnRed, flex: 1 }}>{saving ? "..." : editing ? "حفظ التعديلات" : "إضافة"}</button>
              {editing && <button type="button" onClick={startNew} style={btnSm}>إلغاء</button>}
            </div>
          </form>
        </aside>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 768px) {
          .admin-grid { grid-template-columns: 1fr !important; }
          aside { position: static !important; }
        }
      `}} />
    </div>
  );
}
