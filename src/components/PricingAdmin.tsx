import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { normalizeAr } from "@/lib/ar-normalize";

/** One editable row of the public rate card. */
type PricingItem = {
  id: string;
  item_key: string;
  label: string;
  section: string;
  name_ar: string;
  name_en: string;
  desc_ar: string;
  desc_en: string;
  tag_ar: string;
  tag_en: string;
  price_label_ar: string;
  price_label_en: string;
  price_text: string;
  unit_text: string;
  note_text: string;
  is_hidden: boolean;
  sort_order: number;
};

/** Fields the dashboard is allowed to write. */
const EDITABLE_FIELDS = [
  "name_ar",
  "name_en",
  "desc_ar",
  "desc_en",
  "tag_ar",
  "tag_en",
  "price_label_ar",
  "price_label_en",
  "price_text",
  "unit_text",
  "note_text",
] as const;

type EditableField = (typeof EDITABLE_FIELDS)[number];

const SECTION_LABELS: Record<string, string> = {
  reels: "📱 ريلز انستاجرام",
  films: "🎬 أفلام قصيرة",
  commercials: "📺 إعلانات",
  docs: "🎥 وثائقيات",
  events: "🎤 إيفنتات / بودكاست",
  editing: "✂️ مونتاج وتلوين",
  dayrate: "📅 اليومية",
};

const FIELD_LABELS: Record<EditableField, string> = {
  name_ar: "اسم البند (عربي)",
  name_en: "اسم البند (إنجليزي)",
  desc_ar: "الوصف تحت الاسم (عربي)",
  desc_en: "الوصف تحت الاسم (إنجليزي)",
  tag_ar: "الشارة الذهبية (عربي)",
  tag_en: "الشارة الذهبية (إنجليزي)",
  price_label_ar: "التسمية فوق السعر (عربي)",
  price_label_en: "التسمية فوق السعر (إنجليزي)",
  price_text: "السعر / النطاق",
  unit_text: "الوحدة (JOD / ريل …)",
  note_text: "الملاحظة أسفل السعر",
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

const labelStyle = {
  display: "grid",
  gap: 4,
  fontSize: 11,
  color: "#9b948a",
} as const;

export default function PricingAdmin() {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [drafts, setDrafts] = useState<Record<string, Partial<PricingItem>>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [previewKey, setPreviewKey] = useState(0);
  const previewRef = useRef<HTMLIFrameElement | null>(null);

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

  /** Items filtered by the search box, grouped by rate-card section. */
  const groups = useMemo(() => {
    const q = normalizeAr(query.trim());
    const filtered = (data ?? []).filter((i) => {
      if (!q) return true;
      const haystack = normalizeAr(`${i.name_ar} ${i.name_en} ${i.label} ${i.desc_ar}`);
      return haystack.includes(q);
    });
    const map = new Map<string, PricingItem[]>();
    for (const item of filtered) {
      const key = item.section || "other";
      const list = map.get(key);
      if (list) list.push(item);
      else map.set(key, [item]);
    }
    return [...map.entries()];
  }, [data, query]);

  const dirtyCount = Object.keys(drafts).length;

  function setDraft(id: string, patch: Partial<PricingItem>) {
    setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));
  }

  function discard(id: string) {
    setDrafts((d) => {
      const next = { ...d };
      delete next[id];
      return next;
    });
  }

  /** Reload the embedded preview so the admin sees the change instantly. */
  function refreshPreview() {
    previewRef.current?.contentWindow?.postMessage({ type: "lv-pricing-refresh" }, "*");
    setPreviewKey((k) => k + 1);
  }

  function buildPatch(item: PricingItem) {
    const draft = drafts[item.id];
    if (!draft) return null;
    const patch: Record<string, string | boolean> = {};
    for (const field of EDITABLE_FIELDS) {
      const value = draft[field];
      if (typeof value === "string") patch[field] = value.trim();
    }
    if (typeof draft.is_hidden === "boolean") patch.is_hidden = draft.is_hidden;
    // Keep the legacy display label in sync with the Arabic name.
    if (typeof patch.name_ar === "string" && patch.name_ar) patch.label = patch.name_ar;
    return Object.keys(patch).length ? patch : null;
  }

  async function save(item: PricingItem) {
    const patch = buildPatch(item);
    if (!patch) return;
    setSaving(item.id);
    setMsg("");
    const { error } = await supabase.from("pricing_items").update(patch).eq("id", item.id);
    setSaving(null);
    if (error) {
      setMsg("تعذّر الحفظ: " + error.message);
      return;
    }
    discard(item.id);
    setMsg("تم الحفظ ✓ التغيير ظاهر الآن في بطاقة الأسعار");
    await qc.invalidateQueries({ queryKey: ["pricing_items"] });
    refreshPreview();
  }

  async function saveAll() {
    const targets = (data ?? []).filter((i) => drafts[i.id]);
    if (!targets.length) return;
    setSaving("all");
    setMsg("");
    for (const item of targets) {
      const patch = buildPatch(item);
      if (!patch) continue;
      const { error } = await supabase.from("pricing_items").update(patch).eq("id", item.id);
      if (error) {
        setSaving(null);
        setMsg(`تعذّر حفظ «${item.label}»: ${error.message}`);
        return;
      }
      discard(item.id);
    }
    setSaving(null);
    setMsg(`تم حفظ ${targets.length} بند ✓`);
    await qc.invalidateQueries({ queryKey: ["pricing_items"] });
    refreshPreview();
  }

  async function toggleHidden(item: PricingItem) {
    const next = !(drafts[item.id]?.is_hidden ?? item.is_hidden);
    setSaving(item.id);
    const { error } = await supabase
      .from("pricing_items")
      .update({ is_hidden: next })
      .eq("id", item.id);
    setSaving(null);
    if (error) {
      setMsg("تعذّر التحديث: " + error.message);
      return;
    }
    setMsg(next ? "تم إخفاء البند من بطاقة الأسعار" : "تم إظهار البند في بطاقة الأسعار");
    await qc.invalidateQueries({ queryKey: ["pricing_items"] });
    refreshPreview();
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
        اكتب السعر رقماً واحداً (مثال: 250) أو نطاقاً (مثال: 150–200). كل النصوص الظاهرة
        في بطاقة الأسعار — الاسم والوصف والشارة والملاحظة — قابلة للتعديل من هنا، وأي حفظ
        يظهر فوراً للزوار.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <button
          style={{ ...btnGold, opacity: dirtyCount ? 1 : 0.4 }}
          disabled={!dirtyCount || saving === "all"}
          onClick={saveAll}
        >
          {saving === "all" ? "جارٍ الحفظ…" : `حفظ كل التعديلات (${dirtyCount})`}
        </button>
        <button style={btnSm} onClick={refreshPreview}>
          تحديث المعاينة
        </button>
      </div>
      {msg && (
        <p style={{ color: msg.startsWith("تم") ? "#3ddc97" : "#ef6c6c", fontSize: 13 }}>{msg}</p>
      )}
      {isLoading && <p style={{ color: "#9b948a" }}>تحميل…</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {groups.map(([section, sectionItems]) => (
          <div key={section} style={{ display: "grid", gap: 10 }}>
            <h3
              style={{
                color: "#f49921",
                fontSize: 14,
                margin: 0,
                borderBottom: "1px solid rgba(244,153,33,0.18)",
                paddingBottom: 6,
              }}
            >
              {SECTION_LABELS[section] ?? section}
            </h3>
            {sectionItems.map((it) => {
              const d = drafts[it.id] ?? {};
              const dirty = Object.keys(d).length > 0;
              const open = expanded[it.id] ?? false;
              const hidden = d.is_hidden ?? it.is_hidden;
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
                    opacity: hidden ? 0.55 : 1,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                    }}
                  >
                    <strong style={{ color: "#f0ece4", fontSize: 14 }}>
                      {d.name_ar ?? it.name_ar ?? it.label}
                      {hidden && (
                        <span style={{ color: "#9b948a", fontSize: 11 }}> · مخفي</span>
                      )}
                    </strong>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button style={btnSm} onClick={() => toggleHidden(it)}>
                        {hidden ? "إظهار" : "إخفاء"}
                      </button>
                      <button
                        style={btnSm}
                        onClick={() => setExpanded((e) => ({ ...e, [it.id]: !open }))}
                      >
                        {open ? "إخفاء التفاصيل" : "تعديل كل النصوص"}
                      </button>
                    </div>
                  </div>

                  {/* Always-visible essentials: price, unit, note */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                      gap: 8,
                    }}
                  >
                    {(["price_text", "unit_text", "note_text"] as EditableField[]).map((f) => (
                      <label key={f} style={labelStyle}>
                        {FIELD_LABELS[f]}
                        <input
                          value={d[f] ?? it[f]}
                          onChange={(e) => setDraft(it.id, { [f]: e.target.value })}
                          style={input}
                        />
                      </label>
                    ))}
                  </div>

                  {/* Full text editing */}
                  {open && (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                        gap: 8,
                        borderTop: "1px dashed rgba(244,153,33,0.18)",
                        paddingTop: 10,
                      }}
                    >
                      {(
                        [
                          "name_ar",
                          "name_en",
                          "price_label_ar",
                          "price_label_en",
                          "tag_ar",
                          "tag_en",
                        ] as EditableField[]
                      ).map((f) => (
                        <label key={f} style={labelStyle}>
                          {FIELD_LABELS[f]}
                          <input
                            value={d[f] ?? it[f]}
                            onChange={(e) => setDraft(it.id, { [f]: e.target.value })}
                            style={input}
                          />
                        </label>
                      ))}
                      {(["desc_ar", "desc_en"] as EditableField[]).map((f) => (
                        <label key={f} style={{ ...labelStyle, gridColumn: "1 / -1" }}>
                          {FIELD_LABELS[f]}
                          <textarea
                            value={d[f] ?? it[f]}
                            onChange={(e) => setDraft(it.id, { [f]: e.target.value })}
                            rows={2}
                            style={{ ...input, resize: "vertical" }}
                          />
                        </label>
                      ))}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    {dirty && (
                      <button style={btnSm} onClick={() => discard(it.id)}>
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
        ))}
      </div>

      {/* Live preview of the public rate card */}
      <div style={{ marginTop: 24 }}>
        <h3 style={{ color: "#f49921", fontSize: 14, margin: "0 0 8px" }}>معاينة مباشرة</h3>
        <iframe
          key={previewKey}
          ref={previewRef}
          src="/ratecard.html"
          title="معاينة بطاقة الأسعار"
          style={{
            width: "100%",
            height: 460,
            border: "1px solid rgba(244,153,33,0.2)",
            borderRadius: 8,
            background: "#0e0f11",
          }}
        />
      </div>
    </section>
  );
}
