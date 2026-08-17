import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type PricingItem = {
  id: string;
  item_key: string;
  label: string;
  price_text: string;
  unit_text: string;
  note_text: string;
  sort_order: number;
};

const input = {
  background: "#0a0b0d",
  border: "1px solid rgba(244,153,33,0.25)",
  color: "#f0ece4",
  padding: "8px 10px",
  borderRadius: 2,
  fontSize: 13,
  fontFamily: "inherit",
  width: "100%",
  boxSizing: "border-box" as const,
};
const btnGold = {
  background: "#f49921",
  color: "#0e0f11",
  border: "none",
  padding: "8px 16px",
  fontWeight: 700,
  cursor: "pointer",
  borderRadius: 2,
  fontSize: 13,
} as const;
const btnSm = {
  background: "transparent",
  border: "1px solid rgba(244,153,33,0.35)",
  color: "#f49921",
  padding: "6px 12px",
  fontWeight: 600,
  cursor: "pointer",
  borderRadius: 2,
  fontSize: 12,
} as const;

export default function PricingAdmin() {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [drafts, setDrafts] = useState<Record<string, Partial<PricingItem>>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["pricing_items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pricing_items")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as PricingItem[];
    },
  });

  const items = useMemo(() => {
    const q = query.trim();
    return (data ?? []).filter((i) => !q || i.label.includes(q));
  }, [data, query]);

  function setDraft(id: string, patch: Partial<PricingItem>) {
    setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));
  }

  async function save(item: PricingItem) {
    const patch = drafts[item.id];
    if (!patch) return;
    setSaving(item.id);
    setMsg("");
    const { error } = await supabase
      .from("pricing_items")
      .update({
        price_text: (patch.price_text ?? item.price_text).trim(),
        unit_text: (patch.unit_text ?? item.unit_text).trim(),
        note_text: (patch.note_text ?? item.note_text).trim(),
      })
      .eq("id", item.id);
    setSaving(null);
    if (error) {
      setMsg("تعذّر الحفظ: " + error.message);
      return;
    }
    setDrafts((d) => {
      const n = { ...d };
      delete n[item.id];
      return n;
    });
    setMsg("تم الحفظ ✓ التغيير يظهر مباشرة في بطاقة الأسعار");
    qc.invalidateQueries({ queryKey: ["pricing_items"] });
  }

  return (
    <section
      style={{
        background: "#15171a",
        border: "1px solid rgba(244,153,33,0.2)",
        borderRadius: 12,
        padding: 22,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 6,
        }}
      >
        <h2
          style={{
            fontFamily: "'Playfair Display', serif",
            color: "#f0ece4",
            margin: 0,
            fontSize: 22,
          }}
        >
          إدارة الأسعار
        </h2>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="بحث في البنود…"
          style={{ ...input, maxWidth: 260 }}
        />
      </div>
      <p style={{ color: "#9b948a", fontSize: 12, margin: "0 0 16px" }}>
        اكتب السعر رقماً واحداً (مثال: 250) أو نطاقاً (مثال: 150–200). أي تعديل يظهر
        فوراً في بطاقة الأسعار للزوار.
      </p>
      {msg && (
        <p style={{ color: msg.startsWith("تم") ? "#3ddc97" : "#ef6c6c", fontSize: 13 }}>{msg}</p>
      )}
      {isLoading && <p style={{ color: "#9b948a" }}>تحميل…</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((it) => {
          const d = drafts[it.id] ?? {};
          const dirty = Object.keys(d).length > 0;
          return (
            <div
              key={it.id}
              style={{
                background: "#0e0f11",
                border: `1px solid ${dirty ? "rgba(244,153,33,0.5)" : "rgba(244,153,33,0.12)"}`,
                borderRadius: 8,
                padding: 12,
                display: "grid",
                gap: 8,
              }}
            >
              <strong style={{ color: "#f0ece4", fontSize: 14 }}>{it.label}</strong>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                  gap: 8,
                }}
              >
                <label style={{ display: "grid", gap: 4, fontSize: 11, color: "#9b948a" }}>
                  السعر / النطاق
                  <input
                    value={d.price_text ?? it.price_text}
                    onChange={(e) => setDraft(it.id, { price_text: e.target.value })}
                    style={input}
                  />
                </label>
                <label style={{ display: "grid", gap: 4, fontSize: 11, color: "#9b948a" }}>
                  الوحدة
                  <input
                    value={d.unit_text ?? it.unit_text}
                    onChange={(e) => setDraft(it.id, { unit_text: e.target.value })}
                    style={input}
                  />
                </label>
                <label style={{ display: "grid", gap: 4, fontSize: 11, color: "#9b948a" }}>
                  ملاحظة (سعر عمّان مثلاً)
                  <input
                    value={d.note_text ?? it.note_text}
                    onChange={(e) => setDraft(it.id, { note_text: e.target.value })}
                    style={input}
                  />
                </label>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                {dirty && (
                  <button
                    style={btnSm}
                    onClick={() =>
                      setDrafts((s) => {
                        const n = { ...s };
                        delete n[it.id];
                        return n;
                      })
                    }
                  >
                    تراجع
                  </button>
                )}
                <button
                  style={{ ...btnGold, opacity: dirty ? 1 : 0.4 }}
                  disabled={!dirty || saving === it.id}
                  onClick={() => save(it)}
                >
                  {saving === it.id ? "جارٍ الحفظ…" : "حفظ"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
